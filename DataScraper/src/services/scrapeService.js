
export async function scrapeService (pool, logger) {
    
    // Querying for urls
    const [sourcesResult, apiResult] = await Promise.all([
        pool.query("SELECT url FROM sources WHERE method LIKE '%scrape%'"),
        pool.query("SELECT api_url FROM sources WHERE method LIKE '%api%'")
    ])
    const scrapeSourcesUrl = sourcesResult.rows.map(row => row.url)
    const apiSourceUrl = apiResult.rows.map(row => row.api_url)

    // TODO Put them in a query each
    
    return {msg: {scrapeSourcesUrl, apiSourceUrl}, status: 202}
}