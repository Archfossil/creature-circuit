import type { ArenaTrick, ElementType, Move, StatKey, Stats, StatusId, WeatherDef } from '../data/schema';
import { MOVE_BY_ID, CATCH_BREATH, STATUS_INFO, ZERO_IN_MAX, zeroInOf, damageDice, avgRoll, statusChance, critFrom } from '../data/moves';
import { AFFINITIES } from '../data/content';
import { effectiveness, TYPE_LABEL } from '../data/types';
import { SPECIES_BY_ID } from '../data/species';
import type { CreatureInst, BattleStatus } from './creature';
import { stats, maxHealth, maxStamina, nameOf, speciesOf, gainXp, xpForWin, participationXp, TRAINER_BATTLE_XP_BONUS } from './creature';
import { roll, clashDie } from './dice';

export type SideKind = 'player' | 'wild' | 'trainer' | 'arbiter' | 'champion';

export interface Side {
  kind: SideKind;
  name: string;
  team: CreatureInst[];
  active: number;
  mods: Partial<Stats>;
  /** Zeroing In: accuracy bonus for the active creature's next accuracy roll, built up by misses. Lost when it leaves the field. */
  zeroIn?: number;
  buff?: Partial<Record<StatKey, number>>; // hot pot (player) / arena (arbiter)
  /** Extra XP per participant from the trainer's style (Battle Master +2, Caretaker −1). */
  xpBonus?: number;
}

export interface Battle {
  sides: [Side, Side];
  round: number;
  weather: WeatherDef;
  arena?: { trick: ArenaTrick; tier: number; city: string };
  legendary: boolean;
  fleeWarned: boolean;
  status: Record<string, BattleStatus>;
  over: null | 'win' | 'lose' | 'escaped' | 'fled';
  needSwap: boolean;
  participants: string[];
  biome: string;
  quickStep: boolean;
  /** The Forest Floor: running away needs a 7+ (d6 + Speed difference) instead of 4+, unless Quick Step. */
  hardRun?: boolean;
  /** Species ids of every opposing creature that has taken the field (for the Creature Codex). */
  seenFoes: string[];
  /** Trainer ID: the types of the moves side 0 used, and how many foes side 0 knocked out. */
  moveTypes?: Record<string, number>;
  foeKOs?: number;
  /** Opposing creatures that took the field (uids), e.g. to reward a hotseat duel's defender. */
  foeParticipants?: string[];
  /** Two-player duels: a human picks side 1's replacement after a KO (instead of the next in line). */
  foeChooses?: boolean;
  /** The AI's last move per creature and how many times in a row it used it (to keep it from spamming one move). */
  aiLast?: Record<string, { move: string; streak: number }>;
  /** Side 1's active creature is knocked out and waiting for foeSendIn. */
  foeNeedSwap?: boolean;
}

export type Action = { kind: 'move'; move: string } | { kind: 'swap'; to: number } | { kind: 'run' };

export interface Snap { uid: string; health: number; vitality: number; stamina: number; fatigue: number; ko: boolean; status?: StatusId; /** Zeroing In bonus waiting for its next accuracy roll. */ zero?: number }
export type BEvent =
  | { t: 'say'; text: string; tone?: 'good' | 'bad' | 'info' }
  /** A speed tie. `first`: who acts first (the higher roller, or on equal rolls the winner of a coin flip, `coin`). */
  | { t: 'clash'; dice: [number, number]; rolls: [number, number]; loser: 0 | 1 | null; dmg: number; first: 0 | 1; coin?: boolean }
  | { t: 'use'; side: 0 | 1; name: string; move: string; type?: ElementType; kind: Move['kind'] | 'affinity' }
  | { t: 'roll'; side: 0 | 1; die: number; value: number; need: number; hit: boolean; crit: boolean; label: string; natural?: number; mods?: Part[] }
  | { t: 'damage'; side: 0 | 1; amount: number; eff: number; crit: boolean; snap: Snap; calc?: DamageCalc }
  | { t: 'heal'; side: 0 | 1; amount: number; snap: Snap }
  | { t: 'status'; side: 0 | 1; status: StatusId; snap: Snap }
  | { t: 'buff'; side: 0 | 1; text: string }
  /** Zeroing In changed: a miss built it up (bonus > 0) or the next accuracy roll used it (bonus 0). */
  | { t: 'zero'; side: 0 | 1; bonus: number; gained: number; snap: Snap }
  | { t: 'tired'; side: 0 | 1; value: number; fatigue: number; fail: boolean; snap: Snap }
  | { t: 'ko'; side: 0 | 1; uid: string }
  | { t: 'send'; side: 0 | 1; idx: number; snap: Snap }
  | { t: 'xp'; uid: string; amount: number; levels: number; reason: 'ko' | 'battle'; foe?: string; bonus?: number }
  | { t: 'arena'; text: string }
  /** Cliff's crumbling plateau: rounds left before the challenger is rung out (of `total`). */
  | { t: 'ring'; left: number; total: number }
  | { t: 'end'; result: NonNullable<Battle['over']> };

/** One labelled number in a roll or damage formula, e.g. { label: 'Power', value: 3 }. */
export interface Part { label: string; value: number }
/** How a move's damage was worked out, so the battle UI can show the formula. */
/** `dice` are the damage dice rolled (empty for flat damage) and `rolls` what each showed. */
export interface DamageCalc { dice: number[]; rolls: number[]; parts: Part[]; raw: number; mult: number; crit: boolean; total: number }

export function snap(b: Battle, c: CreatureInst): Snap {
  const sd = b.sides.find((s) => activeOf(s) === c);
  return { uid: c.uid, health: c.health, vitality: c.vitality, stamina: c.stamina, fatigue: c.fatigue, ko: c.ko, status: b.status[c.uid]?.id, ...(sd?.zeroIn ? { zero: sd.zeroIn } : {}) };
}

export const activeOf = (s: Side) => s.team[s.active];

/** Type-chart multiplier a move gets against a defender's types, or null if the chart doesn't apply (Physical and Support). */
export function typeMatchup(m: Move, defender: ElementType[]): number | null {
  return m.kind === 'elemental' && m.type ? effectiveness(m.type, defender) : null;
}

/** Record the opposing side's active creature as seen. */
function noteFoe(b: Battle) {
  const foe = activeOf(b.sides[1]);
  const sp = foe?.species;
  if (sp && !b.seenFoes.includes(sp)) b.seenFoes.push(sp);
  if (foe && !(b.foeParticipants ??= []).includes(foe.uid)) b.foeParticipants.push(foe.uid);
}

/** Run roll needed on the Forest Floor (normally 4). */
export const HARD_RUN = 7;

