import type { MapNode, MapEdge, City, Biome, ElementType } from './schema';

// The region of Margos. North is -z, east is +x. Hub positions below are on the original ~110 x 100 layout
// and are multiplied by MAP_SCALE, so the real map is about 190 x 175 world units.

const hubs: MapNode[] = [
  // Cities
  { id: 'aurora', name: 'Aurora Peak', kind: 'city', biome: 'tundra', x: -30, z: -40, rarity: 0, level: 1, cityType: 'astral' },
  { id: 'hollow', name: 'Hollow Crest', kind: 'city', biome: 'grove', x: -44, z: -14, rarity: 0, level: 1, cityType: 'charm' },
  { id: 'thunder', name: 'Thunder Spike', kind: 'city', biome: 'badlands', x: 2, z: -16, rarity: 0, level: 1, cityType: 'electric' },
  { id: 'kilauea', name: 'Kilauea Forge', kind: 'city', biome: 'volcanic', x: -38, z: 62, rarity: 0, level: 1, cityType: 'fire' },
  { id: 'gloom', name: 'Gloomshade', kind: 'city', biome: 'forest', x: -42, z: 14, rarity: 0, level: 1, cityType: 'grass' },
  { id: 'canyon', name: 'Houndmouth Canyon', kind: 'city', biome: 'canyon', x: -26, z: 34, rarity: 0, level: 1, cityType: 'rock' },
  { id: 'iron', name: 'Iron Coast', kind: 'city', biome: 'coast', x: 44, z: -26, rarity: 0, level: 1, cityType: 'steel' },
  { id: 'mangrove', name: 'Mangrove Port', kind: 'city', biome: 'swamp', x: 36, z: 24, rarity: 0, level: 1, cityType: 'water' },
  // Endgame venue
  { id: 'stadium', name: 'Circuit Stadium', kind: 'stadium', biome: 'meadow', x: 2, z: 8, rarity: 0, level: 1 },
  // Towns
  { id: 'mistfall', name: 'Mistfall', kind: 'town', biome: 'mountain', x: -24, z: -24, rarity: 0, level: 1 },
  { id: 'lumber', name: 'Lumber Hollow', kind: 'town', biome: 'forest', x: -28, z: 0, rarity: 0, level: 1 },
  { id: 'dustmere', name: 'Dustmere Trading Post', kind: 'town', biome: 'desert', x: -6, z: 22, rarity: 0, level: 1 },
  { id: 'ridgeway', name: 'Ridgeway', kind: 'town', biome: 'mountain', x: 24, z: -12, rarity: 0, level: 1 },
  { id: 'saltmarsh', name: 'Saltmarsh Landing', kind: 'town', biome: 'coast', x: 46, z: 2, rarity: 0, level: 1 },
  { id: 'blackSand', name: 'Black Sand Cove', kind: 'town', biome: 'coast', x: 28, z: 55, rarity: 0, level: 1 },
  { id: 'quillhaven', name: 'Quillhaven', kind: 'town', biome: 'meadow', x: 30, z: 4, rarity: 0, level: 1 },
  { id: 'valor', name: 'Valor Ridge', kind: 'town', biome: 'mountain', x: -8, z: -29, rarity: 0, level: 1 },
  // The gateway to the Rainbow Plains, up a misty branch off the fog road (a Fog Lantern with a wisp in it lights the way)
  { id: 'lanternglade', name: 'Lantern Glade', kind: 'town', biome: 'grove', x: -36, z: -23, rarity: 0, level: 1 },
  // At the bottom of the canyon pocket: offer a material and something from the deep answers
  { id: 'depths', name: 'Shifting Depths', kind: 'town', biome: 'canyon', x: -10, z: 42, rarity: 0, level: 1 },
  // Amber's arena sits alone on Kilauea island, reached by ferry
  { id: 'firepit', name: 'Amber\'s Fire Pit', kind: 'arena', biome: 'volcanic', x: 6, z: 64, rarity: 0, level: 1, arenaOf: 'kilauea' },
  // Legendary nodes
  { id: 'sunspire', name: 'Sunspire Summit', kind: 'legendary', biome: 'mountain', x: -10, z: -38, rarity: 3, level: 9, legendary: 'solstara', requires: { tier: 3, item: 'summit-pick' } },
  { id: 'ironwake', name: 'Ironwake Shoals', kind: 'legendary', biome: 'coast', x: 54, z: -40, rarity: 3, level: 11, legendary: 'thalassor', requires: { tier: 4 } },
  // The Forest Floor: one dark node below Gloomshade, reached by rope. Dahlia's arena hides here.
  { id: 'forestfloor', name: 'Forest Floor', kind: 'wild', biome: 'deepwood', x: -52, z: 17, rarity: 1, level: 6 },
  // Legendaries of the centre and south (their species are roster placeholders until designed)
  { id: 'willowheart', name: 'Willowheart Isle', kind: 'legendary', biome: 'lake', x: -18, z: 17, rarity: 3, level: 8, legendary: 'ph-grass-water-legendary', requires: { tier: 2 } },
  { id: 'dunecrown', name: 'Dunecrown Mesa', kind: 'legendary', biome: 'desert', x: 6, z: 36, rarity: 3, level: 9, legendary: 'ph-electric-rock-legendary', requires: { tier: 3 } },
  { id: 'boglight', name: 'Boglight Hollow', kind: 'legendary', biome: 'swamp', x: 50, z: 32, rarity: 3, level: 10, legendary: 'ph-water-charm-legendary', requires: { tier: 3 } },
  { id: 'calderaheart', name: 'Caldera Heart', kind: 'legendary', biome: 'volcanic', x: -6, z: 76, rarity: 3, level: 11, legendary: 'ph-fire-steel-legendary', requires: { tier: 4 } },
];

