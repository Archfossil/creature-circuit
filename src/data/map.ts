// The map being played on. The places themselves are in the region's package (src/regions); the names here
// are how the rest of the game reads them, along with what's the same on every map.
import type { MapNode, MapEdge, Biome, ElementType } from './schema';
import { MARGOS } from '../regions';

// Margos's own places, until they become gimmicks (docs/16-region-packages.md, step 6)
export {
  CLOUD_RING, CLOUD_EYE, CLOUD_NODES, isCloudNode, LANTERN_GLADE, RAINBOW_PLAINS, WISP_REGION, inWispRegion, isRainbowPlains,
  FOREST_FLOOR, DEPTHS_STAIR, WISP_SPOTS, ROAMING_KEY_ITEMS, CLASSIC_KEY_TOWNS, KEY_ITEM_TOWNS,
} from '../regions/margos/map';

export const MAP_SCALE = MARGOS.map.scale;
export const MAP_NODES = MARGOS.map.nodes;
export const MAP_EDGES = MARGOS.map.edges;
export const CITIES = MARGOS.map.cities;
export const TOWNS = MARGOS.map.towns;
export const NODE_BY_ID: Record<string, MapNode> = Object.fromEntries(MAP_NODES.map((n) => [n.id, n]));

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
