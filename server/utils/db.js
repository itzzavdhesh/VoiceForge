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

    // Create tables with row-level user ownership and refresh token tracking
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

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT,
        created_at TEXT
      );
    `);

    // Handle column additions gracefully (ignore duplicate column, rethrow any other migration failure)
    try {
      await db.run("ALTER TABLE voices ADD COLUMN user_id TEXT");
    } catch (err) {
      if (!/duplicate column/i.test(err.message)) {
        throw err;
      }
    }

    try {
      await db.run("ALTER TABLE speech_history ADD COLUMN user_id TEXT");
    } catch (err) {
      if (!/duplicate column/i.test(err.message)) {
        throw err;
      }
    }

    return db;
  })();

  // Clear dbPromise if database setup fails, allowing subsequent calls to retry
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
}
