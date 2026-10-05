import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCatalog } from "../lib/catalog.mjs";
import { buildPhaseLayouts, omitScenarioHarness } from "../lib/phases.mjs";
import { crossesBox, onBoundary } from "../lib/route-repair.mjs";

test("focused intake skips only scenario setup, retaining exact source provenance and truthful mappings", async () => {
  const catalog = buildCatalog(
    await readFile(
      new URL("../../mednetstructure.json", import.meta.url),
      "utf8",
    ),
  );
  const original = JSON.stringify(catalog);
  const harness = catalog.nodes.find((n) => n.name.startsWith("TEST-00 "));
  const visible = omitScenarioHarness(catalog);
  assert.equal(visible.nodes.length, 88);
  assert.equal(visible.edges.length, 111);
  assert.equal(visible.stats.nodes, visible.nodes.length);
  assert.equal(visible.stats.edges, visible.edges.length);
  assert.equal(visible.stats.mappings, visible.mappings.length);
  assert.ok(!visible.nodes.some((n) => n.id === harness.id));
  assert.ok(!visible.allFields.some((f) => f.nodeId === harness.id));
  assert.ok(
    !visible.mappings.some(
      (m) => m.source === harness.id || m.target === harness.id,
    ),
  );
  assert.ok(
    !visible.edges.some(
      (e) => e.source === harness.id || e.target === harness.id,
    ),
  );
  assert.equal(omitScenarioHarness(visible), visible);
  assert.equal(visible.sourceHash, catalog.sourceHash);
  const phases = await buildPhaseLayouts(catalog, true);
  assert.equal(JSON.stringify(catalog), original);
  for (const mode of ["control", "data"]) {
    const diagram = phases.intake[mode];
    assert.deepEqual(diagram.hiddenNodeIds, [harness.id]);
    assert.ok(!diagram.nodes.some((n) => n.id === harness.id));
    assert.ok(
      !diagram.edges.some(
        (e) => e.source === harness.id || e.target === harness.id,
      ),
    );
    const core = diagram.nodes
      .filter((n) => !n.isBoundary)
      .map((n) => n.id)
      .sort();
    assert.deepEqual(
      core,
      catalog.nodes
        .filter((n) => n.stage === "intake" && n.id !== harness.id)
        .map((n) => n.id)
        .sort(),
    );
    for (const edge of diagram.edges) {
      const source = diagram.nodes.find((n) => n.id === edge.source),
        target = diagram.nodes.find((n) => n.id === edge.target);
      assert.ok(onBoundary(edge.sections[0].startPoint, source));
      assert.ok(onBoundary(edge.sections.at(-1).endPoint, target));
      for (const section of edge.sections) {
        const points = [
          section.startPoint,
          ...(section.bendPoints || []),
          section.endPoint,
        ];
        for (let i = 1; i < points.length; i++)
          for (const node of diagram.nodes.filter(
            (n) => n !== source && n !== target,
          ))
            assert.ok(!crossesBox(points[i - 1], points[i], node));
      }
    }
  }
  const bridge = phases.intake.control.edges.find(
    (e) => e.hiddenNodeIds?.length,
  );
  const originals = bridge.sourceEdgeIds.map((id) =>
    catalog.edges.find((e) => e.id === id),
  );
  assert.equal(originals[0].source, bridge.source);
  assert.equal(originals[0].target, harness.id);
  assert.equal(originals[1].source, harness.id);
  assert.equal(originals[1].target, bridge.target);
  for (const edge of phases.intake.data.edges)
    for (const id of edge.mappingIds) {
      const mapping = catalog.mappings.find((m) => m.id === id);
      assert.equal(mapping.source, edge.source);
      assert.equal(mapping.target, edge.target);
    }
});
