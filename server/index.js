// Starts the local Express API that proxies VoiceForge requests to ElevenLabs.
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import voiceRoutes from "./routes/voice.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Warn clearly when mock mode is active so it is never silently enabled.
if (process.env.MOCK_ELEVENLABS === "true" && process.env.NODE_ENV !== "production") {
  console.warn(
    "\x1b[33m[VoiceForge] MOCK_ELEVENLABS=true — ElevenLabs calls are stubbed." +
    " Voice clone returns a fixture voice_id; TTS streams silent audio." +
    " Remove this flag to use real ElevenLabs responses.\x1b[0m"
  );
}

const app = express();
const port = process.env.PORT || 3001;
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

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

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(error.status || 500).json({
    error: error.message || "Unexpected VoiceForge server error."
  });
});

app.listen(port, () => {
  console.log(`VoiceForge API listening on http://localhost:${port}`);
});
