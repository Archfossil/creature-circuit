import type { Movement, StatKey } from '../data/schema';
import type { CreatureInst } from './creature';
import type { PendingEvent } from './events';
import { createCreature } from './creature';
import { SEASON_INFO, seasonForTurn } from '../data/content';
import { pick } from './dice';

export type TrainerStyle = 'nature' | 'urban' | 'balanced' | 'whisperer' | 'haggler' | 'drill' | 'caretaker' | 'pathfinder';

/** Trainer styles: each has a perk and (except the Wanderer) a drawback. The rules live in world.ts / battle.ts. */
export const TRAINER_STYLES: { id: TrainerStyle; icon: string; name: string; perk: string; drawback: string }[] = [
  { id: 'balanced', icon: '⚖️', name: 'Wanderer', perk: 'Every city’s stable treats you like home: the doubled home Chanko Nabe, anywhere.', drawback: 'None. You have no real home, and no special rules.' },
  { id: 'nature', icon: '🌲', name: 'Ranger', perk: 'Your first re-explore each turn costs no Initiative.', drawback: 'City actions cost +1 Initiative.' },
  { id: 'urban', icon: '🏙️', name: 'Urbanite', perk: 'City actions cost no Initiative.', drawback: 'Re-exploring costs 2 Initiative.' },
  { id: 'whisperer', icon: '🤝', name: 'Beast Whisperer', perk: '+1 to every recruitment roll.', drawback: 'Trainer battles pay half the coins (Arbiters still pay in full).' },
  { id: 'haggler', icon: '💰', name: 'Merchant', perk: 'Markets sell at 25% off, and you earn 25% more coins whenever you earn coins (at least +1).', drawback: '−1 to every recruitment roll.' },
  { id: 'drill', icon: '🎖️', name: 'Battle Master', perk: '+2 XP for every creature in every battle, win or lose.', drawback: 'Creatures in totems lose Morale every 5 turns (not 10).' },
  { id: 'caretaker', icon: '💞', name: 'Caretaker', perk: 'Camping tends 2 creatures per Initiative; stables give +1 extra Morale.', drawback: '−1 XP per battle for each creature (never below 1).' },
  { id: 'pathfinder', icon: '🧭', name: 'Pathfinder', perk: 'Your first move each turn costs no Initiative.', drawback: 'Stables cost +1 Initiative.' },
];

export interface GameState {
  version: number;
  trainer: { name: string; style: TrainerStyle; home: string; color: string; look?: TrainerLookChoice };
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
    /** Hotseat trainers you've challenged this turn. */
    challenged?: string[];
    /** Cities whose Trainer Hall you've already battled in this turn. */
    sparred?: string[];
  };
  phase: 'map' | 'endgame' | 'champion' | 'over';
  endgame?: { round: number; bracket: string[]; eliminated: boolean };
  stats: { battlesWon: number; recruited: number; explored: number };
  /** Creatures left at a Battle School (see world.ts → enrollTraining). */
  training?: Training[];
  /** Notes from other hotseat trainers (gifts, trades, duels), shown at the start of your next turn. */
  inbox?: string[];
  /** The turn whose start-of-turn event has been rolled (so a reload doesn't roll a second one). */
  eventTurn?: number;
  /** Start-of-turn event waiting for an answer (see engine/events.ts). */
  event?: PendingEvent;
  /** Id of the last event rolled, so the same one never fires twice in a row. */
  lastEvent?: string;
}

const KEY = 'creature-circuit-save-v1';
/** v2: energy generation doubled; progression-chart energy nodes now grant +2.
 *  v3: progression charts became skill trees; some node ids moved. */
export const SAVE_VERSION = 3;

/** The player's mini customisation (colours are hex; hat/jacket are ids from render/trainerModel). Older saves have none. */
/** A creature left at a Battle School: it earns `xp` over `turns` turns (2 XP a turn). */
export interface Training { creature: CreatureInst; school: string; xp: number; turns: number; started: number; notified?: boolean }

export interface TrainerLookChoice { skin?: string; hair?: string; pants?: string; hat?: string; jacket?: string; hairStyle?: string }

export function newGame(name: string, style: TrainerStyle, home: string, starter: string, color: string, look?: TrainerLookChoice): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    trainer: { name, style, home, color, ...(look ? { look } : {}) },
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
  // a trainer in a hotseat match is saved as part of the whole match
  if (activeMatch && activeMatch.players.includes(s)) { saveMatch(activeMatch); return; }
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ }
}

