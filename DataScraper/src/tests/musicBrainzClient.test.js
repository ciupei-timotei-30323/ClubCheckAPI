import test from 'node:test'
import assert from 'node:assert'
import { createMusicBrainzClient } from '../clients/musicBrainzClient.js'

function createLogger() {
    return {
        child() {
            return this
        },
        info() {},
        warn() {},
        error() {},
        debug() {}
    }
}

test('MusicBrainz client searches, looks up and injects the required headers', async () => {
    const requests = []
    let rateLimitCalls = 0
    const httpClient = {
        async get(url, config) {
            requests.push({ url, config })
            return requests.length === 1
                ? { data: { artists: [{ id: 'mbid-1', name: 'Artist A', score: 100 }] } }
                : { data: { id: 'mbid-1', name: 'Artist A', genres: [{ name: 'Techno' }] } }
        }
    }
    const rateLimiter = {
        schedule(task) {
            rateLimitCalls += 1
            return task()
        }
    }

    const client = createMusicBrainzClient({
        httpClient,
        baseUrl: 'https://musicbrainz.test/ws/2',
        userAgent: 'ClubCheckTest/1.0 (test@example.com)',
        rateLimiter,
        logger: createLogger()
    })

    const candidates = await client.searchArtists('Artist A')
    const artist = await client.lookupArtist('mbid-1')

    assert.strictEqual(candidates[0].id, 'mbid-1')
    assert.strictEqual(artist.name, 'Artist A')
    assert.strictEqual(rateLimitCalls, 2)

    const searchUrl = new URL(requests[0].url)
    assert.strictEqual(searchUrl.pathname, '/ws/2/artist')
    assert.strictEqual(searchUrl.searchParams.get('query'), 'artist:"Artist A"')
    assert.strictEqual(searchUrl.searchParams.get('fmt'), 'json')
    assert.strictEqual(requests[0].config.headers['User-Agent'], 'ClubCheckTest/1.0 (test@example.com)')

    const lookupUrl = new URL(requests[1].url)
    assert.strictEqual(lookupUrl.pathname, '/ws/2/artist/mbid-1')
    assert.match(lookupUrl.searchParams.get('inc'), /aliases/)
    assert.match(lookupUrl.searchParams.get('inc'), /url-rels/)
})

test('MusicBrainz client retries transient failures', async () => {
    let attempts = 0
    const httpClient = {
        async get() {
            attempts += 1
            if (attempts === 1) {
                const error = new Error('temporarily unavailable')
                error.response = { status: 503, headers: {} }
                throw error
            }

            return { data: { artists: [] } }
        }
    }

    const client = createMusicBrainzClient({
        httpClient,
        baseUrl: 'https://musicbrainz.test/ws/2',
        userAgent: 'ClubCheckTest/1.0',
        rateLimiter: { schedule: task => task() },
        logger: createLogger(),
        sleep: async () => {},
        maxRetries: 1
    })

    const result = await client.searchArtists('Artist A')

    assert.deepStrictEqual(result, [])
    assert.strictEqual(attempts, 2)
})
