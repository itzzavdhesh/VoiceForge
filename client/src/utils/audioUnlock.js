// Shares one AudioContext across VoiceForge and unlocks Safari/iOS autoplay on the first user gesture.

// Gestures WebKit accepts as "user activation". Keyboard and pointer events are
// included so switch-access and keyboard-only users unlock audio too.
const UNLOCK_EVENT_NAMES = [
  "touchstart",
  "touchend",
  "pointerdown",
  "mousedown",
  "keydown",
  "click",
];

// A 45-byte silent mono WAV. iOS only marks an <audio> element as user-approved
// once it has actually played inside a gesture, so the element needs a real source.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA";

let sharedContext = null;
let primedElement = null;
let detachGestureListeners = null;
let unlocked = false;
const unlockListeners = new Set();

function getAudioContextClass() {
  if (typeof window === "undefined") return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

/**
 * Reports whether the Web Audio API exists in this browser.
 * @returns {boolean}
 */
export function isAudioContextSupported() {
  return Boolean(getAudioContextClass());
}

/**
 * Returns the single app-wide AudioContext, creating it on first use.
 * Sharing one context matters on iOS: WebKit caps how many contexts a page may
 * open, and only the context unlocked by a gesture is allowed to produce sound.
 * @returns {AudioContext|null} Null when the Web Audio API is unavailable.
 */
export function getAudioContext() {
  if (sharedContext) return sharedContext;

  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) return null;

  try {
    sharedContext = new AudioContextClass();
  } catch {
    return null;
  }

  // iOS suspends the context again after interruptions (incoming call, Siri,
  // backgrounding the tab), so watch for it and re-arm the gesture listeners.
  if (typeof sharedContext.addEventListener === "function") {
    sharedContext.addEventListener("statechange", handleContextStateChange);
  }

  return sharedContext;
}

/**
 * Reports whether audio is currently allowed to play without a fresh gesture.
 * @returns {boolean}
 */
export function isAudioUnlocked() {
  return unlocked;
}

/**
 * Subscribes to unlock state changes so the UI can prompt for a tap when needed.
 * @param {(unlocked: boolean) => void} listener
 * @returns {() => void} Unsubscribe function.
 */
export function subscribeAudioUnlock(listener) {
  if (typeof listener !== "function") return () => {};
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}

function setUnlocked(nextUnlocked) {
  if (unlocked === nextUnlocked) return;
  unlocked = nextUnlocked;
  for (const listener of [...unlockListeners]) {
    try {
      listener(nextUnlocked);
    } catch {
      // A broken subscriber must not stop the others from being notified.
    }
  }
}

function handleContextStateChange() {
  if (sharedContext && sharedContext.state === "running") return;
  setUnlocked(false);
  installAudioUnlock();
}

function removeGestureListeners() {
  if (!detachGestureListeners) return;
  const detach = detachGestureListeners;
  detachGestureListeners = null;
  detach();
}

/**
 * Returns the hidden <audio> element used to bless HTML media playback on iOS.
 * @returns {HTMLAudioElement|null}
 */
function getPrimedAudioElement() {
  if (primedElement) return primedElement;
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return null;
  }

  const element = document.createElement("audio");
  if (typeof element.setAttribute === "function") {
    // Keeps iOS from hijacking playback into its fullscreen player.
    element.setAttribute("playsinline", "");
  }
  element.preload = "auto";
  element.src = SILENT_WAV;
  primedElement = element;
  return element;
}

// Safari does not consider a context started until a source node has run inside
// the gesture, so resume() alone leaves it silent.
function playSilentBuffer(context) {
  try {
    const buffer = context.createBuffer(1, 1, context.sampleRate || 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    if (typeof source.start === "function") {
      source.start(0);
    } else if (typeof source.noteOn === "function") {
      source.noteOn(0); // Legacy WebKit naming.
    }
  } catch {
    // The resume() call above is still worth keeping.
  }
}

async function primeMediaPlayback() {
  const element = getPrimedAudioElement();
  if (!element || typeof element.play !== "function") return;

  try {
    const playback = element.play();
    if (playback && typeof playback.then === "function") await playback;
    if (typeof element.pause === "function") element.pause();
    element.currentTime = 0;
  } catch {
    // Outside a gesture this is expected; the next gesture retries.
  }
}

/**
 * Resumes and primes audio playback. Safe to call repeatedly, but it only
 * succeeds while the browser considers a user gesture active.
 * @returns {Promise<boolean>} Whether audio is now unlocked.
 */
export async function unlockAudio() {
  const context = getAudioContext();

  if (context) {
    if (context.state === "suspended" && typeof context.resume === "function") {
      try {
        await context.resume();
      } catch {
        // Still blocked — the gesture listeners stay armed for the next tap.
      }
    }
    playSilentBuffer(context);
  }

  await primeMediaPlayback();

  // With no Web Audio support there is no context to unblock, so treat the
  // primed media element as sufficient.
  const isRunning = !context || context.state === "running";
  setUnlocked(isRunning);
  if (isRunning) removeGestureListeners();

  return isRunning;
}

/**
 * Arms one-shot gesture listeners that unlock audio on the user's first
 * interaction. Call once at app startup; it re-arms itself automatically if iOS
 * suspends the context later.
 * @param {EventTarget} [target] Defaults to `window`.
 * @returns {() => void} Teardown function that detaches the listeners.
 */
export function installAudioUnlock(target) {
  const root = target || (typeof window !== "undefined" ? window : null);
  if (!root || typeof root.addEventListener !== "function") return () => {};

  removeGestureListeners();

  const handleGesture = () => {
    unlockAudio().catch(() => {
      // Never let an unlock failure surface as an unhandled rejection.
    });
  };
  const options = { capture: true, passive: true };

  for (const eventName of UNLOCK_EVENT_NAMES) {
    root.addEventListener(eventName, handleGesture, options);
  }

  detachGestureListeners = () => {
    for (const eventName of UNLOCK_EVENT_NAMES) {
      root.removeEventListener(eventName, handleGesture, options);
    }
  };

  return removeGestureListeners;
}

/**
 * Plays a media element after making sure audio is unlocked.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Promise<boolean>} False when the element cannot be played at all.
 * @throws {Error} `AudioBlockedError` when the browser refused playback.
 */
export async function playMediaElement(mediaElement) {
  if (!mediaElement || typeof mediaElement.play !== "function") return false;

  await unlockAudio();

  try {
    const playback = mediaElement.play();
    if (playback && typeof playback.then === "function") await playback;
    return true;
  } catch (playError) {
    if (playError?.name === "NotAllowedError") {
      setUnlocked(false);
      installAudioUnlock();
      const blockedError = new Error(
        "Audio playback was blocked by the browser. Tap the page once, then try again."
      );
      blockedError.name = "AudioBlockedError";
      throw blockedError;
    }
    throw playError;
  }
}

/**
 * Clears all module state. Exported for tests only.
 */
export function resetAudioUnlockForTests() {
  removeGestureListeners();
  if (sharedContext && typeof sharedContext.removeEventListener === "function") {
    try {
      sharedContext.removeEventListener("statechange", handleContextStateChange);
    } catch {
      // Ignore detach errors on a disposed context.
    }
  }
  sharedContext = null;
  primedElement = null;
  unlocked = false;
  unlockListeners.clear();
}
