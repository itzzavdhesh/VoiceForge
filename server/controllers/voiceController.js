// Implements ElevenLabs voice cloning and text-to-speech proxy handlers.
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

function getApiKey(request) {
  return request.get("X-ElevenLabs-Api-Key") || process.env.ELEVENLABS_API_KEY;
}

function requireApiKey(request) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    const error = new Error("Missing ElevenLabs API key. Add it to .env or Settings.");
    error.status = 400;
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
    const apiKey = requireApiKey(request);
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

export async function speak(request, response, next) {
  try {
    const apiKey = requireApiKey(request);
    const { text, voice_id: voiceId } = request.body;

    if (!text || !voiceId) {
      response.status(400).json({ error: "Both text and voice_id are required." });
      return;
    }

    const elevenResponse = await fetch(`${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      })
    });

    if (!elevenResponse.ok) {
      const error = new Error(await readElevenLabsError(elevenResponse));
      error.status = elevenResponse.status;
      throw error;
    }

    const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Content-Length", audioBuffer.length);
    response.send(audioBuffer);
  } catch (error) {
    next(error);
  }
}
