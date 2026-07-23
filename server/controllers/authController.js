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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
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

    await db.run(
      "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
      [id, username, password_hash, created_at]
    );

    const user = { id, username };
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(211 || 201).json({
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const payload = { id: user.id, username: user.username };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

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
 * Verify refresh token and issue a new access token.
 */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const payload = { id: decoded.id, username: decoded.username };
      const accessToken = generateAccessToken(payload);

      res.json({ accessToken });
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
  } catch (error) {
    next(error);
  }
}
