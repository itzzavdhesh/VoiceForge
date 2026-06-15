// Covers issue #66: speech IDs must be cryptographically unpredictable and secure,
// and expired tokens must be rejected.
import test from "node:test";
import assert from "node:assert/strict";

import { createRequest, createResponse, createFetchStub, invoke } from "./helpers.js";

const API_KEY_HEADER = { "X-ElevenLabs-Api-Key": "sk_test_key" };

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

test("speechId is a cryptographically secure token", async () => {
  const { speak } = await import("../controllers/voiceController.js");
  const payload = await callSpeak(speak);
  
  // Verify it is a valid base64url-encoded JSON object representing our token metadata
  const rawJson = Buffer.from(payload.speechId, "base64url").toString("utf8");
  const parsed = JSON.parse(rawJson);
  assert.ok(parsed.iv, "token must contain initialization vector (iv)");
  assert.ok(parsed.tag, "token must contain authentication tag (tag)");
  assert.ok(parsed.data, "token must contain encrypted payload (data)");
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
  assert.equal(
    payload.audioUrl,
    `/api/voice/speak/stream?t=${payload.speechId}`,
    "audioUrl should reference the generated speechId via query parameter"
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
test("expired speech token throws 403 error", async (t) => {
  const { speak, streamSpeech } = await import("../controllers/voiceController.js");

  const originalNow = Date.now;
  t.after(() => {
    Date.now = originalNow;
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
  // 1. Generate token normally
  const payload = await callSpeak(speak);

  // 2. Mock Date.now to be in the future (e.g. 5 minutes later)
  Date.now = () => originalNow() + 5 * 60 * 1000;

  // 3. Try to stream it — should result in 403 (expired)
  const streamReq = createRequest({ query: { t: payload.speechId } });
  const streamRes = createResponse();
  const err = await invoke(streamSpeech, streamReq, streamRes);
  
  assert.ok(err, "should call next with an error for expired token");
  assert.equal(err.status, 403);
  assert.equal(err.message, "Speech stream has expired.");
});
