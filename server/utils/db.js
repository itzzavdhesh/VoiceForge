import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbPromise = null;

/**
 * Returns the path to the SQLite database file.
 * Supports TEST_DB_PATH for unit test isolation.
 */
export function getDatabasePath() {
  return process.env.TEST_DB_PATH || path.resolve(__dirname, "../database.sqlite");
}

/**
 * Reset function to clear the cached database initialization promise.
 * Used to isolate test suites.
 */
export function clearDatabaseCache() {
  dbPromise = null;
}

/**
 * Initializes and returns the SQLite database instance.
 * Caches the initialization promise to prevent concurrent setups.
 */
export async function getDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await open({
      filename: getDatabasePath(),
      driver: sqlite3.Database,
    });

    // Create tables with row-level user ownership
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password_hash TEXT,
        profile_info TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS voices (
        voice_id TEXT PRIMARY KEY,
        name TEXT,
        owner_token TEXT,
        tuning_parameters TEXT,
        audio_blob BLOB,
        created_at TEXT,
        user_id TEXT
      );

      CREATE TABLE IF NOT EXISTS speech_history (
        id TEXT PRIMARY KEY,
        text TEXT,
        voice_id TEXT,
        language_code TEXT,
        is_favorite INTEGER DEFAULT 0,
        timestamp INTEGER,
        user_id TEXT
      );
    `);

    // Handle column additions gracefully if table already exists (migrations)
    try {
      await db.run("ALTER TABLE voices ADD COLUMN user_id TEXT");
    } catch (err) {
      // Column already exists, ignore
    }

    try {
      await db.run("ALTER TABLE speech_history ADD COLUMN user_id TEXT");
    } catch (err) {
      // Column already exists, ignore
    }

    return db;
  })();

  return dbPromise;
}
