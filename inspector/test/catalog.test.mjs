import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCatalog } from "../lib/catalog.mjs";
const raw = await readFile(
  new URL("../../mednetstructure.json", import.meta.url),
  "utf8",
);
const original = JSON.parse(raw),
  catalog = buildCatalog(raw);
test("catalog accounts for the complete supplied top-level graph", () => {
  assert.equal(catalog.nodes.length, 89);
  assert.equal(catalog.edges.length, 112);
  assert.equal(catalog.stats.agents, 16);
  assert.equal(catalog.stats.inputs, 355);
  assert.equal(catalog.stats.outputs, 314);
  assert.equal(catalog.stats.mappings, 331);
  assert.equal(catalog.stats.acyclic, true);
  assert.equal(new Set(catalog.nodes.map((n) => n.id)).size, 89);
  for (const n of catalog.nodes) {
    assert.ok(n.stage, n.name);
    assert.ok(n.summary, n.name);
    assert.equal(n.unannotated, false, n.name);
    assert.ok(n.order >= 0);
  }
});
test("technical titles preserve exact source names and keep explanatory aliases searchable", () => {
  for (const n of catalog.nodes) {
    const source = original.nodes.find((s) => s.id === n.id);
    assert.equal(n.title, source.data.name);
    assert.equal(n.name, source.data.name);
    assert.ok(n.explanatoryTitle);
    assert.ok(n.searchText.includes(n.explanatoryTitle.toLowerCase()));
  }
  const splitter = catalog.nodes.find((n) => n.name.startsWith("C-15"));
  assert.equal(splitter.title, "C-15 - Single Splitter");
  assert.equal(splitter.explanatoryTitle, "Route a single coding channel");
});

test("every control connection keeps its route and endpoints", () => {
  for (const e of catalog.edges) {
    assert.ok(catalog.nodes.some((n) => n.id === e.source));
    assert.ok(catalog.nodes.some((n) => n.id === e.target));
    const source = original.edges.find((s) => s.id === e.id);
    assert.equal(e.routeId, source.data.route_id || null);
    assert.equal(e.complement, !!source.data.route_complement);
  }
});
test("all agent prompt definitions are available without collapsing overrides", () => {
  for (const n of catalog.nodes.filter((n) => n.type === "agent")) {
    const source = original.nodes.find((s) => s.id === n.id);
    assert.equal(n.process.system_prompt, source.data.process.system_prompt);
    assert.equal(n.process.user_prompt, source.data.process.user_prompt);
    assert.equal(n.process.model, source.data.process.model);
  }
});
test("sub-workflow internals are explicitly unavailable", () => {
  assert.equal(catalog.stats.subworkflowCalls, 6);
  assert.equal(catalog.stats.missingWorkflows, 4);
  assert.equal(catalog.nodes.filter((n) => n.missingInternal).length, 6);
});
test("nested contracts and primary / alternative mappings are retained", () => {
  assert.ok(catalog.allFields.length > 665);
  assert.ok(catalog.allFields.some((f) => f.depth > 1));
  assert.ok(catalog.mappings.some((m) => m.kind === "alternative"));
  const a08 = catalog.nodes.find((n) => n.name.startsWith("A-08"));
  assert.ok(a08.inputs.find((f) => f.key === "doc_texts").children.length);
  assert.ok(
    catalog.issues.some(
      (i) => i.node === a08.id && i.title === "Mapping source is not declared",
    ),
  );
});
test("credentials, defaults and sample set-values do not enter the catalogue", () => {
  const serialized = JSON.stringify(catalog);
  for (const n of original.nodes)
    for (const direction of ["input", "output"])
      for (const [key, field] of Object.entries(
        n.data[direction + "_schema"]?.schema || {},
      )) {
        if (
          !/secret|password|access.?token|refresh.?token|authorization|api.?key|client.?id/i.test(
            key + " " + field.display_name,
          )
        )
          continue;
        const value =
          n.data.set_values?.[direction + "_set_values"]?.[key]?.value;
        if (typeof value === "string" && value.length >= 6)
          assert.ok(
            !serialized.includes(value),
            `Credential leaked for ${n.data.name}.${key}`,
          );
      }
  for (const n of catalog.nodes) {
    for (const c of n.configuration)
      if (c.withheld) assert.equal(c.value, null);
    for (const f of [...n.inputs, ...n.outputs])
      assert.ok(!Object.hasOwn(f.schema, "default"));
  }
  const env = catalog.nodes.find((n) => n.name.startsWith("ENV-00"));
  assert.ok(env.configuration.find((c) => c.key === "client_secret").withheld);
  const matrix = catalog.nodes
    .find((n) => n.name.startsWith("A-08"))
    .configuration.find((c) => c.key === "doc_matrix_json");
  assert.equal(matrix.withheld, false);
  assert.ok(matrix.value.length > 1000);
});
test("SLA, timeout, actual technical types and source hash are preserved", () => {
  const human = catalog.nodes.find((n) => n.type === "human");
  assert.equal(human.settings.sla, 10);
  assert.equal(human.settings.timeout, 11);
  assert.equal(human.settings.timeout_unit, "days");
  assert.equal(
    catalog.nodes.find((n) => n.name.startsWith("R-03")).type,
    "agent",
  );
  assert.match(catalog.sourceHash, /^[a-f0-9]{64}$/);
});
test("output mappings are not misclassified as undeclared inputs", () => {
  const splitter = catalog.nodes.find((n) => n.name.startsWith("C-15"));
  const mappedOutputs = catalog.mappings.filter(
    (m) => m.target === splitter.id && m.targetDirection === "outputs",
  );
  assert.equal(mappedOutputs.length, 2);
  assert.ok(mappedOutputs.every((m) => m.declared));
  assert.equal(catalog.issues.filter((i) => i.node === splitter.id).length, 0);
  assert.equal(catalog.issues.length, 21);
});
