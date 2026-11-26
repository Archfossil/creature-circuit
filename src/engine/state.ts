import { MERCHANT } from '../data/icons';
import type { ElementType, StatKey } from '../data/schema';
import { teamworkCap } from './teamwork';
import type { CreatureInst } from './creature';
import type { PendingEvent } from './events';
import type { BattleLog } from './battleLog';
import type { NpcRecord } from './npcs';
import { noteArrival } from './dares';
import { syncPerks, createCreature, fullRestore, speciesOf, maxHealth, maxVitality, progressionTree, stats, NODE_ENERGY } from './creature';
import { SEASON_INFO, seasonForTurn } from '../data/content';
import { ROAMING_KEY_ITEMS, CLASSIC_KEY_TOWNS, KEY_ITEM_TOWNS, NODE_BY_ID } from '../data/map';
import { pick } from './dice';
import { provide, tools } from './tools';
import { activeRegion } from '../regions/active';
import { DEFAULT_REGION, REGIONS } from '../regions';
import type { Region } from '../regions/types';
import { SPECIES_BY_ID } from '../data/species';
import { currentMoveId } from '../data/moves';

export type TrainerStyle = 'nature' | 'urban' | 'balanced' | 'whisperer' | 'haggler' | 'drill' | 'caretaker' | 'pathfinder';

/** Trainer styles: each has a perk and (except the Wanderer) a drawback. The rules live in world.ts / battle.ts. */
export const TRAINER_STYLES: { id: TrainerStyle; icon: string; name: string; perk: string; drawback: string }[] = [
  { id: 'balanced', icon: '⚖️', name: 'Wanderer', perk: 'You make your home anywhere: every city’s stable serves you the doubled home Chanko Nabe, and if your team is wiped out you choose which city to return to, from any city you’ve rested at this game.', drawback: 'None.' },
  { id: 'nature', icon: '🌲', name: 'Ranger', perk: 'Up to Tier times a turn, exploring and finding Nothing gives back 1 Initiative (once at Tier 1, twice at Tier 2, and so on).', drawback: 'City actions cost +1 Initiative.' },
  { id: 'urban', icon: '🏙️', name: 'Urbanite', perk: 'City actions cost no Initiative.', drawback: 'Re-exploring costs 2 Initiative.' },
  { id: 'whisperer', icon: '🤝', name: 'Beast Whisperer', perk: '+1 to every recruitment roll.', drawback: 'Trainer battles pay half the coins (Arbiters still pay in full).' },
  { id: 'haggler', icon: MERCHANT, name: 'Merchant', perk: 'Markets sell at 25% off, and you earn 25% more coins whenever you earn coins (at least +1).', drawback: '−1 to every recruitment roll.' },
  { id: 'drill', icon: '🎖️', name: 'Battle Master', perk: '+2 XP for every creature in every battle, win or lose.', drawback: 'Creatures in totems lose Morale every 5 turns (not 10).' },
  { id: 'caretaker', icon: '💞', name: 'Caretaker', perk: 'Camping tends 2 creatures per Initiative; stables give +1 extra Morale.', drawback: '−1 XP per battle for each creature (never below 1).' },
  { id: 'pathfinder', icon: '🧭', name: 'Pathfinder', perk: 'Your first move each turn costs no Initiative.', drawback: 'Stables cost +1 Initiative.' },
];

/** The kinds of battle a trainer's record is kept for (the `kind` passed to world.ts → finishBattle). */
export type BattleKind = 'wild' | 'trainer' | 'arbiter' | 'legendary' | 'endgame' | 'rival';
export interface WinLoss { won: number; lost: number; ran: number }
/** Running totals shown on the Trainer ID. Everything past the first three fields is optional: saves from
 *  before the Trainer ID start counting when loaded (`trackedFrom`). */
export interface TrainerStats {
  battlesWon: number; recruited: number; explored: number;
  /** Wild and Legendary creatures met in battle. */
  encountered?: number;
  /** Initiative spent on odd jobs. */
  worked?: number;
  /** Items made at a Workbench. */
  crafted?: number;
  /** Wins, losses and getaways per kind of battle. */
  record?: Partial<Record<BattleKind, WinLoss>>;
  /** How often the trainer's creatures have used moves of each type. */
  moveTypes?: Partial<Record<string, number>>;
  /** Opposing creatures knocked out. */
  foesKO?: number;
  /** Items picked up while exploring. */
  itemsFound?: number;
  /** Every coin earned (prizes, finds, sales, events). */
  coinsEarned?: number;
  /** Steps taken between map nodes. */
  steps?: number;
  /** The turn the detailed stats began (only for saves from before the Trainer ID). */
  trackedFrom?: number;
}

