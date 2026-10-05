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
  assert.equal(control.nodes.length, 89);
  assert.equal(control.edges.length, 112);
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
test("long process flows use balanced short runs with consistent direction inside each run", () => {
  const nodes = new Map(control.nodes.map((node) => [node.id, node]));
  assert.ok(control.width < 8000, "must not return to a 30,000px strip");
  assert.ok(
    control.width / control.height > 0.5 && control.width / control.height < 2,
  );
  assert.ok(control.flowRuns.length > 1);
  const runById = new Map(
    control.flowRuns.flatMap((run, index) =>
      run.nodeIds.map((id) => [id, { index, direction: run.direction }]),
    ),
  );
  assert.equal(runById.size, control.nodes.length);
  for (const edge of control.edges) {
    const source = nodes.get(edge.source),
      target = nodes.get(edge.target);
    const a = runById.get(source.id),
      b = runById.get(target.id);
    assert.ok(b.index >= a.index, "process cannot return to an earlier run");
    if (a.index === b.index)
      assert.ok(
        a.direction === "right"
          ? target.x >= source.x + source.width
          : target.x + target.width <= source.x,
      );
  }
});

test("a folded sequence connects adjacent runs at nearby top and bottom ports", async () => {
  const nodes = Array.from({ length: 10 }, (_, i) => ({
    id: String(i),
    order: i,
    stage: "sequence",
  }));
  const edges = nodes
    .slice(1)
    .map((n, i) => ({
      id: `edge-${i}`,
      source: String(i),
      target: n.id,
      label: "Continue",
    }));
  const diagram = await buildLayout({
    nodes,
    edges,
    mappings: [],
    stages: [{ id: "sequence" }],
  });
  const runById = new Map(
    diagram.flowRuns.flatMap((r, i) => r.nodeIds.map((id) => [id, i])),
  );
  for (const e of diagram.edges.filter(
    (e) => runById.get(e.source) !== runById.get(e.target),
  )) {
    const a = diagram.nodes.find((n) => n.id === e.source),
      b = diagram.nodes.find((n) => n.id === e.target);
    const section = e.sections[0];
    assert.equal(section.startPoint.y, a.y + a.height);
    assert.equal(section.endPoint.y, b.y);
    const p = [
      section.startPoint,
      ...(section.bendPoints || []),
      section.endPoint,
    ];
    const length = p
      .slice(1)
      .reduce(
        (sum, x, i) => sum + Math.abs(x.x - p[i].x) + Math.abs(x.y - p[i].y),
        0,
      );
    const direct =
      Math.abs(p.at(-1).x - p[0].x) + Math.abs(p.at(-1).y - p[0].y);
    assert.ok(length <= direct * 1.1, "no long return around the previous run");
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
