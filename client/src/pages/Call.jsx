// Renders the main call workspace for webcam preview, typed speech, output video, and virtual camera controls.
import React from "react";
import { Camera, CircleAlert, Sliders, ChevronDown, RotateCcw } from "lucide-react";
import TextToSpeech from "../components/TextToSpeech.jsx";
import VideoPreview from "../components/VideoPreview.jsx";
import VirtualCamera from "../components/VirtualCamera.jsx";
import useTTS from "../hooks/useTTS.js";
import useVirtualCamera from "../hooks/useVirtualCamera.js";
import { getActiveVoiceProfile } from "../hooks/useVoiceClone.js";

export default function Call() {
  const [webcamStream, setWebcamStream] = React.useState(null);
  const [cameraError, setCameraError] = React.useState("");
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const canvasRef = React.useRef(null);
  const localVideoRef = React.useRef(null);
  const [activeProfile, setActiveProfile] = React.useState(null);
  const [language, setLanguage] = React.useState(() => {
  try {
    const savedLanguage = localStorage.getItem("voiceforge:language");

    const legacyToCode = {
      English: "en",
      Hindi: "hi",
      Spanish: "es",
      French: "fr",
      German: "de",
      Portuguese: "pt",
      Japanese: "ja",
    };

    const normalizedLanguage =
      legacyToCode[savedLanguage] || savedLanguage;

    return ["en", "hi", "es", "fr", "de", "pt", "ja"].includes(normalizedLanguage)
      ? normalizedLanguage
      : "en";
  } catch {
    return "en";
  }
});

React.useEffect(() => {
  try {
    localStorage.setItem("voiceforge:language", language);
  } catch {
    // storage unavailable
  }
}, [language]);
  const [dbError, setDbError] = React.useState("");
  const { speak, status, error, audioUrl } = useTTS();
  const virtualCamera = useVirtualCamera(canvasRef);

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
      scale
    };
  } catch {
    return { xOffset: 0, yOffset: 0, scale: 1.0 };
  }
});

  const handleCalibrationChange = (key, value) => {
  if (typeof value !== "number" || isNaN(value)) return;
  setCalibration((prev) => {
    const updated = { ...prev, [key]: value };
    try {
      localStorage.setItem(
        `voiceforge:calibration${key.charAt(0).toUpperCase() + key.slice(1)}`,
        value.toString()
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
    async function openCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        activeStream = stream;
        setWebcamStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setCameraError("");
      } catch (webcamError) {
        setCameraError(webcamError?.message || String(webcamError));
      }
    }
    openCamera();
    return () => {
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleSpeak(text) {
    if (!activeProfile?.voice_id) return;
    try {
      await speak({
  text,
  voiceId: activeProfile.voice_id,
  language_code: language,
});
    } catch (err) {
      console.error("TTS streaming error:", err);
    }
  }

  return (
    <div className="space-y-5">
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
        <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink">
          <CircleAlert size={18} aria-hidden="true" />
          <span>Database Error: {dbError}. Please ensure IndexedDB is enabled and not blocked.</span>
        </div>
      )}

      {!activeProfile && !dbError && (
        <div className="flex items-center gap-2 rounded-md border border-coral/40 bg-coral/10 p-4 text-sm font-semibold text-ink">
          <CircleAlert size={18} aria-hidden="true" />
          Create or select a voice profile before speaking.
        </div>
      )}

      {/* Mouth Calibration Drawer */}
      <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <button
          id="toggle-calibration-btn"
          type="button"
          onClick={() => setIsCalibrationOpen(!isCalibrationOpen)}
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
              Calibrate the animated fallback mouth position and size overlay to align with your camera.
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
                  className="w-full h-2 rounded-lg bg-cloud border border-ink/10 appearance-none cursor-pointer accent-moss focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                id="reset-calibration-btn"
                type="button"
                onClick={handleResetCalibration}
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
  onChange={(e) => setLanguage(e.target.value)}
  className="w-full rounded-md border border-ink/15 bg-cloud p-3 dark:border-border dark:bg-black dark:text-neutral-100"
>
   <option value="en">English</option>
<option value="hi">Hindi</option>
<option value="es">Spanish</option>
<option value="fr">French</option>
<option value="de">German</option>
<option value="pt">Portuguese</option>
<option value="ja">Japanese</option>
  </select>
</section>
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

        <TextToSpeech
          onSpeak={handleSpeak}
          disabled={!activeProfile}
          status={status}
        />

        <VideoPreview
          ref={canvasRef}
          webcamStream={webcamStream}
          audioUrl={audioUrl}
          isSpeaking={isSpeaking}
          onSpeakingChange={setIsSpeaking}
          calibration={calibration}
          isCalibrating={isCalibrationOpen}
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
    </div>
  );
}
