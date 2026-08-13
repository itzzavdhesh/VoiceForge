import test from "node:test";
import assert from "node:assert/strict";
import { getDatabase } from "../utils/db.js";
import dbRoutes from "../routes/dbRoutes.js";

// Helper to make test requests
async function makePostRequest(app, url, body) {
  return new Promise((resolve) => {
    const req = {
      method: "POST",
      url,
      body,
      headers: { "content-type": "application/json" }
    };
    // Mock minimal express request response cycle
  });
}

test("Database persistence tests", async (t) => {
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
      `INSERT OR REPLACE INTO voices (voice_id, name, owner_token, tuning_parameters, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [testVoiceId, "Test Voice", "token-123", JSON.stringify({ stability: 0.5 }), new Date().toISOString()]
    );

    const voice = await db.get("SELECT * FROM voices WHERE voice_id = ?", [testVoiceId]);
    assert.equal(voice.name, "Test Voice");
    assert.equal(voice.owner_token, "token-123");
  });

  await t.test("Can insert and retrieve speech history from DB", async () => {
    const testSpeechId = "test-speech-id-123";
    await db.run(
      `INSERT OR REPLACE INTO speech_history (id, text, voice_id, language_code, is_favorite, timestamp)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [testSpeechId, "Hello world", "test-voice-id-123", "en-US", 1, Date.now()]
    );

    const speech = await db.get("SELECT * FROM speech_history WHERE id = ?", [testSpeechId]);
    assert.equal(speech.text, "Hello world");
    assert.equal(speech.is_favorite, 1);
  });
});
