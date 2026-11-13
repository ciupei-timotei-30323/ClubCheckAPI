import test from 'node:test'
import assert from 'node:assert'
import { createEventIngestionService } from '../services/eventIngestionService.js'

function createLogger() {
    const entries = []
    const logger = {
        entries,
        child() {
            return {
                info: (data, message) => entries.push(['info', message, data]),
                debug: (data, message) => entries.push(['debug', message, data]),
                warn: (data, message) => entries.push(['warn', message, data]),
                error: (data, message) => entries.push(['error', message, data])
            }
        }
    }

    return logger
}

const structured = {
    events: [
        {
            name: 'Event One',
            startDate: '2026-12-31T20:00:00+02:00',
            isActive: true,
            endDate: null,
            description: 'First event',
            price: { value: 50, currency: 'RON' },
            ticketUrl: 'https://tickets.example/1',
            announcementUrl: null,
            venueName: 'Venue One',
            artistNames: ['Artist One'],
            genreNames: ['Techno']
        },
        {
            name: 'Event Two',
            startDate: '2027-01-01T20:00:00+02:00',
            isActive: true,
            endDate: null,
            description: null,
            price: null,
            ticketUrl: null,
            announcementUrl: null,
            venueName: 'Venue One',
            artistNames: ['Artist One', 'Artist Two'],
            genreNames: ['Techno']
        }
    ],
    venues: [{
        name: 'Venue One',
        address: {
            zipCode: null,
            number: '1',
            street: 'Main Street',
            city: 'Cluj-Napoca',
            county: null,
            country: 'Romania',
            googleMapsUrl: null
        }
    }],
    artists: [
        { name: 'Artist One', slug: 'artist-one' },
        { name: 'Artist Two', slug: 'artist-two' }
    ],
    genres: [{ name: 'Techno' }]
}

test('event ingestion creates entities once and uses their ids for events', async () => {
    const calls = {
        venues: [],
        artists: [],
        genres: [],
        events: []
    }
    let nextId = 0

    const clubCheckApiClient = {
        async createVenue(dto) {
            calls.venues.push(dto)
            return { id: ++nextId, name: dto.name }
        },
        async createArtist(dto) {
            calls.artists.push(dto)
            return { id: ++nextId, name: dto.name, slug: dto.slug }
        },
        async createGenre(dto) {
            calls.genres.push(dto)
            return { id: ++nextId, name: dto.name }
        },
        async createEvent(dto) {
            calls.events.push(dto)
            return { slug: `event-${calls.events.length}`, name: dto.name }
        }
    }

    const artistFingerprintService = {
        async enrich({ name }) {
            return {
                slug: `fingerprint-${name.toLowerCase().replace(/\s+/g, '-')}`,
                musicBrainzId: `mbid-${name}`,
                source: 'musicbrainz',
                truncated: false
            }
        }
    }

    const progress = []
    const service = createEventIngestionService({
        clubCheckApiClient,
        artistFingerprintService,
        logger: createLogger()
    })

    const result = await service.ingest(structured, {
        sourceUrl: 'https://source.example',
        onProgress: update => progress.push(update)
    })

    assert.strictEqual(calls.venues.length, 1)
    assert.strictEqual(calls.artists.length, 2)
    assert.strictEqual(calls.genres.length, 1)
    assert.strictEqual(calls.events.length, 2)

    assert.deepStrictEqual(calls.venues[0].address, {
        zipCode: null,
        number: '1',
        street: 'Main Street',
        city: 'Cluj-Napoca',
        county: null,
        country: 'Romania',
        googleMapsUrl: null
    })
    assert.strictEqual(calls.artists[0].slug, 'fingerprint-artist-one')
    assert.strictEqual(calls.artists[1].slug, 'fingerprint-artist-two')

    const firstEvent = calls.events[0]
    assert.strictEqual(firstEvent.venueId, calls.venues[0] ? result.venues[0].id : undefined)
    assert.deepStrictEqual(firstEvent.artistsId, [result.artists[0].id])
    assert.deepStrictEqual(firstEvent.genresId, [result.genres[0].id])
    assert.deepStrictEqual(firstEvent.price, { value: 50, currency: 1 })

    assert.deepStrictEqual(calls.events[1].artistsId, [result.artists[0].id, result.artists[1].id])
    assert.deepStrictEqual(
        progress.map(update => update.stage),
        [
            'creating-venues',
            'creating-artists',
            'creating-artists',
            'creating-genres',
            'creating-events',
            'creating-events'
        ]
    )
})

test('event ingestion does nothing when there are no events', async () => {
    const service = createEventIngestionService({
        clubCheckApiClient: {
            createVenue: async () => assert.fail('should not create venues'),
            createArtist: async () => assert.fail('should not create artists'),
            createGenre: async () => assert.fail('should not create genres'),
            createEvent: async () => assert.fail('should not create events')
        },
        artistFingerprintService: { enrich: async () => assert.fail('should not enrich') },
        logger: createLogger()
    })

    const result = await service.ingest({ events: [], venues: [], artists: [], genres: [] })

    assert.deepStrictEqual(result, { events: [], venues: [], artists: [], genres: [] })
})
