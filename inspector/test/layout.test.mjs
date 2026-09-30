import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCatalog } from "../lib/catalog.mjs";
import { buildLayout } from "../lib/layout.mjs";
import { onBoundary, crossesBox } from "../lib/route-repair.mjs";
let catalog, control, data;
before(async () => {
  catalog = buildCatalog(
    await readFile(
      new URL("../../mednetstructure.json", import.meta.url),
      "utf8",
    ),
  );
  control = await buildLayout(catalog);
  data = await buildLayout(catalog, "data");
});
const overlaps = (a, b) =>
  a.x < b.x + b.width - 0.01 &&
  a.x + a.width > b.x + 0.01 &&
  a.y < b.y + b.height - 0.01 &&
  a.y + a.height > b.y + 0.01;
test("connection layout retains every node, route and condition", () => {
  assert.equal(control.nodes.length, 88);
  assert.equal(control.edges.length, 111);
  assert.deepEqual(
    new Set(control.nodes.map((n) => n.id)),
    new Set(catalog.nodes.map((n) => n.id)),
  );
  for (const e of control.edges) {
    const source = catalog.edges.find((s) => s.id === e.id);
    assert.equal(e.source, source.source);
    assert.equal(e.target, source.target);
    assert.equal(e.label, source.label);
    if (source.label !== "Continue")
      assert.equal(e.labels[0].text, source.label);
  }
});
test("process flow progresses strictly left to right without artificial row wrapping", () => {
  const nodes = new Map(control.nodes.map((node) => [node.id, node]));
  for (const edge of control.edges) {
    const source = nodes.get(edge.source),
      target = nodes.get(edge.target);
    assert.ok(
      target.x >= source.x + source.width,
      `${edge.id} reverses direction`,
    );
    for (const section of edge.sections) {
      const points = [
        section.startPoint,
        ...(section.bendPoints || []),
        section.endPoint,
      ];
      for (let i = 1; i < points.length; i++)
        assert.ok(
          points[i].x >= points[i - 1].x - 0.01,
          `${edge.id} has a backward detour`,
        );
    }
  }
});
test("cards do not overlap and every routed line attaches to its real endpoints without crossing cards", () => {
  for (const layout of [control, data]) {
    for (const [i, n] of layout.nodes.entries())
      for (const m of layout.nodes.slice(i + 1))
        assert.ok(!overlaps(n, m), `Card collision: ${n.id} / ${m.id}`);
    const nodes = new Map(layout.nodes.map((n) => [n.id, n]));
    for (const e of layout.edges) {
      assert.ok(
        onBoundary(e.sections[0].startPoint, nodes.get(e.source)),
        `Wrong source ${e.id}`,
      );
      assert.ok(
        onBoundary(e.sections.at(-1).endPoint, nodes.get(e.target)),
        `Wrong target ${e.id}`,
      );
      for (const s of e.sections) {
        const ps = [s.startPoint, ...(s.bendPoints || []), s.endPoint];
        for (let i = 1; i < ps.length; i++) {
          const a = ps[i - 1],
            b = ps[i];
          assert.ok(
            Math.abs(a.x - b.x) < 0.01 || Math.abs(a.y - b.y) < 0.01,
            `Diagonal ${e.id}`,
          );
          for (const p of [a, b])
            assert.ok(
              p.x >= 0 &&
                p.y >= 0 &&
                p.x <= layout.width &&
                p.y <= layout.height,
              `Out-of-bounds route ${e.id}`,
            );
          for (const n of layout.nodes.filter(
            (n) => n.id !== e.source && n.id !== e.target,
          ))
            assert.ok(!crossesBox(a, b, n), `Route ${e.id} crosses ${n.id}`);
        }
      }
      for (const label of e.labels)
        for (const n of layout.nodes)
          assert.ok(
            !overlaps(label, n),
            `Route label covers node: ${e.id} / ${n.id}`,
          );
    }
  }
});
test("data bundles preserve all available endpoint mappings individually", () => {
  const ids = new Set(catalog.nodes.map((n) => n.id));
  const expected = catalog.mappings.filter(
    (m) => ids.has(m.source) && ids.has(m.target),
  );
  assert.equal(data.edges.flatMap((e) => e.mappingIds).length, expected.length);
  assert.deepEqual(
    new Set(data.edges.flatMap((e) => e.mappingIds)),
    new Set(expected.map((m) => m.id)),
  );
});
test("changing editorial stages cannot change the graph geometry", async () => {
  const shuffled = await buildLayout({
    ...catalog,
    nodes: catalog.nodes.map((n) => ({ ...n, stage: "unassigned" })),
  });
  assert.deepEqual(shuffled.nodes, control.nodes);
  assert.deepEqual(shuffled.edges, control.edges);
});
