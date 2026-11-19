import type { MapNode, MapEdge, City, Biome, ElementType } from './schema';

// The region of Margos. North is -z, east is +x. Roughly 110 x 100 world units.

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
  // Amber's arena sits alone on Kilauea island, reached by ferry
  { id: 'firepit', name: 'Amber\'s Fire Pit', kind: 'arena', biome: 'volcanic', x: 6, z: 64, rarity: 0, level: 1, arenaOf: 'kilauea' },
  // Legendary nodes
  { id: 'sunspire', name: 'Sunspire Summit', kind: 'legendary', biome: 'mountain', x: -10, z: -38, rarity: 3, level: 9, legendary: 'solstara', requires: { tier: 3, item: 'summit-pick' } },
  { id: 'ironwake', name: 'Ironwake Shoals', kind: 'legendary', biome: 'coast', x: 54, z: -40, rarity: 3, level: 11, legendary: 'thalassor', requires: { tier: 4 } },
];

type Leg = [Biome, string, number?]; // biome, name, level

/** A route between two hubs; intermediate wild nodes are laid out along the line with a gentle wiggle. */
const routes: { a: string; b: string; legs: Leg[]; req?: MapEdge['requires']; rarity?: number; bend?: number }[] = [
  { a: 'aurora', b: 'mistfall', legs: [['tundra', 'Frostbite Flats', 3], ['mountain', 'Glacier Stair', 3]], bend: 3 },
  { a: 'mistfall', b: 'hollow', legs: [['grove', 'Fogbank Path', 2], ['forest', 'Fernway', 2]], req: { item: 'fog-lantern', movement: 'wayfind' }, bend: -3 },
  { a: 'hollow', b: 'lumber', legs: [['forest', 'Mossy Hollow', 2], ['grove', 'Rainshadow Glen', 3]], bend: 3 },
  { a: 'lumber', b: 'gloom', legs: [['forest', 'Shadeway', 3], ['forest', 'Fallen Giant', 4]], bend: -2 },
  { a: 'gloom', b: 'canyon', legs: [['meadow', 'Sunbaked Meadow', 3], ['canyon', 'Redrock Pass', 4]], bend: 3 },
  { a: 'canyon', b: 'dustmere', legs: [['canyon', 'Mesa Rim', 4], ['desert', 'Sagebrush Flat', 3]], bend: -3 },
  { a: 'dustmere', b: 'stadium', legs: [['road', 'Circuit Road', 2]] },
  { a: 'mistfall', b: 'thunder', legs: [['river', 'Snowmelt River', 2], ['mountain', 'Pine Ridge', 2]], bend: 3 },
  { a: 'thunder', b: 'stadium', legs: [['meadow', 'Bison Meadow', 1]] },
  { a: 'lumber', b: 'stadium', legs: [['road', 'Crosswind Road', 2], ['lake', 'Willow Lake', 2]], bend: 3 },
  { a: 'thunder', b: 'ridgeway', legs: [['badlands', 'Static Badlands', 3], ['badlands', 'Sheer Buttes', 4]], bend: -3 },
  { a: 'ridgeway', b: 'iron', legs: [['road', 'Old Mine Road', 4], ['mountain', 'Ore Cliffs', 5]], bend: 3 },
  { a: 'iron', b: 'saltmarsh', legs: [['coast', 'Pebble Beach', 5], ['coast', 'Lighthouse Point', 5]], bend: -3 },
  { a: 'saltmarsh', b: 'mangrove', legs: [['river', 'Sawgrass River', 5], ['swamp', 'Heron Slough', 5]], bend: 2 },
  { a: 'stadium', b: 'mangrove', legs: [['road', 'Cypress Road', 3], ['lake', 'Lily Lake', 4], ['swamp', 'Gator Slough', 5]], bend: -3 },
  { a: 'ridgeway', b: 'stadium', legs: [['road', 'Stormchaser Road', 3]], bend: 2 },
  { a: 'aurora', b: 'sunspire', legs: [['mountain', 'Whiteout Col', 6]], bend: -2 },
  { a: 'iron', b: 'ironwake', legs: [], req: { movement: 'sail' } },
  // Kilauea island: Amber's Fire Pit and its wilds (reached by ferry from Mangrove Port or Kilauea Forge)
  { a: 'firepit', b: 'blackSand', legs: [['volcanic', 'Steam Vents', 6]], bend: -3 },
  { a: 'firepit', b: 'blackSand', legs: [['volcanic', 'Lava Tubes', 7], ['coast', 'Obsidian Shore', 6]], bend: 6 },
  // The endless canyon: a dead-end of high-rarity nodes
  { a: 'canyon', b: 'dustmere', legs: [['canyon', 'Shifting Depths', 6]], rarity: 1, bend: 9 },
  // Kilauea Forge on the southwest volcanic coast (keep these last: new wild ids are appended)
  { a: 'canyon', b: 'kilauea', legs: [['desert', 'Cinder Barrens', 3], ['volcanic', 'Ashfall Ridge', 4]], bend: -3 },
  { a: 'gloom', b: 'kilauea', legs: [['meadow', 'Scorched Prairie', 3], ['desert', 'Glasswind Dunes', 3], ['volcanic', 'Smoldering Flats', 4]], bend: 8 },
];

