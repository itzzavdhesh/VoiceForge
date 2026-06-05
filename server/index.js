// Starts the local Express API that proxies VoiceForge requests to ElevenLabs.
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import voiceRoutes from "./routes/voice.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

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
