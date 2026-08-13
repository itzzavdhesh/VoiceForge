import test from "node:test";
import assert from "node:assert/strict";
import { validateEnv, envSchema } from "../config/env.js";

test("env validation - parses default environment variables cleanly", () => {
  const result = validateEnv({});
  assert.equal(result.PORT, 3001);
  assert.equal(result.CLIENT_URL, "http://localhost:5173");
  assert.equal(result.NODE_ENV, "development");
  assert.equal(result.VOICE_ENGINE_SPACE, "ResembleAI/Chatterbox-Multilingual-TTS");
  assert.equal(result.VOICE_STORE_MAX, 20);
});

test("env validation - coerces and parses valid custom environment variables", () => {
  const custom = {
    PORT: "8080",
    CLIENT_URL: "https://voiceforge.example.com",
    NODE_ENV: "production",
    MOCK_CHATTERBOX: "true",
    VOICE_STORE_MAX: "50",
    MAX_VOICE_UPLOAD_BYTES: "20971520",
  };
  const result = validateEnv(custom);
  assert.equal(result.PORT, 8080);
  assert.equal(result.CLIENT_URL, "https://voiceforge.example.com");
  assert.equal(result.NODE_ENV, "production");
  assert.equal(result.MOCK_CHATTERBOX, true);
  assert.equal(result.VOICE_STORE_MAX, 50);
  assert.equal(result.MAX_VOICE_UPLOAD_BYTES, 20971520);
});

test("env validation - fails fast when PORT is invalid or out of range", () => {
  assert.throws(
    () => validateEnv({ PORT: "99999" }),
    /Environment variable validation failed/
  );
  assert.throws(
    () => validateEnv({ PORT: "-5" }),
    /Environment variable validation failed/
  );
  assert.throws(
    () => validateEnv({ PORT: "not-a-port" }),
    /Environment variable validation failed/
  );
});

test("env validation - fails fast when CLIENT_URL is not a valid URL", () => {
  assert.throws(
    () => validateEnv({ CLIENT_URL: "invalid-url-string" }),
    /Environment variable validation failed/
  );
});

test("env validation - fails fast when NODE_ENV is an invalid environment", () => {
  assert.throws(
    () => validateEnv({ NODE_ENV: "staging-invalid" }),
    /Environment variable validation failed/
  );
});
