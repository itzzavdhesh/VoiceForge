// client/src/utils/wavEncoder.js
// Client-side PCM WAV Encoder for AudioBuffer slices

export function encodeWAV(audioBuffer, startOffset = 0, endOffset = null) {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  
  const startSample = Math.floor(startOffset * sampleRate);
  const endSample = endOffset === null 
    ? audioBuffer.length 
    : Math.min(audioBuffer.length, Math.floor(endOffset * sampleRate));
  
  const numSamples = Math.max(0, endSample - startSample);
  
  // Create output buffer
  const buffer = new ArrayBuffer(44 + numSamples * numChannels * 2);
  const view = new DataView(buffer);
  
  // Write WAV RIFF header
  /* ChunkID */
  writeString(view, 0, 'RIFF');
  /* ChunkSize */
  view.setUint32(4, 36 + numSamples * numChannels * 2, true);
  /* Format */
  writeString(view, 8, 'WAVE');
  
  // Write format chunk (fmt)
  /* Subchunk1ID */
  writeString(view, 12, 'fmt ');
  /* Subchunk1Size */
  view.setUint32(16, 16, true);
  /* AudioFormat (1 = PCM) */
  view.setUint16(20, 1, true);
  /* NumChannels */
  view.setUint16(22, numChannels, true);
  /* SampleRate */
  view.setUint32(24, sampleRate, true);
  /* ByteRate */
  view.setUint32(28, sampleRate * numChannels * 2, true);
  /* BlockAlign */
  view.setUint16(32, numChannels * 2, true);
  /* BitsPerSample */
  view.setUint16(34, 16, true);
  
  // Write data chunk
  /* Subchunk2ID */
  writeString(view, 36, 'data');
  /* Subchunk2Size */
  view.setUint32(40, numSamples * numChannels * 2, true);
  
  // Write PCM samples
  const channelData = [];
  for (let c = 0; c < numChannels; c++) {
    channelData.push(audioBuffer.getChannelData(c));
  }
  
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = channelData[c][startSample + i];
      // Clamp sample to [-1, 1]
      const clamped = Math.max(-1, Math.min(1, sample));
      // Convert to 16-bit PCM integer
      const pcmSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      view.setInt16(offset, pcmSample, true);
      offset += 2;
    }
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
