// Verifies shared AudioContext singleton lifecycle, user-gesture unlock, and listener cleanup.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAudioContext,
  unlockAudioContext,
  setupAudioUnlock,
  isSharedAudioContext,
  resetAudioContextForTesting,
} from "./audioContext.js";

class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.destination = { id: "dest" };
    this.resumeCalled = 0;
    this.closeCalled = 0;
    this.bufferStarted = false;
  }

  async resume() {
    this.resumeCalled += 1;
    this.state = "running";
  }

  async close() {
    this.closeCalled += 1;
    this.state = "closed";
  }

  createBuffer(channels, length, sampleRate) {
    return { channels, length, sampleRate };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(() => {
        this.bufferStarted = true;
      }),
    };
  }
}

describe("audioContext utility", () => {
  beforeEach(() => {
    resetAudioContextForTesting();
    window.AudioContext = MockAudioContext;
  });

  afterEach(() => {
    resetAudioContextForTesting();
    vi.restoreAllMocks();
  });

  describe("getAudioContext singleton", () => {
    it("returns an AudioContext instance and caches it across calls", () => {
      const first = getAudioContext();
      const second = getAudioContext();

      expect(first).toBeInstanceOf(MockAudioContext);
      expect(first).toBe(second);
      expect(isSharedAudioContext(first)).toBe(true);
    });

    it("creates a new AudioContext if the previous singleton was closed", () => {
      const first = getAudioContext();
      first.close();

      const second = getAudioContext();
      expect(second).not.toBe(first);
      expect(second.state).toBe("suspended");
    });

    it("returns false for isSharedAudioContext when given a distinct context or null", () => {
      const shared = getAudioContext();
      const separate = new MockAudioContext();

      expect(isSharedAudioContext(shared)).toBe(true);
      expect(isSharedAudioContext(separate)).toBe(false);
      expect(isSharedAudioContext(null)).toBe(false);
      expect(isSharedAudioContext(undefined)).toBe(false);
    });
  });

  describe("unlockAudioContext", () => {
    it("resumes a suspended context and primes output buffer", async () => {
      const ctx = new MockAudioContext();
      expect(ctx.state).toBe("suspended");

      const success = await unlockAudioContext(ctx);

      expect(success).toBe(true);
      expect(ctx.state).toBe("running");
      expect(ctx.resumeCalled).toBe(1);
      expect(ctx.bufferStarted).toBe(true);
    });

    it("does not call resume on an already running context", async () => {
      const ctx = new MockAudioContext();
      ctx.state = "running";

      const success = await unlockAudioContext(ctx);

      expect(success).toBe(true);
      expect(ctx.resumeCalled).toBe(0);
    });

    it("returns false gracefully if unlock fails", async () => {
      const ctx = new MockAudioContext();
      ctx.resume = vi.fn().mockRejectedValue(new Error("Autoplay blocked"));

      const success = await unlockAudioContext(ctx);
      expect(success).toBe(false);
    });

    it("unlocks the shared context by default if no parameter is provided", async () => {
      const shared = getAudioContext();
      expect(shared.state).toBe("suspended");

      const success = await unlockAudioContext();
      expect(success).toBe(true);
      expect(shared.state).toBe("running");
    });
  });

  describe("setupAudioUnlock user-gesture listeners", () => {
    it("attaches listeners and resumes suspended context on touchstart", async () => {
      const ctx = new MockAudioContext();
      setupAudioUnlock(ctx);

      expect(ctx.state).toBe("suspended");

      // Simulate iOS user interaction
      window.dispatchEvent(new Event("touchstart"));

      // Allow async gesture handler microtasks to settle
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.state).toBe("running");
      expect(ctx.resumeCalled).toBe(1);
    });

    it("resumes suspended context on click event", async () => {
      const ctx = new MockAudioContext();
      setupAudioUnlock(ctx);

      window.dispatchEvent(new Event("click"));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.state).toBe("running");
      expect(ctx.resumeCalled).toBe(1);
    });

    it("resumes suspended context on keydown event", async () => {
      const ctx = new MockAudioContext();
      setupAudioUnlock(ctx);

      window.dispatchEvent(new Event("keydown"));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.state).toBe("running");
      expect(ctx.resumeCalled).toBe(1);
    });

    it("removes listeners after unlocking to prevent memory leaks", async () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const ctx = new MockAudioContext();
      setupAudioUnlock(ctx);

      window.dispatchEvent(new Event("click"));
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(ctx.state).toBe("running");
      expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function), {
        capture: true,
      });
      expect(removeSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), {
        capture: true,
      });
    });

    it("cleans up listeners when calling returned cleanup function", () => {
      const removeSpy = vi.spyOn(window, "removeEventListener");
      const ctx = new MockAudioContext();
      const cleanup = setupAudioUnlock(ctx);

      cleanup();

      expect(removeSpy).toHaveBeenCalledWith("click", expect.any(Function), {
        capture: true,
      });
    });
  });
});
