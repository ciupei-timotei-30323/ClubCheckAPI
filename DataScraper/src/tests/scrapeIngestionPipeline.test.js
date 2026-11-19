import test from 'node:test'
import assert from 'node:assert'
import { createScrapeIngestionPipeline } from '../services/scrapeIngestionPipeline.js'
import {
    createCityGeocodingService,
    InvalidLocationError
} from '../services/cityGeocodingService.js'

function createLogger() {
    return {
        child() {
            return { info() {}, warn() {} }
        }
    }
}

test('scrape ingestion pipeline geocodes after extraction and before ingestion', async () => {
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
            async extract({ sourceUrl, metadata }) {
                order.push('extract')
                assert.strictEqual(metadata.image, 'https://example.com/poster.jpg')
                return {
                    sourceUrl,
                    structured: {
                        events: [{ name: 'Event' }],
                        venues: [{
                            name: 'Venue',
                            address: { city: 'Cluj Napoca', county: null }
                        }]
                    }
                }
            }
        },
        cityGeocodingService: {
            async normalize(structured, { sourceUrl }) {
                order.push('geocode')
                assert.strictEqual(sourceUrl, 'https://source.example')
                assert.strictEqual(structured.venues[0].address.city, 'Cluj Napoca')

                return {
                    ...structured,
                    venues: [{
                        ...structured.venues[0],
                        address: {
                            ...structured.venues[0].address,
                            city: 'Cluj-Napoca',
                            county: 'Cluj'
                        }
                    }]
                }
            }
        },
        eventIngestionService: {
            async ingest(structured, { sourceUrl, onProgress }) {
                order.push('ingest')
                assert.strictEqual(sourceUrl, 'https://source.example')
                assert.strictEqual(structured.events.length, 1)
                assert.strictEqual(structured.venues[0].address.city, 'Cluj-Napoca')
                assert.strictEqual(structured.venues[0].address.county, 'Cluj')
                await onProgress({ stage: 'creating-venues', percent: 95 })
                return { events: [{ name: 'Event' }], venues: [], artists: [], genres: [] }
            }
        },
        logger: createLogger()
    })

    const result = await pipeline({
        url: 'https://source.example',
        text: 'scraped text',
        metadata: { image: 'https://example.com/poster.jpg' },
        job
    })

    assert.deepStrictEqual(order, ['extract', 'geocode', 'ingest'])
    assert.deepStrictEqual(
        progress.map(update => update.stage),
        ['inferring', 'inferred', 'geocoding', 'geocoded', 'creating-venues', 'ingested']
    )
    assert.strictEqual(result.inference.structured.venues[0].address.city, 'Cluj-Napoca')
    assert.strictEqual(result.ingestion.events.length, 1)
})

test('scrape ingestion pipeline rejects an unverified city before persistence', async () => {
    let ingested = false
    const cityGeocodingService = createCityGeocodingService({
        geocodingApiClient: {
            async searchCity() {
                return []
            }
        },
        logger: createLogger()
    })
    const pipeline = createScrapeIngestionPipeline({
        structuredDataExtractor: {
            async extract({ sourceUrl }) {
                return {
                    sourceUrl,
                    structured: {
                        events: [{ name: 'Event', venueName: 'Venue' }],
                        venues: [{
                            name: 'Venue',
                            address: { city: 'Hallucinated City' }
                        }]
                    }
                }
            }
        },
        cityGeocodingService,
        eventIngestionService: {
            async ingest() {
                ingested = true
            }
        },
        logger: createLogger()
    })

    await assert.rejects(
        () => pipeline({
            url: 'https://source.example/event',
            text: 'scraped text',
            job: {
                id: 'job-2',
                async updateProgress() {}
            }
        }),
        error => error instanceof InvalidLocationError
    )

    assert.strictEqual(ingested, false)
})
