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

4. Copy `.env.example` to `.env`. No API key is required — see [Testing Locally](#testing-locally) for setup options.
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

## Testing Locally

VoiceForge is **100% free** to run — no paid subscription or API key is required.
The voice engine is [ResembleAI/Chatterbox-Multilingual-TTS](https://huggingface.co/spaces/ResembleAI/Chatterbox-Multilingual-TTS),
a public Hugging Face Space.

### Unit tests — always offline

The server test suite stubs all Chatterbox/Gradio network calls. No credentials needed.

```bash
npm run test --workspace server
```

### End-to-end mock mode — full UI flow, no internet required

Add this line to your `.env` before starting the dev server:

```bash
MOCK_CHATTERBOX=true
```

With this flag active the server behaves as follows:

| Endpoint | Live mode | Mock mode |
|---|---|---|
| `POST /api/voice/clone` | Stores reference audio, returns `voice_id` | Returns fixture `voice_id` instantly |
| `POST /api/voice/speak` | Enqueues real Chatterbox TTS stream | Enqueues mock stream |
| `GET /api/voice/speak/stream` | Proxies audio from Hugging Face | Streams a short silent MP3 locally |

You can exercise the **complete UI flow** — record → clone → type text → Speak
→ download — entirely offline.

> **Safety:** `MOCK_CHATTERBOX=true` has no effect when `NODE_ENV=production`.
> The server logs a yellow warning at startup so mock mode is always visible.

### When your PR needs a live Chatterbox response

Some changes (audio decoding, lip-sync timing, voice-quality tuning) genuinely
require a real synthesis response. If that applies to your PR, note it in the
PR description:

```markdown
## Testing Notes
Tested clone and TTS end-to-end using MOCK_CHATTERBOX=true.
Live Chatterbox path verified locally with MOCK_CHATTERBOX=false.
UI logic confirmed with mock blob in CI.
```


## Program Contributions

VoiceForge accepts contributions through GSSoC, NSOC, SSOC, and ELUSOC. Program contributors must use the matching issue and pull request templates.

- Open bugs with the bug report template for your program.
- Open feature ideas with the feature request template for your program.
- Open pull requests with the PR template for your program.
- Link every pull request to an issue with `Closes #issue-number`.
- Open a pull request only for an issue that is assigned to you.
- Use a clear PR title, for example `feat: add voice preview`, `fix: handle empty recording`, or `[feature]: add voice preview`.
- Sign-offs are encouraged with `git commit --signoff`. Missing sign-offs receive a friendly reminder, not an automatic block.

Issues and pull requests that use the required template receive the matching program label and enter maintainer review. Maintainers assign issues after confirming scope and readiness.

Issues or pull requests that skip the required template will receive a `needs-template` label and an automated comment asking for updates before review. Issues that need more detail may also receive `needs-quality`.

Pull requests are validated only when the PR author matches the assignee on the linked closing issue. Valid pull requests receive the program label, `pr-validated`, and other helpful review labels. Pull requests with a missing template, missing closing issue, wrong issue assignment, or invalid title receive the matching `needs-*` labels instead.

After a pull request is merged, automation marks the PR with `merged`, `pr-merged`, and `completed`. Linked closing issues receive `completed`, `issue-completed`, and `closed-by-pr`.

Maintainers use decision labels after reviewing issues. `go ahead` means the issue is valid for assigned work, adds `ready to work` when an assignee exists, and removes `needs maintainer review`. `stale-assignment` clears the current assignee and reopens the assignment queue. `duplicate`, `not needed`, and `out of scope` close the issue automatically with a maintainer decision comment.

Maintainers can mark issue priority with `priority: low`, `priority: medium`, or `priority: high`, and expected difficulty with `level: easy`, `level: medium`, or `level: hard`. These labels appear in the go-ahead guidance so contributors understand urgency and complexity before starting.

To close an issue as a duplicate with a specific reference, maintainers can comment `/duplicate #issue-number`. The bot verifies the target issue, posts a duplicate message, labels the issue, and closes it.

Maintainers can use `invalid-pr` to close a pull request after the validator has already explained what is wrong. Passing PRs receive `ready for review`; reviews that request changes receive `needs revision`.

To request assignment on an open issue, comment with one of these commands:

```text
-assign
/assign
```

Polite assignment requests such as "please assign this issue to me" or "I would like to work on this" are also accepted, but the short commands are preferred.

## Good First Issues


## Pull Request Checklist

- The app runs with `npm install && npm run dev`.
- New stubs have clear TODO comments.
- User-facing changes are reflected in the README when needed.
- The change is scoped to one concern.
- The correct program template is used.
- The PR links its related issue.
