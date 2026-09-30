// Background regions only. Never move cards or change the routed graph.
export function buildClusters(catalog, layout) {
  const stageById = new Map(catalog.nodes.map((n) => [n.id, n.stage]));
  const nodes = layout.nodes.map((n) => ({ ...n, stage: stageById.get(n.id) }));
  const box = (group) => {
    const x = Math.min(...group.map((n) => n.x)) - 22;
    const y = Math.min(...group.map((n) => n.y)) - 42;
    return {
      x,
      y,
      width: Math.max(...group.map((n) => n.x + n.width)) + 22 - x,
      height: Math.max(...group.map((n) => n.y + n.height)) + 22 - y,
    };
  };
  const overlaps = (a, b) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
  const nearby = (a, b) => {
    const dx = Math.max(0, a.x - b.x - b.width, b.x - a.x - a.width);
    const dy = Math.max(0, a.y - b.y - b.height, b.y - a.y - a.height);
    return (dx <= 190 && dy === 0) || (dy <= 100 && dx === 0);
  };
  const result = [];
  for (const stage of catalog.stages) {
    let groups = nodes.filter((n) => n.stage === stage.id).map((n) => [n]);
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < groups.length; i++)
        for (let j = i + 1; j < groups.length; j++) {
          if (!groups[i].some((a) => groups[j].some((b) => nearby(a, b))))
            continue;
          const combined = [...groups[i], ...groups[j]],
            region = box(combined),
            memberIds = new Set(combined.map((n) => n.id));
          // A region must never appear to own a card from another region/stage.
          if (nodes.some((n) => !memberIds.has(n.id) && overlaps(region, n)))
            continue;
          if (result.some((r) => overlaps(region, r))) continue;
          groups[i] = combined;
          groups.splice(j, 1);
          merged = true;
          break outer;
        }
    }
    result.push(
      ...groups.map((group, i) => ({
        id: `${stage.id}-${i}`,
        stage: stage.id,
        nodeIds: group.map((n) => n.id),
        ...box(group),
      })),
    );
  }
  return result;
}
