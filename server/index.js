// Starts the local Express API that proxies VoiceForge requests to ElevenLabs.
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import voiceRoutes from "./routes/voice.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (process.env.NODE_ENV === "production" && !process.env.STREAM_SECRET?.trim()) {
  console.error(
    "[VoiceForge] FATAL: STREAM_SECRET is not set in production. " +
    "All speech tokens would be invalidated on every server restart. " +
    "Set STREAM_SECRET in your environment and restart."
  );
  process.exit(1);
}

// Warn clearly when mock mode is active so it is never silently enabled.
if (process.env.MOCK_CHATTERBOX === "true" && process.env.NODE_ENV !== "production") {
  console.warn(
    "\x1b[33m[VoiceForge] Mock mode active — Chatterbox calls are stubbed." +
    " Voice clone returns a fixture voice_id; TTS streams silent audio." +
    " Unset MOCK_CHATTERBOX to use the real Hugging Face engine.\x1b[0m"
  );
}

const app = express();
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: "Too Many Requests" })
});

app.use(globalLimiter);
// Enable trust proxy so rate limiters can identify real client IPs
app.set("trust proxy", 1);

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "voiceforge-api" });
});

app.use("/api/voice", voiceRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.message || "Unexpected VoiceForge server error."
  });
});

app.listen(port, () => {
  console.log(`VoiceForge API listening on http://localhost:${port}`);
});
