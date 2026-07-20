# Development Workflow & Local-First Architecture

VoiceForge uses a modern **local-first** approach for development, meaning you can run and test the entire application without needing external internet access, API keys, or paid services. This is achieved via a comprehensive mock layer.

## Local-First Architecture

During development, when `MOCK_CHATTERBOX=true` is set in your `.env` file, the application bypasses real Hugging Face inference calls:
- **Voice Cloning (`POST /api/voice/clone`)**: Returns a fixture `voice_id` instantly instead of running the actual cloning model.
- **Speech Synthesis (`GET /api/voice/speak/stream`)**: Streams a predefined short, silent MP3 instead of generating real audio.

This enables you to exercise the complete UI flow:
`Record -> Clone -> Type Text -> Speak -> Download Audio` 
entirely offline. It is fast, cost-free, and ensures you aren't rate-limited while iterating on the frontend.

## Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/itzzavdhesh/voiceforge.git
   cd voiceforge
   ```

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # After copying, open .env and uncomment the MOCK_CHATTERBOX=true line for local testing
   ```

3. **Running Locally (Node.js)**:
   ```bash
   npm install
   npm run dev
   ```
   The client will run on port `5173` and the server on `3001`.

4. **Running Locally (Docker)**:
   *(Note: Docker support requires PR #752. Once merged, you can use the following command)*
   You can also run the application using Docker for a fully isolated environment:
   ```bash
   docker-compose up --build
   ```

## Workspaces (Monorepo)
- **`client/`**: React application built with Vite and TailwindCSS.
- **`server/`**: Express server handling API routing, mock responses, and integrations with Hugging Face (when mock is disabled).
