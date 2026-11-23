// Swap Moves: what happens when one creature swaps in for another in battle. The trainer sets one per
// direction on each creature's card: "Sproutle swapping in for Puddlit" can differ from "Sproutle
// swapping in for Zapup" (and from "Puddlit swapping in for Sproutle"). The incoming creature is the
// Alpha; the one it replaces is the partner.
//
// Which a pair can use (engine/swaps.ts): the Alpha uses the partner's types, so a typed Swap Move
// needs the partner (not the Alpha) to have its type, and the stronger ones need Teamwork with that partner. Until the trainer picks one, a pair uses
// a neutral move picked at random for it (engine/swaps.ts → defaultSwapMove).
//
// Each move is data: `before` effects, then an optional `hit`, then `after` effects. The battle engine
// (battle.ts → doSwap) runs them and `describeSwap` writes the text the card and swap screen show,
// so the rules and the description can't drift apart.
import type { ElementType, StatKey, Stats, StatusId } from './schema';
import { STATUS_FOR, STATUS_INFO } from './moves';
import { TYPE_LABEL } from './types';

/** The numbers a Swap Move works from: the Alpha's (a), partner's (p) and foe's (f, unknown off the battlefield) stats. */
export interface SwapVals { a: Stats; p: Stats; f?: Stats; bonus: number; A: string; P: string; aType: ElementType; pType: ElementType }
/**
 * Who a Swap Move's words are about: the Alpha (A, swapping in) and the partner (P, swapping out), with
 * their main types when known. Off a real pair (docs) they're "the Alpha" / "the partner".
 */
export interface SwapNames { A: string; P: string; aType?: ElementType; pType?: ElementType }
/** One labelled number added to a Swap Move's damage roll. */
export interface SwapPart { label: string; value: number }

export type SwapEffect =
  | { t: 'mod'; who: 'self' | 'foe'; stat: StatKey; n: (v: SwapVals) => number }
  | { t: 'heal'; who: 'alpha' | 'partner'; n: (v: SwapVals) => number }
  /** Both creatures refill their Stamina. */
  | { t: 'refill' }
  /** Both creatures lose 1 Fatigue. */
  | { t: 'ease' }
  /** The foe gets the move's type status outright (if it has none). */
  | { t: 'status' };

export interface SwapHit {
  /** Damage die. */
  die: number;
  /** Accuracy die rolled against the foe's Evasion; omitted = a sure hit. */
  acc?: number;
  /** Physical hits are cut by the foe's Armor, elemental ones by its Ward (and use the type chart). */
  kind: 'physical' | 'elemental';
  /** What's added to the damage die (the foe's Armor or Ward is subtracted automatically). */
  parts: (v: SwapVals) => SwapPart[];
  /** Elemental hits: whose type the type chart uses (default: the move's own type). */
  chart?: 'alpha' | 'partner';
  /** Inflicts the move's type status when the damage die shows a 1 or 2. */
  status?: boolean;
}

export interface SwapMove {
  id: string;
  name: string;
  /** Typed moves need a partner of this type (the Alpha's own type doesn't count). Neutral ones are open to every pair. */
  type?: ElementType;
  /** Teamwork the Alpha needs with the partner to set it. */
  teamwork: number;
  /** Bonus Speed for the swap's turn order. */
  speed?: number;
  /** What happens, in words, naming who swaps in and who swaps out (use `swapText`). The numbers are `describeSwap`'s job. */
  text: (n: SwapNames) => string;
  before?: SwapEffect[];
  hit?: SwapHit;
  after?: SwapEffect[];
}

// ── helpers ──────────────────────────────────────────────────────
const LABEL: Record<StatKey, string> = { vigor: 'Vigor', power: 'Power', armor: 'Armor', focus: 'Focus', ward: 'Ward', speed: 'Speed', evasion: 'Evasion', stamina: 'Stamina' };
const of = (who: 'a' | 'p', k: StatKey) => (v: SwapVals): SwapPart => ({ label: `${who === 'a' ? v.A : v.P}’s ${LABEL[k]}`, value: v[who][k] });
const half = (who: 'a' | 'p', k: StatKey, round: 'up' | 'down' = 'up') => (v: SwapVals): SwapPart =>
  ({ label: `${who === 'a' ? v.A : v.P}’s ${LABEL[k]} ÷ 2`, value: round === 'up' ? Math.ceil(v[who][k] / 2) : Math.floor(v[who][k] / 2) });