export function createBattle(player: Side, foe: Side, weather: WeatherDef, opts: { arena?: Battle['arena']; legendary?: boolean; biome?: string; quickStep?: boolean; hardRun?: boolean } = {}): Battle {
  const b: Battle = {
    sides: [player, foe], round: 0, weather, arena: opts.arena, legendary: !!opts.legendary, fleeWarned: false,
    status: {}, over: null, needSwap: false, participants: [], biome: opts.biome ?? 'meadow', quickStep: !!opts.quickStep, hardRun: !!opts.hardRun, seenFoes: [],
  };
  for (const s of b.sides) {
    // keep the chosen lead (e.g. the Following creature) unless it can't fight
    if (!s.team[s.active] || s.team[s.active].ko) s.active = Math.max(0, s.team.findIndex((c) => !c.ko));
    for (const c of s.team) if (!c.ko) c.stamina = maxStamina(c);
  }
  // Hot pot vigor buff: a little extra Health at the start
  if (player.buff?.vigor) for (const c of player.team) if (!c.ko) c.health += player.buff.vigor * 2;
  b.participants.push(activeOf(player).uid);
  noteFoe(b);
  return b;
}

// ── Effective stats ─────────────────────────────────────────────
function eff(b: Battle, si: 0 | 1, k: StatKey): number {
  const side = b.sides[si];
  const c = activeOf(side);
  let v = stats(c, side.buff)[k] + (side.mods[k] ?? 0);
  if (k === 'speed') v += b.weather.speed ?? 0;
  if (k === 'evasion') v += b.weather.evasion ?? 0;
  const st = b.status[c.uid]?.id;
  if (k === 'speed' && st === 'soak') v -= 2;
  if (st === 'snare' && (k === 'speed' || k === 'evasion')) v -= 1;
  if (st === 'stagger' && (k === 'power' || k === 'focus')) v -= 1;
  if (st === 'sunder' && (k === 'armor' || k === 'ward')) v -= 1;
  if (b.arena) {
    const t = b.arena.tier;
    if (si === 1 && b.arena.trick === 'illusion' && k === 'evasion') v += t >= 4 ? 2 : 1;
    if (si === 1 && b.arena.trick === 'fortress' && (k === 'armor' || k === 'ward')) v += t >= 4 ? 2 : 1;
    if (si === 0 && b.arena.trick === 'roots' && k === 'speed') v -= t >= 4 ? 2 : 1;
  }
  if (k === 'evasion') return Math.max(1, Math.min(v, 6));
  return Math.max(0, v);
}

function addMod(b: Battle, si: 0 | 1, k: StatKey, n: number) {
  const m = b.sides[si].mods;
  m[k] = Math.max(-3, Math.min(3, (m[k] ?? 0) + n));
}

function applyDamage(c: CreatureInst, dmg: number) {
  const mh = maxHealth(c);
  c.health -= dmg;
  while (c.health <= 0 && c.vitality > 0) { c.vitality--; c.health += mh; }
  if (c.health <= 0) { c.health = 0; c.ko = true; }
}

// ── AI ──────────────────────────────────────────────────────────
/** A human-chosen action for side 1, if it's legal right now. */
function validFoeAction(b: Battle, a?: Action): Action | null {
  if (!a) return null;
  const side = b.sides[1];
  if (a.kind === 'move') return a.move === CATCH_BREATH.id || activeOf(side).playbook.includes(a.move) ? a : null;
  if (a.kind === 'swap') return b.round >= 1 && side.team[a.to] && !side.team[a.to].ko && a.to !== side.active ? a : null;
  return null;
}

/** What side 1's human player may choose this round (for the duel picker). */
export function foeOptions(b: Battle) {
  const side = b.sides[1];
  const me = activeOf(side);
  return {
    name: nameOf(me),
    moves: [...me.playbook],
    swaps: b.round >= 1 ? side.team.map((c, i) => ({ i, name: nameOf(c), ko: c.ko })).filter((x) => !x.ko && x.i !== side.active).map(({ i, name }) => ({ i, name })) : [],
    vs: speciesOf(activeOf(b.sides[0])).types,
  };
}
export type FoeOptions = ReturnType<typeof foeOptions>;

export function chooseAI(b: Battle, si: 0 | 1): Action {
  const side = b.sides[si];
  const c = activeOf(side);
  const foe = activeOf(b.sides[si === 0 ? 1 : 0]);
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  if (c.fatigue >= 3 && c.stamina <= 2) return { kind: 'move', move: CATCH_BREATH.id };
  const last = (b.aiLast ??= {})[c.uid];
  // the foe is nearly down: go for the knockout. Nearly down ourselves: no time to set up (heals still count).
  const finishingBlow = foe.vitality === 0 && foe.health <= 3;
  const desperate = c.vitality === 0 && c.health <= 2;
  const scored: { id: string; score: number }[] = [];
  for (const id of c.playbook) {
    const m = MOVE_BY_ID[id];
    let score = 0;
    const hit = m.accuracy === 'sure' ? 1 : hitChance(m.accuracy, eff(b, fi, 'evasion') - (b.sides[si].zeroIn ?? 0));
    if (m.kind === 'support') {
      // buffs, debuffs and heals are worth what the situation makes them worth (see effectValue)
      score = hit * effectValue(b, si, m.effect) * SUPPORT_WEIGHT * (finishingBlow ? 0.35 : 1) * (desperate && !m.effect?.heal ? 0.4 : 1);
    } else {
      const atk = m.kind === 'physical' ? eff(b, si, 'power') - eff(b, fi, 'armor') : eff(b, si, 'focus') - eff(b, fi, 'ward');
      const mult = m.kind === 'elemental' && m.type ? effectiveness(m.type, speciesOf(foe).types) : 1;
      score = hit * Math.max(1, avgRoll(m) + atk) * mult;
      if (m.effect) score += hit * effectValue(b, si, m.effect) * SUPPORT_WEIGHT * 0.5; // a rider on a hit
    }
    if (m.effort > c.stamina) score *= 0.7;
    // the same move again gets less and less appealing (Quick Jab, Quick Jab, Quick Jab…)
    if (last?.move === id) score *= Math.pow(AI_REPEAT_PENALTY, last.streak);
    scored.push({ id, score: Math.max(0, score) });
  }
  const id = weightedPick(scored, AI_SHARPNESS[side.kind] ?? 2) ?? c.playbook[0] ?? CATCH_BREATH.id;
  b.aiLast[c.uid] = { move: id, streak: last?.move === id ? last.streak + 1 : 1 };
  return { kind: 'move', move: id };
}

const hitChance = (die: number, need: number) => Math.max(0, Math.min(1, (die - need + 1) / die));

/** Scales a support move's situational value (effectValue) against an attack's expected damage. */
export const SUPPORT_WEIGHT = 1.0;

