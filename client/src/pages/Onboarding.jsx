// Renders the first-time setup flow for recording and cloning a reference voice.
import React from "react";
import { CheckCircle2, Loader2, CircleAlert, ArrowRight, RotateCcw } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import useVoiceClone from "../hooks/useVoiceClone.js";
import { useToast, ToastContainer } from "../components/useToast.jsx";

import {
  DEFAULT_VOICE_SETTINGS,
  loadVoiceSettings,
  persistVoiceSettings,
} from "../utils/voiceSettings.js";

/**
 * A labelled range slider for a 0–1 voice parameter.
 */
function VoiceSlider({ id, label, description, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center justify-between text-sm font-semibold text-ink dark:text-neutral-200"
      >
        <span>{label}</span>
        <span
          className="tabular-nums rounded bg-cloud px-2 py-0.5 text-xs font-bold text-moss dark:bg-glow/10 dark:text-glow"
          aria-live="polite"
          aria-label={`${label} value: ${value}`}
        >
          {value.toFixed(2)}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={onChange}
        aria-label={label}
        aria-describedby={`${id}-desc`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-moss focus:outline-none focus:ring-2 focus:ring-mint dark:bg-neutral-700 dark:accent-glow"
      />
      <p
        id={`${id}-desc`}
        className="text-xs leading-snug text-ink/55 dark:text-muted"
      >
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step2VoiceSettings
// A self-contained panel that lives inside the onboarding Step 2 slot.
// Reads/writes the same localStorage key as the Settings page and
// VoiceQuickSettings so all three views remain in sync automatically.
// ---------------------------------------------------------------------------
function Step2VoiceSettings({ onBack, onContinue }) {
  const [settings, setSettings] = React.useState(loadVoiceSettings);
  const [saved, setSaved] = React.useState(false);
  const savedTimerRef = React.useRef(null);

  // Show a brief "Saved" badge then clear it.
  function flashSaved() {
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1800);
  }

  // Cleanup the timer on unmount.
  React.useEffect(() => {
    return () => clearTimeout(savedTimerRef.current);
  }, []);

  function updateSlider(key) {
    return (event) => {
      const val = parseFloat(event.target.value);
      setSettings((prev) => {
        const next = { ...prev, [key]: val };
        persistVoiceSettings(next);
        flashSaved();
        return next;
      });
    };
  }

  function resetToDefaults() {
    const defaults = { ...DEFAULT_VOICE_SETTINGS };
    setSettings(defaults);
    persistVoiceSettings(defaults);
    flashSaved();
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-border dark:bg-surface">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-ink dark:text-neutral-100">
            Voice Workspace Parameters
          </h3>
          <p className="mt-1 text-sm text-ink/60 dark:text-muted">
            Fine-tune how Chatterbox generates your cloned speech. Changes are
            saved instantly and shared across all tabs.
          </p>
        </div>

        {/* Saved badge */}
        <span
          aria-live="polite"
          className={[
            "flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all duration-300",
            saved
              ? "bg-mint text-moss opacity-100 dark:bg-glow/20 dark:text-glow"
              : "opacity-0",
          ].join(" ")}
        >
          Saved ✓
        </span>
      </div>

      {/* ── Sliders ── */}
      <div className="mt-6 space-y-6">
        <VoiceSlider
          id="ob-stability"
          label="Stability"
          description="Lower values are more expressive and varied; higher values are more consistent and predictable."
          value={settings.stability}
          onChange={updateSlider("stability")}
        />
        <VoiceSlider
          id="ob-temperature"
          label="Temperature"
          description="Lower values are steadier; higher values allow more variation in the generated speech."
          value={settings.temperature}
          onChange={updateSlider("temperature")}
        />
        <VoiceSlider
          id="ob-style"
          label="Style Exaggeration"
          description="Higher values exaggerate the style and prosody of the reference audio. Keep low for neutral delivery."
          value={settings.style}
          onChange={updateSlider("style")}
        />
      </div>

      {/* ── Info note ── */}
      <p className="mt-4 text-xs text-ink/50 dark:text-muted">
        These values are also adjustable in the{" "}
        <strong className="font-semibold">Settings</strong> tab and the{" "}
        <strong className="font-semibold">Compose</strong> tab's quick-settings
        panel at any time.
      </p>

      {/* ── Footer actions ── */}
      <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4 dark:border-border">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-bold text-ink hover:underline dark:text-neutral-300"
        >
          ← Back to Profile
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetToDefaults}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1.5 text-xs font-bold text-ink/70 transition hover:border-coral/50 hover:text-coral dark:border-border dark:text-neutral-400 dark:hover:border-coral/40 dark:hover:text-coral"
            aria-label="Reset voice settings to defaults"
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset to defaults
          </button>

          <button
            type="button"
            id="ob-continue-step3"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-md bg-coral px-5 py-2 font-bold text-white transition hover:bg-coral/90 focus:outline-none focus:ring-2 focus:ring-coral/50"
          >
            Continue to Step 3
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;

export default function Onboarding({ onReady }) {
  const [recording, setRecording] = React.useState(null); // stores { blob, duration, isValid }
  const [voiceName, setVoiceName] = React.useState("VoiceForge Voice");
  const [successProfile, setSuccessProfile] = React.useState(null);
  const { cloneVoice, status, error: apiError } = useVoiceClone();
  const { toasts, showToast } = useToast();
  const isCloning = status === "cloning";
  const [serverStatus, setServerStatus] = React.useState({ isMock: false, space: "" });

  React.useEffect(() => {
    fetch("/api/voice/status")
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch((err) => console.error("Failed to fetch server status:", err));
  }, []);

  // Chatterbox needs no API key — just ensure the local server is reachable.
  const hasKey = React.useMemo(() => {
    return serverStatus.isMock || Boolean(serverStatus.space);
  }, [serverStatus]);
  
  const nameError = React.useMemo(() => {
  const trimmed = voiceName.trim();
  if (trimmed.length === 0) {
    return "Voice name is required.";
  }
  if (trimmed.length < MIN_NAME_LENGTH) {
    return `Voice name must be at least ${MIN_NAME_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return `Voice name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  return "";
}, [voiceName]);


  // Track the highest milestone step the user is allowed to navigate to
  const [maxUnlockedStep, setMaxUnlockedStep] = React.useState(() => {
    const savedMax = localStorage.getItem("voiceforge:maxUnlockedStep");
    return savedMax ? parseInt(savedMax, 10) : 1;
  });

  // Track the active onboarding step interface (1, 2, or 3) restored from storage
  const [activeStep, setActiveStep] = React.useState(() => {
    const savedStep = localStorage.getItem("voiceforge:onboardingStep");
    const savedMax = localStorage.getItem("voiceforge:maxUnlockedStep");
    
    const parsedStep = savedStep ? parseInt(savedStep, 10) : 1;
    const parsedMax = savedMax ? parseInt(savedMax, 10) : 1;
    
    // Clamp initialization target securely underneath the highest unlocked milestone
    return Math.min(parsedStep, parsedMax);
  });

  // Dynamic content dictionary for the header banner based on activeStep
  const stepContent = {
    1: {
      title: "Create your voice profile",
      description: "Record a short, consent-based reference clip. VoiceForge sends it via the Chatterbox engine on Hugging Face through your local server and saves the returned voice ID in this browser.",
      labels: ["Record", "Clone", "Next"]
    },
    2: {
      title: "Configure voice settings",
      description: "Fine-tune your workspace properties, adjust stability and clarity parameters, and establish your initial system instructions.",
      labels: ["Stability", "Clarity", "Next"]
    },
    3: {
      title: "Finalize setup & test",
      description: "Review your configurations, connect your local server pipeline, and prepare to place your very first AI companion voice call.",
      labels: ["Review", "Pipeline", "Launch"]
    }
  };

  // Persist values to localStorage on step changes
  React.useEffect(() => {
    localStorage.setItem("voiceforge:onboardingStep", activeStep.toString());
  }, [activeStep]);

  React.useEffect(() => {
    localStorage.setItem("voiceforge:maxUnlockedStep", maxUnlockedStep.toString());
  }, [maxUnlockedStep]);

  async function handleClone() {
    if (!recording || !recording.isValid) return;
    const profile = await cloneVoice(recording.blob, voiceName);
    setSuccessProfile(profile);
  }

  return (
    <div className="space-y-6">
      {/* GLOBAL ONBOARDING HEADER BANNER VIEW */}
      <section className="rounded-lg border border-ink/10 bg-white p-6 text-ink shadow-soft dark:border-border dark:bg-surface dark:text-white dark:shadow-soft-dk">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
              Step {activeStep} of 3
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {stepContent[activeStep].title}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-ink/75 dark:text-white/75">
              {stepContent[activeStep].description}
            </p>
          </div>
          
          {/* STEP PROGRESS INDICATORS COMPONENT GRID */}
          <div className="grid w-full grid-cols-3 gap-2 sm:max-w-xs lg:max-w-sm" aria-label="Onboarding progress indicators">
            {stepContent[activeStep].labels.map((label, index) => {
              let isBarFilled = false;
              if (activeStep === 1) {
                if (index === 0) isBarFilled = true;
                if (index === 1 && recording) isBarFilled = true;
                if (index === 2 && (successProfile || maxUnlockedStep >= 2)) isBarFilled = true;
              } else if (activeStep === 2) {
                if (index === 0) isBarFilled = true;
                if (index === 1) isBarFilled = true;
                if (index === 2 && maxUnlockedStep >= 3) isBarFilled = true;
              } else if (activeStep === 3) {
                isBarFilled = true;
              }

              return (
                <div
                  key={label}
                  className={`h-2 rounded-full transition-all duration-300 ${isBarFilled ? "bg-coral" : "bg-ink/15 dark:bg-white/25"}`}
                  title={label}
                />
              );
            })}
          </div>
        </div>
      </section>

      <VoiceRecorder 
        onRecordingReady={(blob, meta) => setRecording(blob ? { blob, ...meta } : null)} 
        disabled={isCloning} 
      />

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
            disabled={!recording || !recording.isValid || isCloning}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-coral px-5 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCloning && (
              <Loader2 className="animate-spin" size={18} aria-hidden="true" />
            )}
            Clone voice
          </button>
        </div>
        {recording && !recording.isValid && (
          <p className="mt-3 text-sm font-semibold text-coral" role="alert">
            Please record a voice clip of at least 10 seconds before voice cloning.
          </p>
        )}
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
              key={stepNum}
              type="button"
              disabled={!isAccessible}
              onClick={() => handleManualStepNavigation(stepNum)}
              aria-label={`Go to Step ${stepNum}`}
              aria-current={isCurrent ? "step" : undefined}
              className={`h-3 w-3 rounded-full transition-all duration-300 ${
                isCurrent 
                  ? "bg-coral scale-125 ring-2 ring-coral/30" 
                  : isAccessible ? "bg-mint" : "bg-ink/15 dark:bg-white/10"
              } ${!isAccessible ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
            />
          );
        })}
      </div>

      {/* STEP 1: PROFILE MANAGEMENT CONTROLS */}
      {activeStep === 1 && (
        <>
          {!hasKey && (
            <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink dark:text-neutral-100">
              <CircleAlert size={18} aria-hidden="true" className="shrink-0 text-coral" />
              <span>
              No voice engine available. Ensure your local server is running on port 3001. Check your{" "}
                <strong>.env</strong> file and the README.
              </span>
            </div>
          )}

          <VoiceRecorder onRecordingReady={handleRecordingReady} disabled={isCloning} />

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk">
            <label className="block text-sm font-bold text-ink dark:text-neutral-100" htmlFor="voice-name">
              Voice profile name
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="voice-name"
                value={voiceName}
                onChange={(event) => setVoiceName(event.target.value)}
                disabled={isCloning}
                maxLength={MAX_NAME_LENGTH}
                aria-describedby="voice-name-feedback"
                aria-invalid={nameError ? "true" : undefined}
                className={[
                  "min-h-11 flex-1 rounded-md border px-3 text-ink outline-none transition",
                  "focus:ring-4 focus:ring-mint dark:bg-black dark:text-neutral-100",
                  nameError
                    ? "border-coral focus:border-coral dark:border-coral/70"
                    : "border-ink/15 focus:border-moss dark:border-border",
                  "bg-cloud dark:bg-black",
                ].join(" ")}
              />
              <button
                type="button"
                onClick={handleClone}
                disabled={isCloning || !hasKey || !recording || recordingDuration < 10 || Boolean(nameError)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-coral px-5 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCloning && <Loader2 className="animate-spin" size={18} />}
                Clone voice
              </button>
            </div>

            {/* Name validation feedback + character counter */}
            <div
              id="voice-name-feedback"
              className="mt-1.5 flex items-center justify-between gap-2 text-xs"
            >
              {nameError ? (
                <p className="flex items-center gap-1 font-semibold text-coral" role="alert">
                  <CircleAlert size={13} aria-hidden="true" />
                  {nameError}
                </p>
              ) : (
                <span />
              )}
              <span
                className={[
                  "tabular-nums",
                  voiceName.length >= 90
                    ? "font-semibold text-coral"
                    : "text-ink/45 dark:text-muted",
                ].join(" ")}
                aria-live="polite"
                aria-label={`${voiceName.length} of ${MAX_NAME_LENGTH} characters used`}
              >
                {voiceName.length}/{MAX_NAME_LENGTH}
              </span>
            </div>

            {/* Render actual API errors transparently instead of swallowing failures */}
            {apiError && (
              <p className="mt-3 text-sm font-semibold text-coral flex items-center gap-1.5" role="alert">
                <CircleAlert size={16} />
                {apiError}
              </p>
            )}
            
            {(successProfile || maxUnlockedStep >= 2) && (
              <div className="mt-4 flex flex-col gap-3 rounded-md bg-mint p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-glow/15">
                <p className="inline-flex items-center gap-2 font-bold text-ink dark:text-neutral-50">
                  <CheckCircle2 size={20} className="text-moss dark:text-glow" />
                  Voice profile setup verified!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 font-bold text-white dark:bg-glow dark:text-black"
                >
                  Continue to Step 2
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* STEP 2: WORKSPACE PROPERTIES CONTROLS */}
      {activeStep === 2 && (
        <Step2VoiceSettings
          onBack={() => setActiveStep(1)}
          onContinue={() => { setMaxUnlockedStep(3); setActiveStep(3); }}
        />
      )}

      {/* STEP 3: PIPELINE DEPLOYMENT CHECKLIST */}
      {activeStep === 3 && (
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-border dark:bg-surface">
          <h3 className="text-xl font-bold text-ink dark:text-neutral-100">Ready for Activation</h3>
          <p className="mt-2 text-sm text-neutral-500">Your custom voice template setup is complete.</p>
          <div className="my-6 p-12 border-2 border-dashed border-ink/10 rounded-md text-center text-neutral-400">
            Pipeline deployment status diagnostics verify operational conditions are ideal.
          </div>
          <div className="flex justify-between items-center border-t pt-4">
            <button type="button" onClick={() => setActiveStep(2)} className="text-sm font-bold text-ink dark:text-neutral-300 hover:underline">
              ← Back to Settings
            </button>
            <button type="button" onClick={onReady} className="rounded-md bg-black px-5 py-2 font-bold text-white dark:bg-glow dark:text-black">
              Complete Setup & Go to Call
            </button>
          </div>
        </section>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