/**
 * The map's size: every hub coordinate, route bend and the Cloud Island are multiplied by this, and
 * the terrain (render/land.ts, render/world.ts) scales with it, so the map keeps its shape at any size.
 * 1.75 makes room for 3–5 wild nodes on every route between towns and cities.
 */
export const MAP_SCALE = 1.75;
for (const h of hubs) { h.x = +(h.x * MAP_SCALE).toFixed(2); h.z = +(h.z * MAP_SCALE).toFixed(2); }

/**
 * A wild node on a route: biome, name, level, and `true` for nodes added when the map grew. Wild ids
 * stay stable for saves: the original nodes are w1, w2 … in route order, the added ones n1, n2 … in
 * route order. Add any future node with the `true` flag, at the END of the routes list (or the end of
 * a route's legs), so no existing id shifts.
 */
type Leg = [Biome, string, number?, boolean?];
const added = (b: Biome, name: string, level: number): Leg => [b, name, level, true];

/** A route between two hubs; intermediate wild nodes are laid out along the line with a gentle wiggle. */
const routes: { a: string; b: string; legs: Leg[]; req?: MapEdge['requires']; rarity?: number; bend?: number }[] = [
  { a: 'aurora', b: 'mistfall', legs: [['tundra', 'Frostbite Flats', 3], added('tundra', 'Rimeglass Shelf', 3), ['mountain', 'Glacier Stair', 3]], bend: 3 },
  { a: 'mistfall', b: 'hollow', legs: [added('mountain', 'Misty Switchback', 2), ['grove', 'Fogbank Path', 2], ['forest', 'Fernway', 2], added('grove', 'Dappled Dell', 2)], bend: -3 },
  { a: 'hollow', b: 'lumber', legs: [added('grove', 'Dewdrop Dell', 2), ['forest', 'Mossy Hollow', 2], ['grove', 'Rainshadow Glen', 3], added('forest', 'Bracken Trail', 3)], bend: 3 },
  { a: 'lumber', b: 'gloom', legs: [['forest', 'Shadeway', 3], added('forest', 'Hollow Log Crossing', 3), ['forest', 'Fallen Giant', 4]], bend: -2 },
  { a: 'gloom', b: 'canyon', legs: [added('forest', 'Fernlight Edge', 3), ['meadow', 'Sunbaked Meadow', 3], added('meadow', 'Thistle Rise', 3), added('canyon', 'Ochre Steps', 4), ['canyon', 'Redrock Pass', 4]], bend: 3 },
  { a: 'canyon', b: 'dustmere', legs: [['canyon', 'Mesa Rim', 4], added('canyon', 'Hoodoo Row', 4), ['desert', 'Sagebrush Flat', 3], added('desert', 'Tumbleweed Hollow', 3)], bend: -3 },
  { a: 'dustmere', b: 'stadium', legs: [added('desert', 'Caravan Rest', 2), ['road', 'Circuit Road', 2], added('road', 'Banner Mile', 2)] },
  { a: 'mistfall', b: 'thunder', legs: [added('mountain', 'Frostmelt Falls', 2), ['river', 'Snowmelt River', 2], added('river', 'Otter Bend', 2), ['mountain', 'Pine Ridge', 2]], bend: 3 },
  { a: 'thunder', b: 'stadium', legs: [added('badlands', 'Rumble Flats', 1), ['meadow', 'Bison Meadow', 1], added('meadow', 'Tallgrass Run', 1), added('road', 'Arena Approach', 2)] },
  { a: 'lumber', b: 'stadium', legs: [added('forest', 'Sawmill Track', 2), ['road', 'Crosswind Road', 2], added('meadow', 'Windmill Green', 2), ['lake', 'Willow Lake', 2], added('lake', 'Reedbank', 2)], bend: 3 },
  { a: 'thunder', b: 'ridgeway', legs: [['badlands', 'Static Badlands', 3], added('badlands', 'Fulgurite Field', 3), ['badlands', 'Sheer Buttes', 4], added('mountain', 'Ridge Foothills', 4)], bend: -3 },
  { a: 'ridgeway', b: 'iron', legs: [['road', 'Old Mine Road', 4], added('mountain', 'Slag Heaps', 4), ['mountain', 'Ore Cliffs', 5], added('coast', 'Rustwater Cove', 5)], bend: 3 },
  { a: 'iron', b: 'saltmarsh', legs: [added('coast', 'Anchor Rocks', 5), ['coast', 'Pebble Beach', 5], added('coast', 'Kelp Shallows', 5), ['coast', 'Lighthouse Point', 5], added('coast', 'Driftwood Spit', 5)], bend: -3 },
  { a: 'saltmarsh', b: 'mangrove', legs: [['river', 'Sawgrass River', 5], added('river', 'Egret Shallows', 5), ['swamp', 'Heron Slough', 5], added('swamp', 'Cypress Knees', 5)], bend: 2 },
  { a: 'stadium', b: 'mangrove', legs: [added('road', 'Lantern Road', 3), ['road', 'Cypress Road', 3], ['lake', 'Lily Lake', 4], added('lake', 'Frog Chorus Pond', 4), ['swamp', 'Gator Slough', 5]], bend: -3 },
  { a: 'ridgeway', b: 'stadium', legs: [added('mountain', 'Ridgeback Trail', 3), added('road', 'Thunderhead Pass', 3), ['road', 'Stormchaser Road', 3], added('meadow', 'Pennant Fields', 3), added('road', 'Grand Approach', 3)], bend: 2 },
  // the two Legendary approaches stay short: they're climbs, not journeys between towns
  { a: 'aurora', b: 'sunspire', legs: [['mountain', 'Whiteout Col', 6]], bend: -2 },
  { a: 'iron', b: 'ironwake', legs: [], req: { item: 'ferry-pass' } }, // offshore: the ferry from Iron Coast
  // Kilauea island: Amber's Fire Pit and its wilds (reached by ferry from Mangrove Port or Kilauea Forge)
  { a: 'firepit', b: 'blackSand', legs: [added('volcanic', 'Cinder Cone', 6), added('volcanic', 'Ember Flue', 6), ['volcanic', 'Steam Vents', 6]], bend: -1.5 },
  { a: 'firepit', b: 'blackSand', legs: [['volcanic', 'Lava Tubes', 7], added('volcanic', 'Magma Chamber', 7), ['coast', 'Obsidian Shore', 6], added('coast', 'Sulfur Springs', 6)], bend: 6 },
  // The endless canyon: a high-rarity stair down to the town of Shifting Depths (a dead end)
  { a: 'canyon', b: 'depths', legs: [added('canyon', 'Redrock Descent', 5), ['canyon', 'Sinkhole Stair', 6], added('canyon', 'Echoing Shaft', 6)], rarity: 1, bend: 3 },
  // Kilauea Forge on the southwest volcanic coast
  { a: 'canyon', b: 'kilauea', legs: [['desert', 'Cinder Barrens', 3], added('desert', 'Ashen Wash', 4), ['volcanic', 'Ashfall Ridge', 4], added('volcanic', 'Forge Road', 4)], bend: -3 },
  { a: 'gloom', b: 'kilauea', legs: [['meadow', 'Scorched Prairie', 3], added('meadow', 'Wildfire Scar', 3), ['desert', 'Glasswind Dunes', 3], added('desert', 'Mirage Flats', 4), ['volcanic', 'Smoldering Flats', 4]], bend: 8 },
  // Quillhaven and its Research Facility, between Ridgeway and Saltmarsh Landing
  { a: 'ridgeway', b: 'quillhaven', legs: [added('meadow', 'Benchmark Hill', 4), ['meadow', 'Survey Meadow', 4], added('meadow', 'Clover Rise', 4)], bend: 2 },
  { a: 'quillhaven', b: 'saltmarsh', legs: [added('meadow', 'Specimen Fields', 4), ['river', 'Tidewater Ford', 5], added('coast', 'Saltgrass Flats', 5)], bend: -2 },
  // Valor Ridge and its Battle School, in the hills between Mistfall and Thunder Spike
  { a: 'mistfall', b: 'valor', legs: [added('mountain', 'Banner Cliffs', 3), ['mountain', 'Sparring Slopes', 3], added('mountain', 'Recruit Rise', 3)], bend: -2 },
  { a: 'valor', b: 'thunder', legs: [['badlands', 'Drill Grounds', 3], added('badlands', 'March Road', 3), added('badlands', 'Static Steppe', 3)], bend: 2 },
  // Legendary branches in the centre and south (an end can be a node's name, e.g. a wild node on a route above)
  { a: 'Willow Lake', b: 'willowheart', legs: [added('lake', 'Reedmist Shallows', 7)], bend: 2 },
  { a: 'dustmere', b: 'dunecrown', legs: [added('desert', 'Singing Sands', 8)], bend: -2 },
  { a: 'mangrove', b: 'boglight', legs: [added('swamp', 'Wisplight Bog', 9)], bend: 2 },
  { a: 'Magma Chamber', b: 'calderaheart', legs: [added('volcanic', 'Ember Rift', 10)], bend: -1 },
];

