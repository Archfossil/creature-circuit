// A region's gimmicks: rules of its own, as answers to the engine's questions (docs/16-region-packages.md). The first
// to have an answer gives it. Like the rest of a package, a gimmick's rules only import types, so the engine's
// functions are handed to it (`t`). Its screens are apart from them (screens.ts).
import type { Battle } from '../engine/battle';
import type { GameState } from '../engine/state';

/** The engine's functions that gimmicks use. Add to this list as they need more (engine/tools.ts). */
export type Tools =
  & Pick<typeof import('../engine/state'), 'hasItem' | 'log' | 'tierOf'>
  & Pick<typeof import('../engine/creature'), 'autoSpend' | 'createCreature'>
  & Pick<typeof import('../engine/battle'), 'createBattle'>
  & Pick<typeof import('../engine/world'), 'cityActionCost' | 'here' | 'keyTownName' | 'pickSpecies' | 'playerSide' | 'tierBandLevel' | 'trainerRarity' | 'weather'>;

/** Whether an Arbiter will battle. `show`: the gimmick's screen to open instead of only saying why. */
export interface Gate { ok: boolean; reason?: string; show?: string; cloud?: boolean; trail?: boolean }

export interface GimmickBattle { name: string; battle: Battle; match: number; of: number }

export interface Gimmick {
  id: string;
  /** May this city's Arbiter be challenged? Null: that's not this gimmick's business. */
  gate?(s: GameState, city: string, t: Tools): Gate | null;
  /** The trainer is going from one place to another, by any means (or being sent home). */
  onMove?(s: GameState, from: string, to: string, t: Tools): void;
  /** Its own battles: the next one, or null if it can't be had now. */
  battle?(s: GameState, t: Tools): GimmickBattle | null;
  /** One of them was won. What to say about it. */
  won?(s: GameState, t: Tools): string;
  /** What surrendering one doesn't cost. */
  surrenderNote?: string;
}
