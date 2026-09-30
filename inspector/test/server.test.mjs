import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
let child, base;
before(async () => {
  child = spawn(process.execPath, ["server.mjs"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, PORT: "0" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  base = await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Test server startup timed out")),
      10000,
    );
    child.once("error", (e) => {
      clearTimeout(timeout);
      reject(e);
    });
    child.once("exit", (code) => {
      if (!base) {
        clearTimeout(timeout);
        reject(new Error("Server exited " + code));
      }
    });
    child.stdout.on("data", (chunk) => {
      const url = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (url) {
        clearTimeout(timeout);
        resolve(url[0]);
      }
    });
  });
});
after(() => child?.kill());
test("local server serves only explicit assets and inspection data", async () => {
  const response = await fetch(base + "/api/catalog");
  assert.equal(response.status, 200);
  const c = await response.json();
  assert.equal(c.nodes.length, 87);
  assert.equal(c.issues.length, 21);
  for (const path of [
    "/mednetstructure.json",
    "/package.json",
    "/lib/catalog.mjs",
    "/../mednetstructure.json",
    "/arbitrary-file",
  ])
    assert.equal((await fetch(base + path)).status, 404, path);
  for (const path of [
    "/",
    "/app.js",
    "/styles.css",
    "/map.css",
    "/mobile.css",
    "/dark.css",
    "/compact.css",
    "/sources/pdd.pdf",
    "/sources/guide.docx",
  ])
    assert.equal(
      (await fetch(base + path, { method: "HEAD" })).status,
      200,
      path,
    );
});
test("server rejects writes, foreign origins and foreign hostnames", async () => {
  assert.equal(
    (await fetch(base + "/api/catalog", { method: "POST" })).status,
    405,
  );
  assert.equal(
    (
      await fetch(base + "/api/catalog", {
        headers: { Origin: "https://example.com" },
      })
    ).status,
    403,
  );
  const foreignHostStatus = await new Promise((resolve, reject) => {
    http
      .get(
        base + "/api/catalog",
        { headers: { Host: "example.com" } },
        (response) => {
          response.resume();
          resolve(response.statusCode);
        },
      )
      .on("error", reject);
  });
  assert.equal(foreignHostStatus, 403);
  const headers = (await fetch(base)).headers;
  assert.equal(headers.get("Cross-Origin-Resource-Policy"), "same-origin");
  assert.ok(
    headers.get("Content-Security-Policy").includes("connect-src 'self'"),
  );
  assert.ok(
    headers.get("Content-Security-Policy").includes("frame-ancestors 'none'"),
  );
  assert.equal(headers.get("Cache-Control"), "no-store");
});
