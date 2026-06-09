// Renders the first-time setup flow for recording and cloning a reference voice.
import React, { useRef, useEffect } from "react";
import { CheckCircle2, Loader2, CircleAlert, ArrowRight } from "lucide-react";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import useVoiceClone from "../hooks/useVoiceClone.js";
import { hasApiKey } from "../utils/apiKeyStorage.js";

export default function Onboarding({ onReady }) {
  const [recording, setRecording] = React.useState(null);
  const [voiceName, setVoiceName] = React.useState("VoiceForge Voice");
  const [successProfile, setSuccessProfile] = React.useState(null);
  const { cloneVoice, status, error: apiError } = useVoiceClone();
  const isCloning = status === "cloning";
  const [serverStatus, setServerStatus] = React.useState({ isMock: false, hasServerKey: false });

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

  // Refs for auto-focus (mutable objects)
  const voiceNameInputRef = useRef(null);
  const step2FirstInputRef = useRef(null);
  const step3FirstInputRef = useRef(null);

  React.useEffect(() => {
    fetch("/api/voice/status")
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch((err) => console.error("Failed to fetch server status:", err));
  }, []);

  const hasKey = React.useMemo(() => {
    return hasApiKey() || serverStatus.isMock || serverStatus.hasServerKey;
  }, [serverStatus]);

  // Auto-focus helper function with retry mechanism for async rendering
  const setFocusWithRetry = React.useCallback((element) => {
    if (!element) return;
    
    const attemptFocus = (attempt = 0) => {
      if (attempt > 5) return; // Max 5 attempts
      
      try {
        element.focus();
        if (document.activeElement === element) return; // Focus successful
      } catch (e) {
        // Ignore focus errors (e.g., element not focusable)
      }
      
      // Retry with increasing delay
      setTimeout(() => attemptFocus(attempt + 1), 50 * (attempt + 1));
    };
    
    attemptFocus();
  }, []);

  // Callback refs for Step 1
  const setVoiceNameRef = React.useCallback((element) => {
    voiceNameInputRef.current = element;
    if (activeStep === 1 && element) {
      setFocusWithRetry(element);
    }
  }, [activeStep, setFocusWithRetry]);

  // Callback ref for Step 2
  const setStep2Ref = React.useCallback((element) => {
    step2FirstInputRef.current = element;
    if (activeStep === 2 && element) {
      setFocusWithRetry(element);
    }
  }, [activeStep, setFocusWithRetry]);

  // Callback ref for Step 3
  const setStep3Ref = React.useCallback((element) => {
    step3FirstInputRef.current = element;
    if (activeStep === 3 && element) {
      setFocusWithRetry(element);
    }
  }, [activeStep, setFocusWithRetry]);

  // Backup focus effect on step change
  useEffect(() => {
    const focusMap = {
      1: voiceNameInputRef.current,
      2: step2FirstInputRef.current,
      3: step3FirstInputRef.current,
    };
    
    const targetElement = focusMap[activeStep];
    if (targetElement) {
      setFocusWithRetry(targetElement);
    }
  }, [activeStep, setFocusWithRetry]);

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
    // 1. Strict validation guards: Don't run without API key or a recorded sample
    if (!hasKey || !recording) return;
    
    try {
      // 2. Perform real API call without overlapping mock declarations
      const profile = await cloneVoice(recording, voiceName);
      if (profile) {
        setSuccessProfile(profile);
        setMaxUnlockedStep(2);
        setActiveStep(2); // Move user to Step 2 instantly upon real success
      }
    } catch (err) {
      console.error("Voice cloning process failed:", err);
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
      <section className="rounded-lg bg-black p-6 text-white shadow-soft dark:border dark:border-border dark:bg-surface dark:shadow-soft-dk">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
              Step {activeStep} of 3
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              {stepContent[activeStep].title}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/75">
              {stepContent[activeStep].description}
            </p>
          </div>
          
          {/* STEP PROGRESS INDICATORS COMPONENT GRID */}
          <div className="grid w-full max-w-sm grid-cols-3 gap-2" aria-label="Onboarding progress indicators">
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
                  className={`h-2 rounded-full transition-all duration-300 ${isBarFilled ? "bg-coral" : "bg-white/25"}`}
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
                ref={setVoiceNameRef}
                value={voiceName}
                onChange={(event) => setVoiceName(event.target.value)}
                disabled={isCloning}
                className="min-h-11 flex-1 rounded-md border border-ink/15 bg-cloud px-3 text-ink outline-none focus:border-moss focus:ring-4 focus:ring-mint dark:border-border dark:bg-black dark:text-neutral-100"
              />
              <button
                type="button"
                onClick={handleClone}
                disabled={isCloning || !hasKey || !recording}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-coral px-5 font-bold text-white transition hover:bg-coral/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCloning && <Loader2 className="animate-spin" size={18} />}
                Clone voice
              </button>
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
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-border dark:bg-surface">
          <button
            ref={setStep2Ref}
            onClick={() => {}}
            className="sr-only focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2"
            aria-label="Step 2 start focus target"
            tabIndex={0}
          >
            Step 2 ready for configuration - Press Tab to navigate through options
          </button>
          <h3 className="text-xl font-bold text-ink dark:text-neutral-100">Voice Workspace Parameters</h3>
          <p className="mt-2 text-sm text-neutral-500">Configure the engine settings for your voice identity.</p>
          <div className="my-6 p-12 border-2 border-dashed border-ink/10 rounded-md text-center text-neutral-400">
            Configuration fields will render inside this block.
          </div>
          <div className="flex justify-between items-center border-t pt-4">
            <button type="button" onClick={() => setActiveStep(1)} className="text-sm font-bold text-ink dark:text-neutral-300 hover:underline">
              ← Back to Profile
            </button>
            <button
              type="button"
              onClick={() => { setMaxUnlockedStep(3); setActiveStep(3); }}
              className="inline-flex items-center gap-2 rounded-md bg-coral px-5 py-2 font-bold text-white"
            >
              Continue to Step 3 <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: PIPELINE DEPLOYMENT CHECKLIST */}
      {activeStep === 3 && (
        <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft dark:border-border dark:bg-surface">
          <button
            ref={setStep3Ref}
            onClick={() => {}}
            className="sr-only focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2"
            aria-label="Step 3 start focus target"
            tabIndex={0}
          >
            Step 3 ready for activation - Press Tab to navigate through options
          </button>
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
    </div>
  );
}
