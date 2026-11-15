import { API_JOB_NAME, SCRAPE_JOB_NAME } from '../config/queue.js'
import { normalizeIncludeTags } from '../utils/includeTags.js'

/**
 * `tags_to_be_scraped` is a varchar column. It may contain a JSON array,
 * double-encoded JSON, or a comma-separated list. Normalisation also strips
 * stray wrapping quotes from each selector.
 */
export function parseIncludeTags(value) {
    return normalizeIncludeTags(value)
}

export async function scrapeService({ pool, scrapeQueue, apiQueue, logger }) {
    if (!pool) {
        throw new Error('scrapeService requires a database pool')
    }

    if (!scrapeQueue || !apiQueue) {
        throw new Error('scrapeService requires scrapeQueue and apiQueue')
    }

    if (!logger) {
        throw new Error('scrapeService requires a logger')
    }

    const [sourcesResult, apiResult] = await Promise.all([
        pool.query(
            `SELECT id, url, sitemap_available, tags_to_be_scraped AS "includeTags"
             FROM sources
             WHERE method ILIKE '%scrape%'`
        ),
        pool.query("SELECT api_url FROM sources WHERE method ILIKE '%api%'")
    ])

    const scrapeSources = sourcesResult.rows
        .filter(row => row.url)
        .map(row => ({
            id: row.id,
            url: row.url,
            sitemapAvailable: row.sitemap_available === true,
            includeTags: parseIncludeTags(row.includeTags)
        }))

    const apiSourceUrl = apiResult.rows.map(row => row.api_url).filter(Boolean)

    logger.info(
        { scrapeSources: scrapeSources.length, apiSources: apiSourceUrl.length },
        'Queueing sources'
    )

    const scrapeJobs = await Promise.all(
        scrapeSources.map(source => {
            logger.debug(
                {
                    sourceId: source.id,
                    url: source.url,
                    sitemapAvailable: source.sitemapAvailable,
                    includeTags: source.includeTags.length
                },
                'Queueing scrape source'
            )
            return scrapeQueue.add(SCRAPE_JOB_NAME, { source })
        })
    )

    const apiJobs = await Promise.all(
        apiSourceUrl.map(url => {
            logger.debug({ url }, 'Queueing API job')
            return apiQueue.add(API_JOB_NAME, { url })
        })
    )

    logger.info(
        { queued: { scrape: scrapeJobs.length, api: apiJobs.length } },
        'Sources queued'
    )

    return {
        msg: {
            scrapeSources,
            apiSourceUrl,
            queued: { scrape: scrapeJobs.length, api: apiJobs.length }
        },
        status: 202
    }
}
