// Lets users save their ElevenLabs API key locally and manage browser-stored voice profiles.
import React from "react";
import { ExternalLink, Trash2, CircleAlert } from "lucide-react";
import {
  deleteVoiceProfile,
  getSavedProfiles,
} from "../hooks/useVoiceClone.js";


function AudioPlayback({ blob }) {
  const [audioUrl, setAudioUrl] = React.useState(null);

  React.useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  if (!audioUrl) return null;
  return (
    <audio
      src={audioUrl}
      controls
      className="mt-2 h-8 w-full max-w-xs"
    />
  );
}

export default function Settings() {
  const [profiles, setProfiles] = React.useState([]);
  const [dbError, setDbError] = React.useState("");
  const [apiKey, setApiKey] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:elevenlabsApiKey") || "";
    } catch {
      return "";
    }
  });
  
  React.useEffect(() => {
    async function loadProfiles() {
      try {
        const loaded = await getSavedProfiles();
        setProfiles(loaded);
        setDbError("");
      } catch (err) {
        setDbError(err?.message || String(err));
      }
    }
    loadProfiles();
  }, []);

  const defaultSettings = { stability: 0.45, similarity_boost: 0.8, style: 0.2 };
  const [voiceSettings, setVoiceSettings] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("voiceforge:voiceSettings")) || defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  function saveApiKey() {
    try {
      localStorage.setItem("voiceforge:elevenlabsApiKey", apiKey);
    } catch {
      // Storage unavailable
    }
  }

  function saveVoiceSettings(newSettings) {
    setVoiceSettings(newSettings);
    try {
      localStorage.setItem("voiceforge:voiceSettings", JSON.stringify(newSettings));
    } catch {
      // Storage unavailable
    }
  }

  async function removeProfile(voiceId) {
    try {
      const next = await deleteVoiceProfile(voiceId);
      setProfiles(next);
      setDbError("");
    } catch (err) {
      setDbError(err?.message || String(err));
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-black p-6 text-white shadow-soft dark:border dark:border-border dark:bg-surface dark:shadow-soft-dk">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
          Step 3 of 3
        </p>
        <h2 className="mt-2 text-3xl font-bold">Settings</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-white/75">
          Manage voice profiles saved in this browser.
        </p>
      </section>
      {dbError && (
      <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink">
        <CircleAlert size={18} aria-hidden="true" />
        <span>Database error: {dbError}</span>
      </div>
    )}

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1 text-sm font-bold" htmlFor="api-key">
            ElevenLabs API key
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-md border border-ink/15 bg-cloud px-3 text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint dark:border-border dark:bg-black dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-glow dark:focus:ring-glow/25"
              placeholder="sk_..."
            />
          </label>
          <button
            type="button"
            onClick={saveApiKey}
            className="min-h-11 rounded-md bg-moss px-5 font-bold text-white"
          >
            Save key
          </button>
          <a
            href="https://elevenlabs.io/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink/15 px-4 font-bold text-ink hover:border-moss hover:text-moss dark:border-border dark:text-neutral-200 dark:hover:border-glow dark:hover:text-glow"
          >
            Free tier
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="mt-3 text-sm text-ink/65 dark:text-muted">
          The backend reads `.env` first. This local key is available for future
          client-only experiments.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <h2 className="text-xl font-bold">Voice Synthesis Settings</h2>
        <p className="mt-1 text-sm text-ink/65 mb-5">Adjust how ElevenLabs generates your cloned speech.</p>
        
        <div className="space-y-4">
          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="stability">
              <span>Stability</span>
              <span className="text-ink/65">{voiceSettings.stability}</span>
            </label>
            <input
              id="stability"
              type="range"
              min="0" max="1" step="0.01"
              value={voiceSettings.stability}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, stability: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Lower values are more expressive; higher values are more consistent.</p>
          </div>
          
          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="similarity">
              <span>Similarity Boost</span>
              <span className="text-ink/65">{voiceSettings.similarity_boost}</span>
            </label>
            <input
              id="similarity"
              type="range"
              min="0" max="1" step="0.01"
              value={voiceSettings.similarity_boost}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, similarity_boost: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Higher values make the voice closer to the original but may introduce artifacts.</p>
          </div>

          <div>
            <label className="flex justify-between text-sm font-bold" htmlFor="style">
              <span>Style Exaggeration</span>
              <span className="text-ink/65">{voiceSettings.style}</span>
            </label>
            <input
              id="style"
              type="range"
              min="0" max="1" step="0.01"
              value={voiceSettings.style}
              onChange={(e) => saveVoiceSettings({ ...voiceSettings, style: parseFloat(e.target.value) })}
              className="w-full mt-2"
            />
            <p className="text-xs text-ink/50 mt-1">Higher values exaggerate the style of the reference audio.</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <h2 className="text-xl font-bold">Saved voice profiles</h2>
        <div className="mt-4 divide-y divide-ink/10 rounded-md border border-ink/10 dark:divide-border dark:border-border">
          {profiles.length === 0 && (
            <p className="p-4 text-sm text-ink/65 dark:text-muted">
              No saved profiles yet.
            </p>
          )}
          {profiles.map((profile) => (
            <div
              key={profile.voice_id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">{profile.name}</p>
                <p className="mt-1 break-all text-sm text-ink/60 dark:text-muted">
                  {profile.voice_id}
                </p>
                {profile.audioBlob && <AudioPlayback blob={profile.audioBlob} />}
 
              </div>
              <button
                type="button"
                onClick={() => removeProfile(profile.voice_id)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-coral/40 px-3 py-2 font-bold text-coral hover:bg-coral hover:text-white"
              >
                <Trash2 size={16} aria-hidden="true" />
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
