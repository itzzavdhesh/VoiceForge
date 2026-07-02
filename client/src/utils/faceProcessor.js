import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/**
 * Handles face detection and cropping using MediaPipe.
 */
export class FaceProcessor {
  constructor() {
    this.faceLandmarker = null;
    this.isInitialized = false;
  }

  /**
   * Loads the MediaPipe FaceLandmarker model.
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create the vision task
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );
      
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: false,
        runningMode: "VIDEO",
        numFaces: 1
      });

      this.isInitialized = true;
      console.log("FaceLandmarker initialized successfully");
    } catch (error) {
      console.error("Failed to initialize FaceLandmarker:", error);
    }
  }

  /**
   * Detects face landmarks in a video frame.
   * @param {HTMLVideoElement} videoElement The source video
   * @param {number} timestamp Current timestamp for video processing
   * @returns {Object|null} Landmark data or null if not detected
   */
  detectFace(videoElement, timestamp) {
    if (!this.isInitialized || !this.faceLandmarker) return null;

    try {
      const results = this.faceLandmarker.detectForVideo(videoElement, timestamp);
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        return results.faceLandmarks[0];
      }
    } catch (error) {
      console.error("Face detection error:", error);
    }
    return null;
  }

  /**
   * A helper method to crop the lower half of the face (mouth region)
   * which is typically what Wav2Lip expects as input.
   * @param {HTMLCanvasElement} sourceCanvas The canvas containing the full frame
   * @param {Array} landmarks The detected face landmarks
   * @param {HTMLCanvasElement} targetCanvas The canvas to draw the crop onto
   * @returns {ImageData|null} The cropped image data
   */
  /**
   * Cleans up resources and closes the FaceLandmarker.
   */
  dispose() {
    if (this.faceLandmarker) {
      this.faceLandmarker.close();
      this.faceLandmarker = null;
    }
    this.isInitialized = false;
  }
}
