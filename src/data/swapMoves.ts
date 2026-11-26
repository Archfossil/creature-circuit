// Swap Moves: what happens when one creature swaps in for another in battle. The trainer sets one per
// direction on each creature's card: "Sproutle swapping in for Puddlit" can differ from "Sproutle
// swapping in for Zapup" (and from "Puddlit swapping in for Sproutle"). The incoming creature is the
// Alpha; the one it replaces is the partner.
//
// Which a pair can use (engine/swaps.ts): the Alpha uses the partner's types, so a typed Swap Move
// needs the partner (not the Alpha) to have its type; a Boosted one needs both to have it. The stronger ones need Teamwork with that partner. Until the trainer picks one, a pair uses
// a neutral move picked at random for it (engine/swaps.ts → defaultSwapMove).
//
// Each move is data: `before` effects, then an optional `hit` (and `second` hit), then `after` effects. The battle engine
// (battle.ts → doSwap) runs them and `describeSwap` writes the text the card and swap screen show,
// so the rules and the description can't drift apart.
import type { ElementType, StatKey, Stats, StatusId } from './schema';
import { STATUS_FOR, STATUS_INFO } from './moves';
import { TYPE_LABEL } from './types';

/** The numbers a Swap Move works from: the Alpha's (a), partner's (p) and foe's (f, unknown off the battlefield) stats. */
export interface SwapVals { a: Stats; p: Stats; f?: Stats; bonus: number; /** In battle: the damage the partner has taken this battle (Revenge). */ hurt?: number; A: string; P: string; aType: ElementType; pType: ElementType; /** Balanced creatures', while the foe isn't known: whichever of both is better against it. */ aEither?: ElementType[]; pEither?: ElementType[] }
/**
 * Who a Swap Move's words are about: the Alpha (A, swapping in) and the partner (P, swapping out), with
 * their main types when known. Off a real pair (docs) they're "the Alpha" / "the partner".
 */
export interface SwapNames { A: string; P: string; aType?: ElementType; pType?: ElementType; aEither?: ElementType[]; pEither?: ElementType[] }
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
  | { t: 'status' }
  /** Zeroing In for the Alpha, and its next attack adds `n` of the partner's Power or Focus (whichever that attack adds). */
  | { t: 'advise'; zero: number; n: (v: SwapVals, k: 'power' | 'focus') => number }
  /** The foe can't swap out or run while it faces the Alpha (and takes `extra` more damage from attacks). */
  | { t: 'trap'; extra?: number }
  /** A wild foe flees (not a Legendary). A trainer's takes `extra` more damage from attacks while it faces the Alpha, and whoever swaps in for it gets the move's type status. */
  | { t: 'warn'; extra: number }
  /** The foe gets this much Fatigue. */
  | { t: 'fatigue'; n: number };

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
  /** Inflicts the move's type status on a low damage roll. */
  status?: boolean;
  /** Highest damage roll that inflicts that status (default `SWAP_STATUS_ON`). */
  statusOn?: number;
}

