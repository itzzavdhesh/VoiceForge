// Implements ElevenLabs voice cloning and text-to-speech proxy handlers.
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// ElevenLabs bills by character count. This cap prevents a single request
// from consuming a large share of the monthly quota. Configurable via the
// SPEAK_TEXT_MAX_LENGTH environment variable; defaults to 2000 characters.
const SPEAK_TEXT_MAX_LENGTH = parseInt(process.env.SPEAK_TEXT_MAX_LENGTH, 10) || 2000;

function getApiKey() {
  return process.env.ELEVENLABS_API_KEY?.trim();
}

function requireApiKey() {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("Missing ElevenLabs API key. Set ELEVENLABS_API_KEY in your server .env file.");
    error.status = 500;
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

export async function cloneVoice(request, response, next) {
  try {
    const apiKey = requireApiKey();
    const audioFile = request.file;

    if (!audioFile) {
      response.status(400).json({ error: "Reference audio is required." });
      return;
    }

    const formData = new FormData();
    formData.append("name", request.body.name || "VoiceForge Voice");
    formData.append("description", "Voice profile created locally by VoiceForge.");
    formData.append("files", new Blob([audioFile.buffer], { type: audioFile.mimetype }), audioFile.originalname || "reference.webm");

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

const pendingStreams = new Map();

export async function speak(request, response, next) {
  try {
    const apiKey = requireApiKey(request);
    const { text, voice_id: voiceId, voice_settings } = request.body;

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
    const speechId = Math.random().toString(36).substring(2, 15);
    pendingStreams.set(speechId, { text, voiceId, apiKey, mergedSettings });

    // Set a timeout to clean up if the stream is never requested within 60s
    setTimeout(() => {
      pendingStreams.delete(speechId);
    }, 60000);

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
    pendingStreams.delete(speechId);

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
