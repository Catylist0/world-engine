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

// Export pool for use in other modules
export { pool };
