# AGENTS.md — VoiceForge

## Project Structure

Monorepo with npm workspaces. Two packages:

- `client/` — React 18 + Vite + Tailwind CSS app (port 5173)
- `server/` — Express 5 API (port 3001)

## Dev Commands

```bash
# Install all deps (run from repo root)
npm install

# Run both client + server
npm run dev

# Run client only
npm run dev:client

# Run server only
npm run dev:server

# Build client production bundle
npm run build
```

## Testing

Three test layers:

```bash
# Server unit tests (Node built-in test runner, no deps needed)
npm run test --workspace server

# Client unit tests (Vitest, run from repo root)
npx --prefix client vitest run --config client/vitest.config.js

# E2E tests (Playwright, starts dev server automatically)
npx playwright test
```

- Playwright tests live in `tests/` at repo root.
- Client Vitest tests live alongside components in `client/src/`.
- Server tests live in `server/test/`.
- Client Vitest uses `vmForks` pool and `environment: "node"`.

## Environment

Copy `.env.example` to `.env`. Defaults to **mock mode** (`MOCK_CHATTERBOX=true`) — no API key or internet needed. See README for full env var reference.

**Critical:** `MOCK_CHATTERBOX=true` is ignored when `NODE_ENV=production`. The server prints a yellow warning at startup whenever mock mode is active.

## Architecture Notes

- Voice engine uses `@gradio/client` to connect to Hugging Face Spaces (Chatterbox Multilingual TTS).
- Client proxies `/api` requests to the Express server (configured in `client/vite.config.js`).
- Server loads `.env` from repo root via `dotenv.config({ path: "../.env" })` — not relative to `server/`.
- Client stores voice profiles in IndexedDB (`client/src/utils/db.js`).
- Browser target: Chrome and Edge only (WebRTC Insertable Streams, canvas capture).
- `models/wav2lip.onnx` is a placeholder — ONNX inference is not yet implemented.

## Code Conventions

- Top-of-file comments on every source file explaining what it does.
- Use `// TODO: [description]` for incomplete work.
- Prefer browser-native APIs before adding dependencies.
- Tailwind utility classes consistently.
- Accessibility matters: labels, keyboard paths, semantic buttons, readable contrast.
- Never commit `.env`, build output, or `node_modules`.

## PR / Issue Workflow

This repo is part of GSSoC/SSOC/NSOC/ELUSOC programs. PRs and issues must use the matching program templates. PRs are validated against the linked closing issue and author assignment. Sign-offs encouraged (`git commit --signoff`).

## Key Files

- `server/index.js` — Express entry point
- `server/routes/voice.js` — All voice API routes
- `client/src/App.jsx` — React app entry
- `client/src/pages/` — Page components (Onboarding, Call, Settings, About, etc.)
- `client/src/components/` — UI components
- `playwright.config.js` — E2E config (Chromium only, auto-starts dev server)
