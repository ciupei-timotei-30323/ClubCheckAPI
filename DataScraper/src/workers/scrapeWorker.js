import { Worker } from 'bullmq'
import { EnviromentVariablesNotFoundException } from '../exceptions/enviromentVariablesNotFoundException.js'

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Builds the request sent to the external scraping API.
 *
 * The API url comes from the environment and may either contain a `{url}`
 * placeholder or accept the target as a `url` query parameter:
 *   https://scraper.example.com/extract?target={url}
 *   https://scraper.example.com/extract
 *
 * Override this via `createScrapeWorker({ buildRequest })` when the provider
 * uses a different request shape.
 */
export function buildScrapeRequest({
    scraperApiUrl,
    targetUrl,
    scrapingApiKey,
    apiKeyHeader = 'x-api-key',
    timeoutMs = DEFAULT_TIMEOUT_MS
}) {
    const encodedTarget = encodeURIComponent(targetUrl)
    const endpoint = scraperApiUrl.includes('{url}')
        ? scraperApiUrl.replaceAll('{url}', encodedTarget)
        : `${scraperApiUrl}${scraperApiUrl.includes('?') ? '&' : '?'}url=${encodedTarget}`

    const headers = {
        accept: 'text/plain, text/html;q=0.9, application/json;q=0.8, */*;q=0.7'
    }

    if (scrapingApiKey) {
        headers[apiKeyHeader] = scrapingApiKey
    }

    return {
        method: 'GET',
        url: endpoint,
        responseType: 'text',
        timeout: timeoutMs,
        headers
    }
}

function extractText(data) {
    if (typeof data === 'string') {
        return data
    }

    if (data && typeof data.text === 'string') {
        return data.text
    }

    if (data && typeof data.content === 'string') {
        return data.content
    }

    return ''
}

/**
 * Creates the BullMQ processor for a single scraping job.
 *
 * Dependencies are injected so this function is easy to test without a real
 * queue, HTTP API or logger.
 */
export function createScrapeProcessor({
    scraperApiUrl,
    scrapingApiKey,
    apiKeyHeader,
    logger,
    httpClient,
    buildRequest = buildScrapeRequest,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onScraped
}) {
    if (!scraperApiUrl) {
        throw new EnviromentVariablesNotFoundException()
    }

    if (!httpClient) {
        throw new Error('createScrapeProcessor requires an httpClient')
    }

    if (!logger) {
        throw new Error('createScrapeProcessor requires a logger')
    }

    return async function processScrapeJob(job) {
        const targetUrl = job.data?.url
        const log = logger.child({
            jobId: job.id,
            queue: job.queueName,
            jobName: job.name,
            url: targetUrl
        })

        if (!targetUrl) {
            throw new Error(`Job ${job.id} is missing data.url`)
        }

        log.info({ progress: 0 }, 'Scrape job started')
        await job.updateProgress({ stage: 'started', percent: 0 })
        await job.log(`Scraping ${targetUrl}`)

        try {
            const request = buildRequest({
                scraperApiUrl,
                targetUrl,
                scrapingApiKey,
                apiKeyHeader,
                timeoutMs
            })

            log.debug({ progress: 25, endpoint: request.url }, 'Calling external scraping API')
            await job.updateProgress({ stage: 'fetching', percent: 25 })

            const response = await httpClient.request(request)
            const text = extractText(response.data)

            if (!text.trim()) {
                throw new Error(`Scraping API returned an empty body for ${targetUrl}`)
            }

            log.info({ progress: 80, characters: text.length }, 'Scraped text received')
            await job.updateProgress({ stage: 'received', percent: 80 })

            const result = {
                url: targetUrl,
                text,
                characters: text.length,
                scrapedAt: new Date().toISOString()
            }

            if (onScraped) {
                log.debug({ progress: 90 }, 'Persisting scraped text')
                await job.updateProgress({ stage: 'persisting', percent: 90 })
                await onScraped({ ...result, job })
            }

            await job.updateProgress({ stage: 'completed', percent: 100 })
            log.info({ progress: 100, characters: result.characters }, 'Scrape job completed')

            return result
        } catch (error) {
            log.error({ err: error, progress: job.progress }, 'Scrape job failed')
            await job.log(`Scrape failed for ${targetUrl}: ${error.message}`)
            throw error
        }
    }
}

/**
 * Attaches structured logging to the worker lifecycle events. Keeping this
 * separate from the processor makes the job itself and the queue lifecycle
 * observable independently.
 */
export function attachWorkerLogging(worker, logger) {
    worker.on('active', (job) => {
        logger.debug({ jobId: job.id, url: job.data?.url }, 'Scrape job active')
    })

    worker.on('progress', (job, progress) => {
        logger.info({ jobId: job.id, url: job.data?.url, progress }, 'Scrape job progress')
    })

    worker.on('completed', (job, result) => {
        logger.info(
            { jobId: job.id, url: job.data?.url, characters: result?.characters },
            'Scrape job completed'
        )
    })

    worker.on('failed', (job, error) => {
        logger.error(
            { jobId: job?.id, url: job?.data?.url, err: error },
            'Scrape job failed'
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
 * Creates the worker that consumes `scrape` jobs.
 *
 * All dependencies (queue connection, queue name, API url, HTTP client and
 * logger) are injected by the composition root instead of being read from
 * `process.env` here.
 */
export function createScrapeWorker({
    connection,
    queueName,
    scraperApiUrl,
    scrapingApiKey,
    apiKeyHeader,
    logger,
    httpClient,
    concurrency = 5,
    buildRequest,
    timeoutMs,
    onScraped,
    workerOptions = {}
}) {
    if (!connection) {
        throw new Error('createScrapeWorker requires a queue connection')
    }

    if (!queueName) {
        throw new Error('createScrapeWorker requires a queueName')
    }

    const processor = createScrapeProcessor({
        scraperApiUrl,
        scrapingApiKey,
        apiKeyHeader,
        logger,
        httpClient,
        buildRequest,
        timeoutMs,
        onScraped
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
