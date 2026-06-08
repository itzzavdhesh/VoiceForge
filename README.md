<!-- Documents the VoiceForge local development workflow, browser constraints, and MVP roadmap. -->
# VoiceForge

VoiceForge is a browser-based assistive video tool that lets a user type during calls and output cloned speech with a lip-synced face preview.

---

## 📑 Table of Contents

- [Why This Exists](#why-this-exists)
- [Tech Stack](#tech-stack)
- [Browser Compatibility](#browser-compatibility)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Using VoiceForge In A Call](#using-voiceforge-in-a-call)
- [OBS Virtual Camera Setup](#obs-virtual-camera-setup)
- [API](#api)
- [Roadmap](#roadmap)
- [License](#license)
- [About](#about)

---

## Why This Exists

Deaf and speech-impaired people on video calls are often pushed into chat boxes, delayed interpretation, or awkward turn-taking. VoiceForge explores a local-first interface where typed intent can become spoken audio and a synchronized visual feed, helping the user participate in the same conversational channel as everyone else.

## Tech Stack

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=fff)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwindcss&logoColor=fff)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=fff)
![ElevenLabs](https://img.shields.io/badge/ElevenLabs-TTS-black)
![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-Web-005CED)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Browser Compatibility

VoiceForge targets Chrome and Edge only. WebRTC Insertable Streams and canvas capture APIs are still uneven across browsers, so Firefox and Safari are not supported for the virtual camera MVP.

## Setup

1. Install Node.js 18 or newer.
2. Create an ElevenLabs account at [elevenlabs.io](https://elevenlabs.io/) and copy your API key.
3. From the repository root, install dependencies:

```bash
npm install
```

4. Copy the example environment file:

```bash
cp .env.example .env
```

5. Add your ElevenLabs API key to `.env`, **or** skip it and set `MOCK_ELEVENLABS=true` to run in offline dev mode (see [Contributing](CONTRIBUTING.md) for details).
6. Start the client and server together:

```bash
npm run dev
```

7. Open `http://localhost:5173` in Chrome or Edge.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | Yes (or use `MOCK_ELEVENLABS`) | Server-side API key used for voice cloning and TTS requests. |
| `PORT` | No | Express API port. Defaults to `3001`. |
| `CLIENT_URL` | No | Allowed CORS origin for the Vite app. Defaults to `http://localhost:5173`. |
| `MOCK_ELEVENLABS` | No | Set to `true` to skip real ElevenLabs calls in dev/CI. Returns fixture data. Ignored in production. |

## Using VoiceForge In A Call

1. Open VoiceForge in Chrome or Edge.
2. Record a 10-second consent-based reference clip.
3. Clone the voice and continue to the Call page.
4. Allow webcam access.
5. Type a phrase and press Enter or Speak.
6. Turn on Go Live to expose the canvas stream inside the browser.
7. In Zoom, Google Meet, or Microsoft Teams, open camera settings and select the virtual camera source you have configured.

## OBS Virtual Camera Setup

Most video call apps cannot directly select a browser tab as a system camera. For the MVP, install [OBS Studio](https://obsproject.com/) and use OBS Virtual Camera as the bridge.

1. Install OBS Studio.
2. Add a Browser Source pointing to `http://localhost:5173`.
3. Crop the source to the lip-synced output preview.
4. Click Start Virtual Camera in OBS.
5. Select OBS Virtual Camera in Zoom, Meet, or Teams.

Screenshot placeholder: OBS browser source configuration.

Screenshot placeholder: Zoom camera picker showing OBS Virtual Camera.

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/voice/clone` | Upload reference audio, call ElevenLabs voice cloning, and return `voice_id`. |
| `POST` | `/api/voice/speak` | Send text, `voice_id`, and optional voice settings, then return a `speechId` and streaming `audioUrl`. |
| `GET` | `/api/voice/speak/stream/:speechId` | Stream the generated ElevenLabs speech audio for a pending speech request. |
| `GET` | `/api/health` | Return local API health. |



## Roadmap

- Done: Store cloned voice profiles and reference audio Blobs in IndexedDB via `client/src/utils/db.js`.
- Done: Stream TTS audio through `POST /api/voice/speak` and `GET /api/voice/speak/stream/:speechId`.
- In progress: Voice tuning controls are wired through persisted `voice_settings`; multilingual output uses the ElevenLabs `eleven_multilingual_v2` model, but dedicated language controls still need UI.
- In progress: The MVP virtual camera uses canvas capture; full WebRTC Insertable Streams frame replacement remains future work.
- TODO: Replace the placeholder `models/wav2lip.onnx` with a real lightweight browser Wav2Lip ONNX model.
- TODO: Implement real ONNX Runtime Web Wav2Lip inference.
- TODO: Replace the fallback mouth animation with model-driven mouth movement.
- TODO: Add richer virtual camera documentation for OBS and each call provider.
- TODO: Add dedicated multilingual voice controls.
- TODO: Add automated browser tests for camera and microphone permission flows.

## License

MIT
