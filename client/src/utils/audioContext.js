// Manages shared Web Audio AudioContext singleton and handles user-gesture unlock for WebKit/iOS autoplay policy.

/**
 * Singleton AudioContext instance shared across the client application.
 * Reusing a single AudioContext prevents exhausting browser context limits
 * (typically 6 in WebKit/iOS) and avoids out-of-sync audio states.
 * @type {AudioContext | null}
 */
let sharedAudioContext = null;

/**
 * Set of AudioContext instances to resume upon user interaction.
 * @type {Set<AudioContext>}
 */
const trackedContexts = new Set();

/**
 * Cleanup function for the global user gesture listeners.
 * @type {(() => void) | null}
 */
let activeListenerCleanup = null;

/**
 * Interaction events considered valid user activations in WebKit/iOS autoplay policies.
 */
const USER_GESTURE_EVENTS = ["click", "touchstart", "touchend", "keydown"];

/**
 * Retrieves or initializes the shared AudioContext singleton.
 *
 * @returns {AudioContext | null} The shared AudioContext instance, or null if unsupported.
 */
export function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    try {
      sharedAudioContext = new AudioContextClass();
      setupAudioUnlock(sharedAudioContext);
    } catch (err) {
      console.warn("Failed to initialize AudioContext singleton:", err);
      return null;
    }
  }

  return sharedAudioContext;
}

/**
 * Determines whether a given AudioContext is the shared singleton instance.
 *
 * @param {AudioContext | null} ctx
 * @returns {boolean}
 */
export function isSharedAudioContext(ctx) {
  return ctx !== null && ctx !== undefined && ctx === sharedAudioContext;
}

/**
 * Directly resumes an AudioContext if suspended.
 * Also plays a 1-sample silent buffer on WebKit/iOS to prime the hardware output queue.
 *
 * @param {AudioContext | null} [context=null] Target AudioContext (defaults to shared instance).
 * @returns {Promise<boolean>} Resolves to true if the context is running.
 */
export async function unlockAudioContext(context = null) {
  const target = context || sharedAudioContext;
  if (!target) {
    return false;
  }

  try {
    if (target.state === "suspended" && typeof target.resume === "function") {
      await target.resume();
    }

    // iOS/WebKit hardware output unlock buffer
    if (
      (target.state === "running" || target.state === "suspended") &&
      typeof target.createBuffer === "function" &&
      typeof target.createBufferSource === "function"
    ) {
      try {
        const buffer = target.createBuffer(1, 1, 22050);
        const source = target.createBufferSource();
        source.buffer = buffer;
        source.connect(target.destination);
        source.start(0);
      } catch {
        // Fallback or silent ignore in test environments
      }
    }

    return target.state === "running";
  } catch (err) {
    console.warn("Unable to resume AudioContext:", err);
    return false;
  }
}

/**
 * Sets up global one-time user-gesture event listeners to unlock AudioContexts.
 * Ensures event listeners clean up after themselves once unlocked to prevent memory leaks.
 *
 * @param {AudioContext | null} [context=null] Optional AudioContext to register.
 * @returns {() => void} Cleanup function to detach listeners manually.
 */
export function setupAudioUnlock(context = null) {
  if (
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  ) {
    return () => {};
  }

  if (context) {
    trackedContexts.add(context);
    if (context.state === "running") {
      trackedContexts.delete(context);
    }
  }

  if (sharedAudioContext && sharedAudioContext.state === "suspended") {
    trackedContexts.add(sharedAudioContext);
  }

  const removeListeners = () => {
    USER_GESTURE_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, handleUserGesture, {
        capture: true,
      });
    });
    activeListenerCleanup = null;
  };

  const handleUserGesture = async () => {
    const contextsToUnlock = Array.from(trackedContexts);
    if (sharedAudioContext && !trackedContexts.has(sharedAudioContext)) {
      contextsToUnlock.push(sharedAudioContext);
    }

    await Promise.allSettled(
      contextsToUnlock.map((ctx) => unlockAudioContext(ctx)),
    );

    // Remove unlocked or closed contexts from tracking
    for (const ctx of trackedContexts) {
      if (ctx.state === "running" || ctx.state === "closed") {
        trackedContexts.delete(ctx);
      }
    }

    // Check if any tracked contexts remain suspended
    const anySuspended =
      Array.from(trackedContexts).some((ctx) => ctx.state === "suspended") ||
      (sharedAudioContext && sharedAudioContext.state === "suspended");

    // Once all contexts are unlocked, tear down listeners to prevent memory leaks
    if (!anySuspended) {
      removeListeners();
    }
  };

  if (!activeListenerCleanup) {
    USER_GESTURE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserGesture, {
        capture: true,
        passive: true,
      });
    });
    activeListenerCleanup = removeListeners;
  }

  return () => {
    if (context) {
      trackedContexts.delete(context);
    }
    if (trackedContexts.size === 0 && activeListenerCleanup) {
      activeListenerCleanup();
    }
  };
}

/**
 * Resets module state and closes singleton context for test suites.
 */
export function resetAudioContextForTesting() {
  if (activeListenerCleanup) {
    activeListenerCleanup();
    activeListenerCleanup = null;
  }
  trackedContexts.clear();
  if (sharedAudioContext) {
    if (typeof sharedAudioContext.close === "function" && sharedAudioContext.state !== "closed") {
      try {
        sharedAudioContext.close();
      } catch {
        // Ignore close error in tests
      }
    }
    sharedAudioContext = null;
  }
}
