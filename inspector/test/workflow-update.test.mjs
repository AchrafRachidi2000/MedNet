import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCatalog } from "../lib/catalog.mjs";
import { buildBusinessCatalog } from "../lib/business.mjs";
import { addNodeDetails } from "../lib/node-details.mjs";
import { omitScenarioHarness, buildPhaseLayouts } from "../lib/phases.mjs";

const source = buildCatalog(
  await readFile(
    new URL("../../mednetstructure.json", import.meta.url),
    "utf8",
  ),
);
const business = buildBusinessCatalog(source);
addNodeDetails(source, business);
const node = (prefix) =>
  source.nodes.find((n) => n.name.startsWith(prefix + " "));

test("updated FX node belongs to invoice phase and inpatient upload path only", async () => {
  const fx = node("C-03"),
    gate = node("C-10"),
    ip = node("API-011"),
    op = node("API-012");
  assert.equal(fx.stage, "invoices");
  assert.equal(
    fx.explanation.external.service,
    "OANDA historical exchange-rate service",
  );
  assert.ok(
    source.edges.some(
      (e) =>
        e.source === gate.id && e.target === fx.id && e.routeId === "start_ip",
    ),
  );
  assert.ok(source.edges.some((e) => e.source === fx.id && e.target === ip.id));
  assert.ok(
    !source.edges.some((e) => e.source === fx.id && e.target === op.id),
  );
  const step = business.nodes.find((n) => n.technicalNodeIds.includes(fx.id));
  assert.equal(step.id, "upload");
  assert.match(JSON.stringify(step.businessDetails), /OANDA/);
  assert.match(JSON.stringify(step.businessDetails), /zero/);
  const visible = omitScenarioHarness(source);
  assert.ok(!visible.nodes.some((n) => n.name.startsWith("TEST-00")));
  const phases = await buildPhaseLayouts(visible, true);
  assert.ok(phases.invoices.control.nodes.some((n) => n.id === fx.id));
});

test("explanations distinguish updated mixed-page routing and actual FX fallback", () => {
  assert.match(node("R-04").process.code, /def _split_both/);
  assert.match(node("R-04").summary, /page/);
  assert.match(
    JSON.stringify(node("R-04").explanation),
    /Split a BOTH document by page/,
  );
  assert.match(node("API-011").process.code, /_est = 0\.0/);
  assert.match(JSON.stringify(node("C-03").explanation), /actually sends zero/);
  assert.match(node("API-012").process.code, /\["approvedQuantity"\] = 0/);
  assert.match(JSON.stringify(node("API-012").explanation), /quantity zero/);
});

test("updated benefits and document evidence are described without claiming live execution", () => {
  assert.match(node("A-06").process.system_prompt, /ONE CLAUSE, ONE ENTRY/);
  assert.match(
    JSON.stringify(node("A-06").explanation),
    /one entry per named benefit and setting/i,
  );
  assert.match(
    node("A-08").process.system_prompt,
    /EACH BILL HAS ITS OWN PRESCRIPTION/,
  );
  assert.match(
    JSON.stringify(node("A-08").explanation),
    /each pharmacy\/optical bill/,
  );
});
