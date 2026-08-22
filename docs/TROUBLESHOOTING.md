# Troubleshooting & FAQ

Common setup and runtime issues for VoiceForge, plus answers to frequent questions.
If something here is out of date, please open an issue.

## Installation & Setup

### `npm install` fails or hangs
- Confirm you are on **Node.js 18+** and **npm 9+** (`node -v`, `npm -v`). Older versions cannot resolve the workspaces.
- A flaky registry mirror can cause hangs. Retry on a stable connection, or run `npm ci` once `package-lock.json` is present.
- If you see peer-dependency conflicts, remove `node_modules` and reinstall:
  ```bash
  rm -rf node_modules
  npm install
  ```

### Port already in use
- The server defaults to `3001` and the client to `5173`. If either is taken, set `PORT` in `.env` for the server, or pass `--port` to Vite. Free a port with (replace `5173`):
  ```bash
  lsof -i :5173   # macOS/Linux
  ```

### `.env` is missing
- Copy the example file before first run: `cp .env.example .env`. The defaults run in **offline mock mode**, so no API key or internet access is needed to start.

## Runtime

### Virtual camera does not appear / video preview is blank
- Use **Chrome or Edge**. Firefox and Safari are not supported for the virtual camera MVP because WebRTC Insertable Streams and canvas capture APIs are uneven there.
- Grant camera/microphone permission when prompted, and close other apps that may hold the camera (e.g. Zoom, Meet).
- Hard refresh after enabling the virtual camera so the canvas capture stream re-initializes.

### Requests from the frontend are rejected with a CORS error
- `CLIENT_URL` must exactly match the origin the frontend is served from. In production, set it to your deployed frontend URL (e.g. `https://voice-forge-client.vercel.app`). Requests from any other origin are rejected by design. Defaults to `http://localhost:5173`.

### "Mock mode active" banner / no real speech
- This means `MOCK_CHATTERBOX` (or `MOCK_ELEVENLABS`) is enabled. The server stubs voice clone and TTS calls and returns fixtures. Set it to `false` and provide a valid `ELEVENLABS_API_KEY` (and internet access to the Hugging Face Chatterbox Space) for live mode.

### TTS / voice cloning silently stalls
- Live mode needs an internet connection to the public Hugging Face Space ([ResembleAI/Chatterbox-Multilingual-TTS](https://huggingface.co/spaces/ResembleAI/Chatterbox-Multilingual-TTS)). If the Space is restarting or rate-limited, wait and retry. Confirm `ELEVENLABS_API_KEY` is set and not empty.

## Environment Variables

| Symptom | Likely cause |
| --- | --- |
| Server exits on start in production | `STREAM_SECRET` is not set in production (tokens are invalidated on restart). Set it in your environment. |
| All speech rejected | Chatterbox is disabled or cannot reach Hugging Face. Set `MOCK_CHATTERBOX=false`, verify Hugging Face connectivity, and provide the required `owner_token` for cloned voices. |
| Frontend cannot reach API | `CLIENT_URL` mismatch (see CORS above) or wrong `PORT`. |

See the README's [Environment Variables](../README.md#environment-variables) section for the full reference.

## FAQ

**Is an API key required?**
Only for live mode. The defaults run in offline mock mode with no key and no internet access.

**Which browsers are supported?**
Chrome and Edge only, for the virtual camera feature. See [Browser Compatibility](../README.md#browser-compatibility).

**How do I run client and server separately?**
`npm run dev:client` and `npm run dev:server`, or `npm run dev` for both together.
