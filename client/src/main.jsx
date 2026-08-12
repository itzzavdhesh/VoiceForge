// Mounts the VoiceForge React application into the browser DOM with error fallback.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./components/ThemeContext.jsx";
import "./styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("VoiceForge Runtime Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "30px", fontFamily: "sans-serif", maxWidth: "800px", margin: "40px auto", background: "#fff0f0", border: "2px solid #ff4d4f", borderRadius: "8px", color: "#16201d" }}>
          <h2 style={{ color: "#d9363e", marginTop: 0 }}>VoiceForge Startup Error</h2>
          <p>An unexpected error occurred while rendering the application:</p>
          <pre style={{ background: "#222", color: "#fff", padding: "15px", borderRadius: "5px", overflowX: "auto", fontSize: "13px" }}>
            {import.meta.env.DEV
              ? (this.state.error?.stack || this.state.error?.toString())
              : "An unexpected error occurred. Please reload the application or contact support."}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "15px", padding: "10px 20px", background: "#d9363e", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
