// The map being played on. The places themselves are in the region's package (src/regions); the names here
// are how the rest of the game reads them, along with what's the same on every map.
import type { City, MapNode, MapEdge, Biome, ElementType } from './schema';
import { onRegion } from '../regions/active';
import type { Town } from '../regions/types';

// Margos's own places, until they become gimmicks (docs/16-region-packages.md, step 6). Elsewhere, they match nowhere.
export {
  CLOUD_RING, CLOUD_EYE, CLOUD_NODES, isCloudNode, LANTERN_GLADE, RAINBOW_PLAINS, WISP_REGION, inWispRegion, isRainbowPlains, FOREST_FLOOR,
} from '../regions/margos/map';

export let MAP_SCALE: number;
export let MAP_NODES: MapNode[];
export let MAP_EDGES: MapEdge[];
export let CITIES: Record<string, City>;
export let TOWNS: Record<string, Town>;
export let NODE_BY_ID: Record<string, MapNode>;
// see regions/types.ts → Places
export let WISP_SPOTS: string[];
export let ROAMING_KEY_ITEMS: string[];
export let KEY_ITEM_TOWNS: string[];
export let CLASSIC_KEY_TOWNS: Record<string, string>;
export let DEPTHS_STAIR: string | undefined;
onRegion(({ map }) => {
  MAP_SCALE = map.scale;
  MAP_NODES = map.nodes;
  MAP_EDGES = map.edges;
  CITIES = map.cities;
  TOWNS = map.towns;
  NODE_BY_ID = Object.fromEntries(MAP_NODES.map((n) => [n.id, n]));
  WISP_SPOTS = map.places.wispSpots;
  ROAMING_KEY_ITEMS = map.places.roamingKeyItems;
  KEY_ITEM_TOWNS = map.places.keyItemTowns;
  CLASSIC_KEY_TOWNS = map.places.classicKeyTowns;
  DEPTHS_STAIR = map.places.depthsStair;
});

export function neighbors(id: string): { node: MapNode; edge: MapEdge }[] {
  const out: { node: MapNode; edge: MapEdge }[] = [];
  for (const e of MAP_EDGES) {
    if (e.a === id) out.push({ node: NODE_BY_ID[e.b], edge: e });
    else if (e.b === id) out.push({ node: NODE_BY_ID[e.a], edge: e });
  }
  return out;
}

/** A town, or Circuit Stadium, which works as one (stable, market, workbench, odd jobs …). */
export const isTown = (id: string) => ['town', 'stadium'].includes(NODE_BY_ID[id]?.kind);

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