const nodes: MapNode[] = [...hubs];
const edges: MapEdge[] = [];
/** A node by id, or by name (so a route can branch off a wild node defined by an earlier route). */
const byId = (id: string) => nodes.find((n) => n.id === id) ?? nodes.find((n) => n.name === id)!;

let wildCount = 0, addedCount = 0;
for (const r of routes) {
  const A = byId(r.a), B = byId(r.b);
  const dx = B.x - A.x, dz = B.z - A.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len, pz = dx / len;
  let prev = A.id;
  r.legs.forEach((leg, i) => {
    const t = (i + 1) / (r.legs.length + 1);
    const bend = (r.bend ?? 0) * MAP_SCALE * Math.sin(Math.PI * t);
    const id = leg[3] ? `n${++addedCount}` : `w${++wildCount}`;
    nodes.push({
      id, name: leg[1], kind: 'wild', biome: leg[0],
      x: +(A.x + dx * t + px * bend).toFixed(2), z: +(A.z + dz * t + pz * bend).toFixed(2),
      rarity: r.rarity ?? (leg[2] && leg[2] >= 5 ? 1 : 0), level: leg[2] ?? 2,
    });
    edges.push({ a: prev, b: id });
    prev = id;
  });
  edges.push({ a: prev, b: B.id, requires: r.req });
}
// ── Cloud Island ───────────────────────────────────────────────
// A ring of six cloud nodes floating off the north-west coast, reached by a portal from Aurora Peak
// (open at night, or any time in Winter). A full lap of the ring earns a match with Salem; once he's
// beaten, bridges open to the Eye of the Sky in the middle, where the Legendary Nimbalune waits.
export const CLOUD_RING = ['cloud1', 'cloud2', 'cloud3', 'cloud4', 'cloud5', 'cloud6'];
export const CLOUD_EYE = 'cloudeye';
/** Every Cloud Island node (the ring and the Eye). */
export const CLOUD_NODES = [...CLOUD_RING, CLOUD_EYE];
export const isCloudNode = (id: string) => CLOUD_NODES.includes(id);
{
  const cx = -58 * MAP_SCALE, cz = -66 * MAP_SCALE, r = 10;
  const names = ['Gatecloud Landing', 'Nimbus Steps', 'Starfall Drift', 'Moonbow Arch', 'Thunderhead Rise', 'Stillwind Hollow'];
  const start = Math.atan2(26, 28); // the gate faces Aurora Peak
  CLOUD_RING.forEach((id, i) => {
    const a = start + (i * Math.PI) / 3;
    nodes.push({ id, name: names[i], kind: 'wild', biome: 'cloud', x: +(cx + Math.cos(a) * r).toFixed(2), z: +(cz + Math.sin(a) * r).toFixed(2), rarity: 1, level: 6 });
  });
  nodes.push({ id: CLOUD_EYE, name: 'Eye of the Sky', kind: 'legendary', biome: 'cloud', x: cx, z: cz, rarity: 3, level: 10, legendary: 'nimbalune', requires: { merit: 'aurora' } });
  CLOUD_RING.forEach((id, i) => edges.push({ a: id, b: CLOUD_RING[(i + 1) % CLOUD_RING.length] }));
  for (const id of [CLOUD_RING[0], CLOUD_RING[2], CLOUD_RING[4]]) edges.push({ a: id, b: CLOUD_EYE });
  edges.push({ a: 'aurora', b: CLOUD_RING[0], via: 'portal' });
}

