// Wrapped ELK graphs can contain stale endpoints on long cross-wrap edges.
// Validate every route against its actual cards; repair only invalid routes
// with deterministic, obstacle-aware Manhattan routing. Never change topology.
const EPS = 0.01;
const points = (s) => [s.startPoint, ...(s.bendPoints || []), s.endPoint];
export function onBoundary(p, n) {
  return (
    p.x >= n.x - EPS &&
    p.x <= n.x + n.width + EPS &&
    p.y >= n.y - EPS &&
    p.y <= n.y + n.height + EPS &&
    (Math.abs(p.x - n.x) < EPS ||
      Math.abs(p.x - n.x - n.width) < EPS ||
      Math.abs(p.y - n.y) < EPS ||
      Math.abs(p.y - n.y - n.height) < EPS)
  );
}
export function crossesBox(a, b, n, pad = 0) {
  const l = n.x - pad,
    r = n.x + n.width + pad,
    t = n.y - pad,
    d = n.y + n.height + pad;
  if (Math.abs(a.y - b.y) < EPS)
    return (
      a.y > t + EPS &&
      a.y < d - EPS &&
      Math.max(a.x, b.x) > l + EPS &&
      Math.min(a.x, b.x) < r - EPS
    );
  if (Math.abs(a.x - b.x) < EPS)
    return (
      a.x > l + EPS &&
      a.x < r - EPS &&
      Math.max(a.y, b.y) > t + EPS &&
      Math.min(a.y, b.y) < d - EPS
    );
  return true;
}
function routeValid(edge, nodes) {
  const start = nodes.find((n) => n.id === edge.source),
    end = nodes.find((n) => n.id === edge.target);
  if (
    !edge.sections?.length ||
    !onBoundary(edge.sections[0].startPoint, start) ||
    !onBoundary(edge.sections.at(-1).endPoint, end)
  )
    return false;
  return edge.sections.every((s) =>
    points(s).every(
      (b, i, ps) =>
        !i ||
        !nodes.some(
          (n) =>
            n.id !== edge.source &&
            n.id !== edge.target &&
            crossesBox(ps[i - 1], b, n),
        ),
    ),
  );
}
class Queue {
  heap = [];
  push(item) {
    const h = this.heap;
    h.push(item);
    let i = h.length - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (h[p].f <= item.f) break;
      h[i] = h[p];
      i = p;
    }
    h[i] = item;
  }
  pop() {
    const h = this.heap,
      first = h[0],
      last = h.pop();
    if (h.length) {
      let i = 0;
      while (i * 2 + 1 < h.length) {
        let c = i * 2 + 1;
        if (c + 1 < h.length && h[c + 1].f < h[c].f) c++;
        if (h[c].f >= last.f) break;
        h[i] = h[c];
        i = c;
      }
      h[i] = last;
    }
    return first;
  }
}
function makeRouter(nodes) {
  const unique = (a) =>
    [...new Set(a.map((v) => Math.round(v * 1000) / 1000))].sort(
      (a, b) => a - b,
    );
  const xs = unique(
    nodes.flatMap((n) => [
      n.x - 28,
      n.x,
      n.x + n.width / 2,
      n.x + n.width,
      n.x + n.width + 28,
    ]),
  );
  const ys = unique(
    nodes.flatMap((n) => [
      n.y - 28,
      n.y,
      n.y + n.height / 2,
      n.y + n.height,
      n.y + n.height + 28,
    ]),
  );
  const nx = xs.length,
    ny = ys.length;
  const horizontal = new Uint8Array(nx * ny),
    vertical = new Uint8Array(nx * ny);
  for (let y = 0; y < ny; y++)
    for (let x = 0; x < nx; x++) {
      const a = { x: xs[x], y: ys[y] },
        i = y * nx + x;
      if (x + 1 < nx)
        horizontal[i] = !nodes.some((n) =>
          crossesBox(a, { x: xs[x + 1], y: a.y }, n, 14),
        );
      if (y + 1 < ny)
        vertical[i] = !nodes.some((n) =>
          crossesBox(a, { x: a.x, y: ys[y + 1] }, n, 14),
        );
    }
  return (source, target) => {
    const verticallySeparated =
      target.y >= source.y + source.height + 60 ||
      source.y >= target.y + target.height + 60;
    const down = target.y > source.y,
      right = target.x > source.x;
    const aligned = Math.abs(target.x - source.x) < source.width;
    const useVertical = verticallySeparated && aligned;
    const start = useVertical
      ? {
          x: source.x + source.width / 2,
          y: source.y + (down ? source.height : 0),
        }
      : {
          x: source.x + (right ? source.width : 0),
          y: source.y + source.height / 2,
        };
    const end = useVertical
      ? {
          x: target.x + target.width / 2,
          y: target.y + (down ? 0 : target.height),
        }
      : {
          x: target.x + (right ? 0 : target.width),
          y: target.y + target.height / 2,
        };
    const dx = useVertical ? 0 : right ? 28 : -28;
    const dy = useVertical ? (down ? 28 : -28) : 0;
    const ix = (a, v) => a.indexOf(Math.round(v * 1000) / 1000);
    const sx = ix(xs, start.x + dx),
      sy = ix(ys, start.y + dy),
      tx = ix(xs, end.x - dx),
      ty = ix(ys, end.y - dy);
    const startKey = (sy * nx + sx) * 2,
      targetCell = ty * nx + tx;
    const cost = new Float64Array(nx * ny * 2).fill(Infinity),
      parent = new Int32Array(nx * ny * 2).fill(-1),
      queue = new Queue();
    cost[startKey] = 0;
    queue.push({ key: startKey, g: 0, f: 0 });
    let found = -1;
    while (queue.heap.length) {
      const { key, g } = queue.pop();
      if (g !== cost[key]) continue;
      const cell = key >> 1,
        x = cell % nx,
        y = Math.floor(cell / nx),
        dir = key % 2;
      if (cell === targetCell) {
        found = key;
        break;
      }
      for (const [xx, yy, dd, allowed] of [
        [x + 1, y, 0, horizontal[cell]],
        [x - 1, y, 0, x > 0 && horizontal[cell - 1]],
        [x, y + 1, 1, vertical[cell]],
        [x, y - 1, 1, y > 0 && vertical[cell - nx]],
      ]) {
        if (!allowed || xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
        const k = (yy * nx + xx) * 2 + dd,
          d =
            g +
            Math.abs(xs[xx] - xs[x]) +
            Math.abs(ys[yy] - ys[y]) +
            (dd !== dir ? 40 : 0);
        if (d >= cost[k]) continue;
        cost[k] = d;
        parent[k] = key;
        queue.push({
          key: k,
          g: d,
          f: d + Math.abs(xs[xx] - xs[tx]) + Math.abs(ys[yy] - ys[ty]),
        });
      }
    }
    if (found < 0)
      throw new Error(
        `No obstacle-free route for ${source.id} to ${target.id}`,
      );
    const result = [];
    for (let k = found; k >= 0; k = parent[k]) {
      const cell = k >> 1;
      result.push({ x: xs[cell % nx], y: ys[Math.floor(cell / nx)] });
    }
    const ps = [start, ...result.reverse(), end],
      simplified = [];
    for (const p of ps) {
      const a = simplified.at(-2),
        b = simplified.at(-1);
      if (
        a &&
        ((Math.abs(a.x - b.x) < EPS && Math.abs(b.x - p.x) < EPS) ||
          (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - p.y) < EPS))
      )
        simplified.pop();
      simplified.push(p);
    }
    return {
      startPoint: simplified[0],
      bendPoints: simplified.slice(1, -1),
      endPoint: simplified.at(-1),
    };
  };
}
function overlaps(a, b) {
  return (
    a.x < b.x + b.width + 8 &&
    a.x + a.width + 8 > b.x &&
    a.y < b.y + b.height + 8 &&
    a.y + a.height + 8 > b.y
  );
}
export function repairRoutes(layout) {
  const invalid = layout.edges.filter((e) => !routeValid(e, layout.nodes));
  if (!invalid.length) return layout;
  const route = makeRouter(layout.nodes),
    nodes = new Map(layout.nodes.map((n) => [n.id, n]));
  const invalidIds = new Set(invalid.map((e) => e.id));
  const obstacles = [
    ...layout.nodes,
    ...layout.edges
      .filter((e) => !invalidIds.has(e.id))
      .flatMap((e) => e.labels),
  ];
  for (const edge of invalid) {
    const section = route(nodes.get(edge.source), nodes.get(edge.target));
    edge.sections = [section];
    const ps = points(section);
    for (const label of edge.labels) {
      const candidates = [];
      for (let i = 1; i < ps.length; i++) {
        const a = ps[i - 1],
          b = ps[i];
        if (
          Math.abs(a.y - b.y) < EPS &&
          Math.abs(a.x - b.x) > label.width + 20
        ) {
          for (const fraction of [0.5, 0.2, 0.8])
            candidates.push({
              x:
                Math.min(a.x, b.x) +
                (Math.abs(a.x - b.x) - label.width) * fraction,
              y: a.y - label.height / 2,
              width: label.width,
              height: label.height,
            });
        } else if (Math.abs(a.y - b.y) > label.height + 20) {
          for (const fraction of [0.5, 0.2, 0.8])
            for (const side of [1, -1])
              candidates.push({
                x: a.x + (side === 1 ? 10 : -label.width - 10),
                y:
                  Math.min(a.y, b.y) +
                  (Math.abs(a.y - b.y) - label.height) * fraction,
                width: label.width,
                height: label.height,
              });
        }
      }
      const position = candidates.find(
        (c) => !obstacles.some((o) => overlaps(c, o)),
      );
      if (!position) throw new Error(`Cannot place route label for ${edge.id}`);
      Object.assign(label, position);
      obstacles.push(label);
    }
  }
  const extentPoints = [
    ...layout.nodes.map((n) => ({ x: n.x + n.width, y: n.y + n.height })),
    ...layout.edges.flatMap((e) => [
      ...e.sections.flatMap((s) => [
        s.startPoint,
        ...(s.bendPoints || []),
        s.endPoint,
      ]),
      ...e.labels.map((l) => ({ x: l.x + l.width, y: l.y + l.height })),
    ]),
  ];
  layout.width = Math.max(layout.width, ...extentPoints.map((p) => p.x + 40));
  layout.height = Math.max(layout.height, ...extentPoints.map((p) => p.y + 40));
  return layout;
}
