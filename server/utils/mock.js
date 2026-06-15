// Centralized mock-mode flag used by voiceController and tests.
// Returns true only in non-production environments when MOCK_ELEVENLABS=true.
export function getIsMock() {
  return (
    process.env.MOCK_ELEVENLABS === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
