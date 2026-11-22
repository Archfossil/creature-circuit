// Swap Moves: what happens when one creature swaps in for another in battle. The trainer sets one per
// direction on each creature's card: "Sproutle swapping in for Puddlit" can differ from "Sproutle
// swapping in for Zapup" (and from "Puddlit swapping in for Sproutle"). The incoming creature is the
// Alpha; the one it replaces is the partner.
//
// Which a pair can use (engine/swaps.ts): a typed Swap Move needs one of the two creatures to have its
// type, and the stronger ones need Teamwork with that partner. Each species has a favourite (its
// `affinity`, one of the five neutral moves), used until the trainer picks another.
//
// Each move is data: `before` effects, then an optional `hit`, then `after` effects. The battle engine
// (battle.ts → doSwap) runs them and `describeSwap` writes the text the card and swap screen show,
// so the rules and the description can't drift apart.
import type { ElementType, StatKey, Stats, StatusId } from './schema';
import { STATUS_FOR, STATUS_INFO } from './moves';
import { TYPE_LABEL } from './types';

/** The numbers a Swap Move works from: the Alpha's (a), partner's (p) and foe's (f, unknown off the battlefield) stats. */
export interface SwapVals { a: Stats; p: Stats; f?: Stats; bonus: number; A: string; P: string; aType: ElementType; pType: ElementType }
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
  /** Typed moves need a creature of this type in the pair. Neutral ones are open to every pair. */
  type?: ElementType;
  /** Teamwork the Alpha needs with the partner to set it. */
  teamwork: number;
  /** Bonus Speed for the swap's turn order. */
  speed?: number;
  text: string;
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

