import type { EnergyMap, ElementType, Movement, Species, StatKey, Stats, StatusId, EnergyKey } from '../data/schema';
import { SPECIES_BY_ID } from '../data/species';
import { MOVES, MOVE_BY_ID } from '../data/moves';
import { NATURES, NATURE_BY_ID } from '../data/content';
import { TYPES } from '../data/types';
import { pick, uid } from './dice';

export interface CreatureInst {
  uid: string;
  species: string;
  nickname?: string;
  level: number;
  xp: number;
  points: number;           // unspent progression nodes
  nature: string;
  morale: number;           // 0-10
  loyalty: number;          // currency for nature perks
  perks: number;            // nature perks unlocked (0-3, in order)
  bonus: Partial<Stats> & { health?: number; vitality?: number };
  extraEnergy: EnergyMap;
  unlocked: string[];       // progression node ids (current stage chart)
  signature?: string;       // learned signature move id
  movement?: Movement;      // unlocked movement ability
  capstone?: boolean;
  health: number;
  vitality: number;
  stamina: number;
  fatigue: number;
  ko: boolean;
  playbook: string[];
  affinity: Record<string, number>;
  wins: number;
  losses: number;
}

export const STAT_KEYS: StatKey[] = ['vigor', 'power', 'armor', 'focus', 'ward', 'speed', 'evasion', 'stamina'];
export const STAT_LABEL: Record<StatKey, string> = {
  vigor: 'Vigor', power: 'Power', armor: 'Armor', focus: 'Focus', ward: 'Ward', speed: 'Speed', evasion: 'Evasion', stamina: 'Stamina',
};

export const speciesOf = (c: CreatureInst): Species => SPECIES_BY_ID[c.species];
export const nameOf = (c: CreatureInst) => c.nickname || speciesOf(c).name;

export function stats(c: CreatureInst, extra?: Partial<Stats>): Stats {
  const sp = speciesOf(c);
  const nat = NATURE_BY_ID[c.nature];
  const s: Stats = { ...sp.base };
  if (nat) { s[nat.up] += 1; s[nat.down] = Math.max(0, s[nat.down] - 1); }
  for (const k of STAT_KEYS) s[k] += c.bonus[k] ?? 0;
  if (nat) for (let i = 0; i < c.perks; i++) for (const [k, v] of Object.entries(nat.perks[i].bonus)) s[k as StatKey] += v!;
  if (extra) for (const [k, v] of Object.entries(extra)) s[k as StatKey] += v!;
  s.evasion = Math.max(1, Math.min(s.evasion, 6));
  s.vigor = Math.max(1, s.vigor);
  return s;
}

export const maxHealth = (c: CreatureInst, extraVigor = 0) => stats(c).vigor + extraVigor + (c.bonus.health ?? 0);
export const maxVitality = (c: CreatureInst, extraVigor = 0) => stats(c).vigor + extraVigor + (c.bonus.vitality ?? 0);
export const maxStamina = (c: CreatureInst) => stats(c).stamina;

export function energy(c: CreatureInst): EnergyMap {
  const e: EnergyMap = { ...speciesOf(c).energy };
  for (const [k, v] of Object.entries(c.extraEnergy)) e[k as EnergyKey] = (e[k as EnergyKey] ?? 0) + v!;
  return e;
}
export const energyTotal = (e: EnergyMap) => Object.values(e).reduce((s, v) => s + (v ?? 0), 0);

/** Can this set of moves be slotted given the creature's energy? Prisma fills any typed gap; neutral uses anything. */
export function fits(e: EnergyMap, moveIds: string[]): boolean {
  const req: Partial<Record<ElementType, number>> = {};
  let neutral = 0;
  for (const id of moveIds) {
    const m = MOVE_BY_ID[id];
    for (const [k, v] of Object.entries(m.cost)) {
      if (k === 'neutral') neutral += v!;
      else req[k as ElementType] = (req[k as ElementType] ?? 0) + v!;
    }
  }
  let deficit = 0, typed = 0;
  for (const t of TYPES) {
    const r = req[t] ?? 0;
    typed += r;
    deficit += Math.max(0, r - (e[t] ?? 0));
  }
  return deficit <= (e.prisma ?? 0) && typed + neutral <= energyTotal(e);
}

/** Moves this creature may learn from the Master Move List. */
export function learnable(c: CreatureInst): string[] {
  const e = energy(c);
  const types = new Set(Object.keys(e).filter((k) => k !== 'prisma'));
  return MOVES.filter((m) => {
    if (m.id.startsWith('sig-')) return m.id === c.signature;
    const typedKeys = Object.keys(m.cost).filter((k) => k !== 'neutral');
    if (typedKeys.length === 0) return true;
    return typedKeys.every((k) => types.has(k)) && fits(e, [m.id]);
  }).map((m) => m.id);
}

