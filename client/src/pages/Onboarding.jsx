// Renders the first-time setup flow for recording and cloning a reference voice.
import React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import useVoiceClone from "../hooks/useVoiceClone.js";

export default function Onboarding({ onReady }) {
  const [recording, setRecording] = React.useState(null);
  const [voiceName, setVoiceName] = React.useState("VoiceForge Voice");
  const [successProfile, setSuccessProfile] = React.useState(null);
  const { cloneVoice, status, error } = useVoiceClone();
  const isCloning = status === "cloning";

  async function handleClone() {
    if (!recording) return;
    const profile = await cloneVoice(recording, voiceName);
    setSuccessProfile(profile);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-ink p-6 text-white shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">Step 1 of 3</p>
            <h2 className="mt-2 text-3xl font-bold">Create your voice profile</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/75">
              Record a short, consent-based reference clip. VoiceForge sends it to ElevenLabs through your local server and saves the returned voice ID in this browser.
            </p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-3 gap-2" aria-label="Onboarding progress">
            {["Record", "Clone", "Call"].map((step, index) => (
              <div key={step} className={`h-2 rounded-full ${index === 0 ? "bg-coral" : "bg-white/25"}`} title={step} />
            ))}
          </div>
        </div>
      </section>

      <VoiceRecorder onRecordingReady={setRecording} disabled={isCloning} />

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <label className="block text-sm font-bold text-ink" htmlFor="voice-name">
          Voice profile name
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="voice-name"
            value={voiceName}
            onChange={(event) => setVoiceName(event.target.value)}
            className="min-h-11 flex-1 rounded-md border border-ink/15 bg-cloud px-3 outline-none focus:border-moss focus:ring-4 focus:ring-mint"
          />
          <button
            type="button"
            onClick={handleClone}
            disabled={!recording || isCloning}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-coral px-5 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCloning && <Loader2 className="animate-spin" size={18} aria-hidden="true" />}
            Clone voice
          </button>
        </div>
        {isCloning && <p className="mt-3 text-sm font-semibold text-moss">Cloning in progress. This can take a moment on the free tier.</p>}
        {error && <p className="mt-3 text-sm font-semibold text-coral">{error}</p>}
        {successProfile && (
          <div className="mt-4 flex flex-col gap-3 rounded-md bg-mint p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 font-bold text-ink">
              <CheckCircle2 size={20} aria-hidden="true" />
              Voice cloned successfully
            </p>
            <button type="button" onClick={onReady} className="rounded-md bg-ink px-4 py-2 font-bold text-white">
              Continue to call
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
