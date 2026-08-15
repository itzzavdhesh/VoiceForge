// Mounts the VoiceForge React application into the browser DOM.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./components/ThemeContext.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { installAudioUnlock } from "./utils/audioUnlock.js";
import "./styles.css";

// Safari and iOS keep the AudioContext suspended until a gesture resumes it.
// Arming the unlock before the first render means the user's very first tap
// enables audio, so speech triggered later by a timer or a network event is
// still audible instead of silently blocked.
installAudioUnlock();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
