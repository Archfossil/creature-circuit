// Which Swap Moves a pair can use, and the one the trainer set for each direction (data/swapMoves.ts).
// A creature keeps its choices in `swapMoves`, keyed by the partner's uid: the move it uses when it
// swaps in for that partner. Unset (or no longer allowed) means a neutral move picked at random for
// that pair (seeded by the two uids, so it stays the same until the trainer sets one).
import type { ElementType, Stats } from '../data/schema';
import { SWAP_MOVES, SWAP_MOVE_BY_ID, SWAP_STATUS_ON, swapStatus, type SwapEffect, type SwapHit, type SwapMove, type SwapVals } from '../data/swapMoves';
import { TYPE_LABEL, effectiveness } from '../data/types';
import { leadTypes } from '../data/species';
import { STATUS_WORTH, nameOf, speciesOf, stats, typicalGuard, type CreatureInst } from './creature';
import { teamworkBonus, teamworkOf, teamworkShown } from './teamwork';

/** The neutral Swap Moves: open to every pair, so always safe as a default. */
/** (Newer neutral moves aren't drawn, so a pair's default stays what it was.) */
const NEUTRAL = SWAP_MOVES.filter((m) => !m.type && ['tagStrike', 'shieldPass', 'slipstream', 'siphon', 'rally'].includes(m.id));

/**
 * The Swap Move `alpha` uses when swapping in for `partner` until the trainer sets one: a neutral move
 * picked at random for that pair and direction. It's seeded by the two uids, so it doesn't change
 * from battle to battle (or between browsers online). Always allowed.
 */