/** A place in the Circuit: a trainer in this game (by seat) or an NPC (by id). */
export interface CircuitEntrant { name: string; seat?: number; npc?: string }
/** The Creature Circuit, one for everyone in the game (engine/circuit.ts): eight places in bracket order, and who won each of the seven matches. `bots`: "match:entrant" a bot plays for an absent trainer. */
export interface Circuit { entrants: CircuitEntrant[]; winners: (number | null)[]; bots?: string[] }

export interface GameState {
  version: number;
  /** The region's id. Saves from before regions have none, and are Margos's (regionOf). */
  region?: string;
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
  /** This trainer's part of the World Log, newest first (see record). */
  deeds?: Deed[];
  dex: { seen: string[]; caught: string[] };
  flags: {
    freeReexploreUsed: boolean;
    /** Ranger: Nothing refunds used this turn (up to Tier). */
    rangerRefunds?: number;
    firstMoveUsed: boolean;
    /** Lure Incense: every explore this turn is a wild encounter. */
    lure: boolean;
    /** Hush Smoke: exploring can't turn up a creature or trainer this turn. */
    repel?: boolean;
    /** Lucky stars (Star Charm, Fortune Teller): wild encounters roll an extra rarity die this turn. */
    starCharm: boolean;
    beaten: string[];       // legendary node ids already resolved
    salemNight: boolean;    // waited for aurora this turn
    fabianFound: boolean;
    /** Hotseat trainers you've challenged this turn. */
    challenged?: string[];
    /** Cities whose Trainer Hall you've already battled in this turn. */
    sparred?: string[];
    /** City facilities paid for this turn, as "market:<city>" / "shrine:<city>" (browsing is free; the first purchase pays). */
    paid?: string[];
    /** Explore the Depths: the wild creature that already accepted this offering (counts toward recruiting it). */
    depthsOffering?: { uid: string; item: string };
    /** Iron Coast Gauntlet: trainers beaten so far (cleared when the trainer leaves the city). */
    gauntletWins?: number;
    /** The Gauntlet is cleared: Stella can be challenged any time from now on. */
    stellaOpen?: boolean;
    /** Cloud Island: consecutive steps around the ring in one direction (6 = a full lap), and which way. */
    cloudLap?: number;
    cloudDir?: 1 | -1;
    /** A full lap of Cloud Island is done: Salem will battle this trainer from now on. */
    salemWorthy?: boolean;
    /** Bike: ridden this turn, and the steps rolled for a ride not yet taken (0 = none waiting). */
    bikeUsed?: boolean;
    bikeRoll?: number;
    /** Trail Mix eaten this turn. */
    trailMix?: boolean;
    /** Forest Floor: Dahlia's Trail results found on this visit (reset on leaving). */
    dahliaTrail?: number;
    /** Fog Lantern: where the next wisp waits (null once caught), whether the trainer has looked, and a wisp held in the lantern. */
    wispAt?: string | null;
    wispSeen?: boolean;
    wisp?: boolean;
    /** A wisp was just caught (the map shows a note, then clears this). */
    wispNews?: boolean;
  };
  phase: 'map' | 'endgame' | 'champion' | 'over';
  /** In the Creature Circuit: the round they're in (or went out in). `bracket` is only in saves from before it was shared. */
  endgame?: { round: number; eliminated: boolean; bracket?: string[] };
  /** The Champion sponsoring this trainer, and their home city, which counts as the trainer's home too (npcs.ts → sponsor). */
  sponsor?: { npc: string; city: string; since: number };
  /** A Stadium Mode trainer (engine/stadium.ts): lives only for the battle and is never saved. */
  stadium?: boolean;
  /** Solo: the Creature Circuit's bracket (in a match it's on the Match). */
  circuit?: Circuit;
  stats: TrainerStats;
  /**
   * Cloud satchel: items earned on Cloud Island, held here until the trainer escapes the island
   * (through the portal). Being sent home after a team wipe loses them.
   */
  cloudLoot?: Record<string, number>;
  /** Seed for the Rainbow Plains' daily type (plains.ts). Shared by everyone in a match. */
  prismSeed?: number;
  /** This game's towns for the roaming key items (Canopy Rope, Root Whistle). Shared by everyone in a match. */
  keyTowns?: Record<string, string>;
  /** Cities this trainer has rested at (a stable rest), most recent last; starts with the home city.
   *  A Wanderer whose team is wiped may return to any of them (world.ts → wipeOptions). */
  rested?: string[];
  /** Creatures left at a Battle School (see world.ts → enrollTraining). */
  training?: Training[];
  /** Teamwork that grew while travelling last turn ("A & B: Teamwork 2"), shown at the start of the next turn. */
  teamworkNews?: string[];
  /** Pairs whose Teamwork dropped at the end of last turn because a Loyalty fell (shown at the start of the next turn). */
  teamworkFell?: string[];
  /** Notes from other hotseat trainers (gifts, trades, duels), shown at the start of your next turn. */
  inbox?: string[];
  /** The turn whose start-of-turn event has been rolled (so a reload doesn't roll a second one). */
  eventTurn?: number;
  /** Start-of-turn event waiting for an answer (see engine/events.ts). */
  event?: PendingEvent;
  /** Id of the last event rolled, so the same one never fires twice in a row. */
  lastEvent?: string;
  /** The node this trainer has marked as where they mean to go next (a reminder between turns). Only shown
   *  on this trainer's own screen; reaching it clears it (moveTrainer). */
  waypoint?: string;
  /** The 📜 log of this trainer's latest battle, to look back on (replaced by the next one; left out of saved copies). */
  lastBattle?: BattleLog;
  /** What a region's gimmicks keep, by gimmick id. (Margos's are older, and keep theirs in `flags`.) */
  gimmicks?: Record<string, unknown>;
  /** History with the Rivals and Champions this trainer has met, by id (engine/npcs.ts). */
  npcs?: Record<string, NpcRecord>;
  /** Circuit news, latest first. */
  circuitNews?: { turn: number; text: string }[];
  /** Rival and Circuit notes to show at the start of the turn. */
  npcNotes?: string[];
  /** The turn a Rival or Champion last texted of their own accord, and how many Merits they've heard about. */
  lastText?: number;
  /** Running counts for side challenges (engine/dares.ts). */
  tally?: Record<string, number>;
  npcMerits?: number;
  /** Energy Imprints won from Arbiters and not used yet (engine/imprints.ts). */
  imprints?: ElementType[];
  /** The turn each Arbiter was last beaten (by city id): they rest before another rematch. */
  arbiterBeat?: Record<string, number>;
}

