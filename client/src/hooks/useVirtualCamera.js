// Captures the lip-sync canvas as a MediaStream and exposes MVP virtual-camera controls.
import React from "react";
export default function useVirtualCamera(canvasRef) {
  const [isLive, setIsLive] = React.useState(false);
  const [status, setStatus] = React.useState("Idle");
  const [stream, setStream] = React.useState(null);

  function browserSupportsInsertableStreams() {
    return "MediaStreamTrackProcessor" in window && "MediaStreamTrackGenerator" in window && "TransformStream" in window;
  }

  async function start() {
    const canvas = canvasRef.current;
    if (!canvas) {
      setStatus("Preview canvas unavailable");
      return null;
    }

    const canvasStream = canvas.captureStream(30);
    const [track] = canvasStream.getVideoTracks();

    if (browserSupportsInsertableStreams()) {
      setStatus("Canvas stream live; Insertable Streams available");
      // TODO: Replace this MVP passthrough with a TransformStream that emits Wav2Lip-rendered frames.
    } else {
      setStatus("Canvas stream live; Insertable Streams unavailable in this browser");
    }

    setStream(canvasStream);
    setIsLive(true);
    return { stream: canvasStream, track };
  }

  function stop() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsLive(false);
    setStatus("Stopped");
  }

  React.useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return { isLive, status, stream, start, stop, browserSupportsInsertableStreams };
}
