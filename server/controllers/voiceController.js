// Implements Chatterbox Multilingual TTS voice cloning and speech proxy handlers.
// Uses the Hugging Face Gradio client to call ResembleAI/Chatterbox-Multilingual-TTS.
import crypto from "crypto";
import { getIsMock } from "../utils/mock.js";
import { isValidLanguageCode, toChatterboxLanguageCode } from "../utils/languages.js";

// ---------------------------------------------------------------------------
// In-memory voice store: maps voice_id to { name, audioBuffer, mimeType, expiresAt }
// In production you would persist this to a database or object store.
// ---------------------------------------------------------------------------
const voiceStore = new Map();

function parseBoundedNumber(rawValue, fallback, min) {
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? Math.max(min, numeric) : fallback;
}

const MAX_STORED_VOICES = parseBoundedNumber(process.env.VOICE_STORE_MAX, 20, 1);
const VOICE_STORE_TTL_MS = parseBoundedNumber(
  process.env.VOICE_STORE_TTL_MS,
  2 * 60 * 60 * 1000,
  60_000
);

const PENDING_STREAMS_MAX = parseBoundedNumber(
  process.env.PENDING_STREAMS_MAX,
  1000,
  1
);

const PENDING_STREAM_TTL_MS = parseBoundedNumber(
  process.env.PENDING_STREAM_TTL_MS,
  60_000,
  1
);

const MOCK_AUDIO_MP3 = Buffer.from(
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA" +
  "//uQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8A" +
  "AAABAAAB/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "base64"
);

const STREAM_SECRET = process.env.STREAM_SECRET ?? (() => {
  console.warn(
    "[VoiceForge] STREAM_SECRET not set - using ephemeral key. " +
    "All speech tokens will be invalidated on server restart. " +
    "Set STREAM_SECRET in .env for stability."
  );
  return crypto.randomBytes(32).toString("hex");
})();

const ENCRYPTION_KEY = crypto.scryptSync(STREAM_SECRET, "voiceforge-stream-salt", 32);
const IV_LENGTH = 12;
const ALGORITHM = "aes-256-gcm";

function createTimeoutSignal(ms = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function withTimeout(promise, ms, label, abortSignal = null) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    
    if (abortSignal) {
      if (abortSignal.aborted) {
        clearTimeout(timeoutId);
        reject(new Error("Request aborted by client"));
      } else {
        abortSignal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new Error("Request aborted by client"));
        });
      }
    }
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

function encryptToken(payload) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag().toString("base64");

  const tokenData = {
    iv: iv.toString("base64"),
    tag: authTag,
    data: encrypted
  };

  return Buffer.from(JSON.stringify(tokenData)).toString("base64url");
}

