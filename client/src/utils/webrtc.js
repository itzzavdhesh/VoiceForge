// webrtc.js - Utility for chunking data over WebRTC DataChannel

const CHUNK_SIZE = 16 * 1024; // 16 KB

export async function sendDataInChunks(dataChannel, data) {
  dataChannel.binaryType = 'arraybuffer';
  const jsonStr = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonStr);

  // Send metadata (total size)
  dataChannel.send(JSON.stringify({ type: "metadata", size: bytes.length }));

  let offset = 0;
  return new Promise((resolve, reject) => {
    const sendChunk = () => {
      while (offset < bytes.length) {
        if (
          dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold
        ) {
          dataChannel.onbufferedamountlow = () => {
            dataChannel.onbufferedamountlow = null;
            sendChunk();
          };
          return;
        }

        const chunk = bytes.slice(offset, offset + CHUNK_SIZE);
        dataChannel.send(chunk);
        offset += chunk.length;
      }
      // Send EOF
      dataChannel.send(JSON.stringify({ type: "eof" }));
      resolve();
    };

    if (dataChannel.readyState === "open") {
      sendChunk();
    } else {
      dataChannel.onopen = sendChunk;
    }
  });
}

export function receiveDataInChunks(dataChannel, onComplete) {
  dataChannel.binaryType = 'arraybuffer';
  let expectedSize = 0;
  let receivedBytes = [];
  let currentSize = 0;

  dataChannel.onmessage = (event) => {
    if (typeof event.data === "string") {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "metadata") {
          expectedSize = msg.size;
        } else if (msg.type === 'eof') {
          // Reconstruct
          const totalBuffer = new Uint8Array(currentSize);
          let offset = 0;
          for (const chunk of receivedBytes) {
            totalBuffer.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
          }
          const decoder = new TextDecoder();
          const jsonStr = decoder.decode(totalBuffer);
          const data = JSON.parse(jsonStr);
          onComplete(data);
        }
      } catch (e) {
        // Not JSON, ignore or error
      }
    } else {
      // ArrayBuffer chunk
      receivedBytes.push(event.data);
      currentSize += event.data.byteLength;
    }
  };
export function monitorPeerConnection(pc, onError) {
  if (!pc) return;
  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
      onError?.(new Error(`WebRTC ICE connection state: ${pc.iceConnectionState}`));
    }
  };
}

export function waitForICEConnection(peerConnection, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (
      peerConnection.iceConnectionState === "connected" ||
      peerConnection.iceConnectionState === "completed"
    ) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      peerConnection.removeEventListener("iceconnectionstatechange", onChange);
      reject(new Error("WebRTC ICE negotiation timed out — check network firewall settings."));
    }, timeoutMs);

    function onChange() {
      const state = peerConnection.iceConnectionState;
      if (state === "connected" || state === "completed") {
        clearTimeout(timer);
        peerConnection.removeEventListener("iceconnectionstatechange", onChange);
        resolve();
      } else if (state === "failed" || state === "closed") {
        clearTimeout(timer);
        peerConnection.removeEventListener("iceconnectionstatechange", onChange);
        reject(new Error(`WebRTC ICE connection failed with state: ${state}`));
      }
    }

    peerConnection.addEventListener("iceconnectionstatechange", onChange);
  });
}
