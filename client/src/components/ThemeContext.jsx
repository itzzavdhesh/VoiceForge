import React from "react";

const ThemeContext = React.createContext(null);
const DEFAULT_THEME = "light";

function getStoredTheme() {
  try {
    const saved = localStorage.getItem("voiceforge:theme");
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
  return null; // Return null if no explicit user preference is saved
}

function getSystemTheme() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function getStoredHighContrast() {
  try {
    return localStorage.getItem("voiceforge:highContrast") === "true";
  } catch {
    return false;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem("voiceforge:theme", theme);
  } catch {
    // Theme still works for the current session when persistence is unavailable.
  }
}

function storeHighContrast(enabled) {
  try {
    localStorage.setItem("voiceforge:highContrast", String(enabled));
  } catch {
    // Storage unavailable
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(getStoredTheme);
  const [isHighContrast, setIsHighContrast] = React.useState(getStoredHighContrast);

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  React.useEffect(() => {
    const root = document.documentElement;
    if (isHighContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    storeHighContrast(isHighContrast);
  }, [isHighContrast]);

  function toggleTheme() {
    setTheme((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("voiceforge:theme", nextTheme);
      } catch {
        // Storage can be unavailable
      }
      return nextTheme;
    });
  }

  function toggleHighContrast() {
    setIsHighContrast((prev) => !prev);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isHighContrast, toggleHighContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}




