import type { EnergyMap, ElementType, Species, StatKey, Stats, StatusId, EnergyKey, Move } from '../data/schema';
import { SPECIES_BY_ID } from '../data/species';
import { MOVES, MOVE_BY_ID, avgRoll, diceText, critFaces } from '../data/moves';
import { NATURES, NATURE_BY_ID } from '../data/content';
import { TYPES, effectiveness } from '../data/types';
import { pick, uid } from './dice';

export interface CreatureInst {
  uid: string;
  species: string;
  nickname?: string;
  level: number;
  xp: number;
  points: number;           // unspent progression nodes
  nature: string;
  morale: number;           // 0-10: how happy it is with you (see MORALE_HIGH / MORALE_LOW)
  loyalty: number;          // 0-10: trust earned at high morale; reaching a perk's threshold unlocks it
  perks: number;            // nature perks unlocked (0-3, in order). Never re-locked.
  /** Set once the trainer has been warned about low morale; from then on, each turn ends with a morale check. */
  moraleWarned?: boolean;
  /** Morale at the end of the previous turn, to tell whether it was raised since. */
  moraleMark?: number;
  /** Special bond: the trainer's starter. +1 Vigor and no attribute under 1 (before its Nature); it never leaves over low Morale, and can't be released or traded away. */
  bond?: boolean;
  bonus: Partial<Stats>;
  extraEnergy: EnergyMap;
  unlocked: string[];       // progression node ids (current stage chart)
  signature?: string;       // learned signature move id
  capstone?: boolean;
  health: number;
  vitality: number;
  stamina: number;
  fatigue: number;
  ko: boolean;
  playbook: string[];
  /** Teamwork with each partner (by uid): grows travelling together and swapping in battle, up to half the lower Loyalty of the pair (see teamwork.ts). */
  teamwork: Record<string, number>;
  /** Swap Moves the trainer set (by partner uid): the one this creature uses when it swaps in for that partner (see swaps.ts). */
  swapMoves: Record<string, string>;
  /** Its own Ability (id in ABILITIES), if retrained away from its species' (Battle School, the Trail Tutor). */
  ability?: string;
  /** Its own Instinct (id in INSTINCTS), if retrained away from its species' (Battle School, the Drum Circle). */
  instinct?: string;
  wins: number;
  losses: number;
}

export const STAT_KEYS: StatKey[] = ['vigor', 'power', 'armor', 'focus', 'ward', 'speed', 'evasion', 'stamina'];
export const STAT_LABEL: Record<StatKey, string> = {
  vigor: 'Vigor', power: 'Power', armor: 'Armor', focus: 'Focus', ward: 'Ward', speed: 'Speed', evasion: 'Evasion', stamina: 'Stamina',
};

export const speciesOf = (c: CreatureInst): Species => SPECIES_BY_ID[c.species];
export const nameOf = (c: CreatureInst) => c.nickname || speciesOf(c).name;
/** A creature's overworld Ability: its own if it was retrained, otherwise its species'. */
export const abilityOf = (c: CreatureInst): string => c.ability ?? speciesOf(c).ability;
/** A creature's Instinct id: its own if it was retrained, otherwise its species'. */
export const instinctIdOf = (c: CreatureInst): string => c.instinct ?? speciesOf(c).instinct;

/** A starter's special bond: extra Vigor, and the lowest any of its attributes can be (both before its Nature). */
export const BOND_VIGOR = 1;
export const BOND_MIN_STAT = 1;