/** The Teamwork bonus as a damage part (left out at 0). */
const tw = (v: SwapVals): SwapPart[] => (v.bonus ? [{ label: 'Teamwork', value: v.bonus }] : []);
const parts = (...fs: ((v: SwapVals) => SwapPart)[]) => (v: SwapVals) => [...fs.map((f) => f(v)), ...tw(v)];
const partsNoTw = (...fs: ((v: SwapVals) => SwapPart)[]) => (v: SwapVals) => fs.map((f) => f(v));
/** Half the partner's stat, rounded up, at least 1, plus the Teamwork bonus. */
const borrow = (k: StatKey) => (v: SwapVals) => Math.max(1, Math.ceil(v.p[k] / 2)) + v.bonus;
const plusTw = (n: number) => (v: SwapVals) => n + v.bonus;
const withTw = (n: number) => (v: SwapVals) => n + (v.bonus > 0 ? 1 : 0);
const healFrom = (who: 'a' | 'p') => (v: SwapVals) => Math.ceil(v[who].vigor / 2) + v.bonus;
const mod = (who: 'self' | 'foe', stat: StatKey, n: (v: SwapVals) => number): SwapEffect => ({ t: 'mod', who, stat, n });
const heal = (who: 'alpha' | 'partner', n: (v: SwapVals) => number): SwapEffect => ({ t: 'heal', who, n });
const fixed = (n: number) => () => n;
/** " (Water)" after "Sproutle’s type", when the type is known. */
const typeOf = (t?: ElementType) => (t ? ` (${TYPE_LABEL[t]})` : '');

