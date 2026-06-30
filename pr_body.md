## 🚀 Program
GSSoC

## 📝 Description
This PR significantly reduces TTS request latency by caching the Hugging Face `@gradio/client` instance instead of re-instantiating it on every single speech request. 

Connecting to a Gradio space involves fetching metadata, discovering API endpoints, and establishing a WebSocket connection. By caching the client at the module level in `voiceController.js`, we skip this massive overhead on subsequent requests.

Key changes:
- Created module-level cache variables `cachedGradioClient` and `currentSpaceIdentifier`.
- Modified `generateClonedVoice()` to initialize the client only on the first request, or if the `VOICE_ENGINE_SPACE` changes.
- Added a `try/catch` block around the `app.predict` call to immediately clear the cached instance if the WebSocket connection drops or expires, ensuring the next request forces a fresh reconnection.

## 🔗 Related Issue
Closes #440

## 🔄 Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 🔍 SEO improvement
- [ ] 🎨 Style / UI improvement
- [ ] ♿ Accessibility improvement
- [ ] 📝 Documentation
- [ ] ⚙️ CI / configuration
- [x] 🧹 Refactor / cleanup
- [x] ⚡ Performance Optimization

## 🧪 How to Test
1. Start the VoiceForge backend server.
2. Trigger a voice cloning request to the `/api/voice/speak` endpoint via the web UI.
3. Note the response time of the *first* request (it will include the Gradio client initialization overhead).
4. Trigger a *second* request. It should respond significantly faster because it reuses the cached client.
5. You can artificially disrupt your network connection mid-request to verify the cache clears and automatically recovers on the next successful call.

## 📸 Screenshots (if applicable)
N/A

## ✅ Checklist
- [x] I am contributing under GSSoC, NSOC, SSOC, or ELUSOC
- [x] My code follows the project's existing style
- [x] I have tested my changes locally
- [x] I have linked the related issue above
- [x] My PR title follows Conventional Commits format (e.g. `perf: cache gradio client instance to reduce latency`)
