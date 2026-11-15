import test from 'node:test'
import assert from 'node:assert'
import { createScrapeIngestionPipeline } from '../services/scrapeIngestionPipeline.js'

function createLogger() {
    return {
        child() {
            return { info() {} }
        }
    }
}

test('scrape ingestion pipeline runs extraction before ingestion and reports progress', async () => {
    const order = []
    const progress = []
    const job = {
        id: 'job-1',
        async updateProgress(update) {
            progress.push(update)
        }
    }

    const pipeline = createScrapeIngestionPipeline({
        structuredDataExtractor: {
            async extract({ sourceUrl }) {
                order.push('extract')
                return { sourceUrl, structured: { events: [{ name: 'Event' }] } }
            }
        },
        eventIngestionService: {
            async ingest(structured, { sourceUrl, onProgress }) {
                order.push('ingest')
                assert.strictEqual(sourceUrl, 'https://source.example')
                assert.strictEqual(structured.events.length, 1)
                await onProgress({ stage: 'creating-venues', percent: 95 })
                return { events: [{ name: 'Event' }], venues: [], artists: [], genres: [] }
            }
        },
        logger: createLogger()
    })

    const result = await pipeline({
        url: 'https://source.example',
        text: 'scraped text',
        job
    })

    assert.deepStrictEqual(order, ['extract', 'ingest'])
    assert.deepStrictEqual(
        progress.map(update => update.stage),
        ['inferring', 'inferred', 'creating-venues', 'ingested']
    )
    assert.strictEqual(result.inference.structured.events.length, 1)
    assert.strictEqual(result.ingestion.events.length, 1)
})