const KEY = 'creature-circuit-save-v1';
/** v2: energy generation doubled; progression-chart energy nodes now grant +2.
 *  v3: progression charts became skill trees; some node ids moved.
 *  v4: Health is 5 × Vigor in hearts of 5; the chart's Health and Vitality nodes became Vigor and stats. */
export const SAVE_VERSION = 4;

/** The player's mini customisation (colours are hex; hat/jacket are ids from render/trainerModel). Older saves have none. */
/**
 * A creature left at a Battle School: it earns `xp` over `turns` turns (2 XP a turn). A retraining
 * course (`retrain`) earns no XP: it changes the Nature, Ability and/or Instinct named, ready the
 * next morning (world.ts → enrollRetraining).
 */
export interface Training { creature: CreatureInst; school: string; xp: number; turns: number; started: number; notified?: boolean; retrain?: Retrain }
/** What a retraining course changes (ids; unset = kept). */
export interface Retrain { nature?: string; ability?: string; instinct?: string }

export interface TrainerLookChoice {
  skin?: string; hair?: string; pants?: string; hat?: string; jacket?: string; hairStyle?: string;
  /** Wears a backpack. Unset in older saves, where it came with the top (trainerModel.ts → packOf). */
  pack?: boolean;
  /** Detail patterns (ids) and the secondary colours they're drawn in. */
  topPattern?: string; hatPattern?: string; hairPattern?: string; topColor2?: string; hatColor2?: string; hairColor2?: string;
}

/** What a trainer picks for their starter; anything left out is random (Nature) or its species' own. */
export interface StarterTraits { nature?: string; ability?: string; instinct?: string }

