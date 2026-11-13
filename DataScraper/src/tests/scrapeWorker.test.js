import test from 'node:test'
import assert from 'node:assert'
import {
    buildScrapeRequest,
    createScrapeProcessor
} from '../workers/scrapeWorker.js'

function createLogger() {
    const entries = []
    const logger = {
        entries,
        child(context) {
            return {
                ...logger,
                context,
                info: (data, message) => entries.push(['info', message, data]),
                debug: (data, message) => entries.push(['debug', message, data]),
                error: (data, message) => entries.push(['error', message, data])
            }
        },
        info: (data, message) => entries.push(['info', message, data]),
        debug: (data, message) => entries.push(['debug', message, data]),
        error: (data, message) => entries.push(['error', message, data])
    }

    return logger
}

function createJob(data) {
    return {
        id: 'job-1',
        name: 'scrape',
        queueName: 'test-queue',
        data,
        progress: null,
        progressUpdates: [],
        logs: [],
        async updateProgress(progress) {
            this.progress = progress
            this.progressUpdates.push(progress)
        },
        async log(message) {
            this.logs.push(message)
        }
    }
}

test('buildScrapeRequest replaces the {url} placeholder', () => {
    const targetUrl = 'https://example.com/a page'
    const request = buildScrapeRequest({
        scraperApiUrl: 'https://scraper.test/extract?target={url}',
        targetUrl
    })

    assert.strictEqual(
        request.url,
        `https://scraper.test/extract?target=${encodeURIComponent(targetUrl)}`
    )
})

test('buildScrapeRequest appends the url query parameter when there is no placeholder', () => {
    const request = buildScrapeRequest({
        scraperApiUrl: 'https://scraper.test/extract',
        targetUrl: 'https://example.com'
    })

    assert.strictEqual(
        request.url,
        `https://scraper.test/extract?url=${encodeURIComponent('https://example.com')}`
    )
})

test('buildScrapeRequest sends the injected API key in the configured header', () => {
    const request = buildScrapeRequest({
        scraperApiUrl: 'https://scraper.test/extract',
        targetUrl: 'https://example.com',
        scrapingApiKey: 'secret-key',
        apiKeyHeader: 'authorization'
    })

    assert.strictEqual(request.headers.authorization, 'secret-key')
})

test('scrape processor calls the API, reports progress and returns the text', async () => {
    const logger = createLogger()
    const job = createJob({ url: 'https://example.com' })
    let receivedRequest

    const processor = createScrapeProcessor({
        scraperApiUrl: 'https://scraper.test/extract',
        scrapingApiKey: 'secret-key',
        logger,
        httpClient: {
            async request(request) {
                receivedRequest = request
                return { data: 'scraped text' }
            }
        }
    })

    const result = await processor(job)

    assert.strictEqual(receivedRequest.method, 'GET')
    assert.strictEqual(receivedRequest.headers['x-api-key'], 'secret-key')
    assert.match(receivedRequest.url, /url=https%3A%2F%2Fexample\.com/)
    assert.strictEqual(result.text, 'scraped text')
    assert.strictEqual(result.characters, 12)
    assert.deepStrictEqual(
        job.progressUpdates.map(update => update.stage),
        ['started', 'fetching', 'received', 'completed']
    )
    assert.ok(job.logs.some(message => message.includes('Scraping https://example.com')))
})

test('scrape processor rejects jobs without a target url', async () => {
    const processor = createScrapeProcessor({
        scraperApiUrl: 'https://scraper.test/extract',
        logger: createLogger(),
        httpClient: { request: async () => ({ data: 'unused' }) }
    })

    await assert.rejects(() => processor(createJob({})), /missing data\.url/)
})

test('scrape processor rejects an empty scraping API response', async () => {
    const processor = createScrapeProcessor({
        scraperApiUrl: 'https://scraper.test/extract',
        logger: createLogger(),
        httpClient: { request: async () => ({ data: '   ' }) }
    })

    await assert.rejects(
        () => processor(createJob({ url: 'https://example.com' })),
        /empty body/
    )
})
