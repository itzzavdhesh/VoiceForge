import Meyda from "meyda";

/**
 * Extracts Mel-spectrogram features from an HTMLMediaElement using the Web Audio API.
 * Tracks a history of mel-spectrograms for Wav2Lip ONNX real-time inference.
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.analyzer = null;
    this.currentMelSpectrogram = null;
    this.melHistory = [];
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

    // Prevent re-creating the source node if it already exists for this element
    if (!audioElement.dataset.sourceCreated) {
      this.source = this.audioContext.createMediaElementSource(audioElement);
      // Connect to destination so we can still hear it
      this.source.connect(this.audioContext.destination);
      audioElement.dataset.sourceCreated = "true";
    }

    if (this.analyzer) {
      this.analyzer.stop();
    }

    // Reset history when initialized/re-initialized
    this.melHistory = [];

    // Configure Meyda to extract the melSpectrogram with 80 bands
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: 512, // Must be a power of 2
      numberOfMelBands: 80,
      featureExtractors: ["melSpectrogram"],
      callback: (features) => {
        if (features && features.melSpectrogram) {
          this.currentMelSpectrogram = features.melSpectrogram;
          this.melHistory.push(new Float32Array(features.melSpectrogram));
          if (this.melHistory.length > 16) {
            this.melHistory.shift();
          }
        }
      },
    });

    this.analyzer.start();
  }

  /**
   * Returns the most recently extracted mel-spectrogram sliding window history.
   * Format expected by Wav2Lip ONNX is [1, 1, 80, 16] (planar array).
   * @returns {Float32Array}
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
   * Cleans up audio context and analyzer.
   */
  dispose() {
    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.melHistory = [];
  }
}