export function newGame(name: string, style: TrainerStyle, home: string, starter: string, color: string, look?: TrainerLookChoice, traits: StarterTraits = {}): GameState {
  const s: GameState = {
    version: SAVE_VERSION, region: activeRegion().id,
    trainer: { name, style, home, color, ...(look ? { look } : {}) },
    turn: 1, initiative: 5, weather: pick(SEASON_INFO.spring.dice),
    location: home, visited: [home], rested: [home], coins: 15,
    inventory: { totem: 2, salve: 2, sunberry: 2 },
    roster: [], reserve: [], following: null, merits: [],
    log: [], dex: { seen: [], caught: [] },
    flags: { freeReexploreUsed: false, firstMoveUsed: false, lure: false, starCharm: false, beaten: [], salemNight: false, fabianFound: false },
    phase: 'map',
    stats: { battlesWon: 0, recruited: 0, explored: 0, encountered: 0, record: {}, moveTypes: {}, foesKO: 0, itemsFound: 0, coinsEarned: 0, steps: 0 },
  };
  const c = createCreature(starter, 1, { nature: traits.nature }); // starters begin at Lv 1 with an untouched chart
  // kept on the creature even when it's the usual one, so the choice lasts through evolution
  if (traits.ability) c.ability = traits.ability;
  if (traits.instinct) c.instinct = traits.instinct;
  c.morale = 7;
  c.bond = true; // the starter's special bond: it never leaves, so a trainer always has a partner, and it's a little tougher than others of its kind
  fullRestore(c); // (the bond's extra Vigor)
  s.roster.push(c);
  s.following = c.uid;
  s.dex.seen.push(starter);
  s.dex.caught.push(starter);
  s.keyTowns = rollKeyTowns();
  s.prismSeed = Math.floor(Math.random() * 1e9);
  return s;
}

/**
 * Put a trainer on a node. Every location change goes through here, so that gimmicks
 * hear of it (Gimmick.onMove).
 */
export function moveTrainer(s: GameState, id: string, opts: { wiped?: boolean; /** The World Log's words for a ride: "took a taxi to …". */ how?: string } = {}) {
  const place = NODE_BY_ID[id]?.name ?? id;
  for (const g of activeRegion().gimmicks) g.onMove?.(s, s.location, id, tools, !!opts.wiped);
  // reaching your marked next stop clears the marker
  if (s.waypoint === id) s.waypoint = undefined;
  if (!opts.wiped) noteArrival(s, id);
  s.location = id;
  record(s, 'move', opts.wiped ? `was sent back to ${place} after the whole team was knocked out` : opts.how ?? `moved to ${place}`);
}

// An autosave that doesn't fit (or storage that's turned off) is kept here and reported, so it's never lost quietly.
let unsaved: { key: string; json: string } | null = null;
let saveStatus: ((ok: boolean) => void) | null = null;
/** Told whenever autosaving starts failing (false) or works again (true). */
export function onSaveStatus(fn: ((ok: boolean) => void) | null) { saveStatus = fn; }
export const savingFailed = () => unsaved !== null;
// ── Regions ─────────────────────────────────────────────────────
type InRegion = { region?: string; players?: { region?: string }[] };
/** The id of the region a save or match is in. */
export const regionIdOf = (x: InRegion): string => x.region ?? x.players?.find((p) => p?.region)?.region ?? DEFAULT_REGION;
/** The region a save or match is in, or undefined if this version of the game doesn't have it. */
export const regionOf = (x: InRegion): Region | undefined => Object.values(REGIONS).find((r) => r.id === regionIdOf(x));
export const regionName = (x: InRegion) => regionOf(x)?.name ?? 'a newer region';
/** Can this version play this match: does it have its region (one for everyone) and its rules? */
export const readable = (m: Match) => !!regionOf(m) && (m.rules ?? 1) <= RULES_VERSION && m.players.every((p) => !p || regionIdOf(p) === regionIdOf(m));
/** Is this a save or match from a region, or rules, that only a newer version of the game has? (A reload fetches it.) */
export function fromNewer(text: string | null): boolean {
  try {
    const d = JSON.parse(text ?? 'null') as (Partial<GameState> & Partial<Match>) | null;
    if (!d || typeof d !== 'object' || !(d.trainer || Array.isArray(d.players))) return false;
    return !regionOf(d) || (d.rules ?? 1) > RULES_VERSION || (d.players ?? []).some((p) => p && !regionOf(p));
  } catch { return false; }
}
/** Does a live slot hold a game that only a newer version can open? It must not be taken for an empty slot. */
export function heldForNewer(kind: SaveKind): boolean {
  try { return fromNewer(localStorage.getItem(kind === 'solo' ? KEY : kind === 'hotseat' ? MATCH_KEY : 'creature-circuit-online-v1')); } catch { return false; }
}

function put(key: string, json: string) {
  const was = unsaved;
  try { localStorage.setItem(key, json); if (unsaved?.key === key) unsaved = null; } catch { unsaved = { key, json }; }
  if (!was !== !unsaved) saveStatus?.(!unsaved);
}
const store = (key: string, data: unknown) => put(key, JSON.stringify(data));
/** Try the autosave that failed again (after making room). Returns whether everything is saved now. */
export function retrySave(): boolean {
  if (unsaved) put(unsaved.key, unsaved.json);
  return !unsaved;
}
/** A game was deleted on purpose: don't bring it back with a retry. */
function forgetUnsaved(key: string) {
  if (unsaved?.key !== key) return;
  unsaved = null;
  saveStatus?.(true);
}

