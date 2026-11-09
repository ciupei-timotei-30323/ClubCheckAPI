
export async function query(text, params, pool) {
    try {
        const { rows } = await pool.query(text, params);
        return rows;
    } catch (err) {
        console.error('DB error:', err);
        throw err;
    }
}
