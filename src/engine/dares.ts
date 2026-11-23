// Side challenges ("dares") with Rivals and Champions: races, first-to contests and sillier ones. Both sides
// start level and whoever gets there first wins. The trainer's side is measured from what they really do;
// the other's is a pace set when it's agreed, so they finish at the end of a known turn (`due`).
import { NPCS, type Npc } from '../data/npcs';
import { VOICES } from '../data/texts';
import { CITIES, NODE_BY_ID, WISP_SPOTS, neighbors } from '../data/map';
import { SPECIES } from '../data/species';
import { TYPES, TYPE_LABEL } from '../data/types';
import { itemInfo } from '../data/content';
import type { ElementType } from '../data/schema';
import type { GameState } from './state';
import { earnCoins, log, tierOf } from './state';
import type { Battle } from './battle';
import { MIFFED, chanceOf, npcMerits, npcStay, npcTier, recordWith } from './npcs';
import { say } from './messenger';
import { npcPurse } from './npcTrade';

export type DareKind = 'race' | 'arbiter' | 'codex' | 'recruit' | 'solo' | 'night' | 'nabe' | 'coasts' | 'walk' | 'finds' | 'craft' | 'treats';
/** What a challenge is, before anyone agrees to it. */
export interface DareIdea { kind: DareKind; /** A place, city or type, by kind. */ target?: string; n: number; turns: number }
/** One under way. */
export interface Dare extends DareIdea { from: number; due: number; base: number; wager: number; /** Race: their distance when it began. */ dist?: number; /** Places or cities reached so far (races, coasts, hot pots). */ been: string[]; /** Solo: how many creatures each of the trainer's had defeated when it began (or when it joined). */ wins?: Record<string, number>; /** They've said they're halfway. */ half?: boolean }
export interface DareResult { npc: Npc; won: boolean; text: string }

export const DARES_MAX = 2;
export const WAGERS = [0, 5, 10];
const COASTS = ['iron', 'blackSand'];
/** Running counts of things challenges ask for (GameState.tally). */
export const tally = (s: GameState, key: string, n = 1) => { (s.tally ??= {})[key] = (s.tally[key] ?? 0) + n; };
const count = (s: GameState, key: string) => s.tally?.[key] ?? 0;

export const dareWith = (s: GameState, npc: Npc): Dare | undefined => recordWith(s, npc)?.dare;
export const activeDares = (s: GameState): { npc: Npc; dare: Dare }[] => NPCS.flatMap((npc) => { const dare = dareWith(s, npc); return dare ? [{ npc, dare }] : []; });

// ── Words ───────────────────────────────────────────────────────
export const DARE_ICON: Record<DareKind, string> = { race: '🏁', arbiter: '🏟️', codex: '📖', recruit: '🗿', solo: '🥇', night: '🌙', nabe: '🍲', coasts: '🌊', walk: '👣', finds: '🧺', craft: '🛠️', treats: '🍓' };
export function dareText(d: DareIdea): string {
  const place = d.target ? NODE_BY_ID[d.target]?.name ?? d.target : '';
  switch (d.kind) {
    case 'race': return `Race to ${place}`;
    case 'arbiter': return `First to beat Arbiter ${CITIES[d.target!].arbiter} in ${place}`;
    case 'codex': return `First to see ${d.n} new Codex creatures`;
    case 'recruit': return `First to recruit ${d.n > 1 ? `${d.n} ` : 'a '}${TYPE_LABEL[d.target as ElementType]} creature${d.n > 1 ? 's' : ''}`;
    case 'solo': return `First to defeat ${d.n} creature${d.n > 1 ? 's' : ''} with a single creature`;
    case 'night': return `First to win ${d.n} battles at night`;
    case 'nabe': return `First to eat a Chanko Nabe in ${d.n} different cities`;
    case 'coasts': return `First to visit both ${NODE_BY_ID[COASTS[0]].name} and ${NODE_BY_ID[COASTS[1]].name}`;
    case 'walk': return `First to walk ${d.n} steps`;
    case 'finds': return `First to find ${d.n} items while exploring`;
    case 'craft': return `First to craft ${d.n} items at a Workbench`;
    case 'treats': return `First to feed ${d.n} treats`;
  }
}