export function stats(c: CreatureInst, extra?: Partial<Stats>): Stats {
  const sp = speciesOf(c);
  const nat = NATURE_BY_ID[c.nature];
  const s: Stats = { ...sp.base };
  if (c.bond) {
    for (const k of STAT_KEYS) s[k] = Math.max(BOND_MIN_STAT, s[k]);
    s.vigor += BOND_VIGOR;
  }
  if (nat) { s[nat.up] += 1; s[nat.down] = Math.max(0, s[nat.down] - 1); }
  for (const k of STAT_KEYS) s[k] += c.bonus[k] ?? 0;
  if (nat) for (let i = 0; i < c.perks; i++) for (const [k, v] of Object.entries(nat.perks[i].bonus)) s[k as StatKey] += v!;
  if (extra) for (const [k, v] of Object.entries(extra)) s[k as StatKey] += v!;
  s.evasion = Math.max(1, Math.min(s.evasion, 6));
  s.vigor = Math.max(1, s.vigor);
  return s;
}

// ── Health ──────────────────────────────────────────────────────
// Health is one bar of 5 per point of Vigor, divided into hearts of 5. It's stored as the Health left in
// the current heart (`health`, up to HEART) and the full hearts behind it (`vitality`, up to Vigor − 1).
// Healing refills the current heart; a lost heart needs rest (a stable, camping, a Salve …).
/** Health in one heart (one point of Vigor). */
export const HEART = 5;
/** The most Health the current heart holds. */
export const maxHealth = (_c: CreatureInst) => HEART;
/** The most full hearts behind the current one. */
export const maxVitality = (c: CreatureInst) => stats(c).vigor - 1;
/** Hearts in the whole bar: one per Vigor. */
export const maxHearts = (c: CreatureInst) => stats(c).vigor;
/** The whole Health bar: 5 × Vigor. */
export const maxTotal = (c: CreatureInst) => HEART * stats(c).vigor;
/** Health left in the whole bar. */
export const totalHealth = (x: { health: number; vitality: number; ko: boolean }) => (x.ko ? 0 : x.vitality * HEART + x.health);
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

/**
 * Which generated energy a set of moves commits, mirroring `fits`: typed costs draw on their own
 * type first and Prisma covers any shortfall; Neutral costs then draw on whichever typed energy has
 * the most left, using Prisma last since it is the most flexible. Returns the amount committed per key.
 */
