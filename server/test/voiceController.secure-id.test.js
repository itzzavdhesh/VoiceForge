// Covers issue #66: speech IDs must be cryptographically unpredictable and the
// pending-stream store must be bounded so it cannot exhaust process memory.
import test from "node:test";
import assert from "node:assert/strict";

import { createRequest, createResponse, createFetchStub, invoke } from "./helpers.js";

const API_KEY_HEADER = { "X-ElevenLabs-Api-Key": "sk_test_key" };
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function callSpeak(speak, overrides = {}) {
  const request = createRequest({
    headers: API_KEY_HEADER,
    body: { text: "Hello there", voice_id: "voice_1", ...overrides }
  });
  const response = createResponse();
  const error = await invoke(speak, request, response);
  assert.equal(error, undefined, "speak should not call next with an error");
  return response.jsonBody;
}

test("speechId is a cryptographically secure UUID, not a Math.random string", async () => {
  const { speak } = await import("../controllers/voiceController.js");
  const payload = await callSpeak(speak);
  assert.match(payload.speechId, UUID_V4);
});

test("speechId is unique across many requests", async () => {
  const { speak } = await import("../controllers/voiceController.js");
  const ids = new Set();
  for (let i = 0; i < 200; i += 1) {
    const payload = await callSpeak(speak);
    ids.add(payload.speechId);
  }
  assert.equal(ids.size, 200, "every generated speechId should be distinct");
});

test("audioUrl embeds the matching speechId", async () => {
  const { speak } = await import("../controllers/voiceController.js");
  const payload = await callSpeak(speak);
  assert.ok(
    payload.audioUrl.startsWith(`/api/voice/speak/stream/${payload.speechId}`),
    "audioUrl should reference the generated speechId"
  );
});

test("pending-stream store rejects new /speak calls when full", async (t) => {
  // Force a tiny cap so the test stays fast, and a long TTL so the timer does
  // not expire entries during the test. Re-import so the new ceiling is read.
  process.env.PENDING_STREAMS_MAX = "10";
  process.env.PENDING_STREAM_TTL_MS = "60000";
  const modulePath = `../controllers/voiceController.js?cap=${Date.now()}`;
  const { speak, streamSpeech } = await import(modulePath);

  const fetchStub = createFetchStub({ chunk: "mp3" });
  const originalFetch = global.fetch;
  global.fetch = fetchStub;

  t.after(() => {
    global.fetch = originalFetch;
    delete process.env.PENDING_STREAMS_MAX;
    delete process.env.PENDING_STREAM_TTL_MS;
  });

  const created = [];
  for (let i = 0; i < 10; i += 1) {
    created.push(await callSpeak(speak));
  }

  const overflowResponse = createResponse();
  await invoke(
    speak,
    createRequest({ headers: API_KEY_HEADER, body: { text: "Hello there", voice_id: "voice_1" } }),
    overflowResponse
  );
  assert.equal(
    overflowResponse.statusCode,
    503,
    "new /speak requests should be rejected when the pending stream store is full"
  );
  assert.equal(
    overflowResponse.jsonBody.error,
    "Too many pending speech requests. Please retry after retrieving or cancelling existing audio streams."
  );

  const oldest = created[0];
  const oldestResponse = createResponse();
  await invoke(
    streamSpeech,
    createRequest({ params: { speechId: oldest.speechId } }),
    oldestResponse
  );
  assert.equal(oldestResponse.ended, true, "oldest entry should still stream when the store is full");

  const newest = created[created.length - 1];
  const newestResponse = createResponse();
  await invoke(
    streamSpeech,
    createRequest({ params: { speechId: newest.speechId } }),
    newestResponse
  );
  assert.equal(newestResponse.ended, true, "newest entry should still stream when the store is full");
});
