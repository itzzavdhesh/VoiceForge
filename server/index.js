// Starts the local Express API that proxies VoiceForge voice synthesis through Chatterbox Multilingual TTS.
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { rateLimit } from "express-rate-limit";
import voiceRoutes from "./routes/voice.js";
import { getIsMock } from "./utils/mock.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Warn clearly when mock mode is active so it is never silently enabled.
if (getIsMock()) {
  console.warn(
    "\x1b[33m[VoiceForge] Mock mode active — Chatterbox calls are stubbed." +
    " Voice clone returns a fixture voice_id; TTS streams silent audio." +
    " Set MOCK_CHATTERBOX=false to use the real Hugging Face engine.\x1b[0m"
  );
}

const app = express();
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const isDev = process.env.NODE_ENV === "development";

app.use(
  helmet({
    crossOriginEmbedderPolicy: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],
        styleSrc: ["'self'", ...(isDev ? ["'unsafe-inline'"] : [])],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", clientUrl, "https://api-inference.huggingface.co", ...(isDev ? ["ws://localhost:5173", "http://localhost:5173"] : [])],
        workerSrc: ["'self'", "blob:"],
      },
    },
  })
);

app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), interest-cohort=()"
  );
  next();
});

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
// behind reverse proxies (e.g., load balancers, CDNs).
// Set to 1 for single-hop proxies; adjust based on your deployment topology.
app.set("trust proxy", 1);

app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "voiceforge-api" });
});

app.use("/api/voice", voiceRoutes);

// Serve the React client in production so CSP headers apply to it
if (!isDev) {
  const clientDistPath = path.resolve(__dirname, "../client/dist");
  app.use(express.static(clientDistPath));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDistPath, "index.html")));
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.message || "Unexpected VoiceForge server error."
  });
});

app.listen(port, () => {
  console.log(`VoiceForge API listening on http://localhost:${port}`);
});
