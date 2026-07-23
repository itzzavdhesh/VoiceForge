import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../database.sqlite");

let dbInstance = null;

export async function getDatabase() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Create tables
  await dbInstance.exec(`
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
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS speech_history (
      id TEXT PRIMARY KEY,
      text TEXT,
      voice_id TEXT,
      language_code TEXT,
      is_favorite INTEGER DEFAULT 0,
      timestamp INTEGER
    );
  `);

  return dbInstance;
}
