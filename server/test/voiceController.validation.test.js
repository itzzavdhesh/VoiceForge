import test from "node:test";
import assert from "node:assert/strict";

import { createRequest, createResponse, invoke } from "./helpers.js";

import {
  speak,
  cloneVoice,
  streamSpeech,
  clampNumber,
  parseBoundedNumber
} from "../controllers/voiceController.js";

test("speak rejects blank text", async () => {
  const request = createRequest({
    body: {
      text: "   ",
      voice_id: "voice_1"
    }
  });

  const response = createResponse();

  await invoke(speak, request, response);

  assert.equal(response.statusCode, 400);
  assert.equal(
    response.jsonBody.error,
    "text is required and must not be blank."
  );
});

test("speak rejects missing voice_id", async () => {
  const request = createRequest({
    body: {
      text: "Hello"
    }
  });

  const response = createResponse();

  await invoke(speak, request, response);

  assert.equal(response.statusCode, 400);
  assert.equal(
    response.jsonBody.error,
    "voice_id is required and must not be blank."
  );
});

test("speak rejects text longer than 300 characters", async () => {
  const request = createRequest({
    body: {
      text: "a".repeat(301),
      voice_id: "voice_1"
    }
  });

  const response = createResponse();

  await invoke(speak, request, response);

  assert.equal(response.statusCode, 400);
});

test("speak rejects unsupported language code", async () => {
  const request = createRequest({
    body: {
      text: "Hello",
      voice_id: "voice_1",
      language_code: "invalid-language"
    }
  });

  const response = createResponse();

  await invoke(speak, request, response);

  assert.equal(response.statusCode, 400);
  assert.match(response.jsonBody.error, /Unsupported language code/);
});

test("speak rejects invalid voice_settings temperature", async () => {
  const request = createRequest({
    body: {
      text: "Hello",
      voice_id: "voice_1",
      voice_settings: {
        temperature: 10
      }
    }
  });

  const response = createResponse();

  await invoke(speak, request, response);

  assert.equal(response.statusCode, 400);
});

test("cloneVoice rejects missing audio file", async () => {
  const request = createRequest({
    body: {
      name: "Test voice"
    }
  });

  const response = createResponse();

  await invoke(cloneVoice, request, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.jsonBody.error, "Reference audio is required.");
});

test("streamSpeech rejects tampered speech token", async () => {
  const speakRequest = createRequest({
    body: {
      text: "Hello",
      voice_id: "voice_1"
    }
  });

  const speakResponse = createResponse();

  await invoke(speak, speakRequest, speakResponse);

  const token = speakResponse.jsonBody.speechId;
  const tamperedToken = token.slice(0, -2) + "xx";

  const streamRequest = createRequest({
    query: {
      t: tamperedToken
    }
  });

  const streamResponse = createResponse();

  const error = await invoke(streamSpeech, streamRequest, streamResponse);

  assert.ok(error);
  assert.equal(error.status, 400);
});

test("streamSpeech rejects invalid ciphertext token", async () => {
  const request = createRequest({
    query: {
      t: "invalid-token"
    }
  });

  const response = createResponse();

  const error = await invoke(streamSpeech, request, response);

  assert.ok(error);
  assert.equal(error.status, 400);
});

// ---------------------------------------------------------------------------
// Voice store: maximum size enforcement (FIFO eviction)
//
// The previous version of this test only asserted that cloneVoice succeeded
// three times in a row - it would pass even if size enforcement was deleted
// entirely. This version confirms the store actually stays capped and that
// the *oldest* voice_id specifically becomes unusable, by trying to stream
// against it and observing the 404 lookup-miss branch in streamSpeech
// (voiceStore.get(voiceId) returning undefined), not just "no crash".
// ---------------------------------------------------------------------------
test("cloneVoice enforces maximum voice store size and evicts oldest first", async (t) => {
  const oldMax = process.env.VOICE_STORE_MAX;
  const oldMock = process.env.MOCK_CHATTERBOX;
  const oldEnv = process.env.NODE_ENV;

  process.env.VOICE_STORE_MAX = "2";
  process.env.MOCK_CHATTERBOX = "false";
  process.env.NODE_ENV = "development";

  t.after(() => {
    if (oldMax === undefined) delete process.env.VOICE_STORE_MAX;
    else process.env.VOICE_STORE_MAX = oldMax;

    if (oldMock === undefined) delete process.env.MOCK_CHATTERBOX;
    else process.env.MOCK_CHATTERBOX = oldMock;

    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnv;
  });

  const {
    cloneVoice,
    speak,
    streamSpeech,
    __getVoiceStoreSize
  } = await import("../controllers/voiceController.js?max=" + Date.now());

  const voiceIds = [];

  for (let i = 0; i < 3; i++) {
    const request = createRequest({
      body: { name: `voice-${i}` }
    });

    request.file = {
      buffer: Buffer.from(`audio-${i}`),
      mimetype: "audio/webm"
    };

    const response = createResponse();

    await invoke(cloneVoice, request, response);

    assert.ok(response.jsonBody.voice_id);
    voiceIds.push(response.jsonBody.voice_id);
  }

  // The store must never exceed the configured cap.
  assert.equal(__getVoiceStoreSize(), 2);

  // The oldest voice_id should have been evicted. Confirm by driving a real
  // speak -> streamSpeech round trip and checking for the 404 lookup miss
  // (this exercises pruneVoiceStore()+voiceStore.get() exactly as production
  // traffic would, rather than reaching into internals).
  const [firstVoiceId] = voiceIds;

  const speakRequest = createRequest({
    body: { text: "Hello", voice_id: firstVoiceId }
  });
  const speakResponse = createResponse();
  await invoke(speak, speakRequest, speakResponse);

  const streamRequest = createRequest({
    query: { t: speakResponse.jsonBody.speechId }
  });
  const streamResponse = createResponse();
  await invoke(streamSpeech, streamRequest, streamResponse);

  assert.equal(
    streamResponse.statusCode,
    404,
    "the oldest voice should have been evicted once the store exceeded its cap"
  );
});