/**
 * How useful a set of stat changes / heals is right now, for side `si`, in rough "damage-equivalent"
 * points. The AI reads the matchup:
 *  - the foe is faster → Speed for us (or Speed off them) is worth a lot, more if it flips the order;
 *  - the foe hits hard physically / elementally → Armor / Ward (or Power / Focus off them);
 *  - the foe's attacks land reliably (or never miss) → Armor / Ward, since Evasion can't stop them;
 *  - the foe's attacks are hit-or-miss → Evasion, pushing them further toward missing;
 *  - our attacks keep missing → their Evasion down; our attacks are physical / elemental → Power / Focus;
 *  - hurt → heals; winded → Stamina.
 * Stats already raised (or lowered) a lot are worth less, and nothing past the ±3 cap.
 */
export function effectValue(b: Battle, si: 0 | 1, e: Move['effect']): number {
  if (!e) return 0;
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const me = activeOf(b.sides[si]), foe = activeOf(b.sides[fi]);
  const attacks = (c: CreatureInst) => c.playbook.map((id) => MOVE_BY_ID[id]).filter((m) => m && m.kind !== 'support');
  const share = (c: CreatureInst, kind: Move['kind']) => { const a = attacks(c); return a.length ? a.filter((m) => m.kind === kind).length / a.length : 0; };
  const accuracyOf = (c: CreatureInst, vsEvasion: number) => {
    const a = attacks(c);
    return a.length ? a.reduce((t, m) => t + (m.accuracy === 'sure' ? 1 : hitChance(m.accuracy, vsEvasion)), 0) / a.length : 0.5;
  };
  // how much one point of Evasion changes c's hits: nothing against sure hits, 1/die per point otherwise
  const dodgeable = (c: CreatureInst, vsEvasion: number) => {
    const a = attacks(c);
    return a.length ? a.reduce((t, m) => t + (m.accuracy === 'sure' || hitChance(m.accuracy, vsEvasion) <= 0 ? 0 : 1 / m.accuracy), 0) / a.length : 0;
  };
  // how much the foe threatens us with each kind of attack (its stat edge, never below a little)
  const threat = (kind: 'physical' | 'elemental') => share(foe, kind) * Math.max(0.5, kind === 'physical' ? eff(b, fi, 'power') - eff(b, si, 'armor') + 2 : eff(b, fi, 'focus') - eff(b, si, 'ward') + 2) / 3;
  const speedGap = eff(b, fi, 'speed') - eff(b, si, 'speed'); // > 0: the foe is faster
  const speedWorth = (n: number) => (speedGap >= 0 ? (speedGap - n < 0 ? 1.3 : 0.7) : 0.2);
  const foeLands = accuracyOf(foe, eff(b, si, 'evasion'));
  const guard = 0.5 + 0.7 * foeLands; // Armor / Ward matter most against a foe that keeps landing hits
  // value of one point of each stat on our side (a debuff on the foe mirrors its effect on us)
  const mine: Partial<Record<StatKey, (n: number) => number>> = {
    speed: speedWorth,
    power: () => share(me, 'physical') * 0.9,
    focus: () => share(me, 'elemental') * 0.9,
    armor: () => threat('physical') * guard,
    ward: () => threat('elemental') * guard,
    evasion: () => dodgeable(foe, eff(b, si, 'evasion')) * 6,
    vigor: () => 0.4,
    stamina: () => (me.stamina <= 2 ? 0.5 : 0.15),
  };
  const theirs: Partial<Record<StatKey, (n: number) => number>> = {
    speed: speedWorth,
    power: () => threat('physical') * 0.9,
    focus: () => threat('elemental') * 0.9,
    armor: () => share(me, 'physical') * 0.7,
    ward: () => share(me, 'elemental') * 0.7,
    evasion: () => dodgeable(me, eff(b, fi, 'evasion')) * 6,
    vigor: () => 0.2,
    stamina: () => 0.2,
  };
  // stacking: each point already applied makes the next worth less; nothing past the cap
  const room = (cur: number, n: number) => (n > 0 ? Math.max(0, Math.min(n, 3 - cur)) : Math.max(0, Math.min(-n, 3 + cur)));
  const fade = (cur: number) => Math.max(0.2, 1 - Math.abs(cur) * 0.3);
  let v = 0;
  for (const [k, n] of Object.entries(e.self ?? {}) as [StatKey, number][]) {
    if (n <= 0) continue;
    const cur = b.sides[si].mods[k] ?? 0;
    v += room(cur, n) * fade(cur) * (mine[k]?.(n) ?? 0.3);
  }
  for (const [k, n] of Object.entries(e.foe ?? {}) as [StatKey, number][]) {
    if (n >= 0) continue;
    const cur = b.sides[fi].mods[k] ?? 0;
    v += room(cur, n) * fade(cur) * (theirs[k]?.(-n) ?? 0.3);
  }
  if (e.heal) {
    const missing = maxHealth(me) - me.health;
    v += Math.min(e.heal, missing) * (me.vitality <= 1 ? 1.2 : 0.6);
  }
  if (e.staminaGain) v += Math.min(e.staminaGain, maxStamina(me) - me.stamina) * (me.fatigue > 0 ? 0.35 : 0.15);
  // set-up pays off over the rounds to come; less so once the battle is well along
  return v * (b.round <= 2 ? 1.2 : b.round >= 6 ? 0.8 : 1);
}

/** Each consecutive use of the same move multiplies its appeal by this. */
export const AI_REPEAT_PENALTY = 0.5;
/**
 * How strongly each kind of opponent favours its best-scoring move. Moves are picked at random,
 * weighted by score ^ sharpness: wild creatures are playful and unpredictable, trainers fairly
 * sensible, Arbiters and the Champion sharp (but never fully predictable).
 */
export const AI_SHARPNESS: Partial<Record<SideKind, number>> = { wild: 1.2, trainer: 2, player: 2, arbiter: 3, champion: 3.5 };

/** Pick one option at random, weighted by score ^ sharpness. */
function weightedPick(opts: { id: string; score: number }[], sharp: number): string | undefined {
  const w = opts.map((o) => Math.pow(o.score, sharp));
  const total = w.reduce((a, v) => a + v, 0);
  if (!(total > 0)) return undefined;
  let r = Math.random() * total;
  for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i].id; }
  return opts[opts.length - 1].id;
}

// ── Round resolution ────────────────────────────────────────────
/**
 * Resolve one round. `foeAction` lets a second human choose side 1's action (hotseat/online duels);
 * without it the side-1 AI picks. An invalid foe action (e.g. a move not in the playbook) falls back to the AI.
 */
