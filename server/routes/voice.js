// Defines VoiceForge voice cloning and speech generation API routes.
import { Router } from "express";
import { cloneVoice, speak, streamSpeech } from "../controllers/voiceController.js";
import upload from "../middleware/upload.js";

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

router.post("/clone", upload.single("audio"), cloneVoice);
router.post("/speak", speak);
router.get("/speak/stream/:speechId", requireApiKey, streamSpeech);

export default router;
