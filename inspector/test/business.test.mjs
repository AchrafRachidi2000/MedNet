import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCatalog } from "../lib/catalog.mjs";
import { buildBusinessCatalog } from "../lib/business.mjs";
import { addNodeDetails } from "../lib/node-details.mjs";
import { buildPhaseLayouts } from "../lib/phases.mjs";
import { buildLayout } from "../lib/layout.mjs";
import { onBoundary, crossesBox } from "../lib/route-repair.mjs";
let technical, business, phaseLayouts, businessLayout;
before(async () => {
  technical = buildCatalog(
    await readFile(
      new URL("../../mednetstructure.json", import.meta.url),
      "utf8",
    ),
  );
  business = buildBusinessCatalog(technical);
  addNodeDetails(technical, business);
  businessLayout = await buildLayout(business);
  phaseLayouts = await buildPhaseLayouts(business);
});
test("business steps account for all technical work without invented paths", () => {
  assert.equal(business.nodes.length, 28);
  assert.equal(business.edges.length, 42);
  const owner = new Map();
  for (const node of business.nodes)
    for (const id of node.technicalNodeIds) {
      assert.ok(!owner.has(id));
      owner.set(id, node.id);
    }
  assert.equal(owner.size, 88);
  const mapped = [];
  for (const edge of business.edges)
    for (const id of edge.technicalEdgeIds) {
      const source = technical.edges.find((e) => e.id === id);
      assert.equal(owner.get(source.source), edge.source);
      assert.equal(owner.get(source.target), edge.target);
      mapped.push(id);
    }
  const expected = technical.edges.filter(
    (e) => owner.get(e.source) !== owner.get(e.target),
  );
  assert.equal(mapped.length, expected.length);
  assert.deepEqual(new Set(mapped), new Set(expected.map((e) => e.id)));
  for (const n of business.nodes) {
    assert.ok(n.businessInput && n.businessOutput);
    assert.ok(!/API-|EXIT-|SUB-|C-\d|A-\d/.test(n.title + n.summary));
  }
});
test("every business step explains concrete information, checks, outputs and limitations", () => {
  for (const n of business.nodes) {
    const d = n.businessDetails;
    assert.ok(d.purpose.length > 70, n.id);
    for (const key of ["inputs", "outputs"])
      for (const [label, description] of d[key]) {
        assert.ok(
          label.length > 3 && description.length > 30,
          `${n.id}: ${key}`,
        );
      }
    assert.ok(
      d.inputs.length && d.outputs.length && d.checks.length >= 2,
      n.id,
    );
    assert.ok(d.outcomes.length && d.caveats.length, n.id);
    assert.ok(n.searchText.includes(d.checks[0].toLowerCase()), n.id);
  }
  const check = business.nodes.find(
    (n) => n.id === "intake-ready",
  ).businessDetails;
  assert.match(check.checks.join(" "), /claim reference/);
  assert.match(check.checks.join(" "), /none has a usable download/);
  const identify = business.nodes.find(
    (n) => n.id === "identify",
  ).businessDetails;
  assert.match(identify.checks.join(" "), /18-digit/);
  assert.match(identify.checks.join(" "), /sanction/);
  assert.match(identify.checks.join(" "), /receipt date/);
});
test("all technical nodes have a single-page explanation and explicit external service coverage", () => {
  for (const n of technical.nodes) {
    assert.ok(n.explanation.actions.length, n.name);
    assert.ok(
      business.nodes.some((b) => b.id === n.explanation.businessStepId),
    );
    if (
      /requests\.(get|post|request)/.test(n.process.code || "") ||
      n.missingInternal ||
      n.type === "integration"
    ) {
      const e = n.explanation.external;
      assert.ok(e?.service && e.purpose && e.sends && e.returns, n.name);
    }
  }
  // Guard the important source distinctions against accidentally reverting to
  // the older narrative while the implementation still says otherwise.
  const source = (prefix) =>
    technical.nodes.find((n) => n.name.startsWith(prefix + " ")).process.code;
  assert.match(source("C-05"), /drop = False; possible = True/);
  assert.match(source("EXIT-03"), /req = \[\]/);
  assert.match(source("TEMP-01"), /METLIFE_EXCLUDED = \{284, 405, 501\}/);
  assert.match(source("EXIT-07"), /policy_not_in_force/);
});
test("every phase contains exactly its business steps and explicit cross-phase links", () => {
  assert.equal(Object.keys(phaseLayouts).length, 9);
  for (const stage of business.stages) {
    const layout = phaseLayouts[stage.id].control;
    const core = business.nodes.filter((n) => n.stage === stage.id);
    assert.deepEqual(
      new Set(layout.nodes.filter((n) => !n.isBoundary).map((n) => n.id)),
      new Set(core.map((n) => n.id)),
    );
    const ids = new Set(core.map((n) => n.id));
    assert.deepEqual(
      new Set(layout.edges.map((e) => e.id)),
      new Set(
        business.edges
          .filter((e) => ids.has(e.source) || ids.has(e.target))
          .map((e) => e.id),
      ),
    );
    assert.ok(layout.clusters.every((c) => c.stage === stage.id));
  }
});
test("business and phase paths are attached and never cross cards", () => {
  for (const layout of [
    businessLayout,
    ...Object.values(phaseLayouts).map((p) => p.control),
  ]) {
    const nodes = new Map(layout.nodes.map((n) => [n.id, n]));
    for (const e of layout.edges) {
      assert.ok(onBoundary(e.sections[0].startPoint, nodes.get(e.source)));
      assert.ok(onBoundary(e.sections.at(-1).endPoint, nodes.get(e.target)));
      for (const section of e.sections) {
        const ps = [
          section.startPoint,
          ...(section.bendPoints || []),
          section.endPoint,
        ];
        for (let i = 1; i < ps.length; i++)
          for (const n of layout.nodes.filter(
            (n) => n.id !== e.source && n.id !== e.target,
          ))
            assert.ok(!crossesBox(ps[i - 1], ps[i], n));
      }
    }
    for (const c of layout.clusters)
      for (const n of layout.nodes.filter((n) => !c.nodeIds.includes(n.id)))
        assert.ok(
          !(
            c.x < n.x + n.width &&
            c.x + c.width > n.x &&
            c.y < n.y + n.height &&
            c.y + c.height > n.y
          ),
          "A colored region contains an unrelated card",
        );
  }
});
