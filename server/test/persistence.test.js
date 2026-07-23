import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDatabase, clearDatabaseCache } from "../utils/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Database persistence tests", async (t) => {
  // Isolate tests using a temporary test SQLite database file
  const testDbFile = path.resolve(__dirname, `test_persistence_${Date.now()}.sqlite`);
  process.env.TEST_DB_PATH = testDbFile;
  clearDatabaseCache();

  t.after(async () => {
    try {
      await db.close();
    } catch (err) {
      // Ignore
    }
    clearDatabaseCache();
    delete process.env.TEST_DB_PATH;
    try {
      if (fs.existsSync(testDbFile)) {
        fs.unlinkSync(testDbFile);
      }
    } catch (err) {
      console.error("Failed to delete test database file:", err);
    }
  });

  const db = await getDatabase();

  await t.test("Can initialize database and tables exist", async () => {
    const voicesTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='voices'");
    assert.ok(voicesTable, "voices table should exist");

    const speechHistoryTable = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='speech_history'");
    assert.ok(speechHistoryTable, "speech_history table should exist");
  });

  await t.test("Can insert and retrieve voice from DB", async () => {
    const testVoiceId = "test-voice-id-123";
    await db.run(
      `INSERT OR REPLACE INTO voices (voice_id, name, owner_token, tuning_parameters, created_at, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [testVoiceId, "Test Voice", "token-123", JSON.stringify({ stability: 0.5 }), new Date().toISOString(), "test-user-id"]
    );

    const voice = await db.get("SELECT * FROM voices WHERE voice_id = ?", [testVoiceId]);
    assert.equal(voice.name, "Test Voice");
    assert.equal(voice.owner_token, "token-123");
    assert.equal(voice.user_id, "test-user-id");
  });

  await t.test("Can insert and retrieve speech history from DB", async () => {
    const testSpeechId = "test-speech-id-123";
    await db.run(
      `INSERT OR REPLACE INTO speech_history (id, text, voice_id, language_code, is_favorite, timestamp, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [testSpeechId, "Hello world", "test-voice-id-123", "en-US", 1, Date.now(), "test-user-id"]
    );

    const speech = await db.get("SELECT * FROM speech_history WHERE id = ?", [testSpeechId]);
    assert.equal(speech.text, "Hello world");
    assert.equal(speech.is_favorite, 1);
    assert.equal(speech.user_id, "test-user-id");
  });
});
