// Defines VoiceForge voice cloning and speech generation API routes.
import { Router } from "express";
import { cloneVoice, speak, streamSpeech, getStatus } from "../controllers/voiceController.js";
import upload from "../middleware/upload.js";

const router = Router();

router.get("/status", getStatus);
router.post("/clone", upload.single("audio"), cloneVoice);
router.post("/speak", speak);
router.get("/speak/stream/:speechId", streamSpeech);

export default router;
