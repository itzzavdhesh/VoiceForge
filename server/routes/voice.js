// Defines VoiceForge voice cloning and speech generation API routes.
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { cloneVoice, speak, streamSpeech, getStatus } from "../controllers/voiceController.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/clone", upload.single("audio"), cloneVoice);
router.post("/speak", speak);
router.get("/speak/stream", streamSpeech);
router.get("/status", getStatus);

export default router;
