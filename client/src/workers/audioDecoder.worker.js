// audioDecoder.worker.js - Web Worker to offload CPU-bound audio decoding and resampling from the main thread.

let accumulatedBytes = new Uint8Array(0);
let lastDecodedSamples = 0;

self.onmessage = async (e) => {
  const { chunk, chunkIndex, isLast } = e.data;

  if (!chunk) {
    if (isLast) {
      self.postMessage({ status: "success", chunkIndex, pcmData: new Float32Array(0), isLast: true });
    }
    return;
  }

  // Append new chunk to accumulated bytes
  const newBytes = new Uint8Array(accumulatedBytes.length + chunk.byteLength);
  newBytes.set(accumulatedBytes);
  newBytes.set(new Uint8Array(chunk), accumulatedBytes.length);
  accumulatedBytes = newBytes;

  try {
    let audioBuffer;
    if (typeof OffscreenAudioContext !== "undefined") {
      // 1. Create a dummy OffscreenAudioContext to decode the current accumulated stream
      const ctx = new OffscreenAudioContext(1, 44100, 44100);
      const decodeBuffer = accumulatedBytes.buffer.slice(0);
      audioBuffer = await ctx.decodeAudioData(decodeBuffer);
    } else {
      throw new Error("OffscreenAudioContext not supported in this environment");
    }

    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;

    // 2. Extract new PCM samples (delta since last decode)
    const newSamplesCount = totalSamples - lastDecodedSamples;
    if (newSamplesCount > 0) {
      const newSamples = new Float32Array(newSamplesCount);
      for (let i = 0; i < newSamplesCount; i++) {
        newSamples[i] = channelData[lastDecodedSamples + i];
      }
      lastDecodedSamples = totalSamples;

      self.postMessage({
        status: "success",
        chunkIndex,
        pcmData: newSamples,
        sampleRate: audioBuffer.sampleRate,
        isLast
      }, [newSamples.buffer]);
    } else {
      self.postMessage({
        status: "success",
        chunkIndex,
        pcmData: new Float32Array(0),
        sampleRate: audioBuffer.sampleRate,
        isLast
      });
    }
  } catch (err) {
    // If decoding failed and it's the last chunk, we must report the error.
    // Otherwise, it might just be a partial chunk (waiting for more data), so we acknowledge it as pending.
    if (isLast) {
      self.postMessage({
        status: "error",
        chunkIndex,
        error: err.message || "Failed to decode final audio chunk"
      });
    } else {
      self.postMessage({
        status: "pending",
        chunkIndex
      });
    }
  }
};
