// Server-side environment variable schema validation using Zod.
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  VOICE_ENGINE_SPACE: z
    .string()
    .min(1)
    .default("ResembleAI/Chatterbox-Multilingual-TTS"),
  MOCK_CHATTERBOX: z
    .enum(["true", "false", "1", "0", ""])
    .optional()
    .transform((val) => val === "true" || val === "1"),
  STREAM_SECRET: z.string().optional(),
  VOICE_STORE_MAX: z.coerce.number().int().min(1).default(20),
  VOICE_STORE_TTL_MS: z.coerce.number().int().min(1000).default(7200000),
  PENDING_STREAMS_MAX: z.coerce.number().int().min(1).default(1000),
  PENDING_STREAM_TTL_MS: z.coerce.number().int().min(1000).default(60000),
  MAX_VOICE_UPLOAD_BYTES: z.coerce.number().int().min(1024).default(12582912),
});

export function validateEnv(rawEnv = process.env) {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");

    const message = `[FATAL] Environment variable validation failed:\n${errorDetails}\nPlease check your .env configuration.`;
    logger.error(message);
    throw new Error(message);
  }

  return result.data;
}

// Initial fail-fast validation on startup
validateEnv(process.env);

// Proxied env object that ensures all property accesses are schema-validated
export const env = new Proxy(
  {},
  {
    get(_target, prop) {
      const validated = validateEnv(process.env);
      return validated[prop];
    },
  }
);
