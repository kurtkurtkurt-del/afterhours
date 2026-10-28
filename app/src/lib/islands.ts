import type { MapData, MapNode } from '@/data/peopleMap';

// The layout of your people (owner, 28.10.2026; prototypes/people-map.html, A): circles of
// friends who know each other stay together as islands, and the islands are tied to each other
// by the people they share. To keep it readable, each person gets at most a few lines:
//   1. a tree first, so everyone hangs on the map: each person on someone already placed,
//      the same island first, someone with room left first, the nearer wave first
//   2. then lines inside an island while both ends have room
//   3. then at most two bridges between any two islands
// The positions come from a small force layout (repelling people, springs on the drawn lines,
// a pull to the island's middle and to the wave's ring), run once per map.

export type Placed = MapNode & { x: number; y: number; island: number; r: number; parent: string | null; dim: boolean };
// How the map is shaped, one per filter (owner, 28.10.2026: "each filter its own algorithm"):
//   islands  everyone: circles of friends as islands, a force layout (below)
//   ring     friends only: you in the middle, your friends on one ring, the ones who know
//            each other side by side
//   petals   up to the second wave: each friend's people open outward from them like a
//            petal, rows of a fan; someone two friends share sits between their petals
//   orbits   up to the third wave: one orbit per wave, each person in line with whoever
//            brought them, spaced evenly
export type Shape = 'islands' | 'ring' | 'petals' | 'orbits';
export type MapLine = { a: string; b: string; kind: 'you' | 'group' | 'bridge' };
export type Layout = { nodes: Placed[]; lines: MapLine[]; byId: Map<string, Placed>; islands: number; neighbours: Map<string, Set<string>> };

const CAP = 5; // lines per person
const CAP_ME = 8;
const RADIUS = [30, 22, 13, 10];
// the room a person needs from another, centre to centre: two friends keep space for their
// names side by side; anyone else keeps their discs and a short line apart
const ROOM_FRIENDS = 96;
const room = (a: number, b: number) => (a === 1 && b === 1 ? ROOM_FRIENDS : RADIUS[a] + RADIUS[b] + 24);

