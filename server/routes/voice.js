// Defines VoiceForge voice cloning and speech generation API routes.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { cloneVoice, speak, streamSpeech, getStatus } from "../controllers/voiceController.js";
import upload from "../middleware/upload.js";

const router = Router();

// Voice cloning consumes ElevenLabs voice-slot credits and API quota.
// Limit each IP to 3 clone attempts per 5-minute window to prevent burst abuse
// while still allowing reasonable legitimate use.
const cloneRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many voice clone requests. Please wait before trying again." }
});

// TTS requests are billed per character of synthesized speech.
// 20 requests per minute is comfortable for real-time usage but prevents
// automated quota exhaustion.
const speakRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many speech requests. Please slow down." }
});

router.get("/status", getStatus);
router.post("/clone", cloneRateLimit, upload.single("audio"), cloneVoice);
router.post("/speak", speakRateLimit, speak);
router.get("/speak/stream/:speechId", streamSpeech);

export default router;
