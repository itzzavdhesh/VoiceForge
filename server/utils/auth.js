import crypto from "crypto";
import jwt from "jsonwebtoken";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Hashes a plain-text password using pbkdf2.
 * @param {string} password
 * @returns {string} The formatted salt:hash string.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a plain-text password against a stored salt:hash string.
 * @param {string} password
 * @param {string} storedHash
 * @returns {boolean} True if the password matches, false otherwise.
 */
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return testHash === hash;
}

/**
 * Generates a short-lived JWT access token.
 * @param {object} user - User object containing id and username.
 * @returns {string} The JWT access token.
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET || "default_jwt_secret",
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
    { id: user.id, username: user.username },
    process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret",
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verifies a JWT access token.
 * @param {string} token
 * @returns {object} The decoded token payload.
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret");
}

/**
 * Verifies a JWT refresh token.
 * @param {string} token
 * @returns {object} The decoded token payload.
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || "default_jwt_refresh_secret");
}