export interface SwapMove {
  id: string;
  name: string;
  /** Typed moves need a partner of this type (the Alpha's own type doesn't count). Neutral ones are open to every pair. */
  type?: ElementType;
  /** Boosted moves need both creatures to share the move's type. */
  boosted?: boolean;
  /** Teamwork the Alpha needs with the partner to set it. */
  teamwork: number;
  /** Bonus Speed for the swap's turn order. */
  speed?: number;
  /** What happens, in words, naming who swaps in and who swaps out (use `swapText`). The numbers are `describeSwap`'s job. */
  text: (n: SwapNames) => string;
  before?: SwapEffect[];
  hit?: SwapHit;
  /** A second hit, if the foe is still standing after the first. */
  second?: SwapHit;
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
const typeOf = (t?: ElementType, either?: ElementType[]) => (either ? ` (${eitherText(either)})` : t ? ` (${TYPE_LABEL[t]})` : '');
const eitherText = (ts: ElementType[]) => `${ts.map((t) => TYPE_LABEL[t]).join(' or ')}, whichever is better`;

/** Advise: the Zeroing In the Alpha comes in with. */
export const ADVISE_ZERO = 2;
/** Revenge: the most the partner's wounds add. Traps and warnings: the damage they add. */
export const REVENGE_MAX = 10, PIN_EXTRA = 2;

export const SWAP_MOVES: SwapMove[] = [
  // ── Neutral: open to every pair (an unset slot uses one of these, picked at random) ──
  { id: 'tagStrike', name: 'Tag Strike', teamwork: 0, text: (n) => `${n.A} swaps in with an attack of ${n.P}’s type${typeOf(n.pType, n.pEither)}, powered by ${n.P}’s Focus.`,
    hit: { acc: 8, die: 6, kind: 'elemental', chart: 'partner', parts: parts(of('p', 'focus')) } },
  { id: 'shieldPass', name: 'Shield Pass', teamwork: 0, text: (n) => `${n.A} borrows half of ${n.P}’s Armor and Ward for as long as it stays in, then counters with a physical hit.`,
    before: [mod('self', 'armor', borrow('armor')), mod('self', 'ward', borrow('ward'))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  { id: 'slipstream', name: 'Slipstream', teamwork: 0, speed: 3, text: (n) => `${n.A} rides ${n.P}’s Speed to strike first with a physical hit.`,
    hit: { die: 6, kind: 'physical', parts: parts(of('a', 'power'), (v) => ({ label: `${v.P}’s Speed ÷ 3`, value: Math.floor(v.p.speed / 3) })) } },
  { id: 'siphon', name: 'Siphon', teamwork: 0, text: (n) => `${n.A} drains the foe with an attack of its own type${typeOf(n.aType, n.aEither)}, then heals using ${n.P}’s Vigor.`,
    hit: { die: 6, kind: 'elemental', chart: 'alpha', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', healFrom('p'))] },
  { id: 'rally', name: 'Rally', teamwork: 0, text: (n) => `${n.P} cheers ${n.A} on: both restore Stamina and shake off some Fatigue, and ${n.A} gains Power and Focus.`,
    before: [{ t: 'refill' }, { t: 'ease' }, mod('self', 'power', withTw(1)), mod('self', 'focus', withTw(1))] },
  { id: 'advise', name: 'Advise', teamwork: 0, text: (n) => `${n.P} talks ${n.A} through the fight on the way out: ${n.A} zeroes in, and its next attack lands where ${n.P} would have hit.`,
    before: [{ t: 'advise', zero: ADVISE_ZERO, n: (v, k) => Math.max(1, Math.ceil(v.p[k] / 2)) + v.bonus }] },
  { id: 'revenge', name: 'Revenge', teamwork: 1, text: (n) => `${n.A} storms in to pay the foe back for everything it did to ${n.P}.`,
    hit: { acc: 8, die: 6, kind: 'physical', parts: parts(of('a', 'power'), (v) => ({ label: `${v.P}’s wounds this battle ÷ 2, up to ${REVENGE_MAX}`, value: Math.min(REVENGE_MAX, Math.ceil((v.hurt ?? 0) / 2)) })) } },

  // ── Astral ──
  { id: 'starfall-relay', name: 'Starfall Relay', type: 'astral', teamwork: 1, text: (n) => `As ${n.A} swaps in, ${n.P}’s Focus falls on the foe as starlight.`,
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('p', 'focus')) } },
  { id: 'event-horizon', name: 'Event Horizon', type: 'astral', teamwork: 2, text: (n) => `${n.P} bends the sky as it leaves: the foe is caught in ${n.A}’s pull, and everything hits it harder.`,
    before: [{ t: 'trap', extra: PIN_EXTRA }] },
  { id: 'twin-orbit', name: 'Twin Orbit', type: 'astral', teamwork: 2, text: (n) => `${n.A} and ${n.P} circle each other: ${n.A} slips out of reach, the foe loses track, and ${n.A} strikes.`,
    before: [mod('self', 'evasion', fixed(1)), mod('foe', 'evasion', fixed(-1))],
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  // ── Charm ──
  { id: 'sweet-handoff', name: 'Sweet Handoff', type: 'charm', teamwork: 1, text: (n) => `${n.P} charms the foe on its way out: the foe is beguiled, and ${n.A} lands a light hit and steadies itself.`,
    before: [{ t: 'status' }],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', plusTw(1))] },
  { id: 'cold-shoulder', name: 'Cold Shoulder', type: 'charm', teamwork: 2, text: (n) => `${n.A} gives the foe a look that says leave, now: a wild one runs off; a trainer’s stays at its peril, and whoever replaces it is beguiled.`,
    before: [{ t: 'warn', extra: PIN_EXTRA }] },
  { id: 'heartlink', name: 'Heartlink', type: 'charm', teamwork: 2, text: (n) => `${n.A} and ${n.P} mend each other, and the foe’s heart goes out of its attacks.`,
    before: [heal('alpha', healFrom('p')), heal('partner', healFrom('a')), mod('foe', 'power', fixed(-1))] },
  // ── Electric ──
  { id: 'live-wire', name: 'Live Wire', type: 'electric', teamwork: 1, speed: 2, text: (n) => `${n.P} charges ${n.A} up, and ${n.A} jumps in crackling to strike before the foe can react.`,
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  { id: 'static-warning', name: 'Static Warning', type: 'electric', teamwork: 2, text: (n) => `${n.A} crackles a warning: a wild foe bolts; a trainer’s stays at its peril, and whoever replaces it is shocked.`,
    before: [{ t: 'warn', extra: PIN_EXTRA }] },
  { id: 'arc-bridge', name: 'Arc Bridge', type: 'electric', teamwork: 2, text: (n) => `A current arcs from ${n.P} through ${n.A} into the foe, powered by both.`,
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus'), half('p', 'focus', 'down')) } },
  // ── Fire ──
  { id: 'kindle-swap', name: 'Kindle Swap', type: 'fire', teamwork: 1, text: (n) => `${n.P} leaves embers behind as it goes: the foe burns and ${n.A} is fired up.`,
    before: [{ t: 'status' }, mod('self', 'power', withTw(1))] },
  { id: 'ring-of-fire', name: 'Ring of Fire', type: 'fire', teamwork: 2, text: (n) => `${n.P} leaves a ring of fire round the foe: it burns, and it can’t get out while ${n.A} holds it there.`,
    before: [{ t: 'trap' }, { t: 'status' }] },
  { id: 'phoenix-handoff', name: 'Phoenix Handoff', type: 'fire', teamwork: 2, text: (n) => `${n.A} rises from ${n.P}’s flames in a blazing strike.`,
    hit: { acc: 8, die: 8, kind: 'elemental', status: true, parts: parts(of('a', 'focus')) } },
  // ── Grass ──
  { id: 'root-relay', name: 'Root Relay', type: 'grass', teamwork: 1, text: (n) => `Roots pass from ${n.P} to ${n.A}: they snare the foe, ${n.A} strikes, and the roots feed it.`,
    before: [{ t: 'status' }],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) },
    after: [heal('alpha', plusTw(1))] },
  { id: 'thorn-fence', name: 'Thorn Fence', type: 'grass', teamwork: 2, text: (n) => `${n.A} grows a fence of thorns with one way out: a wild foe takes it; a trainer’s stays at its peril, and whoever replaces it is snared.`,
    before: [{ t: 'warn', extra: PIN_EXTRA }] },
  { id: 'overgrowth', name: 'Overgrowth', type: 'grass', teamwork: 2, text: (n) => `${n.P}’s strength grows into ${n.A} as bark and leaf, healing and toughening it before it strikes.`,
    before: [heal('alpha', healFrom('p')), mod('self', 'armor', fixed(1)), mod('self', 'ward', fixed(1))],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) } },
  // ── Rock ──
  { id: 'landslide-tag', name: 'Landslide Tag', type: 'rock', teamwork: 1, text: (n) => `${n.A} rides ${n.P}’s weight down onto the foe.`,
    hit: { acc: 8, die: 6, kind: 'physical', status: true, parts: parts(of('a', 'power'), half('p', 'armor')) } },
  { id: 'stone-tomb', name: 'Stone Tomb', type: 'rock', teamwork: 2, text: (n) => `${n.P} walls the foe in with stone: it’s worn out at once, and it can’t get out while ${n.A} stands guard.`,
    before: [{ t: 'trap' }, { t: 'fatigue', n: 2 }] },
  { id: 'bulwark-swap', name: 'Bulwark Swap', type: 'rock', teamwork: 2, text: (n) => `${n.P} raises stone walls as it leaves, and ${n.A} hits back from behind them.`,
    before: [mod('self', 'armor', plusTw(2)), mod('self', 'ward', fixed(1))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  // ── Steel ──
  { id: 'iron-relay', name: 'Iron Relay', type: 'steel', teamwork: 1, text: (n) => `${n.P} shoes ${n.A} in steel, and ${n.A} charges in to dent the foe’s defences.`,
    hit: { die: 6, kind: 'physical', status: true, parts: parts(of('a', 'power')) } },
  { id: 'iron-ultimatum', name: 'Iron Ultimatum', type: 'steel', teamwork: 2, text: (n) => `${n.A} plants itself and gives the foe an ultimatum: a wild one backs off; a trainer’s stays at its peril, and whoever replaces it is sundered.`,
    before: [{ t: 'warn', extra: PIN_EXTRA }] },
  { id: 'alloy-guard', name: 'Alloy Guard', type: 'steel', teamwork: 2, text: (n) => `${n.P} plates ${n.A} in metal and strips the foe’s, then ${n.A} strikes.`,
    before: [mod('self', 'armor', borrow('armor')), mod('foe', 'armor', fixed(-1))],
    hit: { die: 6, kind: 'physical', parts: partsNoTw(of('a', 'power')) } },
  // ── Water ──
  { id: 'tide-relay', name: 'Tide Relay', type: 'water', teamwork: 1, text: (n) => `${n.A} swaps in on a wave of ${n.P}’s Focus.`,
    hit: { acc: 8, die: 6, kind: 'elemental', status: true, parts: parts(of('p', 'focus')) } },
  { id: 'bubble-net', name: 'Bubble Net', type: 'water', teamwork: 2, text: (n) => `${n.P} spins a net of bubbles round the foe on its way out: it’s soaked, slowed and easy to hit, and it can’t get out while ${n.A} holds the net.`,
    before: [{ t: 'trap' }, { t: 'status' }, mod('foe', 'speed', fixed(-1)), mod('foe', 'evasion', fixed(-1))] },
  { id: 'wellspring', name: 'Wellspring', type: 'water', teamwork: 2, text: (n) => `${n.A} drinks from ${n.P}’s spring: ${n.A} heals, both refill Stamina, and the foe is drenched.`,
    before: [heal('alpha', healFrom('p')), { t: 'refill' }, { t: 'status' }] },

  // ── Boosted: both creatures must share the type ──
  { id: 'conjunction', name: 'Conjunction', type: 'astral', boosted: true, teamwork: 3, text: (n) => `${n.A} and ${n.P} align like two stars and strike the foe one after the other.`,
    hit: { die: 6, kind: 'elemental', status: true, parts: partsNoTw(of('a', 'focus')) },
    second: { die: 4, kind: 'elemental', status: true, parts: parts(half('p', 'focus')) } },
  { id: 'duet', name: 'Duet', type: 'charm', boosted: true, teamwork: 3, text: (n) => `${n.A} and ${n.P} sing to each other: both are mended, and the foe is too beguiled to fight its best.`,
    before: [{ t: 'status' }, mod('foe', 'power', fixed(-1)), mod('foe', 'focus', fixed(-1)), heal('alpha', healFrom('p')), heal('partner', healFrom('a'))],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) } },
  { id: 'closed-circuit', name: 'Closed Circuit', type: 'electric', boosted: true, teamwork: 3, speed: 4, text: (n) => `${n.A} and ${n.P} complete a circuit: it strikes the foe in a flash and leaves both fully charged.`,
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus'), half('p', 'focus', 'down')) },
    after: [{ t: 'refill' }] },
  { id: 'twin-blaze', name: 'Twin Blaze', type: 'fire', boosted: true, teamwork: 3, text: (n) => `${n.P}’s flames and ${n.A}’s meet in one roaring blaze that is hard to aim and harder to put out.`,
    hit: { acc: 8, die: 10, kind: 'elemental', status: true, statusOn: 4, parts: parts(of('a', 'focus'), half('p', 'focus')) } },
  { id: 'grove-chorus', name: 'Grove Chorus', type: 'grass', boosted: true, teamwork: 3, text: (n) => `${n.A} and ${n.P} call up a grove around them: both are healed, the foe is snared, and ${n.A} lashes out from the leaves.`,
    before: [heal('alpha', healFrom('p')), heal('partner', healFrom('a')), { t: 'status' }, mod('self', 'ward', fixed(1))],
    hit: { die: 4, kind: 'elemental', parts: partsNoTw(of('a', 'focus')) } },
  { id: 'twin-monolith', name: 'Twin Monolith', type: 'rock', boosted: true, teamwork: 3, text: (n) => `${n.A} and ${n.P} slam together around the foe like two great stones, and ${n.A} comes out tougher.`,
    hit: { acc: 8, die: 8, kind: 'physical', status: true, parts: parts(of('a', 'power'), half('a', 'armor'), half('p', 'armor')) },
    after: [mod('self', 'armor', fixed(1))] },
  { id: 'interlock', name: 'Interlock', type: 'steel', boosted: true, teamwork: 3, text: (n) => `${n.P} locks its plating into ${n.A}’s and pries the foe’s loose, then ${n.A} strikes.`,
    before: [mod('self', 'armor', fixed(2)), mod('self', 'ward', fixed(2)), mod('foe', 'armor', fixed(-1))],
    hit: { die: 6, kind: 'physical', status: true, parts: parts(of('a', 'power')) } },
  { id: 'confluence', name: 'Confluence', type: 'water', boosted: true, teamwork: 3, text: (n) => `${n.A} and ${n.P} meet as two currents, sweep over the foe, and leave each other refreshed.`,
    hit: { die: 6, kind: 'elemental', status: true, parts: parts(of('a', 'focus'), half('p', 'focus', 'down')) },
    after: [heal('alpha', plusTw(1)), heal('partner', plusTw(1))] },
];

/**
 * A Swap Move's text for a pair. Leave out a name to get "the Alpha" / "the partner" (e.g. on a card that
 * describes a move without a partner in mind).
 */
export function swapText(m: SwapMove, n: Partial<SwapNames> = {}): string {
  const s = m.text({ A: n.A ?? 'the Alpha', P: n.P ?? 'the partner', aType: n.aType, pType: n.pType, aEither: n.aEither, pEither: n.pEither });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const SWAP_MOVE_BY_ID: Record<string, SwapMove> = Object.fromEntries(SWAP_MOVES.map((m) => [m.id, m]));

/** The status a typed Swap Move inflicts. */
export const swapStatus = (m: SwapMove): StatusId | undefined => (m.type ? STATUS_FOR[m.type] : undefined);
/** Highest damage roll on which a typed hit inflicts its status, unless the hit says otherwise (`statusOn`). */
export const SWAP_STATUS_ON = 2;
/** The type a Swap Move's hit uses on the type chart (none for physical hits). */
export function swapChart(m: SwapMove, v: Pick<SwapVals, 'aType' | 'pType'>, h: SwapHit | undefined = m.hit): ElementType | undefined {
  if (!h || h.kind !== 'elemental') return undefined;
  return h.chart === 'alpha' ? v.aType : h.chart === 'partner' ? v.pType : m.type;
}

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
function effectText(m: SwapMove, e: SwapEffect, v: SwapVals): string {
  switch (e.t) {
    case 'mod': { const n = e.n(v); return e.who === 'self' ? `${signed(n)} ${LABEL[e.stat]}` : `the foe gets ${signed(n)} ${LABEL[e.stat]}`; }
    case 'heal': return `${e.who === 'alpha' ? v.A : v.P} heals ${e.n(v)} (beyond a full heart: Overheal)`;
    case 'refill': return `${v.A} and ${v.P} refill Stamina`;
    case 'ease': return `${v.A} and ${v.P} lose 1 Fatigue`;
    case 'status': { const s = swapStatus(m); return s ? `${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} on the foe (if it has no status)` : ''; }
    case 'trap': return `the foe can’t swap out or run while ${v.A} stays in${e.extra ? `, and takes +${e.extra} damage from attacks` : ''}`;
    case 'warn': { const s = swapStatus(m); return `a wild foe runs off (a Legendary won’t). A trainer’s takes +${e.extra} damage from attacks while it faces ${v.A}, and whoever swaps in for it gets ${s ? `${STATUS_INFO[s].icon} ${STATUS_INFO[s].name}` : 'nothing'}`; }
    case 'fatigue': return `the foe gets +${e.n} Fatigue`;
    case 'advise': return `${v.A} zeroes in +${e.zero}, and its next attack adds +${e.n(v, 'power')} (half ${v.P}’s Power${v.bonus ? ', plus Teamwork' : ''}) if it’s physical or a Blitz, or +${e.n(v, 'focus')} (half ${v.P}’s Focus${v.bonus ? ', plus Teamwork' : ''}) if it’s elemental`;
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
  for (const h of [m.hit, m.second]) {
    if (!h) continue;
    const def = h.kind === 'physical' ? 'armor' : 'ward';
    // each number with what it is: "d6 + 2 (Zapup’s Focus) + 1 (Teamwork) − 1 (foe’s Ward)"
    const sum = h.parts(v).map((p) => ` ${p.value >= 0 ? '+' : '−'} ${Math.abs(p.value)} (${p.label})`).join('');
    const foeDef = v.f ? ` − ${v.f[def]} (foe’s ${LABEL[def]})` : ` − foe’s ${LABEL[def]}`;
    const acc = h === m.second ? `then ${v.P} joins in (a sure hit, if the foe still stands): ` : h.acc ? `${v.A} attacks: d${h.acc} to hit${v.f ? ` (needs ${v.f.evasion}+)` : ' vs the foe’s Evasion'}, then ` : `${v.A} attacks (a sure hit): `;
    const chart = swapChart(m, v, h);
    const either = h.chart === 'alpha' ? v.aEither : h.chart === 'partner' ? v.pEither : undefined;
    const st = h.status ? swapStatus(m) : undefined;
    out.push(`${acc}d${h.die}${sum}${foeDef} damage${chart ? `, as ${either ? eitherText(either) : TYPE_LABEL[chart]}` : ''}${st ? ` (${STATUS_INFO[st].name} on a 1–${h.statusOn ?? SWAP_STATUS_ON})` : ''}`);
  }
  out.push(...effectsText(m, m.after ?? [], v));
  const s = out.filter(Boolean).join('; ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