export function save(s: GameState) {
  // a trainer in a hotseat match is saved as part of the whole match
  if (activeMatch && activeMatch.players.includes(s)) { saveMatch(activeMatch); return; }
  if (s.stadium) return;
  // online, a trainer from an outdated copy of the match (a newer one arrived): never let it land in the solo save
  if (activeMatch && matchKey !== MATCH_KEY) return;
  store(KEY, s);
}

// ── Hotseat multiplayer ─────────────────────────────────────────
// 2–6 trainers share one browser and one world. Each keeps a full GameState of their own; the match
// records whose turn it is and the shared weather rolls, so every trainer sees the same skies on a
// given turn. Turns go in seat order: when one trainer ends their turn, the next one starts theirs.
export const MAX_PLAYERS = 6;
/** Goes up when the rules change so much that a match can't be finished on older ones. Matches record theirs. */
export const RULES_VERSION = 1;
export interface Match { version: 1; /** everyone's region (none: Margos) */ region?: string; /** the rules it's played by (none: 1) */ rules?: number; players: GameState[]; current: number; rolls: Record<number, number>; /** the shared Creature Circuit, once it's drawn */ circuit?: Circuit; /** a Stadium Mode room: the score, and each trainer's team as they brought it */ stadium?: { wins: number[]; teams: CreatureInst[][] }; /** online: which browser owns each seat */ owners?: string[]; code?: string; turnSeconds?: number; /** online: the browser that last sent this copy */ by?: string }
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
  // one shared world: everyone finds the roaming key items in the same towns
  const keyTowns = players[0]?.keyTowns ?? rollKeyTowns();
  const prismSeed = players[0]?.prismSeed ?? Math.floor(Math.random() * 1e9);
  for (const p of players) { p.keyTowns = { ...keyTowns }; p.prismSeed = prismSeed; }
  const region = regionIdOf(players[0] ?? {});
  for (const p of players) p.region = region;
  return { version: 1, region, rules: RULES_VERSION, players, current: 0, rolls: {} };
}

/** Roll a town for each roaming key item: all different, from the eligible towns. */
export function rollKeyTowns(): Record<string, string> {
  const towns = [...KEY_ITEM_TOWNS].sort(() => Math.random() - 0.5);
  return Object.fromEntries(ROAMING_KEY_ITEMS.map((id, i) => [id, towns[i % towns.length]]));
}
/** The town that sells a roaming key item in this game (older saves: where it always was). */
export const keyTownOf = (s: GameState, item: string): string => s.keyTowns?.[item] ?? CLASSIC_KEY_TOWNS[item];
/** A trainer still taking turns (not finished: season over or crowned Champion). */
export const stillPlaying = (s: GameState) => s.phase === 'map' || s.phase === 'endgame';
/** Seat index of the next trainer still playing after the current one, or -1 when everyone is done. */
/** Whose turn comes next: the next trainer still travelling (-1 once everyone's season has reached its end; then it's the Circuit). */
export function nextSeat(m: Match): number {
  for (let k = 1; k <= m.players.length; k++) {
    const i = (m.current + k) % m.players.length;
    if (m.players[i].phase === 'map') return i;
  }
  return -1;
}
/** Main colours already taken by other trainers in the match (each trainer's colour is unique). */
export const takenColors = (m: Match | null, except?: GameState) => (m ? m.players.filter((p) => p !== except).map((p) => p.trainer.color) : []);

export function saveMatch(m: Match) {
  if (!m.stadium) store(matchKey, m);
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
export function clearOnlineMatch() { forgetUnsaved('creature-circuit-online-v1'); try { localStorage.removeItem('creature-circuit-online-v1'); } catch { /* ignore */ } }
export function loadMatch(): Match | null {
  try {
    const raw = localStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    return migrateMatch(JSON.parse(raw) as Match);
  } catch { return null; }
}
/** Bring every trainer in a match up to the current version (null if one can't be). Also used on matches a server room sends, which may predate this build. */
export function migrateMatch(m: Match): Match | null {
  if (!readable(m)) return null;
  const players = m.players.map((p) => migrate(p));
  return players.some((p) => !p) ? null : { ...m, players: players as GameState[] };
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
      if (!players.length || players.some((p) => !p || !p.trainer) || !readable(data)) return null;
      return { kind: 'match', match: { version: 1, region: regionIdOf(data as Match), rules: data.rules ?? 1, players: players as GameState[], current: Math.min(data.current ?? 0, players.length - 1), rolls: data.rolls ?? {}, ...(data.circuit ? { circuit: data.circuit as Circuit } : {}) } };
    }
    if (data && data.trainer && Array.isArray(data.roster)) {
      const s = migrate(data as GameState);
      return s ? { kind: 'solo', save: s } : null;
    }
  } catch { /* not JSON */ }
  return null;
}

