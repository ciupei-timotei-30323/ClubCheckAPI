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

function createSource(overrides = {}) {
    return {
        id: 3,
        url: 'https://source.example',
        sitemapAvailable: true,
        hasNonMusicEvents: true,
        includeTags: ['h1', '.date'],
        ...overrides
    }
}

test('source scrape service uses embedded LLM classification and routes only music pages', async () => {
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
        async scrapePage() {
            assert.fail('scrapePage should not be called when embedded classification succeeds')
        },
        async classifyPage(url, includeTags) {
            calls.push(['classifyPage', url, includeTags])
            return {
                data: {
                    markdown: url.endsWith('/music') ? 'Live concert' : 'Theatre play',
                    metadata: {
                        'og:image': 'https://source.example/poster.jpg',
                        organizer: 'Example Promoter'
                    },
                    json: {
                        is_music: url.endsWith('/music'),
                        certainty: 'clear'
                    }
                }
            }
        }
    }

    const groqClassificationService = {
        async classify() {
            assert.fail('Groq should not be called when the embedded LLM succeeds')
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
        source: createSource(),
        job,
        onMusicEvent: async payload => {
            downstream.push(payload.url)
            assert.strictEqual(payload.classification.source, 'firecrawl-llm')
            assert.strictEqual(payload.metadata.image, 'https://source.example/poster.jpg')
            assert.strictEqual(payload.metadata.organizer, 'Example Promoter')
        }
    })

    assert.deepStrictEqual(calls[0], ['map', 'https://source.example'])
    assert.deepStrictEqual(calls[1], [
        'classifyPage',
        'https://source.example/music',
        ['h1', '.date']
    ])
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
    assert.strictEqual(job.progressUpdates.at(-1).stage, 'source-completed')
})

test('source scrape service never scrapes the source URL or external hosts', async () => {
    const scraped = []
    const scraperApiClient = {
        async mapSource() {
            return {
                links: [
                    'https://source.example',
                    'https://source.example/',
                    'https://www.facebook.com/events/123',
                    'https://www.vimeo.com/456',
                    '/events/one',
                    'https://www.source.example/events/two'
                ]
            }
        },
        async scrapePage(url) {
            scraped.push(url)
            return { data: 'Page content' }
        }
    }

    const service = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService: {
            async classify() {
                assert.fail('Groq must not be called for music-only sources')
            }
        },
        pageRepository: {
            findExistingUrls: async () => new Set(),
            markScraped: async () => ({ inserted: true })
        },
        logger: createLogger()
    })

    const summary = await service.processSource({
        source: createSource({
            id: 6,
            hasNonMusicEvents: false,
            includeTags: []
        }),
        job: createJob(),
        onMusicEvent: async () => {}
    })

    assert.deepStrictEqual(scraped, [
        'https://source.example/events/one',
        'https://www.source.example/events/two'
    ])
    assert.strictEqual(summary.discovered, 5)
    assert.strictEqual(summary.skippedSourceUrl, 1)
    assert.strictEqual(summary.skippedExternalUrl, 2)
    assert.strictEqual(summary.scraped, 2)
})

test('source scrape service skips all LLM classification when hasNonMusicEvents is false', async () => {
    const calls = []
    const scraperApiClient = {
        async mapSource() {
            return { links: ['https://source.example/one', 'https://source.example/two'] }
        },
        async scrapePage(url) {
            calls.push(['scrapePage', url])
            return { data: 'Page content' }
        },
        async classifyPage() {
            assert.fail('classifyPage must not be called for music-only sources')
        }
    }

    const service = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService: {
            async classify() {
                assert.fail('Groq must not be called for music-only sources')
            }
        },
        pageRepository: {
            findExistingUrls: async () => new Set(),
            markScraped: async () => ({ inserted: true })
        },
        logger: createLogger()
    })

    const downstream = []
    const summary = await service.processSource({
        source: createSource({ hasNonMusicEvents: false }),
        job: createJob(),
        onMusicEvent: async payload => {
            downstream.push(payload.url)
            assert.strictEqual(payload.classification.source, 'source-config')
        }
    })

    assert.deepStrictEqual(calls, [
        ['scrapePage', 'https://source.example/one'],
        ['scrapePage', 'https://source.example/two']
    ])
    assert.deepStrictEqual(downstream, [
        'https://source.example/one',
        'https://source.example/two'
    ])
    assert.strictEqual(summary.music, 2)
    assert.strictEqual(summary.discarded, 0)
})

test('source scrape service falls back to Groq when embedded classification fails', async () => {
    const calls = []
    const scraperApiClient = {
        async mapSource() {
            return { links: ['https://source.example/page'] }
        },
        async classifyPage() {
            calls.push('classifyPage')
            throw new Error('embedded LLM unavailable')
        },
        async scrapePage() {
            calls.push('scrapePage')
            return { data: 'Live concert' }
        }
    }

    const service = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService: {
            async classify({ text }) {
                calls.push('groq')
                assert.strictEqual(text, 'Live concert')
                return { music: true }
            }
        },
        pageRepository: {
            findExistingUrls: async () => new Set(),
            markScraped: async () => ({ inserted: true })
        },
        logger: createLogger()
    })

    const downstream = []
    const summary = await service.processSource({
        source: createSource(),
        job: createJob(),
        onMusicEvent: async payload => {
            downstream.push(payload.url)
            assert.strictEqual(payload.classification.source, 'groq')
        }
    })

    assert.deepStrictEqual(calls, ['classifyPage', 'scrapePage', 'groq'])
    assert.deepStrictEqual(downstream, ['https://source.example/page'])
    assert.strictEqual(summary.music, 1)
})

test('source scrape service falls back to Groq when embedded LLM returns no JSON', async () => {
    const calls = []
    const scraperApiClient = {
        async mapSource() {
            return { links: ['https://source.example/page'] }
        },
        async classifyPage() {
            calls.push('classifyPage')
            return { data: { markdown: 'Live concert' } }
        },
        async scrapePage() {
            assert.fail('the embedded payload already contains the page text')
        }
    }

    const service = createSourceScrapeService({
        scraperApiClient,
        groqClassificationService: {
            async classify() {
                calls.push('groq')
                return { music: true }
            }
        },
        pageRepository: {
            findExistingUrls: async () => new Set(),
            markScraped: async () => ({ inserted: true })
        },
        logger: createLogger()
    })

    const summary = await service.processSource({
        source: createSource(),
        job: createJob(),
        onMusicEvent: async () => {}
    })

    assert.deepStrictEqual(calls, ['classifyPage', 'groq'])
    assert.strictEqual(summary.music, 1)
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
        groqClassificationService: {
            async classify() {
                assert.fail('Groq should not be called for a music-only source')
            }
        },
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
            source: createSource({ id: 5, hasNonMusicEvents: false }),
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
        groqClassificationService: {
            async classify() {
                assert.fail('Groq should not be called for a music-only source')
            }
        },
        pageRepository: {
            findExistingUrls: async () => new Set(),
            markScraped: async () => ({ inserted: true })
        },
        logger: createLogger()
    })

    const summary = await service.processSource({
        source: createSource({
            id: 4,
            sitemapAvailable: false,
            hasNonMusicEvents: false,
            includeTags: []
        }),
        job: createJob(),
        onMusicEvent: async () => {}
    })

    assert.strictEqual(summary.music, 1)
    assert.strictEqual(summary.scraped, 1)
})
