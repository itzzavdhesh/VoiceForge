// Renders the main call workspace for webcam preview, typed speech, output video, and virtual camera controls.
import React from "react";
import { Camera, CircleAlert, Sliders, ChevronDown, RotateCcw, Grid } from "lucide-react";
import TextToSpeech from "../components/TextToSpeech.jsx";
import DeviceSelector from "../components/DeviceSelector.jsx";
import VideoPreview from "../components/VideoPreview.jsx";
import VirtualCamera from "../components/VirtualCamera.jsx";
import { AACSymbolBoard } from "../components/AACSymbolBoard.jsx";
import { LanguageSelector } from "../components/LanguageSelector.jsx";
import PrivacyModeToggle from "../components/PrivacyModeToggle.jsx";
import useTTS from "../hooks/useTTS.js";
import useVirtualCamera from "../hooks/useVirtualCamera.js";
import { getActiveVoiceProfile } from "../hooks/useVoiceClone.js";
import { useToast, ToastContainer } from "../components/useToast.jsx";
import { loadLanguage, persistLanguage, subscribeLanguageChange } from "../utils/languages.js";

export default function Call() {
  const [webcamStream, setWebcamStream] = React.useState(null);
  const [cameraError, setCameraError] = React.useState("");
  const [retryCamera, setRetryCamera] = React.useState(0);
  const { toasts, showToast } = useToast();
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const [subtitleText, setSubtitleText] = React.useState("");
  const canvasRef = React.useRef(null);
  const localVideoRef = React.useRef(null);
  const [activeProfile, setActiveProfile] = React.useState(null);
  const [language, setLanguage] = React.useState(loadLanguage);
  const [privacyMode, setPrivacyMode] = React.useState(false);
  const [avatarImage, setAvatarImage] = React.useState(null);
  const [videoDevices, setVideoDevices] = React.useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = React.useState(() => {
    return getStoredValue("voiceforge:subtitlesEnabled") === "true";
  });
  const [subtitleFontSize, setSubtitleFontSize] = React.useState(() => {
    return getStoredValue("voiceforge:subtitleFontSize", "medium");
  });
  const [subtitleBgOpacity, setSubtitleBgOpacity] = React.useState(() => {
    return getStoredValue("voiceforge:subtitleBgOpacity", "0.6");
  });

  React.useEffect(() => {
    return subscribeLanguageChange((newLang) => {
      setLanguage(newLang);
    });
  }, []);

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
  const [activeText, setActiveText] = React.useState("");

  React.useEffect(() => {
    persistLanguage(language);
  }, [language]);
  const [dbError, setDbError] = React.useState("");
  const { speak, status, error, audioUrl, engine } = useTTS();
  const virtualCamera = useVirtualCamera(canvasRef);
  const [isSymbolBoardOpen, setIsSymbolBoardOpen] = React.useState(false);

  React.useEffect(() => {
    async function loadActiveProfile() {
      try {
        const profile = await getActiveVoiceProfile();
        setActiveProfile(profile);
        setDbError("");
      } catch (err) {
        setDbError(err?.message || String(err));
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
    const savedX = getStoredValue("voiceforge:calibrationXOffset");
    const savedY = getStoredValue("voiceforge:calibrationYOffset");
    const savedScale = getStoredValue("voiceforge:calibrationScale");

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
      setStoredValue(
        `voiceforge:calibration${key.charAt(0).toUpperCase() + key.slice(1)}`,
        parsedValue.toString()
      );
      return updated;
    });
  };

  const handleResetCalibration = () => {
    const defaults = { xOffset: 0, yOffset: 0, scale: 1.0 };
    setCalibration(defaults);
    setStoredValue("voiceforge:calibrationXOffset", "0");
    setStoredValue("voiceforge:calibrationYOffset", "0");
    setStoredValue("voiceforge:calibrationScale", "1.0");
  };

  React.useEffect(() => {
    let activeStream = null;
    let isMounted = true;

    async function fetchDevices() {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices.filter((device) => device.kind === "videoinput");
        if (isMounted) {
          setVideoDevices(videoInputDevices);
        }
      } catch (err) {
        console.error("Failed to enumerate devices", err);
      }
    }

    async function openCamera() {
      if (privacyMode) {
        setWebcamStream(null);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        return;
      }

      try {
        const constraints = {
          video: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = stream;
        setWebcamStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setCameraError("");
        
        await fetchDevices();
        
        if (isMounted && stream.getVideoTracks().length > 0) {
          const track = stream.getVideoTracks()[0];
          const settings = track.getSettings();
          if (settings.deviceId && !selectedDeviceId) {
             setSelectedDeviceId(settings.deviceId);
          }
        }
      } catch (webcamError) {
        if (!isMounted) return;
        setCameraError(webcamError?.message || String(webcamError));
        showToast("Camera access failed", "error");
      }
    }

    openCamera();
    
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', fetchDevices);
    }

    return () => {
      isMounted = false;
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', fetchDevices);
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showToast, retryCamera, privacyMode, selectedDeviceId]);

  async function handleSpeak(text, voice_settings_override) {
    if (!activeProfile?.voice_id) return;

    setActiveText(text);

    try {
      const result = await speak({
        text,
        voiceId: activeProfile.voice_id,
        language_code: language,
        voice_settings_override,
      });

      if (result?.fallback) {
        showToast("Using browser voice fallback", "info");
      }
    } catch (err) {
      console.error("TTS streaming error:", err);
      showToast("Speech generation failed", "error");
    } finally {
      setActiveText("");
    }
  }

  const handleSpeakingChange = (value) => {
    setIsSpeaking(value);
    if (!value) {
      setSubtitleText("");
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Header card ───────────────────────────────────────────────────── */}
      {engine === "browser" && (
      <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm font-medium text-yellow-800">
        Using Browser Voice (Offline Mode)
      </div>
    )}
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
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-md bg-mint px-3 py-2 text-ink dark:bg-glow/20 dark:text-glow">
              Voice: {activeProfile?.name || "No profile selected"}
            </span>
            <span className="rounded-md bg-cloud px-3 py-2 text-ink dark:bg-black dark:text-neutral-200">
              Virtual camera: {virtualCamera.isLive ? "Live" : "Idle"}
            </span>
          </div>
        </div>
      </section>

      {dbError && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink">
          <CircleAlert size={18} aria-hidden="true" />
          <span>Database Error: {dbError}. Please ensure IndexedDB is enabled and not blocked.</span>
        </div>
      )}

      {!activeProfile && !dbError && (
        <div role="alert" className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink">
          <CircleAlert size={18} aria-hidden="true" />
          Create or select a voice profile before speaking.
        </div>
      )}

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
          aria-expanded={isCalibrationOpen}
          aria-controls="calibration-panel"
          className="flex w-full items-center justify-between font-bold text-ink"
        >
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-moss" aria-hidden="true" />
            <h2 className="text-base font-bold">Mouth Calibration Settings</h2>
          </div>
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${isCalibrationOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        {isCalibrationOpen && (
          <div id="calibration-panel" className="mt-4 border-t border-ink/10 pt-4">
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
                  aria-label="Horizontal position X offset"
                  aria-valuemin={-400}
                  aria-valuemax={400}
                  aria-valuenow={calibration.xOffset}
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
                  aria-label="Vertical position Y offset"
                  aria-valuemin={-250}
                  aria-valuemax={150}
                  aria-valuenow={calibration.yOffset}
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
                  aria-label="Mouth size scale"
                  aria-valuemin={0.5}
                  aria-valuemax={2.5}
                  aria-valuenow={calibration.scale}
                  className="w-full h-2 rounded-lg bg-cloud border border-ink/10 appearance-none cursor-pointer accent-moss focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                id="reset-calibration-btn"
                type="button"
                onClick={handleResetCalibration}
                aria-label="Reset calibration to default values"
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
          className="mb-3 block text-sm font-bold dark:text-neutral-100"
        >
          Output Language
        </label>
        <LanguageSelector
          id="output-language"
          value={language}
          onChange={setLanguage}
        />
      </section>
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
                setStoredValue("voiceforge:subtitlesEnabled", e.target.checked.toString());
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
                  setStoredValue("voiceforge:subtitleFontSize", e.target.value);
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
                  setStoredValue("voiceforge:subtitleBgOpacity", e.target.value);
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
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr_0.9fr]">
        {/* Webcam panel */}
        <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft dark:border-border dark:bg-surface dark:shadow-soft-dk">
          {privacyMode ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 rounded-full bg-moss/20 p-4 text-moss dark:bg-glow/20 dark:text-glow">
                <ShieldCheck size={32} aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold dark:text-neutral-100">
                Privacy Mode Active
              </h2>
              <p className="mt-2 text-sm text-ink/65 dark:text-muted">
                Your camera is disabled.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Camera
                    size={19}
                    aria-hidden="true"
                    className="dark:text-neutral-300"
                  />
                  <h2 className="text-lg font-bold dark:text-neutral-100">
                    Live webcam
                  </h2>
                </div>
                <DeviceSelector 
                  devices={videoDevices} 
                  selectedDeviceId={selectedDeviceId} 
                  onChange={setSelectedDeviceId} 
                />
              </div>
              {/* Video element: bg-black already looks fine in dark mode */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                aria-label="Live webcam feed"
                className="aspect-video w-full rounded-md bg-black object-cover"
              />
              {cameraError && (
                <div className="mt-3 flex flex-col gap-2 items-start" role="alert" aria-live="polite">
                  <p className="text-sm font-semibold text-coral">
                    {cameraError}
                  </p>
                  <button
                    onClick={() => setRetryCamera(prev => prev + 1)}
                    className="rounded-md border border-coral/40 bg-coral/10 px-3 py-1.5 text-xs font-bold text-coral hover:bg-coral hover:text-white transition"
                  >
                    Retry Camera
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Text to Speech Panel with AAC Symbol Board Toggle */}
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-ink/10 bg-white px-4 py-2.5 shadow-soft dark:border-border dark:bg-surface">
            <div className="flex items-center gap-2">
              <Grid size={16} className="text-moss dark:text-glow" aria-hidden="true" />
              <span className="text-xs font-bold text-ink dark:text-neutral-200">
                AAC Picture-Symbol Board
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSymbolBoardOpen(!isSymbolBoardOpen)}
              className="rounded-md bg-mint/80 px-3 py-1 text-xs font-bold text-ink transition hover:bg-mint dark:bg-glow/20 dark:text-glow"
            >
              {isSymbolBoardOpen ? "Hide Board" : "Show Symbol Board"}
            </button>
          </div>

          {isSymbolBoardOpen && (
            <AACSymbolBoard
              onSelectSymbol={handleSpeak}
              onClose={() => setIsSymbolBoardOpen(false)}
            />
          )}

          <TextToSpeech
            onSpeak={handleSpeak}
            disabled={!activeProfile}
            status={status}
          />
        </div>

        <VideoPreview
          ref={canvasRef}
          webcamStream={webcamStream}
          audioUrl={audioUrl}
          isSpeaking={isSpeaking}
          onSpeakingChange={handleSpeakingChange}
          calibration={calibration}
          isCalibrating={isCalibrationOpen}
          avatarImage={avatarImage}
          subtitlesEnabled={subtitlesEnabled}
          subtitleFontSize={subtitleFontSize}
          subtitleBgOpacity={subtitleBgOpacity}
          activeText={activeText}
        />
      </div>

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
      <ToastContainer toasts={toasts} />
    </div>
  );
}