export const SWAP_MOVES: SwapMove[] = [
  // ── Neutral: open to every pair (an unset slot uses one of these, picked at random) ──
  { id: 'tagStrike', name: 'Tag Strike', teamwork: 0, text: (n) => `${n.A} swaps in with an attack of ${n.P}’s type${typeOf(n.pType)}, powered by ${n.P}’s Focus.`,
    hit: { acc: 8, die: 6, kind: 'elemental', chart: 'partner', parts: parts(of('p', 'focus')) } },
  { id: 'shieldPass', name: 'Shield Pass', teamwork: 0, text: (n) => `${n.A} borrows half of ${n.P}’s Armor and Ward for as long as it stays in, then counters with a physical hit.`,
    before: [mod('self', 'armor', borrow('armor')), mod('self', 'ward', borrow('ward'))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  { id: 'slipstream', name: 'Slipstream', teamwork: 0, speed: 3, text: (n) => `${n.A} rides ${n.P}’s Speed to strike first with a physical hit.`,
    hit: { die: 6, kind: 'physical', parts: parts(of('a', 'power'), (v) => ({ label: `${v.P}’s Speed ÷ 3`, value: Math.floor(v.p.speed / 3) })) } },
  { id: 'siphon', name: 'Siphon', teamwork: 0, text: (n) => `${n.A} drains the foe with an attack of its own type${typeOf(n.aType)}, then heals using ${n.P}’s Vigor.`,
    hit: { die: 6, kind: 'elemental', chart: 'alpha', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', healFrom('p'))] },
  { id: 'rally', name: 'Rally', teamwork: 0, text: (n) => `${n.P} cheers ${n.A} on: both restore Stamina and shake off some Fatigue, and ${n.A} gains Power and Focus.`,
    before: [{ t: 'refill' }, { t: 'ease' }, mod('self', 'power', withTw(1)), mod('self', 'focus', withTw(1))] },

  // ── Astral ──
  { id: 'starfall-relay', name: 'Starfall Relay', type: 'astral', teamwork: 1, text: (n) => `As ${n.A} swaps in, ${n.P}’s Focus falls on the foe as starlight.`,
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('p', 'focus')) } },
  { id: 'twin-orbit', name: 'Twin Orbit', type: 'astral', teamwork: 2, text: (n) => `${n.A} and ${n.P} circle each other: ${n.A} slips out of reach, the foe loses track, and ${n.A} strikes.`,
    before: [mod('self', 'evasion', fixed(1)), mod('foe', 'evasion', fixed(-1))],
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  // ── Charm ──
  { id: 'sweet-handoff', name: 'Sweet Handoff', type: 'charm', teamwork: 1, text: (n) => `${n.P} charms the foe on its way out: the foe is beguiled, and ${n.A} lands a light hit and steadies itself.`,
    before: [{ t: 'status' }],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', plusTw(1))] },
  { id: 'heartlink', name: 'Heartlink', type: 'charm', teamwork: 2, text: (n) => `${n.A} and ${n.P} mend each other, and the foe’s heart goes out of its attacks.`,
    before: [heal('alpha', healFrom('p')), heal('partner', healFrom('a')), mod('foe', 'power', fixed(-1))] },
  // ── Electric ──
  { id: 'live-wire', name: 'Live Wire', type: 'electric', teamwork: 1, speed: 2, text: (n) => `${n.P} charges ${n.A} up, and ${n.A} jumps in crackling to strike before the foe can react.`,
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  { id: 'arc-bridge', name: 'Arc Bridge', type: 'electric', teamwork: 2, text: (n) => `A current arcs from ${n.P} through ${n.A} into the foe, powered by both.`,
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus'), half('p', 'focus', 'down')) } },
  // ── Fire ──
  { id: 'kindle-swap', name: 'Kindle Swap', type: 'fire', teamwork: 1, text: (n) => `${n.P} leaves embers behind as it goes: the foe burns and ${n.A} is fired up.`,
    before: [{ t: 'status' }, mod('self', 'power', withTw(1))] },
  { id: 'phoenix-handoff', name: 'Phoenix Handoff', type: 'fire', teamwork: 2, text: (n) => `${n.A} rises from ${n.P}’s flames in a blazing strike.`,
    hit: { acc: 8, die: 8, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  // ── Grass ──
  { id: 'root-relay', name: 'Root Relay', type: 'grass', teamwork: 1, text: (n) => `Roots pass from ${n.P} to ${n.A}: they snare the foe, ${n.A} strikes, and the roots feed it.`,
    before: [{ t: 'status' }],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', plusTw(1))] },
  { id: 'overgrowth', name: 'Overgrowth', type: 'grass', teamwork: 2, text: (n) => `${n.P}’s strength grows into ${n.A} as bark and leaf, healing and toughening it before it strikes.`,
    before: [heal('alpha', healFrom('p')), mod('self', 'armor', fixed(1)), mod('self', 'ward', fixed(1))],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) } },
  // ── Rock ──
  { id: 'landslide-tag', name: 'Landslide Tag', type: 'rock', teamwork: 1, text: (n) => `${n.A} rides ${n.P}’s weight down onto the foe.`,
    hit: { acc: 8, die: 6, kind: 'physical', status: true, parts: parts(of('a', 'power'), half('p', 'armor')) } },
  { id: 'bulwark-swap', name: 'Bulwark Swap', type: 'rock', teamwork: 2, text: (n) => `${n.P} raises stone walls as it leaves, and ${n.A} hits back from behind them.`,
    before: [mod('self', 'armor', plusTw(2)), mod('self', 'ward', fixed(1))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  // ── Steel ──
  { id: 'iron-relay', name: 'Iron Relay', type: 'steel', teamwork: 1, text: (n) => `${n.P} shoes ${n.A} in steel, and ${n.A} charges in to dent the foe’s defences.`,
    hit: { die: 6, kind: 'physical', status: true, parts: parts(of('a', 'power')) } },
  { id: 'alloy-guard', name: 'Alloy Guard', type: 'steel', teamwork: 2, text: (n) => `${n.P} plates ${n.A} in metal and strips the foe’s, then ${n.A} strikes.`,
    before: [mod('self', 'armor', borrow('armor')), mod('foe', 'armor', fixed(-1))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  // ── Water ──
  { id: 'tide-relay', name: 'Tide Relay', type: 'water', teamwork: 1, text: (n) => `${n.A} swaps in on a wave of ${n.P}’s Focus.`,
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('p', 'focus')) } },
  { id: 'wellspring', name: 'Wellspring', type: 'water', teamwork: 2, text: (n) => `${n.A} drinks from ${n.P}’s spring: ${n.A} heals, both refill Stamina, and the foe is drenched.`,
    before: [heal('alpha', healFrom('p')), { t: 'refill' }, { t: 'status' }] },
];

/**
 * A Swap Move's text for a pair. Leave out a name to get "the Alpha" / "the partner" (e.g. on a card that
 * describes a move without a partner in mind).
 */
export function swapText(m: SwapMove, n: Partial<SwapNames> = {}): string {
  const s = m.text({ A: n.A ?? 'the Alpha', P: n.P ?? 'the partner', aType: n.aType, pType: n.pType });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const SWAP_MOVE_BY_ID: Record<string, SwapMove> = Object.fromEntries(SWAP_MOVES.map((m) => [m.id, m]));

/** The status a typed Swap Move inflicts. */
export const swapStatus = (m: SwapMove): StatusId | undefined => (m.type ? STATUS_FOR[m.type] : undefined);
/** The type a Swap Move's hit uses on the type chart (none for physical hits). */
export function swapChart(m: SwapMove, v: Pick<SwapVals, 'aType' | 'pType'>): ElementType | undefined {
  if (!m.hit || m.hit.kind !== 'elemental') return undefined;
  return m.hit.chart === 'alpha' ? v.aType : m.hit.chart === 'partner' ? v.pType : m.type;
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
function effectText(m: SwapMove, e: SwapEffect, v: SwapVals): string {
  switch (e.t) {
    case 'mod': { const n = e.n(v); return e.who === 'self' ? `${signed(n)} ${LABEL[e.stat]}` : `the foe gets ${signed(n)} ${LABEL[e.stat]}`; }
    case 'heal': return `${e.who === 'alpha' ? v.A : v.P} heals ${e.n(v)} (beyond a full heart: Overheal)`;
    case 'refill': return `${v.A} and ${v.P} refill Stamina`;
    case 'ease': return `${v.A} and ${v.P} lose 1 Fatigue`;
    case 'status': { const s = swapStatus(m); return s ? `${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} on the foe (if it has no status)` : ''; }
  }
}

/** A list of effects in words; the Alpha's own stat boosts are grouped: "Sproutle gets +1 Armor, +1 Ward while it stays in". */
function effectsText(m: SwapMove, es: SwapEffect[], v: SwapVals): string[] {
  const out: string[] = [];
  let boosts: string[] = [];
  const flush = () => { if (boosts.length) out.push(`${v.A} gets ${boosts.join(', ')} while it stays in`); boosts = []; };
  for (const e of es) {
    if (e.t === 'mod' && e.who === 'self') boosts.push(effectText(m, e, v));
    else { flush(); out.push(effectText(m, e, v)); }
  }
  flush();
  return out;
}

/** The move's effect in words, with the numbers filled in (the foe's are left as words when `v.f` is unknown). */
export function describeSwap(m: SwapMove, v: SwapVals): string {
  const out: string[] = [];
  if (m.speed) out.push(`${v.A} gets +${m.speed} Speed to act first`);
  out.push(...effectsText(m, m.before ?? [], v));
  if (m.hit) {
    const h = m.hit;
    const def = h.kind === 'physical' ? 'armor' : 'ward';
    // each number with what it is: "d6 + 2 (Zapup’s Focus) + 1 (Teamwork) − 1 (foe’s Ward)"
    const sum = h.parts(v).map((p) => ` ${p.value >= 0 ? '+' : '−'} ${Math.abs(p.value)} (${p.label})`).join('');
    const foeDef = v.f ? ` − ${v.f[def]} (foe’s ${LABEL[def]})` : ` − foe’s ${LABEL[def]}`;
    const acc = h.acc ? `${v.A} attacks: d${h.acc} to hit${v.f ? ` (needs ${v.f.evasion}+)` : ' vs the foe’s Evasion'}, then ` : `${v.A} attacks (a sure hit): `;
    const chart = swapChart(m, v);
    const st = h.status ? swapStatus(m) : undefined;
    out.push(`${acc}d${h.die}${sum}${foeDef} damage${chart ? `, as ${TYPE_LABEL[chart]}` : ''}${st ? ` (${STATUS_INFO[st].name} on a 1–2)` : ''}`);
  }
  out.push(...effectsText(m, m.after ?? [], v));
  const s = out.filter(Boolean).join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
