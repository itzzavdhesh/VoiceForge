// Mounts the VoiceForge React application into the browser DOM.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./components/ThemeContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { unlockAudioContext } from "./utils/audioUnlock.js";
import "./styles.css";

// Prime the Web Audio session on the user's first gesture so programmatic TTS
// playback is not silently blocked by Safari/iOS WebKit autoplay policy (#1171).
unlockAudioContext();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
