import { Router } from "express";
import upload from "../middleware/upload.js";
import { getDatabase } from "../utils/db.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

// Voices endpoints
router.post("/voices", authMiddleware, upload.single("audio"), async (req, res, next) => {
  try {
    const { voice_id, name, owner_token } = req.body || {};
    if (!voice_id) {
      return res.status(400).json({ error: "voice_id is required" });
    }
    const db = await getDatabase();
    await db.run(
      `INSERT OR REPLACE INTO voices (voice_id, name, owner_token, audio_blob, created_at, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        voice_id,
        name || "Unnamed Voice",
        owner_token || null,
        req.file ? req.file.buffer : null,
        new Date().toISOString(),
        req.user.id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/voices", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    // Scope search results to user_id and hide the owner_token from shared lists
    const voices = await db.all(
      "SELECT voice_id, name, created_at FROM voices WHERE user_id = ?",
      [req.user.id]
    );
    res.json(voices);
  } catch (err) {
    next(err);
  }
});

router.get("/voices/:id", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    // Ensure the voice profile belongs to the authenticated user
    const voice = await db.get(
      "SELECT * FROM voices WHERE voice_id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (!voice) return res.status(404).json({ error: "Not found" });
    res.json({
      voice_id: voice.voice_id,
      name: voice.name,
      owner_token: voice.owner_token,
      audio_base64: voice.audio_blob ? voice.audio_blob.toString("base64") : null,
      created_at: voice.created_at
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/voices/:id", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    const result = await db.run(
      "DELETE FROM voices WHERE voice_id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Voice profile not found or unauthorized" });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/voices", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    await db.run("DELETE FROM voices WHERE user_id = ?", [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Speech history endpoints
router.get("/speech-history", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    // Scope speech history entries to user_id
    const rows = await db.all(
      "SELECT * FROM speech_history WHERE user_id = ? ORDER BY timestamp DESC",
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/speech-history", authMiddleware, async (req, res, next) => {
  try {
    const { id, text, voice_id, language_code, timestamp, is_favorite } = req.body || {};
    if (!id || !text) {
      return res.status(400).json({ error: "id and text are required" });
    }
    const db = await getDatabase();
    
    // Protect against cross-user record overwriting on ID conflicts
    const existing = await db.get("SELECT user_id FROM speech_history WHERE id = ?", [id]);
    if (existing && existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized: ID collision with another user's record" });
    }

    // Save is_favorite properly in the database query
    await db.run(
      `INSERT OR REPLACE INTO speech_history (id, text, voice_id, language_code, is_favorite, timestamp, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        text,
        voice_id || null,
        language_code || "en-US",
        is_favorite ? 1 : 0,
        timestamp || Date.now(),
        req.user.id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/speech-history/:id", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    const result = await db.run(
      "DELETE FROM speech_history WHERE id = ? AND user_id = ?",
      [req.params.id, req.user.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: "Speech history record not found or unauthorized" });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
