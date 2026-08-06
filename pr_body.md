## Description
This PR implements a robust auto-recloning recovery flow for VoiceForge cloned voice profiles when the backend session expires, cache limits are reached, or the server restarts.

## Key Changes
- **Client-Provided `voice_id` Support**: Modified the backend `/api/voice/clone` route to accept an optional client-supplied `voice_id`. This allows the client to re-register the voice with the exact same ID so that active voice settings and references remain intact.
- **Check Voice Existence in Speak**: Modified `/api/voice/speak` to validate that the voice profile is loaded in `voiceStore` cache (returning a `404` status with a structured error when not in mock mode).
- **Test Suite Updates**: Seeded the `voiceStore` cache with a mock entry for `voice_1` inside `voiceController.secure-id.test.js` to ensure the automated security tests continue to pass correctly.
- **Auto-Recovery in Hook**: Added `404` interception inside `useTTS.js`. When a 404 is caught and the error mentions "Voice profile not found", the hook:
  1. Retrieves the voice profile record (including reference `audioBlob` and name) from IndexedDB.
  2. Silently triggers `/api/voice/clone` with the retrieved audio blob and original `voice_id`.
  3. Transparently retries the `/api/voice/speak` request.

## Testing
- Verified all server-side tests pass: `npm run test --workspace server`
- Verified production build builds cleanly: `npm run build`
