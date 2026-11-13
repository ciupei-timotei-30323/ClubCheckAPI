import { API_JOB_NAME, SCRAPE_JOB_NAME } from '../config/queue.js'

export async function scrapeService({ pool, queue, logger }) {
    if (!pool) {
        throw new Error('scrapeService requires a database pool')
    }

    if (!queue) {
        throw new Error('scrapeService requires a queue')
    }

    if (!logger) {
        throw new Error('scrapeService requires a logger')
    }

    // Querying for urls
    const [sourcesResult, apiResult] = await Promise.all([
        pool.query("SELECT url FROM sources WHERE method LIKE '%scrape%'"),
        pool.query("SELECT api_url FROM sources WHERE method LIKE '%api%'")
    ])

    const scrapeSourcesUrl = sourcesResult.rows.map(row => row.url).filter(Boolean)
    const apiSourceUrl = apiResult.rows.map(row => row.api_url).filter(Boolean)

    logger.info(
        { scrapeSources: scrapeSourcesUrl.length, apiSources: apiSourceUrl.length },
        'Queueing sources'
    )

    // Queueing the scraping websites. Each job carries an object so the worker
    // can receive additional metadata later without changing the queue contract.
    const scrapeJobs = await Promise.all(
        scrapeSourcesUrl.map(url => {
            logger.debug({ url }, 'Queueing scrape job')
            return queue.add(SCRAPE_JOB_NAME, { url })
        })
    )

    // Queueing the API websites
    const apiJobs = await Promise.all(
        apiSourceUrl.map(url => {
            logger.debug({ url }, 'Queueing API job')
            return queue.add(API_JOB_NAME, { url })
        })
    )

    logger.info(
        { queued: { scrape: scrapeJobs.length, api: apiJobs.length } },
        'Sources queued'
    )

    return {
        msg: {
            scrapeSourcesUrl,
            apiSourceUrl,
            queued: { scrape: scrapeJobs.length, api: apiJobs.length }
        },
        status: 202
    }
}
