// Manages live caption state and timing for the video overlay
import { useState, useCallback, useRef } from "react";

/** Maximum number of characters retained in captionText to prevent memory growth. */
const MAX_CAPTION_CHARS = 500;

export default function useCaption() {
  const [captionText, setCaptionText] = useState("");
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      return localStorage.getItem("voiceforge:captionEnabled") !== "false";
    } catch {
      return true;
    }
  });
  const [position, setPosition] = useState(() => {
    try {
      return localStorage.getItem("voiceforge:captionPosition") || "bottom";
    } catch {
      return "bottom";
    }
  });
  const [fontSize, setFontSize] = useState(() => {
    try {
      return localStorage.getItem("voiceforge:captionFontSize") || "medium";
    } catch {
      return "medium";
    }
  });
  const fadeTimerRef = useRef(null);

  const updateCaption = useCallback((text) => {
    setCaptionText((prev) => {
      const combined = prev ? `${prev} ${text}` : text;
      // Trim from the front if accumulated text exceeds the max length
      return combined.length > MAX_CAPTION_CHARS
        ? combined.slice(combined.length - MAX_CAPTION_CHARS)
        : combined;
    });
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  }, []);

  const clearCaption = useCallback(() => {
    fadeTimerRef.current = setTimeout(() => {
      setCaptionText("");
    }, 2000);
  }, []);

  const toggleEnabled = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("voiceforge:captionEnabled", String(next));
      } catch {}
      return next;
    });
  }, []);

  const updatePosition = useCallback((pos) => {
    setPosition(pos);
    try {
      localStorage.setItem("voiceforge:captionPosition", pos);
    } catch {}
  }, []);

  const updateFontSize = useCallback((size) => {
    setFontSize(size);
    try {
      localStorage.setItem("voiceforge:captionFontSize", size);
    } catch {}
  }, []);

  return {
    captionText,
    isEnabled,
    position,
    fontSize,
    updateCaption,
    clearCaption,
    toggleEnabled,
    updatePosition,
    updateFontSize,
  };
}