/** Pick a sensible default playbook: depth-first search over affordable sets for a strong, varied mix. */
export function autoPlaybook(c: CreatureInst): string[] {
  const e = energy(c);
  const prim = speciesOf(c).types[0];
  const opts = learnable(c);
  const val = (id: string) => {
    const m = MOVE_BY_ID[id];
    const typed = Object.keys(m.cost).some((k) => k !== 'neutral');
    return (m.dmgDie + 1) / 2 + m.dmgFlat + (typed ? 1 : 0) + (m.kind === 'support' ? 1 : 0) + (id.startsWith('sig-') ? 2 : 0) + Math.max(0, m.speed) * 0.2;
  };
  let best: string[] = [];
  let bestScore = -1;
  const score = (set: string[]) => {
    const own = set.some((id) => MOVE_BY_ID[id].type === prim && MOVE_BY_ID[id].kind === 'elemental');
    const phys = set.some((id) => MOVE_BY_ID[id].kind === 'physical');
    const sup = set.filter((id) => MOVE_BY_ID[id].kind === 'support').length;
    return set.reduce((a, id) => a + val(id), 0) + set.length * 2 + (own ? 4 : 0) + (phys ? 1.5 : 0) - (sup > 1 ? 5 : 0) + Math.random() * 0.4;
  };
  const dfs = (start: number, set: string[]) => {
    if (set.length) { const sc = score(set); if (sc > bestScore) { bestScore = sc; best = [...set]; } }
    if (set.length === 4) return;
    for (let i = start; i < opts.length; i++) {
      set.push(opts[i]);
      if (fits(e, set)) dfs(i + 1, set); // supersets of an unaffordable set are never affordable
      set.pop();
    }
  };
  dfs(0, []);
  return best;
}

// ── Progression tree ────────────────────────────────────────────
export interface ProgNode {
  id: string; row: number; col: number; label: string; text: string; icon: string;
  apply: (c: CreatureInst) => void;
  kind: 'stat' | 'energy' | 'signature' | 'movement' | 'evolve' | 'capstone' | 'prisma';
}

