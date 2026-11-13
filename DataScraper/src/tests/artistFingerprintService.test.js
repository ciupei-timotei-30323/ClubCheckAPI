import test from 'node:test'
import assert from 'node:assert'
import {
    buildArtistFingerprint,
    createArtistFingerprintService,
    selectBestArtist,
    slugify,
    truncateFingerprint
} from '../services/artistFingerprintService.js'

function createLogger() {
    const entries = []
    const logger = {
        entries,
        child() {
            return {
                info: (data, message) => entries.push(['info', message, data]),
                warn: (data, message) => entries.push(['warn', message, data]),
                error: (data, message) => entries.push(['error', message, data])
            }
        }
    }

    return logger
}

test('artist fingerprint combines MusicBrainz fields with pipe separators', () => {
    const fingerprint = buildArtistFingerprint({
        id: 'mbid-1',
        name: 'Artist A',
        'sort-name': 'A, Artist',
        type: 'Person',
        country: 'RO',
        area: { name: 'Romania' },
        'life-span': { begin: '1990', ended: false },
        aliases: [{ name: 'Alias One' }],
        genres: [{ name: 'Techno' }, { name: 'House' }],
        tags: [{ name: 'electronic' }],
        relations: [{ type: 'official homepage', 'target-type': 'url', url: { resource: 'https://artist.example' } }]
    })

    assert.match(fingerprint, /mbid-1/)
    assert.match(fingerprint, /artist-a/)
    assert.match(fingerprint, /techno/)
    assert.match(fingerprint, /house/)
    assert.match(fingerprint, /https-artist-example/)
    assert.ok(fingerprint.split('|').length > 5)
})

test('artist fingerprint helpers normalise and truncate slugs', () => {
    assert.strictEqual(slugify('Ştefan Artist'), 'stefan-artist')

    const { slug, truncated } = truncateFingerprint('one|two|three|four', 12)
    assert.strictEqual(truncated, true)
    assert.strictEqual(slug, 'one|two')
})

test('selectBestArtist prefers an exact name match with a sufficient score', () => {
    const result = selectBestArtist([
        { id: 'wrong', name: 'Artist A Tribute', score: 95 },
        { id: 'right', name: 'Artist A', score: 90 },
        { id: 'low', name: 'Artist A', score: 20 }
    ], 'Artist A', 80)

    assert.strictEqual(result.id, 'right')
})

test('artist fingerprint service uses MusicBrainz data and caches the result', async () => {
    let searchCalls = 0
    let lookupCalls = 0
    const musicBrainzClient = {
        async searchArtists() {
            searchCalls += 1
            return [{ id: 'mbid-1', name: 'Artist A', score: 100 }]
        },
        async lookupArtist() {
            lookupCalls += 1
            return {
                id: 'mbid-1',
                name: 'Artist A',
                'sort-name': 'A, Artist',
                genres: [{ name: 'Techno' }]
            }
        }
    }

    const service = createArtistFingerprintService({
        musicBrainzClient,
        logger: createLogger(),
        maxSlugLength: 150
    })

    const first = await service.enrich({ name: 'Artist A', slug: 'artist-a' })
    const second = await service.enrich({ name: 'artist a', slug: 'artist-a' })

    assert.strictEqual(first.source, 'musicbrainz')
    assert.strictEqual(first.musicBrainzId, 'mbid-1')
    assert.match(first.slug, /mbid-1\|artist-a/)
    assert.strictEqual(second, first)
    assert.strictEqual(searchCalls, 1)
    assert.strictEqual(lookupCalls, 1)
})

test('artist fingerprint service falls back when MusicBrainz fails', async () => {
    const logger = createLogger()
    const service = createArtistFingerprintService({
        musicBrainzClient: {
            async searchArtists() {
                throw new Error('network down')
            },
            async lookupArtist() {}
        },
        logger
    })

    const result = await service.enrich({ name: 'Artist A', slug: 'artist-a' })

    assert.strictEqual(result.source, 'fallback')
    assert.strictEqual(result.slug, 'artist-a')
    assert.strictEqual(result.musicBrainzId, null)
    assert.ok(logger.entries.some(([level, message]) => level === 'error' && /enrichment failed/.test(message)))
})
