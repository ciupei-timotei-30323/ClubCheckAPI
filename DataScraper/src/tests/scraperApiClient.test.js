import test from 'node:test'
import assert from 'node:assert'
import { buildBasicAuthorization, createScraperApiClient } from '../clients/scraperApiClient.js'

function createLogger() {
    const entries = []
    return {
        entries,
        debug: (data, message) => entries.push(['debug', message, data]),
        warn: (data, message) => entries.push(['warn', message, data]),
        error: (data, message) => entries.push(['error', message, data])
    }
}

test('scraper client attaches Basic Auth and posts the required bodies', async () => {
    const requests = []
    const httpClient = {
        async request(config) {
            requests.push(config)
            return { status: 200, data: { data: 'ok' } }
        }
    }

    const client = createScraperApiClient({
        httpClient,
        baseUrl: 'https://scraper.test/v1/',
        username: 'user',
        password: 'pass',
        logger: createLogger()
    })

    await client.mapSource('https://source.example')
    await client.discoverLinks('https://source.example')
    await client.scrapePage('https://source.example/page', ['h1', '.date'])

    const expectedAuthorization = buildBasicAuthorization('user', 'pass')
    assert.match(expectedAuthorization, /^Basic /)
    assert.strictEqual(requests[0].headers.Authorization, expectedAuthorization)
    assert.strictEqual(requests[1].headers.Authorization, expectedAuthorization)
    assert.strictEqual(requests[2].headers.Authorization, expectedAuthorization)

    assert.deepStrictEqual(
        requests.map(request => new URL(request.url).pathname),
        ['/v1/map', '/v1/scrape', '/v1/scrape']
    )
    assert.deepStrictEqual(requests[0].data, { url: 'https://source.example' })
    assert.deepStrictEqual(requests[1].data, {
        url: 'https://source.example',
        formats: ['links'],
        timeout: 30_000
    })
    assert.deepStrictEqual(requests[2].data, {
        url: 'https://source.example/page',
        includeTags: ['h1', '.date'],
        timeout: 30_000
    })
})

test('classifyPage sends Firecrawl embedded-LLM formats and a long timeout', async () => {
    const requests = []
    const client = createScraperApiClient({
        httpClient: {
            async request(config) {
                requests.push(config)
                return { status: 200, data: { data: {} } }
            }
        },
        baseUrl: 'https://scraper.test/v2',
        username: 'user',
        password: 'pass',
        logger: createLogger(),
        classificationTimeoutMs: 180_000
    })

    await client.classifyPage('https://www.iabilet.ro/event', ['".epmenurow"'])

    const body = requests[0].data
    assert.deepStrictEqual(body.includeTags, ['.epmenurow'])
    assert.strictEqual(body.timeout, 180_000)
    assert.strictEqual(requests[0].timeout, 195_000)
    assert.strictEqual(body.formats[0], 'markdown')
    assert.strictEqual(body.formats[1].type, 'json')
    assert.strictEqual(body.formats[1].schema.properties.is_music.type, 'boolean')
    assert.deepStrictEqual(
        body.formats[1].schema.properties.certainty.enum,
        ['clear', 'likely', 'unlikely', 'unclear']
    )
})

test('scraper client sanitizes quoted selectors and logs the clean payload', async () => {
    const requests = []
    const logger = createLogger()
    const client = createScraperApiClient({
        httpClient: {
            async request(config) {
                requests.push(config)
                return { status: 200, data: { data: 'ok' } }
            }
        },
        baseUrl: 'https://scraper.test/v2',
        username: 'user',
        password: 'pass',
        logger,
        scrapeTimeoutMs: 30_000
    })

    await client.scrapePage('https://source.example/page', [
        '".epmenurow"',
        '\\".epcontent\\"'
    ])

    assert.deepStrictEqual(requests[0].data, {
        url: 'https://source.example/page',
        includeTags: ['.epmenurow', '.epcontent'],
        timeout: 30_000
    })

    const outgoingLog = logger.entries.find(
        ([level, message]) => level === 'debug' && message === 'Sending scraping API request'
    )
    assert.deepStrictEqual(outgoingLog[2].payload.includeTags, ['.epmenurow', '.epcontent'])
})

test('scraper client exposes the Firecrawl error id and clean payload on failure', async () => {
    const logger = createLogger()
    const client = createScraperApiClient({
        httpClient: {
            async request() {
                const error = new Error('Request failed with status code 500')
                error.code = 'ERR_BAD_RESPONSE'
                error.response = {
                    status: 500,
                    data: {
                        success: false,
                        error: 'Scrape failed',
                        errorId: 'fc-error-123'
                    }
                }
                throw error
            }
        },
        baseUrl: 'https://scraper.test/v2',
        username: 'user',
        password: 'pass',
        logger,
        maxRetries: 0,
        scrapeTimeoutMs: 30_000
    })

    await assert.rejects(
        () => client.scrapePage('https://www.entertix.ro/tag/3/concert.html', [
            '".epmenurow"',
            '".epcontent"'
        ]),
        error => {
            assert.strictEqual(error.name, 'ScraperApiError')
            assert.strictEqual(error.statusCode, 500)
            assert.strictEqual(error.firecrawlErrorId, 'fc-error-123')
            assert.deepStrictEqual(error.payload.includeTags, ['.epmenurow', '.epcontent'])
            assert.strictEqual(error.payload.timeout, 30_000)
            return true
        }
    )

    const errorLog = logger.entries.find(
        ([level, message]) => level === 'error' && message === 'Scraping API request failed'
    )
    assert.strictEqual(errorLog[2].firecrawlErrorId, 'fc-error-123')
    assert.deepStrictEqual(errorLog[2].payload.includeTags, ['.epmenurow', '.epcontent'])
})

test('scraper client retries timeouts', async () => {
    let attempts = 0
    const client = createScraperApiClient({
        httpClient: {
            async request() {
                attempts += 1
                if (attempts === 1) {
                    const error = new Error('timeout of 60000ms exceeded')
                    error.code = 'ECONNABORTED'
                    throw error
                }

                return { status: 200, data: { data: 'recovered' } }
            }
        },
        baseUrl: 'https://scraper.test',
        username: 'user',
        password: 'pass',
        logger: createLogger(),
        maxRetries: 1,
        sleep: async () => {}
    })

    const result = await client.scrapePage('https://source.example/page', ['h1'])

    assert.deepStrictEqual(result, { data: 'recovered' })
    assert.strictEqual(attempts, 2)
})

test('scraper client does not retry authentication failures', async () => {
    let attempts = 0
    const client = createScraperApiClient({
        httpClient: {
            async request() {
                attempts += 1
                const error = new Error('unauthorized')
                error.response = { status: 401, data: { error: 'bad credentials' } }
                throw error
            }
        },
        baseUrl: 'https://scraper.test',
        username: 'user',
        password: 'pass',
        logger: createLogger(),
        maxRetries: 2,
        sleep: async () => {
            assert.fail('401 responses should not be retried')
        }
    })

    await assert.rejects(
        () => client.mapSource('https://source.example'),
        error => error.name === 'ScraperApiError' &&
            error.statusCode === 401 &&
            error.attempts === 1
    )
    assert.strictEqual(attempts, 1)
})