export function progressionTree(c: CreatureInst): ProgNode[] {
  const sp = speciesOf(c);
  const prim = sp.types[0];
  const sec = sp.types[1] ?? prim;
  const statNode = (id: string, row: number, col: number, k: StatKey, n = 1): ProgNode => ({
    id, row, col, label: `+${n} ${k[0].toUpperCase() + k.slice(1)}`, text: `Permanently +${n} ${k}.`, icon: '▲', kind: 'stat',
    apply: (cc) => { cc.bonus[k] = (cc.bonus[k] ?? 0) + n; },
  });
  const bias = (Object.entries(sp.base) as [StatKey, number][]).filter(([k]) => k !== 'evasion').sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const nodes: ProgNode[] = [
    statNode('a', 0, 1, bias[0] === 'vigor' ? 'power' : bias[0]),
    { id: 'b', row: 1, col: 0, label: `+1 ${cap(prim)} Energy`, text: 'Generate one more energy for your playbook.', icon: '◆', kind: 'energy', apply: (cc) => addEnergy(cc, prim, 1) },
    { id: 'c', row: 1, col: 2, label: '+1 Health', text: 'Health pool +1 per Vitality.', icon: '♥', kind: 'stat', apply: (cc) => { cc.bonus.health = (cc.bonus.health ?? 0) + 1; } },
    sp.signature
      ? { id: 'd', row: 2, col: 0, label: 'Signature Move', text: `Learn ${MOVE_BY_ID[sp.signature].name}.`, icon: '★', kind: 'signature', apply: (cc) => { cc.signature = sp.signature; } }
      : statNode('d', 2, 0, 'focus'),
    statNode('e', 2, 2, 'speed'),
    sp.movement
      ? { id: 'f', row: 3, col: 0, label: `Learn ${cap(sp.movement)}`, text: `Unlocks the ${cap(sp.movement)} overworld ability.`, icon: '➶', kind: 'movement', apply: (cc) => { cc.movement = sp.movement; } }
      : { id: 'f', row: 3, col: 0, label: `+1 ${cap(sec)} Energy`, text: 'Generate one more energy.', icon: '◆', kind: 'energy', apply: (cc) => addEnergy(cc, sec, 1) },
    { id: 'g', row: 3, col: 2, label: '+1 Vitality', text: 'One more Vitality point.', icon: '✚', kind: 'stat', apply: (cc) => { cc.bonus.vitality = (cc.bonus.vitality ?? 0) + 1; } },
  ];
  if (sp.evolvesTo) {
    nodes.push({ id: 'evo', row: 4, col: 1, label: `Evolve → ${SPECIES_BY_ID[sp.evolvesTo].name}`, text: 'Evolve into the next stage. A new chart unlocks.', icon: '⇪', kind: 'evolve', apply: (cc) => evolve(cc) });
  } else {
    nodes.push({ id: 'h', row: 4, col: 0, label: '+1 Prisma Energy', text: 'Prisma counts as any type.', icon: '✦', kind: 'prisma', apply: (cc) => addEnergy(cc, 'prisma', 1) });
    nodes.push({ id: 'cap', row: 4, col: 2, label: 'Capstone: Bond', text: 'Attacks deal +1 damage per 5 Loyalty.', icon: '❖', kind: 'capstone', apply: (cc) => { cc.capstone = true; } });
  }
  return nodes;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
function addEnergy(c: CreatureInst, k: EnergyKey, n: number) { c.extraEnergy[k] = (c.extraEnergy[k] ?? 0) + n; }

export function availableNodes(c: CreatureInst): ProgNode[] {
  const tree = progressionTree(c);
  return tree.filter((n) => {
    if (c.unlocked.includes(n.id)) return false;
    if (n.row === 0) return true;
    return tree.some((p) => p.row === n.row - 1 && c.unlocked.includes(p.id));
  });
}

export function unlockNode(c: CreatureInst, nodeId: string): boolean {
  if (c.points <= 0) return false;
  const n = availableNodes(c).find((x) => x.id === nodeId);
  if (!n) return false;
  c.points--;
  c.unlocked.push(n.id);
  const hpBefore = maxHealth(c), vitBefore = maxVitality(c);
  n.apply(c);
  // grow current pools along with the max
  c.health += Math.max(0, maxHealth(c) - hpBefore);
  c.vitality += Math.max(0, maxVitality(c) - vitBefore);
  if (n.kind === 'signature' || n.kind === 'energy' || n.kind === 'prisma') {
    // auto-slot the signature if it fits
    if (n.kind === 'signature' && c.signature && c.playbook.length < 4 && fits(energy(c), [...c.playbook, c.signature])) c.playbook.push(c.signature);
  }
  return true;
}

export function evolve(c: CreatureInst) {
  const sp = speciesOf(c);
  if (!sp.evolvesTo) return;
  const hpLost = maxHealth(c) - c.health, vitLost = maxVitality(c) - c.vitality;
  c.species = sp.evolvesTo;
  c.unlocked = [];
  c.health = Math.max(1, maxHealth(c) - hpLost);
  c.vitality = Math.max(0, maxVitality(c) - vitLost);
  c.stamina = maxStamina(c);
  if (!fits(energy(c), c.playbook)) c.playbook = autoPlaybook(c);
}

export function gainXp(c: CreatureInst, xp: number): number {
  if (c.morale >= 8) xp += 1;
  c.xp += xp;
  let levels = 0;
  while (c.xp >= 10) { c.xp -= 10; c.level++; c.points++; levels++; }
  return levels;
}

export function xpForWin(winnerLevel: number, loserLevel: number): number {
  return Math.max(2, Math.min(10, 5 + 2 * (loserLevel - winnerLevel)));
}

export function createCreature(speciesId: string, level = 1, opts: { nature?: string; auto?: boolean } = {}): CreatureInst {
  const c: CreatureInst = {
    uid: uid(), species: speciesId, level: 1, xp: 0, points: 0,
    nature: opts.nature ?? pick(NATURES).id, morale: 5, loyalty: 0, perks: 0,
    bonus: {}, extraEnergy: {}, unlocked: [],
    health: 0, vitality: 0, stamina: 0, fatigue: 0, ko: false, playbook: [], affinity: {}, wins: 0, losses: 0,
  };
  if (level > 1) {
    c.level = level;
    c.points = level - 1;
    if (opts.auto !== false) autoSpend(c, false);
  }
  fullRestore(c);
  c.playbook = autoPlaybook(c);
  return c;
}

/** NPC / wild growth: spend points on random available nodes. Wild creatures don't evolve. */
export function autoSpend(c: CreatureInst, allowEvolve: boolean) {
  let guard = 50;
  while (c.points > 0 && guard-- > 0) {
    const av = availableNodes(c).filter((n) => allowEvolve || n.kind !== 'evolve');
    if (av.length === 0) {
      // chart exhausted: generic growth
      c.points--;
      const k = pick<StatKey>(['vigor', 'power', 'focus', 'armor', 'ward', 'speed']);
      c.bonus[k] = (c.bonus[k] ?? 0) + 1;
      continue;
    }
    unlockNode(c, pick(av).id);
  }
}

export function fullRestore(c: CreatureInst) {
  c.ko = false;
  c.health = maxHealth(c);
  c.vitality = maxVitality(c);
  c.stamina = maxStamina(c);
  c.fatigue = 0;
}

export function healthFraction(c: CreatureInst): number {
  const h = maxHealth(c), v = maxVitality(c);
  const total = h * (v + 1);
  const cur = c.ko ? 0 : c.vitality * h + c.health;
  return Math.max(0, Math.min(1, cur / total));
}

export type BattleStatus = { id: StatusId; turns: number };
