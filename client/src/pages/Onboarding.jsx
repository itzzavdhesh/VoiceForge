import React from "react";
import { CheckCircle2, Loader2, CircleAlert, ArrowRight, RotateCcw, Upload } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import useVoiceClone from "../hooks/useVoiceClone.js";
import { COLOR_TAGS, AVATAR_ICONS } from "../components/ProfileCard.jsx";
import { PeakLevelMeter } from "../components/PeakLevelMeter.jsx";
import { useToast, ToastContainer } from "../components/useToast.jsx";

import {
  CheckCircle2,
  Loader2,
  CircleAlert,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import useVoiceClone from "../hooks/useVoiceClone.js";
import { PeakLevelMeter } from "../components/PeakLevelMeter.jsx";
import { useToast, ToastContainer } from "../components/useToast.jsx";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges.js";

import {
  ACTIONS,
  EVENTS,
  Joyride,
  STATUS,
} from "react-joyride";
import useOnboarding from "../hooks/useOnboarding.js";

const steps = [
  {
    target: '[data-tour="record-voice"]',
    title: "Record Voice",
    content: "Record a voice sample to create your AI voice clone.",
    tab: "onboarding",
    skipBeacon: true,
  },
  {
    target: '[data-tour="clone-voice"]',
    title: "Clone Voice",
    content: "Clone and manage your voice model here.",
    tab: "onboarding",
    skipBeacon: true,
  },
  {
    target: '[data-tour="virtual-camera"]',
    title: "Enable Camera",
    content: "Enable virtual camera access for lip-sync generation.",
    tab: "call",
    skipBeacon: true,
  },
  {
    target: '[data-tour="tts-input"]',
    title: "Write Message",
    content: "Type a message that your cloned voice will speak.",
    tab: "call",
    skipBeacon: true,
  },
  {
    target: '[data-tour="generate-speech"]',
    title: "Generate Speech",
    content: "Generate speech using your cloned voice.",
    tab: "call",
    skipBeacon: true,
  },
  {
    target: '[data-tour="video-preview"]',
    title: "Preview Result",
    content: "Preview your generated video and lip-sync output.",
    tab: "call",
    skipBeacon: true,
  },
  {
    target: '[data-tour="compose-workspace"]',
    title: "Compose Workspace",
    content: "Use the Compose page for quick browser speech and saved message workflows.",
    tab: "compose",
    skipBeacon: true,
  },
  {
    target: '[data-tour="compose-message"]',
    title: "Write a Quick Message",
    content: "Draft a message, choose a quick reply, or reuse a saved phrase from your history.",
    tab: "compose",
    skipBeacon: true,
  },
  {
    target: '[data-tour="compose-speak"]',
    title: "Speak and Save",
    content: "Speak the composed message and save it into your local message history.",
    tab: "compose",
    skipBeacon: true,
  },
  {
    target: '[data-tour="settings-overview"]',
    title: "Settings",
    content: "Manage local voice profiles, API key setup, and synthesis preferences.",
    tab: "settings",
    skipBeacon: true,
  },
  {
    target: '[data-tour="settings-api-key"]',
    title: "API Key",
    content: "Save your ElevenLabs API key locally for voice cloning and speech generation.",
    tab: "settings",
    skipBeacon: true,
  },
  {
    target: '[data-tour="restart-onboarding"]',
    title: "Restart the Tour",
    content: "Use this control any time you want to replay the guided instructions.",
    tab: "settings",
    skipBeacon: true,
  },
  {
    target: "body",
    title: "You're Ready",
    content: "VoiceForge is ready for recording, cloning, speech generation, and lip-sync preview.",
    placement: "center",
    tab: "settings",
    skipBeacon: true,
  },
];

function getInitialStepIndex(tab) {
  const index = steps.findIndex((step) => step.tab === tab);
  return index >= 0 ? index : 0;
}

const joyrideStyles = {
  options: {
    arrowColor: "var(--bg-card)",
    backgroundColor: "var(--bg-card)",
    beaconSize: 36,
    overlayColor: "rgba(0, 0, 0, 0.52)",
    primaryColor: "#3f5f4d",
    textColor: "var(--text-base)",
    zIndex: 10000,
  },
  buttonBack: {
    color: "var(--text-muted)",
    fontWeight: 700,
    marginRight: 8,
  },
  buttonClose: {
    color: "var(--text-muted)",
    height: 36,
    width: 36,
  },
  buttonNext: {
    backgroundColor: "#3f5f4d",
    borderRadius: 6,
    fontWeight: 800,
    minHeight: 44,
    padding: "10px 16px",
  },
  buttonSkip: {
    color: "var(--text-muted)",
    fontWeight: 700,
    minHeight: 44,
    padding: "10px 12px",
  },
  tooltip: {
    border: "1px solid var(--border)",
    borderRadius: 8,
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.22)",
    maxWidth: "min(420px, calc(100vw - 32px))",
  },
  tooltipContainer: {
    lineHeight: 1.55,
    textAlign: "left",
  },
  tooltipContent: {
    color: "var(--text-muted)",
    padding: "8px 0 16px",
  },
  tooltipTitle: {
    color: "var(--text-base)",
    fontSize: 20,
    fontWeight: 800,
    margin: "4px 0 0",
  },
};

