// The hall of records: seasons that have ended, kept on this device and outside every save. Nothing here is ever read
// by the rules, so a past season leaves no mark on play (docs/16-region-packages.md → Legacy).
import { nameOf, speciesOf, type CreatureInst } from './creature';
import { championOf } from './circuit';
import { regionIdOf, regionName, regionOf, type Circuit, type GameState, type Match, type SaveKind } from './state';

export interface HallCreature { species: string; name: string; level: number; starter?: boolean }
/** How a season ended: the Circuit's champion, out in a round of it (0 quarterfinal … 2 final), or not in it. */
export type HallResult = 'champion' | 0 | 1 | 2 | 'missed';
export interface HallTrainer { name: string; color: string; style: string; result: HallResult; merits: number; wins: number; recruited: number; team: HallCreature[] }
export interface HallEntry { id: string; at: number; kind: SaveKind; region: string; /** kept, in case the region's ever missing */ regionName: string; meritsNeeded: number; champion?: string; trainers: HallTrainer[] }

const KEY = 'creature-circuit-hall-v1';
/** How many seasons are kept (the oldest go first). */
export const HALL_MAX = 60;

/** Everyone a trainer has: their active team first, then totems and the Battle School. */
export const everyone = (s: GameState): CreatureInst[] => [...s.roster, ...s.reserve, ...(s.training ?? []).map((t) => t.creature)];
export const resultOf = (s: GameState): HallResult => (s.phase === 'champion' ? 'champion' : s.endgame ? (Math.min(2, s.endgame.round) as 0 | 1 | 2) : 'missed');

/** A game's own mark, the same however often it's looked at: where, who, and the starters they set out with. */
export function seasonId(players: GameState[]): string {
  const of = `${regionIdOf({ players })}|${players.map((p) => `${p.trainer.name}/${p.trainer.home}/${everyone(p).find((c) => c.bond)?.uid ?? ''}`).join('|')}`;
  let a = 7, b = 11;
  for (const ch of of) { a = (Math.imul(a, 31) + ch.codePointAt(0)!) >>> 0; b = (Math.imul(b, 131) ^ ch.codePointAt(0)!) >>> 0; }
  return a.toString(36) + b.toString(36);
}

export function hallEntry(players: GameState[], kind: SaveKind, circuit: Circuit | undefined, at = Date.now()): HallEntry {
  const where = { players };
  return {
    id: seasonId(players), at, kind, region: regionIdOf(where), regionName: regionName(where), meritsNeeded: regionOf(where)?.season.merits ?? 8,
    ...(circuit && championOf(circuit) ? { champion: championOf(circuit)!.name } : {}),
    trainers: players.map((p) => ({
      name: p.trainer.name, color: p.trainer.color, style: p.trainer.style, result: resultOf(p), merits: p.merits.length, wins: p.stats.battlesWon, recruited: p.stats.recruited,
      team: p.roster.map((c) => ({ species: c.species, name: nameOf(c), level: c.level, ...(c.bond ? { starter: true } : {}) })),
    })),
  };
}

export function hall(): HallEntry[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as HallEntry[];
    return Array.isArray(list) ? list.filter((e) => e && typeof e.id === 'string' && Array.isArray(e.trainers)) : [];
  } catch { return []; }
}
function write(list: HallEntry[]): boolean { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch { return false; } }

/** Has everyone in this game finished their season, for good? */
export const seasonOver = (players: GameState[]) => players.length > 0 && players.every((p) => !p.stadium && (p.phase === 'over' || p.phase === 'champion'));

/** Put a finished game in the hall, once. Returns whether it's there. */
export function recordSeason(players: GameState[], kind: SaveKind, circuit: Circuit | undefined): boolean {
  if (!seasonOver(players)) return false;
  const list = hall(), e = hallEntry(players, kind, circuit);
  if (list.some((x) => x.id === e.id)) return true;
  return write([e, ...list].slice(0, HALL_MAX));
}
export const recordMatch = (m: Match, kind: SaveKind) => !m.stadium && recordSeason(m.players, kind, m.circuit);
export const forgetSeason = (id: string) => { write(hall().filter((e) => e.id !== id)); };

// ── Farewell ────────────────────────────────────────────────────
// Creatures caught in an earlier year can't compete again, so each is left somewhere it will be looked after. A
// Legendary goes back to the wild. (What's said is the same each time it's looked at.)
const LAST = [
  '{n} settles in as if it had always lived here.',
  '{n} finds the sunniest spot and lies down in it.',
  '{n} is already showing the younger ones how it’s done.',
  '{n} looks back once, then trots off to explore.',
  'A researcher is taking notes. {n} is pretending not to notice.',
  '{n} leans against you for a while before it goes.',
];
/** What becomes of a creature when its trainer's season ends. */
export function farewellText(s: GameState, c: CreatureInst): { where: string; text: string } {
  const r = regionOf(s), n = nameOf(c);
  if (speciesOf(c).rarity === 'legendary') {
    const at = r?.map.nodes.find((x) => x.legendary === c.species)?.name;
    return { where: at ?? 'the wild', text: `Nobody keeps a Legendary. ${n} returns to ${at ?? 'the wild'}, and may be met there again another year.` };
  }
  const where = r?.farewell ?? 'a research facility';
  if (c.bond) return { where, text: `Your first partner, from the day you set out. ${n} watches until you’re out of sight.` };
  let h = 0;
  for (const ch of c.uid) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { where, text: LAST[h % LAST.length].replace('{n}', n) };
}
