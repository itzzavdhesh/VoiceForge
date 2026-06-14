// Renders the first-time setup flow for recording and cloning a reference voice.
import React from "react";
import { CheckCircle2, Loader2, CircleAlert, ArrowRight, RotateCcw } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import useVoiceClone from "../hooks/useVoiceClone.js";
import { hasApiKey } from "../utils/apiKeyStorage.js";
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

  function toggleSpeakerBoost() {
    setSettings((prev) => {
      const next = { ...prev, use_speaker_boost: !prev.use_speaker_boost };
      persistVoiceSettings(next);
      flashSaved();
      return next;
    });
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
            Fine-tune how ElevenLabs generates your cloned speech. Changes are
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
          id="ob-similarity"
          label="Similarity Boost"
          description="Higher values make the output closer to the original reference voice. Very high values may introduce artefacts."
          value={settings.similarity_boost}
          onChange={updateSlider("similarity_boost")}
        />
        <VoiceSlider
          id="ob-style"
          label="Style Exaggeration"
          description="Higher values exaggerate the style and prosody of the reference audio. Keep low for neutral delivery."
          value={settings.style}
          onChange={updateSlider("style")}
        />

        {/* ── Speaker Boost toggle ── */}
        <div className="flex items-center justify-between rounded-lg border border-ink/10 p-4 dark:border-border">
          <div>
            <p className="text-sm font-semibold text-ink dark:text-neutral-200">
              Speaker Boost
            </p>
            <p className="mt-0.5 text-xs text-ink/55 dark:text-muted">
              Boosts similarity to the reference speaker. Recommended on for
              most voices; disable if you hear metallic artefacts.
            </p>
          </div>
          <button
            id="ob-speaker-boost"
            type="button"
            role="switch"
            aria-checked={settings.use_speaker_boost}
            onClick={toggleSpeakerBoost}
            className={[
              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent",
              "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-2 dark:focus:ring-glow dark:focus:ring-offset-black",
              settings.use_speaker_boost
                ? "bg-moss dark:bg-glow"
                : "bg-neutral-300 dark:bg-neutral-600",
            ].join(" ")}
            aria-label="Toggle Speaker Boost"
          >
            <span
              className={[
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                settings.use_speaker_boost ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>
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

export default function Onboarding({ onReady }) {
  const [recording, setRecording] = React.useState(null);
  const [voiceName, setVoiceName] = React.useState("VoiceForge Voice");
  const [successProfile, setSuccessProfile] = React.useState(null);
  const { cloneVoice, status, error: apiError } = useVoiceClone();
  const { toasts, showToast } = useToast();
  const isCloning = status === "cloning";
  const [serverStatus, setServerStatus] = React.useState({ isMock: false, hasServerKey: false });

  React.useEffect(() => {
    fetch("/api/voice/status")
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch((err) => console.error("Failed to fetch server status:", err));
  }, []);

  const hasKey = React.useMemo(() => {
    return hasApiKey() || serverStatus.isMock || serverStatus.hasServerKey;
  }, [serverStatus]);

  // Derived validation: compute an error message from the current voiceName.
  // Using a constant (not useState) because the value is always in sync with voiceName.
  const nameError = React.useMemo(() => {
    const trimmed = voiceName.trim();
    if (trimmed.length === 0) return "Voice name is required.";
    if (trimmed.length > 100) return "Voice name must be 100 characters or fewer.";
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
      description: "Record a short, consent-based reference clip. VoiceForge sends it to ElevenLabs through your local server and saves the returned voice ID in this browser.",
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
    // 1. Strict validation guards: Don't run without API key, a recording, or a valid name
    if (!hasKey || !recording) return;
    if (nameError) return; // block on empty / whitespace / over-limit name

    try {
      // 2. Perform real API call without overlapping mock declarations
      const profile = await cloneVoice(recording, voiceName.trim());
      if (profile) {
        setSuccessProfile(profile);
        setMaxUnlockedStep(2);
        showToast("Voice cloned successfully", "success");
        setActiveStep(2); // Move user to Step 2 instantly upon real success
      }
    } catch (err) {
      console.error("Voice cloning process failed:", err);
      showToast("Voice cloning failed. Please try again.", "error");
      // No artificial mock bypasses here. Real failure is preserved in apiError and shown below.
    }
  }

  function handleManualStepNavigation(targetStep) {
    if (targetStep <= maxUnlockedStep) {
      setActiveStep(targetStep);
    }
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

      {/* REFACTORED ACCESSIBLE INTERACTIVE NAVIGATION STEP DOT TRACKS */}
      <div className="flex items-center justify-center gap-3" role="tablist" aria-label="Onboarding step navigation">
        {[1, 2, 3].map((stepNum) => {
          const isAccessible = stepNum <= maxUnlockedStep;
          const isCurrent = activeStep === stepNum;

          return (
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
                No ElevenLabs API key found. Go to the{" "}
                <strong>Settings</strong> tab to add your key before cloning.
              </span>
            </div>
          )}

          <VoiceRecorder onRecordingReady={setRecording} disabled={isCloning} />

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
                maxLength={100}
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
                disabled={isCloning || !hasKey || !recording || Boolean(nameError)}
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
                aria-label={`${voiceName.length} of 100 characters used`}
              >
                {voiceName.length}/100
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