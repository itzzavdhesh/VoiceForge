// Captures the lip-sync canvas as a MediaStream and exposes MVP virtual-camera controls.
import React from "react";
export default function useVirtualCamera(canvasRef) {
  const [isLive, setIsLive] = React.useState(false);
  const [status, setStatus] = React.useState("Idle");
  const [stream, setStream] = React.useState(null);
  const originalTrackRef = React.useRef(null);
  const animFrameRef = React.useRef(null);

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
    originalTrackRef.current = track;

    let outputStream = canvasStream;
    let outputTrack = track;

    if (browserSupportsInsertableStreams()) {
      setStatus("Canvas stream live; Insertable Streams active");
      const processor = new MediaStreamTrackProcessor({ track });
      const generator = new MediaStreamTrackGenerator({ kind: "video" });

      const transformer = new TransformStream({
        async transform(videoFrame, controller) {
          controller.enqueue(videoFrame);
        },
      });

      processor.readable.pipeThrough(transformer).pipeTo(generator.writable);
      outputStream = new MediaStream([generator]);
      outputTrack = generator;
    } else {
      setStatus("Canvas stream live; Insertable Streams unavailable in this browser");
    }

    setStream(outputStream);
    setIsLive(true);
    return { stream: outputStream, track: outputTrack };
  }

  function stop() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (originalTrackRef.current) {
      originalTrackRef.current.stop();
      originalTrackRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsLive(false);
    setStatus("Stopped");
  }

  React.useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (originalTrackRef.current) {
        originalTrackRef.current.stop();
        originalTrackRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return { isLive, status, stream, start, stop, browserSupportsInsertableStreams };
}