export function resolveRound(b: Battle, pa: Action, foeAction?: Action): BEvent[] {
  const ev: BEvent[] = [];
  if (b.over) return ev;
  if (b.foeNeedSwap) ev.push(...foeSendIn(b, -1)); // nobody picked a replacement: the next in line goes
  b.round++;
  let ea: Action | { kind: 'flee' } = b.legendary && b.fleeWarned ? { kind: 'flee' } : validFoeAction(b, foeAction) ?? chooseAI(b, 1);
  const startUids = [activeOf(b.sides[0]).uid, activeOf(b.sides[1]).uid];

  if (pa.kind === 'run') {
    const me = activeOf(b.sides[0]);
    const ok = b.quickStep || roll(6) + eff(b, 0, 'speed') - eff(b, 1, 'speed') >= (b.hardRun ? HARD_RUN : 4);
    if (ok) {
      ev.push({ t: 'say', text: `${nameOf(me)} got away safely!`, tone: 'info' });
      b.over = 'escaped';
      ev.push({ t: 'end', result: 'escaped' });
      return ev;
    }
    ev.push({ t: 'say', text: b.hardRun ? 'Couldn\'t escape! The dark Forest Floor hems you in.' : `Couldn't escape!`, tone: 'bad' });
  }

  const speedOf = (si: 0 | 1, a: Action | { kind: 'flee' }) => {
    let s = eff(b, si, 'speed');
    if (a.kind === 'move') s += (MOVE_BY_ID[a.move] ?? CATCH_BREATH).speed;
    if (a.kind === 'swap') {
      const inc = b.sides[si].team[a.to];
      if (speciesOf(inc).affinity === 'slipstream') s += 3;
    }
    if (a.kind === 'flee') s = stats(activeOf(b.sides[si])).speed;
    return s;
  };
  const sp: [number, number] = [pa.kind === 'run' ? -99 : speedOf(0, pa), speedOf(1, ea)];
  let order: (0 | 1)[];
  if (pa.kind === 'run') order = [1];
  else if (sp[0] > sp[1]) order = [0, 1];
  else if (sp[1] > sp[0]) order = [1, 0];
  else {
    // Clash!
    const cs: [CreatureInst, CreatureInst] = [activeOf(b.sides[0]), activeOf(b.sides[1])];
    const dice: [number, number] = [clashDie(cs[0].level), clashDie(cs[1].level)];
    const rolls: [number, number] = [roll(dice[0]), roll(dice[1])];
    let loser: 0 | 1 | null = null;
    let dmg = 0;
    if (rolls[0] !== rolls[1]) {
      loser = rolls[0] < rolls[1] ? 0 : 1;
      dmg = Math.abs(rolls[0] - rolls[1]);
      applyDamage(cs[loser], dmg);
    }
    // equal rolls: a coin flip decides who goes first (decided here so the UI can show it before anyone acts)
    const first: 0 | 1 = loser === 0 ? 1 : loser === 1 ? 0 : Math.random() < 0.5 ? 0 : 1;
    ev.push({ t: 'clash', dice, rolls, loser, dmg, first, ...(loser === null ? { coin: true } : {}) });
    if (loser !== null) {
      ev.push({ t: 'damage', side: loser, amount: dmg, eff: 1, crit: false, snap: snap(b, cs[loser]) });
      if (cs[loser].ko) handleKO(b, loser, ev);
    }
    order = first === 0 ? [0, 1] : [1, 0];
  }

  for (const si of order) {
    if (b.over) break;
    const side = b.sides[si];
    const me = activeOf(side);
    if (me.uid !== startUids[si] || me.ko) continue; // knocked out or replaced before acting
    const foeSide: 0 | 1 = si === 0 ? 1 : 0;
    if (activeOf(b.sides[foeSide]).ko) continue;
    const act = si === 0 ? pa : ea;
    if (act.kind === 'run') continue;
    if (act.kind === 'flee') {
      ev.push({ t: 'say', text: `${nameOf(me)} lost interest and vanished into the wilds…`, tone: 'bad' });
      b.over = 'fled';
      awardBattleXp(b, ev);
      ev.push({ t: 'end', result: 'fled' });
      break;
    }
    if (act.kind === 'swap') doSwap(b, si, act.to, ev);
    else useMove(b, si, MOVE_BY_ID[act.move] ?? CATCH_BREATH, ev);
  }

  if (!b.over) endOfRound(b, ev);
  return ev;
}

function fatigueCheck(b: Battle, si: 0 | 1, ev: BEvent[]): boolean {
  const c = activeOf(b.sides[si]);
  if (c.fatigue <= 0) return true;
  const v = roll(10);
  const fail = v <= c.fatigue;
  if (fail) c.stamina = maxStamina(c);
  ev.push({ t: 'tired', side: si, value: v, fatigue: c.fatigue, fail, snap: snap(b, c) });
  if (fail) ev.push({ t: 'say', text: `${nameOf(c)} is catching their breath!`, tone: 'bad' });
  return !fail;
}

function spendStamina(b: Battle, si: 0 | 1, effort: number, ev: BEvent[]) {
  const c = activeOf(b.sides[si]);
  if (effort <= 0) return;
  c.stamina -= effort;
  if (c.stamina <= 0) {
    c.fatigue++;
    c.stamina = maxStamina(c);
    ev.push({ t: 'say', text: `${nameOf(c)} is fatigued (${c.fatigue}).`, tone: 'bad' });
  }
}

