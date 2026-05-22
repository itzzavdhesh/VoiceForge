<!-- Documents the VoiceForge local development workflow, browser constraints, and MVP roadmap. -->
# VoiceForge

VoiceForge is a browser-based assistive video tool that lets a user type during calls and output cloned speech with a lip-synced face preview.

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

5. Add your ElevenLabs API key to `.env`.
6. Start the client and server together:

```bash
npm run dev
```

7. Open `http://localhost:5173` in Chrome or Edge.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | Yes | Server-side API key used for voice cloning and TTS requests. |
| `PORT` | No | Express API port. Defaults to `3001`. |
| `CLIENT_URL` | No | Allowed CORS origin for the Vite app. Defaults to `http://localhost:5173`. |

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
| `POST` | `/api/voice/speak` | Send text and `voice_id`, then return an audio blob. |
| `GET` | `/api/health` | Return local API health. |

## Screenshots

Screenshot placeholder: Onboarding recording step.

Screenshot placeholder: Call control room.

Screenshot placeholder: Settings and voice profiles.

## Roadmap

- TODO: Replace the placeholder `models/wav2lip.onnx` with a real lightweight browser Wav2Lip ONNX model.
- TODO: Implement real ONNX Runtime Web Wav2Lip inference.
- TODO: Replace the fallback mouth animation with model-driven mouth movement.
- TODO: Add full WebRTC Insertable Streams frame replacement rather than the MVP canvas capture stream.
- TODO: Add richer virtual camera documentation for OBS and each call provider.
- TODO: Add IndexedDB voice profile storage.
- TODO: Add multilingual voice controls.
- TODO: Add streaming TTS for lower latency.
- TODO: Add automated browser tests for camera and microphone permission flows.

## License

MIT
