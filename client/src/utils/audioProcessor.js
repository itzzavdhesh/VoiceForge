import Meyda from "meyda";
import { PitchShifter } from "./pitchShifter.js";

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * Tracks a history of mel-spectrograms for Wav2Lip ONNX real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.analyser = null; // AnalyserNode for audio visualization
    this.currentMelSpectrogram = null;
    this.currentVolume = 0;
    this.bassFilter = null;
    this.midFilter = null;
    this.trebleFilter = null;
    this.pitchShifter = null;
  }

  /**
   * Initializes the audio processor with a given audio element.
   * @param {HTMLMediaElement} audioElement The <audio> or <video> element to analyze.
   */
  async initialize(audioElement) {
    if (!this.audioContext) {
      // Must be created after a user gesture
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }

    // Clean up previous source node connection to prevent memory leak
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    // Prevent re-creating the source node if it already exists for this element.
    // We map the node to the element's lifecycle using a direct property.
    if (audioElement._audioSourceNode) {
      this.source = audioElement._audioSourceNode;
      try {
        this.source.connect(this.audioContext.destination);
      } catch (e) {
        // Safe fallback if already connected
      }
    } else {
      this.source = this.audioContext.createMediaElementSource(audioElement);
      // Connect to destination so we can still hear it
      this.source.connect(this.audioContext.destination);
      audioElement._audioSourceNode = this.source;
    }

    // Reset history when initialized/re-initialized
    this.melHistory = [];

    // Configure Meyda to extract the melSpectrogram with 80 bands
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: 512, // Must be a power of 2
      featureExtractors: ["melSpectrogram", "rms"],
      callback: (features) => {
        if (features) {
          if (features.melSpectrogram) {
            this.currentMelSpectrogram = features.melSpectrogram;
          }
          if (features.rms !== undefined) {
            this.currentVolume = features.rms;
          }
        }
      },
    });

    this.analyzer.start();
  }

  /**
   * Returns real-time frequency data mapped to 5 frequency bands.
   * @returns {Uint8Array} Array of 5 frequency levels (0-255).
   */
  getFrequencyData() {
    if (!this.analyser) {
      return new Uint8Array(5).fill(0);
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    const bars = new Uint8Array(5);
    const step = Math.floor(bufferLength / 5) || 1;
    for (let i = 0; i < 5; i++) {
      bars[i] = dataArray[i * step] || 0;
    }
    return bars;
  }

  /**
   * Returns the most recently extracted mel-spectrogram.
   * Format expected by Wav2Lip ONNX is usually [batch_size, 1, 80, 16] (example).
   * @returns {Float32Array|null}
   */
  getLatestFeatures() {
    const history = this.melHistory || [];
    const flat = new Float32Array(80 * 16);
    
    // Fill the flat array in shape [1, 1, 80, 16] where time step changes fastest.
    // Flat index = b * 16 + t
    const missing = 16 - history.length;
    for (let b = 0; b < 80; b++) {
      for (let t = 0; t < 16; t++) {
        if (t >= missing) {
          const frame = history[t - missing];
          flat[b * 16 + t] = frame[b] || 0;
        } else {
          flat[b * 16 + t] = 0;
        }
      }
    }
    return flat;
  }

  /**
   * Returns the current RMS volume to drive fallback mouth animation.
   * @returns {number}
   */
  getVolume() {
    return this.currentVolume || 0;
  }

  /**
   * Returns the current time from the audio context for exact A/V synchronization.
   * @returns {number}
   */
  getAudioTime() {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  /**
   * Cleans up audio context and analyzer.
   */
  dispose() {
    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.melHistory = [];
  }

  setBass(gain) {
    if (this.bassFilter) {
      this.bassFilter.gain.value = gain;
    }
  }

  setMid(gain) {
    if (this.midFilter) {
      this.midFilter.gain.value = gain;
    }
  }

  setTreble(gain) {
    if (this.trebleFilter) {
      this.trebleFilter.gain.value = gain;
    }
  }

  setPitch(pitch) {
    if (this.pitchShifter) {
      this.pitchShifter.setPitch(pitch);
    }
  }

  setSpeed(speed, audioElement) {
    if (audioElement) {
      audioElement.playbackRate = speed;
    }
  }
}