// ── Lantern Glade and the Rainbow Plains ──────────────────────
// A misty branch off Fogbank Path leads north-west (south of Aurora Peak) to the town of Lantern Glade.
// Only a Fog Lantern with a wisp caught in it lights the way in; the wisp flies home when the trainer
// leaves the Glade and the Plains behind it, so every visit takes a new one (state.ts → wisps).
// The Plains' wild type changes every day, they turn the color of that type, finds are exotic, and
// every creature is at least one rarity higher (world.ts → Rainbow Plains).
export const LANTERN_GLADE = 'lanternglade';
export const RAINBOW_PLAINS = ['prism1', 'prism2', 'prism3', 'prism4'];
/** Lantern Glade and the Rainbow Plains: the part of the map a wisp opens. */
export const WISP_REGION = [LANTERN_GLADE, ...RAINBOW_PLAINS];
export const inWispRegion = (id: string) => WISP_REGION.includes(id);
export const isRainbowPlains = (id: string) => RAINBOW_PLAINS.includes(id);
{
  const spots: [string, number, number][] = [['Prism Meadow', -41, -27], ['Huefield Run', -46, -25], ['Spectrum Rise', -43, -31.5], ['Rainbow’s End', -49, -29.5]];
  RAINBOW_PLAINS.forEach((id, i) => {
    const [name, x, z] = spots[i];
    nodes.push({ id, name, kind: 'wild', biome: 'prism', x: +(x * MAP_SCALE).toFixed(2), z: +(z * MAP_SCALE).toFixed(2), rarity: 0, level: 4 });
  });
  edges.push({ a: nodes.find((n) => n.name === 'Fogbank Path')!.id, b: LANTERN_GLADE, requires: { wisp: true } });
  edges.push({ a: LANTERN_GLADE, b: 'prism1' });
  edges.push({ a: 'prism1', b: 'prism2' }, { a: 'prism1', b: 'prism3' }, { a: 'prism2', b: 'prism4' }, { a: 'prism3', b: 'prism4' });
}

