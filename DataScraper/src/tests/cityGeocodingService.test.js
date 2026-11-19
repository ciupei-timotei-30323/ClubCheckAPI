import test from 'node:test'
import assert from 'node:assert'
import {
    createCityGeocodingService,
    InvalidLocationError
} from '../services/cityGeocodingService.js'
import { GeocodingApiError } from '../clients/geocodingApiClient.js'

function createLogger() {
    const entries = []
    const logger = {
        entries,
        child(context) {
            return {
                info: (data, message) => entries.push(['info', message, { ...context, ...data }]),
                warn: (data, message) => entries.push(['warn', message, { ...context, ...data }])
            }
        }
    }

    return logger
}

test('city geocoding normalizes the city and populates the county', async () => {
    const calls = []
    const service = createCityGeocodingService({
        geocodingApiClient: {
            async searchCity(city, options) {
                calls.push({ city, options })
                return [{
                    name: 'Cluj-Napoca',
                    admin1: 'Cluj',
                    country: 'Romania'
                }]
            }
        },
        logger: createLogger()
    })
    const structured = {
        events: [{ name: 'Event', venueName: 'Venue' }],
        venues: [{
            name: 'Venue',
            address: {
                city: 'Cluj Napoca',
                county: null,
                country: 'Romania'
            }
        }]
    }

    const normalized = await service.normalize(structured, {
        sourceUrl: 'https://source.example/event'
    })

    assert.deepStrictEqual(calls, [{
        city: 'Cluj Napoca',
        options: { count: 1 }
    }])
    assert.strictEqual(normalized.venues[0].address.city, 'Cluj-Napoca')
    assert.strictEqual(normalized.venues[0].address.county, 'Cluj')
    assert.strictEqual(normalized.venues[0].address.country, 'Romania')

    // The extractor result is not mutated.
    assert.strictEqual(structured.venues[0].address.city, 'Cluj Napoca')
    assert.strictEqual(structured.venues[0].address.county, null)
})

test('city geocoding caches equivalent city spellings within one page', async () => {
    const calls = []
    const service = createCityGeocodingService({
        geocodingApiClient: {
            async searchCity(city) {
                calls.push(city)
                return [{ name: 'Cluj-Napoca', admin1: 'Cluj' }]
            }
        },
        logger: createLogger()
    })
    const structured = {
        events: [],
        venues: [
            { name: 'Venue One', address: { city: 'Cluj Napoca' } },
            { name: 'Venue Two', address: { city: 'Cluj-Napoca' } }
        ]
    }

    const normalized = await service.normalize(structured, {
        sourceUrl: 'https://source.example/events'
    })

    assert.deepStrictEqual(calls, ['Cluj Napoca'])
    assert.deepStrictEqual(
        normalized.venues.map(venue => venue.address.city),
        ['Cluj-Napoca', 'Cluj-Napoca']
    )
})

test('city geocoding rejects a city with zero matches', async () => {
    const logger = createLogger()
    const service = createCityGeocodingService({
        geocodingApiClient: {
            async searchCity() {
                return []
            }
        },
        logger
    })

    await assert.rejects(
        () => service.normalize({
            events: [{ name: 'Event', venueName: 'Venue' }],
            venues: [{
                name: 'Venue',
                address: { city: 'Hallucinated City' }
            }]
        }, { sourceUrl: 'https://source.example/event' }),
        error => error instanceof InvalidLocationError &&
            error.city === 'Hallucinated City' &&
            error.venueName === 'Venue' &&
            error.sourceUrl === 'https://source.example/event'
    )

    assert.ok(logger.entries.some(([level, message]) =>
        level === 'warn' && message === 'Venue city could not be verified by the geocoding API'
    ))
})

test('city geocoding leaves venues without an address unchanged', async () => {
    const structured = {
        events: [],
        venues: [{ name: 'Venue Without Address', address: null }]
    }
    const service = createCityGeocodingService({
        geocodingApiClient: {
            async searchCity() {
                assert.fail('should not geocode a venue without a city')
            }
        },
        logger: createLogger()
    })

    const normalized = await service.normalize(structured, {
        sourceUrl: 'https://source.example/events'
    })

    assert.strictEqual(normalized, structured)
})

test('city geocoding does not turn transient API failures into invalid locations', async () => {
    const service = createCityGeocodingService({
        geocodingApiClient: {
            async searchCity() {
                throw new GeocodingApiError('Geocoding API request failed', {
                    statusCode: 503,
                    city: 'Cluj-Napoca'
                })
            }
        },
        logger: createLogger()
    })

    await assert.rejects(
        () => service.normalize({
            events: [],
            venues: [{ name: 'Venue', address: { city: 'Cluj-Napoca' } }]
        }, { sourceUrl: 'https://source.example/event' }),
        error => error instanceof GeocodingApiError &&
            !(error instanceof InvalidLocationError) &&
            error.statusCode === 503
    )
})