export function clearMatch() { forgetUnsaved(MATCH_KEY); try { localStorage.removeItem(MATCH_KEY); } catch { /* ignore */ } activeMatch = null; }

// ── Saved copies (the save library) ─────────────────────────────
// Besides the three live autosave slots (solo, hotseat, online), any number of named snapshots can be
// kept in this browser and loaded back into their slot later.
export type SaveKind = 'solo' | 'hotseat' | 'online';
export interface SavedCopy { id: string; name: string; kind: SaveKind; savedAt: number; summary: string; data: GameState | Match }
const LIBRARY_KEY = 'creature-circuit-library-v1';
/** How many saved copies one browser keeps (localStorage holds about 5 MB). */
export const LIBRARY_MAX = 30;

export function listCopies(): SavedCopy[] {
  try { const raw = localStorage.getItem(LIBRARY_KEY); return raw ? (JSON.parse(raw) as SavedCopy[]) : []; } catch { return []; }
}
function writeCopies(list: SavedCopy[]): string | null {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(list)); return null; } catch { return 'This browser’s storage is full. Delete or export some saved copies first.'; }
}

/** A one-line description of a game, for save lists. */
export function describeSave(kind: SaveKind, data: GameState | Match): string {
  if (kind === 'solo') {
    const s = data as GameState;
    const r = regionOf(s);
    return `${s.trainer.name} · ${regionName(s)} · Turn ${s.turn}/${r?.season.turns ?? '?'} · ${s.merits.length}/${r?.season.merits ?? '?'} Merits · ${s.roster.length + s.reserve.length} creatures`;
  }
  const m = data as Match;
  return `${m.players.map((p) => p.trainer.name).join(', ')} · ${regionName(m)} · Turn ${m.players[m.current]?.turn ?? 1} · ${m.players[m.current]?.trainer.name ?? ''} to play`;
}

/** Keep a named copy of a game. Returns the copy, or an error message (library full, storage full). */
export function saveCopy(kind: SaveKind, data: GameState | Match, name?: string): SavedCopy | string {
  const list = listCopies();
  if (list.length >= LIBRARY_MAX) return `You can keep up to ${LIBRARY_MAX} saved copies. Delete one first.`;
  const copy: SavedCopy = {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36), kind, savedAt: Date.now(),
    name: (name ?? '').trim().slice(0, 40) || defaultCopyName(kind, data),
    summary: describeSave(kind, data), data: JSON.parse(JSON.stringify(data, (k, v) => (k === 'lastBattle' ? undefined : v))), // logs would crowd the library's storage
  };
  return writeCopies([copy, ...list]) ?? copy;
}
export function defaultCopyName(kind: SaveKind, data: GameState | Match) {
  const label = kind === 'solo' ? (data as GameState).trainer.name : kind === 'hotseat' ? 'Hotseat' : 'Online';
  const turn = kind === 'solo' ? (data as GameState).turn : (data as Match).players[(data as Match).current]?.turn ?? 1;
  return `${label} · Turn ${turn}`;
}
export function renameCopy(id: string, name: string) {
  const list = listCopies();
  const c = list.find((x) => x.id === id);
  if (c && name.trim()) { c.name = name.trim().slice(0, 40); writeCopies(list); }
}
export function deleteCopy(id: string) { writeCopies(listCopies().filter((x) => x.id !== id)); }

/** The game in a saved copy, migrated to the current version (null if it can't be read any more). */
export function readCopy(c: SavedCopy): { kind: 'solo'; save: GameState } | { kind: 'hotseat' | 'online'; match: Match } | null {
  const parsed = parseSaveFile(JSON.stringify(c.data));
  if (!parsed) return null;
  if (parsed.kind === 'solo') return c.kind === 'solo' ? parsed : null;
  if (c.kind === 'solo') return null;
  const extra = c.data as Match; // online copies keep their seat owners, room code and timer
  return { kind: c.kind, match: { ...parsed.match, owners: extra.owners, code: extra.code, turnSeconds: extra.turnSeconds } };
}

