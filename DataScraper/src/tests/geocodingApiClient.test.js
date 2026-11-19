import test from 'node:test'
import assert from 'node:assert'
import {
    createGeocodingApiClient,
    GeocodingApiError
} from '../clients/geocodingApiClient.js'

function createLogger() {
    const entries = []
    return {
        entries,
        error: (data, message) => entries.push(['error', message, data])
    }
}

test('geocoding client searches with the documented query parameters', async () => {
    const requests = []
    const httpClient = {
        async get(url, config) {
            requests.push({ url, config })
            return {
                data: {
                    results: [{
                        name: 'Cluj-Napoca',
                        admin1: 'Cluj',
                        country: 'Romania'
                    }]
                }
            }
        }
    }
    const client = createGeocodingApiClient({
        httpClient,
        baseUrl: 'https://geocoding.test/v1/search',
        logger: createLogger()
    })

    const results = await client.searchCity(' Cluj Napoca ')

    assert.strictEqual(requests.length, 1)
    assert.strictEqual(requests[0].url, 'https://geocoding.test/v1/search')
    assert.deepStrictEqual(requests[0].config.params, {
        name: 'Cluj Napoca',
        count: 1,
        format: 'json',
        language: 'en'
    })
    assert.strictEqual(results[0].name, 'Cluj-Napoca')
})

test('geocoding client treats a response without results as zero matches', async () => {
    const client = createGeocodingApiClient({
        httpClient: {
            async get() {
                return { data: {} }
            }
        },
        baseUrl: 'https://geocoding.test/v1/search',
        logger: createLogger()
    })

    const results = await client.searchCity('Unknown City')

    assert.deepStrictEqual(results, [])
})

test('geocoding client wraps HTTP failures so callers can retry them', async () => {
    const logger = createLogger()
    const client = createGeocodingApiClient({
        httpClient: {
            async get() {
                const error = new Error('service unavailable')
                error.response = {
                    status: 503,
                    data: { error: 'temporarily unavailable' }
                }
                throw error
            }
        },
        baseUrl: 'https://geocoding.test/v1/search',
        logger
    })

    await assert.rejects(
        () => client.searchCity('Cluj-Napoca'),
        error => error instanceof GeocodingApiError &&
            error.statusCode === 503 &&
            error.city === 'Cluj-Napoca'
    )

    assert.strictEqual(logger.entries.length, 1)
    assert.strictEqual(logger.entries[0][0], 'error')
})
