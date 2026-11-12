import {Queue} from "bullmq";

export async function scrapeService (pool, logger) {
    
    // Querying for urls
    const [sourcesResult, apiResult] = await Promise.all([
        pool.query("SELECT url FROM sources WHERE method LIKE '%scrape%'"),
        pool.query("SELECT api_url FROM sources WHERE method LIKE '%api%'")
    ])
    const scrapeSourcesUrl = sourcesResult.rows.map(row => row.url)
    const apiSourceUrl = apiResult.rows.map(row => row.api_url)

    // TODO Put them in a query each

    // Creating ther queues
    const queue = new Queue("Scraping/API Queue")
    
    // Queueing the scraping websites
    for (const sourceUrl in scrapeSourcesUrl) {
        await queue.add('scrape',sourceUrl)
    }

    // Queueing the API websites
    for (const apiUrl in apiSourceUrl) {
        await queue.add('api',apiUrl)
    }
    
    return {msg: {scrapeSourcesUrl, apiSourceUrl}, status: 202}
}