function useMove(b: Battle, si: 0 | 1, m: Move, ev: BEvent[]) {
  const side = b.sides[si];
  const c = activeOf(side);
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const foe = activeOf(b.sides[fi]);

  if (m.id === CATCH_BREATH.id) {
    c.stamina = maxStamina(c);
    ev.push({ t: 'use', side: si, name: m.name, move: m.id, kind: 'support' });
    ev.push({ t: 'heal', side: si, amount: 0, snap: snap(b, c) });
    return;
  }
  if (!fatigueCheck(b, si, ev)) return;
  if (b.status[c.uid]?.id === 'shock' && roll(6) <= 2) {
    ev.push({ t: 'say', text: `${nameOf(c)} is locked up by Shock!`, tone: 'bad' });
    return;
  }
  ev.push({ t: 'use', side: si, name: m.name, move: m.id, type: m.type, kind: m.kind });
  if (si === 0 && m.type) (b.moveTypes ??= {})[m.type] = (b.moveTypes[m.type] ?? 0) + 1;
  spendStamina(b, si, m.effort, ev);

  // accuracy
  let hit = true, crit = false;
  if (m.accuracy !== 'sure') {
    let die = m.accuracy;
    if (b.status[c.uid]?.id === 'daze') die = Math.max(4, die - 2);
    const natural = roll(die);
    const mods = accuracyMods(b, si);
    const v = natural + mods.reduce((a, p) => a + p.value, 0);
    const need = eff(b, fi, 'evasion');
    hit = v >= need;
    crit = hit && critFrom(m, die) > 0 && natural >= critFrom(m, die);
    ev.push({ t: 'roll', side: si, die, value: v, need, hit, crit, label: 'Accuracy', natural, mods });
    // Zeroing In: the roll uses up any bonus; a miss builds it back up (stacking over a streak of misses)
    const had = side.zeroIn ?? 0;
    const gain = hit ? 0 : zeroInOf(m);
    side.zeroIn = gain ? Math.min(ZERO_IN_MAX, had + gain) : 0;
    if (had || side.zeroIn) ev.push({ t: 'zero', side: si, bonus: side.zeroIn, gained: side.zeroIn - (gain ? had : 0), snap: snap(b, c) });
  }
  if (!hit) { ev.push({ t: 'say', text: `${m.name} missed!`, tone: 'info' }); return; }

  if (m.kind === 'support') {
    applyEffects(b, si, m, ev);
    return;
  }

  // damage
  const dice = damageDice(m);
  const rolls = dice.map((d) => roll(d));
  const dmgRoll = rolls.reduce((a, r) => a + r, 0);
  const parts = damageParts(b, si, m);
  const mult = typeMatchup(m, speciesOf(foe).types) ?? 1;
  const raw = Math.max(1, dmgRoll + parts.reduce((a, p) => a + p.value, 0));
  let dmg = mult === 0 ? 0 : Math.max(1, Math.floor(raw * mult));
  if (crit) dmg *= 2;
  applyDamage(foe, dmg);
  ev.push({ t: 'damage', side: fi, amount: dmg, eff: mult, crit, snap: snap(b, foe), calc: { dice, rolls, parts, raw, mult, crit, total: dmg } });
  if (mult >= 2) ev.push({ t: 'say', text: mult >= 4 ? 'Devastatingly effective!' : 'Super effective!', tone: 'good' });
  else if (mult === 0) ev.push({ t: 'say', text: `${nameOf(foe)} is immune!`, tone: 'info' });
  else if (mult < 1) ev.push({ t: 'say', text: 'It was resisted…', tone: 'info' });

  // status when any damage die shows a 1
  if (m.kind === 'elemental' && m.status && rolls.includes(1) && !foe.ko && !b.status[foe.uid]) {
    b.status[foe.uid] = { id: m.status, turns: 3 };
    ev.push({ t: 'status', side: fi, status: m.status, snap: snap(b, foe) });
    ev.push({ t: 'say', text: `${nameOf(foe)} is afflicted with ${STATUS_INFO[m.status].name}!`, tone: 'info' });
  }
  if (m.effect) applyEffects(b, si, m, ev);
  if (foe.ko) handleKO(b, fi, ev);
}

/** Modifiers to an accuracy roll (Beguile, the Darkness arena, Zeroing In). */
function accuracyMods(b: Battle, si: 0 | 1): Part[] {
  const c = activeOf(b.sides[si]);
  const out: Part[] = [];
  if (b.status[c.uid]?.id === 'beguile') out.push({ label: 'Beguile', value: -1 });
  if (si === 0 && b.arena?.trick === 'darkness') out.push({ label: 'Darkness', value: b.arena.tier >= 4 ? -2 : -1 });
  if (b.sides[si].zeroIn) out.push({ label: 'Zeroing In', value: b.sides[si].zeroIn! });
  return out;
}

/** Everything added to a move's damage die: the move's flat bonus, attacker stat, defender stat, weather, capstone. */
function damageParts(b: Battle, si: 0 | 1, m: Move): Part[] {
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const c = activeOf(b.sides[si]);
  const parts: Part[] = [];
  if (m.dmgFlat) parts.push({ label: m.name, value: m.dmgFlat });
  if (m.kind === 'physical') {
    parts.push({ label: 'Power', value: eff(b, si, 'power') }, { label: 'foe Armor', value: -eff(b, fi, 'armor') });
  } else {
    parts.push({ label: 'Focus', value: eff(b, si, 'focus') }, { label: 'foe Ward', value: -eff(b, fi, 'ward') });
    const wb = m.type ? b.weather.typeBoost?.[m.type] ?? 0 : 0;
    if (wb) parts.push({ label: b.weather.name, value: wb });
  }
  const cap = c.capstone ? Math.floor(c.loyalty / 5) : 0;
  if (cap) parts.push({ label: 'Capstone', value: cap });
  return parts;
}

/** "+ Power 3 − foe Armor 1" style text for a list of parts. */
export function partsText(parts: Part[]): string {
  return parts.map((p) => `${p.value < 0 ? '−' : '+'} ${p.label} ${Math.abs(p.value)}`).join(' ');
}

export interface PreviewStep { icon: string; title: string; text: string; tone?: 'good' | 'bad' | 'info' }

/**
 * What using a move this round will do, step by step in resolution order, from side `si`'s view:
 * turn order, Fatigue/Shock checks, Stamina, accuracy, damage and effects, using the current
 * stats and the foe on the field. Pure: nothing is rolled or changed.
 */
