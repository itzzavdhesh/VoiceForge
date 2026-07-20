// webrtc.js - Utility for chunking data over WebRTC DataChannel

const CHUNK_SIZE = 16 * 1024; // 16 KB

export async function sendDataInChunks(dataChannel, data) {
  const jsonStr = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(jsonStr);

  // Send metadata (total size)
  dataChannel.send(JSON.stringify({ type: 'metadata', size: bytes.length }));

  let offset = 0;
  return new Promise((resolve, reject) => {
    const sendChunk = () => {
      while (offset < bytes.length) {
        if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
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
      dataChannel.send(JSON.stringify({ type: 'eof' }));
      resolve();
    };

    if (dataChannel.readyState === 'open') {
      sendChunk();
    } else {
      dataChannel.onopen = sendChunk;
    }
  });
}

export function receiveDataInChunks(dataChannel, onComplete) {
  let expectedSize = 0;
  let receivedBytes = [];
  let currentSize = 0;

  dataChannel.onmessage = (event) => {
    if (typeof event.data === 'string') {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'metadata') {
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
}
