// Energy Imprints: won in rematches with Arbiters. An Imprint of the Arbiter's type replaces one energy a
// creature generates with one of that type, which opens that type's moves to it (and, with Prisma, plenty
// more). Its own types, weaknesses and Swap Moves don't change.
import type { ElementType } from '../data/schema';
import { TYPES, TYPE_LABEL } from '../data/types';
import type { GameState } from './state';
import { log } from './state';
import { autoPlaybook, energy, fits, learnable, nameOf, speciesOf, type CreatureInst } from './creature';

/** The most of a creature's energy that can be imprinted. */
export const IMPRINT_MAX = 3;

/** Its imprints after giving up one `from` for one `to`. Changing an imprinted energy again doesn't add to the count. */
function after(c: CreatureInst, from: ElementType, to: ElementType) {
  const list = (c.imprints ?? []).map((x) => ({ ...x }));
  const again = list.find((x) => x.to === from), back = list.find((x) => x.from === to);
  if (again) again.to = to;
  else if (back) back.from = from;
  else list.push({ from, to });
  return list.filter((x) => x.from !== x.to);
}

/** Why this creature can't give up one `from` energy for one `to`, or null. */
export function imprintBlock(c: CreatureInst, from: ElementType, to: ElementType): string | null {
  const have = energy(c)[from] ?? 0;
  if (from === to) return 'That’s the same energy.';
  if (have < 1) return `It doesn’t generate ${TYPE_LABEL[from]} energy.`;
  if (have === 1 && speciesOf(c).types.includes(from)) return `It keeps at least 1 ${TYPE_LABEL[from]}: it’s a ${TYPE_LABEL[from]} creature.`;
  if (after(c, from, to).length > IMPRINT_MAX) return `It already has ${IMPRINT_MAX} imprinted energy. Give up one of those instead.`;
  return null;
}
/** The energy this creature could give up for one `to`. */
export const imprintChoices = (c: CreatureInst, to: ElementType) => TYPES.filter((t) => !imprintBlock(c, t, to));

/** The creature as it would be, with the moves that no longer fit taken out of its playbook. */
export function imprinted(c: CreatureInst, from: ElementType, to: ElementType): CreatureInst {
  const out: CreatureInst = { ...c, playbook: [...c.playbook], imprints: after(c, from, to) };
  const learn = learnable(out), e = energy(out);
  out.playbook = c.playbook.reduce<string[]>((set, id) => (learn.includes(id) && fits(e, [...set, id]) ? [...set, id] : set), []);
  if (!out.playbook.length) out.playbook = autoPlaybook(out);
  return out;
}
/** Imprint a creature's energy (no Imprint is spent). False if it can't be. */
export function applyImprint(c: CreatureInst, from: ElementType, to: ElementType): boolean {
  if (imprintBlock(c, from, to)) return false;
  Object.assign(c, imprinted(c, from, to));
  if (!c.imprints!.length) delete c.imprints;
  return true;
}
/** Use one of the trainer's Imprints on a creature with them. */
export function useImprint(s: GameState, uid: string, from: ElementType, to: ElementType): boolean {
  const c = [...s.roster, ...s.reserve].find((x) => x.uid === uid);
  const held = s.imprints ?? [];
  if (!c || !held.includes(to) || !applyImprint(c, from, to)) return false;
  s.imprints = held.filter((_, i) => i !== held.indexOf(to));
  if (!s.imprints.length) delete s.imprints;
  log(s, `Imprinted ${TYPE_LABEL[to]} energy on ${nameOf(c)} (1 ${TYPE_LABEL[from]} → 1 ${TYPE_LABEL[to]}).`);
  return true;
}
/** Teach a creature up to `n` of another type (Rivals and Champions): it gives up whichever energy it has most of. */
export function teach(c: CreatureInst, to: ElementType, n: number) {
  for (let i = 0; i < n; i++) {
    const e = energy(c);
    const from = imprintChoices(c, to).sort((a, b) => (e[b] ?? 0) - (e[a] ?? 0))[0];
    if (!from || !applyImprint(c, from, to)) return;
  }
}
