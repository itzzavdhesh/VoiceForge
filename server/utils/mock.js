// Centralized mock-mode flag used by voiceController and tests.
// Returns true only in non-production environments when MOCK_CHATTERBOX=true
// (or when the variable is unset, matching the README claim that defaults
// run in offline mock mode).
export function getIsMock() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.MOCK_CHATTERBOX !== "false"
  );
}