export default function OnboardingTour({ activeTab, onSelectTab }) {
  const { runTour, stopTour, tourStartIndex } = useOnboarding({ autoStart: true });
  const [stepIndex, setStepIndex] = React.useState(() => getInitialStepIndex(activeTab));
  const wasRunningRef = React.useRef(false);

  useUnsavedChanges((Boolean(recording?.blob) || isCloning) && !successProfile);

  const handleRecordingReady = React.useCallback((blobArg, metaArg) => {
    if (!blobArg) {
      setRecording(null);
      return;
    }
    let blob = blobArg instanceof Blob ? blobArg : blobArg?.blob;
    if (!blob && !(blobArg instanceof Blob)) {
      setRecording(null);
      return;
    }
    let duration = 0;
    let isValid = false;

    if (typeof metaArg === "number") {
      duration = metaArg;
      isValid = duration >= 10;
    } else if (metaArg && typeof metaArg === "object") {
      duration = metaArg.duration || 0;
      isValid = metaArg.isValid !== undefined ? metaArg.isValid : duration >= 10;
    } else if (blobArg && typeof blobArg === "object" && !(blobArg instanceof Blob)) {
      blob = blobArg.blob;
      duration = blobArg.duration || 0;
      isValid = blobArg.isValid !== undefined ? blobArg.isValid : duration >= 10;
    }

    if (!isValid && duration >= 10) {
      isValid = true;
    }

    setRecording({ blob: blob || blobArg, duration, isValid });
  }, []);

  const recordingDuration = recording?.duration || 0;

  React.useEffect(() => {
    if (!runTour) return;
    const currentTab = steps[stepIndex]?.tab;
    if (currentTab && currentTab !== activeTab) {
      onSelectTab(currentTab);
    }
  }, [activeTab, onSelectTab, runTour, stepIndex]);

  React.useEffect(() => {
    if (runTour && !wasRunningRef.current) {
      setStepIndex(Number.isInteger(tourStartIndex) ? tourStartIndex : getInitialStepIndex(activeTab));
    }
    wasRunningRef.current = runTour;
  }, [activeTab, runTour, tourStartIndex]);

  const finishTour = React.useCallback(() => {
    setStepIndex(getInitialStepIndex(activeTab));
    stopTour();
  }, [activeTab, stopTour]);

  const moveToStep = React.useCallback((nextIndex) => {
    const boundedIndex = Math.max(0, Math.min(nextIndex, steps.length - 1));
    const nextTab = steps[boundedIndex]?.tab;

    if (nextTab && nextTab !== activeTab) {
      onSelectTab(nextTab);
      window.setTimeout(() => setStepIndex(boundedIndex), 180);
      return;
    }
    const duration =
      typeof metadata === "object" ? metadata.duration : metadata;
    const isValid =
      typeof metadata === "object" ? metadata.isValid : duration >= 10;
    setRecording({ blob, duration, isValid });
  }, []);
  const [serverStatus, setServerStatus] = React.useState({
    isMock: false,
    space: "",
    hasServerKey: false,
  });

    setStepIndex(boundedIndex);
  }, [activeTab, onSelectTab]);

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
      description:
        "Record a short, consent-based reference clip. VoiceForge sends it via the Chatterbox engine on Hugging Face through your local server and saves the returned voice ID in this browser.",
      labels: ["Record", "Clone", "Next"],
    },
    2: {
      title: "Configure voice settings",
      description:
        "Fine-tune your workspace properties, adjust stability and clarity parameters, and establish your initial system instructions.",
      labels: ["Stability", "Clarity", "Next"],
    },
    3: {
      title: "Finalize setup & test",
      description:
        "Review your configurations, connect your local server pipeline, and prepare to place your very first AI companion voice call.",
      labels: ["Review", "Pipeline", "Launch"],
    },
  };

    if (type === EVENTS.TARGET_NOT_FOUND || type === EVENTS.STEP_AFTER) {
      const direction = action === ACTIONS.PREV ? -1 : 1;
      const nextIndex = index + direction;

  React.useEffect(() => {
    localStorage.setItem("voiceforge:maxUnlockedStep", maxUnlockedStep.toString());
  }, [maxUnlockedStep]);

  async function handleClone() {
    // 1. Strict validation guards: recording and a valid name are required.
    if (!hasKey || !recording) return;
    if (recording.duration !== undefined && recording.duration < 10) return;
    if (nameError) return; // block on empty / whitespace / over-limit name

    try {
      // 2. Perform real API call without overlapping mock declarations
      const profile = await cloneVoice(recording.blob || recording, voiceName.trim(), selectedColor, selectedIcon);
      if (profile) {
        setSuccessProfile(profile);
        setMaxUnlockedStep(2);
        showToast("Voice cloned successfully", "success");
        setActiveStep(2); // Move user to Step 2 instantly upon real success
      }

      moveToStep(nextIndex);
    }
  }, [finishTour, moveToStep]);

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
          <div
            className="grid w-full grid-cols-3 gap-2 sm:max-w-xs lg:max-w-sm"
            aria-label="Onboarding progress indicators"
          >
            {stepContent[activeStep].labels.map((label, index) => {
              let isBarFilled = false;
              if (activeStep === 1) {
                if (index === 0) isBarFilled = true;
                if (index === 1 && recording) isBarFilled = true;
                if (index === 2 && (successProfile || maxUnlockedStep >= 2))
                  isBarFilled = true;
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
          <div
            className="flex items-center gap-2"
            aria-label="Onboarding progress"
          >
            {[1, 2, 3].map((s) => {
              const isActive = s === activeStep;
              return (
                <div
                  key={s}
                  role="progressbar"
                  aria-valuenow={s}
                  aria-valuemin={1}
                  aria-valuemax={3}
                  aria-label={`Step ${s} of 3`}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? "w-10 bg-moss dark:bg-glow"
                      : "w-2.5 bg-neutral-200 dark:bg-neutral-800"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* STEP 1: PROFILE MANAGEMENT CONTROLS */}
      {activeStep === 1 && (
        <>
          {!hasKey && (
            <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink dark:text-neutral-100">
              <CircleAlert
                size={18}
                aria-hidden="true"
                className="shrink-0 text-coral"
              />
              <span>
                No voice engine available. Ensure your local server is running
                on port 3001. Check your <strong>.env</strong> file and the
                README.
              </span>
            </div>
          )}

          <VoiceRecorder
            onRecordingReady={handleRecordingReady}
            disabled={isCloning}
          />

          <div className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-ink dark:text-neutral-100">Import Voice Profile Backup</h3>
              <p className="text-xs text-ink/65 dark:text-muted mt-0.5">Restore a previously saved voice clone profile (.vfp file) instantly.</p>
            </div>
            <label
              htmlFor="onboarding-import-vfp"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-bold text-white transition hover:bg-moss/90 dark:bg-glow dark:text-black shrink-0"
            >
              <Upload size={14} />
              Import .vfp File
              <input
                id="onboarding-import-vfp"
                type="file"
                accept=".vfp"
                onChange={handleImportVFP}
                className="sr-only"
              />
            </label>
          </div>

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
                disabled={
                  isCloning ||
                  !hasKey ||
                  !recording ||
                  !recording.isValid ||
                  Boolean(nameError)
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-coral px-5 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "cloning" ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                    Processing Voice...
                  </>
                ) : (
                  "Clone voice"
                )}
              </button>
            </div>

            {/* Color Tag & Avatar Icon Selectors */}
            <div className="mt-4 pt-3 border-t border-ink/10 dark:border-border grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="font-bold text-ink/80 dark:text-neutral-200">
                  Color Tag Accent:
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {Object.entries(COLOR_TAGS).map(([key, item]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedColor(key)}
                      title={item.label}
                      aria-label={`Select ${item.label} color tag`}
                      className={`h-6 w-6 rounded-full ${item.badge} transition-transform ${selectedColor === key ? "ring-2 ring-moss ring-offset-2 scale-110" : "opacity-75 hover:opacity-100"}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-ink/80 dark:text-neutral-200">
                  Avatar Icon:
                </span>
                <div className="flex items-center gap-2 mt-2">
                  {Object.entries(AVATAR_ICONS).map(([key, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedIcon(key)}
                      title={key}
                      aria-label={`Select ${key} avatar icon`}
                      className={`flex h-7 w-7 items-center justify-center rounded-md border text-ink/80 transition-all dark:text-neutral-200 ${selectedIcon === key ? "border-moss bg-mint/30 text-moss font-bold scale-105 dark:border-glow dark:text-glow" : "border-ink/15 bg-cloud hover:bg-neutral-200 dark:border-border dark:bg-black"}`}
                    >
                      <Icon size={14} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name validation feedback + character counter */}
            <div
              id="voice-name-feedback"
              className="mt-2 flex items-center justify-between gap-2 text-xs"
            >
              {nameError ? (
                <p
                  className="flex items-center gap-1 font-semibold text-coral"
                  role="alert"
                >
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
              <p
                className="mt-3 text-sm font-semibold text-coral flex items-center gap-1.5"
                role="alert"
              >
                <CircleAlert size={16} aria-hidden="true" />
                {apiError}
              </p>
            )}

            {(successProfile || maxUnlockedStep >= 2) && (
              <div className="mt-4 flex flex-col gap-3 rounded-md bg-mint p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-glow/15">
                <p className="inline-flex items-center gap-2 font-bold text-ink dark:text-neutral-50">
                  <CheckCircle2
                    size={20}
                    className="text-moss dark:text-glow"
                    aria-hidden="true"
                  />
                  Voice profile setup verified!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 font-bold text-white dark:bg-glow dark:text-black"
                >
                  Continue to Step 2
                  <ArrowRight size={18} aria-hidden="true" />
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
          onContinue={() => {
            setMaxUnlockedStep(3);
            setActiveStep(3);
          }}
        />
      )}

      {/* STEP 3: PIPELINE DEPLOYMENT CHECKLIST */}
      {activeStep === 3 && (
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-border dark:bg-surface">
          <h3 className="text-xl font-bold text-ink dark:text-neutral-100">
            Ready for Activation
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            Your custom voice template setup is complete.
          </p>
          <div className="my-6 p-12 border-2 border-dashed border-ink/10 rounded-md text-center text-neutral-400">
            Pipeline deployment status diagnostics verify operational conditions
            are ideal.
          </div>
          <div className="flex justify-between items-center border-t pt-4">
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="text-sm font-bold text-ink dark:text-neutral-300 hover:underline"
            >
              ← Back to Settings
            </button>
            <button
              type="button"
              onClick={onReady}
              className="rounded-md bg-black px-5 py-2 font-bold text-white dark:bg-glow dark:text-black"
            >
              Complete Setup & Go to Call
            </button>
          </div>
        </section>
      )}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