// The rope down to the Forest Floor (needs a Canopy Rope)
export const FOREST_FLOOR = 'forestfloor';
edges.push({ a: 'gloom', b: FOREST_FLOOR, via: 'rope', requires: { item: 'canopy-rope' } });

// The ferries to Kilauea island
edges.push({ a: 'mangrove', b: 'blackSand', via: 'sea', requires: { item: 'ferry-pass' } });
edges.push({ a: 'kilauea', b: 'blackSand', via: 'sea', requires: { item: 'ferry-pass' } });
/** The wild stair leading down to Shifting Depths (its level and rarity set what the Depths turn up). */
export const DEPTHS_STAIR = nodes.find((n) => n.name === 'Sinkhole Stair')!.id;

export const MAP_NODES = nodes;
/**
 * Where a wisp can wait: every wild node, town and city on the mainland that can be walked to with
 * no key item (so no ferries, portal, rope or gates), outside Lantern Glade and the Plains.
 */
export const WISP_SPOTS: string[] = (() => {
  const open = new Set(['mistfall']), q = ['mistfall'];
  while (q.length) {
    const at = q.pop()!;
    for (const e of edges) {
      if (e.via || e.requires) continue;
      const to = e.a === at ? e.b : e.b === at ? e.a : null;
      if (!to || open.has(to)) continue;
      const n = byId(to);
      if (n.requires) continue;
      open.add(to); q.push(to);
    }
  }
  return nodes.filter((n) => open.has(n.id) && ['wild', 'town', 'city'].includes(n.kind) && !inWispRegion(n.id)).map((n) => n.id);
})();
export const MAP_EDGES = edges;
export const NODE_BY_ID: Record<string, MapNode> = Object.fromEntries(nodes.map((n) => [n.id, n]));

