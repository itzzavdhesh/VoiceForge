import test from "node:test";
import assert from "node:assert";
import http from "node:http";

// Set NODE_ENV to production before importing app
process.env.NODE_ENV = "production";
const { default: app } = await import("../index.js");

function makeRequest(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path,
          method,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            server.close();
            resolve({ res, data });
          });
        }
      );
      req.on("error", (err) => {
        server.close();
        reject(err);
      });
      req.end();
    });
  });
}

test("Security Headers (Integration) - Production environment", async () => {
  const { res } = await makeRequest("/api/health");
  
  assert.strictEqual(res.statusCode, 200);

  // Content-Security-Policy should be strict
  const csp = res.headers["content-security-policy"];
  assert.ok(csp.includes("default-src 'self'"));
  assert.ok(csp.includes("worker-src 'self' blob:"));
  assert.ok(csp.includes("script-src 'self'")); // strict script-src without unsafe-inline or eval
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.ok(!csp.includes("'unsafe-eval'"));
});
