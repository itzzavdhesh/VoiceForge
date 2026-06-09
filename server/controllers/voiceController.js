// Implements ElevenLabs voice cloning and text-to-speech proxy handlers.
import { randomUUID } from "node:crypto";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// ---------------------------------------------------------------------------
// Dev/CI mock mode
// ---------------------------------------------------------------------------
// Set MOCK_ELEVENLABS=true in .env to skip real ElevenLabs network calls.
// The mock is evaluated dynamically at request time to ensure dotenv has loaded.
// ---------------------------------------------------------------------------
const getIsMock = () =>
  process.env.MOCK_ELEVENLABS === "true" &&
  process.env.NODE_ENV !== "production";

// A minimal valid MP3 frame (ID3v2 + one silent MPEG frame) so the browser
// Audio element can actually decode and play the mock response.
const MOCK_AUDIO_MP3 = Buffer.from(
  "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA" +
  "//uQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8A" +
  "AAABAAAB/////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "base64"
);

// ElevenLabs bills by character count. This cap prevents a single request
// from consuming a large share of the monthly quota. Configurable via the
// SPEAK_TEXT_MAX_LENGTH environment variable; defaults to 2000 characters.
const SPEAK_TEXT_MAX_LENGTH = parseInt(process.env.SPEAK_TEXT_MAX_LENGTH, 10) || 2000;

// Each pending stream holds a caller-supplied ElevenLabs API key in memory
// until the audio is streamed or the entry expires. Cap the number of
// concurrent entries so a burst of /speak calls cannot grow the Map without
// bound and exhaust process memory. Configurable via PENDING_STREAMS_MAX;
// defaults to 1000 entries.
const PENDING_STREAMS_MAX = parseInt(process.env.PENDING_STREAMS_MAX, 10) || 1000;

// A pending stream is discarded if it is not consumed within this window.
const PENDING_STREAM_TTL_MS = parseInt(process.env.PENDING_STREAM_TTL_MS, 10) || 60000;

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

    const elevenResponse = await fetch(`${ELEVENLABS_BASE_URL}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: formData
    });

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

// Drop the oldest entries until the store is below its configured cap. Map
// preserves insertion order, so the first key is always the oldest.
function evictOldestPendingStreams() {
  while (pendingStreams.size >= PENDING_STREAMS_MAX) {
    const oldestKey = pendingStreams.keys().next().value;
    if (oldestKey === undefined) {
      break;
    }
    deletePendingStream(oldestKey);
  }
}

export async function speak(request, response, next) {
  try {
    const { text, voice_id: voiceId, voice_settings } = request.body;

    if (!getIsMock()) {
      // Only require a real API key when not in mock mode.
      requireApiKey(request);
    }

    if (!text || !voiceId) {
      response.status(400).json({ error: "Both text and voice_id are required." });
      return;
    }

    if (text.length > SPEAK_TEXT_MAX_LENGTH) {
      response.status(400).json({
        error: `Text must not exceed ${SPEAK_TEXT_MAX_LENGTH} characters. Received ${text.length}.`
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
    const speechId = randomUUID();

    evictOldestPendingStreams();

    const timeout = setTimeout(() => {
      deletePendingStream(speechId);
    }, PENDING_STREAM_TTL_MS);
    // Do not keep the event loop alive solely for this cleanup timer.
    timeout.unref?.();

    const apiKey = getIsMock() ? null : requireApiKey(request);
    pendingStreams.set(speechId, { text, voiceId, apiKey, mergedSettings, timeout });

    if (getIsMock()) {
      console.warn(`[VoiceForge] MOCK_ELEVENLABS: speak enqueued mock stream for speechId=${speechId}`);
    }

    response.json({
      speechId,
      audioUrl: `/api/voice/speak/stream/${speechId}`
    });
  } catch (error) {
    next(error);
  }
}

export async function streamSpeech(request, response, next) {
  try {
    const { speechId } = request.params;
    const streamData = pendingStreams.get(speechId);

    if (!streamData) {
      response.status(404).json({ error: "Speech stream not found or expired." });
      return;
    }

    // Clean up immediately after retrieving parameters to prevent memory leaks
    deletePendingStream(speechId);

    // --- mock mode: stream the bundled silent MP3 fixture ---
    if (getIsMock()) {
      console.warn(`[VoiceForge] MOCK_ELEVENLABS: streaming mock audio for speechId=${speechId}`);
      response.setHeader("Content-Type", "audio/mpeg");
      response.setHeader("Content-Length", String(MOCK_AUDIO_MP3.length));
      response.end(MOCK_AUDIO_MP3);
      return;
    }

    const { text, voiceId, apiKey, mergedSettings } = streamData;

    const elevenResponse = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: mergedSettings
      })
    });

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

