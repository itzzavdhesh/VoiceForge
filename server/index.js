// Starts the local Express API that proxies VoiceForge requests to ElevenLabs.
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import voiceRoutes from "./routes/voice.js";
import authRoutes from "./routes/authRoutes.js";
import dbRoutes from "./routes/dbRoutes.js";
import { getDatabase } from "./utils/db.js";
import { getIsMock } from "./utils/mock.js";
import helmet from "helmet";

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
const isDev = process.env.NODE_ENV !== "production";

app.use(
  helmet({
    crossOriginEmbedderPolicy: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],
        styleSrc: ["'self'", ...(isDev ? ["'unsafe-inline'"] : [])],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", clientUrl, "https://api-inference.huggingface.co", "https://api.github.com", "https://cdn.jsdelivr.net", "https://storage.googleapis.com", ...(isDev ? ["ws://localhost:5173", "http://localhost:5173"] : [])],
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

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        clientUrl,
        "https://huggingface.co",
        "https://*.hf.space",
        "ws://localhost:*",
        "ws://127.0.0.1:*"
      ],
      mediaSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: { policy: "require-corp" }
}));

app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "microphone=(self), camera=(self)");
  next();
});

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: "Too Many Requests" }),
});

app.use(globalLimiter);
// Enable trust proxy so rate limiters can identify real client IPs
app.set("trust proxy", 1);

// AFTER — restricted CORS with explicit origin and credentials
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. server-to-server, curl) in dev
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: "1mb" }));

// Rate limiter for voice API endpoints to prevent quota abuse.
// Limits requests per IP address per minute to prevent billing attacks.
const voiceRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many voice requests. Please try again in a minute." },
  skip: (request) => {
    // Skip rate limiting for /health endpoint
    return request.path === "/health";
  }
});

// Stricter limiter for /clone endpoint since it requires file upload.
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

app.use("/api/voice", voiceRoutes);
app.use("/api/voices", voiceRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (response.headersSent) {
    return _next(error);
  }
  response.status(error.status || 500).json({
    error: error.message || "Unexpected VoiceForge server error.",
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`VoiceForge API listening on http://localhost:${port}`);
  });
}

export default app;
