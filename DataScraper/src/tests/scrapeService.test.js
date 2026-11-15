import test from 'node:test'
import assert from 'node:assert'
import { parseIncludeTags, scrapeService } from '../services/scrapeService.js'

function createLogger() {
    return {
        info() {},
        debug() {},
        warn() {},
        error() {}
    }
}

test('parseIncludeTags accepts JSON arrays and comma-separated values', () => {
    assert.deepStrictEqual(parseIncludeTags('["h1", ".date", " .location "]'), ['h1', '.date', '.location'])
    assert.deepStrictEqual(parseIncludeTags('h1, .date, .location'), ['h1', '.date', '.location'])
    assert.deepStrictEqual(parseIncludeTags(null), [])
})

test('parseIncludeTags strips literal quotes stored inside source tags', () => {
    const stored = JSON.stringify(['".epmenurow"', '".epcontent"'])

    assert.deepStrictEqual(parseIncludeTags(stored), ['.epmenurow', '.epcontent'])
})

test('scrape service queries source configuration and enqueues source jobs', async () => {
    const pool = {
        async query(text) {
            if (text.includes('FROM sources') && text.includes('sitemap_available')) {
                return {
                    rows: [
                        {
                            id: 1,
                            url: 'https://sitemap.example',
                            sitemap_available: true,
                            includeTags: '["h1", ".date"]'
                        },
                        {
                            id: 2,
                            url: 'https://links.example',
                            sitemap_available: false,
                            includeTags: '.artist-summary'
                        }
                    ]
                }
            }

            return { rows: [{ api_url: 'https://api.example/events' }] }
        }
    }

    const scrapeJobs = []
    const apiJobs = []
    const scrapeQueue = {
        async add(name, data) {
            scrapeJobs.push({ name, data })
            return { id: scrapeJobs.length }
        }
    }
    const apiQueue = {
        async add(name, data) {
            apiJobs.push({ name, data })
            return { id: apiJobs.length }
        }
    }

    const result = await scrapeService({
        pool,
        scrapeQueue,
        apiQueue,
        logger: createLogger()
    })

    assert.strictEqual(result.status, 202)
    assert.strictEqual(scrapeJobs.length, 2)
    assert.deepStrictEqual(scrapeJobs[0], {
        name: 'scrape',
        data: {
            source: {
                id: 1,
                url: 'https://sitemap.example',
                sitemapAvailable: true,
                includeTags: ['h1', '.date']
            }
        }
    })
    assert.deepStrictEqual(scrapeJobs[1].data.source.includeTags, ['.artist-summary'])
    assert.deepStrictEqual(apiJobs, [
        { name: 'api', data: { url: 'https://api.example/events' } }
    ])
    assert.strictEqual(result.msg.queued.scrape, 2)
    assert.strictEqual(result.msg.queued.api, 1)
})
