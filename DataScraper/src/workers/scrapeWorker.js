import { Worker } from 'bullmq'

/**
 * Creates the BullMQ processor for one source-level scraping job.
 */
export function createScrapeProcessor({
    sourceScrapeService,
    onMusicEvent,
    logger
}) {
    if (!sourceScrapeService?.processSource) {
        throw new Error('createScrapeProcessor requires a source scrape service')
    }

    if (!logger) {
        throw new Error('createScrapeProcessor requires a logger')
    }

    return async function processScrapeJob(job) {
        const source = job.data?.source
        const log = logger.child({
            jobId: job.id,
            queue: job.queueName,
            jobName: job.name,
            sourceId: source?.id,
            url: source?.url
        })

        if (!source?.id || !source?.url) {
            throw new Error(`Job ${job.id} is missing data.source.id or data.source.url`)
        }

        log.info({ progress: 0 }, 'Scrape source job started')
        await job.updateProgress({ stage: 'started', percent: 0 })
        await job.log(`Processing source ${source.url}`)

        try {
            const summary = await sourceScrapeService.processSource({
                source,
                job,
                onMusicEvent
            })

            log.info(
                {
                    discovered: summary.discovered,
                    alreadyKnown: summary.alreadyKnown,
                    scraped: summary.scraped,
                    music: summary.music,
                    discarded: summary.discarded
                },
                'Scrape source job completed'
            )

            return { source, summary }
        } catch (error) {
            log.error({ err: error, progress: job.progress }, 'Scrape source job failed')
            await job.log(`Scrape failed for ${source.url}: ${error.message}`)
            throw error
        }
    }
}

/**
 * Attaches structured logging to the worker lifecycle events.
 */
export function attachWorkerLogging(worker, logger) {
    worker.on('active', (job) => {
        logger.debug(
            { jobId: job.id, sourceId: job.data?.source?.id, url: job.data?.source?.url },
            'Scrape source job active'
        )
    })

    worker.on('progress', (job, progress) => {
        logger.info(
            { jobId: job.id, sourceId: job.data?.source?.id, progress },
            'Scrape source job progress'
        )
    })

    worker.on('completed', (job, result) => {
        logger.info(
            {
                jobId: job.id,
                sourceId: job.data?.source?.id,
                scraped: result?.summary?.scraped,
                music: result?.summary?.music
            },
            'Scrape source job completed'
        )
    })

    worker.on('failed', (job, error) => {
        logger.error(
            {
                jobId: job?.id,
                sourceId: job?.data?.source?.id,
                url: job?.data?.source?.url,
                err: error
            },
            'Scrape source job failed'
        )
    })

    worker.on('error', (error) => {
        logger.error({ err: error }, 'Scrape worker error')
    })

    worker.on('drained', () => {
        logger.info('Scrape queue drained')
    })

    return worker
}

/**
 * Creates the worker that consumes source-level scrape jobs.
 */
export function createScrapeWorker({
    connection,
    queueName,
    sourceScrapeService,
    onMusicEvent,
    logger,
    concurrency = 5,
    workerOptions = {}
}) {
    if (!connection) {
        throw new Error('createScrapeWorker requires a queue connection')
    }

    if (!queueName) {
        throw new Error('createScrapeWorker requires a queueName')
    }

    const processor = createScrapeProcessor({
        sourceScrapeService,
        onMusicEvent,
        logger
    })

    const worker = new Worker(queueName, processor, {
        ...workerOptions,
        connection,
        concurrency
    })

    return attachWorkerLogging(worker, logger)
}

/**
 * Convenience helper for emitting queue-level progress while jobs are being
 * queued or processed.
 */
export async function logQueueProgress(queue, logger) {
    const counts = await queue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed')
    logger.info({ counts }, 'Scrape queue progress')
    return counts
}
