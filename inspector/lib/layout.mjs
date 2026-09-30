import ELK from "elkjs/lib/elk.bundled.js";
import { repairRoutes } from "./route-repair.mjs";
import { buildClusters } from "./clusters.mjs";

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 148;

export function diagramEdges(catalog, mode = "control") {
  if (mode === "control")
    return catalog.edges.map((e) => ({ ...e, mappingIds: [] }));
  const ids = new Set(catalog.nodes.map((n) => n.id));
  const pairs = new Map();
  for (const m of catalog.mappings) {
    if (!ids.has(m.source) || !ids.has(m.target)) continue;
    const key = `${m.source}:${m.target}`;
    if (!pairs.has(key))
      pairs.set(key, {
        id: m.id,
        source: m.source,
        target: m.target,
        mappingIds: [],
      });
    pairs.get(key).mappingIds.push(m.id);
  }
  return [...pairs.values()].map((e) => ({
    ...e,
    label: `${e.mappingIds.length} field mapping${e.mappingIds.length === 1 ? "" : "s"}`,
  }));
}

export async function buildLayout(catalog, mode = "control", overrides = {}) {
  const edges = diagramEdges(catalog, mode);
  const elk = new ELK();
  const graph = await elk.layout({
    id: "workflow",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.padding": "[top=60,left=60,bottom=60,right=60]",
      "elk.spacing.nodeNode": "70",
      "elk.spacing.edgeNode": "30",
      "elk.spacing.edgeEdge": "18",
      "elk.layered.spacing.nodeNodeBetweenLayers": "85",
      "elk.layered.spacing.edgeNodeBetweenLayers": "25",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "18",
      // The unlimited canvas does not need row wrapping. Preserve forward
      // progress instead of bending a sequence back around earlier cards.
      "elk.layered.wrapping.strategy": "OFF",
      "elk.randomSeed": "7",
      ...overrides,
    },
    children: [...catalog.nodes]
      .sort((a, b) => a.order - b.order)
      .map((n) => ({
        id: n.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
      labels:
        e.label === "Continue"
          ? []
          : [
              {
                text: e.label,
                width: e.label.length * 7 + 22,
                height: 26,
                layoutOptions: { "elk.edgeLabels.placement": "CENTER" },
              },
            ],
    })),
  });
  const routes = new Map(graph.edges.map((e) => [e.id, e]));
  const result = repairRoutes({
    width: graph.width,
    height: graph.height,
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    nodes: graph.children.map(({ id, x, y, width, height }) => ({
      id,
      x,
      y,
      width,
      height,
    })),
    edges: edges.map((e) => ({
      ...e,
      sections: routes.get(e.id).sections,
      labels: routes.get(e.id).labels || [],
    })),
  });
  result.clusters = buildClusters(catalog, result);
  return result;
}
