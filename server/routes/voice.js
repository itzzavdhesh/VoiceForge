// Defines VoiceForge voice cloning and speech generation API routes.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { cloneVoice, speak } from "../controllers/voiceController.js";
import upload from "../middleware/upload.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

// Middleware to require ElevenLabs API key for protected endpoints.
// Prevents unauthenticated callers from consuming other users' API quotas.
function requireApiKey(request, response, next) {
  const apiKey = request.get("X-ElevenLabs-Api-Key")?.trim();
  if (!apiKey) {
    response.status(401).json({
      error: "An ElevenLabs API key is required. Add it via the X-ElevenLabs-Api-Key header."
    });
    return;
  }
  next();
}

const router = Router();

// Voice cloning is the most expensive ElevenLabs operation (consumes characters
// and storage). Limit each IP to 3 clone attempts per 5-minute window.
const cloneRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many voice clone requests. Please wait before trying again." }
});

// TTS (speak) is billed per character. Limit each IP to 20 requests per minute
// to cap burst usage while remaining comfortable for normal real-time use.
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
