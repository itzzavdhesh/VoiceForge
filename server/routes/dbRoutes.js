import { Router } from "express";
import upload from "../middleware/upload.js";
import { getDatabase } from "../utils/db.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

// Voices endpoints
router.post("/voices", authMiddleware, upload.single("audio"), async (req, res, next) => {
  try {
    const { voice_id, name, owner_token } = req.body;
    const db = await getDatabase();
    await db.run(
      `INSERT OR REPLACE INTO voices (voice_id, name, owner_token, audio_blob, created_at) VALUES (?, ?, ?, ?, ?)`,
      [voice_id, name, owner_token, req.file ? req.file.buffer : null, new Date().toISOString()]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/voices", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    const voices = await db.all("SELECT voice_id, name, owner_token, created_at FROM voices");
    res.json(voices);
  } catch (err) {
    next(err);
  }
});

router.get("/voices/:id", authMiddleware, async (req, res, next) => {
  try {
    const db = await getDatabase();
    const voice = await db.get("SELECT * FROM voices WHERE voice_id = ?", [req.params.id]);
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

// Speech history endpoints
router.get("/speech-history", async (req, res, next) => {
  try {
    const db = await getDatabase();
    const rows = await db.all("SELECT * FROM speech_history ORDER BY timestamp DESC");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/speech-history", async (req, res, next) => {
  try {
    const { id, text, voice_id, language_code, timestamp } = req.body;
    const db = await getDatabase();
    await db.run(
      `INSERT OR REPLACE INTO speech_history (id, text, voice_id, language_code, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [id, text, voice_id, language_code, timestamp || Date.now()]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
