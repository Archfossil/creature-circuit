// Teamwork: how well two of your creatures work together. Each creature keeps a Teamwork score with
// every partner (CreatureInst.teamwork, keyed by the partner's uid). It powers the swap bonus of
// Affinity Powers: when a creature swaps in as the Alpha, its power adds its Teamwork bonus with the
// partner it replaced (see battle.ts → doSwap).
//
// - Travelling together: every pair on the active team gains TEAMWORK_PER_TURN at the end of each turn.
// - Swapping in battle: a pair gains TEAMWORK_PER_SWAP the first time one swaps in for the other in a
//   battle. Further swaps between them in the same battle add nothing, so spamming swaps doesn't help.
// - Cap: a creature's Teamwork with any partner is at most half its level, so it grows as it levels.
import { nameOf, type CreatureInst } from './creature';

/** Teamwork each pair on the active team earns for every turn they travel together. */
export const TEAMWORK_PER_TURN = 0.2;
/** Teamwork a pair earns the first time one swaps in for the other in a battle (once per battle). */
export const TEAMWORK_PER_SWAP = 1;
/** Teamwork needed per +1 swap bonus. */
export const TEAMWORK_PER_BONUS = 2;

/** The most Teamwork a creature can have with any one partner: half its level. */
export const teamworkCap = (c: CreatureInst) => c.level / 2;
/** A creature's Teamwork with a partner (0 if they've never teamed up). */
export const teamworkOf = (c: CreatureInst, partner: CreatureInst) => c.teamwork?.[partner.uid] ?? 0;
/** The bonus an Alpha's Affinity Power gets from its Teamwork with the partner it swaps in for. */
export const teamworkBonus = (alpha: CreatureInst, partner: CreatureInst) => Math.floor(teamworkOf(alpha, partner) / TEAMWORK_PER_BONUS);
/** Teamwork as shown to players: whole points (the fraction is progress towards the next one). */
export const teamworkShown = (v: number) => Math.floor(v + 1e-9);

/** One pair's Teamwork after it grew: both creatures' new values (they can differ, as each has its own cap). */
export interface TeamworkRise { uids: [string, string]; names: [string, string]; values: [number, number]; /** A whole point was reached. */ rose: boolean }

/** Grow `c`'s Teamwork with `partner` by `amount`, up to its cap (never lowering a value already above it). */
function grow(c: CreatureInst, partner: CreatureInst, amount: number): number {
  const before = teamworkOf(c, partner);
  const after = Math.max(before, Math.min(teamworkCap(c), Math.round((before + amount) * 10) / 10));
  (c.teamwork ??= {})[partner.uid] = after;
  return after - before;
}

/** Both creatures of a pair gain `amount` Teamwork with each other. Returns null if neither could grow (both capped). */
export function addTeamwork(a: CreatureInst, b: CreatureInst, amount: number): TeamworkRise | null {
  const was = [teamworkShown(teamworkOf(a, b)), teamworkShown(teamworkOf(b, a))];
  const ga = grow(a, b, amount), gb = grow(b, a, amount);
  if (ga <= 0 && gb <= 0) return null;
  const values: [number, number] = [teamworkOf(a, b), teamworkOf(b, a)];
  return { uids: [a.uid, b.uid], names: [nameOf(a), nameOf(b)], values, rose: teamworkShown(values[0]) > was[0] || teamworkShown(values[1]) > was[1] };
}

/** End of turn: every pair travelling together on the active team gains Teamwork. Returns the pairs that reached a new whole point. */
export function travelTogether(team: CreatureInst[]): TeamworkRise[] {
  const out: TeamworkRise[] = [];
  for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) {
    const r = addTeamwork(team[i], team[j], TEAMWORK_PER_TURN);
    if (r?.rose) out.push(r);
  }
  return out;
}

/** "Puddlit & Zapup: Teamwork 2 (swap bonus +1)", or each side's value when their caps make them differ. */
export function riseText(r: TeamworkRise): string {
  const [a, b] = r.values.map(teamworkShown);
  const bonus = (v: number) => Math.floor(v / TEAMWORK_PER_BONUS);
  if (a === b) return `${r.names[0]} & ${r.names[1]}: Teamwork ${a}${bonus(a) ? ` (swap bonus +${bonus(a)})` : ''}`;
  return `${r.names[0]} & ${r.names[1]}: Teamwork ${a} / ${b}`;
}
