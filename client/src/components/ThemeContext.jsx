// Provides dark/light theme state and toggle function to the entire VoiceForge app.
import React from "react";

const ThemeContext = React.createContext(null);

export function ThemeProvider({ children }) {
  // Initialise from localStorage, then fall back to the OS preference
  const [theme, setTheme] = React.useState(() => {
    const saved = localStorage.getItem("voiceforge:theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Apply / remove the "dark" class on <html> whenever theme changes
  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("voiceforge:theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Convenience hook — use this in any component
export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