function decryptToken(token) {
  try {
    const rawJson = Buffer.from(token, "base64url").toString("utf8");
    const { iv, tag, data } = JSON.parse(rawJson);

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(iv, "base64")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64"));

    let decrypted = decipher.update(data, "base64", "utf8");
    decrypted += decipher.final("utf8");

    const payload = JSON.parse(decrypted);

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      const error = new Error("Speech stream has expired.");
      error.status = 403;
      throw error;
    }

    return payload;
  } catch (error) {
    if (error.status === 403) {
      throw error;
    }
    const err = new Error("Invalid or tampered speech token.");
    err.status = 400;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Gradio / Chatterbox voice generation
// ---------------------------------------------------------------------------

/**
 * Calls the ResembleAI/Chatterbox-Multilingual-TTS Gradio space and returns
 * the URL of the generated audio file.
 *
 * @param {Buffer}  audioBuffer        Raw bytes of the reference voice recording.
 * @param {string}  mimeType           MIME type of the reference audio (e.g. "audio/webm").
 * @param {string}  targetText         Text to synthesize (max 300 chars).
 * @param {string}  [languageCode]     Chatterbox language code, e.g. "en".
 * @param {object}  [voiceSettings]    Optional Chatterbox generation settings.
 * @returns {Promise<string>}          Direct URL to the generated audio file.
 */
async function generateClonedVoice(
  audioBuffer,
  mimeType,
  targetText,
  languageCode = "en",
  voiceSettings = {},
  abortSignal = null
) {
  const normalizedVoiceSettings =
    voiceSettings && typeof voiceSettings === "object" ? voiceSettings : {};
  const spaceIdentifier =
    process.env.VOICE_ENGINE_SPACE || "ResembleAI/Chatterbox-Multilingual-TTS";

  const { client } = await import("@gradio/client");
  const app = await withTimeout(client(spaceIdentifier), 10000, "Chatterbox client init");

  // Wrap the raw Buffer in a Blob so Gradio treats it as a file upload.
  const referenceBlob = new Blob([audioBuffer], { type: mimeType });
  const exaggeration = clampNumber(normalizedVoiceSettings.style, 0.25, 2, 0.5);
  const cfgWeight = clampNumber(normalizedVoiceSettings.stability, 0.2, 1, 0.5);
  const temperature = clampNumber(normalizedVoiceSettings.temperature, 0.05, 5, 0.8);
  const seed = Number.isInteger(normalizedVoiceSettings.seed) ? normalizedVoiceSettings.seed : 0;

  const result = await withTimeout(
    app.predict("/generate_tts_audio", [
      targetText,       // Text string to synthesize (max 300 chars)
      languageCode,     // Language code string (e.g. "en", "hi")
      referenceBlob,    // Reference audio Blob
      exaggeration,     // Exaggeration intensity float (Default: 0.5)
      temperature,      // Generation temperature float (Default: 0.8)
      seed,             // Seed integer (0 = randomised)
      cfgWeight         // CFG weight / Pace factor float (Default: 0.5)
    ]),
    30000,
    "Chatterbox predict",
    abortSignal
  );

  const audioUrl = result.data[0].url;
  if (!audioUrl) {
    throw new Error("Chatterbox returned no audio URL.");
  }
  return audioUrl;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

/**
 * Evicts expired voice entries and enforces the maximum limit on cached voices in memory.
 *
 * @param {number} [now] The current timestamp in milliseconds.
 */
function pruneVoiceStore(now = Date.now()) {
  for (const [voiceId, entry] of voiceStore) {
    if (entry.expiresAt <= now) {
      voiceStore.delete(voiceId);
    }
  }

  while (voiceStore.size >= MAX_STORED_VOICES) {
    const oldestVoiceId = voiceStore.keys().next().value;
    if (!oldestVoiceId) break;
    voiceStore.delete(oldestVoiceId);
  }
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * Express handler to clone a reference voice profile from an uploaded audio file.
 * Caches the reference audio in memory under an ephemeral UUID.
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 * @param {function} next Express next middleware callback.
 */
export async function cloneVoice(request, response, next) {
  try {
    const audioFile = request.file;

    if (!audioFile) {
      response.status(400).json({ error: "Reference audio is required." });
      return;
    }

    if (getIsMock()) {
      console.warn("[VoiceForge] MOCK_CHATTERBOX: skipping real voice clone, returning fixture.");
      response.json({
        voice_id: "mock-voice-id-00000000",
        name: request.body.name || "VoiceForge Voice (mock)"
      });
      return;
    }

    // Store the audio buffer server-side so it can be used during speak/stream.
    pruneVoiceStore();
    const voiceId = crypto.randomUUID();
    voiceStore.set(voiceId, {
      name: request.body.name || "VoiceForge Voice",
      audioBuffer: audioFile.buffer,
      mimeType: audioFile.mimetype,
      expiresAt: Date.now() + VOICE_STORE_TTL_MS
    });

    response.json({
      voice_id: voiceId,
      name: request.body.name || "VoiceForge Voice"
    });
  } catch (error) {
    next(error);
  }
}

// Maps speechId -> { text, voiceId, apiKey, mergedSettings, timeout }.
// Keys are unguessable UUIDs (see speak) and entries are single-use.
const pendingStreams = new Map();

// Remove a pending stream and clear its expiry timer so timers do not pile up.
/**
 * Clears and removes a pending speech stream.
 *
 * @param {string} speechId The ID of the pending speech stream to clean up.
 * @returns {object|undefined} The deleted stream entry if found, otherwise undefined.
 */
function deletePendingStream(speechId) {
  const entry = pendingStreams.get(speechId);
  if (!entry) {
    return undefined;
  }
  clearTimeout(entry.timeout);
  pendingStreams.delete(speechId);
  return entry;
}

/**
 * Express handler to initiate a speech request.
 * Validates parameters and returns a signed token with a streaming audio URL.
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 * @param {function} next Express next middleware callback.
 */
export async function speak(request, response, next) {
  try {
    const {
      text,
      voice_id: voiceId,
      language_code,
      voice_settings
    } = request.body;

    if (pendingStreams.size >= PENDING_STREAMS_MAX) {
      response.status(503).json({
        error:
          "Too many pending speech requests. Please retry after retrieving or cancelling existing audio streams."
      });
      return;
    }
    // Fix (Issue 1): trim both fields before checking so whitespace-only
    // strings ("   ") are treated the same as missing values.
    const trimmedText = typeof text === "string" ? text.trim() : "";
    const trimmedVoiceId = typeof voiceId === "string" ? voiceId.trim() : "";

    if (!trimmedText && !trimmedVoiceId) {
      response.status(400).json({ error: "Both text and voice_id are required." });
      return;
    }
    if (!trimmedText) {
      response.status(400).json({ error: "text is required and must not be blank." });
      return;
    }
    if (!trimmedVoiceId) {
      response.status(400).json({ error: "voice_id is required and must not be blank." });
      return;
    }
    if (trimmedText.length > 300) {
      response.status(400).json({ error: "Text too long; maximum 300 characters for Chatterbox TTS." });
      return;
    }
    if (!isValidLanguageCode(language_code)) {
      response.status(400).json({
        error: `Unsupported language code "${language_code}". See Chatterbox Multilingual docs for supported codes.`
      });
      return;
    }

    const defaultVoiceSettings = {
      stability: 0.45,
      style: 0.2,
      temperature: 0.8
    };

    
    const sanitizedSettings = {};
if (voice_settings !== undefined && voice_settings !== null) {
  if (typeof voice_settings !== "object" || Array.isArray(voice_settings)) {
    response.status(400).json({ error: "voice_settings must be a plain object." });
    return;
  }
  if (voice_settings.stability !== undefined) {
    if (typeof voice_settings.stability !== "number" || !Number.isFinite(voice_settings.stability) || voice_settings.stability < 0 || voice_settings.stability > 1) {
      response.status(400).json({ error: "stability must be a finite number between 0 and 1." });
      return;
    }
    sanitizedSettings.stability = voice_settings.stability;
  }
  if (voice_settings.style !== undefined) {
    if (typeof voice_settings.style !== "number" || !Number.isFinite(voice_settings.style) || voice_settings.style < 0 || voice_settings.style > 1) {
      response.status(400).json({ error: "style must be a finite number between 0 and 1." });
      return;
    }
    sanitizedSettings.style = voice_settings.style;
  }
  if (voice_settings.temperature !== undefined) {
    if (typeof voice_settings.temperature !== "number" || !Number.isFinite(voice_settings.temperature) || voice_settings.temperature < 0.05 || voice_settings.temperature > 5) {
      response.status(400).json({ error: "temperature must be a finite number between 0.05 and 5." });
      return;
    }
    sanitizedSettings.temperature = voice_settings.temperature;
  }
}
    const mergedSettings = { ...defaultVoiceSettings, ...sanitizedSettings };

    // Cryptographically secure, 128-bit identifier. Unlike Math.random(), this
    // cannot be reproduced from a seed or enumerated by a co-located process,
    // so the stored API key cannot be retrieved by guessing the stream key.
    const speechId = crypto.randomUUID();

    const timeout = setTimeout(() => {
      deletePendingStream(speechId);
    }, PENDING_STREAM_TTL_MS);
    // Do not keep the event loop alive solely for this cleanup timer.
    timeout.unref?.();
    
    pendingStreams.set(speechId, { text: trimmedText, voiceId: trimmedVoiceId, mergedSettings, timeout });

    if (getIsMock()) {
      console.warn(`[VoiceForge] MOCK_CHATTERBOX: speak enqueued mock stream for speechId=${speechId}`);
    }
    const expiresAt = Date.now() + 60000;
    const token = encryptToken({
      speechId,
      text: trimmedText,
      voiceId: trimmedVoiceId,
      language_code,
      voice_settings: mergedSettings,
      expiresAt
    });

    response.json({
      speechId: token,
      audioUrl: `/api/voice/speak/stream?t=${token}`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler to stream generated Speech synthesis audio back to the client.
 * Decrypts and validates the stream token, initiates Chatterbox synthesis via Gradio client,
 * and proxies the generated audio chunks.
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 * @param {function} next Express next middleware callback.
 */
export async function streamSpeech(request, response, next) {
  try {
    const token = request.query.t;
    if (!token) {
      response.status(400).json({ error: "Missing stream token." });
      return;
    }
    const { speechId, text, voiceId, language_code, voice_settings } = decryptToken(token);

    if (getIsMock()) {
      console.warn("[VoiceForge] MOCK_CHATTERBOX: streaming mock audio");
      response.setHeader("Content-Type", "audio/mpeg");
      response.setHeader("Content-Length", String(MOCK_AUDIO_MP3.length));
      response.end(MOCK_AUDIO_MP3);
      return;
    }

    // Resolve the stored reference audio for this voice profile.
    pruneVoiceStore();
    const voiceEntry = voiceStore.get(voiceId);
    if (!voiceEntry) {
      response.status(404).json({ error: "Voice profile not found. Please re-clone your voice." });
      return;
    }

    const chatterboxLanguage = toChatterboxLanguageCode(language_code);

    // Set up abortion for client disconnect
    const generateController = new AbortController();
    const onClose = () => {
      console.log("[VoiceForge] Request aborted by client");
      if (speechId) deletePendingStream(speechId);
      generateController.abort();
    };
    request.on("close", onClose);

    // Call Chatterbox and get back a direct audio URL.
    let audioUrl;
    try {
      audioUrl = await generateClonedVoice(
        voiceEntry.audioBuffer,
        voiceEntry.mimeType,
        text,
        chatterboxLanguage,
        voice_settings,
        generateController.signal
      );
    } catch (error) {
      if (error.message === "Request aborted by client") {
        console.log("[VoiceForge] Inference canceled. Cleanup completed.");
        return; // Stop processing, request is already closed
      }
      if (error.message.includes("timed out")) {
        response.status(504).json({ error: error.message });
        return;
      }
      throw error;
    } finally {
      request.off("close", onClose);
      if (speechId) deletePendingStream(speechId);
    }

    // Proxy the audio bytes back to the client so they don't need to reach
    // the Gradio space directly (avoids CORS issues in the browser).
    let upstream;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      upstream = await fetch(audioUrl, { signal: controller.signal });
      clearTimeout(timer);
    } catch (error) {
      if (error.name === "AbortError") {
        response.status(504).json({ error: "Failed to fetch generated audio from Chatterbox due to timeout." });
        return;
      }
      throw error;
    }
    if (!upstream.ok) {
      response.status(502).json({ error: "Failed to fetch generated audio from Chatterbox." });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "audio/wav";
    response.setHeader("Content-Type", contentType);
    response.setHeader("Transfer-Encoding", "chunked");

    const reader = upstream.body.getReader();

    request.on("close", () => {
      reader.cancel().catch((err) => console.error("Error cancelling Chatterbox reader:", err));
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      response.write(value);
    }
    response.end();
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler to check the status, active engine name, and target space identifier.
 *
 * @param {object} request Express request object.
 * @param {object} response Express response object.
 */
export function getStatus(request, response) {
  response.json({
    isMock: getIsMock(),
    engine: "ResembleAI/Chatterbox-Multilingual-TTS",
    space: process.env.VOICE_ENGINE_SPACE || "ResembleAI/Chatterbox-Multilingual-TTS"
  });
}
