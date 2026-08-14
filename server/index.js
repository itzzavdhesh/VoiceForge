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
import { requestId } from "./middleware/requestId.js";

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
app.use(requestId);
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const isDev = process.env.NODE_ENV !== "production";

// Enable trust proxy so rate limiters can identify real client IPs correctly
app.set("trust proxy", 1);

// 30-second HTTP request timeout middleware
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: "Request Timeout: operation exceeded 30 seconds" });
    }
  });
  next();
});

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : [])],
        styleSrc: ["'self'", ...(isDev ? ["'unsafe-inline'"] : [])],
        imgSrc: ["'self'", "data:", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:"],
        connectSrc: [
          "'self'",
          clientUrl,
          "https://api-inference.huggingface.co",
          "https://huggingface.co",
          "https://*.hf.space",
          "https://api.github.com",
          "https://cdn.jsdelivr.net",
          "https://storage.googleapis.com",
          ...(isDev ? ["ws://localhost:5173", "http://localhost:5173", "ws://localhost:*", "ws://127.0.0.1:*"] : []),
        ],
      },
    },
  })
);

app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "microphone=(self), camera=(self), geolocation=(), interest-cohort=()"
  );
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

// AFTER — restricted CORS with explicit origin and credentials
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (e.g. server-to-server, curl) in dev
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: err.message });
  }
  next(err);
});
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

app.get("/api/health", async (_request, response) => {
  let dbStatus = "unknown";
  try {
    const db = await getDatabase();
    const result = await db.get("SELECT 1 as alive");
    if (result?.alive === 1) dbStatus = "connected";
  } catch (err) {
    dbStatus = "error: " + (err.message || String(err));
  }

  response.json({
    ok: true,
    service: "voiceforge-api",
    database: dbStatus,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/voice", voiceRoutes);
app.use("/api/voices", voiceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/db", dbRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (response.headersSent) {
    return _next(error);
  }
  response.status(error.status || 500).json({
    error: error.message || "Unexpected VoiceForge server error.",
  });
});

let server;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(port, () => {
    console.log(`VoiceForge API listening on http://localhost:${port}`);
  });

  const handleShutdown = (signal) => {
    console.log(`[VoiceForge] Received ${signal}. Shutting down gracefully...`);
    if (server) {
      server.close(() => {
        console.log("[VoiceForge] Closed remaining connections. Exiting process.");
        process.exit(0);
      });
      setTimeout(() => {
        console.error("[VoiceForge] Forcefully terminating due to shutdown timeout.");
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));
}

export default app;
