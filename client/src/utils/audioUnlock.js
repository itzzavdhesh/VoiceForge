// Unlocks the Web Audio API on the user's first gesture so that programmatic
// TTS playback (e.g. triggered by a timer or an incoming websocket event) is
// not silently blocked by Safari/iOS WebKit autoplay policy.
//
// On iOS, an AudioContext that is created or resumed outside of a trusted user
// gesture stays in the "suspended" state and produces no sound. Resuming a
// (silent) AudioContext once, from within the first pointer/touch/keyboard
// interaction, primes the audio session so subsequent programmatic playback is
// allowed. This is the standard iOS Web Audio unlock pattern.

let unlocked = false;
let sharedContext = null;
let listenersAttached = false;

const GESTURE_EVENTS = ["pointerdown", "touchend", "keydown"];

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!sharedContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    sharedContext = new Ctor();
  }
  return sharedContext;
}

async function unlock() {
  if (unlocked) return;
  const ctx = getAudioContext();
  if (!ctx) {
    unlocked = true;
    return;
  }
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    // Play a zero-length silent buffer to fully unlock iOS audio routing.
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    unlocked = true;
  } catch {
    // If unlock fails (e.g. context closed), mark unlocked to avoid retry storms.
    unlocked = true;
  }
  removeListeners();
}

function removeListeners() {
  if (!listenersAttached || typeof window === "undefined") return;
  for (const evt of GESTURE_EVENTS) {
    window.removeEventListener(evt, unlock, true);
  }
  listenersAttached = false;
}

export function unlockAudioContext() {
  if (typeof window === "undefined" || listenersAttached) return;
  // If the context already happens to be running (some desktop browsers), no
  // gesture is required.
  const ctx = getAudioContext();
  if (ctx && ctx.state === "running") {
    unlocked = true;
    return;
  }
  for (const evt of GESTURE_EVENTS) {
    window.addEventListener(evt, unlock, { once: false, capture: true });
  }
  listenersAttached = true;
}

// Exposed for tests / other modules that want the shared, unlocked context.
export function getUnlockedAudioContext() {
  return unlocked ? sharedContext : null;
}
