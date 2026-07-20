// Captures the lip-sync canvas as a MediaStream and exposes MVP virtual-camera controls.
import React from "react";
export default function useVirtualCamera(canvasRef) {
  const [isLive, setIsLive] = React.useState(false);
  const [status, setStatus] = React.useState("Idle");
  const [stream, setStream] = React.useState(null);
  const originalTrackRef = React.useRef(null);
  
  const isProcessingRef = React.useRef(false);
  const readerRef = React.useRef(null);
  const writerRef = React.useRef(null);

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

      isProcessingRef.current = true;
      const reader = processor.readable.getReader();
      const writer = generator.writable.getWriter();
      readerRef.current = reader;
      writerRef.current = writer;

      async function processFrames() {
        try {
          while (isProcessingRef.current) {
            const { done, value: videoFrame } = await reader.read();
            if (done) break;

            if (!isProcessingRef.current) {
              videoFrame.close();
              break;
            }

            if (writer.desiredSize <= 0) {
              // Backpressure: drop frame and pause to let browser catch up
              videoFrame.close();
              await new Promise((resolve) => requestAnimationFrame(resolve));
              continue;
            }

            try {
              await writer.write(videoFrame);
            } catch (err) {
              videoFrame.close();
              throw err;
            }
          }
        } catch (err) {
          console.error("Insertable streams processing error:", err);
        } finally {
          try {
            reader.releaseLock();
          } catch (e) {}
          try {
            writer.releaseLock();
          } catch (e) {}
          if (readerRef.current === reader) readerRef.current = null;
          if (writerRef.current === writer) writerRef.current = null;
        }
      }

      processFrames();

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
    isProcessingRef.current = false;
    
    if (readerRef.current) {
      try {
        readerRef.current.cancel().catch(() => {});
        readerRef.current.releaseLock();
      } catch (e) {}
      readerRef.current = null;
    }
    if (writerRef.current) {
      try {
        writerRef.current.abort().catch(() => {});
        writerRef.current.releaseLock();
      } catch (e) {}
      writerRef.current = null;
    }

    originalTrackRef.current?.stop();
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setIsLive(false);
    setStatus("Stopped");
  }

  React.useEffect(() => {
    return () => {
      isProcessingRef.current = false;
      originalTrackRef.current?.stop();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return { isLive, status, stream, start, stop, browserSupportsInsertableStreams };
}
