// Verifies AudioProcessor binds one source node per media element and survives remounts.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioProcessor } from "./audioProcessor.js";

// Meyda needs a real Web Audio graph; the analyzer is optional for these tests.
vi.mock("meyda", () => ({
  default: {
    createMeydaAnalyzer: () => ({ start: vi.fn(), stop: vi.fn() }),
  },
}));

let constructedContexts;

class FakeAudioContext {
  constructor() {
    constructedContexts.push(this);
    this.state = "running";
    this.sampleRate = 44100;
    this.destination = { id: "destination" };
    this.closed = false;
    this.createdSources = [];
  }

  async resume() {
    this.state = "running";
  }

  createMediaElementSource(element) {
    if (element.__boundSourceNode) {
      // Mirrors the real spec: one MediaElementAudioSourceNode per element, ever.
      throw new DOMException("InvalidStateError", "InvalidStateError");
    }
    const node = {
      context: this,
      connections: [],
      connect: vi.fn(function connect(destination) {
        if (!this.connections.includes(destination)) this.connections.push(destination);
      }),
      disconnect: vi.fn(function disconnect() {
        this.connections = [];
      }),
    };
    element.__boundSourceNode = node;
    this.createdSources.push(node);
    return node;
  }

  close() {
    this.closed = true;
    this.state = "closed";
  }
}

function createMediaElement(id = "audio") {
  return { id };
}

beforeEach(() => {
  constructedContexts = [];
  globalThis.window = { AudioContext: FakeAudioContext };
});

afterEach(() => {
  delete globalThis.window;
  vi.restoreAllMocks();
});

describe("source node binding", () => {
  it("creates exactly one source node when the same element is initialized twice", async () => {
    const element = createMediaElement();
    const processor = new AudioProcessor();

    await processor.initialize(element);
    const firstSource = processor.source;

    await processor.initialize(element);

    expect(processor.source).toBe(firstSource);
    expect(constructedContexts[0].createdSources).toHaveLength(1);
  });

  it("reconnects the reused node to the destination so playback is not silenced", async () => {
    const element = createMediaElement();
    const processor = new AudioProcessor();

    await processor.initialize(element);
    // Simulate the disconnect an earlier teardown would have performed.
    processor.source.disconnect();
    expect(processor.source.connections).toHaveLength(0);

    await processor.initialize(element);

    expect(processor.source.connections).toContain(constructedContexts[0].destination);
  });

  it("does not write a source node property onto the media element", async () => {
    const element = createMediaElement();
    const processor = new AudioProcessor();

    await processor.initialize(element);

    expect(element._audioSourceNode).toBeUndefined();
  });

  it("rejects a missing element with a clear error", async () => {
    const processor = new AudioProcessor();

    await expect(processor.initialize(null)).rejects.toThrow(TypeError);
  });
});

describe("cross-instance state", () => {
  it("makes a second processor adopt the context the element is already bound to", async () => {
    const element = createMediaElement();

    const first = new AudioProcessor();
    await first.initialize(element);

    const second = new AudioProcessor();
    await second.initialize(element);

    expect(constructedContexts).toHaveLength(1);
    expect(second.audioContext).toBe(first.audioContext);
    expect(second.source).toBe(first.source);
  });

  it("keeps two processors on separate elements independent", async () => {
    const firstElement = createMediaElement("a");
    const secondElement = createMediaElement("b");

    const first = new AudioProcessor();
    await first.initialize(firstElement);

    const second = new AudioProcessor();
    await second.initialize(secondElement);

    expect(second.source).not.toBe(first.source);
    expect(constructedContexts).toHaveLength(2);
  });
});

describe("dispose", () => {
  it("keeps the context alive while it owns a media element binding", async () => {
    const element = createMediaElement();
    const processor = new AudioProcessor();

    await processor.initialize(element);
    const context = processor.audioContext;

    processor.dispose();

    expect(context.closed).toBe(false);
    expect(processor.audioContext).toBeNull();
    expect(processor.source).toBeNull();
  });

  it("still closes a standalone context that owns no element binding", () => {
    const processor = new AudioProcessor();
    const close = vi.fn();
    processor.source = { disconnect: vi.fn() };
    processor.audioContext = { state: "running", close };
    processor.analyzer = { stop: vi.fn() };

    processor.dispose();

    expect(close).toHaveBeenCalled();
    expect(processor.audioContext).toBeNull();
  });

  it("supports the dispose-then-remount cycle without losing audio", async () => {
    const element = createMediaElement();

    const firstMount = new AudioProcessor();
    await firstMount.initialize(element);
    const context = firstMount.audioContext;
    firstMount.dispose();

    const secondMount = new AudioProcessor();
    await secondMount.initialize(element);

    expect(secondMount.audioContext).toBe(context);
    expect(context.closed).toBe(false);
    expect(secondMount.source.connections).toContain(context.destination);
  });
});
