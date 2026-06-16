// Configures Multer for in-memory reference audio uploads sent to ElevenLabs.
import multer from "multer";

const ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/flac"
];

// Known magic-byte signatures for audio formats accepted by ElevenLabs.
// Each entry is { offset, bytes } where bytes is a Buffer to match at that
// position in the uploaded file.
const AUDIO_SIGNATURES = [
  // WebM / Matroska  (EBML header: 0x1A 0x45 0xDF 0xA3)
  { offset: 0, bytes: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]) },
  // WAV              (RIFF....WAVE)
  { offset: 0, bytes: Buffer.from("RIFF", "ascii") },
  // MP3 with ID3 tag
  { offset: 0, bytes: Buffer.from("ID3", "ascii") },
  // MP3 sync word    (0xFF 0xFB / 0xFF 0xFA / 0xFF 0xF3 and similar)
  { offset: 0, bytes: Buffer.from([0xff, 0xfb]) },
  { offset: 0, bytes: Buffer.from([0xff, 0xfa]) },
  { offset: 0, bytes: Buffer.from([0xff, 0xf3]) },
  { offset: 0, bytes: Buffer.from([0xff, 0xe3]) },
  // OGG              (OggS)
  { offset: 0, bytes: Buffer.from("OggS", "ascii") },
  // FLAC
  { offset: 0, bytes: Buffer.from("fLaC", "ascii") },
  // AIFF
  { offset: 0, bytes: Buffer.from("FORM", "ascii") },
  // MP4 / M4A ftyp box (bytes 4-7 are "ftyp")
  { offset: 4, bytes: Buffer.from("ftyp", "ascii") },
];

export function isValidAudioBuffer(buf) {
  if (!buf || buf.length < 12) return false;
  return AUDIO_SIGNATURES.some(({ offset, bytes }) => {
    if (buf.length < offset + bytes.length) return false;
    return buf.slice(offset, offset + bytes.length).equals(bytes);
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1,
    fields: 5,
    parts: 6
  },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new Error(
          "Invalid audio format. Allowed types: webm, wav, mp3, mp4, ogg, flac."
        )
      );
      return;
    }
    callback(null, true);
  }
});

export default upload;