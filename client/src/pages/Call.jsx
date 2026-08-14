// Renders the main call workspace for webcam preview, typed speech, output video, and virtual camera controls.
import React from "react";
import { Camera, CircleAlert, Sliders, ChevronDown, RotateCcw, Clock, Pin, Play, MessageSquare, Trash2 } from "lucide-react";
import TextToSpeech from "../components/TextToSpeech.jsx";
import VideoPreview from "../components/VideoPreview.jsx";
import VirtualCamera from "../components/VirtualCamera.jsx";
import { LanguageSelector } from "../components/LanguageSelector.jsx";
import useTTS from "../hooks/useTTS.js";
import useVirtualCamera from "../hooks/useVirtualCamera.js";
import { getActiveVoiceProfile } from "../hooks/useVoiceClone.js";
import { useSpeechHistory } from "../hooks/useSpeechHistory.js";

const QUICK_REPLIES = [
  { label: "Hello", phrase: "Hello" },
  { label: "Thank you", phrase: "Thank you" },
  { label: "Please wait", phrase: "Please wait" },
  { label: "I need help", phrase: "I need help" },
  { label: "Can you repeat that?", phrase: "Can you repeat that?" },
  { label: "Yes, I understand", phrase: "Yes, I understand" },
  { label: "No, thank you", phrase: "No, thank you" },
];

