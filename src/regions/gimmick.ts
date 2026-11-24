// A region's gimmicks: rules of its own, as answers to the engine's questions (docs/16-region-packages.md). The first
// to have an answer gives it. Like the rest of a package, a gimmick's rules only import types, so the engine's
// functions are handed to it (`t`). Its screens are apart from them (screens.ts).
import type { GameState } from '../engine/state';

/** The engine's functions that gimmicks use. Add to this list as they need more (engine/tools.ts). */
export type Tools =
  & Pick<typeof import('../engine/state'), 'hasItem'>
  & Pick<typeof import('../engine/world'), 'keyTownName'>;

/** Whether an Arbiter will battle. `show`: the gimmick's screen to open instead of only saying why. */
export interface Gate { ok: boolean; reason?: string; show?: string; cloud?: boolean; trail?: boolean }

export interface Gimmick {
  id: string;
  /** May this city's Arbiter be challenged? Null: that's not this gimmick's business. */
  gate?(s: GameState, city: string, t: Tools): Gate | null;
}
