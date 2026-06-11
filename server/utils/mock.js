/**
 * Mock-mode helper for the VoiceForge server.
 *
 * getIsMock() returns true only when ALL of the following are true:
 *   1. process.env.MOCK_ELEVENLABS is set to exactly "true"
 *   2. process.env.NODE_ENV is not "production"
 *
 * The check is performed at *call time* (not at import time) so that tests
 * can toggle the env vars between test cases without re-importing the module.
 *
 * Production safety: mock mode is intentionally disabled in production to
 * prevent accidentally shipping a server that returns fixture responses.
 */
export function getIsMock() {
  return (
    process.env.MOCK_ELEVENLABS === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