// ── The trainer's side ──────────────────────────────────────────
/** The running total a count-up challenge is measured by. */
function total(s: GameState, d: DareIdea): number {
  switch (d.kind) {
    case 'codex': return s.dex.seen.length;
    case 'recruit': return count(s, `recruit:${d.target}`);
    case 'night': case 'treats': return count(s, d.kind);
    case 'walk': return s.stats.steps ?? 0;
    case 'finds': return s.stats.itemsFound ?? 0;
    case 'craft': return s.stats.crafted ?? 0;
    default: return 0;
  }
}
export function myProgress(s: GameState, d: Dare): number {
  switch (d.kind) {
    case 'race': return d.been.includes(d.target!) || s.location === d.target ? 1 : 0;
    case 'arbiter': return s.merits.includes(d.target!) ? 1 : 0;
    case 'solo': return Math.min(d.n, Math.max(0, ...[...s.roster, ...s.reserve].map((c) => c.wins - ((d.wins ??= {})[c.uid] ??= c.wins))));
    case 'nabe': case 'coasts': return Math.min(d.n, d.been.length);
    default: return Math.max(0, Math.min(d.n, total(s, d) - d.base));
  }
}
/** How far along they are by now (of `n`; a race counts steps). */
export function theirProgress(s: GameState, d: Dare): { at: number; of: number } {
  const of = d.kind === 'race' ? d.dist ?? 1 : d.n;
  const part = Math.min(1, (s.turn - d.from) / Math.max(1, d.due - d.from + 1));
  return { at: Math.min(of - (s.turn <= d.due ? 1 : 0), Math.floor(of * part)), of };
}

// ── What happened (called as it does) ───────────────────────────
/** A trainer reached a place. */
export function noteArrival(s: GameState, id: string) {
  for (const { dare: d } of activeDares(s)) {
    if (d.kind === 'race' && d.target === id && !d.been.includes(id)) d.been.push(id);
    if (d.kind === 'coasts' && COASTS.includes(id) && !d.been.includes(id)) d.been.push(id);
  }
}
/** A trainer ate a city's Chanko Nabe. */
export function noteNabe(s: GameState, city: string) { for (const { dare: d } of activeDares(s)) if (d.kind === 'nabe' && !d.been.includes(city)) d.been.push(city); }
/** A trainer won or lost a battle. */
export function noteBattle(s: GameState, b: Battle) {
  if (b.over !== 'win') return;
  if (s.turn % 2 === 0) tally(s, 'night');
}

