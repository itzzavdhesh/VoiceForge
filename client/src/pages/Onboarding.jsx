// Renders the first-time setup flow for recording and cloning a reference voice.
import React from "react";
import { CheckCircle2, Loader2, CircleAlert } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import useVoiceClone from "../hooks/useVoiceClone.js";
import { hasApiKey } from "../utils/apiKeyStorage.js";

export default function Onboarding({ onReady }) {
  const [recording, setRecording] = React.useState(null);
  const [voiceName, setVoiceName] = React.useState("VoiceForge Voice");
  const [successProfile, setSuccessProfile] = React.useState(null);
  const { cloneVoice, status, error } = useVoiceClone();
  const isCloning = status === "cloning";
  const apiKeyPresent = hasApiKey();


  const currentStep = successProfile ? 2 : recording ? 1 : 0;

  async function handleClone() {
    if (!recording) return;
    try {
      const profile = await cloneVoice(recording, voiceName);
      setSuccessProfile(profile);
    } catch (err) {
      console.error("Voice cloning failed:", err);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-black p-6 text-white shadow-soft dark:border dark:border-border dark:bg-surface dark:shadow-soft-dk">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
              Step {currentStep + 1} of 3
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Create your voice profile
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/75">
              Record a short, consent-based reference clip. VoiceForge sends it
              to ElevenLabs through your local server and saves the returned
              voice ID in this browser.
            </p>
          </div>
          <div
            className="grid w-full max-w-sm grid-cols-3 gap-2"
            aria-label="Onboarding progress"
          >
            {["Record", "Clone", "Call"].map((step, index) => (
              <div
                key={step}
                className={`h-2 rounded-full ${index <= currentStep ? "bg-coral" : "bg-white/25"}`}
                title={step}
              />
            ))}
          </div>
        </div>
      </section>

      {!apiKeyPresent && (
        <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink dark:text-neutral-100">
          <CircleAlert size={18} aria-hidden="true" className="shrink-0 text-coral" />
          <span>
            No ElevenLabs API key found. Go to the{" "}
            <strong>Settings</strong> tab to add your key before cloning.
          </span>
        </div>
      )}

      <VoiceRecorder onRecordingReady={setRecording} disabled={isCloning} />

      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk">
        <label
          className="block text-sm font-bold text-ink dark:text-neutral-100"
          htmlFor="voice-name"
        >
          Voice profile name
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="voice-name"
            value={voiceName}
            onChange={(event) => setVoiceName(event.target.value)}
            className="min-h-11 flex-1 rounded-md border border-ink/15 bg-cloud px-3 text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint dark:border-border dark:bg-black dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-glow dark:focus:ring-glow/25"
          />
          <button
            type="button"
            onClick={handleClone}
            disabled={!recording || isCloning || !apiKeyPresent}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-coral px-5 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCloning && (
              <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            )}
            Clone voice
          </button>
        </div>
        {isCloning && (
          <p className="mt-3 text-sm font-semibold text-moss dark:text-glow">
            Cloning in progress. This can take a moment on the free tier.
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm font-semibold text-coral">{error}</p>
        )}
        {successProfile && (
          <div className="mt-4 flex flex-col gap-3 rounded-md bg-mint p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-glow/15">
            <p className="inline-flex items-center gap-2 font-bold text-ink dark:text-neutral-50">
              <CheckCircle2 size={20} aria-hidden="true" />
              Voice cloned successfully
            </p>
            <button
              type="button"
              onClick={onReady}
              className="rounded-md bg-black px-4 py-2 font-bold text-white dark:bg-glow dark:text-black"
            >
              Continue to call
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
