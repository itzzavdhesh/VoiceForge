export async function extractAudioFromFile(file) {
  // If it's already an audio file, just return it along with its duration
  if (file.type.startsWith("audio/")) {
    const duration = await getAudioDuration(file);
    return { blob: file, duration };
  }

  // If it's a video file, decode it using Web Audio API
  if (file.type.startsWith("video/")) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio API not supported in this browser.");
    
    const ctx = new AudioContextClass();
    const arrayBuffer = await file.arrayBuffer();
    
    try {
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWav(audioBuffer);
      return { blob: wavBlob, duration: Math.round(audioBuffer.duration) };
    } catch (err) {
      throw new Error("Failed to extract audio track from video. " + err.message);
    }
  }

  throw new Error("Unsupported file type. Please upload an audio or video file.");
}

function getAudioDuration(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio metadata"));
    };
    audio.src = url;
  });
}

function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const result = new Float32Array(buffer.length * numChannels);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      result[i * numChannels + channel] = channelData[i];
    }
  }
  
  const dataLength = result.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  const offset = 44;
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([view], { type: 'audio/wav' });
}
