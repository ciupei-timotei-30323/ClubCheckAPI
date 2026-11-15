const DEFAULT_MAX_SLUG_LENGTH = 150

export function normalizeName(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
}

export function slugify(value) {
    return normalizeName(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'artist'
}

function toFingerprintPart(value) {
    return normalizeName(value)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function sortedNames(items) {
    return [...new Set(
        (items ?? [])
            .map(item => typeof item === 'string' ? item : item?.name)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b))
}

/**
 * Builds a deterministic, pipe-separated fingerprint from the fields returned
 * by MusicBrainz's artist lookup endpoint.
 */
export function buildArtistFingerprint(artist) {
    if (!artist) {
        return ''
    }

    const relationParts = (artist.relations ?? [])
        .flatMap(relation => [
            relation.type,
            relation['target-type'],
            relation.url?.resource,
            relation.artist?.name,
            relation.label?.name,
            relation.work?.title,
            relation['release-group']?.title
        ])
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))

    const parts = [
        artist.id,
        artist.name,
        artist['sort-name'],
        artist.disambiguation,
        artist.type,
        artist.gender,
        artist.country,
        artist.area?.name,
        artist['begin-area']?.name,
        artist['life-span']?.begin,
        artist['life-span']?.end,
        artist['life-span']?.ended === true ? 'ended' : undefined,
        artist.annotation,
        ...(artist.isnis ?? []),
        ...(artist.ipis ?? []),
        ...sortedNames(artist.aliases),
        ...sortedNames(artist.genres),
        ...sortedNames(artist.tags),
        ...(artist.ratings?.value !== undefined ? [String(artist.ratings.value)] : []),
        ...relationParts
    ]

    return parts
        .map(toFingerprintPart)
        .filter(Boolean)
        .join('|')
}

export function truncateFingerprint(fingerprint, maxLength = DEFAULT_MAX_SLUG_LENGTH) {
    if (fingerprint.length <= maxLength) {
        return { slug: fingerprint, truncated: false }
    }

    const cut = fingerprint.slice(0, maxLength)
    const lastSeparator = cut.lastIndexOf('|')
    const slug = (lastSeparator > 0 ? cut.slice(0, lastSeparator) : cut)
        .replace(/\|+$/g, '')

    return {
        slug: slug || cut.replace(/\|+$/g, ''),
        truncated: true
    }
}

export function selectBestArtist(candidates, name, minScore = 80) {
    const normalizedName = normalizeName(name)
    const scored = (candidates ?? [])
        .map(candidate => ({ ...candidate, score: Number(candidate?.score ?? 0) }))
        .filter(candidate => candidate.id && candidate.score >= minScore)

    const exactMatch = scored.find(candidate => normalizeName(candidate.name) === normalizedName)
    return exactMatch ?? scored[0] ?? null
}

/**
 * Resolves an artist against MusicBrainz and produces the slug/fingerprint used
 * when creating the artist in ClubCheckAPI. External failures fall back to the
 * LLM-provided slug so a MusicBrainz outage does not block event ingestion.
 */
export function createArtistFingerprintService({
    musicBrainzClient,
    logger,
    minScore = 80,
    maxSlugLength = DEFAULT_MAX_SLUG_LENGTH
}) {
    if (!musicBrainzClient?.searchArtists || !musicBrainzClient?.lookupArtist) {
        throw new Error('createArtistFingerprintService requires a MusicBrainz client')
    }

    if (!logger) {
        throw new Error('createArtistFingerprintService requires a logger')
    }

    const cache = new Map()

    function fallback({ name, slug, reason, error }) {
        const fallbackSlug = slugify(slug || name)

        return {
            name,
            slug: fallbackSlug,
            fingerprint: fallbackSlug,
            musicBrainzId: null,
            musicBrainzName: null,
            musicBrainzScore: null,
            source: 'fallback',
            truncated: false,
            reason,
            error: error?.message
        }
    }

    async function enrich({ name, slug }) {
        const key = normalizeName(name)

        if (cache.has(key)) {
            return cache.get(key)
        }

        const log = logger.child({ artist: name })

        try {
            const candidates = await musicBrainzClient.searchArtists(name)
            const match = selectBestArtist(candidates, name, minScore)

            if (!match) {
                log.warn({ candidates: candidates.length, minScore }, 'No suitable MusicBrainz artist match')
                const result = fallback({ name, slug, reason: 'no-match' })
                cache.set(key, result)
                return result
            }

            const artist = await musicBrainzClient.lookupArtist(match.id)
            const fingerprint = buildArtistFingerprint(artist)
            const { slug: fingerprintSlug, truncated } = truncateFingerprint(fingerprint, maxSlugLength)

            if (truncated) {
                log.warn(
                    { fingerprintLength: fingerprint.length, maxSlugLength },
                    'Artist fingerprint truncated to fit the ClubCheckAPI slug limit'
                )
            }

            const result = {
                name,
                slug: fingerprintSlug || slugify(slug || name),
                fingerprint,
                musicBrainzId: artist.id ?? match.id,
                musicBrainzName: artist.name ?? match.name,
                musicBrainzScore: match.score,
                source: 'musicbrainz',
                truncated
            }

            log.info(
                {
                    musicBrainzId: result.musicBrainzId,
                    musicBrainzName: result.musicBrainzName,
                    score: result.musicBrainzScore,
                    slugLength: result.slug.length,
                    truncated
                },
                'Artist fingerprint created from MusicBrainz'
            )

            cache.set(key, result)
            return result
        } catch (error) {
            log.error({ err: error }, 'MusicBrainz artist enrichment failed; using fallback slug')
            // Do not cache transient failures: a later job should get another
            // chance to enrich the same artist.
            return fallback({ name, slug, reason: 'musicbrainz-error', error })
        }
    }

    return {
        enrich
    }
}
