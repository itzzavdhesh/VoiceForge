import React from "react";

export const ONBOARDING_STORAGE_KEY = "voiceforge-tour-completed";
const TOUR_EVENT = "voiceforge:onboarding-tour";

function hasCompletedTour() {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function setCompletedTour() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function clearCompletedTour() {
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function emitTourEvent(detail) {
  window.dispatchEvent(new CustomEvent(TOUR_EVENT, { detail }));
}

export default function useOnboarding({ autoStart = false, ignoreCompletion = false } = {}) {
  const [runTour, setRunTour] = React.useState(false);

  const startTour = React.useCallback(() => {
    setRunTour(true);
    emitTourEvent({ action: "start" });
  }, []);

  const stopTour = React.useCallback(() => {
    setRunTour(false);
    setCompletedTour();
    emitTourEvent({ action: "stop" });
  }, []);

  const resetTour = React.useCallback(() => {
    clearCompletedTour();
    setRunTour(true);
    emitTourEvent({ action: "reset" });
  }, []);

  React.useEffect(() => {
    function handleTourEvent(event) {
      const action = event.detail?.action;
      if (action === "start" || action === "reset") {
        setRunTour(true);
      }
      if (action === "stop") {
        setRunTour(false);
      }
    }

    window.addEventListener(TOUR_EVENT, handleTourEvent);
    return () => window.removeEventListener(TOUR_EVENT, handleTourEvent);
  }, []);

  React.useEffect(() => {
    if (autoStart && (ignoreCompletion || !hasCompletedTour())) {
      setRunTour(true);
    }
  }, [autoStart, ignoreCompletion]);

  return {
    runTour,
    startTour,
    stopTour,
    resetTour,
  };
}
