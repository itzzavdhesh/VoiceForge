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

    // Configure Meyda to extract the melSpectrogram
    // Typical Wav2Lip uses specific mel bands and FFT sizes,
    // this will need tuning to match the exact ONNX model requirements.
    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: this.source,
      bufferSize: 512, // Must be a power of 2
      featureExtractors: ["melSpectrogram"],
      callback: (features) => {
        if (features && features.melSpectrogram) {
          this.currentMelSpectrogram = features.melSpectrogram;
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
  }
}
