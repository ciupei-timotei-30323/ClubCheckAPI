/**
 * Persistence for the `pages` table. Column `sourceId` is quoted because the
 * migration created it with that exact case.
 */
export function createPageRepository({ pool, logger }) {
    if (!pool) {
        throw new Error('createPageRepository requires a database pool')
    }

    if (!logger) {
        throw new Error('createPageRepository requires a logger')
    }

    async function findExistingUrls(urls) {
        if (!urls.length) {
            return new Set()
        }

        const result = await pool.query(
            'SELECT url FROM pages WHERE url = ANY($1::varchar[])',
            [urls]
        )

        return new Set(result.rows.map(row => row.url))
    }

    async function markScraped({ url, sourceId }) {
        const result = await pool.query(
            `INSERT INTO pages (url, "sourceId", is_scraped)
             SELECT $1::varchar, $2::integer, true
             WHERE NOT EXISTS (SELECT 1 FROM pages WHERE url = $1::varchar)`,
            [url, sourceId]
        )

        const inserted = result.rowCount > 0
        logger.debug({ url, sourceId, inserted }, inserted ? 'Page recorded' : 'Page already existed')

        return { inserted }
    }

    return {
        findExistingUrls,
        markScraped
    }
}
