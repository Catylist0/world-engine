// dbInit.ts
import { pool } from "./db";

/**
 * Runs the necessary CREATE statements to prepare
 * the schema and any tables required by the application.
 */
export async function initializeDatabase(): Promise<void> {
  // Acquire a client connection from the pool
  const client = await pool.connect();

  try {
    // Start a transaction
    await client.query("BEGIN");

    // Create the schema if it doesn't exist
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS world_engine
    `);

    // Create 'quotes' table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS world_engine.quotes (
        message_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        author TEXT,
        quoted_by TEXT,
        quoted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Commit the transaction
    await client.query("COMMIT");

    console.log("✅ Database initialization complete.");
  } catch (error) {
    // Roll back the transaction on failure
    await client.query("ROLLBACK");
    console.error("❌ Error during database initialization:", error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}
