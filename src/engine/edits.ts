// Online: trainers who aren't taking their turn can still tend their creatures (progression nodes,
// stat training, playbooks). Their browser sends each change as a small edit; the browser running
// the current turn checks it with the same rules and applies it to the shared match.
import type { StatKey } from '../data/schema';
import type { GameState } from './state';
import { energy, fits, learnable, trainStat, unlockNode, TRAINABLE } from './creature';

export type CreatureEdit =
  | { uid: string; op: 'unlock'; node: string }
  | { uid: string; op: 'train'; stat: StatKey }
  | { uid: string; op: 'playbook'; moves: string[] };

/** Is this a legal playbook for the creature: up to 4 different learnable moves that fit its energy. */
export function playbookOk(moves: unknown, learn: string[], fitsEnergy: (m: string[]) => boolean): moves is string[] {
  return Array.isArray(moves) && moves.length >= 1 && moves.length <= 4 && new Set(moves).size === moves.length
    && moves.every((id) => typeof id === 'string' && learn.includes(id)) && fitsEnergy(moves as string[]);
}

/** Apply a creature edit to one trainer's state, with the usual rules. Returns false if it doesn't apply. */
export function applyEdit(s: GameState, e: CreatureEdit): boolean {
  const c = [...s.roster, ...s.reserve].find((x) => x.uid === e?.uid);
  if (!c) return false;
  switch (e.op) {
    case 'unlock': return unlockNode(c, e.node);
    case 'train': return TRAINABLE.includes(e.stat) && trainStat(c, e.stat);
    case 'playbook':
      if (!playbookOk(e.moves, learnable(c), (m) => fits(energy(c), m))) return false;
      c.playbook = [...e.moves];
      return true;
    default: return false;
  }
}
