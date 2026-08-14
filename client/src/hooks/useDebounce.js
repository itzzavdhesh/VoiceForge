import { useState, useEffect, useRef, useCallback } from "react";

export const DEFAULT_DEBOUNCE_MS = 400;

export default function useDebounce(value, delay = DEFAULT_DEBOUNCE_MS) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    cancel();
    setDebouncedValue(value);
  }, [value, cancel]);

  useEffect(() => {
    if (typeof value === "string" && value.trim() === "") {
      setDebouncedValue(value);
      return undefined;
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      cancel();
    };
  }, [value, delay, cancel]);

  return debouncedValue;
}
