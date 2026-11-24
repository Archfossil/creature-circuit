// What a region is made of (docs/16-region-packages.md). Packages only import types from the rest of the
// game: the data files read the packages as the game loads, so anything more would go round in a circle.
import type { Season } from '../data/content';
import type { Npc } from '../data/npcs';
import type { Activity, Biome, City, MapEdge, MapNode, Rarity } from '../data/schema';
import type { Voice } from '../data/texts';
import type { TrainerLook } from '../render/trainerModel';

export interface Town { blurb: string; sells: string[]; key?: string; special?: string }

/** A Rival's or Champion's clothes. Their skin comes from their name, and the rest from whether they're a Champion. */
export type Outfit = Omit<TrainerLook, 'skin' | 'rim' | 'cape' | 'emblem'>;

/** Particular places the rules ask for. Some will become gimmicks (docs/16-region-packages.md, step 6). */
export interface Places {
  /** Everywhere that can be walked to with no key item: where a wisp can wait, and where a race can go. */
  wispSpots: string[];
  /** Key items whose town is rolled for every new game, the towns they can be in, and where they were before they roamed. */
  roamingKeyItems: string[];
  keyItemTowns: string[];
  classicKeyTowns: Record<string, string>;
  /** The wild node whose level and rarity set what the Depths turn up, if there are any. */
  depthsStair?: string;
  /** Two ends of the map, for the challenge to visit both. Without two, nobody sets it. */
  coasts: string[];
}

/** How a species differs here: only where it lives, when it's out and how rare it is. Its stats, moves and chart are the same everywhere. */
export interface LocalForm { biomes?: Biome[]; activity?: Activity; rarity?: Exclude<Rarity, 'legendary'> }

/** Which of the library's species live here (data/species.ts). Nobody else turns up in this region. */
export interface Codex {
  /** Their ids, whole families at a time, or every species there is. Their order is the library's. */
  species: string[] | 'all';
  starters: string[];
  /** By species id. Not for Legendaries: they live at their node. */
  local?: Record<string, LocalForm>;
}

export interface Region {
  /** Never changes: it will be in saves. */
  id: string;
  name: string;
  map: { scale: number; nodes: MapNode[]; edges: MapEdge[]; cities: Record<string, City>; towns: Record<string, Town>; places: Places };
  codex: Codex;
  /** Rivals and Champions, and by their ids, what they say and wear. */
  people: { npcs: Npc[]; voices: Record<string, Voice>; looks: Record<string, Outfit> };
  /** Each season's weather die. */
  weather: Record<Season, string[]>;
}
