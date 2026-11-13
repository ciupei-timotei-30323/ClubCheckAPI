import test from 'node:test'
import assert from 'node:assert'
import { ClubCheckApiError, createClubCheckApiClient } from '../clients/clubCheckApiClient.js'

function createLogger() {
    const entries = []
    return {
        entries,
        debug: (data, message) => entries.push(['debug', message, data]),
        error: (data, message) => entries.push(['error', message, data])
    }
}

test('ClubCheckAPI client posts to the private endpoints with the API key', async () => {
    const requests = []
    const httpClient = {
        async request(config) {
            requests.push(config)
            return { status: 201, data: { id: requests.length } }
        }
    }
    const logger = createLogger()
    const client = createClubCheckApiClient({
        httpClient,
        baseUrl: 'http://clubcheck.test:8080/',
        apiKey: 'secret',
        logger
    })

    const venue = await client.createVenue({ name: 'Venue' })
    const artist = await client.createArtist({ name: 'Artist', slug: 'artist' })
    const genre = await client.createGenre({ name: 'Techno' })
    const event = await client.createEvent({ name: 'Event' })

    assert.deepStrictEqual(venue, { id: 1 })
    assert.deepStrictEqual(artist, { id: 2 })
    assert.deepStrictEqual(genre, { id: 3 })
    assert.deepStrictEqual(event, { id: 4 })

    assert.deepStrictEqual(
        requests.map(request => [request.method, new URL(request.url).pathname]),
        [
            ['POST', '/Venues/private'],
            ['POST', '/Artists/private'],
            ['POST', '/Genres/private'],
            ['POST', '/Events/private']
        ]
    )
    assert.strictEqual(requests[0].headers['X-API-Key'], 'secret')
    assert.strictEqual(requests[0].headers['Content-Type'], 'application/json')
    assert.deepStrictEqual(requests[0].data, { name: 'Venue' })
})

test('ClubCheckAPI client wraps and logs request failures', async () => {
    const logger = createLogger()
    const client = createClubCheckApiClient({
        httpClient: {
            async request() {
                const error = new Error('bad request')
                error.response = { status: 400, data: { title: 'Bad Request' } }
                throw error
            }
        },
        baseUrl: 'http://clubcheck.test:8080',
        apiKey: 'secret',
        logger
    })

    await assert.rejects(
        () => client.createEvent({ name: 'Event' }),
        error => error instanceof ClubCheckApiError &&
            error.statusCode === 400 &&
            error.method === 'POST' &&
            error.path === '/Events/private'
    )

    assert.ok(logger.entries.some(([level]) => level === 'error'))
})
