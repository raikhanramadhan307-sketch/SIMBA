import pg from 'pg';

const { Pool, types } = pg;
// COUNT (int8) -> number, NUMERIC -> number, DATE/TIMESTAMP -> string apa adanya
types.setTypeParser(20, (v) => parseInt(v, 10));
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1114, (v) => v);
types.setTypeParser(1184, (v) => v);

const g = globalThis;
export const pool =
  g._simbaPool ||
  (g._simbaPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'simba_db',
    max: 10,
  }));

// Ubah placeholder ? menjadi $1, $2, ... milik PostgreSQL
const toPg = (sql) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

export async function query(sql, params = []) {
  const res = await pool.query(toPg(sql), params);
  return res.rows;
}

// Jalankan beberapa query dalam satu transaksi database.
// c.query(sql, params) mengembalikan [rows, result]
export async function tx(fn) {
  const client = await pool.connect();
  const c = { query: async (sql, params = []) => { const r = await client.query(toPg(sql), params); return [r.rows, r]; } };
  try {
    await client.query('BEGIN');
    const result = await fn(c);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
