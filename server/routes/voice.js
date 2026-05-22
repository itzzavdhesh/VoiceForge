// Defines VoiceForge voice cloning and speech generation API routes.
import { Router } from "express";
import { cloneVoice, speak } from "../controllers/voiceController.js";
import upload from "../middleware/upload.js";

const router = Router();

router.post("/clone", upload.single("audio"), cloneVoice);
router.post("/speak", speak);

export default router;
