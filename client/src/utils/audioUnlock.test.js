// Verifies the Safari/iOS AudioContext unlock: shared context, gesture arming, and re-arming.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAudioContext,
  installAudioUnlock,
  isAudioContextSupported,
  isAudioUnlocked,
  playMediaElement,
  resetAudioUnlockForTests,
  subscribeAudioUnlock,
  unlockAudio,
} from "./audioUnlock.js";

// The vitest environment is "node", so the browser globals the module reads are
// stubbed here with just enough surface to exercise the unlock path.
function createFakeEnvironment({ supportsAudioContext = true } = {}) {
  const gestureHandlers = new Map();
  const startedSources = [];
  const createdElements = [];
  let constructedContexts = 0;

  class FakeAudioContext {
    constructor() {
      constructedContexts += 1;
      this.state = "suspended";
      this.sampleRate = 44100;
      this.destination = { id: "destination" };
      this.stateChangeHandlers = new Set();
    }

    addEventListener(type, handler) {
      if (type === "statechange") this.stateChangeHandlers.add(handler);
    }

    removeEventListener(type, handler) {
      if (type === "statechange") this.stateChangeHandlers.delete(handler);
    }

    async resume() {
      this.state = "running";
    }

    createBuffer() {
      return { duration: 0 };
    }

    createBufferSource() {
      const source = {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(() => startedSources.push(source)),
      };
      return source;
    }

    // Mimics iOS suspending the context after an interruption.
    simulateSuspension() {
      this.state = "suspended";
      for (const handler of this.stateChangeHandlers) handler();
    }
  }

  const fakeWindow = {
    addEventListener: vi.fn((type, handler) => {
      if (!gestureHandlers.has(type)) gestureHandlers.set(type, new Set());
      gestureHandlers.get(type).add(handler);
    }),
    removeEventListener: vi.fn((type, handler) => {
      gestureHandlers.get(type)?.delete(handler);
    }),
  };
  if (supportsAudioContext) fakeWindow.AudioContext = FakeAudioContext;

  const fakeDocument = {
    createElement: vi.fn(() => {
      const element = {
        attributes: {},
        preload: "",
        src: "",
        currentTime: 0,
        setAttribute: vi.fn(function setAttribute(name, value) {
          this.attributes[name] = value;
        }),
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
      };
      createdElements.push(element);
      return element;
    }),
  };

  globalThis.window = fakeWindow;
  globalThis.document = fakeDocument;

  return {
    createdElements,
    startedSources,
    countHandlers: (type) => gestureHandlers.get(type)?.size ?? 0,
    getConstructedContexts: () => constructedContexts,
    fireGesture: (type = "click") => {
      for (const handler of [...(gestureHandlers.get(type) ?? [])]) handler({ type });
    },
  };
}

let environment;

beforeEach(() => {
  environment = createFakeEnvironment();
});

afterEach(() => {
  resetAudioUnlockForTests();
  delete globalThis.window;
  delete globalThis.document;
  vi.restoreAllMocks();
});

describe("shared AudioContext", () => {
  it("constructs the context only once and hands the same instance to every caller", () => {
    const first = getAudioContext();
    const second = getAudioContext();

    expect(first).toBe(second);
    expect(environment.getConstructedContexts()).toBe(1);
  });

  it("reports missing Web Audio support instead of throwing", async () => {
    resetAudioUnlockForTests();
    environment = createFakeEnvironment({ supportsAudioContext: false });

    expect(isAudioContextSupported()).toBe(false);
    expect(getAudioContext()).toBeNull();
    await expect(unlockAudio()).resolves.toBe(true);
  });
});

describe("unlockAudio", () => {
  it("resumes the suspended context and starts a silent source so iOS accepts it", async () => {
    const unlockedNow = await unlockAudio();

    expect(unlockedNow).toBe(true);
    expect(getAudioContext().state).toBe("running");
    expect(environment.startedSources).toHaveLength(1);
    expect(isAudioUnlocked()).toBe(true);
  });

  it("primes a playsinline audio element so later programmatic playback is allowed", async () => {
    await unlockAudio();

    const [element] = environment.createdElements;
    expect(element).toBeDefined();
    expect(element.attributes.playsinline).toBe("");
    expect(element.src).toMatch(/^data:audio\/wav;base64,/);
    expect(element.play).toHaveBeenCalled();
    expect(element.pause).toHaveBeenCalled();
  });

  it("notifies subscribers when audio becomes available", async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAudioUnlock(listener);

    await unlockAudio();
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    listener.mockClear();
    await unlockAudio();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("installAudioUnlock", () => {
  it("arms every gesture event, including keyboard for switch-access users", () => {
    installAudioUnlock();

    for (const eventName of ["touchstart", "touchend", "pointerdown", "mousedown", "keydown", "click"]) {
      expect(environment.countHandlers(eventName)).toBe(1);
    }
  });

  it("unlocks on the first gesture and then detaches itself", async () => {
    installAudioUnlock();
    expect(isAudioUnlocked()).toBe(false);

    environment.fireGesture("touchstart");
    await vi.waitFor(() => expect(isAudioUnlocked()).toBe(true));

    expect(environment.countHandlers("touchstart")).toBe(0);
    expect(environment.countHandlers("click")).toBe(0);
  });

  it("does not stack duplicate handlers when installed twice", () => {
    installAudioUnlock();
    installAudioUnlock();

    expect(environment.countHandlers("click")).toBe(1);
  });

  it("re-arms after iOS suspends the context on an interruption", async () => {
    installAudioUnlock();
    environment.fireGesture("click");
    await vi.waitFor(() => expect(isAudioUnlocked()).toBe(true));

    getAudioContext().simulateSuspension();

    expect(isAudioUnlocked()).toBe(false);
    expect(environment.countHandlers("click")).toBe(1);

    environment.fireGesture("click");
    await vi.waitFor(() => expect(isAudioUnlocked()).toBe(true));
  });

  it("returns a teardown function that removes the listeners", () => {
    const teardown = installAudioUnlock();
    teardown();

    expect(environment.countHandlers("click")).toBe(0);
  });
});

describe("playMediaElement", () => {
  it("unlocks the context before playing the element", async () => {
    const element = { play: vi.fn(() => Promise.resolve()) };

    await expect(playMediaElement(element)).resolves.toBe(true);
    expect(element.play).toHaveBeenCalled();
    expect(getAudioContext().state).toBe("running");
  });

  it("re-arms the gesture listeners when the browser blocks playback", async () => {
    const notAllowed = new Error("blocked");
    notAllowed.name = "NotAllowedError";
    const element = { play: vi.fn(() => Promise.reject(notAllowed)) };

    await expect(playMediaElement(element)).rejects.toMatchObject({
      name: "AudioBlockedError",
    });
    expect(isAudioUnlocked()).toBe(false);
    expect(environment.countHandlers("click")).toBe(1);
  });

  it("ignores calls without a playable element", async () => {
    await expect(playMediaElement(null)).resolves.toBe(false);
  });
});