export function movePreview(b: Battle, moveId: string, si: 0 | 1 = 0): PreviewStep[] {
  const m = MOVE_BY_ID[moveId] ?? CATCH_BREATH;
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const c = activeOf(b.sides[si]), foe = activeOf(b.sides[fi]);
  const steps: PreviewStep[] = [];
  const sgn = (n: number) => (n < 0 ? `−${-n}` : `+${n}`);
  const foeName = nameOf(foe);

  const base = eff(b, si, 'speed');
  const mySpeed = base + m.speed, foeSpeed = eff(b, fi, 'speed');
  steps.push({
    icon: '⚡', title: 'Turn order', tone: mySpeed > foeSpeed ? 'good' : mySpeed < foeSpeed ? 'bad' : 'info',
    text: `Your Speed ${base}${m.speed ? ` ${sgn(m.speed)} (${m.name})` : ''} = ${mySpeed}, vs ${foeName}’s ${foeSpeed} before its own move’s modifier. ` +
      (mySpeed > foeSpeed ? 'You likely act first.' : mySpeed < foeSpeed ? 'You likely act second.'
        : `Likely a tie, which means a Clash: you roll a d${clashDie(c.level)} and the foe a d${clashDie(foe.level)}. The low roller takes the difference as damage and acts second.`),
  });

  if (m.id === CATCH_BREATH.id) {
    steps.push({ icon: '😮‍💨', title: 'Catch Breath', text: `No attack and no dice. Stamina refills to ${maxStamina(c)}. Fatigue stays until you camp or rest.`, tone: 'good' });
    return steps;
  }
  if (c.fatigue > 0) steps.push({
    icon: '🥵', title: 'Fatigue check: d10', tone: 'bad',
    text: `Fatigue ${c.fatigue}: roll a d10. On ${c.fatigue === 1 ? 'a 1' : `1–${c.fatigue}`} you lose the turn catching your breath (${Math.min(100, c.fatigue * 10)}% chance).`,
  });
  if (b.status[c.uid]?.id === 'shock') steps.push({ icon: STATUS_INFO.shock.icon, title: 'Shock check: d6', tone: 'bad', text: 'Roll a d6. On 1–2 you are locked up and lose the turn (33% chance).' });

  const after = c.stamina - m.effort;
  if (m.effort > 0) steps.push({
    icon: '💨', title: `Stamina −${m.effort}`, tone: after <= 0 ? 'bad' : undefined,
    text: `Stamina ${c.stamina} → ${Math.max(0, after)}.${after <= 0 ? ` That empties it: Fatigue rises to ${c.fatigue + 1} and Stamina refills.` : ''}`,
  });

  if (m.accuracy === 'sure') steps.push({ icon: '🎯', title: 'Accuracy: sure hit', text: 'No roll. This move always lands.', tone: 'good' });
  else {
    const die = b.status[c.uid]?.id === 'daze' ? Math.max(4, m.accuracy - 2) : m.accuracy;
    const mods = accuracyMods(b, si), modSum = mods.reduce((a, p) => a + p.value, 0);
    const need = eff(b, fi, 'evasion');
    const hits = Array.from({ length: die }, (_, i) => i + 1).filter((v) => v + modSum >= need).length;
    const pct = Math.round((hits / die) * 100);
    steps.push({
      icon: '🎯', title: `Accuracy: d${die}${mods.length ? ` ${partsText(mods)}` : ''}`, tone: pct >= 67 ? 'good' : pct < 40 ? 'bad' : 'info',
      text: `${die !== m.accuracy ? `Daze shrinks the die from d${m.accuracy}. ` : ''}Need ${need}+ to beat ${foeName}’s Evasion ${need}: ${pct}% to hit.` +
        (critFrom(m, die) ? ` ${critFrom(m, die) === die ? `A natural ${die}` : `A natural ${critFrom(m, die)}–${die}`} is a critical hit: double damage.` : '') +
        (zeroInOf(m) ? ` A miss zeroes in: +${Math.min(ZERO_IN_MAX, (b.sides[si].zeroIn ?? 0) + zeroInOf(m))} to the next accuracy roll.` : ' All or nothing: a miss never zeroes in.'),
    });
  }

  if (m.kind !== 'support' || m.dmgDie > 0) {
    const parts = damageParts(b, si, m);
    const add = parts.reduce((a, p) => a + p.value, 0);
    const mult = typeMatchup(m, speciesOf(foe).types) ?? 1;
    const dmgFor = (r: number) => (mult === 0 ? 0 : Math.max(1, Math.floor(Math.max(1, r + add) * mult)));
    const dice = damageDice(m);
    const lo = dmgFor(dice.length), hi = dmgFor(dice.reduce((a, d) => a + d, 0));
    const dt = dice.map((d) => `d${d}`).join(' + ');
    const multText = mult === 1 ? '' : ` × ${mult} (${mult === 0 ? 'immune' : mult > 1 ? 'super effective' : 'resisted'})`;
    const range = (a: number, z: number) => (a === z ? `${a}` : `${a}–${z}`);
    const stat = m.kind === 'physical' ? 'add your Power and subtract the foe’s Armor (physical move)' : 'add your Focus and subtract the foe’s Ward (elemental move)';
    steps.push({
      icon: '💥', title: `Damage: ${[dt, partsText(parts)].join(' ').trim().replace(/^\+ /, '')}${multText}`,
      tone: mult > 1 ? 'good' : mult < 1 ? 'bad' : undefined,
      text: `${dice.length ? `Roll ${dice.length > 1 ? `${dt} and add them up` : `a ${dt}`}, then ` : ''}${stat}${multText ? `, then apply the type chart${multText}` : ''}. ` +
        `Deals ${range(lo, hi)} damage${m.kind === 'physical' && m.accuracy !== 'sure' && hi > 0 ? `, or ${range(lo * 2, hi * 2)} on a crit` : ''}. ${foeName} has ${foe.health} Health left in its current heart.`,
    });
    if (m.kind === 'elemental' && m.status && m.dmgDie > 0) {
      const st = STATUS_INFO[m.status];
      steps.push({ icon: st.icon, title: `Status chance: ${st.name}`, text: `If ${dice.length > 1 ? 'any damage die' : 'the damage die'} shows a 1 (${Math.round(statusChance(m) * 100)}% chance) and the foe has no status yet, it gets ${st.name} for 3 rounds. ${st.text}` });
    }
  }
  const e = m.effect;
  if (e) {
    const fx: string[] = [];
    for (const [k, v] of Object.entries(e.self ?? {})) fx.push(`your ${k} ${sgn(v!)}`);
    for (const [k, v] of Object.entries(e.foe ?? {})) fx.push(`foe ${k} ${sgn(v!)}`);
    if (e.heal) fx.push(`heal ${e.heal} Health`);
    if (e.staminaGain) fx.push(`+${e.staminaGain} Stamina`);
    if (fx.length) steps.push({ icon: '✨', title: 'Effects', text: `${m.kind === 'support' ? 'On a hit' : 'After the damage'}: ${fx.join(', ')}. Stat changes last until that creature leaves the field, capped at ±3 per stat.`, tone: 'good' });
  }
  return steps;
}

function applyEffects(b: Battle, si: 0 | 1, m: Move, ev: BEvent[]) {
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const c = activeOf(b.sides[si]);
  const e = m.effect;
  if (!e) return;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(e.self ?? {})) { addMod(b, si, k as StatKey, v!); parts.push(`${v! > 0 ? '+' : ''}${v} ${k}`); }
  if (parts.length) ev.push({ t: 'buff', side: si, text: parts.join(', ') });
  const fparts: string[] = [];
  for (const [k, v] of Object.entries(e.foe ?? {})) { addMod(b, fi, k as StatKey, v!); fparts.push(`${v} ${k}`); }
  if (fparts.length) ev.push({ t: 'buff', side: fi, text: fparts.join(', ') });
  if (e.heal || e.staminaGain) {
    const mh = maxHealth(c);
    const before = c.health;
    if (e.heal) c.health = Math.min(mh, c.health + e.heal);
    if (e.staminaGain) c.stamina = Math.min(maxStamina(c), c.stamina + e.staminaGain);
    ev.push({ t: 'heal', side: si, amount: c.health - before, snap: snap(b, c) });
  }
}

