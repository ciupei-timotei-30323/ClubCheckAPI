import {
    normalizeKey,
    toCreateArtistDto,
    toCreateEventDto,
    toCreateGenreDto,
    toCreateVenueDto
} from '../mappers/clubCheckApiMapper.js'
import { slugify } from './artistFingerprintService.js'

function uniqueByNormalizedName(values) {
    const seen = new Map()

    for (const value of values ?? []) {
        const name = typeof value === 'string' ? value : value?.name
        if (!name) {
            continue
        }

        const key = normalizeKey(name)
        if (!seen.has(key)) {
            seen.set(key, typeof value === 'string' ? { name } : value)
        }
    }

    return seen
}

function indexByName(values) {
    return new Map(
        (values ?? [])
            .filter(value => value?.name)
            .map(value => [normalizeKey(value.name), value])
    )
}

function requireId(entity, result) {
    if (!result?.id) {
        throw new Error(`ClubCheckAPI did not return an id for ${entity}`)
    }

    return result.id
}

async function reportProgress(onProgress, progress) {
    if (onProgress) {
        await onProgress(progress)
    }
}

/**
 * Turns one structured Gemini response into ClubCheckAPI writes:
 * venues, artists and genres first, then events using the returned ids.
 */
export function createEventIngestionService({
    clubCheckApiClient,
    artistFingerprintService,
    logger
}) {
    if (!clubCheckApiClient) {
        throw new Error('createEventIngestionService requires a ClubCheckAPI client')
    }

    if (!artistFingerprintService?.enrich) {
        throw new Error('createEventIngestionService requires an artist fingerprint service')
    }

    if (!logger) {
        throw new Error('createEventIngestionService requires a logger')
    }

    async function ingest(structured, { sourceUrl, onProgress } = {}) {
        const events = structured?.events ?? []
        const log = logger.child({ sourceUrl, events: events.length })

        if (events.length === 0) {
            log.info('No events to ingest')
            return { events: [], venues: [], artists: [], genres: [] }
        }

        const venueSources = indexByName(structured.venues)
        const artistSources = indexByName(structured.artists)
        const genreSources = indexByName(structured.genres)

        const referencedVenues = uniqueByNormalizedName(events.map(event => event.venueName))
        const referencedArtists = uniqueByNormalizedName(events.flatMap(event => event.artistNames ?? []))
        const referencedGenres = uniqueByNormalizedName(events.flatMap(event => event.genreNames ?? []))

        const venueIds = new Map()
        const artistIds = new Map()
        const genreIds = new Map()

        const createdVenues = []
        const createdArtists = []
        const createdGenres = []

        log.info(
            {
                venues: referencedVenues.size,
                artists: referencedArtists.size,
                genres: referencedGenres.size
            },
            'Creating referenced ClubCheckAPI entities'
        )

        let processed = 0
        for (const [key, referencedVenue] of referencedVenues) {
            const source = venueSources.get(key) ?? referencedVenue
            const created = await clubCheckApiClient.createVenue(toCreateVenueDto(source))
            const id = requireId(`venue "${source.name}"`, created)

            venueIds.set(key, id)
            createdVenues.push({ id, name: created.name ?? source.name })
            processed += 1

            log.debug({ id, name: source.name }, 'Venue created')
            await reportProgress(onProgress, {
                stage: 'creating-venues',
                percent: 95,
                completed: processed,
                total: referencedVenues.size
            })
        }

        processed = 0
        for (const [key, referencedArtist] of referencedArtists) {
            const source = artistSources.get(key) ?? referencedArtist
            const artistName = source.name
            const fingerprint = await artistFingerprintService.enrich({
                name: artistName,
                slug: source.slug || slugify(artistName)
            })

            const created = await clubCheckApiClient.createArtist(
                toCreateArtistDto(source, fingerprint.slug)
            )
            const id = requireId(`artist "${artistName}"`, created)

            artistIds.set(key, id)
            createdArtists.push({
                id,
                name: created.name ?? artistName,
                slug: created.slug ?? fingerprint.slug,
                fingerprint: fingerprint.fingerprint,
                musicBrainzId: fingerprint.musicBrainzId,
                fingerprintSource: fingerprint.source,
                fingerprintTruncated: fingerprint.truncated
            })
            processed += 1

            log.debug(
                {
                    id,
                    name: artistName,
                    musicBrainzId: fingerprint.musicBrainzId,
                    fingerprintSource: fingerprint.source
                },
                'Artist created'
            )
            await reportProgress(onProgress, {
                stage: 'creating-artists',
                percent: 96,
                completed: processed,
                total: referencedArtists.size
            })
        }

        processed = 0
        for (const [key, referencedGenre] of referencedGenres) {
            const source = genreSources.get(key) ?? referencedGenre
            const created = await clubCheckApiClient.createGenre(toCreateGenreDto(source))
            const id = requireId(`genre "${source.name}"`, created)

            genreIds.set(key, id)
            createdGenres.push({ id, name: created.name ?? source.name })
            processed += 1

            log.debug({ id, name: source.name }, 'Genre created')
            await reportProgress(onProgress, {
                stage: 'creating-genres',
                percent: 97,
                completed: processed,
                total: referencedGenres.size
            })
        }

        const createdEvents = []
        processed = 0

        for (const event of events) {
            const venueKey = normalizeKey(event.venueName)
            const venueId = venueIds.get(venueKey)

            if (!venueId) {
                throw new Error(`Venue "${event.venueName}" was not resolved for event "${event.name}"`)
            }

            const eventGenreIds = (event.genreNames ?? []).map(name => genreIds.get(normalizeKey(name)))
            const eventArtistIds = (event.artistNames ?? []).map(name => artistIds.get(normalizeKey(name)))

            if (eventGenreIds.some(id => !id) || eventArtistIds.some(id => !id)) {
                throw new Error(`Could not resolve all relations for event "${event.name}"`)
            }

            const dto = toCreateEventDto(event, {
                venueId,
                genreIds: eventGenreIds,
                artistIds: eventArtistIds
            })

            const created = await clubCheckApiClient.createEvent(dto)
            createdEvents.push(created)
            processed += 1

            log.debug(
                { slug: created?.slug, name: event.name, venueId },
                'Event created'
            )
            await reportProgress(onProgress, {
                stage: 'creating-events',
                percent: 97 + Math.floor((processed / events.length) * 2),
                completed: processed,
                total: events.length
            })
        }

        const result = {
            events: createdEvents,
            venues: createdVenues,
            artists: createdArtists,
            genres: createdGenres
        }

        log.info(
            {
                events: result.events.length,
                venues: result.venues.length,
                artists: result.artists.length,
                genres: result.genres.length
            },
            'ClubCheckAPI ingestion completed'
        )

        return result
    }

    return {
        ingest
    }
}
