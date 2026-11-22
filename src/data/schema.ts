// Creature Circuit — data schemas.
// These interfaces are the contract between content (species, moves, map) and the engine.
// See docs/05-data-schemas.md for the JSON form of each template.

export type ElementType =
  | 'astral' | 'charm' | 'electric' | 'fire'
  | 'grass' | 'rock' | 'steel' | 'water';

export type EnergyKey = ElementType | 'prisma';
export type EnergyMap = Partial<Record<EnergyKey, number>>;
export type Rarity = 'common' | 'prime' | 'apex' | 'legendary';
export type StatKey = 'vigor' | 'power' | 'armor' | 'focus' | 'ward' | 'speed' | 'evasion' | 'stamina';
export type Stats = Record<StatKey, number>;

export type BodyShape = 'blob' | 'quad' | 'bird' | 'serpent' | 'golem' | 'sprite' | 'fish';

export interface CreatureLook {
  shape: BodyShape;
  primary: string;   // hex body color
  secondary: string; // hex accent color
  /** Extra decoration keyed by the creature's main type (ears, flames, leaves, crystal...) */
  crest?: 'horns' | 'ears' | 'flame' | 'leaf' | 'crystal' | 'fin' | 'halo' | 'spikes' | 'antenna' | 'plates';
}

/** Template: a species as it appears in the creature database. */
export interface Species {
  id: string;
  name: string;
  types: [ElementType] | [ElementType, ElementType];
  rarity: Rarity;
  stage: 1 | 2 | 3;
  evolvesTo?: string;
  /** Base attributes at level 1. Health = Vitality = vigor by default. */
  base: Stats;
  /** Energy generated (requirement budget for the playbook, not spent per use). */
  energy: EnergyMap;
  /** Recruitment Threshold: target number for totem + offering roll. */
  rt: number;
  ability: string;        // ability id (overworld passive)
  instinct: string;       // Instinct id (data/instincts.ts): its passive in battle
  signature?: string;     // move id unlocked via progression
  biomes: Biome[];        // where it can be encountered in the wild
  dex: string;            // flavor text for the index card
  look: CreatureLook;
  /** A generated stand-in filling a roster slot until the real creature is designed (see roster.ts). */
  placeholder?: boolean;
  /** When it's out in the wild: by day, by night, or both (see species.ts → activity rules). */
  activity?: Activity;
}

/** Odd turns are day, even turns are night (see content.ts → timeOfDay). */
export type TimeOfDay = 'day' | 'night';
/** Diurnal creatures roam by day, nocturnal ones by night, crepuscular ones at any time. */
export type Activity = 'diurnal' | 'nocturnal' | 'crepuscular';

export type MoveKind = 'physical' | 'elemental' | 'support';
export type StatusId = 'burn' | 'soak' | 'shock' | 'snare' | 'stagger' | 'sunder' | 'beguile' | 'daze';

/** Template: an entry in the Master Move List. */
export interface Move {
  id: string;
  name: string;
  kind: MoveKind;
  type?: ElementType;           // elemental / support moves
  cost: EnergyMap & { neutral?: number }; // energy needed to slot in the playbook
  effort: number;               // stamina drained on use
  speed: number;                // speed modifier for this round
  accuracy: number | 'sure';    // die size rolled vs Evasion, or always hits
  /** Zeroing In: accuracy bonus this move gives the creature's next accuracy roll when it misses (default ZERO_IN = 1; 0 = never zeroes in). */
  zeroIn?: number;
  dmgDie: number;               // 0 = none
  /** More damage dice rolled with dmgDie and added up (e.g. [4] for "d6+d4"). Any of them showing a 1 inflicts the status. */
  extraDice?: number[];
  /** Physical moves: crit on the top N faces of the accuracy die (default 1, the top face only). */
  critRange?: number;
  dmgFlat: number;
  status?: StatusId;            // inflicted when any damage die shows a 1 (elemental)
  /** Support effects */
  effect?: { self?: Partial<Record<StatKey, number>>; foe?: Partial<Record<StatKey, number>>; heal?: number; staminaGain?: number };
  text: string;
  /** A generated stand-in filling a slot of the attack grid until a real move is designed (see moves.ts). */
  placeholder?: boolean;
}

export type Biome =
  | 'forest' | 'mountain' | 'tundra' | 'lake' | 'river' | 'road' | 'swamp'
  | 'desert' | 'badlands' | 'coast' | 'volcanic' | 'canyon' | 'meadow' | 'grove' | 'cloud' | 'deepwood' | 'prism';

export type NodeKind = 'wild' | 'town' | 'city' | 'legendary' | 'stadium' | 'arena';

/** Template: a node on the world map. */
export interface MapNode {
  id: string;
  name: string;
  kind: NodeKind;
  biome: Biome;
  x: number; // world units, east +
  z: number; // world units, south +
  rarity: number;       // base rarity added before star dice
  level: number;        // typical wild creature level
  cityType?: ElementType;
  legendary?: string;   // species id roaming here
  arenaOf?: string;     // kind 'arena': the city whose Arbiter fights here
  /** merit: only trainers holding that city's Merit may enter (e.g. Salem's for the Eye of the Sky). */
  requires?: { tier?: number; item?: string; merit?: string };
}

export interface MapEdge {
  a: string;
  b: string;
  /** sea: a ferry crossing. portal: the Cloud Island portal, open at night or in Winter. */
  via?: 'sea' | 'road' | 'portal' | 'rope';
  /** wisp: entering past this edge takes a Fog Lantern with a wisp caught in it (Lantern Glade). */
  requires?: { item?: string; wisp?: boolean };
}

export interface City {
  nodeId: string;
  name: string;
  type: ElementType;
  park: string;
  arbiter: string;
  accolade: string;
  arena: { name: string; trick: ArenaTrick; text: string };
  /** Set when the Arbiter's arena is its own map node away from the city (e.g. across the sea). */
  arenaNode?: string;
  hotpot: { name: string; buff: Partial<Record<StatKey, number>>; text: string };
  blurb: string;
}

export type ArenaTrick =
  | 'iceFloes' | 'illusion' | 'volts' | 'flames' | 'darkness' | 'crumble' | 'fortress' | 'roots';

export interface Item {
  id: string;
  name: string;
  kind: 'restore' | 'treat' | 'material' | 'totem' | 'key' | 'charm' | 'travel';
  price: number;
  /** Kept once bought and never used up (like key items): only one can be owned. */
  unique?: boolean;
  text: string;
  /** offering affinity: bonus to recruitment for these types */
  allure?: Partial<Record<ElementType, number>>;
  icon: string; // emoji glyph for compact UI
}

export interface Nature {
  id: string;
  name: string;
  up: StatKey;
  down: StatKey;
  text: string;
  perks: { cost: number; name: string; bonus: Partial<Record<StatKey, number>>; text: string }[];
}

export interface Ability { id: string; name: string; text: string }

export interface WeatherDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  typeBoost?: Partial<Record<ElementType, number>>; // flat damage mod for that attack type
  evasion?: number;
  speed?: number;
  encounter?: ElementType[]; // more likely to appear
  fx?: 'rain' | 'snow' | 'storm' | 'fog' | 'heat' | 'aurora' | 'petals' | 'wind' | 'none';
}
