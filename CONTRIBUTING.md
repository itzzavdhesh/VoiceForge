<!-- Explains how contributors can run VoiceForge locally and pick scoped starter issues. -->
# Contributing To VoiceForge

Thanks for helping build an assistive open source tool with care. Please keep consent, privacy, and accessibility at the center of every contribution.

## Fork And Run Locally

1. Fork the repository.
2. Clone your fork.
3. Install dependencies from the repository root:

```bash
npm install
```

4. Copy `.env.example` to `.env` and add your ElevenLabs API key.
5. Start the local app:

```bash
npm run dev
```

6. Open `http://localhost:5173` in Chrome or Edge.

## Coding Conventions

- Keep components small and single-purpose.
- Add a short top-of-file comment explaining what each source file does.
- Mark incomplete work with `// TODO: [description of what needs to be done]`.
- Prefer browser-native APIs before adding dependencies.
- Use Tailwind utility classes consistently.
- Keep accessibility visible: labels, keyboard paths, semantic buttons, and readable contrast matter.
- Do not commit `.env`, generated build output, or `node_modules`.

## Good First Issues


## Pull Request Checklist

- The app runs with `npm install && npm run dev`.
- New stubs have clear TODO comments.
- User-facing changes are reflected in the README when needed.
- The change is scoped to one concern.
