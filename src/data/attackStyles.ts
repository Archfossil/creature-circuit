// How the attack grid's generated attacks get their character (moves.ts → the attack grid). Two things make an attack:
//   • its lead type, the one it hits as: the style, stronger the more energy it costs
//   • the other type of a dual attack: a twist, small for 1 energy of it and full for 2 (5 of one type twists itself)
// Then its flat damage is set so that every attack of a cost is worth about the same (worth): an attack that crits, or
// never misses, hits for less, and one that's slow or wild hits for more. Costs of 1 stay plain.
import type { ElementType, Move, StatusId } from './schema';

/** What a style or twist can change. Flat damage isn't here: it's what evens them out. */
type Draft = Pick<Move, 'dmgDie' | 'effort' | 'speed'> & Partial<Pick<Move, 'extraDice' | 'accuracy' | 'critRange' | 'cascade' | 'potency' | 'purge' | 'zeroIn' | 'effect'>>;
interface Ctx { total: number; major: number; minor: number; minorType?: ElementType; status: StatusId; minorStatus?: StatusId }

const STEPS = [4, 6, 8, 10, 12];
const step = (die: number, n: number) => STEPS[Math.max(0, Math.min(STEPS.length - 1, STEPS.indexOf(die) + n))];
/** Big attacks tire more. */
const EFFORT = [0, 1, 1, 2, 2, 3];
/** How far a lead type's style goes at this cost: 0 plain, 1 a hint, 2 full, 3 its biggest (4+ of the type). */
const levelOf = (c: Ctx) => (c.total <= 2 ? 0 : c.total === 3 ? 1 : c.major >= 4 ? 3 : 2);

/** In a sentence each, for the docs and the guide. */
export const STYLE_TEXT: Record<ElementType, { style: string; twist: string }> = {
  astral: { style: 'Starbursts: Cascade, so a top roll bursts again and again.', twist: 'Cascade' },
  charm: { style: 'Picks its moment: Purge against the troubled, and big ones that can’t miss.', twist: 'Purge' },
  electric: { style: 'Lightning: fast, and can crit, on small dice.', twist: 'Speed, then crits' },
  fire: { style: 'Spreads: Potency, at a cost in Effort.', twist: 'Potency' },
  grass: { style: 'Thorns and sap: handfuls of small dice, and healing.', twist: 'Healing' },
  rock: { style: 'Boulders: the biggest dice, the slowest, all or nothing.', twist: 'Bigger and slower, then all or nothing' },
  steel: { style: 'Machinery: little luck, lots of flat damage, and it strips the foe’s guard.', twist: 'Steadier damage, then strips Ward' },
  water: { style: 'The tide comes back: Pursuit, and it rolls in twice.', twist: 'Pursuit' },
};

const lead: Record<ElementType, (c: Ctx) => Draft> = {
  astral: (c) => [
    { dmgDie: 6, effort: 1, speed: 0 },
    { dmgDie: 6, effort: 2, speed: 0, cascade: 4 as const },
    { dmgDie: 8, effort: EFFORT[c.total], speed: 0, cascade: true as const },
    { dmgDie: 4, extraDice: [4], effort: 3, speed: -1, cascade: 8 as const },
  ][levelOf(c)],
  charm: (c) => [
    { dmgDie: 6, effort: 1, speed: 1 },
    { dmgDie: 6, effort: 1, speed: 1, purge: { n: 2 } },
    { dmgDie: 6, effort: 2, speed: 0, accuracy: 8, purge: c.minorStatus ? { n: 4, status: c.minorStatus } : { n: 2 } },
    { dmgDie: 6, effort: 3, speed: 1, accuracy: 'sure' as const },
  ][levelOf(c)],
  electric: (c) => [
    { dmgDie: 4, effort: 1, speed: 3 },
    { dmgDie: 6, effort: 1, speed: 2 },
    { dmgDie: 6, effort: EFFORT[c.total], speed: 1, critRange: 1 },
    { dmgDie: 4, effort: 3, speed: 3, critRange: 2 },
  ][levelOf(c)],
  fire: (c) => [
    { dmgDie: 6, effort: 2, speed: -1 },
    { dmgDie: 8, effort: 2, speed: -1, potency: 2 },
    { dmgDie: 8, effort: EFFORT[c.total] + 1, speed: -1, potency: 3 },
    { dmgDie: 12, effort: 4, speed: -2, potency: 4 },
  ][levelOf(c)],
  grass: (c) => [
    { dmgDie: 4, effort: 1, speed: 0, effect: { heal: 1 } },
    { dmgDie: 4, extraDice: [4], effort: 2, speed: 0 },
    { dmgDie: 4, extraDice: [4], effort: EFFORT[c.total], speed: -1, effect: { heal: 1 } },
    { dmgDie: 4, extraDice: [4], effort: 4, speed: -2, effect: { heal: 3 } },
  ][levelOf(c)],
  rock: (c) => [
    { dmgDie: 8, effort: 1, speed: -1 },
    { dmgDie: 8, effort: 2, speed: -2 },
    { dmgDie: 10, effort: EFFORT[c.total], speed: -3, zeroIn: 0 },
    { dmgDie: 12, effort: 3, speed: -4, accuracy: 8, zeroIn: 0 },
  ][levelOf(c)],
  steel: (c) => [
    { dmgDie: 4, effort: 1, speed: -1 },
    { dmgDie: 4, effort: 1, speed: -1 },
    { dmgDie: 4, effort: EFFORT[c.total] - 1, speed: -1 },
    { dmgDie: 4, effort: 3, speed: -2, effect: { foe: { ward: -1 } } },
  ][levelOf(c)],
  water: (c) => [
    { dmgDie: 4, effort: 1, speed: 1 },
    { dmgDie: 6, effort: 2, speed: 0, zeroIn: 2 },
    { dmgDie: 6, extraDice: [4], effort: EFFORT[c.total], speed: 0, zeroIn: 2 },
    { dmgDie: 8, extraDice: [6], effort: 3, speed: -1, zeroIn: 3 },
  ][levelOf(c)],
};

