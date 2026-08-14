// Implements Chatterbox Multilingual TTS voice cloning and speech proxy handlers.
// Uses the Hugging Face Gradio client to call ResembleAI/Chatterbox-Multilingual-TTS.
import crypto from "crypto";
import { getIsMock } from "../utils/mock.js";
import { isValidLanguageCode, toChatterboxLanguageCode } from "../utils/languages.js";
import { logger } from "../utils/logger.js";
import { FileVoiceStore } from "../utils/FileVoiceStore.js";

export function parseBoundedNumber(rawValue, fallback, min) {
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? Math.max(min, numeric) : fallback;
}

const VOICE_STORE_MAX = parseBoundedNumber(process.env.VOICE_STORE_MAX, 50, 1);
const VOICE_STORE_TTL_MS = parseBoundedNumber(process.env.VOICE_STORE_TTL_MS, 3600000, 1000);
const PENDING_STREAMS_MAX = parseBoundedNumber(process.env.PENDING_STREAMS_MAX, 500, 10);
const PENDING_STREAM_TTL_MS = parseBoundedNumber(process.env.PENDING_STREAM_TTL_MS, 60000, 1000);
const MAX_VOICE_UPLOAD_BYTES = parseBoundedNumber(process.env.MAX_VOICE_UPLOAD_BYTES, 10485760, 1024);

// ---------------------------------------------------------------------------
// Disk-backed voice store: persists voice profiles to local filesystem
// ---------------------------------------------------------------------------
export const voiceStore = new FileVoiceStore(
  process.env.VOICE_DATA_DIR,
  VOICE_STORE_MAX
);

const getMaxStoredVoices = () => VOICE_STORE_MAX;
const getVoiceStoreTtlMs = () => VOICE_STORE_TTL_MS;
const getPendingStreamsMax = () => PENDING_STREAMS_MAX;
const getPendingStreamTtlMs = () => PENDING_STREAM_TTL_MS;
const getMaxVoiceUploadBytes = () => MAX_VOICE_UPLOAD_BYTES;

// Sanitizes a filename by removing path traversal sequences and special characters.
// Prevents injection attacks and ensures safe transmission to external APIs.
function sanitizeFilename(filename) {
  return (filename || "reference.webm")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, "_")
    .substring(0, 100);
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
      Buffer.from(iv, "base64"),
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
    const err = new Error("Audio link expired — please generate speech again.");
    err.status = 400;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Gradio / Chatterbox voice generation
// ---------------------------------------------------------------------------

let cachedGradioClient = null;
let currentSpaceIdentifier = null;

