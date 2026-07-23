import crypto from "crypto";
import { getDatabase } from "../utils/db.js";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from "../utils/auth.js";

/**
 * Register a new user.
 */
export async function register(req, res, next) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username and password must be valid strings" });
    }

    const db = await getDatabase();
    
    // Check if user already exists
    const existingUser = await db.get("SELECT id FROM users WHERE username = ?", [username]);
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const id = crypto.randomUUID();
    const password_hash = hashPassword(password);
    const created_at = new Date().toISOString();

    try {
      await db.run(
        "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
        [id, username, password_hash, created_at]
      );
    } catch (dbErr) {
      // Gracefully handle SQLite unique constraint violations (e.g., race conditions)
      if (dbErr.code === "SQLITE_CONSTRAINT" || dbErr.message?.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Username is already taken" });
      }
      throw dbErr;
    }

    const user = { id, username };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    await db.run(
      "INSERT INTO refresh_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
      [refreshToken, id, new Date().toISOString()]
    );

    res.status(201).json({
      message: "Registration successful",
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticate credentials and issue tokens.
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Username and password must be valid strings" });
    }

    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const payload = { id: user.id, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to database
    await db.run(
      "INSERT INTO refresh_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
      [refreshToken, user.id, new Date().toISOString()]
    );

    res.json({
      message: "Login successful",
      user: payload,
      accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify refresh token, rotate it, and issue a new access + refresh token pair.
 */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ error: "Refresh token is required and must be a string" });
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const db = await getDatabase();

      // Check if refresh token exists in database (has not been rotated or revoked)
      const storedToken = await db.get("SELECT token FROM refresh_tokens WHERE token = ?", [refreshToken]);
      if (!storedToken) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      // Delete the consumed refresh token
      await db.run("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);

      const payload = { id: decoded.id, username: decoded.username };
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);

      // Insert new rotated refresh token
      await db.run(
        "INSERT INTO refresh_tokens (token, user_id, created_at) VALUES (?, ?, ?)",
        [newRefreshToken, decoded.id, new Date().toISOString()]
      );

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
  } catch (error) {
    next(error);
  }
}
