// Starts the local Express API that proxies VoiceForge requests to ElevenLabs.
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import voiceRoutes from "./routes/voice.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Rate limiter for voice API endpoints to prevent quota abuse.
// Limits requests per IP address per minute to prevent billing attacks.
const voiceRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many voice requests. Please try again in a minute." }
});

// Stricter limiter for /clone endpoint since it requires file upload and is more expensive.
const cloneRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many voice clone requests. Please try again in a minute." }
});

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "voiceforge-api" });
});

// Apply rate limiting to voice API routes
app.use("/api/voice", voiceRateLimiter, voiceRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.message || "Unexpected VoiceForge server error."
  });
});

app.listen(port, () => {
  console.log(`VoiceForge API listening on http://localhost:${port}`);
});