/** Load a saved copy into its live slot (replacing what's there). Returns what was loaded, or null. */
export function restoreCopy(id: string) {
  const c = listCopies().find((x) => x.id === id);
  const g = c ? readCopy(c) : null;
  if (!g) return null;
  forgetUnsaved(g.kind === 'solo' ? KEY : g.kind === 'online' ? 'creature-circuit-online-v1' : MATCH_KEY); // the copy replaces it
  try {
    if (g.kind === 'solo') localStorage.setItem(KEY, JSON.stringify(g.save));
    else localStorage.setItem(g.kind === 'online' ? 'creature-circuit-online-v1' : MATCH_KEY, JSON.stringify(g.match));
  } catch { return null; }
  return g;
}

/** What kind of game an exported file holds: online matches carry their seat owners. */
export function saveKindOf(text: string): SaveKind | null {
  const parsed = parseSaveFile(text);
  if (!parsed) return null;
  if (parsed.kind === 'solo') return 'solo';
  try { return Array.isArray(JSON.parse(text).owners) ? 'online' : 'hotseat'; } catch { return 'hotseat'; }
}
export function load(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as GameState);
  } catch { return null; }
}
/**
 * v3 → v4: Health and Vitality were each equal to Vigor, plus chart nodes of their own. A node bought on
 * the current chart becomes what it gives now; one from an earlier stage becomes +1 Vigor (Vitality) or
 * +1 Armor (Health). How hurt the creature was is kept, in hearts.
 */
function heartsFromV3(c: CreatureInst) {
  const old = c.bonus as CreatureInst['bonus'] & { health?: number; vitality?: number };
  const oldMax = Math.max(1, stats(c).vigor + (old.vitality ?? 0));
  const frac = Math.min(1, c.vitality / oldMax);
  let hp = old.health ?? 0, vit = old.vitality ?? 0;
  delete old.health;
  delete old.vitality;
  const now = (id: string) => progressionTree(c).find((n) => n.id === id)?.apply(c);
  if (hp && c.unlocked.includes('c')) { hp--; now('c'); }
  if (vit && c.unlocked.includes('h')) { vit--; now('h'); }
  if (vit) c.bonus.vigor = (c.bonus.vigor ?? 0) + vit;
  if (hp) c.bonus.armor = (c.bonus.armor ?? 0) + hp;
  c.vitality = c.ko ? 0 : Math.round(frac * maxVitality(c));
  c.health = c.ko ? 0 : Math.max(1, Math.min(maxHealth(c), c.health));
}