export default function Call() {
  const [webcamStream, setWebcamStream] = React.useState(null);
  const [cameraError, setCameraError] = React.useState("");
  const { toasts, showToast } = useToast();

  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const canvasRef = React.useRef(null);
  const localVideoRef = React.useRef(null);

  const [activeProfile, setActiveProfile] = React.useState(null);
  const [language, setLanguage] = React.useState(loadLanguage);
  
  const [activeText, setActiveText] = React.useState("");
  const [subtitlesEnabled, setSubtitlesEnabled] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:subtitlesEnabled") !== "false";
    } catch { return true; }
  });
  const [subtitleFontSize, setSubtitleFontSize] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:subtitleFontSize") || "medium";
    } catch { return "medium"; }
  });
  const [subtitleBgOpacity, setSubtitleBgOpacity] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:subtitleBgOpacity") || "0.6";
    } catch { return "0.6"; }
  });

  const [subtitlesEnabled, setSubtitlesEnabled] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:subtitlesEnabled") === "true";
    } catch {
      return false;
    }
  });
  const [subtitleFontSize, setSubtitleFontSize] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:subtitleFontSize") || "medium";
    } catch {
      return "medium";
    }
  });
  const [subtitleBgOpacity, setSubtitleBgOpacity] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:subtitleBgOpacity") || "0.6";
    } catch {
      return "0.6";
    }
  });

  const [dbError, setDbError] = React.useState("");

  const { speak, status, error, audioUrl } = useTTS();
  const { speak, status, error, audioUrl, engine } = useTTS();
  const virtualCamera = useVirtualCamera(canvasRef);
  const [modelId, setModelId] = React.useState(() => {
    try {
      return localStorage.getItem("voiceforge:selectedModelId") || "eleven_multilingual_v2";
    } catch {
      return "eleven_multilingual_v2";
    }
  });

  const handleModelChange = (val) => {
    setModelId(val);
    try {
      localStorage.setItem("voiceforge:selectedModelId", val);
    } catch { /* storage unavailable */ }
  };

  const {
    history,
    favorites,
    addMessage,
    removeMessage,
    toggleFavorite,
  } = useSpeechHistory();
  const [activePanelTab, setActivePanelTab] = React.useState("quick-replies");

  // persist language safely
  React.useEffect(() => {
    try {
      persistLanguage(language);
    } catch (err) {
      console.error("Language persist failed:", err);
    }
  }, [language]);

  // ---------------- SAFE PROFILE LOAD ----------------
  React.useEffect(() => {
    let isMounted = true;

    async function loadActiveProfile() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        activeStream = stream;
        setWebcamStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (webcamError) {
        setCameraError(webcamError.message);
      }
    }
    loadActiveProfile();

    window.addEventListener("voiceforge:profileChanged", loadActiveProfile);
    window.addEventListener("storage", loadActiveProfile);

    return () => {
      window.removeEventListener("voiceforge:profileChanged", loadActiveProfile);
      window.removeEventListener("storage", loadActiveProfile);
    };
  }, []);

  const [isCalibrationOpen, setIsCalibrationOpen] = React.useState(false);
  const [calibration, setCalibration] = React.useState(() => {
  try {
    const savedX     = localStorage.getItem("voiceforge:calibrationXOffset");
    const savedY     = localStorage.getItem("voiceforge:calibrationYOffset");
    const savedScale = localStorage.getItem("voiceforge:calibrationScale");

      let x = savedX !== null ? parseInt(savedX, 10) : 0;
      let y = savedY !== null ? parseInt(savedY, 10) : 0;
      let scale = savedScale !== null ? parseFloat(savedScale) : 1.0;

      // Sanitize and clamp values to default limits
      if (isNaN(x)) {
        x = 0;
      } else {
        x = Math.max(-400, Math.min(400, x));
      }

      if (isNaN(y)) {
        y = 0;
      } else {
        y = Math.max(-250, Math.min(150, y));
      }

      if (isNaN(scale)) {
        scale = 1.0;
      } else {
        scale = Math.max(0.5, Math.min(2.5, scale));
      }

      return {
        xOffset: x,
        yOffset: y,
        scale,
      };
    } catch {
      return { xOffset: 0, yOffset: 0, scale: 1.0 };
    }

        setActiveProfile(null);
        setDbError("Failed to load voice profile");
      }
    }

    loadActiveProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // ---------------- CALIBRATION (SAFE STORAGE READ) ----------------
  const [calibration] = React.useState(() => {
    try {
      const x = parseInt(localStorage.getItem("voiceforge:calibrationXOffset") || "0", 10);
      const y = parseInt(localStorage.getItem("voiceforge:calibrationYOffset") || "0", 10);
      const scale = parseFloat(localStorage.getItem("voiceforge:calibrationScale") || "1.0");

      return {
        xOffset: isNaN(x) ? 0 : x,
        yOffset: isNaN(y) ? 0 : y,
        scale: isNaN(scale) ? 1.0 : scale,
      };
    } catch {
      return { xOffset: 0, yOffset: 0, scale: 1.0 };
    }
  });

  // ---------------- SAFE CAMERA LOAD ----------------
  React.useEffect(() => {
    let streamRef = null;
    let mounted = true;

    async function openCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef = stream;
        setWebcamStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setCameraError("");
      } catch (err) {
        console.error("Camera error:", err);

        if (!mounted) return;

        setCameraError(err?.message || "Camera access failed");
        showToast("Camera access failed", "error");
      }
    }

    openCamera();

    return () => {
      mounted = false;
      if (streamRef) {
        streamRef.getTracks().forEach((t) => t.stop());
      }
    };
  }, [showToast]);

  // ---------------- SAFE SPEAK FUNCTION ----------------
  async function handleSpeak(text) {
    if (!activeProfile?.voice_id) return;
    try {
      const result = await speak({ text, voiceId: activeProfile.voice_id });
      setIsSpeaking(true);
      const audio = new Audio(result.audioUrl);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play();
    } catch {
      setIsSpeaking(false);
    }
  }
});

  const handleCalibrationChange = (key, value) => {
    let parsedValue = typeof value === "string" ? parseFloat(value) : value;
    if (typeof parsedValue !== "number" || isNaN(parsedValue)) return;

    // Apply strict clamping matching the slider limits based on the key
    if (key === "xOffset") {
      parsedValue = Math.max(-400, Math.min(400, Math.round(parsedValue)));
    } else if (key === "yOffset") {
      parsedValue = Math.max(-250, Math.min(150, Math.round(parsedValue)));
    } else if (key === "scale") {
      parsedValue = Math.max(0.5, Math.min(2.5, parsedValue));
    }

    setCalibration((prev) => {
      const updated = { ...prev, [key]: parsedValue };
      try {
        localStorage.setItem(
          `voiceforge:calibration${key.charAt(0).toUpperCase() + key.slice(1)}`,
          parsedValue.toString()
        );
      } catch { /* storage unavailable – continue without persisting */ }
      return updated;
    });
  };

  const handleResetCalibration = () => {
    const defaults = { xOffset: 0, yOffset: 0, scale: 1.0 };
    setCalibration(defaults);
    localStorage.setItem("voiceforge:calibrationXOffset", "0");
    localStorage.setItem("voiceforge:calibrationYOffset", "0");
    localStorage.setItem("voiceforge:calibrationScale", "1.0");
  };

 React.useEffect(() => {
  let activeStream = null;
  let isMounted = true;

  async function openCamera() {
    try {
      await speak({ text, voiceId: activeProfile.voice_id });
      addMessage(text);
    } catch (err) {
      console.error("TTS streaming error:", err);
    }
  }

  openCamera();

  return () => {
    isMounted = false;

    try {
      const result = await speak({
        text,
        voiceId: activeProfile.voice_id,
        language_code: language,
      });

      setSessionHistory((prev) => [
        ...prev,
        {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : String(Date.now()),
          text,
          timestamp: new Date().toISOString(),
          voiceName: activeProfile?.name || "Default Voice",
        },
      ]);

      if (result?.fallback) {
        showToast("Using browser voice fallback", "info");
      }
    } catch (err) {
      console.error("TTS error:", err);
      showToast("Speech generation failed", "error");
    } finally {
      setActiveText("");
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
    }
  };
}, [showToast]);

  async function handleSpeak(text) {
  if (!activeProfile?.voice_id) return;

  try {
    setActiveText(text);
    const result = await speak({
      text,
      voiceId: activeProfile.voice_id,
      language_code: language,
      onSpeakingChange: setIsSpeaking,
    });

    if (result?.fallback) {
      showToast("Using browser voice fallback", "info");
    }
  } catch (err) {
    console.error("TTS streaming error:", err);
    showToast(err?.message || "Speech generation failed", "error");
  }
}

  const isSpeechActive = status === "speaking" || isSpeaking;

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Call control room</h2>
          <span className="text-sm">
            Voice: {activeProfile?.name || "No profile"}
          </span>
      {/* ── Header card ───────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-moss dark:text-glow">
              Step 2 of 3
            </p>
            <h2 className="mt-1 text-2xl font-bold dark:text-neutral-100">
              Call control room
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            <span className="rounded-md bg-mint px-3 py-2 text-ink dark:bg-glow/20 dark:text-glow">
              Voice: {activeProfile?.name || "No profile selected"}
            </span>
            <div className="flex items-center gap-1.5 rounded-md bg-cloud px-3 py-1 text-ink dark:bg-black dark:text-neutral-200">
              <label htmlFor="call-model-select" className="text-xs uppercase tracking-wider opacity-75 font-bold">Model:</label>
              <select
                id="call-model-select"
                value={modelId}
                onChange={(e) => handleModelChange(e.target.value)}
                className="bg-transparent font-semibold border-none focus:outline-none cursor-pointer text-sm dark:text-neutral-200 dark:bg-black"
              >
                <option value="eleven_flash_v2_5">Flash v2.5 (Fastest)</option>
                <option value="eleven_turbo_v2_5">Turbo v2.5</option>
                <option value="eleven_multilingual_v2">Multilingual v2</option>
                <option value="eleven_monolingual_v1">English v1</option>
              </select>
            </div>
            <span className="rounded-md bg-cloud px-3 py-2 text-ink dark:bg-black dark:text-neutral-200">
              Virtual camera: {virtualCamera.isLive ? "Live" : "Idle"}
            </span>
          </div>
        </div>
      </section>

      {/* ── No profile warning ─────────────────────────────────────────────── */}
      {!activeProfile && (
        <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink dark:border-coral/30 dark:bg-coral/10 dark:text-neutral-200">
          <CircleAlert size={18} aria-hidden="true" />
          Create or select a voice profile before speaking.
        </div>
      )}

      {/* CAMERA */}
      <section>
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full rounded bg-black"
      <PrivacyModeToggle
        onModeChange={setPrivacyMode}
        onAvatarChange={setAvatarImage}
        showToast={showToast}
      />

      {/* Mouth Calibration Drawer */}
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <button
          id="toggle-calibration-btn"
          type="button"
          onClick={() => setIsCalibrationOpen(!isCalibrationOpen)}
          title={isCalibrationOpen ? "Close calibration settings" : "Open calibration settings"}
          aria-label={isCalibrationOpen ? "Close calibration settings" : "Open calibration settings"}
          className="flex w-full items-center justify-between font-bold text-ink"
        >
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-moss" />
            <h2 className="text-base font-bold">Mouth Calibration Settings</h2>
          </div>
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isCalibrationOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {isCalibrationOpen && (
          <div className="mt-4 border-t border-ink/10 pt-4">
            <p className="text-sm text-ink/65 mb-4">
              Calibrate the audio-driven mouth position and size overlay to align with your camera.
            </p>
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="calibration-x-slider" className="text-sm font-bold text-ink">
                    Horizontal Position (X Offset)
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cloud border border-ink/10 text-moss">
                    {calibration.xOffset > 0 ? `+${calibration.xOffset}` : calibration.xOffset}px
                  </span>
                </div>
                <input
                  id="calibration-x-slider"
                  type="range"
                  min="-400"
                  max="400"
                  step="1"
                  value={calibration.xOffset}
                  onChange={(e) => handleCalibrationChange("xOffset", parseInt(e.target.value, 10))}
                  title="Adjust horizontal position of the mouth overlay"
                  aria-label="Horizontal position slider for mouth calibration"
                  className="w-full h-2 rounded-lg bg-cloud border border-ink/10 appearance-none cursor-pointer accent-moss focus:outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="calibration-y-slider" className="text-sm font-bold text-ink">
                    Vertical Position (Y Offset)
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cloud border border-ink/10 text-moss">
                    {calibration.yOffset > 0 ? `+${calibration.yOffset}` : calibration.yOffset}px
                  </span>
                </div>
                <input
                  id="calibration-y-slider"
                  type="range"
                  min="-250"
                  max="150"
                  step="1"
                  value={calibration.yOffset}
                  onChange={(e) => handleCalibrationChange("yOffset", parseInt(e.target.value, 10))}
                  title="Adjust vertical position of the mouth overlay"
                  aria-label="Vertical position slider for mouth calibration"
                  className="w-full h-2 rounded-lg bg-cloud border border-ink/10 appearance-none cursor-pointer accent-moss focus:outline-none"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="calibration-scale-slider" className="text-sm font-bold text-ink">
                    Mouth Size (Scale)
                  </label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cloud border border-ink/10 text-moss">
                    {calibration.scale.toFixed(1)}x
                  </span>
                </div>
                <input
                  id="calibration-scale-slider"
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={calibration.scale}
                  onChange={(e) => handleCalibrationChange("scale", parseFloat(e.target.value))}
                  title="Adjust size of the mouth overlay"
                  aria-label="Scale slider for mouth calibration"
                  className="w-full h-2 rounded-lg bg-cloud border border-ink/10 appearance-none cursor-pointer accent-moss focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                id="reset-calibration-btn"
                type="button"
                onClick={handleResetCalibration}
                title="Reset mouth calibration to default values"
                aria-label="Reset mouth calibration to default values"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-coral/40 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral hover:text-white transition"
              >
                <RotateCcw size={14} aria-hidden="true" />
                Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </section>
      
      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft dark:border-border dark:bg-surface">
        <label
          htmlFor="output-language"
          className="mb-2 block text-sm font-bold dark:text-neutral-100"
        >
          Output Language
        </label>

        <select
          id="output-language"
          value={language}
          onChange={setLanguage}
        />
        {cameraError && (
          <p className="text-red-500">{cameraError}</p>
        )}
      </section>

      {/* TEXT TO SPEECH */}
      <TextToSpeech
        onSpeak={handleSpeak}
        disabled={!activeProfile}
        status={status}
      />
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold">Subtitles Overlay Settings</h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">Overlay spoken words on the webcam video preview sent to the virtual camera.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={subtitlesEnabled}
              onChange={(e) => {
                setSubtitlesEnabled(e.target.checked);
                localStorage.setItem("voiceforge:subtitlesEnabled", e.target.checked.toString());
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-neutral-600 peer-checked:bg-coral"></div>
            <span className="ml-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              Enabled
            </span>
          </label>
        </div>
        
        {subtitlesEnabled && (
          <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <div>
              <label htmlFor="sub-font-size" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Font Size
              </label>
              <select
                id="sub-font-size"
                value={subtitleFontSize}
                onChange={(e) => {
                  setSubtitleFontSize(e.target.value);
                  localStorage.setItem("voiceforge:subtitleFontSize", e.target.value);
                }}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/45 dark:border-border dark:bg-black dark:text-neutral-200"
              >
                <option value="small">Small (18px)</option>
                <option value="medium">Medium (24px)</option>
                <option value="large">Large (32px)</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="sub-bg-opacity" className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                Background Box Opacity
              </label>
              <select
                id="sub-bg-opacity"
                value={subtitleBgOpacity}
                onChange={(e) => {
                  setSubtitleBgOpacity(e.target.value);
                  localStorage.setItem("voiceforge:subtitleBgOpacity", e.target.value);
                }}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral/45 dark:border-border dark:bg-black dark:text-neutral-200"
              >
                <option value="0">Transparent (0%)</option>
                <option value="0.3">Light (30%)</option>
                <option value="0.6">Medium (60%)</option>
                <option value="0.85">Dark (85%)</option>
              </select>
            </div>
          </div>
        )}
      </section>
      </div> {/* Closes top settings inert wrapper */}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
        {/* Webcam panel */}
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk">
          <div className="mb-4 flex items-center gap-2">
            <Camera
              size={19}
              aria-hidden="true"
              className="dark:text-neutral-300"
            />
            <h2 className="text-lg font-bold dark:text-neutral-100">
              Live webcam
            </h2>
          </div>
          {/* Video element: bg-black already looks fine in dark mode */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="aspect-video w-full rounded-md bg-black object-cover"
          />
          {cameraError && (
            <p className="mt-3 text-sm font-semibold text-coral">
              {cameraError}
            </p>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <TextToSpeech
            onSpeak={handleSpeak}
            disabled={!activeProfile}
            status={status}
          />

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:text-neutral-100 dark:shadow-soft-dk">
            <div className="flex border-b border-ink/10 pb-3 mb-4 dark:border-border">
              <button
                type="button"
                onClick={() => setActivePanelTab("quick-replies")}
                className={`inline-flex items-center gap-1.5 pb-2 border-b-2 px-1 text-sm font-bold transition-all ${
                  activePanelTab === "quick-replies"
                    ? "border-moss text-moss dark:border-glow dark:text-glow"
                    : "border-transparent text-ink/60 hover:text-ink dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                <MessageSquare size={16} />
                Quick Replies
              </button>
              <button
                type="button"
                onClick={() => setActivePanelTab("pinned")}
                className={`ml-4 inline-flex items-center gap-1.5 pb-2 border-b-2 px-1 text-sm font-bold transition-all ${
                  activePanelTab === "pinned"
                    ? "border-moss text-moss dark:border-glow dark:text-glow"
                    : "border-transparent text-ink/60 hover:text-ink dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                <Pin size={16} />
                Pinned ({history.filter(m => favorites.has(m.id)).length})
              </button>
              <button
                type="button"
                onClick={() => setActivePanelTab("history")}
                className={`ml-4 inline-flex items-center gap-1.5 pb-2 border-b-2 px-1 text-sm font-bold transition-all ${
                  activePanelTab === "history"
                    ? "border-moss text-moss dark:border-glow dark:text-glow"
                    : "border-transparent text-ink/60 hover:text-ink dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                <Clock size={16} />
                History
              </button>
            </div>

            <div>
              {activePanelTab === "quick-replies" && (
                <div className="flex flex-wrap gap-2">
                  {QUICK_REPLIES.map(({ label, phrase }) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => handleSpeak(phrase)}
                      disabled={!activeProfile}
                      className="rounded-full border border-ink/15 bg-cloud px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-moss hover:bg-mint/30 dark:border-border dark:bg-black dark:text-neutral-300 dark:hover:border-glow dark:hover:bg-glow/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {activePanelTab === "pinned" && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {history.filter(m => favorites.has(m.id)).length === 0 ? (
                    <p className="text-sm text-ink/65 dark:text-neutral-400 py-4 text-center">No pinned phrases yet.</p>
                  ) : (
                    history.filter(m => favorites.has(m.id)).map((msg) => (
                      <div key={msg.id} className="flex items-center justify-between p-2 rounded bg-cloud dark:bg-black border border-ink/10 dark:border-border">
                        <span className="text-sm font-semibold truncate flex-1 mr-2">{msg.text}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSpeak(msg.text)}
                            disabled={!activeProfile}
                            title="Speak"
                            className="p-1 rounded text-moss hover:bg-mint dark:text-glow dark:hover:bg-glow/20 disabled:opacity-50"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(msg.id)}
                            title="Unpin"
                            className="p-1 rounded text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/15"
                          >
                            <Pin size={16} fill="currentColor" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activePanelTab === "history" && (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {history.length === 0 ? (
                    <p className="text-sm text-ink/65 dark:text-neutral-400 py-4 text-center">No history yet. Type above to speak!</p>
                  ) : (
                    history.slice(0, 10).map((msg) => (
                      <div key={msg.id} className="flex items-center justify-between p-2 rounded bg-cloud dark:bg-black border border-ink/10 dark:border-border">
                        <span className="text-sm font-semibold truncate flex-1 mr-2">{msg.text}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSpeak(msg.text)}
                            disabled={!activeProfile}
                            title="Speak"
                            className="p-1 rounded text-moss hover:bg-mint dark:text-glow dark:hover:bg-glow/20 disabled:opacity-50"
                          >
                            <Play size={16} fill="currentColor" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(msg.id)}
                            title={favorites.has(msg.id) ? "Unpin" : "Pin"}
                            className={`p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                              favorites.has(msg.id) ? "text-amber-500" : "text-ink/40 dark:text-neutral-500"
                            }`}
                          >
                            <Pin size={16} fill={favorites.has(msg.id) ? "currentColor" : "none"} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMessage(msg.id)}
                            title="Delete"
                            className="p-1 rounded text-coral hover:bg-coral/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <VideoPreview
          ref={canvasRef}
          webcamStream={webcamStream}
          audioUrl={audioUrl}
          isSpeaking={isSpeaking}
          onSpeakingChange={setIsSpeaking}
          calibration={calibration}
          isCalibrating={isCalibrationOpen}
          captionText={captionText}
          captionEnabled={captionEnabled}
          captionPosition={captionPosition}
          captionFontSize={captionFontSize}
        />
        <CaptionOverlay
          isEnabled={captionEnabled}
          position={captionPosition}
          fontSize={captionFontSize}
          onToggle={toggleEnabled}
          onPositionChange={updatePosition}
          onFontSizeChange={updateFontSize}
        />
      </div>

      <div inert={isSpeechActive ? "" : undefined} className="space-y-5">
        <VirtualCamera
          isLive={virtualCamera.isLive}
          status={virtualCamera.status}
          onStart={virtualCamera.start}
          onStop={virtualCamera.stop}
        />

        {error && (
          <p className="rounded-md border border-coral/30 bg-white p-3 text-sm font-semibold text-coral dark:border-coral/20 dark:bg-surface">
            {error}
          </p>
        )}
      </div>

      {/* VIDEO PREVIEW */}
      <VideoPreview
        ref={canvasRef}
        webcamStream={webcamStream}
        audioUrl={audioUrl}
        isSpeaking={isSpeaking}
        onSpeakingChange={setIsSpeaking}
        calibration={calibration}
      />

      {/* VIRTUAL CAMERA */}
      <VirtualCamera
        isLive={virtualCamera.isLive}
        status={virtualCamera.status}
        onStart={virtualCamera.start}
        onStop={virtualCamera.stop}
      />

      {/* TTS ERROR */}
      {error && (
        <p className="text-red-500">{error}</p>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}