// ── Hotseat multiplayer ─────────────────────────────────────────
// 2–6 trainers share one browser and one world. Each keeps a full GameState of their own; the match
// records whose turn it is and the shared weather rolls, so every trainer sees the same skies on a
// given turn. Turns go in seat order: when one trainer ends their turn, the next one starts theirs.
export const MAX_PLAYERS = 6;
export interface Match { version: 1; players: GameState[]; current: number; rolls: Record<number, number>; /** online: which browser owns each seat */ owners?: string[]; code?: string; turnSeconds?: number }
const MATCH_KEY = 'creature-circuit-match-v1';
let activeMatch: Match | null = null;
/** Where the active match is kept: the hotseat slot, or (online) a separate slot so the two never mix. */
let matchKey = MATCH_KEY;
export function useMatchSlot(slot: 'hotseat' | 'online') { matchKey = slot === 'online' ? 'creature-circuit-online-v1' : MATCH_KEY; }
/** Called after every save of the active match (online play pushes it to the server). */
let matchSaved: ((m: Match) => void) | null = null;
export function onMatchSaved(fn: ((m: Match) => void) | null) { matchSaved = fn; }

/** The hotseat match being played (null in a solo journey). */
export const activeMatchOf = () => activeMatch;
export function setActiveMatch(m: Match | null) { activeMatch = m; }

export function newMatch(players: GameState[]): Match {
  return { version: 1, players, current: 0, rolls: {} };
}
/** A trainer still taking turns (not finished: season over or crowned Champion). */
export const stillPlaying = (s: GameState) => s.phase === 'map' || s.phase === 'endgame';
/** Seat index of the next trainer still playing after the current one, or -1 when everyone is done. */
export function nextSeat(m: Match): number {
  for (let k = 1; k <= m.players.length; k++) {
    const i = (m.current + k) % m.players.length;
    if (stillPlaying(m.players[i])) return i;
  }
  return -1;
}
/** Main colours already taken by other trainers in the match (each trainer's colour is unique). */
export const takenColors = (m: Match | null, except?: GameState) => (m ? m.players.filter((p) => p !== except).map((p) => p.trainer.color) : []);

export function saveMatch(m: Match) {
  try { localStorage.setItem(matchKey, JSON.stringify(m)); } catch { /* storage unavailable */ }
  matchSaved?.(m);
}
/** The online match saved on this device (the last state it saw), if any. */
export function loadOnlineMatch(): (Match & { owners?: string[]; code?: string; turnSeconds?: number }) | null {
  try {
    const raw = localStorage.getItem('creature-circuit-online-v1');
    if (!raw) return null;
    const parsed = parseSaveFile(raw);
    if (parsed?.kind !== 'match') return null;
    const extra = JSON.parse(raw);
    return { ...parsed.match, owners: extra.owners, code: extra.code, turnSeconds: extra.turnSeconds };
  } catch { return null; }
}
export function clearOnlineMatch() { try { localStorage.removeItem('creature-circuit-online-v1'); } catch { /* ignore */ } }
export function loadMatch(): Match | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as Match;
    const players = m.players.map((p) => migrate(p));
    if (players.some((p) => !p)) return null;
    return { ...m, players: players as GameState[] };
  } catch { return null; }
}
/**
 * Read an exported save file (a solo journey or a hotseat match), migrating it to the current
 * version. Returns null if it isn't a Creature Circuit save.
 */
export function parseSaveFile(text: string): { kind: 'solo'; save: GameState } | { kind: 'match'; match: Match } | null {
  try {
    const data = JSON.parse(text);
    if (data && Array.isArray(data.players)) {
      const players = (data.players as GameState[]).map((p) => migrate(p));
      if (!players.length || players.some((p) => !p || !p.trainer)) return null;
      return { kind: 'match', match: { version: 1, players: players as GameState[], current: Math.min(data.current ?? 0, players.length - 1), rolls: data.rolls ?? {} } };
    }
    if (data && data.trainer && Array.isArray(data.roster)) {
      const s = migrate(data as GameState);
      return s ? { kind: 'solo', save: s } : null;
    }
  } catch { /* not JSON */ }
  return null;
}

export function clearMatch() { try { localStorage.removeItem(MATCH_KEY); } catch { /* ignore */ } activeMatch = null; }
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

/**
 * Give the trainer coins they've earned (battle prizes, finds, sales, events …) and return the
 * amount actually received: Merchants get 25% more, at least +1.
 */
export function earnCoins(s: GameState, n: number): number {
  if (n <= 0) return 0;
  const got = s.trainer.style === 'haggler' ? n + Math.max(1, Math.ceil(n * 0.25)) : n;
  s.coins += got;
  return got;
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
