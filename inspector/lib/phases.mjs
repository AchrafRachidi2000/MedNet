import { buildLayout, diagramEdges } from "./layout.mjs";

// Presentation-only omission: never remove the harness from the source catalog
// or invent data mappings across it. Process connectors retain their provenance.
export function omitScenarioHarness(catalog) {
  const hidden = catalog.nodes.find((node) => node.name.startsWith("TEST-00 "));
  if (!hidden) return catalog;
  const incoming = catalog.edges.filter((edge) => edge.target === hidden.id);
  const outgoing = catalog.edges.filter((edge) => edge.source === hidden.id);
  const bridges = incoming.flatMap((before) =>
    outgoing.map((after) => ({
      id: `phase-skip-${before.id}-${after.id}`,
      source: before.source,
      target: after.target,
      label:
        [before.label, after.label]
          .filter((label) => label !== "Continue")
          .join(" / ") || "Continue",
      type: before.type === "hard" && after.type === "hard" ? "hard" : "soft",
      hiddenNodeIds: [hidden.id],
      sourceEdgeIds: [before.id, after.id],
    })),
  );
  const nodes = catalog.nodes.filter((node) => node.id !== hidden.id);
  const edges = [
    ...catalog.edges.filter(
      (edge) => edge.source !== hidden.id && edge.target !== hidden.id,
    ),
    ...bridges,
  ];
  const mappings = catalog.mappings.filter(
    (mapping) => mapping.source !== hidden.id && mapping.target !== hidden.id,
  );
  const allFields = catalog.allFields.filter(
    (field) => field.nodeId !== hidden.id,
  );
  const removedMappings = new Set(
    catalog.mappings
      .filter((mapping) => !mappings.includes(mapping))
      .map((mapping) => mapping.id),
  );
  return {
    ...catalog,
    nodes,
    edges,
    mappings,
    allFields,
    omittedNodes: [{ id: hidden.id, stage: hidden.stage }],
    issues: catalog.issues.filter(
      (issue) =>
        issue.node !== hidden.id &&
        ![...removedMappings].some((id) => issue.id.startsWith(id + "-")),
    ),
    stats: {
      ...catalog.stats,
      nodes: nodes.length,
      edges: edges.length,
      inputs: nodes.reduce((sum, node) => sum + node.inputs.length, 0),
      outputs: nodes.reduce((sum, node) => sum + node.outputs.length, 0),
      nestedFields: allFields.length,
      mappings: mappings.length,
    },
  };
}

export async function buildPhaseLayouts(catalog, includeData = false) {
  const result = {};
  const focused = omitScenarioHarness(catalog);
  for (const stage of catalog.stages) {
    const hiddenNodeIds = (focused.omittedNodes || [])
      .filter((node) => node.stage === stage.id)
      .map((node) => node.id);
    result[stage.id] = {};
    for (const mode of includeData ? ["control", "data"] : ["control"]) {
      const core = new Set(
        focused.nodes.filter((n) => n.stage === stage.id).map((n) => n.id),
      );
      const edges = diagramEdges(focused, mode).filter(
        (e) => core.has(e.source) || core.has(e.target),
      );
      const ids = new Set([
        ...core,
        ...edges.flatMap((e) => [e.source, e.target]),
      ]);
      const phaseCatalog = {
        ...catalog,
        stages: [stage],
        nodes: focused.nodes
          .filter((n) => ids.has(n.id))
          .map((n) => ({ ...n, isBoundary: !core.has(n.id) })),
        edges: focused.edges.filter(
          (e) => core.has(e.source) || core.has(e.target),
        ),
        mappings: focused.mappings.filter(
          (m) => core.has(m.source) || core.has(m.target),
        ),
      };
      const layout = await buildLayout(phaseCatalog, mode);
      layout.nodes.forEach((n) => {
        n.isBoundary = !core.has(n.id);
      });
      layout.phase = stage.id;
      layout.hiddenNodeIds = hiddenNodeIds;
      result[stage.id][mode] = layout;
    }
  }
  return result;
}