// ---------------------------------------------------------------------------
// Voice store: TTL eviction
//
// The previous version of this test only asserted that a *second* cloneVoice
// call succeeded - it never checked that the first (expired) voice was
// actually removed, so it would pass even if pruneVoiceStore() were deleted.
// This version fast-forwards Date.now() (same technique already used in
// voiceController.secure-id.test.js for token expiry - no real sleeps),
// then confirms the expired entry is both unreachable (404 via streamSpeech)
// and actually gone from the store (size drops to 0).
// ---------------------------------------------------------------------------
test("cloneVoice removes expired voices after TTL", async (t) => {
  const oldTtl = process.env.VOICE_STORE_TTL_MS;
  const oldMock = process.env.MOCK_CHATTERBOX;
  const oldEnv = process.env.NODE_ENV;
  const originalNow = Date.now;

  // NOTE: VOICE_STORE_TTL_MS is parsed as parseBoundedNumber(raw, 2h, 60_000)
  // - the third argument is a MINIMUM FLOOR of 60 seconds. Setting this env
  // var below 60000 does NOT produce a shorter TTL; it gets clamped back up
  // to 60000. So the real effective TTL here is 60s, not "5s" - the test
  // fast-forwards accordingly instead of assuming the raw value is honored.
  process.env.VOICE_STORE_TTL_MS = "60000";
  process.env.MOCK_CHATTERBOX = "false";
  process.env.NODE_ENV = "development";

  t.after(() => {
    Date.now = originalNow;

    if (oldTtl === undefined) delete process.env.VOICE_STORE_TTL_MS;
    else process.env.VOICE_STORE_TTL_MS = oldTtl;

    if (oldMock === undefined) delete process.env.MOCK_CHATTERBOX;
    else process.env.MOCK_CHATTERBOX = oldMock;

    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnv;
  });

  const {
    cloneVoice,
    speak,
    streamSpeech,
    __getVoiceStoreSize
  } = await import("../controllers/voiceController.js?ttl=" + Date.now());

  const cloneRequest = createRequest({
    body: { name: "temporary voice" }
  });
  cloneRequest.file = {
    buffer: Buffer.from("audio"),
    mimetype: "audio/webm"
  };

  const cloneResponse = createResponse();
  await invoke(cloneVoice, cloneRequest, cloneResponse);

  const expiredVoiceId = cloneResponse.jsonBody.voice_id;
  assert.ok(expiredVoiceId);
  assert.equal(__getVoiceStoreSize(), 1);

  // Fast-forward 61s - past the real (floored) 60s TTL - without a real sleep.
  Date.now = () => originalNow() + 61_000;

  // speak() itself never checks the voice store, so this still succeeds;
  // streamSpeech is what enforces the TTL via pruneVoiceStore().
  const speakRequest = createRequest({
    body: { text: "Hello", voice_id: expiredVoiceId }
  });
  const speakResponse = createResponse();
  await invoke(speak, speakRequest, speakResponse);

  const streamRequest = createRequest({
    query: { t: speakResponse.jsonBody.speechId }
  });
  const streamResponse = createResponse();
  await invoke(streamSpeech, streamRequest, streamResponse);

  assert.equal(
    streamResponse.statusCode,
    404,
    "expired voice should no longer resolve"
  );
  assert.equal(
    __getVoiceStoreSize(),
    0,
    "expired entry should actually be removed from the store, not just unreachable"
  );
});

