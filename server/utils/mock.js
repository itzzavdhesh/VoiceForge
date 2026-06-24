// Centralized mock-mode flag used by voiceController and tests.
// Returns true only in non-production environments when MOCK_CHATTERBOX=true.
export function getIsMock() {
  return (
    process.env.MOCK_CHATTERBOX === "true" &&
    process.env.NODE_ENV !== "production"
  );
}