export function allocateEnergy(e: EnergyMap, moveIds: string[]): EnergyMap {
  const left: EnergyMap = { ...e };
  const used: EnergyMap = {};
  const take = (k: EnergyKey, n: number) => {
    const got = Math.min(n, left[k] ?? 0);
    if (got > 0) { left[k] = (left[k] ?? 0) - got; used[k] = (used[k] ?? 0) + got; }
    return n - got;
  };
  let neutral = 0;
  for (const id of moveIds) {
    for (const [k, v] of Object.entries(MOVE_BY_ID[id].cost)) {
      if (k === 'neutral') neutral += v!;
      else take('prisma', take(k as ElementType, v!));
    }
  }
  while (neutral > 0) {
    const best = TYPES.filter((t) => (left[t] ?? 0) > 0).sort((a, b) => (left[b] ?? 0) - (left[a] ?? 0))[0];
    if (!best) break;
    neutral = take(best, 1) + neutral - 1;
  }
  take('prisma', neutral);
  return used;
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
/**
 * Pick a playbook that fits the creature's energy. `varied` (wild and NPC creatures) shakes up the
 * choice a lot, so opponents of the same species don't all carry the same four moves.
 */
/** Varied (NPC) playbooks lean toward carrying one buff / debuff / heal, so opponents have something to set up with. */
const SUPPORT_PULL = 1;
export function autoPlaybook(c: CreatureInst, varied = false): string[] {
  const e = energy(c);
  const prim = speciesOf(c).types[0];
  const val = (id: string) => {
    const m = MOVE_BY_ID[id];
    const typed = Object.keys(m.cost).some((k) => k !== 'neutral');
    return avgRoll(m) + (typed ? 1 : 0) + (m.kind === 'support' ? 1 : 0) + (id.startsWith('sig-') ? 2 : 0) + Math.max(0, m.speed) * 0.2;
  };
  // The attack grid makes the learnable list long (dozens for dual types), so search a shortlist:
  // the strongest moves, the best value per energy, and the best of each kind and of the main type.
  const all = learnable(c);
  const costOf = (id: string) => Math.max(1, Object.values(MOVE_BY_ID[id].cost).reduce<number>((a, v) => a + (v ?? 0), 0));
  const byVal = [...all].sort((x, y) => val(y) - val(x));
  const byEff = [...all].sort((x, y) => val(y) / costOf(y) - val(x) / costOf(x));
  const bestWhere = (f: (m: Move) => boolean, n: number) => byVal.filter((id) => f(MOVE_BY_ID[id])).slice(0, n);
  const opts = [...new Set([
    ...bestWhere((m) => m.kind === 'elemental' && m.type === prim, 3),
    ...bestWhere((m) => m.kind === 'physical', 2),
    ...bestWhere((m) => m.kind === 'support', 2),
    ...byEff.slice(0, 6), ...byVal.slice(0, 6),
    ...(varied ? [...all].sort(() => Math.random() - 0.5).slice(0, 4) : []), // a few wildcards
  ])];
  // varied: every move gets its own random appeal for this pick
  const whim: Record<string, number> = varied ? Object.fromEntries(opts.map((id) => [id, Math.random() * 3])) : {};
  let best: string[] = [];
  let bestScore = -1;
  const score = (set: string[]) => {
    const own = set.some((id) => MOVE_BY_ID[id].type === prim && MOVE_BY_ID[id].kind === 'elemental');
    const phys = set.some((id) => MOVE_BY_ID[id].kind === 'physical');
    const sup = set.filter((id) => MOVE_BY_ID[id].kind === 'support').length;
    return set.reduce((a, id) => a + val(id) + (whim[id] ?? 0), 0) + set.length * 2 + (own ? 4 : 0) + (phys ? 1.5 : 0) - (sup > 1 ? 5 : 0) + (varied && sup === 1 ? SUPPORT_PULL : 0) + Math.random() * 0.4;
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
// A skill tree on a 3-column grid. Every node lists the nodes it connects to above it
// (`requires`), and ALL of them must be unlocked first. Evolve and the Capstone sit at
// the bottom, so reaching them means buying every node on the way down.
//
//              a                    a  +1 best stat
//            /   \                  b  +2 primary energy      c  +1 third stat, or Vigor
//           b     c                 d  Signature (or Focus)   e  +1 second stat (needs b AND c)
//                                   Vigor comes last (h) in a first stage that evolves. After that it's early (c),
//                                   with a second at h unless the species is `sturdy` (naturally high Vigor).
//                                   Otherwise c and h are a third stat. A `bulky` species has no Vigor node.
//          / \   / \                f  +1 Speed
//         d   e     f               g  +2 secondary energy
//         |   |     |               h  +1 Vigor, or third stat  i  +1 Stamina
//         g   h     i               Evolve needs h. Final stage instead: p (+2 Prisma, needs g)
//         |  / \   /                and Capstone (needs h AND i).
//         p  evo/cap
export interface ProgNode {
  id: string; row: number; col: number; label: string; text: string; icon: string;
  /** Nodes that connect into this one. All must be unlocked before it can be bought. */
  requires: string[];
  apply: (c: CreatureInst) => void;
  kind: 'stat' | 'energy' | 'signature' | 'evolve' | 'capstone' | 'prisma';
}

/** One-line summary of a move for chart nodes, e.g. "d8+1 Astral attack". */
export function sigSummary(m: Move): string {
  const dmg = diceText(m) ? `${diceText(m)} ` : '';
  const kind = m.kind === 'support' ? 'support move' : m.kind === 'physical' ? 'physical attack' : 'attack';
  return `${dmg}${m.type ? `${m.type[0].toUpperCase()}${m.type.slice(1)} ` : ''}${kind}`;
}

export function progressionTree(c: CreatureInst): ProgNode[] {
  const sp = speciesOf(c);
  const prim = sp.types[0];
  const sec = sp.types[1] ?? prim;
  type Place = Pick<ProgNode, 'id' | 'row' | 'col' | 'requires'>;
  const statNode = (p: Place, k: StatKey, n = 1): ProgNode => ({
    ...p, label: `+${n} ${STAT_LABEL[k]}`, text: `Permanently +${n} ${STAT_LABEL[k]}.`, icon: '▲', kind: 'stat',
    apply: (cc) => { cc.bonus[k] = (cc.bonus[k] ?? 0) + n; },
  });
  const energyNode = (p: Place, k: ElementType): ProgNode => ({
    ...p, label: `+${NODE_ENERGY} ${cap(k)} Energy`, text: `Generate ${NODE_ENERGY} more energy for your playbook.`, icon: '◆', kind: 'energy', apply: (cc) => addEnergy(cc, k, NODE_ENERGY),
  });
  const bias = (Object.entries(sp.base) as [StatKey, number][]).filter(([k]) => k !== 'evasion').sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const first = bias[0] === 'vigor' ? 'power' : bias[0];
  const second = bias.find((k) => k !== first && !['vigor', 'speed', 'stamina'].includes(k)) ?? 'armor';

  const [third, fourth] = [...bias.filter((k) => ['power', 'focus', 'armor', 'ward'].includes(k) && k !== first && k !== second)];
  const vigorNode = (p: Place): ProgNode => ({ ...statNode(p, 'vigor'), text: `Permanently +1 Vigor: one more heart (+${HEART} Health).`, icon: '♥' });
  const late = sp.stage === 1 && !!sp.evolvesTo; // a first stage earns its Vigor last; later stages (and those that never evolve) early
  const c_: Place = { id: 'c', row: 1, col: 2, requires: ['a'] }, h_: Place = { id: 'h', row: 3, col: 1, requires: ['e'] };

  const nodes: ProgNode[] = [
    statNode({ id: 'a', row: 0, col: 1, requires: [] }, first),
    energyNode({ id: 'b', row: 1, col: 0, requires: ['a'] }, prim),
    sp.bulky || late ? statNode(c_, third) : vigorNode(c_),
    sp.signature
      ? { id: 'd', row: 2, col: 0, requires: ['b'], label: 'Signature Move', text: `Learn ${MOVE_BY_ID[sp.signature].name} (${sigSummary(MOVE_BY_ID[sp.signature])}).`, icon: '★', kind: 'signature', apply: (cc) => { cc.signature = sp.signature; } }
      : statNode({ id: 'd', row: 2, col: 0, requires: ['b'] }, 'focus'),
    statNode({ id: 'e', row: 2, col: 1, requires: ['b', 'c'] }, second),
    statNode({ id: 'f', row: 2, col: 2, requires: ['c'] }, 'speed'),
    energyNode({ id: 'g', row: 3, col: 0, requires: ['d'] }, sec),
    sp.bulky ? statNode(h_, fourth) : late || !sp.sturdy ? vigorNode(h_) : statNode(h_, third),
    statNode({ id: 'i', row: 3, col: 2, requires: ['f'] }, 'stamina'),
  ];
  if (sp.evolvesTo) {
    nodes.push({ id: 'evo', row: 4, col: 1, requires: ['h'], label: `Evolve → ${SPECIES_BY_ID[sp.evolvesTo].name}`, text: 'Evolve into the next stage. A new chart begins, and unbought nodes here are left behind.', icon: '⇪', kind: 'evolve', apply: (cc) => evolve(cc) });
  } else {
    nodes.push({ id: 'p', row: 4, col: 0, requires: ['g'], label: `+${NODE_ENERGY} Prisma Energy`, text: 'Prisma counts as any type.', icon: '✦', kind: 'prisma', apply: (cc) => addEnergy(cc, 'prisma', NODE_ENERGY) });
    nodes.push({ id: 'cap', row: 4, col: 1, requires: ['h', 'i'], label: 'Capstone: Bond', text: 'Attacks deal +1 damage per 5 Loyalty.', icon: '❖', kind: 'capstone', apply: (cc) => { cc.capstone = true; } });
  }
  return nodes;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** Energy granted by an energy or Prisma node on the progression chart. */
export const NODE_ENERGY = 2;
function addEnergy(c: CreatureInst, k: EnergyKey, n: number) { c.extraEnergy[k] = (c.extraEnergy[k] ?? 0) + n; }

/** Nodes that can be bought now: not yet unlocked, with every connecting node above already unlocked. */
export function availableNodes(c: CreatureInst): ProgNode[] {
  return progressionTree(c).filter((n) => !c.unlocked.includes(n.id) && n.requires.every((r) => c.unlocked.includes(r)));
}

export function unlockNode(c: CreatureInst, nodeId: string): boolean {
  if (c.points <= 0) return false;
  const n = availableNodes(c).find((x) => x.id === nodeId);
  if (!n) return false;
  c.points--;
  c.unlocked.push(n.id);
  const vitBefore = maxVitality(c);
  n.apply(c);
  // a new heart comes full
  if (!c.ko) c.vitality += Math.max(0, maxVitality(c) - vitBefore);
  if (n.kind === 'signature' || n.kind === 'energy' || n.kind === 'prisma') {
    // auto-slot the signature if it fits
    if (n.kind === 'signature' && c.signature && c.playbook.length < 4 && fits(energy(c), [...c.playbook, c.signature])) c.playbook.push(c.signature);
  }
  return true;
}

/** Stats a level-up point can train once the chart is complete. */
export const TRAINABLE: StatKey[] = ['vigor', 'power', 'focus', 'armor', 'ward', 'speed'];

/** Every node on the chart is unlocked (only possible at the final stage), so spare points train stats instead. */
export const chartComplete = (c: CreatureInst) => availableNodes(c).length === 0;

/** Spend a level-up point on +1 to a stat. Only once the chart is complete; returns false otherwise. */
export function trainStat(c: CreatureInst, k: StatKey): boolean {
  if (c.points <= 0 || !chartComplete(c) || !TRAINABLE.includes(k)) return false;
  const vitBefore = maxVitality(c);
  c.points--;
  c.bonus[k] = (c.bonus[k] ?? 0) + 1;
  if (!c.ko) c.vitality += Math.max(0, maxVitality(c) - vitBefore);
  return true;
}

export function evolve(c: CreatureInst) {
  const sp = speciesOf(c);
  if (!sp.evolvesTo) return;
  const vitLost = maxVitality(c) - c.vitality;
  c.species = sp.evolvesTo;
  c.unlocked = [];
  c.vitality = Math.max(0, maxVitality(c) - vitLost);
  c.stamina = maxStamina(c);
  if (!fits(energy(c), c.playbook)) c.playbook = autoPlaybook(c);
}

export function gainXp(c: CreatureInst, xp: number): number {
  if (c.morale >= MORALE_HIGH) xp += 1;
  c.xp += xp;
  let levels = 0;
  while (c.xp >= 10) { c.xp -= 10; c.level++; c.points++; levels++; }
  return levels;
}

/** KO bonus: XP for the creature that knocks out an opponent (2–10, more for tougher foes). */
export function xpForWin(winnerLevel: number, loserLevel: number): number {
  return Math.max(2, Math.min(10, 5 + 2 * (loserLevel - winnerLevel)));
}

/** Participation XP: every creature that fought earns this when the battle ends, win or lose (1–5). */
export function participationXp(level: number, foeLevel: number): number {
  return Math.max(1, Math.min(5, 3 + (foeLevel - level)));
}

// ── Morale & Loyalty ────────────────────────────────────────────
/** Extra XP every participant earns from a battle against a trainer, Arbiter or Champion, win or lose. */
export const TRAINER_BATTLE_XP_BONUS = 3;

/** Morale at or above this earns +1 Loyalty at the end of each turn (and +1 XP per battle). */
export const MORALE_HIGH = 7;
/** Morale at or below this puts the creature at risk of leaving (warning first, then a d10 check each turn). */
export const MORALE_LOW = 3;
export const LOYALTY_MAX = 10;
/** Legendaries lose this much Loyalty every turn and never gain it from Morale (see world.ts → moraleAndLoyalty). */
export const LEGENDARY_LOYALTY_DRAIN = 1;

/** Unlock every Nature perk whose Loyalty threshold has been reached. Perks never re-lock. */
export function syncPerks(c: CreatureInst) {
  const n = NATURE_BY_ID[c.nature];
  if (!n) return;
  while (c.perks < n.perks.length && c.loyalty >= n.perks[c.perks].cost) c.perks++;
}

/** Add (or remove) Loyalty within 0–10, unlocking any perks it reaches. */
export function addLoyalty(c: CreatureInst, n: number) {
  c.loyalty = Math.max(0, Math.min(LOYALTY_MAX, c.loyalty + n));
  syncPerks(c);
}

/**
 * A new creature. Above Lv 1 its chart points are spent at random (unless `auto: false`). `varied`
 * playbooks (default: above Lv 1, i.e. wild and NPC creatures) mix up its moves; starters get the standard pick.
 */
export function createCreature(speciesId: string, level = 1, opts: { nature?: string; auto?: boolean; varied?: boolean } = {}): CreatureInst {
  const c: CreatureInst = {
    uid: uid(), species: speciesId, level: 1, xp: 0, points: 0,
    nature: opts.nature ?? pick(NATURES).id, morale: 5, loyalty: 0, perks: 0,
    bonus: {}, extraEnergy: {}, unlocked: [],
    health: 0, vitality: 0, stamina: 0, fatigue: 0, ko: false, playbook: [], teamwork: {}, swapMoves: {}, wins: 0, losses: 0,
  };
  if (level > 1) {
    c.level = level;
    c.points = level - 1;
    if (opts.auto !== false) autoSpend(c, false);
  }
  fullRestore(c);
  c.playbook = autoPlaybook(c, opts.varied ?? level > 1);
  return c;
}

/** NPC / wild growth: spend points on random available nodes. Wild creatures don't evolve. */
export function autoSpend(c: CreatureInst, allowEvolve: boolean) {
  let guard = 50;
  while (c.points > 0 && guard-- > 0) {
    const av = availableNodes(c).filter((n) => allowEvolve || n.kind !== 'evolve');
    if (av.length === 0) {
      // chart exhausted (or only Evolve left, which wild creatures skip): generic growth
      c.points--;
      const k = pick(speciesOf(c).bulky ? TRAINABLE.filter((x) => x !== 'vigor') : TRAINABLE);
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
  return Math.max(0, Math.min(1, totalHealth(c) / maxTotal(c)));
}

export type BattleStatus = { id: StatusId; turns: number };

// ── Recommended playbooks ───────────────────────────────────────
// The playbook editor's "Recommend moves" menu. Each goal scores moves by their expected damage
// with this creature's own stats (assuming a typical foe Evasion of 3), then searches for the
// best set of up to 4 that fits its energy.

export type PlaybookGoal = { kind: 'physical' } | { kind: 'elemental' } | { kind: 'balanced' } | { kind: 'vs'; type: ElementType };

const TYPICAL_EVASION = 3;

/** Expected damage per use of a move for this creature (0 for support), optionally against a defender type. */
export function expectedDamage(c: CreatureInst, m: Move, vs?: ElementType): number {
  if (m.kind === 'support') return 0;
  const st = stats(c);
  const base = Math.max(1, avgRoll(m) + (m.kind === 'physical' ? st.power : st.focus));
  const hit = m.accuracy === 'sure' ? 1 : Math.max(0, Math.min(1, (m.accuracy - TYPICAL_EVASION + 1) / m.accuracy));
  const crit = critFaces(m) && typeof m.accuracy === 'number' ? 1 + Math.min(critFaces(m), m.accuracy - 1) / m.accuracy : 1;
  const mult = vs && m.kind === 'elemental' && m.type ? effectiveness(m.type, [vs]) : 1;
  return base * hit * crit * mult;
}

/** The goal that suits this creature best, and why: a clear Power or Focus lead points one way. */
export function suggestGoal(c: CreatureInst): { goal: PlaybookGoal; reason: string } {
  const st = stats(c);
  const opts = learnable(c).map((id) => MOVE_BY_ID[id]);
  const hasElem = opts.some((m) => m.kind === 'elemental' && m.dmgDie > 0);
  if (!hasElem || st.power - st.focus >= 2) return { goal: { kind: 'physical' }, reason: hasElem ? `Power ${st.power} is well above Focus ${st.focus}, so physical attacks hit harder.` : 'It can’t learn any elemental attacks yet.' };
  if (st.focus - st.power >= 2) return { goal: { kind: 'elemental' }, reason: `Focus ${st.focus} is well above Power ${st.power}, so elemental attacks hit harder.` };
  return { goal: { kind: 'balanced' }, reason: `Power ${st.power} and Focus ${st.focus} are close, so a mix covers more matchups.` };
}

/** The best playbook (up to 4 moves that fit the creature's energy) for a goal. */
export function recommendPlaybook(c: CreatureInst, goal: PlaybookGoal): string[] {
  const e = energy(c);
  const vs = goal.kind === 'vs' ? goal.type : undefined;
  const weight = (m: Move) =>
    m.kind === 'support' ? 0
      : goal.kind === 'physical' ? (m.kind === 'physical' ? 1 : 0.4)
        : goal.kind === 'elemental' ? (m.kind === 'elemental' ? 1 : 0.4) : 1;
  const value = (id: string) => {
    const m = MOVE_BY_ID[id];
    return expectedDamage(c, m, vs) * weight(m) - m.effort * 0.3 + Math.max(0, m.speed) * 0.15;
  };
  const all = learnable(c);
  const supports = all.filter((id) => MOVE_BY_ID[id].kind === 'support');
  const attacks = all.filter((id) => MOVE_BY_ID[id].kind !== 'support').sort((a, b) => value(b) - value(a));
  // shortlist: the strongest attacks plus a couple of support moves
  const pool = [...attacks.slice(0, 12), ...supports.slice(0, 3)];
  const score = (set: string[]) => {
    const ms = set.map((id) => MOVE_BY_ID[id]);
    let sc = set.reduce((a, id) => a + value(id), 0) + set.length;
    if (ms.some((m) => m.kind === 'support')) sc += goal.kind === 'balanced' ? 3.5 : 2.5; // one utility move is worth a slot
    if (ms.filter((m) => m.kind === 'support').length > 1) sc -= 6;
    if (goal.kind === 'balanced') {
      if (ms.some((m) => m.kind === 'physical') && ms.some((m) => m.kind === 'elemental')) sc += 4;
      sc += new Set(ms.filter((m) => m.kind === 'elemental').map((m) => m.type)).size; // type coverage
    }
    return sc;
  };
  let best: string[] = [], bestScore = -Infinity;
  const dfs = (start: number, set: string[]) => {
    if (set.length) { const sc = score(set); if (sc > bestScore) { bestScore = sc; best = [...set]; } }
    if (set.length === 4) return;
    for (let i = start; i < pool.length; i++) {
      set.push(pool[i]);
      if (fits(e, set)) dfs(i + 1, set);
      set.pop();
    }
  };
  dfs(0, []);
  return best;
}