async function getGradioClient() {
  const spaceIdentifier = process.env.VOICE_ENGINE_SPACE || "ResembleAI/Chatterbox-Multilingual-TTS";
  if (!cachedGradioClient || currentSpaceIdentifier !== spaceIdentifier) {
    const { client } = await import("@gradio/client");
    try {
      cachedGradioClient = await withTimeout(client(spaceIdentifier), 10000, "Chatterbox client init");
      currentSpaceIdentifier = spaceIdentifier;
    } catch (err) {
      if (
        err.message?.includes("SPACE_INITIALIZING") || 
        err.message?.includes("Space is sleeping") || 
        err.message?.includes("is sleeping") ||
        err.message?.includes("Chatterbox client init timed out")
      ) {
        const error = new Error("AI Engine is waking up");
        error.isColdStart = true;
        error.status = 503;
        throw error;
      }
      throw err;
    }
  }
  return cachedGradioClient;
}
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
  const spaceIdentifier = process.env.VOICE_ENGINE_SPACE || "ResembleAI/Chatterbox-Multilingual-TTS";
  const normalizedVoiceSettings =
    voiceSettings && typeof voiceSettings === "object" ? voiceSettings : {};

  // Check if space is running to avoid infinite stalls on cold-starts
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const hfRes = await fetch(`https://huggingface.co/api/spaces/${spaceIdentifier}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    
    if (hfRes.ok) {
      const hfData = await hfRes.json();
      const stage = hfData.runtime?.stage;
      if (stage && stage !== "RUNNING") {
        const { client } = await import("@gradio/client");
        // Trigger client initialization asynchronously in background to wake it up
        client(spaceIdentifier).catch(() => {});
        
        const error = new Error(`Voice engine is warming up (current status: ${stage}). Please try again shortly.`);
        error.status = 503;
        throw error;
      }
    }
  } catch (err) {
    if (err.status === 503) {
      throw err;
    }
    console.warn("[VoiceForge] Failed to check space status:", err.message);
  }

  const { client } = await import("@gradio/client");
  /** @type {import("@gradio/client").GradioApp} */
  const app = await withTimeout(
    client(spaceIdentifier),
    10000,
    "Chatterbox client init",
  );

  // Wrap the raw Buffer in a Blob so Gradio treats it as a file upload.
  const referenceBlob = new Blob([audioBuffer], { type: mimeType });
  const exaggeration = clampNumber(normalizedVoiceSettings.style, 0.25, 2, 0.5);
  const cfgWeight = clampNumber(normalizedVoiceSettings.stability, 0.2, 1, 0.5);
  const temperature = clampNumber(
    normalizedVoiceSettings.temperature,
    0.05,
    5,
    0.8,
  );
  const seed = Number.isInteger(normalizedVoiceSettings.seed)
    ? normalizedVoiceSettings.seed
    : 0;

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

export function clampNumber(value, min, max, fallback) {
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
async function pruneVoiceStore(now = Date.now()) {
  await voiceStore.prune(now);
}

// Test-only hook: exposes store size so tests can assert on eviction/TTL
// behavior without reaching into the module-private Map directly.
export function __getVoiceStoreSize() {
  return voiceStore.size;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function cloneVoice(request, response, next) {
  const lockId = getRequestLockId(request);

  try {
    const audioFile = request.file;

    if (!audioFile) {
      response.status(400).json({ error: "Reference audio is required." });
      return;
    }

    // The MIME type checked in upload.js comes from the client and can be
    // spoofed. Verify the buffer begins with a known audio magic-byte
    // signature so arbitrary binary data cannot be forwarded to ElevenLabs.
    if (!isValidAudioBuffer(audioFile.buffer)) {
      response.status(400).json({ error: "Uploaded file does not appear to be valid audio." });
      return;
    }

    // --- mock mode: return a deterministic fixture voice_id ---
    if (getIsMock()) {
      const voiceId = crypto.randomUUID();
      voiceStore.set(voiceId, {
        name: request.body.name || "VoiceForge Voice (mock)",
        audioBuffer: Buffer.from("mock"),
        mimeType: "audio/webm",
        expiresAt: Date.now() + VOICE_STORE_TTL_MS
      });
      pruneVoiceStore();
      
      response.json({
        voice_id: voiceId,
        name: request.body.name || "VoiceForge Voice (mock)"
      });
      return;
    }

    // Store the audio buffer server-side so it can be used during speak/stream.
    await pruneVoiceStore();
    const voiceId = crypto.randomUUID();

    // Fix (IDOR): voice_id alone used to be sufficient to use someone else's
    // cloned voice, since voiceStore has no per-user access control and
    // voice_id can leak via logs, referrers, shared links, etc. We now mint
    // a separate high-entropy owner token at clone time and only store its
    // hash; speak() must present the matching plaintext token to use this
    // voice. The plaintext token is returned once, here, and never again.
    const ownerToken = crypto.randomBytes(24).toString("base64url");
    const ownerTokenHash = crypto
      .createHash("sha256")
      .update(ownerToken)
      .digest("hex");

    await voiceStore.set(voiceId, {
      name: request.body.name || "VoiceForge Voice",
      audioBuffer: audioFile.buffer,
      mimeType: audioFile.mimetype,
      ownerTokenHash,
      expiresAt: Date.now() + VOICE_STORE_TTL_MS
    });
    pruneVoiceStore();

    if (!elevenResponse.ok) {
      const error = new Error(await readElevenLabsError(elevenResponse));
      error.status = elevenResponse.status;
      throw error;
    }

    const payload = await elevenResponse.json();
    releaseCloneLock(lockId);
    response.json({
      voice_id: voiceId,
      owner_token: ownerToken,
      name: request.body.name || "VoiceForge Voice",
    });
  } catch (error) {
    releaseCloneLock(lockId);
    next(error);
  }
}

// Hard cap on the number of pending stream entries kept in memory.
// Each entry stores an ElevenLabs API key and request parameters for up
// to 60 seconds. Without a cap a burst of requests can exhaust heap memory.
// When the cap is reached the oldest entry is evicted to make room.
const pendingStreams = new Map();

function deletePendingStream(id) {
  const entry = pendingStreams.get(id);
  if (entry) {
    if (entry.timeoutId) clearTimeout(entry.timeoutId);
    pendingStreams.delete(id);
  }
  return entry;
}

function addPendingStream(id, value, ttlMs = 60000) {
  if (pendingStreams.size >= PENDING_STREAMS_MAX) {
    // Evict the oldest entry (Map iteration order is insertion order).
    const oldestKey = pendingStreams.keys().next().value;
    deletePendingStream(oldestKey);
  }

  const timeoutId = setTimeout(() => {
    deletePendingStream(id);
  }, ttlMs);
  timeoutId.unref?.();

  pendingStreams.set(id, { ...value, timeoutId });
}

export async function speak(request, response, next) {
  try {
    const apiKey = requireApiKey(request);
    const { text, voice_id: voiceId, voice_settings, model_id } = request.body;

    if (pendingStreams.size >= PENDING_STREAMS_MAX) {
      response.status(503).json({
        error:
          "Too many pending speech requests. Please retry after retrieving or cancelling existing audio streams.",
      });
      return;
    }
    // Fix (Issue 1): trim both fields before checking so whitespace-only
    // strings ("   ") are treated the same as missing values.
    const trimmedText = typeof text === "string" ? text.trim() : "";
    const trimmedVoiceId = typeof voiceId === "string" ? voiceId.trim() : "";

    if (!trimmedText && !trimmedVoiceId) {
      response
        .status(400)
        .json({ error: "Both text and voice_id are required." });
      return;
    }
    if (!trimmedText) {
      response
        .status(400)
        .json({ error: "text is required and must not be blank." });
      return;
    }
    if (!trimmedVoiceId) {
      response
        .status(400)
        .json({ error: "voice_id is required and must not be blank." });
      return;
    }
    await pruneVoiceStore();
    if (!getIsMock() && !(await voiceStore.has(trimmedVoiceId))) {
      response.status(404).json({ error: "Voice profile not found. Please re-clone your voice." });
      return;
    }
    if (trimmedText.length > 300) {
      response.status(400).json({
        error: "Text too long; maximum 300 characters for Chatterbox TTS.",
      });
      return;
    }
    if (!isValidLanguageCode(language_code)) {
      response.status(400).json({
        error: `Unsupported language code "${language_code}". See Chatterbox Multilingual docs for supported codes.`,
      });
      return;
    }

    // Fix (IDOR): verify the caller actually owns this voice_id before
    // queuing any synthesis work. Skipped in mock mode since cloneVoice
    // never persists a real voiceStore entry (or owner token) there.
    if (!getIsMock()) {
      await pruneVoiceStore();
      const voiceEntry = await voiceStore.get(trimmedVoiceId);
      if (!voiceEntry) {
        response.status(404).json({ error: "Voice profile not found. Please re-clone your voice." });
        return;
      }
      const trimmedOwnerToken = typeof ownerToken === "string" ? ownerToken.trim() : "";
      const providedHash = trimmedOwnerToken
        ? crypto.createHash("sha256").update(trimmedOwnerToken).digest("hex")
        : null;
      const isAuthorized =
        !!providedHash &&
        providedHash.length === voiceEntry.ownerTokenHash.length &&
        crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(voiceEntry.ownerTokenHash));
      if (!isAuthorized) {
        response.status(403).json({ error: "Invalid or missing owner_token for this voice_id." });
        return;
      }
    }

    const defaultVoiceSettings = {
      stability: 0.45,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    };

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const sanitizedSettings = {};
    if (voice_settings && typeof voice_settings === "object") {
      if (
        typeof voice_settings.stability === "number" &&
        Number.isFinite(voice_settings.stability)
      ) {
        sanitizedSettings.stability = clamp01(voice_settings.stability);
      }
      if (
        typeof voice_settings.similarity_boost === "number" &&
        Number.isFinite(voice_settings.similarity_boost)
      ) {
        sanitizedSettings.similarity_boost = clamp01(
          voice_settings.similarity_boost
        );
      }
      if (
        typeof voice_settings.style === "number" &&
        Number.isFinite(voice_settings.style)
      ) {
        sanitizedSettings.style = clamp01(voice_settings.style);
      }
      if (typeof voice_settings.use_speaker_boost === "boolean") {
        sanitizedSettings.use_speaker_boost =
          voice_settings.use_speaker_boost;
      }
    }

    const mergedSettings = { ...defaultVoiceSettings, ...sanitizedSettings };

    // Cryptographically secure, 128-bit identifier. Unlike Math.random(), this
    // cannot be reproduced from a seed or enumerated by a co-located process,
    // so the stored API key cannot be retrieved by guessing the stream key.
    const speechId = randomUUID();

    evictOldestPendingStreams();

    const timeout = setTimeout(() => {
      deletePendingStream(speechId);
    }, PENDING_STREAM_TTL_MS);
    // Do not keep the event loop alive solely for this cleanup timer.
    timeout.unref?.();

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
  } catch (error) {
    next(error);
  }
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

    const streamData = pendingStreams.get(speechId);

    // Fix (replay protection): decryptToken only checks that the token is
    // authentic and not expired - it does not check that it hasn't already
    // been consumed. Previously this only *checked* pendingStreams.has(),
    // and the entry wasn't removed until the `finally` block after
    // generation completed - so two replays arriving within that window
    // (or within the 60s token validity window generally) could both pass
    // the check and each trigger a full, costly Chatterbox generation.
    //
    // Fix: consume (delete) the pending entry atomically right here, before
    // any async work starts. A missing/undefined entry means the token was
    // already redeemed (or never existed), so we 410. The later cleanup
    // calls to deletePendingStream() elsewhere in this handler are now
    // no-ops for the happy path, but are kept as a safety net for the
    // abort/mock code paths.
    const pendingEntry = speechId ? deletePendingStream(speechId) : undefined;
    if (!pendingEntry) {
      response.status(410).json({
        error:
          "This speech token has already been used or has expired. Please request a new one.",
      });
      return;
    }

    // Verify the caller's API key matches the key used to create the speech stream.
    // This prevents unauthorized callers from using another user's speechId to consume their quota.
    if (requestApiKey !== streamData.apiKey) {
      response.status(403).json({ error: "Unauthorized. The API key provided does not match the speech request." });
      return;
    }

    // Verify the caller's API key matches the key used to create the speech stream.
    // This prevents unauthorized callers from using another user's speechId to consume their quota.
    if (requestApiKey !== streamData.apiKey) {
      response.status(403).json({ error: "Unauthorized. The API key provided does not match the speech request." });
      return;
    }

    // Clean up immediately after retrieving parameters to prevent memory leaks
    pendingStreams.delete(speechId);

    // Resolve the stored reference audio for this voice profile.
    await pruneVoiceStore();
    const voiceEntry = await voiceStore.get(voiceId);
    if (!voiceEntry) {
      response.status(404).json({
        error: "Voice profile not found. Please re-clone your voice.",
      });
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
        voiceEntry.audio_data,
        voiceEntry.mime_type,
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
      if (error.status === 503) {
        response.status(503).json({ error: error.message });
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
        response.status(504).json({
          error:
            "Failed to fetch generated audio from Chatterbox due to timeout.",
        });
        return;
      }
      throw error;
    }
    if (!upstream.ok) {
      response
        .status(502)
        .json({ error: "Failed to fetch generated audio from Chatterbox." });
      return;
    }

    const contentType = upstream.headers.get("content-type") || "audio/wav";
    response.setHeader("Content-Type", contentType);
    response.setHeader("Transfer-Encoding", "chunked");

    const reader = upstream.body.getReader();

    request.on("close", () => {
      reader.cancel().catch((err) => console.error("Error cancelling Chatterbox reader:", err));
    });

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        response.write(value);
      }
      response.end();
    } catch (streamError) {
      console.error("Stream reading error:", streamError);
      if (!response.headersSent) {
        next(streamError);
      } else {
        response.end();
      }
    }
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
    space:
      process.env.VOICE_ENGINE_SPACE ||
      "ResembleAI/Chatterbox-Multilingual-TTS",
  });
}

/**
 * Express handler to get all saved voice profiles (excluding binary audio data).
 */
export async function getProfiles(request, response, next) {
  try {
    const db = await getDb();
    const profiles = await db.all('SELECT voice_id, name, created_at FROM voice_profiles ORDER BY created_at DESC');
    const mappedProfiles = profiles.map(p => ({
      id: p.voice_id,
      voice_id: p.voice_id,
      name: p.name,
      createdAt: p.created_at
    }));
    response.json(mappedProfiles);
  } catch (error) {
    next(error);
  }
}

/**
 * Express handler to delete a saved voice profile.
 */
export async function deleteProfile(request, response, next) {
  try {
    const { voiceId } = request.params;
    const db = await getDb();
    await db.run('DELETE FROM voice_profiles WHERE voice_id = ?', [voiceId]);
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
}
