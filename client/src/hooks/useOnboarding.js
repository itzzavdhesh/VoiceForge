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

export default function useOnboarding({ autoStart = false } = {}) {
  const [runTour, setRunTour] = React.useState(false);
  const [tourStartIndex, setTourStartIndex] = React.useState(null);

  const startTour = React.useCallback((startIndex = null) => {
    setTourStartIndex(startIndex);
    setRunTour(true);
    emitTourEvent({ action: "start", startIndex });
  }, []);

  const stopTour = React.useCallback(() => {
    setTourStartIndex(null);
    setRunTour(false);
    setCompletedTour();
    emitTourEvent({ action: "stop" });
  }, []);

  const resetTour = React.useCallback(() => {
    clearCompletedTour();
    setTourStartIndex(0);
    setRunTour(true);
    emitTourEvent({ action: "reset", startIndex: 0 });
  }, []);

  React.useEffect(() => {
    function handleTourEvent(event) {
      const action = event.detail?.action;
      if (action === "start" || action === "reset") {
        setTourStartIndex(
          Number.isInteger(event.detail?.startIndex) ? event.detail.startIndex : null,
        );
        setRunTour(true);
      }
      if (action === "stop") {
        setTourStartIndex(null);
        setRunTour(false);
      }
    }

    window.addEventListener(TOUR_EVENT, handleTourEvent);
    return () => window.removeEventListener(TOUR_EVENT, handleTourEvent);
  }, []);

  React.useEffect(() => {
    if (autoStart && !hasCompletedTour()) {
      setTourStartIndex(null);
      setRunTour(true);
    }
  }, [autoStart]);

  return {
    runTour,
    tourStartIndex,
    startTour,
    stopTour,
    resetTour,
  };
}
