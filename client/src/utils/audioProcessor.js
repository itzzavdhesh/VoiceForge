import Meyda from "meyda";

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * This is a simplified wrapper for real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.currentMelSpectrogram = null;
    this.currentVolume = 0;
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

    // Configure Meyda to extract the melSpectrogram
    // Typical Wav2Lip uses specific mel bands and FFT sizes,
    // this will need tuning to match the exact ONNX model requirements.
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
   * Returns the most recently extracted mel-spectrogram.
   * Format expected by Wav2Lip ONNX is usually [batch_size, 1, 80, 16] (example).
   * @returns {Float32Array|null}
   */
  getLatestFeatures() {
    return this.currentMelSpectrogram;
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
  }
}
