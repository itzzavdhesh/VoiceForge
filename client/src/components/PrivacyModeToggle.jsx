// Provides a Privacy Mode toggle and static avatar upload for camera-free lip-sync.
import React from "react";
import { ShieldCheck, ImagePlus, Trash2, Upload } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const STORAGE_KEY_MODE = "voiceforge:privacyMode";
const STORAGE_KEY_AVATAR = "voiceforge:privacyAvatar";

function loadPersistedMode() {
  try {
    return localStorage.getItem(STORAGE_KEY_MODE) === "true";
  } catch {
    return false;
  }
}

function loadPersistedAvatar() {
  try {
    return localStorage.getItem(STORAGE_KEY_AVATAR) || null;
  } catch {
    return null;
  }
}

function persistMode(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY_MODE, String(enabled));
  } catch {
    // Storage unavailable — mode still works for the session.
  }
}

function persistAvatar(dataUrl) {
  try {
    if (dataUrl) {
      localStorage.setItem(STORAGE_KEY_AVATAR, dataUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_AVATAR);
    }
  } catch {
    // Storage full or unavailable — avatar works for the session only.
  }
}

/**
 * Loads an HTMLImageElement from a data URL, resolving once the image is ready.
 */
function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export default function PrivacyModeToggle({ onModeChange, onAvatarChange, showToast }) {
  const [enabled, setEnabled] = React.useState(loadPersistedMode);
  const [avatarUrl, setAvatarUrl] = React.useState(loadPersistedAvatar);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // Hydrate the avatar HTMLImageElement on mount if we have a persisted URL
  React.useEffect(() => {
    if (avatarUrl) {
      loadImage(avatarUrl)
        .then((img) => onAvatarChange?.(img))
        .catch(() => {
          // Corrupt stored image — clear it
          setAvatarUrl(null);
          persistAvatar(null);
          onAvatarChange?.(null);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when the toggle changes
  React.useEffect(() => {
    onModeChange?.(enabled);
  }, [enabled, onModeChange]);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    persistMode(next);
    if (!next) {
      // Turning off privacy mode — clear the avatar
      setAvatarUrl(null);
      persistAvatar(null);
      onAvatarChange?.(null);
    }
  }

  function processFile(file) {
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast?.("Please upload a PNG, JPEG, or WebP image", "error");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showToast?.("Image must be under 2 MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      try {
        const img = await loadImage(dataUrl);
        setAvatarUrl(dataUrl);
        persistAvatar(dataUrl);
        onAvatarChange?.(img);
        showToast?.("Avatar uploaded", "success");
      } catch {
        showToast?.("Failed to load image", "error");
      }
    };
    reader.onerror = () => showToast?.("Failed to read file", "error");
    reader.readAsDataURL(file);
  }

  function handleFileChange(e) {
    processFile(e.target.files?.[0]);
    // Reset so re-uploading the same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null);
    persistAvatar(null);
    onAvatarChange?.(null);
    showToast?.("Avatar removed", "info");
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  return (
    <section
      id="privacy-mode-section"
      className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk"
    >
      {/* Header row: label + toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-md p-2 transition-colors ${
              enabled
                ? "bg-moss text-white dark:bg-glow dark:text-black"
                : "bg-mint text-ink dark:bg-glow/15 dark:text-glow"
            }`}
          >
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-bold">Privacy Mode</h2>
            <p className="text-sm text-ink/65 dark:text-muted">
              {enabled
                ? "Camera disabled — using your avatar image"
                : "Use a static image instead of your webcam"}
            </p>
          </div>
        </div>

        <button
          id="privacy-mode-toggle"
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? "Disable privacy mode" : "Enable privacy mode"}
          onClick={handleToggle}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2 dark:focus-visible:ring-glow dark:focus-visible:ring-offset-black ${
            enabled ? "bg-moss dark:bg-glow" : "bg-ink/20 dark:bg-neutral-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Upload area — visible only when privacy mode is ON */}
      {enabled && (
        <div className="mt-4 border-t border-ink/10 pt-4 dark:border-border">
          {!avatarUrl ? (
            /* Drop zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`privacy-drop-zone flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${
                isDragOver
                  ? "border-moss bg-mint/40 dark:border-glow dark:bg-glow/10"
                  : "border-ink/20 bg-cloud hover:border-moss hover:bg-mint/20 dark:border-border dark:bg-black dark:hover:border-glow dark:hover:bg-glow/5"
              }`}
              role="button"
              tabIndex={0}
              aria-label="Upload avatar image"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div
                className={`rounded-full p-3 transition-colors ${
                  isDragOver
                    ? "bg-moss/20 text-moss dark:bg-glow/20 dark:text-glow"
                    : "bg-ink/5 text-ink/50 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {isDragOver ? (
                  <Upload size={28} aria-hidden="true" />
                ) : (
                  <ImagePlus size={28} aria-hidden="true" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink dark:text-neutral-200">
                  {isDragOver ? "Drop your image here" : "Drag & drop or click to upload"}
                </p>
                <p className="mt-1 text-xs text-ink/50 dark:text-muted">
                  PNG, JPEG, or WebP · Max 2 MB
                </p>
              </div>
            </div>
          ) : (
            /* Avatar preview */
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink/10 shadow-sm dark:border-border">
                <img
                  src={avatarUrl}
                  alt="Uploaded avatar preview"
                  className="h-full w-full object-cover"
                />
                {/* Green dot badge */}
                <span className="absolute right-1 top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-60 dark:bg-glow" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-moss dark:bg-glow" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink dark:text-neutral-200">
                  Avatar active
                </p>
                <p className="mt-0.5 text-xs text-ink/50 dark:text-muted">
                  This image will be used in your lip-sync preview
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-moss hover:text-moss dark:border-border dark:text-neutral-300 dark:hover:border-glow dark:hover:text-glow"
                  >
                    <ImagePlus size={13} aria-hidden="true" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1.5 rounded-md border border-coral/30 px-3 py-1.5 text-xs font-semibold text-coral transition hover:bg-coral hover:text-white"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden="true"
          />
        </div>
      )}
    </section>
  );
}
