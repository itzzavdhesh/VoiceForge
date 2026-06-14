// Renders the main call workspace for webcam preview, typed speech, output video, and virtual camera controls.
import React from "react";
import { Camera } from "lucide-react";
import TextToSpeech from "../components/TextToSpeech.jsx";
import VideoPreview from "../components/VideoPreview.jsx";
import VirtualCamera from "../components/VirtualCamera.jsx";
import useTTS from "../hooks/useTTS.js";
import useVirtualCamera from "../hooks/useVirtualCamera.js";
import { getActiveVoiceProfile } from "../hooks/useVoiceClone.js";
import { useToast, ToastContainer } from "../components/useToast.jsx";
import { loadLanguage, persistLanguage } from "../utils/languages.js";

export default function Call() {
  const [webcamStream, setWebcamStream] = React.useState(null);
  const [cameraError, setCameraError] = React.useState("");
  const { toasts, showToast } = useToast();

  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const canvasRef = React.useRef(null);
  const localVideoRef = React.useRef(null);

  const [activeProfile, setActiveProfile] = React.useState(null);
  const [language, setLanguage] = React.useState(loadLanguage);

  const [dbError, setDbError] = React.useState("");

  const { speak, status, error, audioUrl } = useTTS();
  const virtualCamera = useVirtualCamera(canvasRef);

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
        const profile = await getActiveVoiceProfile();

        if (!isMounted) return;

        if (!profile) {
          setActiveProfile(null);
          setDbError("No voice profile found");
          return;
        }

        setActiveProfile(profile);
        setDbError("");
      } catch (err) {
        console.error("Profile load failed:", err);

        if (!isMounted) return;

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
    try {
      if (!activeProfile?.voice_id) {
        showToast("No voice profile selected", "error");
        return;
      }

      await speak({
        text,
        voiceId: activeProfile.voice_id,
        language_code: language,
      });
    } catch (err) {
      console.error("TTS error:", err);
      showToast("Speech generation failed", "error");
    }
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Call control room</h2>
          <span className="text-sm">
            Voice: {activeProfile?.name || "No profile"}
          </span>
        </div>
      </section>

      {/* ERRORS */}
      {dbError && (
        <div className="p-3 border border-red-300 text-red-600">
          {dbError}
        </div>
      )}

      {!activeProfile && !dbError && (
        <div className="p-3 border border-yellow-300 text-yellow-600">
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