export function defaultSwapMove(alpha: CreatureInst, partner: CreatureInst): SwapMove {
  const key = `${alpha.uid}>${partner.uid}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return NEUTRAL[(h >>> 0) % NEUTRAL.length];
}

/** Whether the trainer has set (and can still use) a Swap Move for this pair and direction. */
export function swapMoveSet(alpha: CreatureInst, partner: CreatureInst): boolean {
  const picked = SWAP_MOVE_BY_ID[alpha.swapMoves?.[partner.uid] ?? ''];
  return !!picked && !swapLock(alpha, partner, picked);
}

/** Why the pair's types rule `m` out (for good: evolving never changes them), or null if they don't. */
function typeLock(alpha: CreatureInst, partner: CreatureInst, m: SwapMove): string | null {
  if (m.type && m.boosted && !(speciesOf(alpha).types.includes(m.type) && speciesOf(partner).types.includes(m.type))) return `Boosted: both creatures must be ${TYPE_LABEL[m.type]}`;
  if (m.type && !speciesOf(partner).types.includes(m.type)) return `Needs a ${TYPE_LABEL[m.type]} partner`; // the partner lends its types; the Alpha's own don't count
  return null;
}

/** Why `alpha` can't use `m` when swapping in for `partner`, or null if it can. */
export function swapLock(alpha: CreatureInst, partner: CreatureInst, m: SwapMove): string | null {
  const types = typeLock(alpha, partner, m);
  if (types) return types;
  const have = teamworkShown(teamworkOf(alpha, partner));
  if (have < m.teamwork) return `Needs Teamwork ${m.teamwork} (has ${have})`;
  return null;
}

/** The Swap Moves `alpha` can set for swapping in for `partner`. */
export const swapMovesFor = (alpha: CreatureInst, partner: CreatureInst) => SWAP_MOVES.filter((m) => !swapLock(alpha, partner, m));

/** The Swap Moves to show for a pair: all its types allow, with why any are still locked (Teamwork). Open ones first, then the nearest to opening. */
export const swapChoices = (alpha: CreatureInst, partner: CreatureInst) => SWAP_MOVES.filter((m) => !typeLock(alpha, partner, m))
  .map((m) => ({ m, lock: swapLock(alpha, partner, m) }))
  .sort((a, b) => Number(!!a.lock) - Number(!!b.lock) || (a.lock ? a.m.teamwork - b.m.teamwork : 0));

/** The Swap Move `alpha` uses when it swaps in for `partner`: the trainer's pick, or the pair's random default. */
export function swapMoveOf(alpha: CreatureInst, partner: CreatureInst): SwapMove {
  const picked = SWAP_MOVE_BY_ID[alpha.swapMoves?.[partner.uid] ?? ''];
  return picked && !swapLock(alpha, partner, picked) ? picked : defaultSwapMove(alpha, partner);
}

/** What a Swap Move is worth to a pair against a typical foe of the Alpha's level, in damage-like points. */
export function swapWorth(alpha: CreatureInst, partner: CreatureInst, m: SwapMove): number {
  const v = swapVals(alpha, partner);
  const guard = typicalGuard(alpha.level);
  const hitWorth = (h: SwapHit) => {
    const land = h.acc ? Math.max(0, Math.min(1, (h.acc - 3 + 1) / h.acc)) : 1;
    const dmg = Math.max(1, (h.die + 1) / 2 + h.parts(v).reduce((a, p) => a + p.value, 0) - guard);
    const st = h.status ? swapStatus(m) : undefined;
    return land * (dmg + (st ? (Math.min(h.die, h.statusOn ?? SWAP_STATUS_ON) / h.die) * STATUS_WORTH[st] : 0));
  };
  const effect = (e: SwapEffect): number => {
    switch (e.t) {
      case 'mod': return Math.abs(e.n(v)) * (e.stat === 'speed' ? 0.5 : 0.9);
      case 'heal': return e.n(v) * 0.6;
      case 'refill': return 1;
      case 'ease': return 0.5;
      case 'status': { const st = swapStatus(m); return st ? STATUS_WORTH[st] : 0; }
      // a surer next hit, and more from it
      case 'trap': return 1.5 + (e.extra ?? 0) * 1.2;
      case 'warn': return 1.5 + e.extra * 0.6;
      case 'fatigue': return e.n * 1.1;
      case 'advise': { const k = stats(alpha).power >= stats(alpha).focus ? 'power' : 'focus'; return e.n(v, k) * 0.85 + e.zero * 0.6; }
    }
  };
  return (m.hit ? hitWorth(m.hit) : 0) + (m.second ? hitWorth(m.second) : 0) + [...(m.before ?? []), ...(m.after ?? [])].reduce((a, e) => a + effect(e), 0) + (m.speed ?? 0) * 0.15;
}
/** The best Swap Move this pair can use. */
export const bestSwapMove = (alpha: CreatureInst, partner: CreatureInst): SwapMove =>
  swapMovesFor(alpha, partner).map((m) => ({ m, w: swapWorth(alpha, partner, m) })).sort((a, b) => b.w - a.w)[0].m;
/** Set the best Swap Move for every pair of a team, both ways (Rivals' and Champions' teams). */
export function assignSwapMoves(team: CreatureInst[]) {
  for (const a of team) for (const p of team) if (a !== p) setSwapMove(a, p, bestSwapMove(a, p).id);
}

/** Set the Swap Move `alpha` uses when it swaps in for `partner`. False if it isn't allowed. */
export function setSwapMove(alpha: CreatureInst, partner: CreatureInst, id: string): boolean {
  const m = SWAP_MOVE_BY_ID[id];
  if (!m || alpha.uid === partner.uid || swapLock(alpha, partner, m)) return false;
  (alpha.swapMoves ??= {})[partner.uid] = id;
  return true;
}

/** A creature's own type for a Swap Move: its main one, or for a balanced creature, whichever is better against the foe. */
export function ownType(c: CreatureInst, foe?: CreatureInst): ElementType {
  const ts = leadTypes(speciesOf(c));
  if (ts.length < 2 || !foe) return ts[0];
  const vs = (t: ElementType) => effectiveness(t, speciesOf(foe).types);
  return vs(ts[1]) > vs(ts[0]) ? ts[1] : ts[0];
}
/** Which types a Swap Move's words should name: `foe` is who it would hit, if that's known. */
export function swapTypes(alpha: CreatureInst, partner: CreatureInst, foe?: CreatureInst): Pick<SwapVals, 'aType' | 'pType' | 'aEither' | 'pEither'> {
  const either = (c: CreatureInst) => (!foe && speciesOf(c).balanced ? [...speciesOf(c).types] : undefined);
  const a = either(alpha), p = either(partner);
  return { aType: ownType(alpha, foe), pType: ownType(partner, foe), ...(a ? { aEither: a } : {}), ...(p ? { pEither: p } : {}) };
}
/** The numbers a Swap Move works from, for describing it (pass the foe's stats once it's known). */
export function swapVals(alpha: CreatureInst, partner: CreatureInst, opts: { a?: Stats; f?: Stats; /** who it would hit */ foe?: CreatureInst; /** the partner's wounds this battle */ hurt?: number } = {}): SwapVals {
  return {
    a: opts.a ?? stats(alpha), p: stats(partner), f: opts.f, bonus: teamworkBonus(alpha, partner), ...(opts.hurt !== undefined ? { hurt: opts.hurt } : {}),
    A: nameOf(alpha), P: nameOf(partner), ...swapTypes(alpha, partner, opts.foe),
  };
}
