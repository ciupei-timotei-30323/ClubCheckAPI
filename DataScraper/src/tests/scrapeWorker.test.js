import test from 'node:test'
import assert from 'node:assert'
import { createScrapeProcessor } from '../workers/scrapeWorker.js'

function createLogger() {
    const entries = []
    const logger = {
        entries,
        child() {
            return {
                info: (data, message) => entries.push(['info', message, data]),
                debug: (data, message) => entries.push(['debug', message, data]),
                error: (data, message) => entries.push(['error', message, data])
            }
        }
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

const source = {
    id: 1,
    url: 'https://source.example',
    sitemapAvailable: true,
    includeTags: ['h1']
}

test('scrape processor delegates the whole source to the source scrape service', async () => {
    const calls = []
    const onMusicEvent = async () => {}
    const processor = createScrapeProcessor({
        logger: createLogger(),
        onMusicEvent,
        sourceScrapeService: {
            async processSource(args) {
                calls.push(args)
                return {
                    sourceId: 1,
                    sourceUrl: source.url,
                    discovered: 3,
                    alreadyKnown: 1,
                    scraped: 2,
                    music: 1,
                    discarded: 1
                }
            }
        }
    })

    const job = createJob({ source })
    const result = await processor(job)

    assert.strictEqual(calls.length, 1)
    assert.deepStrictEqual(calls[0].source, source)
    assert.strictEqual(calls[0].job, job)
    assert.strictEqual(calls[0].onMusicEvent, onMusicEvent)
    assert.strictEqual(result.summary.discovered, 3)
    assert.strictEqual(result.source, source)
    assert.deepStrictEqual(job.progressUpdates, [{ stage: 'started', percent: 0 }])
    assert.ok(job.logs.some(message => message.includes(source.url)))
})

test('scrape processor rejects jobs without a source', async () => {
    const processor = createScrapeProcessor({
        logger: createLogger(),
        sourceScrapeService: { processSource: async () => ({}) }
    })

    await assert.rejects(() => processor(createJob({})), /missing data\.source/)
})

test('scrape processor propagates source processing failures', async () => {
    const processor = createScrapeProcessor({
        logger: createLogger(),
        sourceScrapeService: {
            async processSource() {
                throw new Error('classification failed')
            }
        }
    })

    await assert.rejects(
        () => processor(createJob({ source })),
        /classification failed/
    )
})
