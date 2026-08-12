// Starts the local Express API that proxies VoiceForge voice synthesis through Chatterbox Multilingual TTS.
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import voiceRoutes from "./routes/voice.js";
import { getIsMock } from "./utils/mock.js";
import { logger } from "./utils/logger.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Warn clearly when mock mode is active so it is never silently enabled.
if (getIsMock()) {
  logger.warn(
    "Mock mode active — Chatterbox calls are stubbed." +
    " Voice clone returns a fixture voice_id; TTS streams silent audio." +
    " Set MOCK_CHATTERBOX=false to use the real Hugging Face engine."
  );
}

const app = express();
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

// Health endpoint rate limiter: 100 requests per 15 minutes per IP
const healthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: "Too Many Requests" })
});

// Enable trust proxy so rate limiters can identify real client IPs
// behind reverse proxies (e.g., load balancers, CDNs).
// Set to 1 for single-hop proxies; adjust based on your deployment topology.
app.set("trust proxy", 1);

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", healthLimiter, (_request, response) => {
  response.json({ ok: true, service: "voiceforge-api" });
});

app.use("/api/voice", voiceRoutes);

// In production or when client/dist exists, serve compiled React SPA static files
const staticDistPath = path.resolve(__dirname, "../client/dist");
app.use(express.static(staticDistPath));

app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api") || !req.headers.accept?.includes("text/html")) {
    return next();
  }
  res.sendFile(path.join(staticDistPath, "index.html"), (err) => {
    if (err) {
      next();
    }
  });
});

app.use((error, _request, response, _next) => {
  logger.error({ err: error }, "Unhandled server error");
  response.status(error.status || 500).json({
    error: error.message || "Unexpected VoiceForge server error."
  });
});

app.listen(port, () => {
  logger.info(`VoiceForge API listening on http://localhost:${port}`);
});
