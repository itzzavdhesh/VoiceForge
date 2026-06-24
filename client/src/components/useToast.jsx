import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";

let nextId = 0;

export function useToast(duration = 2200) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const showToast = useCallback((message, type = "success") => {
    const id = ++nextId;
    setToasts((previous) => [...previous, { id, message, type }]);

    timers.current[id] = setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
      delete timers.current[id];
    }, duration);
  }, [duration]);

  return { toasts, showToast };
}

// FIX: Added default value for toasts prop to prevent undefined error
export function ToastContainer({ toasts = [] }) {
  // Guard clause to handle undefined or empty array
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
    >
      {toasts.map((toast) => {
        const Icon = toast.type === "error" ? AlertTriangle : toast.type === "info" ? Info : Check;
        return (
          <div
            key={toast.id}
            role="status"
            className={[
              "flex animate-fade-in-up items-center gap-2 rounded-full px-4 py-2 text-sm text-white shadow-lg",
              toast.type === "error"
                ? "bg-red-700"
                : toast.type === "info"
                  ? "bg-neutral-800 dark:bg-surface"
                  : "bg-emerald-700",
            ].join(" ")}
          >
            <Icon size={15} aria-hidden="true" />
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