function doSwap(b: Battle, si: 0 | 1, to: number, ev: BEvent[]) {
  const side = b.sides[si];
  const partner = activeOf(side);
  const alpha = side.team[to];
  if (!alpha || alpha.ko) return;
  side.active = to;
  noteFoe(b);
  side.mods = {};
  side.zeroIn = 0;
  if (!b.participants.includes(alpha.uid) && si === 0) b.participants.push(alpha.uid);
  ev.push({ t: 'send', side: si, idx: to, snap: snap(b, alpha) });
  const powerId = speciesOf(alpha).affinity;
  const power = AFFINITIES[powerId];
  const aff = (alpha.affinity[partner.uid] ?? 0);
  alpha.affinity[partner.uid] = Math.min(9, aff + 1);
  partner.affinity[alpha.uid] = Math.min(9, (partner.affinity[alpha.uid] ?? 0) + 1);
  const bonus = Math.floor(aff / 3);
  ev.push({ t: 'use', side: si, name: `${power.name}`, move: powerId, kind: 'affinity', type: speciesOf(partner).types[0] });
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const foe = activeOf(b.sides[fi]);
  const pst = stats(partner);
  const hitFoe = (dmg: number, mult = 1) => {
    const d = mult === 0 ? 0 : Math.max(1, Math.floor(dmg * mult));
    applyDamage(foe, d);
    ev.push({ t: 'damage', side: fi, amount: d, eff: mult, crit: false, snap: snap(b, foe) });
    if (foe.ko) handleKO(b, fi, ev);
  };
  switch (power.mode) {
    case 'tagStrike': {
      const t = speciesOf(partner).types[0];
      const v = roll(6);
      const need = eff(b, fi, 'evasion');
      ev.push({ t: 'roll', side: si, die: 6, value: v, need, hit: v >= need, crit: false, label: `${TYPE_LABEL[t]} Tag Strike` });
      if (v >= need) hitFoe(roll(6) + pst.focus + bonus - eff(b, fi, 'ward'), effectiveness(t, speciesOf(foe).types));
      else ev.push({ t: 'say', text: 'The tag strike missed!', tone: 'info' });
      break;
    }
    case 'shieldPass': {
      addMod(b, si, 'armor', Math.ceil(pst.armor / 2) + bonus);
      addMod(b, si, 'ward', Math.ceil(pst.ward / 2) + bonus);
      ev.push({ t: 'buff', side: si, text: `borrowed +${Math.ceil(pst.armor / 2) + bonus} armor, +${Math.ceil(pst.ward / 2) + bonus} ward` });
      hitFoe(Math.max(1, roll(4) + eff(b, si, 'power') - eff(b, fi, 'armor')));
      break;
    }
    case 'slipstream':
      hitFoe(Math.max(1, roll(4) + eff(b, si, 'power') + Math.floor(pst.speed / 3) + bonus - eff(b, fi, 'armor')));
      break;
    case 'siphon': {
      const t = speciesOf(alpha).types[0];
      hitFoe(Math.max(1, roll(4) + eff(b, si, 'focus') - eff(b, fi, 'ward')), effectiveness(t, speciesOf(foe).types));
      const heal = Math.ceil(pst.vigor / 2) + bonus;
      alpha.health = Math.min(maxHealth(alpha), alpha.health + heal);
      ev.push({ t: 'heal', side: si, amount: heal, snap: snap(b, alpha) });
      break;
    }
    case 'rally':
      alpha.stamina = maxStamina(alpha);
      partner.stamina = maxStamina(partner);
      addMod(b, si, 'power', 1 + (bonus > 0 ? 1 : 0));
      addMod(b, si, 'focus', 1 + (bonus > 0 ? 1 : 0));
      ev.push({ t: 'buff', side: si, text: `+${1 + (bonus > 0 ? 1 : 0)} power & focus, stamina restored` });
      break;
  }
}

/**
 * End-of-battle XP: every player creature that took part earns participation XP, win or lose
 * (KO'd ones too), scaled by the toughest opponent. Running away earns nothing. KO bonuses are
 * awarded separately, at the moment of each knockout.
 */
/** Every participant's XP for taking part, win or lose; trainer battles add TRAINER_BATTLE_XP_BONUS on top. */
function awardBattleXp(b: Battle, ev: BEvent[]) {
  const foeLevel = Math.max(...b.sides[1].team.map((c) => c.level));
  const bonus = b.sides[1].kind === 'wild' ? 0 : TRAINER_BATTLE_XP_BONUS;
  for (const uid of b.participants) {
    const c = b.sides[0].team.find((x) => x.uid === uid);
    if (!c) continue;
    const xp = Math.max(1, participationXp(c.level, foeLevel) + bonus + (b.sides[0].xpBonus ?? 0));
    ev.push({ t: 'xp', uid, amount: xp, levels: gainXp(c, xp), reason: 'battle', ...(bonus ? { bonus } : {}) });
  }
}

function handleKO(b: Battle, loser: 0 | 1, ev: BEvent[]) {
  const ls = b.sides[loser];
  const ws = b.sides[loser === 0 ? 1 : 0];
  const dead = activeOf(ls);
  const winner = activeOf(ws);
  if (ev.some((e) => e.t === 'ko' && e.uid === dead.uid)) return;
  delete b.status[dead.uid];
  ev.push({ t: 'ko', side: loser, uid: dead.uid });
  if (loser === 1) b.foeKOs = (b.foeKOs ?? 0) + 1;
  ev.push({ t: 'say', text: `${nameOf(dead)} was knocked out!`, tone: loser === 0 ? 'bad' : 'good' });
  dead.losses++;
  if (!winner.ko) {
    winner.health = maxHealth(winner); // victor restores Health (not Vitality)
    winner.wins++;
    ev.push({ t: 'heal', side: loser === 0 ? 1 : 0, amount: 0, snap: snap(b, winner) });
  }
  if (loser === 1 && !winner.ko) {
    const xp = xpForWin(winner.level, dead.level);
    const lv = gainXp(winner, xp);
    winner.morale = Math.min(10, winner.morale + 1);
    ev.push({ t: 'xp', uid: winner.uid, amount: xp, levels: lv, reason: 'ko', foe: nameOf(dead) });
  }
  if (loser === 0) dead.morale = Math.max(0, dead.morale - 1);

  const next = ls.team.findIndex((c) => !c.ko);
  if (next < 0) {
    b.over = loser === 1 ? 'win' : 'lose';
    awardBattleXp(b, ev);
    ev.push({ t: 'end', result: b.over });
    return;
  }
  if (loser === 1 && b.foeChooses) {
    b.foeNeedSwap = true;
  } else if (loser === 1) {
    ls.active = next;
    noteFoe(b);
    ls.mods = {};
    ls.zeroIn = 0;
    ev.push({ t: 'send', side: 1, idx: next, snap: snap(b, ls.team[next]) });
    ev.push({ t: 'say', text: `${ls.name} sends out ${nameOf(ls.team[next])}!`, tone: 'info' });
  } else {
    b.needSwap = true;
  }
}

/** Before round 1: the trainer picks which creature leads (used when nobody is Following). */
export function chooseLead(b: Battle, idx: number) {
  const s = b.sides[0];
  if (b.round > 0 || !s.team[idx] || s.team[idx].ko) return;
  const prev = activeOf(s).uid;
  s.active = idx;
  b.participants = b.participants.filter((u) => u !== prev);
  if (!b.participants.includes(s.team[idx].uid)) b.participants.push(s.team[idx].uid);
}