// ---------------------------------------------------------------------------
// Voice store: pruning is selective, not "clear everything"
// ---------------------------------------------------------------------------
test("cloneVoice prunes only expired voices and preserves recent ones", async (t) => {
  const oldTtl = process.env.VOICE_STORE_TTL_MS;
  const oldMock = process.env.MOCK_CHATTERBOX;
  const oldEnv = process.env.NODE_ENV;
  const originalNow = Date.now;

  // Same 60s floor caveat as the test above - TTL is effectively fixed at
  // 60000ms minimum regardless of what's configured below that.
  process.env.VOICE_STORE_TTL_MS = "60000";
  process.env.MOCK_CHATTERBOX = "false";
  process.env.NODE_ENV = "development";

  t.after(() => {
    Date.now = originalNow;

    if (oldTtl === undefined) delete process.env.VOICE_STORE_TTL_MS;
    else process.env.VOICE_STORE_TTL_MS = oldTtl;

    if (oldMock === undefined) delete process.env.MOCK_CHATTERBOX;
    else process.env.MOCK_CHATTERBOX = oldMock;

    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnv;
  });

  const {
    cloneVoice,
    speak,
    streamSpeech,
    __getVoiceStoreSize
  } = await import("../controllers/voiceController.js?ttl-preserve=" + Date.now());

  const baseTime = originalNow();
  Date.now = () => baseTime;

  const oldRequest = createRequest({ body: { name: "old voice" } });
  oldRequest.file = { buffer: Buffer.from("audio-old"), mimetype: "audio/webm" };
  const oldResponse = createResponse();
  await invoke(cloneVoice, oldRequest, oldResponse);
  const oldVoiceId = oldResponse.jsonBody.voice_id;
  assert.ok(oldVoiceId);

  // 30s later - still within the old voice's 60s TTL - clone a second voice.
  // Its own TTL window now runs from +30s to +90s.
  Date.now = () => baseTime + 30_000;

  const newRequest = createRequest({ body: { name: "new voice" } });
  newRequest.file = { buffer: Buffer.from("audio-new"), mimetype: "audio/webm" };
  const newResponse = createResponse();
  await invoke(cloneVoice, newRequest, newResponse);
  assert.ok(newResponse.jsonBody.voice_id);

  assert.equal(__getVoiceStoreSize(), 2);

  // 65s after baseTime: the old voice (created at +0, expires at +60s) has
  // expired; the new one (created at +30s, expires at +90s) has not.
  Date.now = () => baseTime + 65_000;

  // Any store access triggers pruneVoiceStore() - use a third clone to do so.
  const triggerRequest = createRequest({ body: { name: "trigger prune" } });
  triggerRequest.file = { buffer: Buffer.from("audio-trigger"), mimetype: "audio/webm" };
  const triggerResponse = createResponse();
  await invoke(cloneVoice, triggerRequest, triggerResponse);

  // If pruning were broken, size would be 3 (old+new+trigger all retained).
  // The default MAX_STORED_VOICES (20) is not overridden here, so this can
  // only be 2 if TTL pruning - not the max-size cap - removed the old entry.
  assert.equal(
    __getVoiceStoreSize(),
    2,
    "only the expired entry should be pruned; the still-valid one stays"
  );

  // Confirm specifically that it was the *old* voice that's gone.
  const speakRequest = createRequest({
    body: { text: "Hello", voice_id: oldVoiceId }
  });
  const speakResponse = createResponse();
  await invoke(speak, speakRequest, speakResponse);

  const streamRequest = createRequest({
    query: { t: speakResponse.jsonBody.speechId }
  });
  const streamResponse = createResponse();
  await invoke(streamSpeech, streamRequest, streamResponse);

  assert.equal(streamResponse.statusCode, 404);
});

test("clampNumber returns fallback for invalid numbers", () => {
  assert.equal(clampNumber("abc", 0, 1, 0.5), 0.5);
});

test("clampNumber respects min and max boundaries", () => {
  assert.equal(clampNumber(-1, 0, 1, 0.5), 0);
  assert.equal(clampNumber(5, 0, 1, 0.5), 1);
  assert.equal(clampNumber(0.5, 0, 1, 0), 0.5);
});

// ---------------------------------------------------------------------------
// parseBoundedNumber
//
// Real signature is (rawValue, fallback, min) - there is no upper-bound
// parameter despite the name. It only guarantees a floor via Math.max(min,
// numeric); values above min pass through unclamped. These tests reflect
// the actual implementation rather than an assumed 4-arg (min, max) API.
// ---------------------------------------------------------------------------
test("parseBoundedNumber returns fallback for non-finite values", () => {
  assert.equal(parseBoundedNumber("abc", 5, 0), 5);
  assert.equal(parseBoundedNumber(NaN, 5, 0), 5);
  assert.equal(parseBoundedNumber(undefined, 5, 0), 5);
});

test("parseBoundedNumber enforces only a minimum floor, with no upper bound", () => {
  // Below the minimum gets clamped up to it.
  assert.equal(parseBoundedNumber(-10, 5, 0), 0);
  // Above the minimum passes through unclamped, however large.
  assert.equal(parseBoundedNumber(500, 5, 0), 500);
  // A value already >= min is returned as-is.
  assert.equal(parseBoundedNumber(7, 5, 0), 7);
});
