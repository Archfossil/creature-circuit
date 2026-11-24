// A region's gimmicks: rules of its own, as answers to the engine's questions (docs/16-region-packages.md). The first
// to have an answer gives it. Like the rest of a package, a gimmick's rules only import types, so the engine's
// functions are handed to it (`t`). Its screens are apart from them (screens.ts).
import type { Biome, ElementType, MapEdge, MapNode, Rarity, Species } from '../data/schema';
import type { Battle } from '../engine/battle';
import type { EventDef } from '../engine/events';
import type { GameState } from '../engine/state';
import type { ActiveEffect, Outcome } from '../engine/world';

/** The engine's functions that gimmicks use. Add to this list as they need more (engine/tools.ts). */
export type Tools =
  & Pick<typeof import('../data/content'), 'ITEMS' | 'itemInfo'>
  & Pick<typeof import('../data/types'), 'TYPES'>
  & Pick<typeof import('../engine/dice'), 'pick' | 'roll' | 'weightedPick'>
  & Pick<typeof import('../engine/state'), 'addItem' | 'follower' | 'hasItem' | 'log' | 'tierOf'>
  & Pick<typeof import('../engine/creature'), 'autoSpend' | 'createCreature' | 'nameOf' | 'stats'>
  & Pick<typeof import('../engine/battle'), 'createBattle'>
  & Pick<typeof import('../engine/world'), 'ability' | 'baseWildLevel' | 'cityActionCost' | 'discoverItem' | 'exoticFind' | 'here' | 'keyTownName' | 'nearest' | 'pickSpecies' | 'playerSide' | 'rollRarity' | 'stageCapFor' | 'tierBandLevel' | 'trainerRarity' | 'weather' | 'wildLevel'>
  & {
    /** The region's Codex. */
    species(): Species[];
    node(id: string): MapNode;
  };

/** Whether an Arbiter will battle. `show`: the gimmick's screen to open instead of only saying why. */
export interface Gate { ok: boolean; reason?: string; show?: string; cloud?: boolean }

export interface GimmickBattle { name: string; battle: Battle; match: number; of: number }

/** A place apart: no ride reaches or leaves it, and only its gimmick's events happen there. */
export interface Apart {
  id: string;
  has(node: string): boolean;
  /** Why a ride can't be taken from here. */
  noRides: string;
  /** What's said when exploring turns up a find, or a creature. */
  found?: string;
  met?: string;
}

/** A biome with rules of its own for what turns up: anyone led by one of its types, whatever their usual biome. */
export interface Lands {
  biome: Biome;
  /** Who turns up now. */
  types(s: GameState, t: Tools): ElementType[];
  /** What a rolled rarity becomes (even past the Tier's cap). */
  rarity?(r: Rarity): Rarity;
  /** Said when the rarity is rolled. */
  rarityNote?: string;
  /** Finds are exotic. */
  exotic?: boolean;
}

export interface Gimmick {
  id: string;
  apart?: Apart;
  lands?: Lands;
  /** What can happen between turns in its place apart. */
  events?(t: Tools): EventDef[];
  /** May this city's Arbiter be challenged? Null: that's not this gimmick's business. */
  gate?(s: GameState, city: string, t: Tools): Gate | null;
  /** The trainer is going from one place to another, by any means (or being sent home). */
  onMove?(s: GameState, from: string, to: string, t: Tools): void;
  /** Why this step can't be taken, besides what its route and node require. Null: it's not this gimmick's business. */
  enter?(s: GameState, step: { node: MapNode; edge: MapEdge }, t: Tools): string | null;
  /** Something was bought. */
  onBuy?(s: GameState, item: string, t: Tools): void;
  /** A save is being loaded: put right what an older one lacks. */
  migrate?(s: GameState, t: Tools): void;
  /** What's waiting to kick in, for the map's Active effects. */
  effects?(s: GameState, t: Tools): ActiveEffect[];
  /** Exploring, where that works its own way. Null: that's not here. */
  explore?(s: GameState, t: Tools): Outcome | null;
  /** The World Log's words for a sign of its trail. */
  trailText?(o: Extract<Outcome, { t: 'trail' }>): string;
  /** Its own battles: the next one, or null if it can't be had now. */
  battle?(s: GameState, t: Tools): GimmickBattle | null;
  /** One of them was won. What to say about it. */
  won?(s: GameState, t: Tools): string;
  /** What surrendering one doesn't cost. */
  surrenderNote?: string;
}
