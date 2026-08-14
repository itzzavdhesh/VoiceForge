// Dismissible banner warning users on unsupported browsers.
import React from "react";
import { X } from "lucide-react";

function isSupportedBrowser() {
  const ua = navigator.userAgent;
  const isEdge = ua.includes("Edg/");
  const isChrome = ua.includes("Chrome/") && !isEdge;
  return isEdge || isChrome;
}

export default function BrowserWarningBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const dismissed = sessionStorage.getItem("browserWarningDismissed");
    if (!isSupportedBrowser() && !dismissed) {
      setVisible(true);
    }
  }, []);

  function handleDismiss() {
    sessionStorage.setItem("browserWarningDismissed", "true");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="flex w-full items-center justify-between gap-4 border-b border-ink/15 bg-amber-50 px-4 py-2 text-sm text-ink dark:border-border dark:bg-amber-950/40 dark:text-neutral-200"
    >
      <span>
        You're using an unsupported browser. For full functionality
        (webcam capture, virtual camera, TTS), please use{" "}
        <strong>Chrome</strong> or <strong>Edge</strong>.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss browser warning"
        title="Dismiss"
        className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-ink/70 transition hover:bg-ink/10 hover:text-ink dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-neutral-100"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
