import test from 'node:test'
import assert from 'node:assert'
import { createSourceScrapeService } from '../services/sourceScrapeService.js'

function createLogger() {
    return {
        child() {
            return {
                info() {},
                warn() {},
                error() {},
                debug() {}
            }
        }
    }
}

function createJob() {
    return {
        progressUpdates: [],
        async updateProgress(progress) {
            this.progressUpdates.push(progress)
        }
    }
}

test('source scrape service discovers links, deduplicates and routes only music pages', async () => {
    const calls = []
    const scraperApiClient = {
        async mapSource(url) {
            calls.push(['map', url])
            return {
                links: [
                    'https://source.example/existing',
                    'https://source.example/music',
                    '/events/non-music'
                ]
            }
        },
        async discoverLinks() {
            assert.fail('discoverLinks should not be called when a sitemap is available')
        },
        async scrapePage(url, includeTags) {
            calls.push(['scrape', url, includeTags])
            return {
                data: { markdown: url.includes('music') ? 'Live concert' : 'Theatre play' }
            }
        }
    }

    const groqClassificationService = {
        async classify({ sourceUrl }) {
            calls.push(['classify', sourceUrl])
            return { music: sourceUrl.endsWith('/music') }
        }
    }

    const marked = []
    const pageRepository = {
        async findExistingUrls() {
            return new Set(['https://source.example/existing'])
        },
        async markScraped({ url, sourceId }) {
            marked.push({ url, sourceId })
        }
    }

    const downstream = []
    const service = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService,
        pageRepository,
        logger: createLogger()
    })
    const job = createJob()

    const summary = await service.processSource({
        source: {
            id: 3,
            url: 'https://source.example',
            sitemapAvailable: true,
            includeTags: ['h1', '.date']
        },
        job,
        onMusicEvent: async payload => {
            downstream.push(payload.url)
        }
    })

    assert.deepStrictEqual(calls[0], ['map', 'https://source.example'])
    assert.deepStrictEqual(downstream, ['https://source.example/music'])
    assert.deepStrictEqual(marked, [
        { url: 'https://source.example/music', sourceId: 3 },
        { url: 'https://source.example/events/non-music', sourceId: 3 }
    ])
    assert.strictEqual(summary.discovered, 3)
    assert.strictEqual(summary.alreadyKnown, 1)
    assert.strictEqual(summary.scraped, 2)
    assert.strictEqual(summary.music, 1)
    assert.strictEqual(summary.discarded, 1)
    assert.ok(job.progressUpdates.some(update => update.stage === 'deduplicated'))
    assert.strictEqual(job.progressUpdates.at(-1).stage, 'source-completed')
})

test('source scrape service continues after a page timeout and retries the source job', async () => {
    const marked = []
    const scraperApiClient = {
        async mapSource() {
            return { links: ['https://source.example/timeout', 'https://source.example/ok'] }
        },
        async scrapePage(url) {
            if (url.endsWith('/timeout')) {
                const error = new Error('timeout of 60000ms exceeded')
                error.code = 'ECONNABORTED'
                throw error
            }

            return { data: 'Theatre play' }
        }
    }

    const job = createJob()
    const service = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService: { classify: async () => ({ music: false }) },
        pageRepository: {
            findExistingUrls: async () => new Set(),
            markScraped: async ({ url }) => {
                marked.push(url)
            }
        },
        logger: createLogger()
    })

    await assert.rejects(
        () => service.processSource({
            source: {
                id: 5,
                url: 'https://source.example',
                sitemapAvailable: true,
                includeTags: []
            },
            job,
            onMusicEvent: async () => {}
        }),
        error => /1 page\(s\) failed/.test(error.message) && error.summary.failed === 1
    )

    assert.deepStrictEqual(marked, ['https://source.example/ok'])
    assert.ok(job.progressUpdates.some(update => update.stage === 'page-failed'))
    assert.ok(job.progressUpdates.some(update => update.stage === 'source-completed-with-errors'))
})

test('source scrape service uses /scrape links discovery when no sitemap exists', async () => {
    const scraperApiClient = {
        async mapSource() {
            assert.fail('mapSource should not be called when sitemap is unavailable')
        },
        async discoverLinks(url) {
            assert.strictEqual(url, 'https://source.example')
            return { data: { links: ['https://source.example/page'] } }
        },
        async scrapePage() {
            return { data: 'A live concert' }
        }
    }

    const service = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService: { classify: async () => ({ music: true }) },
        pageRepository: {
            findExistingUrls: async () => new Set(),
            markScraped: async () => ({ inserted: true })
        },
        logger: createLogger()
    })

    const summary = await service.processSource({
        source: {
            id: 4,
            url: 'https://source.example',
            sitemapAvailable: false,
            includeTags: []
        },
        job: createJob(),
        onMusicEvent: async () => {}
    })

    assert.strictEqual(summary.music, 1)
    assert.strictEqual(summary.scraped, 1)
})