const nodes: MapNode[] = [...hubs];
const edges: MapEdge[] = [];
const byId = (id: string) => nodes.find((n) => n.id === id)!;

let wildCount = 0;
for (const r of routes) {
  const A = byId(r.a), B = byId(r.b);
  const dx = B.x - A.x, dz = B.z - A.z;
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len, pz = dx / len;
  let prev = A.id;
  r.legs.forEach((leg, i) => {
    const t = (i + 1) / (r.legs.length + 1);
    const bend = (r.bend ?? 0) * Math.sin(Math.PI * t);
    const id = `w${++wildCount}`;
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
// The ferries to Kilauea island
edges.push({ a: 'mangrove', b: 'blackSand', via: 'sail', requires: { item: 'ferry-pass', movement: 'sail' } });
edges.push({ a: 'kilauea', b: 'blackSand', via: 'sail', requires: { item: 'ferry-pass', movement: 'sail' } });
// The Shifting Depths is a dead end; remove its exit to Dustmere so the canyon is a pocket
{
  const depths = nodes.find((n) => n.name === 'Shifting Depths')!;
  const idx = edges.findIndex((e) => e.a === depths.id && e.b === 'dustmere');
  if (idx >= 0) edges.splice(idx, 1);
}

export const MAP_NODES = nodes;
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
    arena: { name: 'Under the Spike', trick: 'volts', text: 'The great lightning rod discharges volts onto random creatures each round.' },
    hotpot: { name: 'Prairie Chili Nabe', buff: { speed: 1 }, text: '+1 Speed in your next battle.' },
    blurb: 'A town on rugged badlands, named for the colossal lightning rod that shields it from the roving storm.' },
  kilauea: { nodeId: 'kilauea', name: 'Kilauea Forge', type: 'fire', park: 'Hawai\'i Volcanoes', arbiter: 'Amber', accolade: 'Caldera Merit',
    arena: { name: 'Fire Pit', trick: 'flames', text: 'Steam vents scald any non-Fire creature every other round.' },
    arenaNode: 'firepit',
    hotpot: { name: 'Volcanic Shoyu Nabe', buff: { power: 1 }, text: '+1 Power in your next battle.' },
    blurb: 'A forge town on the black-rock coast, warmed by lava channels. Offshore, Kilauea island smokes, and Amber\'s Fire Pit waits there. Ferries leave from the forge docks.' },
  gloom: { nodeId: 'gloom', name: 'Gloomshade', type: 'grass', park: 'Redwood', arbiter: 'Dahlia', accolade: 'Lily Merit',
    arena: { name: 'Forest Floor Arena', trick: 'darkness', text: 'In the lightless forest floor, challengers roll 1 lower to hit.' },
    hotpot: { name: 'Canopy Herb Nabe', buff: { vigor: 1 }, text: '+1 Vigor in your next battle.' },
    blurb: 'Boardwalks and ring platforms built into towering redwoods, high above a bottomless dark.' },
  canyon: { nodeId: 'canyon', name: 'Houndmouth Canyon', type: 'rock', park: 'Grand Canyon', arbiter: 'Cliff', accolade: 'Plateau Merit',
    arena: { name: 'Crumbling Plateau', trick: 'crumble', text: 'The plateau edges break away; from round 4, creatures risk falling for heavy damage.' },
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
  mistfall: { blurb: 'A mountain waystation where travelers buy lanterns before braving the fog.', sells: ['salve', 'calm-tea', 'totem', 'sunberry'], key: 'fog-lantern' },
  lumber: { blurb: 'Loggers and rope-makers. They know the way down to the Gloomshade floor.', sells: ['salve', 'totem', 'dewberry', 'pine-resin'], key: 'canopy-rope' },
  dustmere: { blurb: 'A dusty trading post. Rare charms change hands under striped awnings.', sells: ['star-charm', 'lure-incense', 'moonberry', 'energy-tonic', 'totem'], special: 'trade' },
  ridgeway: { blurb: 'A climbing town on the ridge. Grizzled guides sell picks for the high summits.', sells: ['salve', 'calm-tea', 'glacier-salt'], key: 'summit-pick' },
  saltmarsh: { blurb: 'Where the coast turns to marsh. The ferry office and the root-keepers are here.', sells: ['salve', 'sea-glass', 'marsh-lotus', 'totem'], key: 'ferry-pass' },
  blackSand: { blurb: 'Ferry landing on Kilauea\'s black sand. Hot springs bubble beside the dock.', sells: ['elixir', 'volcanic-glass', 'ember-charcoal'], },
};
// The Root Whistle (Katy's arena) is sold at Saltmarsh too
TOWNS.saltmarsh.sells.push('root-whistle');

/** Which types live near each biome — the wild type pool. */
export const BIOME_TYPES: Record<Biome, ElementType[]> = {
  forest: ['grass', 'charm'], grove: ['charm', 'grass'], meadow: ['grass', 'charm', 'electric'],
  mountain: ['rock', 'astral', 'steel'], tundra: ['astral', 'water'], lake: ['water', 'charm'],
  river: ['water', 'grass'], road: ['steel', 'electric'], swamp: ['water', 'grass'],
  desert: ['fire', 'electric', 'rock'], badlands: ['electric', 'rock'], coast: ['water', 'steel'],
  volcanic: ['fire', 'rock'], canyon: ['rock', 'fire'],
};
