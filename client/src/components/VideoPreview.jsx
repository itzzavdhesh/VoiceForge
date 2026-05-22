// Draws the webcam and MVP lip-sync animation onto a canvas preview.
import React from "react";
import { Loader2 } from "lucide-react";

export default React.forwardRef(function VideoPreview({ webcamStream, audioUrl, isSpeaking }, ref) {
  const videoRef = React.useRef(null);
  const animationRef = React.useRef(null);
  const [modelStatus, setModelStatus] = React.useState("Fallback animation ready");

  React.useEffect(() => {
    async function loadModel() {
      try {
        const modelResponse = await fetch("/models/wav2lip.onnx");
        const modelBytes = new Uint8Array(await modelResponse.arrayBuffer());
        if (!modelResponse.ok || modelBytes[0] === 35) {
          throw new Error("Placeholder Wav2Lip model detected.");
        }
        const ort = await import("onnxruntime-web");
        await ort.InferenceSession.create(modelBytes);
        setModelStatus("ONNX Wav2Lip model loaded");
      } catch {
        setModelStatus("Fallback mouth animation active");
        // TODO: Replace fallback canvas mouth animation with real browser Wav2Lip ONNX inference.
      }
    }
    loadModel();
  }, []);

  React.useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  React.useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    function draw(timestamp) {
      context.fillStyle = "#dfe8df";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const video = videoRef.current;
      if (video?.readyState >= 2) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      } else {
        context.fillStyle = "#16201d";
        context.font = "600 24px Inter, sans-serif";
        context.textAlign = "center";
        context.fillText("Waiting for webcam", canvas.width / 2, canvas.height / 2);
      }

      if (isSpeaking) {
        const mouthOpen = 14 + Math.sin(timestamp / 80) * 8;
        context.save();
        context.fillStyle = "rgba(22, 32, 29, 0.82)";
        context.beginPath();
        context.ellipse(canvas.width / 2, canvas.height * 0.63, 56, mouthOpen, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      animationRef.current = requestAnimationFrame(draw);
    }

    animationRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationRef.current);
  }, [ref, isSpeaking]);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Lip-synced output</h2>
          <p className="mt-1 text-sm text-ink/65">{modelStatus}</p>
        </div>
        {isSpeaking && <Loader2 className="animate-spin text-coral" size={20} aria-hidden="true" />}
      </div>
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
      <canvas ref={ref} width="960" height="540" className="aspect-video w-full rounded-md bg-ink object-cover" />
      {audioUrl && (
        <audio className="mt-4 w-full" controls src={audioUrl} autoPlay>
          <track kind="captions" />
        </audio>
      )}
    </section>
  );
});