/** The other type's twist: `full` for 2 energy of it. */
const twist: Record<ElementType, (d: Draft, full: boolean, c: Ctx) => void> = {
  astral: (d, full) => { d.cascade = full ? (d.extraDice ? 6 : 10) : 4; },
  // (its own status is what it picks on: it can land that itself, and come back for it)
  charm: (d, full, c) => { d.purge = full ? { n: 4, status: c.status } : { n: 2 }; },
  electric: (d, full, c) => { if (!c.minor) d.effort += 1; d.speed += full ? 1 : 2; if (full && d.accuracy !== 'sure') d.critRange = (d.critRange ?? 0) + 1; else if (full) d.speed += 2; },
  fire: (d, full) => { d.potency = (d.potency ?? 0) + (full ? 2 : 1); if (full) d.effort += 1; },
  grass: (d, full) => { d.effect = { ...d.effect, heal: (d.effect?.heal ?? 0) + (full ? 2 : 1) }; },
  rock: (d, full) => { d.dmgDie = step(d.dmgDie, full ? 2 : 1); d.speed -= full ? 2 : 1; if (full && d.accuracy !== 'sure') d.zeroIn = 0; },
  steel: (d, full) => {
    d.dmgDie = step(d.dmgDie, full ? -2 : -1);
    if (d.extraDice) d.extraDice = d.extraDice.slice(0, full ? 0 : 1).map((x) => step(x, -1));
    if (!d.extraDice?.length) delete d.extraDice;
    if (full) d.effect = { ...d.effect, foe: { ...d.effect?.foe, ward: (d.effect?.foe?.ward ?? 0) - 1 } };
  },
  // (what can't miss has nothing to pursue: the tide comes in sooner instead)
  water: (d, full, c) => { if (d.accuracy === 'sure') d.speed += full ? 2 : 1; else { d.zeroIn = full ? 3 : Math.max(2, d.zeroIn ?? 0); if (!c.minor) d.speed += 3; } },
};

/** What each type's attacks are called, by how their energy splits (a single type's biggest is last). */
export const STYLE_NOUNS: Record<ElementType, Record<string, string>> = {
  astral: { '1-1': 'Twinkle', '2-1': 'Gleam', '2-2': 'Shower', '3-1': 'Starburst', '3-2': 'Constellation', '4-1': 'Supernova', '5': 'Singularity' },
  charm: { '1-1': 'Wink', '2-1': 'Whisper', '2-2': 'Serenade', '3-1': 'Enchantment', '3-2': 'Spellbind', '4-1': 'Heartstopper', '5': 'Rapture' },
  electric: { '1-1': 'Zap', '2-1': 'Jolt', '2-2': 'Surge', '3-1': 'Bolt', '3-2': 'Overload', '4-1': 'Thunderstroke', '5': 'Judgment' },
  fire: { '1-1': 'Flicker', '2-1': 'Scorch', '2-2': 'Flare', '3-1': 'Wildfire', '3-2': 'Inferno', '4-1': 'Eruption', '5': 'Conflagration' },
  grass: { '1-1': 'Sprout', '2-1': 'Bloom', '2-2': 'Tangle', '3-1': 'Siphon', '3-2': 'Overrun', '4-1': 'Harvest', '5': 'Worldroot' },
  rock: { '1-1': 'Chip', '2-1': 'Crack', '2-2': 'Tremor', '3-1': 'Crush', '3-2': 'Landslide', '4-1': 'Monolith', '5': 'Worldbreaker' },
  steel: { '1-1': 'Nick', '2-1': 'Shear', '2-2': 'Press', '3-1': 'Hammerfall', '3-2': 'Dismantle', '4-1': 'Guillotine', '5': 'Colossus' },
  water: { '1-1': 'Ripple', '2-1': 'Current', '2-2': 'Swell', '3-1': 'Breaker', '3-2': 'Deluge', '4-1': 'Abyss', '5': 'Leviathan' },
};

