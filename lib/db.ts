import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables from `.env.local`
dotenv.config({ path: ".env.local" });

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing from environment variables.");
  process.exit(1);
}

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30000 // Prevents premature disconnections
});

// ✅ Function to get the current date from the database
export async function getCurrentDate(): Promise<string> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ current_date: string }>("SELECT NOW() as current_date;");
    return res.rows[0].current_date;
  } finally {
    client.release();
  }
}

// ✅ Function to store a quote in `world_engine.quotes`
export async function storeQuote(messageId: string, content: string[], author: string, quotedBy: string) {
  const client = await pool.connect();
  try {
    // Instead of relying on `SET search_path`, directly reference `world_engine.quotes`
    await client.query(
      `INSERT INTO world_engine.quotes (message_id, content, author, quoted_by, quoted_at) VALUES ($1, $2, $3, $4, NOW())`,
      [messageId, content.join(";"), author, quotedBy]
    );

    console.log(`✅ Quote stored in database: ${messageId}`);
  } catch (error) {
    console.error("❌ Error storing quote:", error);
  } finally {
    client.release();
  }
}

// New function to fetch all quotes
export async function getAllQuotes() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT message_id, content, author, quoted_by, quoted_at
      FROM world_engine.quotes
      ORDER BY quoted_at DESC
    `);
    return res.rows;
  } finally {
    client.release();
  }
}

/**
 * Retrieves the nth most recent quote by the given user.
 * @param quotedBy The username of the person who used !quote
 * @param n 1 = most recent, 2 = second most recent, etc.
 * @returns The matching quote row or null if none found.
 */
export async function getNthMostRecentQuoteByUser(quotedBy: string, n: number) {
  const client = await pool.connect();
  try {
    // We select in descending order (most recent first),
    // then skip (n-1) rows to get the nth quote.
    const res = await client.query(`
      SELECT message_id, content, author, quoted_by, quoted_at
      FROM world_engine.quotes
      WHERE quoted_by = $1
      ORDER BY quoted_at DESC
      LIMIT 1 OFFSET $2
    `, [quotedBy, n - 1]);

    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Removes a quote from the database by message ID.
 */
export async function deleteQuote(messageId: string) {
  const client = await pool.connect();
  try {
    await client.query(`
      DELETE FROM world_engine.quotes
      WHERE message_id = $1
    `, [messageId]);
  } finally {
    client.release();
  }
}

// Export pool for use in other modules
export { pool };
