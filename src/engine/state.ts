import type { Movement, StatKey } from '../data/schema';
import type { CreatureInst } from './creature';
import type { PendingEvent } from './events';
import { createCreature } from './creature';
import { SEASON_INFO, seasonForTurn } from '../data/content';
import { pick } from './dice';

export type TrainerStyle = 'nature' | 'urban' | 'balanced';

export interface GameState {
  version: number;
  trainer: { name: string; style: TrainerStyle; home: string; color: string };
  turn: number;
  initiative: number;
  weather: string;
  location: string;
  visited: string[];
  coins: number;
  inventory: Record<string, number>;
  roster: CreatureInst[];   // active (max 3)
  reserve: CreatureInst[];  // resting in totems
  following: string | null;
  merits: string[];         // city ids
  hotpot?: { city: string; buff: Partial<Record<StatKey, number>> };
  log: { turn: number; text: string }[];
  dex: { seen: string[]; caught: string[] };
  flags: {
    freeReexploreUsed: boolean;
    firstMoveUsed: boolean;
    lure: boolean;
    starCharm: boolean;
    beaten: string[];       // legendary node ids already resolved
    salemNight: boolean;    // waited for aurora this turn
    fabianFound: boolean;
  };
  phase: 'map' | 'endgame' | 'champion' | 'over';
  endgame?: { round: number; bracket: string[]; eliminated: boolean };
  stats: { battlesWon: number; recruited: number; explored: number };
  /** End-of-turn event waiting for an answer (see engine/events.ts). */
  event?: PendingEvent;
  /** Id of the last event rolled, so the same one never fires twice in a row. */
  lastEvent?: string;
}

const KEY = 'creature-circuit-save-v1';
/** v2: energy generation doubled; progression-chart energy nodes now grant +2.
 *  v3: progression charts became skill trees; some node ids moved. */
export const SAVE_VERSION = 3;

export function newGame(name: string, style: TrainerStyle, home: string, starter: string, color: string): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    trainer: { name, style, home, color },
    turn: 1, initiative: 5, weather: pick(SEASON_INFO.spring.dice),
    location: home, visited: [home], coins: 15,
    inventory: { totem: 2, salve: 2, sunberry: 2 },
    roster: [], reserve: [], following: null, merits: [],
    log: [], dex: { seen: [], caught: [] },
    flags: { freeReexploreUsed: false, firstMoveUsed: false, lure: false, starCharm: false, beaten: [], salemNight: false, fabianFound: false },
    phase: 'map',
    stats: { battlesWon: 0, recruited: 0, explored: 0 },
  };
  const c = createCreature(starter, 1); // starters begin at Lv 1 with an untouched chart
  c.morale = 7;
  s.roster.push(c);
  s.following = c.uid;
  s.dex.seen.push(starter);
  s.dex.caught.push(starter);
  return s;
}

export function save(s: GameState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}
export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as GameState);
  } catch { return null; }
}
/** Bring an older save up to SAVE_VERSION, or null if it can't be read. */
export function migrate(s: GameState): GameState | null {
  if (s.version === 1) {
    // energy nodes unlocked under v1 granted +1; they grant +2 now
    for (const c of [...s.roster, ...s.reserve]) {
      for (const k of Object.keys(c.extraEnergy) as (keyof typeof c.extraEnergy)[]) c.extraEnergy[k] = c.extraEnergy[k]! * 2;
    }
    s.version = 2;
  }
  if (s.version === 2) {
    // v2 charts: e Speed, f Movement/2nd energy, g Vitality, h Prisma. Earned bonuses are kept;
    // only the ids move so the new tree shows those nodes as bought.
    const rename: Record<string, string> = { e: 'f', f: 'g', g: 'h', h: 'p' };
    for (const c of [...s.roster, ...s.reserve]) c.unlocked = c.unlocked.map((id) => rename[id] ?? id);
    s.version = 3;
  }
  return s.version === SAVE_VERSION ? s : null;
}
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

export const tierOf = (s: GameState) => Math.min(5, 1 + Math.floor(s.merits.length / 2));
export const season = (s: GameState) => seasonForTurn(s.turn);

export function teamMovements(s: GameState): Set<Movement> {
  return new Set(s.roster.map((c) => c.movement).filter(Boolean) as Movement[]);
}

export function follower(s: GameState): CreatureInst | undefined {
  return s.roster.find((c) => c.uid === s.following && !c.ko);
}

export function addItem(s: GameState, id: string, n = 1) {
  s.inventory[id] = (s.inventory[id] ?? 0) + n;
  if (s.inventory[id] <= 0) delete s.inventory[id];
}
export const hasItem = (s: GameState, id: string) => (s.inventory[id] ?? 0) > 0;

export function log(s: GameState, text: string) {
  s.log.unshift({ turn: s.turn, text });
  if (s.log.length > 60) s.log.length = 60;
}