function rng(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// The map narrowed by the filters on top: how far out (0 everyone, 1 friends, 2 up to the second
// wave, 3 up to the third) and which city. With a city, the people in it stay, and so does the
// way to each of them (the friend in between, dimmed) so nobody floats unconnected.
export function narrow(data: MapData, wave: 0 | 1 | 2 | 3, city: string | null): { data: MapData; dim: Set<string> } {
  const max = wave === 0 ? 3 : wave;
  let keep = new Set(data.nodes.filter((n) => n.w <= max).map((n) => n.id));
  const dim = new Set<string>();
  if (city) {
    const nb = new Map<string, string[]>();
    for (const [a, b] of data.edges) if (keep.has(a) && keep.has(b)) { nb.set(a, [...(nb.get(a) ?? []), b]); nb.set(b, [...(nb.get(b) ?? []), a]); }
    const from = new Map<string, string>([['me', '']]);
    const queue = ['me'];
    while (queue.length) { const x = queue.shift()!; for (const y of nb.get(x) ?? []) if (!from.has(y)) { from.set(y, x); queue.push(y); } }
    const there = data.nodes.filter((n) => keep.has(n.id) && n.c === city).map((n) => n.id);
    const next = new Set<string>(['me', ...there]);
    for (const id of there) {
      let cur = from.get(id);
      while (cur && cur !== 'me') { if (!next.has(cur)) { next.add(cur); dim.add(cur); } cur = from.get(cur); }
    }
    keep = next;
  }
  return { data: { nodes: data.nodes.filter((n) => keep.has(n.id)), edges: data.edges.filter(([a, b]) => keep.has(a) && keep.has(b)) }, dim };
}

export function layout(data: MapData, shape: Shape = 'islands', dim: Set<string> = new Set()): Layout {
  const nodes = data.nodes;
  const ids = nodes.map((n) => n.id);
  const nb = new Map<string, Set<string>>(ids.map((id) => [id, new Set<string>()]));
  for (const [a, b] of data.edges) {
    if (!nb.has(a) || !nb.has(b) || a === b) continue;
    nb.get(a)!.add(b);
    nb.get(b)!.add(a);
  }
  const w = new Map(nodes.map((n) => [n.id, n.w]));

  // islands: label propagation over everyone but you (you would tie them all into one)
  const label = new Map(ids.map((id) => [id, id]));
  const order = ids.filter((id) => id !== 'me').sort();
  for (let round = 0; round < 15; round++) {
    let changed = false;
    for (const id of order) {
      const count = new Map<string, number>();
      for (const o of nb.get(id)!) if (o !== 'me') count.set(label.get(o)!, (count.get(label.get(o)!) ?? 0) + 1);
      if (!count.size) continue;
      const top = Math.max(...count.values());
      const best = [...count].filter(([, c]) => c === top).map(([l]) => l).sort();
      const mine = label.get(id)!;
      const next = best.includes(mine) ? mine : best[0];
      if (next !== mine) {
        label.set(id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const sizes = new Map<string, number>();
  for (const id of order) sizes.set(label.get(id)!, (sizes.get(label.get(id)!) ?? 0) + 1);
  const labels = [...sizes.keys()].sort((a, b) => sizes.get(b)! - sizes.get(a)! || a.localeCompare(b));
  const islandOf = new Map<string, number>([['me', -1]]);
  for (const id of order) islandOf.set(id, labels.indexOf(label.get(id)!));

  // lines, capped
  const deg = new Map(ids.map((id) => [id, 0]));
  const cap = (id: string) => (id === 'me' ? CAP_ME : CAP);
  const lines: MapLine[] = [];
  const drawn = new Set<string>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const draw = (a: string, b: string, kind: MapLine['kind']) => {
    drawn.add(key(a, b));
    deg.set(a, deg.get(a)! + 1);
    deg.set(b, deg.get(b)! + 1);
    lines.push({ a, b, kind });
  };
  const parent = new Map<string, string | null>([['me', null]]);
  const placed = new Set<string>(['me']);
  // wave by wave; inside a wave, whoever has the fewest ways in goes first, so the only door of
  // someone with one friend on the map is not already full when their turn comes
  const ways = (id: string) => [...nb.get(id)!].filter((o) => w.get(o)! <= w.get(id)!).length;
  const queue = [...ids].filter((id) => id !== 'me').sort((a, b) => w.get(a)! - w.get(b)! || ways(a) - ways(b) || a.localeCompare(b));
  // someone whose every door is full waits for a later round: by then a neighbour with room may
  // be on the map. In the last round they take the best door there is (when one person is the
  // only way to several others, that person carries their lines).
  let pending = queue;
  for (let round = 0; round < 3 && pending.length; round++) {
   const later: string[] = [];
   for (const id of pending) {
    const cands = [...nb.get(id)!].filter((o) => placed.has(o));
    if (!cands.length) { later.push(id); continue; }
    if (round < 2 && cands.every((o) => deg.get(o)! >= cap(o))) { later.push(id); continue; }
    const same = (o: string) => (islandOf.get(o) === islandOf.get(id) ? 0 : 1);
    const room = (o: string) => (deg.get(o)! < cap(o) ? 0 : 1);
    // a friend hangs on you; everyone else on the best placed neighbour
    const pick = w.get(id) === 1 && cands.includes('me') && deg.get('me')! < CAP_ME
      ? 'me'
      : cands.sort((a, b) => room(a) - room(b) || same(a) - same(b) || w.get(a)! - w.get(b)! || deg.get(a)! - deg.get(b)! || a.localeCompare(b))[0];
    draw(id, pick, pick === 'me' ? 'you' : islandOf.get(pick) === islandOf.get(id) ? 'group' : 'bridge');
    parent.set(id, pick);
    placed.add(id);
   }
   pending = later;
  }
  // inside the islands
  const rest = data.edges.filter(([a, b]) => nb.has(a) && nb.has(b) && a !== b && !drawn.has(key(a, b)));
  for (const [a, b] of rest) {
    if (a === 'me' || b === 'me' || islandOf.get(a) !== islandOf.get(b)) continue;
    if (deg.get(a)! < cap(a) && deg.get(b)! < cap(b)) draw(a, b, 'group');
  }
  // a couple of bridges between islands
  const bridges = new Map<string, number>();
  for (const l of lines) if (l.kind === 'bridge') { const k = key(String(islandOf.get(l.a)), String(islandOf.get(l.b))); bridges.set(k, (bridges.get(k) ?? 0) + 1); }
  for (const [a, b] of rest) {
    if (a === 'me' || b === 'me' || drawn.has(key(a, b)) || islandOf.get(a) === islandOf.get(b)) continue;
    const k = key(String(islandOf.get(a)), String(islandOf.get(b)));
    if ((bridges.get(k) ?? 0) >= 2) continue;
    if (deg.get(a)! < cap(a) - 1 && deg.get(b)! < cap(b) - 1) {
      draw(a, b, 'bridge');
      bridges.set(k, (bridges.get(k) ?? 0) + 1);
    }
  }

  // positions. The friends' ring grows with how many there are, so each has room for a name;
  // the crowd's rings sit beyond it.
  const friendsN = nodes.filter((n) => n.w === 1).length;
  const r1 = Math.max(110, (friendsN * (ROOM_FRIENDS + 6)) / (2 * Math.PI));
  const RING = [0, r1, r1 + 115, r1 + 220];
  const rand = rng(hash(ids.join(',')));
  const islandAngle = labels.map((_, i) => i * 2.399963); // the golden angle: islands spread around you
  const P = nodes.map((n) => {
    const isl = islandOf.get(n.id)!;
    const a = isl < 0 ? 0 : islandAngle[isl] + (rand() - 0.5) * 0.9;
    const d = RING[n.w] + (rand() - 0.5) * 60;
    return { id: n.id, x: n.id === 'me' ? 0 : Math.cos(a) * d, y: n.id === 'me' ? 0 : Math.sin(a) * d, isl, w: n.w };
  });
  const index = new Map(P.map((p, i) => [p.id, i]));
  // a line is long enough to be seen between the two discs it joins
  if (shape !== 'islands') shaped();
  const springs = lines.map((l) => {
    const a = w.get(l.a)!, b = w.get(l.b)!;
    const len = l.kind === 'you' ? r1 : Math.max(room(a, b) + 8, RADIUS[a] + RADIUS[b] + (l.kind === 'group' ? 34 : 80));
    return { i: index.get(l.a)!, j: index.get(l.b)!, len };
  });
  const N = P.length;
  const steps = shape !== 'islands' ? 0 : N > 160 ? 160 : 240;
  for (let s = 0; s < steps; s++) {
    const t = 1 - s / steps;
    const fx = new Float64Array(N), fy = new Float64Array(N);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      let dx = P[i].x - P[j].x, dy = P[i].y - P[j].y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) { dx = rand() - 0.5; dy = rand() - 0.5; d2 = 1; }
      if (d2 > 90000) continue;
      const d = Math.sqrt(d2);
      // a push that fades with distance, harder between islands, hardest when two discs touch
      const touch = room(P[i].w, P[j].w);
      const k = (P[i].isl !== P[j].isl ? 2600 : 1100) / d2 + (d < touch ? (touch - d) * 0.6 : 0);
      fx[i] += (dx / d) * k; fy[i] += (dy / d) * k; fx[j] -= (dx / d) * k; fy[j] -= (dy / d) * k;
    }
    for (const sp of springs) {
      const a = P[sp.i], b = P[sp.j];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - sp.len) * 0.05;
      fx[sp.i] += (dx / d) * f; fy[sp.i] += (dy / d) * f; fx[sp.j] -= (dx / d) * f; fy[sp.j] -= (dy / d) * f;
    }
    const cx = new Map<number, { x: number; y: number; n: number }>();
    for (const p of P) { const c = cx.get(p.isl) ?? { x: 0, y: 0, n: 0 }; c.x += p.x; c.y += p.y; c.n++; cx.set(p.isl, c); }
    for (let i = 0; i < N; i++) {
      const p = P[i];
      if (p.id === 'me') continue;
      const c = cx.get(p.isl)!;
      fx[i] += (c.x / c.n - p.x) * 0.025; fy[i] += (c.y / c.n - p.y) * 0.025;
      const d = Math.sqrt(p.x * p.x + p.y * p.y) || 1, want = RING[p.w];
      // friends hold to their ring around you; the crowd only leans to theirs
      const ring = p.w === 1 ? 0.06 : 0.012;
      fx[i] += (p.x / d) * (want - d) * ring; fy[i] += (p.y / d) * (want - d) * ring;
      const max = 4 + 22 * t;
      const m = Math.sqrt(fx[i] * fx[i] + fy[i] * fy[i]);
      const k = m > max ? max / m : 1;
      p.x += fx[i] * k; p.y += fy[i] * k;
    }
  }

  // The shaped layouts: angles and radii by rule instead of forces.
  function shaped() {
    const TAU = Math.PI * 2;
    const at = (id: string, R: number, a: number) => { const p = P[index.get(id)!]; p.x = Math.cos(a) * R; p.y = Math.sin(a) * R; };
    const angle = new Map<string, number>();
    const friendsIds = nodes.filter((n) => n.w === 1).map((n) => n.id).sort((a, b) => islandOf.get(a)! - islandOf.get(b)! || a.localeCompare(b));
    friendsIds.forEach((id, i) => { const a = (i / Math.max(1, friendsIds.length)) * TAU - Math.PI / 2; angle.set(id, a); at(id, r1, a); });
    // where someone points: the average direction of the people one wave closer who know them
    const toward = (id: string, wave: number) => {
      let sx = 0, sy = 0;
      for (const o of nb.get(id)!) if (w.get(o) === wave - 1 && angle.has(o)) { sx += Math.cos(angle.get(o)!); sy += Math.sin(angle.get(o)!); }
      return sx || sy ? Math.atan2(sy, sx) : rand() * TAU;
    };
    if (shape === 'petals') {
      const sector = (TAU / Math.max(1, friendsIds.length)) * 0.86;
      const shared: string[] = [];
      const petal = new Map<string, string[]>(friendsIds.map((f) => [f, []]));
      for (const n of nodes) {
        if (n.w !== 2) continue;
        const fs = [...nb.get(n.id)!].filter((o) => w.get(o) === 1);
        if (fs.length >= 2) shared.push(n.id);
        else if (fs.length === 1) petal.get(fs[0])!.push(n.id);
      }
      for (const [f, kids] of petal) {
        const a0 = angle.get(f)!;
        let row = 0, done = 0;
        while (done < kids.length) {
          const R = r1 + 92 + row * 58;
          const room2 = room(2, 2) + 4;
          const cap = Math.max(1, Math.floor((sector * R) / room2));
          const inRow = kids.slice(done, done + cap);
          const span = Math.min(sector, ((inRow.length - 1) * room2) / R);
          inRow.forEach((id, i) => { const a = a0 - span / 2 + (inRow.length > 1 ? (i / (inRow.length - 1)) * span : 0); angle.set(id, a); at(id, R, a); });
          done += inRow.length;
          row++;
        }
      }
      // shared people: between the friends they share, a little inside the petals
      shared.forEach((id, i) => { const a = toward(id, 2); angle.set(id, a); at(id, r1 + 62 + (i % 2) * 26, a); });
      return;
    }
    if (shape === 'orbits') {
      let R = r1;
      for (const wave of [2, 3]) {
        const list = nodes.filter((n) => n.w === wave).map((n) => ({ id: n.id, t: toward(n.id, wave) }));
        if (!list.length) continue;
        const gapPx = room(wave, wave) + 6;
        R = Math.max(R + 112, (list.length * gapPx) / TAU);
        const gap = gapPx / R;
        list.sort((a, b) => a.t - b.t);
        // in order around the orbit, each at least a gap after the one before, then turned back
        // so on average everyone sits where they point
        const got = list.map((x) => x.t);
        for (let i = 1; i < got.length; i++) got[i] = Math.max(got[i], got[i - 1] + gap);
        const shift = got.reduce((s, g, i) => s + (g - list[i].t), 0) / got.length;
        list.forEach((x, i) => { const a = got[i] - shift; angle.set(x.id, a); at(x.id, R, a); });
      }
    }
  }

  // last, a few rounds that only pull apart whoever is still too close (you stay put)
  for (let round = 0; round < 60; round++) {
    let moved = false;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const a = P[i], b = P[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.sqrt(dx * dx + dy * dy);
      const need = room(a.w, b.w);
      if (d >= need) continue;
      if (d < 0.01) { dx = rand() - 0.5; dy = rand() - 0.5; d = Math.sqrt(dx * dx + dy * dy); }
      const push = (need - d) / 2 + 0.5;
      const ux = dx / d, uy = dy / d;
      if (a.id === 'me') { b.x += ux * push * 2; b.y += uy * push * 2; }
      else if (b.id === 'me') { a.x -= ux * push * 2; a.y -= uy * push * 2; }
      else { a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; }
      moved = true;
    }
    if (!moved) break;
  }

  const placedNodes: Placed[] = nodes.map((n) => {
    const p = P[index.get(n.id)!];
    return { ...n, x: p.x, y: p.y, island: islandOf.get(n.id)!, r: RADIUS[n.w], parent: parent.get(n.id) ?? null, dim: dim.has(n.id) };
  });
  return { nodes: placedNodes, lines, byId: new Map(placedNodes.map((n) => [n.id, n])), islands: labels.length, neighbours: nb };
}

// The way from you to someone along the drawn tree: [friend, …, them].
export function chain(l: Layout, id: string): Placed[] {
  const out: Placed[] = [];
  let cur = l.byId.get(id);
  while (cur && cur.id !== 'me') {
    out.unshift(cur);
    cur = cur.parent ? l.byId.get(cur.parent) : undefined;
  }
  return out;
}
