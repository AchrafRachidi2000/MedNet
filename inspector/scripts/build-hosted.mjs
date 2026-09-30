import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  readdir,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildSnapshot } from "../lib/snapshot.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, ".vercel", "output");
const assets = [
  "index.html",
  "app.js",
  "styles.css",
  "map.css",
  "mobile.css",
  "dark.css",
  "compact.css",
];
const apiNames = ["catalog", "layout", "business"];

// Only allow known generated files. Refuse stale/unexpected output instead of
// accidentally publishing a document or a previous build's private files.
const allowed = new Set([
  "config.json",
  ...assets.map((x) => `static/${x}`),
  ...apiNames.map((x) => `static/api/${x}.json`),
]);
async function inspect(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true }).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory())
      await inspect(path.join(dir, entry.name), relative + "/");
    else if (!entry.isFile() || !allowed.has(relative))
      throw new Error(
        `Unexpected build artifact: ${relative}. Review it before building.`,
      );
  }
}
await inspect(output);
const raw = await readFile(
  path.resolve(root, "../mednetstructure.json"),
  "utf8",
).catch((e) => {
  if (e.code === "ENOENT")
    throw new Error(
      "Build locally with the approved mednetstructure.json beside inspector/. Confidential inputs are intentionally not in Git. Use the prebuilt deployment workflow.",
    );
  throw e;
});
const snapshot = await buildSnapshot(raw, { hosted: true });
await mkdir(path.join(output, "static", "api"), { recursive: true });
for (const file of assets)
  await copyFile(
    path.join(root, "public", file),
    path.join(output, "static", file),
  );
for (const name of apiNames)
  await writeFile(
    path.join(output, "static", "api", `${name}.json`),
    JSON.stringify(snapshot[name]),
  );
await writeFile(
  path.join(output, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "/(.*)",
          headers: {
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Cross-Origin-Resource-Policy": "same-origin",
            "X-Robots-Tag": "noindex, nofollow",
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
          },
          continue: true,
        },
        {
          src: "/(.*)",
          methods: ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
          status: 405,
          headers: { Allow: "GET, HEAD" },
        },
        ...apiNames.map((name) => ({
          src: `/api/${name}`,
          dest: `/api/${name}.json`,
        })),
        { src: "/", dest: "/index.html" },
        { handle: "filesystem" },
        { src: "/(.*)", status: 404 },
      ],
    },
    null,
    2,
  ),
);
console.log(
  `Prepared protected-hosting artifact: ${snapshot.catalog.nodes.length} technical nodes, ${snapshot.business.catalog.nodes.length} business steps. Original source files excluded. Verify Vercel Authentication protects ALL deployments before uploading.`,
);
