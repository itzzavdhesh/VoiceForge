// Sends typed text to the local backend and returns playable cloned speech audio.
import React from "react";
import { getApiKey } from "../utils/apiKeyStorage.js";
import { loadVoiceSettings } from "../utils/voiceSettings.js";

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // chunk length
  setUint16(1); // sample format (raw PCM)
  setUint16(numOfChan); // channel count
  setUint32(buffer.sampleRate); // sample rate
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate (sample rate * block align)
  setUint16(numOfChan * 2); // block align (channel count * bytes per sample)
  setUint16(16); // bits per sample

  setUint32(0x61746164); // "data" chunk identifier
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([bufferArr], { type: "audio/wav" });

  function setUint16(data) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export default function useTTS() {
  const [status, setStatus] = React.useState("idle");
  const [error, setError] = React.useState("");
  const [audioUrl, setAudioUrl] = React.useState("");

  async function speak({ text, voiceId, language_code}) {
    setError("");
    setStatus("speaking");

    const apiKey = getApiKey();
    if (!apiKey || apiKey === "mock") {
      try {
        // Generate a synthesized beep/melody to mock speech audio locally
        const duration = Math.max(1.0, Math.min(8.0, text.length * 0.06));
        const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * duration, 44100);
        
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        
        osc.type = "sine";
        
        // Pitch modulation simulating speaking sweeps
        osc.frequency.setValueAtTime(180, 0);
        for (let t = 0.1; t < duration; t += 0.2) {
          const freq = 150 + Math.sin(t * 10) * 80 + Math.random() * 20;
          osc.frequency.linearRampToValueAtTime(freq, t);
        }
        
        // Amplitude modulation simulating word and syllable boundaries
        gain.gain.setValueAtTime(0, 0);
        let isPeak = true;
        for (let t = 0.05; t < duration - 0.05; t += 0.15) {
          const vol = isPeak ? (0.4 + Math.random() * 0.4) : 0.02;
          gain.gain.linearRampToValueAtTime(vol, t);
          isPeak = !isPeak;
        }
        gain.gain.linearRampToValueAtTime(0, duration);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        
        osc.start(0);
        osc.stop(duration);

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        const nextAudioUrl = URL.createObjectURL(wavBlob);

        setAudioUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return nextAudioUrl;
        });
        setStatus("ready");
        return { audioUrl: nextAudioUrl };
      } catch (err) {
        setError(err.message || "Local mock speech synthesis failed.");
        setStatus("error");
        throw err;
      }
    }

    try {
      const voiceSettings = loadVoiceSettings();

      const apiKey = getApiKey();
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ElevenLabs-Api-Key": apiKey,
        },
        body: JSON.stringify({
  text,
  voice_id: voiceId,
  language_code,
  voice_settings: voiceSettings
})
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Speech generation failed.");
      }

      const payload = await response.json();
      const nextAudioUrl = payload.audioUrl;
      setAudioUrl(nextAudioUrl);
      setStatus("ready");
      return { audioUrl: nextAudioUrl };
    } catch (ttsError) {
      setError(ttsError?.message || String(ttsError));
      setStatus("error");
      throw ttsError;
    }
  }

  return { speak, status, error, audioUrl };
}