// ── Thinking of one ─────────────────────────────────────────────
/** Steps along the paths from one place to another, using only places anyone can walk to. */
export function walkSteps(from: string): Map<string, number> {
  const open = new Set(WISP_SPOTS);
  const out = new Map([[from, 0]]);
  for (const queue = [from]; queue.length;) {
    const at = queue.shift()!;
    for (const { node } of neighbors(at)) if (open.has(node.id) && !out.has(node.id)) { out.set(node.id, out.get(at)! + 1); queue.push(node.id); }
  }
  return out;
}
/** How many of an idea the trainer could have done already, or why it can't be set now. */
export function ideaBlock(s: GameState, npc: Npc, d: DareIdea): string | null {
  if (s.turn + d.turns > 98) return 'There’s no time left for it.';
  if (d.kind === 'arbiter') {
    if (s.merits.includes(d.target!)) return 'You hold that Merit already.';
    if (npcMerits(s, npc).includes(d.target!)) return 'They hold that Merit already.';
  }
  if (d.kind === 'race' && !((walkSteps(s.location).get(d.target!) ?? 0) >= 6)) return 'You’re too close for a race.';
  return null;
}
/** Three challenges they'd take up this stay (the same until the next). */
export function ideas(s: GameState, npc: Npc): DareIdea[] {
  const r = (k: string) => chanceOf(s, `${npc.id}:dare:${npcStay(s.turn)}:${k}`);
  const pickFrom = <T,>(l: T[], k: string): T | undefined => l[Math.floor(r(k) * l.length)];
  const all: (DareIdea | undefined)[] = [];
  // a race needs somewhere a few turns off
  const far = [...walkSteps(s.location)].filter(([id, n]) => n >= 10 && n <= 18 && ['town', 'city', 'wild'].includes(NODE_BY_ID[id].kind)).map(([id]) => id);
  const spot = pickFrom(far.filter((id) => NODE_BY_ID[id].kind !== 'wild').length ? far.filter((id) => NODE_BY_ID[id].kind !== 'wild') : far, 'spot');
  if (spot) all.push({ kind: 'race', target: spot, n: 1, turns: 0 });
  const arb = pickFrom(Object.keys(CITIES).filter((c) => !s.merits.includes(c) && !npcMerits(s, npc).includes(c)), 'arb');
  if (arb) all.push({ kind: 'arbiter', target: arb, n: 1, turns: 9 + Math.floor(r('at') * 4) });
  if (s.dex.seen.length + 6 < SPECIES.length) all.push({ kind: 'codex', n: 5, turns: 7 + Math.floor(r('ct') * 3) });
  const type = pickFrom([...npc.types, pickFrom(TYPES, 'ty')!], 'rt')!;
  const silly: DareIdea[] = [
    { kind: 'recruit', target: type, n: 2, turns: 8 }, { kind: 'solo', n: 3, turns: 6 }, { kind: 'night', n: 4, turns: 8 },
    { kind: 'nabe', n: 3, turns: 10 }, { kind: 'coasts', n: 2, turns: 10 }, { kind: 'walk', n: 25, turns: 6 }, { kind: 'finds', n: 8, turns: 7 }, { kind: 'craft', n: 3, turns: 7 }, { kind: 'treats', n: 8, turns: 6 },
  ];
  const rest = silly.map((x, i) => ({ x, k: r(`s${i}`) })).sort((a, b) => a.k - b.k).map((y) => y.x);
  // one serious, two silly; which serious one varies
  const serious = all.filter((x): x is DareIdea => !!x && !ideaBlock(s, npc, x));
  const first = pickFrom(serious, 'first');
  return [...(first ? [first] : []), ...rest.filter((x) => !ideaBlock(s, npc, x)).slice(0, first ? 2 : 3)];
}

export function dareBlock(s: GameState, npc: Npc): string | null {
  const r = recordWith(s, npc);
  if (!r) return 'You haven’t met.';
  if (r.dare) return 'You already have a challenge going.';
  if (r.rapport <= MIFFED) return 'They’re not in the mood.';
  if (activeDares(s).length >= DARES_MAX) return `You already have ${DARES_MAX} challenges going.`;
  if (r.dared !== undefined && s.turn - r.dared < 4) return 'They’re catching their breath after the last one.';
  return null;
}
/** The most either side can put on it. */
export const maxDareWager = (s: GameState, npc: Npc) => Math.min(s.coins, npcPurse(s, npc));
/** Agree to a challenge, from now. */
export function startDare(s: GameState, npc: Npc, idea: DareIdea, wager = 0): boolean {
  if (dareBlock(s, npc) || ideaBlock(s, npc, idea) || !WAGERS.includes(wager) || wager > maxDareWager(s, npc)) return false;
  let turns = idea.turns, dist: number | undefined;
  if (idea.kind === 'race') {
    // they set out from as far away as you are, give or take; the quicker ones cover 4 steps a turn
    const mine = walkSteps(s.location).get(idea.target!)!;
    dist = Math.max(5, mine + Math.round((chanceOf(s, `${npc.id}:race:${s.turn}`) - 0.5) * 4));
    turns = Math.ceil(dist / (npc.rating >= 50 ? 4 : 3));
  } else turns -= npc.kind === 'champion' ? 1 : 0;
  // (a wager is settled between friends: nothing is put down until it's over)
  recordWith(s, npc)!.dare = { ...idea, turns, from: s.turn, due: s.turn + turns - 1, base: total(s, idea), wager, been: [], ...(idea.kind === 'solo' ? { wins: Object.fromEntries([...s.roster, ...s.reserve].map((c) => [c.uid, c.wins])) } : {}), ...(dist ? { dist } : {}) };
  log(s, `Challenge with ${npc.name}: ${dareText(idea)}${wager ? ` (💰 ${wager})` : ''}.`);
  return true;
}
/** Give one up: it counts as lost. */
export function giveUp(s: GameState, npc: Npc): DareResult | null {
  const d = dareWith(s, npc);
  return d ? finish(s, npc, d, false) : null;
}