export function neighbors(id: string): { node: MapNode; edge: MapEdge }[] {
  const out: { node: MapNode; edge: MapEdge }[] = [];
  for (const e of edges) {
    if (e.a === id) out.push({ node: NODE_BY_ID[e.b], edge: e });
    else if (e.b === id) out.push({ node: NODE_BY_ID[e.a], edge: e });
  }
  return out;
}

export const CITIES: Record<string, City> = {
  aurora: { nodeId: 'aurora', name: 'Aurora Peak', type: 'astral', park: 'Denali', arbiter: 'Salem', accolade: 'Polaris Merit',
    arena: { name: 'Ice Floe Arena', trick: 'iceFloes', text: 'Floating ice floes tip under unprepared creatures — each round, a creature may slip into the frigid water.' },
    hotpot: { name: 'Geothermal Miso Nabe', buff: { ward: 1 }, text: '+1 Ward in your next battle.' },
    blurb: 'Low houses half-sunk into the earth for geothermal warmth. The aurora rules the night sky here.' },
  hollow: { nodeId: 'hollow', name: 'Hollow Crest', type: 'charm', park: 'Olympic', arbiter: 'Fabian', accolade: 'Glamour Merit',
    arena: { name: 'Glamour Grove', trick: 'illusion', text: 'Fog and glamorous lighting: Fabian\'s creatures gain +1 Evasion.' },
    hotpot: { name: 'Mushroom Moss Nabe', buff: { evasion: 1 }, text: '+1 Evasion in your next battle.' },
    blurb: 'Cozy log cabins in a moss-draped rainforest. Somewhere in town, the Arbiter is in disguise.' },
  thunder: { nodeId: 'thunder', name: 'Thunder Spike', type: 'electric', park: 'Badlands', arbiter: 'Watson', accolade: 'Bolt Merit',
    arena: { name: 'Under the Spike', trick: 'volts', text: 'The great lightning rod discharges across the arena: Electric creatures (dual types too) are healed by it, everyone else is shocked. Bring Electric creatures to turn it in your favor.' },
    hotpot: { name: 'Prairie Chili Nabe', buff: { speed: 1 }, text: '+1 Speed in your next battle.' },
    blurb: 'A town on rugged badlands, named for the colossal lightning rod that shields it from the roving storm.' },
  kilauea: { nodeId: 'kilauea', name: 'Kilauea Forge', type: 'fire', park: 'Hawai\'i Volcanoes', arbiter: 'Amber', accolade: 'Caldera Merit',
    arena: { name: 'Fire Pit', trick: 'flames', text: 'Steam vents scald any non-Fire creature every other round.' },
    arenaNode: 'firepit',
    hotpot: { name: 'Volcanic Shoyu Nabe', buff: { power: 1 }, text: '+1 Power in your next battle.' },
    blurb: 'A forge town on the black-rock coast, warmed by lava channels. Offshore, Kilauea island smokes, and Amber\'s Fire Pit waits there. Ferries leave from the forge docks.' },
  gloom: { nodeId: 'gloom', name: 'Gloomshade', type: 'grass', park: 'Redwood', arbiter: 'Dahlia', accolade: 'Lily Merit',
    arenaNode: 'forestfloor',
    arena: { name: 'Forest Floor Arena', trick: 'darkness', text: 'In the lightless forest floor, challengers roll 1 lower to hit.' },
    hotpot: { name: 'Canopy Herb Nabe', buff: { vigor: 1 }, text: '+1 Vigor (5 extra Health, as Overheal) in your next battle.' },
    blurb: 'Boardwalks and ring platforms built into towering redwoods, high above a bottomless dark.' },
  canyon: { nodeId: 'canyon', name: 'Houndmouth Canyon', type: 'rock', park: 'Grand Canyon', arbiter: 'Cliff', accolade: 'Plateau Merit',
    arena: { name: 'Crumbling Plateau', trick: 'crumble', text: 'The plateau shrinks every round. Beat Cliff before it’s gone, or you’re rung out and lose (10 rounds at Tier 1–2, 9 at Tier 3–4, 8 at Tier 5).' },
    hotpot: { name: 'Red Clay Nabe', buff: { armor: 1 }, text: '+1 Armor in your next battle.' },
    blurb: 'An unfathomable canyon whose walls shift as Rock creatures carve new tunnels. It never ends.' },
  iron: { nodeId: 'iron', name: 'Iron Coast', type: 'steel', park: 'Acadia', arbiter: 'Stella', accolade: 'Anchor Merit',
    arena: { name: 'Floating Fortress', trick: 'fortress', text: 'Stella\'s fortress plating grants her creatures +1 Armor and Ward.' },
    hotpot: { name: 'Lobster Bisque Nabe', buff: { armor: 1, ward: 1 }, text: '+1 Armor & Ward in your next battle.' },
    blurb: 'Foggy pebble beaches and colorful houses. Strange ore washes ashore from a distant sea.' },
  mangrove: { nodeId: 'mangrove', name: 'Mangrove Port', type: 'water', park: 'Everglades', arbiter: 'Katy', accolade: 'Tidal Merit',
    arena: { name: 'Root Maze', trick: 'roots', text: 'Shifting roots slow challengers: -1 Speed.' },
    hotpot: { name: 'Swamp Gumbo Nabe', buff: { focus: 1 }, text: '+1 Focus in your next battle.' },
    blurb: 'A city on stilts above marsh waters, linked by boardwalks and swaying bridges.' },
};

