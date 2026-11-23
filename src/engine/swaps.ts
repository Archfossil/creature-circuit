// Which Swap Moves a pair can use, and the one the trainer set for each direction (data/swapMoves.ts).
// A creature keeps its choices in `swapMoves`, keyed by the partner's uid: the move it uses when it
// swaps in for that partner. Unset (or no longer allowed) means a neutral move picked at random for
// that pair (seeded by the two uids, so it stays the same until the trainer sets one).
import type { ElementType, Stats } from '../data/schema';
import { SWAP_MOVES, SWAP_MOVE_BY_ID, type SwapMove, type SwapVals } from '../data/swapMoves';
import { TYPE_LABEL } from '../data/types';
import { nameOf, speciesOf, stats, type CreatureInst } from './creature';
import { teamworkBonus, teamworkOf, teamworkShown } from './teamwork';

/** The neutral Swap Moves: open to every pair, so always safe as a default. */
const NEUTRAL = SWAP_MOVES.filter((m) => !m.type);

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

/** Why `alpha` can't use `m` when swapping in for `partner`, or null if it can. */
export function swapLock(alpha: CreatureInst, partner: CreatureInst, m: SwapMove): string | null {
  if (m.type && !speciesOf(partner).types.includes(m.type)) return `Needs a ${TYPE_LABEL[m.type]} partner`; // the partner lends its types; the Alpha's own don't count
  const have = teamworkShown(teamworkOf(alpha, partner));
  if (have < m.teamwork) return `Needs Teamwork ${m.teamwork} (has ${have})`;
  return null;
}

/** The Swap Moves `alpha` can set for swapping in for `partner`. */
export const swapMovesFor = (alpha: CreatureInst, partner: CreatureInst) => SWAP_MOVES.filter((m) => !swapLock(alpha, partner, m));

/** The Swap Move `alpha` uses when it swaps in for `partner`: the trainer's pick, or the pair's random default. */
export function swapMoveOf(alpha: CreatureInst, partner: CreatureInst): SwapMove {
  const picked = SWAP_MOVE_BY_ID[alpha.swapMoves?.[partner.uid] ?? ''];
  return picked && !swapLock(alpha, partner, picked) ? picked : defaultSwapMove(alpha, partner);
}

/** Set the Swap Move `alpha` uses when it swaps in for `partner`. False if it isn't allowed. */
export function setSwapMove(alpha: CreatureInst, partner: CreatureInst, id: string): boolean {
  const m = SWAP_MOVE_BY_ID[id];
  if (!m || alpha.uid === partner.uid || swapLock(alpha, partner, m)) return false;
  (alpha.swapMoves ??= {})[partner.uid] = id;
  return true;
}

/** The numbers a Swap Move works from, for describing it (pass the foe's stats once it's known). */
export function swapVals(alpha: CreatureInst, partner: CreatureInst, opts: { a?: Stats; f?: Stats } = {}): SwapVals {
  return {
    a: opts.a ?? stats(alpha), p: stats(partner), f: opts.f, bonus: teamworkBonus(alpha, partner),
    A: nameOf(alpha), P: nameOf(partner), aType: speciesOf(alpha).types[0] as ElementType, pType: speciesOf(partner).types[0] as ElementType,
  };
}
