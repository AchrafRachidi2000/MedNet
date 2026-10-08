import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { buildCatalog } from "../lib/catalog.mjs";
import { omitScenarioHarness } from "../lib/phases.mjs";

const root = new URL("../", import.meta.url);
let catalog, business, config;
before(async () => {
  await promisify(execFile)(process.execPath, ["scripts/build-hosted.mjs"], {
    cwd: fileURLToPath(root),
    windowsHide: true,
  });
  catalog = JSON.parse(
    await readFile(
      new URL(".vercel/output/static/api/catalog.json", root),
      "utf8",
    ),
  );
  business = JSON.parse(
    await readFile(
      new URL(".vercel/output/static/api/business.json", root),
      "utf8",
    ),
  );
  config = JSON.parse(
    await readFile(new URL(".vercel/output/config.json", root), "utf8"),
  );
});
test("hosted artifact contains only approved assets and scrubbed snapshot endpoints", async () => {
  const files = await readdir(new URL(".vercel/output/static/", root), {
    recursive: true,
  });
  assert.deepEqual(
    files
      .filter((x) => x !== "api")
      .map((x) => x.replaceAll("\\", "/"))
      .sort(),
    [
      "index.html",
      "app.js",
      "styles.css",
      "map.css",
      "mobile.css",
      "dark.css",
      "compact.css",
      "api/catalog.json",
      "api/layout.json",
      "api/business.json",
    ].sort(),
  );
  assert.equal(catalog.nodes.length, 88);
  assert.equal(business.catalog.nodes.length, 28);
  assert.equal(catalog.hosted, true);
  assert.equal(catalog.sourceDocumentsAvailable, false);
  assert.equal(business.catalog.sourceDocumentsAvailable, false);
  assert.ok(
    !files.some((file) => /local-chat|registrations|chat-auth/.test(file)),
  );
  assert.ok(!catalog.nodes.some((n) => n.name.startsWith("TEST-00 ")));
});
test("hosted output preserves routes and security headers without a server function", () => {
  assert.equal(config.version, 3);
  assert.equal(config.routes[0].headers["Cache-Control"], "private, no-store");
  assert.ok(
    config.routes[0].headers["Content-Security-Policy"].includes(
      "frame-ancestors 'none'",
    ),
  );
  for (const name of ["catalog", "layout", "business"])
    assert.ok(
      config.routes.some(
        (r) => r.src === `/api/${name}` && r.dest === `/api/${name}.json`,
      ),
    );
  assert.equal(config.routes.at(-1).status, 404);
});

test("built graphs and node evidence stay synchronized with the current source file", async () => {
  const raw = await readFile(
    new URL("../../mednetstructure.json", import.meta.url),
    "utf8",
  );
  const hash = createHash("sha256").update(raw).digest("hex");
  const expected = omitScenarioHarness(buildCatalog(raw));
  assert.equal(catalog.sourceHash, hash);
  assert.equal(business.catalog.sourceHash, hash);
  assert.deepEqual(catalog.edges, expected.edges);
  assert.deepEqual(catalog.mappings, expected.mappings);
  assert.deepEqual(
    catalog.nodes.map((n) => n.id),
    expected.nodes.map((n) => n.id),
  );
  for (const actual of catalog.nodes) {
    const source = expected.nodes.find((n) => n.id === actual.id);
    for (const key of [
      "name",
      "title",
      "process",
      "inputs",
      "outputs",
      "routes",
      "settings",
      "configuration",
    ])
      assert.deepEqual(actual[key], source[key], `${actual.name}: ${key}`);
  }
  const layout = JSON.parse(
    await readFile(
      new URL(".vercel/output/static/api/layout.json", root),
      "utf8",
    ),
  );
  for (const mode of ["control", "data"])
    assert.deepEqual(
      new Set(layout[mode].nodes.map((n) => n.id)),
      new Set(catalog.nodes.map((n) => n.id)),
    );
  assert.deepEqual(
    new Set(business.layout.nodes.map((n) => n.id)),
    new Set(business.catalog.nodes.map((n) => n.id)),
  );
});
test("hosted snapshot contains no source credential defaults or set-values", async () => {
  const source = JSON.parse(
    await readFile(
      new URL("../../mednetstructure.json", import.meta.url),
      "utf8",
    ),
  );
  const secrets = new Set();
  function collect(value) {
    if (typeof value === "string" && value.length >= 6) secrets.add(value);
    else if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value))
        if (key !== "type") collect(item);
  }
  for (const node of source.nodes)
    for (const direction of ["input", "output"])
      for (const [key, field] of Object.entries(
        node.data[direction + "_schema"]?.schema || {},
      ))
        if (
          /secret|password|access.?token|refresh.?token|authorization|api.?key|client.?id/i.test(
            key + " " + field.display_name,
          )
        ) {
          collect(field.default);
          collect(
            node.data.set_values?.[direction + "_set_values"]?.[key]?.value,
          );
        }
  const payload = JSON.stringify({ catalog, business });
  for (const value of secrets)
    assert.ok(
      !payload.includes(value),
      "Source credential must not enter hosted output",
    );
  assert.ok(
    !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/.test(
      payload,
    ),
  );
});
