import { useState } from 'react';
import { useVoiceForgeTTS } from '../hooks/useVoiceForgeTTS';

/**
 * TTSDemo
 * -----------------------------------------------------------------------
 * Minimal demo proving the core accessibility flow for Track 1 (#253):
 * type text, hear it spoken aloud, entirely client-side.
 *
 * Drop this anywhere to verify the hook works, e.g. temporarily in
 * App.jsx:
 *
 *   import TTSDemo from './components/TTSDemo';
 *   ...
 *   <TTSDemo />
 *
 * Move it into a real page under src/pages once routing conventions
 * are settled.
 */
export default function TTSDemo() {
  const {
    speak,
    cancel,
    voices,
    isSpeaking,
    isSupported,
    voiceName,
    setVoiceName,
    rate,
    setRate,
    pitch,
    setPitch,
  } = useVoiceForgeTTS();

  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  if (!isSupported) {
    return (
      <div className="p-4 rounded-lg bg-red-900/30 text-red-200 text-sm">
        SpeechSynthesis isn't supported in this browser.
      </div>
    );
  }

  const handleSpeak = async () => {
    setStatus('Speaking…');
    try {
      await speak(text);
      setStatus('Done.');
    } catch {
      setStatus('Error speaking text.');
    }
  };

  const handleStop = () => {
    cancel();
    setStatus('Stopped.');
  };

  return (
    <div className="max-w-md w-full mx-auto p-6 rounded-xl bg-slate-900 border border-slate-700 text-slate-100">
      <h2 className="text-lg font-semibold mb-1">🗣️ VoiceForge — Local TTS</h2>
      <p className="text-xs text-slate-400 mb-4">
        Type below and hear it spoken instantly — entirely in your browser.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something to speak aloud…"
        className="w-full min-h-[100px] rounded-lg bg-slate-950 border border-slate-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-2 mt-3 flex-wrap">
        <select
          value={voiceName || ''}
          onChange={(e) => setVoiceName(e.target.value)}
          className="flex-1 min-w-[160px] rounded-lg bg-slate-950 border border-slate-700 p-2 text-sm"
        >
          {voices.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
        <button
          onClick={handleSpeak}
          disabled={isSpeaking}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
        >
          ▶ Speak
        </button>
        <button
          onClick={handleStop}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
        >
          ■ Stop
        </button>
      </div>

      <div className="flex gap-4 mt-3 text-xs text-slate-400">
        <label className="flex items-center gap-2">
          Rate
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
          />
        </label>
        <label className="flex items-center gap-2">
          Pitch
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
          />
        </label>
      </div>

      <div className="mt-3 text-xs text-slate-400 min-h-[16px]">{status}</div>
    </div>
  );
}