/** What winning pays, besides the wager. */
export const darePrize = (s: GameState, d: DareIdea) => ({ coins: 6 + 3 * tierOf(s), item: ['race', 'arbiter', 'codex'].includes(d.kind) ? 'moonberry' : 'dewberry' });
function finish(s: GameState, npc: Npc, d: Dare, won: boolean): DareResult {
  const r = recordWith(s, npc)!;
  r.dare = undefined;
  r.dared = s.turn;
  if (won) {
    const p = darePrize(s, d);
    const coins = earnCoins(s, p.coins) + d.wager;
    s.coins += d.wager;
    s.inventory[p.item] = (s.inventory[p.item] ?? 0) + 1;
    r.daresWon = (r.daresWon ?? 0) + 1;
    r.rapport++;
    say(s, npc, VOICES[npc.id].beaten);
    log(s, `Won the challenge with ${npc.name}: ${dareText(d)}.`);
    return { npc, won, text: `🎯 Challenge won! ${dareText(d)}: you beat ${npc.name} to it. +${coins} coins and ${itemInfo(p.item).icon} ${itemInfo(p.item).name}.` };
  }
  const lost = Math.min(d.wager, s.coins);
  s.coins -= lost;
  r.daresLost = (r.daresLost ?? 0) + 1;
  say(s, npc, VOICES[npc.id].first);
  log(s, `Lost the challenge with ${npc.name}: ${dareText(d)}.`);
  return { npc, won, text: `🎯 ${npc.name} won the challenge: ${dareText(d)}.${lost ? ` You pay the 💰 ${lost} wager.` : ''}` };
}
/** Settle any challenge the trainer has just won. */
export const checkDares = (s: GameState): DareResult[] => activeDares(s).filter(({ dare }) => myProgress(s, dare) >= dare.n).map(({ npc, dare }) => finish(s, npc, dare, true));
/** A new turn: challenges the trainer had done are theirs, and then anyone whose time has come wins. Returns notes. */
export function dareTurn(s: GameState): string[] {
  const out = checkDares(s).map((x) => x.text);
  for (const { npc, dare: d } of activeDares(s)) {
    if (s.turn > d.due) out.push(finish(s, npc, d, false).text);
    else if (!d.half && s.turn - d.from >= (d.due - d.from + 1) / 2) {
      d.half = true;
      const p = theirProgress(s, d);
      out.push(`🎯 ${npc.name} is about halfway: ${dareText(d)} (${d.kind === 'race' ? `${p.of - p.at} steps to go` : p.of > 1 ? `${p.at}/${p.of}` : 'closing in'}).`);
    }
  }
  return out;
}
/** What they put up for a dare of their own making: something they'd like, and a small wager if both can cover it. */
export function thinkOfDare(s: GameState, npc: Npc): { idea: DareIdea; wager: number } | null {
  if (dareBlock(s, npc)) return null;
  const list = ideas(s, npc);
  if (!list.length) return null;
  const wager = npcTier(s.turn) >= 2 && maxDareWager(s, npc) >= 5 && Math.random() < 0.4 ? 5 : 0;
  return { idea: list[Math.floor(Math.random() * list.length)], wager };
}
