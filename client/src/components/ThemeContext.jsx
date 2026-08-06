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

export function ThemeProvider({ children }) {
  const [theme, setTheme] = React.useState(() => getStoredTheme() || getSystemTheme());

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      // Only dynamically sync with OS if user hasn't explicitly overridden the theme
      if (!getStoredTheme()) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

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

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}