/** Bring an older save up to SAVE_VERSION, or null if it can't be read. */
export function migrate(s: GameState): GameState | null {
  const region = regionOf(s);
  if (!region) return null;
  s.region = region.id;
  if (s.version === 1) {
    // energy nodes unlocked under v1 granted +1; they grant +2 now
    for (const c of [...s.roster, ...s.reserve]) {
      for (const k of Object.keys(c.extraEnergy) as (keyof typeof c.extraEnergy)[]) c.extraEnergy[k] = c.extraEnergy[k]! * 2;
    }
    s.version = 2;
  }
  if (s.version === 2) {
    // v2 charts: e Speed, f the old movement node / 2nd energy, g Vitality, h Prisma. Earned bonuses are kept;
    // only the ids move so the new tree shows those nodes as bought.
    const rename: Record<string, string> = { e: 'f', f: 'g', g: 'h', h: 'p' };
    for (const c of [...s.roster, ...s.reserve]) c.unlocked = c.unlocked.map((id) => rename[id] ?? id);
    s.version = 3;
  }
  if (s.version === 3) {
    for (const c of [...s.roster, ...s.reserve, ...(s.training ?? []).map((t) => t.creature)]) heartsFromV3(c);
    s.version = 4;
  }
  // Overworld movements (Fly, Sail, Tunnel, Wayfind) are gone: a creature that had learned one gets
  // the chart node's replacement instead, +2 energy of its second type (or its only type)
  for (const c of [...s.roster, ...s.reserve, ...(s.training ?? []).map((t) => t.creature)]) {
    const legacy = c as CreatureInst & { movement?: string };
    if (!legacy.movement) continue;
    delete legacy.movement;
    const sp = speciesOf(c);
    const k = sp.types[1] ?? sp.types[0];
    c.extraEnergy[k] = (c.extraEnergy[k] ?? 0) + NODE_ENERGY;
  }
  // Teamwork: older saves kept it as `affinity` (0–9); it's capped at half the creature's Loyalty now
  // (and a pair's at half the lower Loyalty of the two, applied whenever it's read)
  for (const c of [...s.roster, ...s.reserve, ...(s.training ?? []).map((t) => t.creature)]) {
    const legacy = c as CreatureInst & { affinity?: Record<string, number> };
    if (legacy.affinity) {
      c.teamwork = Object.fromEntries(Object.entries(legacy.affinity).map(([k, v]) => [k, Math.min(v, teamworkCap(c))]));
      delete legacy.affinity;
    }
    c.teamwork ??= {};
    c.swapMoves ??= {};
    syncPerks(c); // any perk its Loyalty has earned but was missed
  }
  // Moves: a placeholder attack replaced by a hand-made one becomes that move; an id that no longer
  // exists at all is dropped (it would break the creature's card and battles)
  for (const c of [...s.roster, ...s.reserve, ...(s.training ?? []).map((t) => t.creature)]) {
    c.playbook = [...new Set(c.playbook.map(currentMoveId).filter((id): id is string => !!id))];
  }
  // Special bond: older saves mark the starter (the first species recruited, or what it evolved into)
  const mine = [...s.roster, ...s.reserve, ...(s.training ?? []).map((t) => t.creature)];
  if (s.dex.caught.length && !mine.some((c) => c.bond)) {
    const line: string[] = [];
    for (let id: string | undefined = s.dex.caught[0]; id && !line.includes(id); id = SPECIES_BY_ID[id]?.evolvesTo) line.push(id);
    const starter = mine.find((c) => line.includes(c.species));
    if (starter) starter.bond = true;
  }
  for (const g of region.gimmicks) g.migrate?.(s, tools);
  // Trainer ID: older saves start their detailed stats from here
  if (s.stats && !s.stats.record) { s.stats.record = {}; if (s.turn > 1) s.stats.trackedFrom = s.turn; }
  return s.version === SAVE_VERSION ? s : null;
}
export function clearSave() { forgetUnsaved(KEY); try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

export const tierOf = (s: GameState) => Math.min(5, 1 + Math.floor(s.merits.length / 2));
export const season = (s: GameState) => seasonForTurn(s.turn);

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
  if (s.stats) s.stats.coinsEarned = (s.stats.coinsEarned ?? 0) + got;
  return got;
}

/** Add (or with n < 0, remove) items. A gimmick can keep what's gained somewhere else (the Cloud satchel). */
export function addItem(s: GameState, id: string, n = 1) {
  if (n > 0 && activeRegion().gimmicks.some((g) => g.keep?.(s, id, n))) return;
  s.inventory[id] = (s.inventory[id] ?? 0) + n;
  if (s.inventory[id] <= 0) delete s.inventory[id];
}
export const hasItem = (s: GameState, id: string) => (s.inventory[id] ?? 0) > 0;

// ── The World Log ───────────────────────────────────────────────
// What every trainer has done out in the world, for everyone in the game to read. Each trainer keeps their own
// part (so it's saved and sent with them); `n` counts across all of them, so it merges in the order it happened.
export type DeedKind = 'move' | 'explore' | 'battle' | 'event' | 'place';
/** `text` follows the trainer's name ("moved to …"). `at`: the node. `more`: the fuller story. `other`: another trainer it involved. */
export interface Deed { n: number; turn: number; kind: DeedKind; at: string; text: string; more?: string; other?: string }
/** The most World Log entries kept for each trainer. */
export const DEEDS_MAX = 80;
const inWorldWith = (s: GameState) => (activeMatch?.players.includes(s) ? activeMatch.players : [s]);
export function record(s: GameState, kind: DeedKind, text: string, opts: { more?: string; other?: string; at?: string } = {}) {
  const n = 1 + Math.max(0, ...inWorldWith(s).map((p) => p.deeds?.[0]?.n ?? 0));
  const d: Deed = { n, turn: s.turn, kind, at: opts.at ?? s.location, text };
  if (opts.more) d.more = opts.more;
  if (opts.other) d.other = opts.other;
  (s.deeds ??= []).unshift(d);
  if (s.deeds.length > DEEDS_MAX) s.deeds.length = DEEDS_MAX;
}
/** Everyone's deeds, newest first. */
export const worldLog = (s: GameState): { who: GameState; deed: Deed }[] =>
  inWorldWith(s).flatMap((who) => (who.deeds ?? []).map((deed) => ({ who, deed }))).sort((a, b) => b.deed.n - a.deed.n);

export function log(s: GameState, text: string) {
  s.log.unshift({ turn: s.turn, text });
  if (s.log.length > 60) s.log.length = 60;
}

provide({ addItem, follower, hasItem, log, tierOf });
