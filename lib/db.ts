import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Ensure DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not set. Check your .env.local file.");
}

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to get the current date from the database
export async function getCurrentDate(): Promise<string> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ current_date: string }>("SELECT NOW() as current_date;");
    return res.rows[0].current_date;
  } finally {
    client.release();
  }
}

// Function to store a quote in the database
export async function storeQuote(messageId: string, content: string[], author: string, quotedBy: string) {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO quotes (message_id, content, author, quoted_by, quoted_at) VALUES ($1, $2, $3, $4, NOW())`,
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
