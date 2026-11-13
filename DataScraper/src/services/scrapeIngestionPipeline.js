/**
 * Connects the scrape worker to the inference and ingestion stages while
 * keeping the worker itself unaware of Gemini, MusicBrainz or ClubCheckAPI.
 */
export function createScrapeIngestionPipeline({
    structuredDataExtractor,
    eventIngestionService,
    logger
}) {
    if (!structuredDataExtractor?.extract) {
        throw new Error('createScrapeIngestionPipeline requires a structured data extractor')
    }

    if (!eventIngestionService?.ingest) {
        throw new Error('createScrapeIngestionPipeline requires an event ingestion service')
    }

    if (!logger) {
        throw new Error('createScrapeIngestionPipeline requires a logger')
    }

    return async function processScrapedText({ url, text, job }) {
        const log = logger.child({ sourceUrl: url, jobId: job.id })
        const updateProgress = progress => job.updateProgress(progress)

        await updateProgress({ stage: 'inferring', percent: 92 })
        const inference = await structuredDataExtractor.extract({ text, sourceUrl: url })

        await updateProgress({ stage: 'inferred', percent: 94 })
        const ingestion = await eventIngestionService.ingest(inference.structured, {
            sourceUrl: url,
            onProgress: updateProgress
        })

        await updateProgress({ stage: 'ingested', percent: 99 })

        log.info(
            {
                interactionId: inference.interactionId,
                events: ingestion.events.length,
                venues: ingestion.venues.length,
                artists: ingestion.artists.length,
                genres: ingestion.genres.length
            },
            'Scrape inference and ingestion pipeline completed'
        )

        return {
            inference,
            ingestion
        }
    }
}
