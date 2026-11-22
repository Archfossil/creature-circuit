// Which Swap Moves a pair can use, and the one the trainer set for each direction (data/swapMoves.ts).
// A creature keeps its choices in `swapMoves`, keyed by the partner's uid: the move it uses when it
// swaps in for that partner. Unset (or no longer allowed) means its species' favourite.
import type { ElementType, Stats } from '../data/schema';
import { SWAP_MOVES, SWAP_MOVE_BY_ID, type SwapMove, type SwapVals } from '../data/swapMoves';
import { TYPE_LABEL } from '../data/types';
import { nameOf, speciesOf, stats, type CreatureInst } from './creature';
import { teamworkBonus, teamworkOf, teamworkShown } from './teamwork';

/** The species' favourite Swap Move: what it uses until the trainer sets another. Always allowed. */
export const defaultSwapMove = (alpha: CreatureInst): SwapMove => SWAP_MOVE_BY_ID[speciesOf(alpha).affinity] ?? SWAP_MOVES[0];

/** Why `alpha` can't use `m` when swapping in for `partner`, or null if it can. */
export function swapLock(alpha: CreatureInst, partner: CreatureInst, m: SwapMove): string | null {
  if (m.type && !speciesOf(alpha).types.includes(m.type) && !speciesOf(partner).types.includes(m.type)) return `Needs a ${TYPE_LABEL[m.type]} creature in the pair`;
  const have = teamworkShown(teamworkOf(alpha, partner));
  if (have < m.teamwork) return `Needs Teamwork ${m.teamwork} (has ${have})`;
  return null;
}

/** The Swap Moves `alpha` can set for swapping in for `partner`. */
export const swapMovesFor = (alpha: CreatureInst, partner: CreatureInst) => SWAP_MOVES.filter((m) => !swapLock(alpha, partner, m));

/** The Swap Move `alpha` uses when it swaps in for `partner`: the trainer's pick, or its favourite. */
export function swapMoveOf(alpha: CreatureInst, partner: CreatureInst): SwapMove {
  const picked = SWAP_MOVE_BY_ID[alpha.swapMoves?.[partner.uid] ?? ''];
  return picked && !swapLock(alpha, partner, picked) ? picked : defaultSwapMove(alpha);
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
