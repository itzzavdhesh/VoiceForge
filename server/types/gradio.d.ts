/**
 * Type definitions for the Gradio client wrapper used with Chatterbox TTS.
 */
declare module "@gradio/client" {
  /**
   * Payload for the /generate_tts_audio endpoint of the ResembleAI/Chatterbox-Multilingual-TTS space.
   */
  export type ChatterboxPredictPayload = [
    /** targetText - Text string to synthesize (max 300 chars) */
    string,
    /** languageCode - Language code string (e.g. "en", "hi") */
    string,
    /** referenceBlob - Reference audio Blob */
    Blob,
    /** exaggeration - Exaggeration intensity float (Default: 0.5) */
    number,
    /** temperature - Generation temperature float (Default: 0.8) */
    number,
    /** seed - Seed integer (0 = randomised) */
    number,
    /** cfgWeight - CFG weight / Pace factor float (Default: 0.5) */
    number,
  ];

  export interface PredictResponse {
    data: Array<{
      url: string;
      path?: string;
      orig_name?: string;
      size?: number;
      mime_type?: string;
    }>;
  }

  export interface GradioApp {
    /**
     * Submits a prediction to the Chatterbox TTS endpoint.
     */
    predict(
      endpoint: "/generate_tts_audio",
      payload: ChatterboxPredictPayload,
    ): Promise<PredictResponse>;

    /** Generic fallback for other endpoints */
    predict(endpoint: string, payload: unknown[]): Promise<PredictResponse>;
  }

  /**
   * Initializes a Gradio client for the given space.
   */
  export function client(space: string, options?: any): Promise<GradioApp>;
}
