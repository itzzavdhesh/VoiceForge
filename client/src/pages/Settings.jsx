// Lets users save their ElevenLabs API key locally and manage browser-stored voice profiles.
import React from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteVoiceProfile, getSavedProfiles } from "../hooks/useVoiceClone.js";

export default function Settings() {
  const [apiKey, setApiKey] = React.useState(localStorage.getItem("voiceforge:elevenlabsApiKey") || "");
  const [profiles, setProfiles] = React.useState(getSavedProfiles());

  function saveApiKey() {
    localStorage.setItem("voiceforge:elevenlabsApiKey", apiKey);
  }

  function removeProfile(voiceId) {
    setProfiles(deleteVoiceProfile(voiceId));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-ink p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">Step 3 of 3</p>
        <h2 className="mt-2 text-3xl font-bold">Settings</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-white/75">
          Store your ElevenLabs key for local experiments and manage voice profiles saved in this browser.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1 text-sm font-bold" htmlFor="api-key">
            ElevenLabs API key
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-md border border-ink/15 bg-cloud px-3 outline-none focus:border-moss focus:ring-4 focus:ring-mint"
              placeholder="sk_..."
            />
          </label>
          <button type="button" onClick={saveApiKey} className="min-h-11 rounded-md bg-moss px-5 font-bold text-white">
            Save key
          </button>
          <a
            href="https://elevenlabs.io/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-ink/15 px-4 font-bold text-ink hover:border-moss hover:text-moss"
          >
            Free tier
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>
        <p className="mt-3 text-sm text-ink/65">
          The backend reads `.env` first. This local key is available for future client-only experiments.
        </p>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold">Saved voice profiles</h2>
        <div className="mt-4 divide-y divide-ink/10 rounded-md border border-ink/10">
          {profiles.length === 0 && <p className="p-4 text-sm text-ink/65">No saved profiles yet.</p>}
          {profiles.map((profile) => (
            <div key={profile.voice_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">{profile.name}</p>
                <p className="mt-1 break-all text-sm text-ink/60">{profile.voice_id}</p>
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
