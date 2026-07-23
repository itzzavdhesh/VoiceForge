import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Enforce JWT secrets at startup to prevent fallback string vulnerabilities
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const PBKDF2_ITERATIONS = 310000;

if (
  !JWT_SECRET ||
  !JWT_REFRESH_SECRET ||
  JWT_SECRET === "replace_with_a_secure_jwt_access_secret_string" ||
  JWT_REFRESH_SECRET === "replace_with_a_secure_jwt_refresh_secret_string"
) {
  throw new Error(
    "CRITICAL CONFIGURATION ERROR: Both JWT_SECRET and JWT_REFRESH_SECRET environment variables must be defined and changed from placeholder values."
  );
}

/**
 * Hashes a plain-text password using pbkdf2.
 * @param {string} password
 * @returns {string} The formatted salt:hash string.
 */
export function hashPassword(password) {
  if (typeof password !== "string") {
    throw new TypeError("Password must be a string");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain-text password against a stored salt:hash string.
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean} True if the password matches, false otherwise.
 */
export function verifyPassword(password, storedHash) {
  if (typeof password !== "string") {
    throw new TypeError("Password must be a string");
  }
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, "sha512").toString("hex");
  return testHash === hash;
}

/**
 * Generates a short-lived JWT access token.
 * @param {object} user - User object containing id and username.
 * @returns {string} The JWT access token.
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Generates a long-lived JWT refresh token.
 * @param {object} user - User object containing id and username.
 * @returns {string} The JWT refresh token.
 */
export function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verifies a JWT access token.
 * @param {string} token
 * @returns {object} The decoded token payload.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verifies a JWT refresh token.
 * @param {string} token
 * @returns {object} The decoded token payload.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
