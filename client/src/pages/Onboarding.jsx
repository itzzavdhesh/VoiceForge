import React from "react";
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

    setStepIndex(boundedIndex);
  }, [activeTab, onSelectTab]);

  const handleCallback = React.useCallback((data) => {
    const { action, index, status, type } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) {
      finishTour();
      return;
    }

    if (type === EVENTS.TARGET_NOT_FOUND || type === EVENTS.STEP_AFTER) {
      const direction = action === ACTIONS.PREV ? -1 : 1;
      const nextIndex = index + direction;

      if (nextIndex >= steps.length) {
        finishTour();
        return;
      }

      moveToStep(nextIndex);
    }
  }, [finishTour, moveToStep]);

  return (
    runTour ? (
      <Joyride
        continuous
        floaterProps={{
          disableAnimation: false,
          options: {
            flip: true,
            preventOverflow: {
              boundariesElement: "viewport",
              padding: 16,
            },
          },
        }}
        hideCloseButton={false}
        locale={{
          back: "Back",
          close: "Close onboarding tour",
          last: "Finish",
          next: "Next",
          skip: "Skip",
        }}
        callback={handleCallback}
        disableOverlayClose        
        run={runTour}
        scrollOffset={96}
        scrollToFirstStep
        showProgress
        showSkipButton
        spotlightClicks
        stepIndex={stepIndex}
        steps={steps}
        styles={joyrideStyles}
      />
    ) : null
  );
}
