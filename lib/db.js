import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getCurrentDate() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW() as current_date;');
    return res.rows[0].current_date;
  } finally {
    client.release();
  }
}
