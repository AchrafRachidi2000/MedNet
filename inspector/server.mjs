import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildCatalog } from "./lib/catalog.mjs";
import { buildLayout } from "./lib/layout.mjs";
import { buildBusinessCatalog } from "./lib/business.mjs";
import { buildPhaseLayouts, omitScenarioHarness } from "./lib/phases.mjs";
import { addNodeDetails } from "./lib/node-details.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.dirname(root);
let port = Number(process.env.PORT || 4317);
const sourceCatalog = buildCatalog(
  await readFile(path.join(workspace, "mednetstructure.json"), "utf8"),
);
const businessCatalog = buildBusinessCatalog(sourceCatalog);
addNodeDetails(sourceCatalog, businessCatalog);
const catalog = omitScenarioHarness(sourceCatalog);
const visibleNodeIds = new Set(catalog.nodes.map((node) => node.id));
for (const node of businessCatalog.nodes) {
  node.technicalNodeIds = node.technicalNodeIds.filter((id) =>
    visibleNodeIds.has(id),
  );
}
const catalogJson = JSON.stringify(catalog);
const layoutsJson = JSON.stringify({
  control: await buildLayout(catalog),
  data: await buildLayout(catalog, "data"),
  phases: await buildPhaseLayouts(catalog, true),
});
const businessJson = JSON.stringify({
  catalog: businessCatalog,
  layout: await buildLayout(businessCatalog),
  phases: await buildPhaseLayouts(businessCatalog),
});
const assets = {
  "/": ["public/index.html", "text/html; charset=utf-8"],
  "/app.js": ["public/app.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["public/styles.css", "text/css; charset=utf-8"],
  "/map.css": ["public/map.css", "text/css; charset=utf-8"],
  "/mobile.css": ["public/mobile.css", "text/css; charset=utf-8"],
  "/dark.css": ["public/dark.css", "text/css; charset=utf-8"],
  "/compact.css": ["public/compact.css", "text/css; charset=utf-8"],
};
const docs = {
  "/sources/pdd.pdf": ["MedNet - PDD - V4.pdf", "application/pdf"],
  "/sources/guide.docx": [
    "MedNet_Workflow_Visual_Guide.docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
};
const server = http.createServer(async (req, res) => {
  const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  if (!allowedHosts.has(req.headers.host)) {
    res.writeHead(403);
    return res.end("Local access only");
  }
  if (
    req.headers.origin &&
    !new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]).has(
      req.headers.origin,
    )
  ) {
    res.writeHead(403);
    return res.end("Cross-origin access denied");
  }
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cache-Control": "no-store",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  };
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405, { ...headers, Allow: "GET, HEAD" });
    return res.end();
  }
  const url = new URL(req.url, "http://127.0.0.1");
  try {
    if (
      url.pathname === "/api/catalog" ||
      url.pathname === "/api/layout" ||
      url.pathname === "/api/business"
    ) {
      res.writeHead(200, {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
      });
      return res.end(
        req.method === "HEAD"
          ? undefined
          : url.pathname === "/api/business"
            ? businessJson
            : url.pathname === "/api/layout"
              ? layoutsJson
              : catalogJson,
      );
    }
    const asset = assets[url.pathname],
      doc = docs[url.pathname];
    if (!asset && !doc) {
      res.writeHead(404, headers);
      return res.end("Not found");
    }
    const file = asset || doc;
    const data = await readFile(path.join(asset ? root : workspace, file[0]));
    res.writeHead(200, {
      ...headers,
      "Content-Type": file[1],
      ...(doc && url.pathname.endsWith(".docx")
        ? {
            "Content-Disposition":
              'attachment; filename="MedNet_Workflow_Visual_Guide.docx"',
          }
        : {}),
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (error) {
    console.error(error.message);
    res.writeHead(500, headers);
    res.end("Unable to read local source");
  }
});
server.listen(port, "127.0.0.1", () => {
  port = server.address().port;
  console.log(
    `MedNet Workflow Inspector → http://127.0.0.1:${port}\n${catalog.stats.nodes} nodes · ${catalog.stats.edges} connections · read-only · local access only`,
  );
});
