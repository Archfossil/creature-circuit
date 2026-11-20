// Pure terrain math for the world map: noise and where the land is. No three.js here, so the
// map tests can check the coastline (e.g. that Kilauea stays an island).
import { MAP_NODES, MAP_EDGES, NODE_BY_ID, MAP_SCALE } from '../data/map';
import type { MapNode } from '../data/schema';

// ── Noise ───────────────────────────────────────────────────────
export function hash(x: number, z: number) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
export function vnoise(x: number, z: number) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const fbm = (x: number, z: number) => vnoise(x, z) * 0.55 + vnoise(x * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, z * 4.3) * 0.15;
export const smooth = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// Land segments (sail routes excluded so islands stay islands)
export const SEGS: [MapNode, MapNode][] = MAP_EDGES.filter((e) => e.via !== 'sail' && e.via !== 'portal' && e.b !== 'ironwake' && e.a !== 'ironwake').map((e) => [NODE_BY_ID[e.a], NODE_BY_ID[e.b]]);

export function segDist(px: number, pz: number, a: MapNode, b: MapNode) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - (a.x + dx * t), pz - (a.z + dz * t));
}

/** 0 = open sea, 1 = solid land, blended along the coast. */
export function landField(x: number, z: number) {
  let d = 1e9;
  for (const [a, b] of SEGS) d = Math.min(d, segDist(x, z, a, b));
  for (const n of MAP_NODES) d = Math.min(d, Math.hypot(x - n.x, z - n.z) - (n.kind === 'city' || n.kind === 'arena' ? 3 : n.kind === 'legendary' ? -1 : 1));
  // coast distance and its noise scale with the map, so a bigger map keeps the same shape
  const R = (8.5 + fbm((x * 0.07) / MAP_SCALE, (z * 0.07) / MAP_SCALE) * 7) * MAP_SCALE;
  return smooth(R, R - 5 * MAP_SCALE, d);
}

/** Map nodes on the same landmass as `nodeId` (flood fill over land on a 1-unit grid). */
export function landmassOf(nodeId: string): string[] {
  const start = NODE_BY_ID[nodeId];
  const seen = new Set<string>();
  const q: [number, number][] = [[Math.round(start.x), Math.round(start.z)]];
  while (q.length) {
    const [x, z] = q.pop()!;
    const k = `${x},${z}`;
    if (seen.has(k) || x < -90 * MAP_SCALE || x > 90 * MAP_SCALE || z < -75 * MAP_SCALE || z > 105 * MAP_SCALE || landField(x, z) <= 0.05) continue;
    seen.add(k);
    q.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
  }
  return MAP_NODES.filter((n) => seen.has(`${Math.round(n.x)},${Math.round(n.z)}`)).map((n) => n.id);
}
