
export async function scrapeService (pool) {
    const {rows} = await pool.query('SELECT * FROM sources')
    return {msg: rows, status: 200}
}