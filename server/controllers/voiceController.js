// Implements ElevenLabs voice cloning and text-to-speech proxy handlers.
import crypto from "crypto";
import { getIsMock } from "../utils/mock.js"; // adjust path to actual location
import { isValidLanguageCode } from "../utils/languages.js";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";
const PENDING_STREAMS_MAX = Math.max(
  1,
  Number(process.env.PENDING_STREAMS_MAX) || 1000
);

const PENDING_STREAM_TTL_MS = Math.max(
  1,
  Number(process.env.PENDING_STREAM_TTL_MS) || 60_000
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
    "[VoiceForge] STREAM_SECRET not set — using ephemeral key. " +
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

function getApiKey(request) {
  return request.get("X-ElevenLabs-Api-Key") || process.env.ELEVENLABS_API_KEY;
}

// Read the key from the request header first (client-side override).
// Fall back to the server's environment variable (ELEVENLABS_API_KEY) if not provided by the client.
function requireApiKey(request) {
  const apiKey = request.get("X-ElevenLabs-Api-Key")?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error(
      "An ElevenLabs API key is required. Configure ELEVENLABS_API_KEY on the server or provide it in the X-ElevenLabs-Api-Key header."
    );
    error.status = 401;
    throw error;
  }
  return apiKey;
}

async function readElevenLabsError(response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    return payload.detail?.message || payload.detail || payload.error || text;
  } catch {
    return text || `ElevenLabs request failed with status ${response.status}.`;
  }
}

// Reduces a user-supplied upload filename to a safe value before it is sent
// onward to ElevenLabs. Removes any directory components, then keeps only
// alphanumerics, dot, hyphen, and underscore. Everything else, including null
// bytes and path separators, is replaced with an underscore. Falls back to a
// default name when the input is missing or sanitizes to an empty string.
function sanitizeUploadFileName(originalName) {
  const withoutPath = String(originalName || "").split(/[/\\]/).pop();
  const cleaned = withoutPath
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 200);
  return cleaned || "reference.webm";
}

export async function cloneVoice(request, response, next) {
  try {
    const audioFile = request.file;

    if (!audioFile) {
      response.status(400).json({ error: "Reference audio is required." });
      return;
    }

    // --- mock mode: return a deterministic fixture voice_id ---
    if (getIsMock()) {
      console.warn("[VoiceForge] MOCK_ELEVENLABS: skipping real voice clone, returning fixture.");
      response.json({
        voice_id: "mock-voice-id-00000000",
        name: request.body.name || "VoiceForge Voice (mock)"
      });
      return;
    }

    const apiKey = requireApiKey(request);

    const formData = new FormData();
    formData.append("name", request.body.name || "VoiceForge Voice");
    formData.append("description", "Voice profile created locally by VoiceForge.");
    // Sanitize the client-supplied filename before forwarding it to ElevenLabs.
    // originalname is derived from the Content-Disposition header and is fully
    // user controlled. Strip directory separators and reduce the name to a safe
    // character set so it cannot be used for path traversal or header injection.
    const safeFileName = sanitizeUploadFileName(audioFile.originalname);
    formData.append("files", new Blob([audioFile.buffer], { type: audioFile.mimetype }), safeFileName);

    const { signal: cloneSignal, clear: clearClone } = createTimeoutSignal();
      let elevenResponse;
      try {
        elevenResponse = await fetch(`${ELEVENLABS_BASE_URL}/voices/add`, {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: formData,
        signal: cloneSignal
      });
      clearClone();
    } catch (error) {
      if (error.name === "AbortError") {
        response.status(504).json({
          error: "Voice clone request timed out. Please try again."
        });
        return;
      }
      throw error;
    }

    if (!elevenResponse.ok) {
      const error = new Error(await readElevenLabsError(elevenResponse));
      error.status = elevenResponse.status;
      throw error;
    }

    const payload = await elevenResponse.json();
    response.json({
      voice_id: payload.voice_id,
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
function deletePendingStream(speechId) {
  const entry = pendingStreams.get(speechId);
  if (!entry) {
    return undefined;
  }
  clearTimeout(entry.timeout);
  pendingStreams.delete(speechId);
  return entry;
}

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
    const apiKey = getIsMock() ? null : requireApiKey(request);

    // Fix (Issue 1): trim both fields before checking so whitespace-only
    // strings ("   ") are treated the same as missing values and never reach
    // encryptToken / the ElevenLabs URL interpolation.
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
    if (trimmedText.length > 500) {
      response.status(400).json({ error: "Text too long; maximum 500 characters for streaming." });
      return;
    }
    if (!isValidLanguageCode(language_code)) {
      response.status(400).json({
        error: `Unsupported language code "${language_code}". See ElevenLabs eleven_multilingual_v2 docs for supported codes.`
      });
      return;
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
    const speechId = crypto.randomUUID();

    const timeout = setTimeout(() => {
      deletePendingStream(speechId);
    }, PENDING_STREAM_TTL_MS);
    // Do not keep the event loop alive solely for this cleanup timer.
    timeout.unref?.();
    
    pendingStreams.set(speechId, { text: trimmedText, voiceId: trimmedVoiceId, apiKey, mergedSettings, timeout });

    if (getIsMock()) {
      console.warn(`[VoiceForge] MOCK_ELEVENLABS: speak enqueued mock stream for speechId=${speechId}`);
    }
    const expiresAt = Date.now() + 60000;
    const token = encryptToken({ text: trimmedText, voiceId: trimmedVoiceId, apiKey, language_code, voice_settings, expiresAt });

    response.json({
      speechId: token,
      audioUrl: `/api/voice/speak/stream?t=${token}`
    });
  } catch (error) {
    next(error);
  }
}

export async function streamSpeech(request, response, next) {
  try {
    const token = request.query.t;
    if (!token) {
      response.status(400).json({ error: "Missing stream token." });
      return;
    }
    const { text, voiceId, apiKey, language_code, voice_settings } = decryptToken(token);

    // --- mock mode: stream the bundled silent MP3 fixture ---
    if (getIsMock()) {
      console.warn("[VoiceForge] MOCK_ELEVENLABS: streaming mock audio");
      response.setHeader("Content-Type", "audio/mpeg");
      response.setHeader("Content-Length", String(MOCK_AUDIO_MP3.length));
      response.end(MOCK_AUDIO_MP3);
      return;
    }

  const { signal: streamSignal, clear: clearStream } = createTimeoutSignal();
  let elevenResponse;
  try {
    elevenResponse = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        language_code,
        voice_settings: voice_settings
      })
    });
    clearStream();
  } catch (error) {
    if (error.name === "AbortError") {
      response.status(504).json({
        error: "Speech stream timed out. Please try again."
      });
      return;
    }
    throw error;
  }

    if (!elevenResponse.ok) {
      const errorText = await readElevenLabsError(elevenResponse);
      response.status(elevenResponse.status).send(errorText);
      return;
    }

    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Transfer-Encoding", "chunked");

    const reader = elevenResponse.body.getReader();

    request.on("close", () => {
      reader.cancel().catch((err) => console.error("Error cancelling ElevenLabs reader:", err));
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

export function getStatus(request, response) {
  response.json({
    isMock: getIsMock(),
    hasServerKey: Boolean(process.env.ELEVENLABS_API_KEY?.trim())
  });
}