export const TOWNS: Record<string, { blurb: string; sells: string[]; key?: string; special?: string }> = {
  mistfall: { blurb: 'A mountain waystation where travelers buy lanterns before braving the fog. Catch a wisp in one and it lights the misty way to Lantern Glade.', sells: ['salve', 'calm-tea', 'totem', 'sunberry', 'trail-mix'], key: 'fog-lantern' },
  lumber: { blurb: 'Loggers and woodcarvers in a hollow among the giant trees. A bike-maker’s shed sits by the sawmill.', sells: ['salve', 'totem', 'dewberry', 'pine-resin', 'bike'] },
  dustmere: { blurb: 'A dusty trading post. Rare charms change hands under striped awnings.', sells: ['star-charm', 'lure-incense', 'hush-smoke', 'moonberry', 'energy-tonic', 'totem', 'homing-feather'] },
  ridgeway: { blurb: 'A climbing town on the ridge. Grizzled guides sell picks for the high summits.', sells: ['salve', 'rousing-salts', 'calm-tea', 'glacier-salt', 'trail-mix', 'hush-smoke'], key: 'summit-pick' },
  saltmarsh: { blurb: 'Where the coast turns to marsh. The ferry office is here.', sells: ['salve', 'sea-glass', 'marsh-lotus', 'totem'], key: 'ferry-pass' },
  blackSand: { blurb: 'Ferry landing on Kilauea\'s black sand. Hot springs bubble beside the dock.', sells: ['elixir', 'volcanic-glass', 'ember-charcoal'], },
  valor: { blurb: 'A hill town of training yards and the Margos Battle School. Leave a creature with the drill masters and it comes back stronger, or have it retrained overnight with a new Nature, Ability or Instinct.', sells: ['salve', 'rousing-salts', 'energy-tonic', 'totem', 'dewberry'], special: 'school' },
  quillhaven: { blurb: 'A quiet meadow town around the Margos Research Facility, where field researchers study creatures released into their care.', sells: ['salve', 'totem', 'sunberry', 'calm-tea', 'homing-feather'], special: 'research' },
  lanternglade: { blurb: 'Paper lanterns hang in the mist over a hidden glade. Past the last lantern, the Rainbow Plains change color with every new day.', sells: ['salve', 'totem', 'calm-tea', 'trail-mix', 'moonberry'] },
  depths: { blurb: 'Lantern-lit ledges at the bottom of the endless canyon. Leave an offering at the edge of the dark, and something that craves it climbs up to meet you.', sells: ['salve', 'rousing-salts', 'totem', 'canyon-ochre', 'ember-charcoal'], special: 'depths' },
  stadium: { blurb: 'The tournament grounds at the heart of Margos. Between seasons, the stalls and stables around the arena serve trainers on the road.', sells: ['salve', 'elixir', 'rousing-salts', 'calm-tea', 'totem', 'sunberry', 'trail-mix', 'homing-feather'], special: 'stadium' },
};
/** A town, or Circuit Stadium, which works as one (stable, market, workbench, odd jobs …). */
export const isTown = (id: string) => ['town', 'stadium'].includes(NODE_BY_ID[id]?.kind);

