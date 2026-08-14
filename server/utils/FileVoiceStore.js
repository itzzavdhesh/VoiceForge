import fs from "fs/promises";
import path from "path";
import { logger } from "./logger.js";

/**
 * A filesystem-backed store for voice profiles.
 * Replaces the in-memory Map to provide persistence across server restarts.
 */
export class FileVoiceStore {
  constructor(dataDir, maxVoices) {
    this.dataDir = dataDir || path.join(process.cwd(), "data");
    this.voicesDir = path.join(this.dataDir, "voices");
    this.dbPath = path.join(this.dataDir, "db.json");
    this.maxVoices = maxVoices;
    this.metadata = new Map();
    this.initPromise = this._init();
  }

  async _init() {
    try {
      await fs.mkdir(this.voicesDir, { recursive: true });
      try {
        const data = await fs.readFile(this.dbPath, "utf-8");
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          this.metadata.set(key, value);
        }
      } catch (err) {
        if (err.code !== "ENOENT") {
          logger.error({ err }, "Failed to read db.json");
        }
      }

      // Cleanup orphan audio files missing from metadata DB
      try {
        const files = await fs.readdir(this.voicesDir);
        for (const file of files) {
          if (!this.metadata.has(file)) {
            await fs.unlink(path.join(this.voicesDir, file)).catch(() => {});
          }
        }
      } catch (err) {
        logger.error({ err }, "Failed to prune orphan voice files on init");
      }
    } catch (err) {
      logger.error({ err }, "Failed to initialize FileVoiceStore");
    }
  }

  async _saveDb() {
    const obj = Object.fromEntries(this.metadata);
    await fs.writeFile(this.dbPath, JSON.stringify(obj, null, 2), "utf-8");
  }

  async set(voiceId, data) {
    await this.initPromise;
    const { audioBuffer, ...meta } = data;
    
    // Save buffer to disk
    const filePath = path.join(this.voicesDir, voiceId);
    await fs.writeFile(filePath, audioBuffer);
    
    // Save metadata
    this.metadata.set(voiceId, meta);
    await this._saveDb();
  }

  async get(voiceId) {
    await this.initPromise;
    const meta = this.metadata.get(voiceId);
    if (!meta) return undefined;
    
    try {
      const filePath = path.join(this.voicesDir, voiceId);
      const audioBuffer = await fs.readFile(filePath);
      return { ...meta, audioBuffer };
    } catch (err) {
      logger.error({ err, voiceId }, "Failed to read audio buffer for voice");
      return undefined;
    }
  }

  async has(voiceId) {
    await this.initPromise;
    return this.metadata.has(voiceId);
  }

  async delete(voiceId) {
    await this.initPromise;
    if (!this.metadata.has(voiceId)) return false;
    
    this.metadata.delete(voiceId);
    const filePath = path.join(this.voicesDir, voiceId);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== "ENOENT") {
        logger.error({ err, voiceId }, "Failed to delete voice file");
      }
    }
    
    await this._saveDb();
    return true;
  }

  get size() {
    return this.metadata.size;
  }

  async prune(now = Date.now()) {
    await this.initPromise;
    let changed = false;

    // Remove expired
    for (const [voiceId, entry] of this.metadata.entries()) {
      if (entry.expiresAt <= now) {
        this.metadata.delete(voiceId);
        changed = true;
        try {
          await fs.unlink(path.join(this.voicesDir, voiceId));
        } catch (e) {}
      }
    }

    // Enforce max size
    while (this.metadata.size > this.maxVoices) {
      const oldestVoiceId = this.metadata.keys().next().value;
      if (!oldestVoiceId) break;
      this.metadata.delete(oldestVoiceId);
      changed = true;
      try {
        await fs.unlink(path.join(this.voicesDir, oldestVoiceId));
      } catch (e) {}
    }

    if (changed) {
      await this._saveDb();
    }
  }
}
