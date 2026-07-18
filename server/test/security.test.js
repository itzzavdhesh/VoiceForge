// security.test.js - Validates security headers (CSP, COOP, COEP, Permissions-Policy) on the Express API server.

import test from "node:test";
import assert from "node:assert/strict";

// Set NODE_ENV before dynamically importing index.js so that
// app.listen() is skipped at module-evaluation time.
process.env.NODE_ENV = "test";
const { default: app } = await import("../index.js");

test("Express server injects critical security headers", async (t) => {
  // Start server on a dynamic port
  const server = app.listen(0);
  const port = server.address().port;

  t.after(() => {
    server.close();
  });

  // Fetch any API route — helmet injects headers on every response
  const response = await fetch(`http://localhost:${port}/api/voice/status`);
  const headers = response.headers;

  // Assert Content-Security-Policy (CSP) presence
  const csp = headers.get("content-security-policy");
  assert.ok(csp, "Content-Security-Policy header should be present");
  assert.ok(csp.includes("default-src 'self'"), "CSP should contain default-src 'self'");
  assert.ok(csp.includes("media-src 'self' blob:"), "CSP should contain media-src allowances");

  // Assert Permissions-Policy presence
  const permissionsPolicy = headers.get("permissions-policy");
  assert.ok(permissionsPolicy, "Permissions-Policy header should be present");
  assert.ok(
    permissionsPolicy.includes("microphone=(self)") && permissionsPolicy.includes("camera=(self)"),
    "Permissions-Policy should allow microphone and camera for self"
  );

  // Assert Cross-Origin-Opener-Policy (COOP) presence
  const coop = headers.get("cross-origin-opener-policy");
  assert.equal(coop, "same-origin", "COOP header should be same-origin");

  // Assert Cross-Origin-Embedder-Policy (COEP) presence
  const coep = headers.get("cross-origin-embedder-policy");
  assert.equal(coep, "require-corp", "COEP header should be require-corp");
});
