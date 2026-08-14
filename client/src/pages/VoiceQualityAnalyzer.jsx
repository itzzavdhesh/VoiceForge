import React, { useState } from "react";
import { Mic2, Upload, CheckCircle, AlertTriangle } from "lucide-react";

export default function VoiceQualityAnalyzer() {
  const [file, setFile] = useState(null);
  const [snrDb, setSnrDb] = useState(null);
  const [snrRating, setSnrRating] = useState("");

  const [metrics, setMetrics] = useState({
    noise: 0,
    duration: 0,
    loudness: 0,
    clarity: 0,
    completeness: 0,
  });

  const [qualityScore, setQualityScore] = useState(0);

  /**
   * Estimate SNR by computing RMS of the loudest 20% frames (signal)
   * vs the quietest 20% frames (noise floor).
   */
  async function estimateSNR(audioFile) {
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioCtx = new OfflineAudioContext(1, 1, 44100);
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const data = decoded.getChannelData(0);
      const frameSize = 512;
      const frames = [];
      for (let i = 0; i < data.length - frameSize; i += frameSize) {
        let sumSq = 0;
        for (let j = 0; j < frameSize; j++) sumSq += data[i + j] ** 2;
        frames.push(Math.sqrt(sumSq / frameSize));
      }
      frames.sort((a, b) => a - b);
      const topIdx = Math.floor(frames.length * 0.8);
      const signalRms = frames.slice(topIdx).reduce((s, v) => s + v, 0) / (frames.length - topIdx);
      const noiseRms = frames.slice(0, Math.floor(frames.length * 0.2)).reduce((s, v) => s + v, 0) / Math.floor(frames.length * 0.2) || 1e-10;
      const snr = 20 * Math.log10(signalRms / noiseRms);
      return Math.round(snr * 10) / 10;
    } catch {
      return null;
    }
  }

  const handleUpload = async (e) => {
    const audio = e.target.files[0];
    if (!audio) return;
    setFile(audio);

    // Demo quality analysis (replace with backend/API later)
    const noise = Math.floor(Math.random() * 30) + 70;
    const duration = Math.floor(Math.random() * 25) + 75;
    const loudness = Math.floor(Math.random() * 20) + 80;
    const clarity = Math.floor(Math.random() * 25) + 70;
    const completeness = Math.floor(Math.random() * 20) + 80;
    const total = Math.round((noise + duration + loudness + clarity + completeness) / 5);

    setMetrics({ noise, duration, loudness, clarity, completeness });
    setQualityScore(total);

    // Compute real SNR from decoded audio samples
    const snr = await estimateSNR(audio);
    setSnrDb(snr);
    if (snr === null) {
      setSnrRating("Unknown");
    } else if (snr >= 20) {
      setSnrRating("Good");
    } else if (snr >= 10) {
      setSnrRating("Fair");
    } else {
      setSnrRating("Poor");
    }
  };

  const Progress = ({ title, value }) => (
    <div className="mb-5">
      <div className="flex justify-between mb-1">
        <span className="font-medium">{title}</span>
        <span>{value}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${
            value >= 80
              ? "bg-green-500"
              : value >= 60
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <Mic2 />
        Voice Quality Analyzer
      </h1>

      <p className="text-gray-500 mt-2 mb-8">
        Upload a recording to analyze its quality before cloning.
      </p>

      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-900">
        <Upload size={45} />

        <p className="mt-3">
          {file ? file.name : "Click to upload an audio recording"}
        </p>

        <input
          type="file"
          accept="audio/*"
          onChange={handleUpload}
          className="hidden"
        />
      </label>

      {file && (
        <>
          <div className="mt-10 rounded-xl border p-6 bg-white dark:bg-neutral-900 shadow">
            <h2 className="text-2xl font-semibold mb-6">
              Recording Analysis
            </h2>

            <Progress title="Background Noise" value={metrics.noise} />
            <Progress title="Recording Duration" value={metrics.duration} />
            <Progress title="Loudness" value={metrics.loudness} />
            <Progress title="Speech Clarity" value={metrics.clarity} />
            <Progress
              title="Sample Completeness"
              value={metrics.completeness}
            />

            <div className="mt-8 text-center">
              <h3 className="text-xl font-bold">Quality Score</h3>
              <div
                className={`text-6xl font-extrabold mt-3 ${
                  qualityScore >= 80 ? "text-green-500" : qualityScore >= 60 ? "text-yellow-500" : "text-red-500"
                }`}
              >
                {qualityScore}%
              </div>
              {snrDb !== null && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-sm font-semibold text-neutral-500">SNR: {snrDb} dB</span>
                  <span
                    className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                      snrRating === "Good" ? "bg-green-100 text-green-700" :
                      snrRating === "Fair" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}
                    aria-label={`Recording environment: ${snrRating}`}
                  >
                    {snrRating} environment
                  </span>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-3">
                Suggestions
              </h3>

              <ul className="space-y-2">
                {metrics.noise < 80 && (
                  <li className="flex gap-2 text-red-500">
                    <AlertTriangle size={18} />
                    Reduce background noise.
                  </li>
                )}

                {metrics.duration < 80 && (
                  <li className="flex gap-2 text-yellow-500">
                    <AlertTriangle size={18} />
                    Record a longer voice sample.
                  </li>
                )}

                {metrics.clarity < 80 && (
                  <li className="flex gap-2 text-yellow-500">
                    <AlertTriangle size={18} />
                    Speak more clearly and consistently.
                  </li>
                )}

                {qualityScore >= 80 && (
                  <li className="flex gap-2 text-green-600">
                    <CheckCircle size={18} />
                    Excellent recording! Ready for cloning.
                  </li>
                )}
              </ul>
            </div>

            <div className="mt-10">
              <button
                disabled={qualityScore < 80}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  qualityScore >= 80
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Clone Voice
              </button>

              {qualityScore < 80 && (
                <p className="text-center text-red-500 mt-3 text-sm">
                  Minimum quality score of 80% is required to clone a voice.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}