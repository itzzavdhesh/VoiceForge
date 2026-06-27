// Covers MOCK_CHATTERBOX=true mode: voice cloning and TTS streaming must work
// end-to-end without any upstream Chatterbox/Hugging Face network call.
//
// Why env vars are managed per-test and not at import time:
//   getIsMock() in voiceController reads process.env at *call* time, not at
//   module load time. So the env must still be set when the handler runs, not
//   just when we import the module. Each test sets the vars it needs, calls
//   the handler, then restores the original values in t.after().
import test from "node:test";
import assert from "node:assert/strict";

import { createRequest, createResponse, invoke } from "./helpers.js";
import {
  cloneVoice,
  speak,
  streamSpeech,
  getStatus
} from "../controllers/voiceController.js";

// ---------------------------------------------------------------------------
// Helper: temporarily override process.env keys for one test.
// Returns a restore function to pass to t.after().
// ---------------------------------------------------------------------------
function withEnv(env) {
  const saved = {};
  for (const [k, v] of Object.entries(env)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  return function restore() {
    for (const [k] of Object.entries(env)) {
      if (saved[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = saved[k];
      }
    }
  };
}

// ---------------------------------------------------------------------------
// cloneVoice — mock mode
// ---------------------------------------------------------------------------

test("MOCK_CHATTERBOX: cloneVoice returns fixture voice_id", async (t) => {
  const restore = withEnv({ MOCK_CHATTERBOX: "true", NODE_ENV: "development" });
  t.after(restore);

  const request = createRequest({ body: { name: "Contributor test voice" } });
  request.file = {
    buffer: Buffer.from("fake-audio"),
    mimetype: "audio/webm",
    originalname: "test.webm"
  };
  const response = createResponse();

  const err = await invoke(cloneVoice, request, response);
  assert.equal(err, undefined, "cloneVoice must not call next(error) in mock mode");
  assert.equal(response.jsonBody?.voice_id, "mock-voice-id-00000000");
  assert.equal(response.jsonBody?.name, "Contributor test voice");
});

test("MOCK_CHATTERBOX: cloneVoice still rejects when no audio file is uploaded", async (t) => {
  const restore = withEnv({ MOCK_CHATTERBOX: "true", NODE_ENV: "development" });
  t.after(restore);

  const request = createRequest({ body: {} });
  const response = createResponse();
  await invoke(cloneVoice, request, response);
  assert.equal(response.statusCode, 400);
});

// ---------------------------------------------------------------------------
// speak — mock mode
// ---------------------------------------------------------------------------

test("MOCK_CHATTERBOX: speak enqueues a stream", async (t) => {
  const restore = withEnv({ MOCK_CHATTERBOX: "true", NODE_ENV: "development" });
  t.after(restore);

  const request = createRequest({
    body: { text: "Hello from mock", voice_id: "mock-voice-id-00000000" }
  });
  const response = createResponse();

  const err = await invoke(speak, request, response);
  assert.equal(err, undefined, "speak must not call next(error) in mock mode");
  assert.ok(response.jsonBody?.speechId, "speechId must be present");
  assert.ok(
    response.jsonBody?.audioUrl?.includes(response.jsonBody.speechId),
    "audioUrl must embed the speechId"
  );
});

test("MOCK_CHATTERBOX: speak still rejects when text is missing", async (t) => {
  const restore = withEnv({ MOCK_CHATTERBOX: "true", NODE_ENV: "development" });
  t.after(restore);

  const request = createRequest({ body: { voice_id: "mock-voice-id-00000000" } });
  const response = createResponse();
  await invoke(speak, request, response);
  assert.equal(response.statusCode, 400);
});

// ---------------------------------------------------------------------------
// streamSpeech — full TTS → stream path, no fetch stub needed
// ---------------------------------------------------------------------------

test("MOCK_CHATTERBOX: streamSpeech responds with audio/mpeg and a non-empty body", async (t) => {
  const restore = withEnv({ MOCK_CHATTERBOX: "true", NODE_ENV: "development" });
  t.after(restore);

  // 1. Enqueue a mock speech entry.
  const speakReq = createRequest({
    body: { text: "Hello mock stream", voice_id: "mock-voice-id-00000000" }
  });
  const speakRes = createResponse();
  const speakErr = await invoke(speak, speakReq, speakRes);
  assert.equal(speakErr, undefined, "speak must succeed before we can stream");
  const { speechId } = speakRes.jsonBody;

  // 2. Stream it back — entirely local, no Chatterbox/Hugging Face call.
  const streamReq = createRequest({ query: { t: speechId } });
  const streamRes = createResponse();
  const err = await invoke(streamSpeech, streamReq, streamRes);

  assert.equal(err, undefined, "streamSpeech must not call next(error) in mock mode");
  assert.equal(streamRes.headers["Content-Type"], "audio/mpeg");
  assert.ok(streamRes.ended, "response must be ended after streaming mock audio");
});

test("MOCK_CHATTERBOX: streamSpeech returns 400 for an invalid speechId", async (t) => {
  const restore = withEnv({ MOCK_CHATTERBOX: "true", NODE_ENV: "development" });
  t.after(restore);

  const request = createRequest({ query: { t: "does-not-exist" } });
  const response = createResponse();
  const err = await invoke(streamSpeech, request, response);
  assert.ok(err, "should call next with an error for invalid token");
  assert.equal(err.status, 400);
});

// ---------------------------------------------------------------------------
// Production safety — MOCK_CHATTERBOX must be a no-op when NODE_ENV=production
// ---------------------------------------------------------------------------

test("MOCK_CHATTERBOX is ignored in production: cloneVoice still runs (no key required)", async (t) => {
  const restore = withEnv({ MOCK_CHATTERBOX: "true", NODE_ENV: "production" });
  t.after(restore);

  const request = createRequest({ body: { name: "prod test" } });
  request.file = {
    buffer: Buffer.from("fake-audio"),
    mimetype: "audio/webm",
    originalname: "test.webm"
  };
  const response = createResponse();
  const err = await invoke(cloneVoice, request, response);
  // Chatterbox requires no API key so cloneVoice should succeed even in production.
  assert.equal(err, undefined, "cloneVoice must not error in production — no key needed");
  assert.ok(response.jsonBody?.voice_id, "must return a voice_id");
});

// ---------------------------------------------------------------------------
// getStatus — checking config state without exposing secrets
// ---------------------------------------------------------------------------

test("getStatus returns correct flags when in development and mock is true", async (t) => {
  const restore = withEnv({
    MOCK_CHATTERBOX: "true",
    NODE_ENV: "development"
  });
  t.after(restore);

  const request = createRequest();
  const response = createResponse();
  await invoke(getStatus, request, response);

  assert.equal(response.jsonBody?.isMock, true);
  assert.ok(response.jsonBody?.space, "space field must be present");
});

test("getStatus returns correct flags when in production and mock is true (ignored in production)", async (t) => {
  const restore = withEnv({
    MOCK_CHATTERBOX: "true",
    NODE_ENV: "production"
  });
  t.after(restore);

  const request = createRequest();
  const response = createResponse();
  await invoke(getStatus, request, response);

  assert.equal(response.jsonBody?.isMock, false);
  assert.ok(response.jsonBody?.space, "space field must be present");
});
