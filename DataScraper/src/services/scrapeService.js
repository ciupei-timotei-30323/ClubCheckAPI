
export async function scrapeService (pool) {
    const {rows} = await pool.query('SELECT * FROM users')
    return {msg: rows, status: 200}
}