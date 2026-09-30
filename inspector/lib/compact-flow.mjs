// Compact long layered graphs into short alternating runs. Keep each ELK
// branch lane intact; place the next run beside the previous run's exit.
// Unlike row wrapping, a sequential turn does not travel back past every card.
export async function compactFlow(graph, elk) {
  const nodes = graph.children;
  if (nodes.length <= 6) return graph;
  const layers = [...new Set(nodes.map((n) => n.x))].sort((a, b) => a - b);
  const targetWidth = Math.max(1100, Math.sqrt(nodes.length * 260 * 148 * 7.5));
  if (graph.width <= targetWidth * 1.25) return graph;
  const rank = new Map(layers.map((x, i) => [x, i]));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const groups = [];
  let first = 0;
  while (first < layers.length) {
    let end = first;
    while (
      end + 1 < layers.length &&
      layers[end + 1] + 260 - layers[first] <= targetWidth
    )
      end++;
    // Favor a narrow cut near the desired size, keeping branch/join pairs
    // together where possible instead of cutting strictly by a column count.
    if (end < layers.length - 1 && end - first >= 2) {
      let best = end,
        bestScore = Infinity;
      for (let cut = Math.max(first + 1, end - 2); cut <= end; cut++) {
        const crossing = graph.edges.filter((e) => {
          const a = rank.get(byId.get(e.sources[0]).x);
          const b = rank.get(byId.get(e.targets[0]).x);
          return a <= cut && b > cut;
        }).length;
        const unused =
          (targetWidth - (layers[cut] + 260 - layers[first])) / targetWidth;
        const score = crossing + unused * 2;
        if (score < bestScore) {
          bestScore = score;
          best = cut;
        }
      }
      end = best;
    }
    const members = nodes.filter(
      (n) => rank.get(n.x) >= first && rank.get(n.x) <= end,
    );
    groups.push({
      members,
      left: layers[first],
      right: Math.max(...members.map((n) => n.x + n.width)),
      top: Math.min(...members.map((n) => n.y)),
      bottom: Math.max(...members.map((n) => n.y + n.height)),
    });
    first = end + 1;
  }
  // Compact each run on its own so unrelated long-distance branches cannot
  // leave empty vertical lanes inside it. Actual connections are unchanged.
  for (const group of groups) {
    const ids = new Set(group.members.map((n) => n.id));
    const internal = graph.edges.filter(
      (e) => ids.has(e.sources[0]) && ids.has(e.targets[0]),
    );
    const local = await elk.layout({
      id: "run",
      layoutOptions: {
        ...graph.layoutOptions,
        "elk.padding": "[top=50,left=30,bottom=30,right=30]",
        "elk.spacing.componentComponent": "70",
        "elk.layered.wrapping.strategy": "OFF",
      },
      children: group.members.map((n) => ({
        id: n.id,
        width: n.width,
        height: n.height,
      })),
      edges: internal.map((e) => ({
        id: e.id,
        sources: e.sources,
        targets: e.targets,
        labels: e.labels?.map(({ text, width, height, layoutOptions }) => ({
          text,
          width,
          height,
          layoutOptions,
        })),
      })),
    });
    const positions = new Map(local.children.map((n) => [n.id, n]));
    for (const n of group.members) Object.assign(n, positions.get(n.id));
    const routes = new Map(local.edges.map((e) => [e.id, e]));
    for (const e of internal) Object.assign(e, routes.get(e.id));
    group.left = 0;
    group.right = local.width;
    group.top = 0;
    group.bottom = local.height;
  }
  const runWidth = Math.max(...groups.map((g) => g.right - g.left));
  const groupById = new Map();
  let y = 100;
  groups.forEach((group, index) => {
    group.index = index;
    group.y = y;
    group.flip = index % 2 === 1;
    for (const n of group.members) {
      groupById.set(n.id, group);
      n.x =
        100 +
        (group.flip
          ? runWidth - (n.x - group.left) - n.width
          : n.x - group.left);
      n.y = y + n.y - group.top;
    }
    y += group.bottom - group.top + 100;
  });
  const transform = (p, g) => ({
    x: 100 + (g.flip ? runWidth - (p.x - g.left) : p.x - g.left),
    y: g.y + p.y - g.top,
  });
  for (const edge of graph.edges) {
    const from = groupById.get(edge.sources[0]),
      to = groupById.get(edge.targets[0]);
    if (from !== to) {
      edge.sections = []; // Reroute with nearby ports and obstacle avoidance.
      continue;
    }
    edge.sections = edge.sections?.map((s) => ({
      ...s,
      startPoint: transform(s.startPoint, from),
      endPoint: transform(s.endPoint, from),
      bendPoints: s.bendPoints?.map((p) => transform(p, from)),
    }));
    for (const label of edge.labels || []) {
      const p = transform(label, from);
      label.x = p.x - (from.flip ? label.width : 0);
      label.y = p.y;
    }
  }
  graph.width = runWidth + 200;
  graph.height = y - 80;
  graph.flowRuns = groups.map((g) => ({
    direction: g.flip ? "left" : "right",
    nodeIds: g.members.map((n) => n.id),
  }));
  return graph;
}