/** Side 1's creatures that could replace a knocked-out active one (team indexes). */
export function foeReplacements(b: Battle): number[] {
  return b.sides[1].team.map((c, i) => (c.ko ? -1 : i)).filter((i) => i >= 0);
}

/** A human picks side 1's replacement after a KO (duels). An illegal index sends the next in line. */
export function foeSendIn(b: Battle, idx: number): BEvent[] {
  const s = b.sides[1];
  if (!b.foeNeedSwap) return [];
  const ok = foeReplacements(b);
  if (!ok.length) return [];
  const i = ok.includes(idx) ? idx : ok[0];
  s.active = i;
  s.mods = {};
  s.zeroIn = 0;
  b.foeNeedSwap = false;
  noteFoe(b);
  return [
    { t: 'send', side: 1, idx: i, snap: snap(b, s.team[i]) },
    { t: 'say', text: `${s.name} sends out ${nameOf(s.team[i])}!`, tone: 'info' },
  ];
}

/** Player picks a replacement after a KO (no affinity trigger). */
export function sendIn(b: Battle, idx: number): BEvent[] {
  const s = b.sides[0];
  s.active = idx;
  s.mods = {};
  s.zeroIn = 0;
  b.needSwap = false;
  if (!b.participants.includes(s.team[idx].uid)) b.participants.push(s.team[idx].uid);
  return [{ t: 'send', side: 0, idx, snap: snap(b, s.team[idx]) }];
}

function endOfRound(b: Battle, ev: BEvent[]) {
  for (const si of [0, 1] as const) {
    if (b.over) return;
    const c = activeOf(b.sides[si]);
    if (c.ko) continue;
    const st = b.status[c.uid];
    if (st?.id === 'burn') {
      applyDamage(c, 1);
      ev.push({ t: 'say', text: `${nameOf(c)} is hurt by its Burn.`, tone: 'info' });
      ev.push({ t: 'damage', side: si, amount: 1, eff: 1, crit: false, snap: snap(b, c) });
      if (c.ko) { handleKO(b, si, ev); continue; }
    }
    if (st) { st.turns--; if (st.turns <= 0) { delete b.status[c.uid]; ev.push({ t: 'say', text: `${nameOf(c)} shook off ${STATUS_INFO[st.id].name}.` }); ev.push({ t: 'heal', side: si, amount: 0, snap: snap(b, c) }); } }
  }
  if (b.arena && !b.over) arenaTrick(b, ev);
  if (b.legendary && !b.over && !b.fleeWarned) {
    const me = activeOf(b.sides[0]);
    const v = roll(20) + me.level;
    if (v < 20) {
      b.fleeWarned = true;
      ev.push({ t: 'roll', side: 0, die: 20, value: v, need: 20, hit: false, crit: false, label: `Hold attention (d20 + Lv ${me.level})` });
      ev.push({ t: 'say', text: `${nameOf(activeOf(b.sides[1]))} looks like it's trying to get away! Stop it this round!`, tone: 'bad' });
    }
  }
}

/**
 * Cliff's Crumbling Plateau is a timer: it shrinks every round, and when it's gone the challenger is
 * rung out (loses) if Cliff still has a creature standing. Rounds allowed by Tier: 10, 10, 9, 9, 8.
 */
export const ringRounds = (tier: number) => [10, 10, 9, 9, 8][Math.max(1, Math.min(5, tier)) - 1];
/** Rounds left on the plateau before the ring-out (counts down as rounds end). */
export const ringLeft = (b: Battle) => (b.arena?.trick === 'crumble' ? Math.max(0, ringRounds(b.arena.tier) - b.round) : null);

function arenaTrick(b: Battle, ev: BEvent[]) {
  const a = b.arena!;
  const t = a.tier;
  const hurt = (si: 0 | 1, dmg: number, text: string, type?: ElementType) => {
    const c = activeOf(b.sides[si]);
    if (c.ko || b.over) return;
    const mult = type ? effectiveness(type, speciesOf(c).types) : 1;
    const d = mult === 0 ? 0 : Math.max(1, Math.floor(dmg * mult));
    if (d <= 0) return;
    applyDamage(c, d);
    ev.push({ t: 'arena', text: text.replace('{n}', nameOf(c)) });
    ev.push({ t: 'damage', side: si, amount: d, eff: mult, crit: false, snap: snap(b, c) });
    if (c.ko) handleKO(b, si, ev);
  };
  const hasType = (si: 0 | 1, ty: ElementType) => speciesOf(activeOf(b.sides[si])).types.includes(ty);
  /** Restore Health (within the current heart) to a side's active creature. */
  const mend = (si: 0 | 1, amount: number, text: string) => {
    const c = activeOf(b.sides[si]);
    if (c.ko || b.over) return;
    const healed = Math.max(0, Math.min(amount, maxHealth(c) - c.health));
    c.health += healed;
    ev.push({ t: 'arena', text: text.replace('{n}', nameOf(c)) });
    ev.push({ t: 'heal', side: si, amount: healed, snap: snap(b, c) });
  };
  switch (a.trick) {
    case 'iceFloes':
      for (const si of [0, 1] as const) if (!hasType(si, 'astral') && roll(6) <= (t >= 3 ? 2 : 1)) hurt(si, 1 + Math.floor(t / 2), '{n} slipped off the ice floe into the frigid water!');
      break;
    case 'volts':
      // the great rod discharges across the arena: Electric creatures (dual types too) drink it in, everyone else is shocked
      if (roll(6) <= 2 + Math.floor(t / 2)) {
        const n = 1 + Math.floor(t / 2);
        for (const si of [0, 1] as const) {
          if (hasType(si, 'electric')) mend(si, n, 'The Thunder Spike discharges, and {n} soaks up the current!');
          else hurt(si, n, 'The Thunder Spike discharges into {n}!', 'electric');
        }
      }
      break;
    case 'flames':
      if (b.round % 2 === 0) for (const si of [0, 1] as const) if (!hasType(si, 'fire')) hurt(si, 1 + Math.floor(t / 3), 'Scalding steam vents blast {n}!');
      break;
    case 'crumble': {
      const total = ringRounds(t), left = Math.max(0, total - b.round);
      ev.push({ t: 'ring', left, total });
      if (left === 0) {
        ev.push({ t: 'arena', text: 'The last of the plateau crumbles away. You’re rung out!' });
        b.over = 'lose';
        awardBattleXp(b, ev);
        ev.push({ t: 'end', result: 'lose' });
      } else if (left <= 2) ev.push({ t: 'arena', text: left === 1 ? 'The plateau is almost gone: one round left!' : 'The plateau edges fall away: two rounds left!' });
      break;
    }
    default: break;
  }
}

export function speciesName(id: string) { return SPECIES_BY_ID[id]?.name ?? id; }
