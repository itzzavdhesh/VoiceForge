import test from "node:test";
import assert from "node:assert/strict";
import { getDatabase } from "../utils/db.js";
import { createRequest, createResponse, invoke } from "./helpers.js";
import { register, login, refresh } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import jwt from "jsonwebtoken";

test("Authentication flow tests", async (t) => {
  const db = await getDatabase();
  const testUsername = `user_${Date.now()}`;
  const testPassword = "securePassword123";
  let savedRefreshToken;
  let savedAccessToken;

  // Cleanup test users after tests run
  t.after(async () => {
    await db.run("DELETE FROM users WHERE username LIKE 'user_%'");
  });

  await t.test("Register: successfully registers a new user", async () => {
    const req = createRequest({
      body: { username: testUsername, password: testPassword }
    });
    const res = createResponse();

    const err = await invoke(register, req, res);
    assert.equal(err, undefined);
    assert.ok(res.jsonBody.accessToken, "Should return an access token");
    assert.ok(res.jsonBody.refreshToken, "Should return a refresh token");
    assert.equal(res.jsonBody.user.username, testUsername);
    
    // Save tokens for downstream tests
    savedAccessToken = res.jsonBody.accessToken;
    savedRefreshToken = res.jsonBody.refreshToken;
  });

  await t.test("Register: fails when username already exists", async () => {
    const req = createRequest({
      body: { username: testUsername, password: testPassword }
    });
    const res = createResponse();

    await invoke(register, req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonBody.error, "Username is already taken");
  });

  await t.test("Register: fails when missing username or password", async () => {
    const req = createRequest({
      body: { username: "", password: testPassword }
    });
    const res = createResponse();

    await invoke(register, req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonBody.error, "Username and password are required");
  });

  await t.test("Login: successfully logs in with correct credentials", async () => {
    const req = createRequest({
      body: { username: testUsername, password: testPassword }
    });
    const res = createResponse();

    const err = await invoke(login, req, res);
    assert.equal(err, undefined);
    assert.equal(res.statusCode, 200);
    assert.ok(res.jsonBody.accessToken, "Should return access token");
    assert.ok(res.jsonBody.refreshToken, "Should return refresh token");
  });

  await t.test("Login: fails with incorrect password", async () => {
    const req = createRequest({
      body: { username: testUsername, password: "wrongPassword" }
    });
    const res = createResponse();

    await invoke(login, req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonBody.error, "Invalid credentials");
  });

  await t.test("Refresh Token: successfully issues a new access token", async () => {
    const req = createRequest({
      body: { refreshToken: savedRefreshToken }
    });
    const res = createResponse();

    const err = await invoke(refresh, req, res);
    assert.equal(err, undefined);
    assert.equal(res.statusCode, 200);
    assert.ok(res.jsonBody.accessToken, "Should return a new access token");
  });

  await t.test("Refresh Token: fails with invalid refresh token", async () => {
    const req = createRequest({
      body: { refreshToken: "invalid-refresh-token" }
    });
    const res = createResponse();

    await invoke(refresh, req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonBody.error, "Invalid or expired refresh token");
  });

  await t.test("Auth Middleware: passes with valid access token", async () => {
    const req = createRequest({
      headers: { Authorization: `Bearer ${savedAccessToken}` }
    });
    const res = createResponse();

    let calledNext = false;
    authMiddleware(req, res, () => {
      calledNext = true;
    });

    assert.ok(calledNext, "next() should have been called");
    assert.equal(req.user.username, testUsername);
  });

  await t.test("Auth Middleware: fails when no token is provided", async () => {
    const req = createRequest({
      headers: {}
    });
    const res = createResponse();

    let calledNext = false;
    authMiddleware(req, res, () => {
      calledNext = true;
    });

    assert.ok(!calledNext, "next() should not be called");
    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonBody.error, "Unauthorized: No token provided");
  });

  await t.test("Auth Middleware: fails with invalid/malformed token", async () => {
    const req = createRequest({
      headers: { Authorization: "Bearer invalid-token" }
    });
    const res = createResponse();

    let calledNext = false;
    authMiddleware(req, res, () => {
      calledNext = true;
    });

    assert.ok(!calledNext, "next() should not be called");
    assert.equal(res.statusCode, 401);
    assert.equal(res.jsonBody.error, "Unauthorized: Invalid or expired token");
  });
});
