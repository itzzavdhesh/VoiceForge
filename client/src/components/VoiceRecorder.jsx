// Handles microphone permission, short reference recording, playback, and upload readiness.
import React from "react";
import { Mic, Square, Upload } from "lucide-react";

export default function VoiceRecorder({ onRecordingReady, disabled = false }) {
  const [isRecording, setIsRecording] = React.useState(false);
  const [audioUrl, setAudioUrl] = React.useState("");
  const [duration, setDuration] = React.useState(0);
  const recorderRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const timerRef = React.useRef(null);
  const streamRef = React.useRef(null);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      onRecordingReady(blob);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };

    setDuration(0);
    timerRef.current = window.setInterval(() => setDuration((value) => value + 1), 1000);
    recorder.start();
    setIsRecording(true);
  }

  function stopRecording() {
    window.clearInterval(timerRef.current);
    recorderRef.current?.stop();
    setIsRecording(false);
  }

  React.useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Record a 10-second reference</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-ink/70">
            Use your own voice or a trusted reference speaker with consent. Keep background noise low.
          </p>
        </div>
        <span className="rounded-md bg-mint px-3 py-1 text-sm font-semibold text-ink">{duration}s</span>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 font-bold text-white transition ${
            isRecording ? "bg-coral hover:bg-coral/90" : "bg-moss hover:bg-moss/90"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isRecording ? <Square size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
          {isRecording ? "Stop recording" : "Start recording"}
        </button>

        <div className="recording-wave flex h-12 flex-1 items-center gap-1 rounded-md border border-ink/10 bg-cloud px-4" aria-hidden="true">
          {[18, 30, 42, 30, 18].map((height, index) => (
            <span
              key={height + index}
              className={`block w-2 rounded-full ${isRecording ? "bg-coral" : "bg-ink/20"}`}
              style={{ height }}
            />
          ))}
        </div>

        {audioUrl && (
          <audio className="w-full max-w-sm" controls src={audioUrl}>
            <track kind="captions" />
          </audio>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-ink/60">
        <Upload size={16} aria-hidden="true" />
        Upload starts after you press “Clone voice”.
      </div>
    </section>
  );
}