// ── Roaming key items ───────────────────────────────────────────
/**
 * Key items whose town is rolled at random for every new game (state.ts → rollKeyTowns): the Canopy
 * Rope (Dahlia, Gloomshade) and the Root Whistle (Katy, Mangrove Port). The Fog Lantern, Summit Pick
 * and Ferry Pass stay where they are.
 */
export const ROAMING_KEY_ITEMS = ['canopy-rope', 'root-whistle'];
/** Where they were before they roamed (used for older saves). */
export const CLASSIC_KEY_TOWNS: Record<string, string> = { 'canopy-rope': 'lumber', 'root-whistle': 'saltmarsh' };
/**
 * Towns that can stock a roaming key item: every town without a special facility (Battle School,
 * Research Facility, Shifting Depths, and any added later), except Black Sand Cove, which is only
 * reachable by ferry, and Lantern Glade, behind a wisp: either would lock a key item behind another one. Circuit Stadium never sells them.
 */
export const KEY_ITEM_TOWNS = Object.keys(TOWNS).filter((id) => !TOWNS[id].special && id !== 'stadium' && id !== 'blackSand' && id !== LANTERN_GLADE);

/** Which types live near each biome — the wild type pool. */
export const BIOME_TYPES: Record<Biome, ElementType[]> = {
  forest: ['grass', 'charm'], grove: ['charm', 'grass'], meadow: ['grass', 'charm', 'electric'],
  mountain: ['rock', 'astral', 'steel'], tundra: ['astral', 'water'], lake: ['water', 'charm'],
  river: ['water', 'grass'], road: ['steel', 'electric'], swamp: ['water', 'grass'],
  desert: ['fire', 'electric', 'rock'], badlands: ['electric', 'rock'], coast: ['water', 'steel'],
  volcanic: ['fire', 'rock'], canyon: ['rock', 'fire'],
  cloud: ['astral', 'electric', 'water', 'charm'],
  deepwood: ['grass', 'charm', 'rock'],
  // the Rainbow Plains can turn up any type: which one changes every day (world.ts → prismType)
  prism: ['astral', 'charm', 'electric', 'fire', 'grass', 'rock', 'steel', 'water'],
};
