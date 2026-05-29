// Defines VoiceForge voice cloning and speech generation API routes.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { cloneVoice, speak } from "../controllers/voiceController.js";
import upload from "../middleware/upload.js";

const router = Router();

// Voice cloning is the most expensive ElevenLabs operation (consumes stored
// voice slots and API credits). Limit each IP to 3 clone attempts per 5
// minutes to cap burst abuse while allowing reasonable legitimate use.
const cloneRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many voice clone requests. Please wait before trying again." }
});

// TTS requests are billed per character. Limit each IP to 20 speak requests
// per minute, which is comfortable for normal real-time use but prevents
// automated flooding.
const speakRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many speech requests. Please slow down." }
});

router.post("/clone", cloneRateLimit, upload.single("audio"), cloneVoice);
router.post("/speak", speakRateLimit, speak);

export default router;