export const SWAP_MOVES: SwapMove[] = [
  // ── Neutral: open to every pair (each species' favourite is one of these) ──
  { id: 'tagStrike', name: 'Tag Strike', teamwork: 0, text: 'Swaps in with an attack of the partner’s type, powered by the partner’s Focus.',
    hit: { acc: 8, die: 6, kind: 'elemental', chart: 'partner', parts: parts(of('p', 'focus')) } },
  { id: 'shieldPass', name: 'Shield Pass', teamwork: 0, text: 'Borrows the partner’s Armor and Ward while it stays in, then counters.',
    before: [mod('self', 'armor', borrow('armor')), mod('self', 'ward', borrow('ward'))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  { id: 'slipstream', name: 'Slipstream', teamwork: 0, speed: 3, text: 'Rides the partner’s Speed to strike first with a physical hit.',
    hit: { die: 6, kind: 'physical', parts: parts(of('a', 'power'), (v) => ({ label: `${v.P}’s Speed ÷ 3`, value: Math.floor(v.p.speed / 3) })) } },
  { id: 'siphon', name: 'Siphon', teamwork: 0, text: 'Drains the foe, healing using the partner’s Vigor.',
    hit: { die: 6, kind: 'elemental', chart: 'alpha', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', healFrom('p'))] },
  { id: 'rally', name: 'Rally', teamwork: 0, text: 'Partner cheers: restores Stamina, eases Fatigue and raises Power and Focus.',
    before: [{ t: 'refill' }, { t: 'ease' }, mod('self', 'power', withTw(1)), mod('self', 'focus', withTw(1))] },

  // ── Astral ──
  { id: 'starfall-relay', name: 'Starfall Relay', type: 'astral', teamwork: 1, text: 'The partner’s Focus falls as starlight on the foe.',
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('p', 'focus')) } },
  { id: 'twin-orbit', name: 'Twin Orbit', type: 'astral', teamwork: 2, text: 'The pair circle each other: the Alpha slips out of reach and the foe loses track.',
    before: [mod('self', 'evasion', fixed(1)), mod('foe', 'evasion', fixed(-1))],
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  // ── Charm ──
  { id: 'sweet-handoff', name: 'Sweet Handoff', type: 'charm', teamwork: 1, text: 'A disarming entrance that beguiles the foe and steadies the Alpha.',
    before: [{ t: 'status' }],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', plusTw(1))] },
  { id: 'heartlink', name: 'Heartlink', type: 'charm', teamwork: 2, text: 'The two mend each other, and the foe’s heart goes out of its attacks.',
    before: [heal('alpha', healFrom('p')), heal('partner', healFrom('a')), mod('foe', 'power', fixed(-1))] },
  // ── Electric ──
  { id: 'live-wire', name: 'Live Wire', type: 'electric', teamwork: 1, speed: 2, text: 'Jumps in crackling and strikes before the foe can react.',
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  { id: 'arc-bridge', name: 'Arc Bridge', type: 'electric', teamwork: 2, text: 'A current arcs between the pair and through the foe, powered by both.',
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus'), half('p', 'focus', 'down')) } },
  // ── Fire ──
  { id: 'kindle-swap', name: 'Kindle Swap', type: 'fire', teamwork: 1, text: 'The partner leaves embers behind: the foe burns and the Alpha is fired up.',
    before: [{ t: 'status' }, mod('self', 'power', withTw(1))] },
  { id: 'phoenix-handoff', name: 'Phoenix Handoff', type: 'fire', teamwork: 2, text: 'The Alpha rises from the partner’s flames in a blazing strike.',
    hit: { acc: 8, die: 8, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  // ── Grass ──
  { id: 'root-relay', name: 'Root Relay', type: 'grass', teamwork: 1, text: 'Roots pass from partner to Alpha: they snare the foe and feed the Alpha.',
    before: [{ t: 'status' }],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', plusTw(1))] },
  { id: 'overgrowth', name: 'Overgrowth', type: 'grass', teamwork: 2, text: 'The partner’s strength grows into the Alpha as bark and leaf.',
    before: [heal('alpha', healFrom('p')), mod('self', 'armor', fixed(1)), mod('self', 'ward', fixed(1))],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) } },
  // ── Rock ──
  { id: 'landslide-tag', name: 'Landslide Tag', type: 'rock', teamwork: 1, text: 'The Alpha rides the partner’s weight down onto the foe.',
    hit: { acc: 8, die: 6, kind: 'physical', status: true, parts: parts(of('a', 'power'), half('p', 'armor')) } },
  { id: 'bulwark-swap', name: 'Bulwark Swap', type: 'rock', teamwork: 2, text: 'Stone walls go up as the Alpha arrives, and it hits back from behind them.',
    before: [mod('self', 'armor', plusTw(2)), mod('self', 'ward', fixed(1))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  // ── Steel ──
  { id: 'iron-relay', name: 'Iron Relay', type: 'steel', teamwork: 1, text: 'A steel-shod charge that dents the foe’s defences.',
    hit: { die: 6, kind: 'physical', status: true, parts: parts(of('a', 'power')) } },
  { id: 'alloy-guard', name: 'Alloy Guard', type: 'steel', teamwork: 2, text: 'The partner plates the Alpha in metal and strips the foe’s.',
    before: [mod('self', 'armor', borrow('armor')), mod('foe', 'armor', fixed(-1))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  // ── Water ──
  { id: 'tide-relay', name: 'Tide Relay', type: 'water', teamwork: 1, text: 'The partner’s Focus surges in as a wave.',
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('p', 'focus')) } },
  { id: 'wellspring', name: 'Wellspring', type: 'water', teamwork: 2, text: 'Fresh water for the pair, and a drenching for the foe.',
    before: [heal('alpha', healFrom('p')), { t: 'refill' }, { t: 'status' }] },
];

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
    case 'mod': { const n = e.n(v); return e.who === 'self' ? `${signed(n)} ${LABEL[e.stat]}` : `foe ${signed(n)} ${LABEL[e.stat]}`; }
    case 'heal': return `${e.who === 'alpha' ? v.A : v.P} heals ${e.n(v)}`;
    case 'refill': return 'both refill Stamina';
    case 'ease': return 'both lose 1 Fatigue';
    case 'status': { const s = swapStatus(m); return s ? `${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} on the foe (if it has no status)` : ''; }
  }
}

/** A list of effects in words; the Alpha's own stat boosts are grouped, with "while it stays in" said once. */
function effectsText(m: SwapMove, es: SwapEffect[], v: SwapVals): string[] {
  const out: string[] = [];
  let boosts: string[] = [];
  const flush = () => { if (boosts.length) out.push(`${boosts.join(', ')} while it stays in`); boosts = []; };
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
  if (m.speed) out.push(`+${m.speed} Speed to act first`);
  out.push(...effectsText(m, m.before ?? [], v));
  if (m.hit) {
    const h = m.hit;
    const def = h.kind === 'physical' ? 'armor' : 'ward';
    // each number with what it is: "d6 + 2 (Zapup’s Focus) + 1 (Teamwork) − 1 (foe’s Ward)"
    const sum = h.parts(v).map((p) => ` ${p.value >= 0 ? '+' : '−'} ${Math.abs(p.value)} (${p.label})`).join('');
    const foeDef = v.f ? ` − ${v.f[def]} (foe’s ${LABEL[def]})` : ` − foe’s ${LABEL[def]}`;
    const acc = h.acc ? `d${h.acc} to hit${v.f ? ` (needs ${v.f.evasion}+)` : ' vs Evasion'}, then ` : 'a sure hit: ';
    const chart = swapChart(m, v);
    const st = h.status ? swapStatus(m) : undefined;
    out.push(`${acc}d${h.die}${sum}${foeDef} damage${chart ? `, as ${TYPE_LABEL[chart]}` : ''}${st ? ` (${STATUS_INFO[st].name} on a 1–2)` : ''}`);
  }
  out.push(...effectsText(m, m.after ?? [], v));
  const s = out.filter(Boolean).join('; ');
  // capitalise a leading word, but not a die ("d8 to hit")
  return (/^d\d/.test(s) ? s : s.charAt(0).toUpperCase() + s.slice(1)) + '.';
}