// ── Evening them out ────────────────────────────────────────────
/** The battle an attack is weighed in, by its cost: what Focus usually adds over the foe's Ward. */
const FOCUS_EDGE = [0, 1, 2, 3, 5, 6];
const EVASION = 3;
/** A status over its 3 rounds, in damage-like points. */
const STATUS_WORTH = 2.3;
/** How often a Purge's condition is met: any status, or the named one. */
const PURGE_ANY_ODDS = 0.5, PURGE_NAMED_ODDS = 0.4;

export interface Sums { avgRoll(m: Move): number; statusChance(m: Move): number }
/** What one use of an attack is worth, in damage-like points, in a typical battle for its cost. */
export function attackWorth(m: Move, total: number, sums: Sums): number {
  const acc = m.accuracy === 'sure' ? 0 : m.accuracy;
  const hit = acc ? (acc - EVASION + 1) / acc : 1;
  const crit = acc && m.critRange ? Math.min(1, m.critRange / (hit * acc)) : 0;
  const purge = m.purge ? m.purge.n * (m.purge.status ? PURGE_NAMED_ODDS : PURGE_ANY_ODDS) : 0;
  const raw = sums.avgRoll(m) + FOCUS_EDGE[total] + purge;
  const zero = !acc || m.zeroIn === 0 ? 0 : (1 - hit) * Math.min(1, (m.zeroIn ?? 1) / acc) * raw * 0.6;
  const e = m.effect, rider = (e?.heal ?? 0) * 0.55 - Object.values(e?.foe ?? {}).reduce((a: number, v) => a + (v ?? 0), 0) * 1.1;
  return hit * (raw * (1 + crit) + sums.statusChance(m) * STATUS_WORTH + rider) + zero + m.speed * (m.speed > 0 ? 0.25 : 0.15) - m.effort * 0.35;
}
/** What an attack of a cost should be worth: the plain one the grid began with. */
const PLAIN: Record<number, [die: number, flat: number, effort: number, speed: number]> = { 1: [4, 0, 1, 0], 2: [6, 0, 1, 0], 3: [6, 1, 2, 0], 4: [8, 1, 2, -1], 5: [10, 1, 3, -2] };
export function targetWorth(total: number, dual: boolean, sums: Sums): number {
  const [dmgDie, flat, effort, speed] = PLAIN[total];
  // the biggest are worth a little more than the plain ones were, as they leave room for nothing else
  const big = total < 5 ? 1 : dual ? 1.08 : 1.2;
  return big * attackWorth({ id: '', name: '', kind: 'elemental', cost: {}, accuracy: 6, dmgDie, dmgFlat: flat + (dual ? 1 : 0), effort, speed, text: '' }, total, sums);
}

/** The numbers of a generated attack, styled and evened out. */
export function styledAttack(type: ElementType, major: number, minorType: ElementType | undefined, minor: number, statusFor: Record<ElementType, StatusId>, sums: Sums): Omit<Draft, 'accuracy'> & { accuracy: Move['accuracy']; dmgFlat: number } {
  const total = major + minor;
  const c: Ctx = { total, major, minor, minorType, status: statusFor[type], minorStatus: minorType && statusFor[minorType] };
  const d = JSON.parse(JSON.stringify(lead[type](c))) as Draft;
  if (minorType && total > 2) twist[minorType](d, minor >= 2, c);
  else if (minorType) twist[minorType](d, false, c); // 1 + 1: only a twist
  else twist[type](d, true, c); // all of one type: doubles down on it
  if (d.zeroIn === 1) delete d.zeroIn;
  const want = targetWorth(total, minor > 0, sums);
  const make = (dmgFlat: number): Move => ({ id: '', name: '', kind: 'elemental', type, cost: {}, text: '', accuracy: 6, ...d, dmgFlat });
  // the flat damage that comes closest; if even none is too much, a smaller die, then only one
  let best = 0;
  for (;;) {
    for (let f = 1; f <= 9; f++) if (Math.abs(attackWorth(make(f), total, sums) - want) < Math.abs(attackWorth(make(best), total, sums) - want)) best = f;
    if (best > 0 || attackWorth(make(0), total, sums) <= want + 0.4) break;
    if (d.dmgDie > 4) d.dmgDie = step(d.dmgDie, -1);
    else if (d.extraDice) { delete d.extraDice; d.dmgDie = 6; }
    else break;
  }
  return { accuracy: 6, ...d, dmgFlat: best };
}
