import type { Movement, StatKey } from '../data/schema';
import type { CreatureInst } from './creature';
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
}

const KEY = 'creature-circuit-save-v1';

export function newGame(name: string, style: TrainerStyle, home: string, starter: string, color: string): GameState {
  const s: GameState = {
    version: 1,
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
  const c = createCreature(starter, 2);
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
    const s = JSON.parse(raw) as GameState;
    return s.version === 1 ? s : null;
  } catch { return null; }
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
