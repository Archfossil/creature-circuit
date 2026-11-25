import type { ElementType, Move, StatKey, Stats, StatusId, WeatherDef } from '../data/schema';
import { BURN_DAMAGE, MOVE_BY_ID, CATCH_BREATH, STATUS_INFO, ZERO_IN_MAX, zeroInOf, damageDice, avgRoll, statusChance, statusFaces, statusRollText, purgeBonus, cascadeDie, critFrom, critFaces } from '../data/moves';
import { SWAP_STATUS_ON, describeSwap, swapChart, swapStatus, type SwapEffect, type SwapHit, type SwapMove, type SwapVals } from '../data/swapMoves';
import { effectiveness } from '../data/types';
import { SPECIES_BY_ID } from '../data/species';
import { activeRegion } from '../regions/active';
import type { ArenaCountdown, ArenaEffect } from '../regions/types';
import type { CreatureInst, BattleStatus } from './creature';
import { stats, moveWorth, healthFraction, STATUS_WORTH, HEART, maxHealth, totalHealth, maxTotal, maxStamina, STAT_KEYS, STAT_LABEL, nameOf, speciesOf, instinctIdOf, gainXp, xpForWin, participationXp, TRAINER_BATTLE_XP_BONUS } from './creature';
import { roll, clashDie } from './dice';
import { addTeamwork, teamworkOf, teamworkCap, TEAMWORK_PER_SWAP, type TeamworkRise } from './teamwork';
import { swapMoveOf, swapVals } from './swaps';
import { INSTINCT_BY_ID, INSTINCT_ICON, type Instinct, type InstinctEffect, type InstinctMoment } from '../data/instincts';

export type SideKind = 'player' | 'wild' | 'trainer' | 'arbiter' | 'champion';

export interface Side {
  kind: SideKind;
  name: string;
  /** The Rival or Champion this is (data/npcs.ts). */
  npc?: string;
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
  arena?: { trick: string; tier: number; city: string };
  legendary: boolean;
  fleeWarned: boolean;
  status: Record<string, BattleStatus>;
  over: null | 'win' | 'lose' | 'escaped' | 'fled';
  /** Its result is in the World Log. */
  recorded?: boolean;
  /** The side whose trainer surrendered. */
  surrendered?: 0 | 1;
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
  /** The round side 1's AI last swapped. */
  aiSwapped?: number;
  /** The AI's last move per creature and how many times in a row it used it (to keep it from spamming one move). */
  aiLast?: Record<string, { move: string; streak: number }>;
  /** Teamwork: the pairs (sorted uids joined by '|') that already earned Teamwork from a swap this battle. */
  teamworkPairs?: string[];
  /** Teamwork that side 0's pairs earned from swaps this battle (announced when the battle ends). */
  teamworkGains?: TeamworkRise[];
  /** Side 1's active creature is knocked out and waiting for foeSendIn. */
  foeNeedSwap?: boolean;
  /** Once-a-battle Instincts already used, as "<uid>:<instinct id>". */
  instinctUsed?: string[];
  /**
   * Overheal by creature uid: Health a move, Swap Move or Instinct healed beyond full, kept as a buffer that
   * soaks up damage before Health does (capped at half a heart; lasts the battle). See `mend`.
   */
  overheal?: Record<string, number>;
}

export type Action = { kind: 'move'; move: string } | { kind: 'swap'; to: number } | { kind: 'run' } | { kind: 'surrender' };

export interface Snap { uid: string; health: number; vitality: number; stamina: number; fatigue: number; ko: boolean; status?: StatusId; /** Zeroing In bonus waiting for its next accuracy roll. */ zero?: number; /** Overheal: extra Health beyond full that soaks up damage first. */ over?: number; /** On the field: attributes above or below normal right now. */ boosts?: Boost[] }
/** An attribute's change on the field: `n` in all, and where it comes from. */
export interface Boost { stat: StatKey; n: number; parts: Part[] }
export type BEvent =
  | { t: 'say'; text: string; tone?: 'good' | 'bad' | 'info' }
  /** A speed tie. `first`: who acts first (the higher roller, or on equal rolls the winner of a coin flip, `coin`). */
  | { t: 'clash'; dice: [number, number]; rolls: [number, number]; loser: 0 | 1 | null; dmg: number; first: 0 | 1; coin?: boolean }
  | { t: 'use'; side: 0 | 1; name: string; move: string; type?: ElementType; kind: Move['kind'] | 'swap' }
  | { t: 'roll'; side: 0 | 1; die: number; value: number; need: number; hit: boolean; crit: boolean; label: string; natural?: number; mods?: Part[] }
  | { t: 'damage'; side: 0 | 1; amount: number; eff: number; crit: boolean; snap: Snap; calc?: DamageCalc }
  | { t: 'heal'; side: 0 | 1; amount: number; snap: Snap }
  | { t: 'status'; side: 0 | 1; status: StatusId; snap: Snap }
  | { t: 'buff'; side: 0 | 1; text: string; snap?: Snap }
  /** Zeroing In changed: a miss built it up (bonus > 0) or the next accuracy roll used it (bonus 0). */
  | { t: 'zero'; side: 0 | 1; bonus: number; gained: number; snap: Snap }
  | { t: 'tired'; side: 0 | 1; value: number; fatigue: number; fail: boolean; snap: Snap }
  /** A creature's Stamina changed (a move's Effort, or a refill), so its plate can show the new value. */
  | { t: 'stamina'; side: 0 | 1; snap: Snap }
  | { t: 'ko'; side: 0 | 1; uid: string }
  | { t: 'send'; side: 0 | 1; idx: number; snap: Snap }
  | { t: 'xp'; uid: string; amount: number; levels: number; reason: 'ko' | 'battle'; foe?: string; bonus?: number }
  | { t: 'arena'; text: string }
  /** An arena's timer: rounds left before the challenger is rung out (of `total`). */
  | { t: 'ring'; left: number; total: number }
  | { t: 'end'; result: NonNullable<Battle['over']>; surrendered?: 0 | 1 };

/** One labelled number in a roll or damage formula, e.g. { label: 'Power', value: 3 }. */
export interface Part { label: string; value: number }
/** How a move's damage was worked out, so the battle UI can show the formula. */
/** `dice` are the damage dice rolled (empty for flat damage) and `rolls` what each showed. */
export interface DamageCalc {
  dice: number[]; rolls: number[]; parts: Part[]; raw: number; mult: number; crit: boolean; total: number;
  /** Cascade chains, by damage die (same order as `dice`): the die chained with and what each roll showed. Absent when nothing cascaded. */
  cascade?: ({ die: number; rolls: number[] } | null)[];
}

export function snap(b: Battle, c: CreatureInst): Snap {
  const si = b.sides.findIndex((s) => activeOf(s) === c);
  const sd = b.sides[si];
  const over = b.overheal?.[c.uid] ?? 0;
  const boosts = si < 0 || c.ko ? [] : boostsOf(b, si as 0 | 1);
  return { uid: c.uid, health: c.health, vitality: c.vitality, stamina: c.stamina, fatigue: c.fatigue, ko: c.ko, status: b.status[c.uid]?.id, ...(sd?.zeroIn ? { zero: sd.zeroIn } : {}), ...(over ? { over } : {}), ...(boosts.length ? { boosts } : {}) };
}

// ── Overheal ────────────────────────────────────────────────────
/** The most Overheal a creature can hold: half a heart, rounded up. */
export const overhealCap = (c: CreatureInst) => Math.ceil(maxHealth(c) / 2);
/** A creature's Overheal right now. */
export const overhealOf = (b: Battle, c: CreatureInst) => b.overheal?.[c.uid] ?? 0;

/**
 * Heal `c` by `n` (healing moves, Swap Moves and Instincts): Health first, up to full; whatever is left
 * over becomes Overheal, up to the cap. Returns how much went to each. (Arena heals don't overheal.)
 */
function mend(b: Battle, c: CreatureInst, n: number): { healed: number; over: number } {
  if (c.ko || n <= 0) return { healed: 0, over: 0 };
  const healed = Math.max(0, Math.min(n, maxHealth(c) - c.health));
  c.health += healed;
  const have = overhealOf(b, c);
  const over = Math.max(0, Math.min(n - healed, overhealCap(c) - have));
  if (over) (b.overheal ??= {})[c.uid] = have + over;
  return { healed, over };
}
/** "Sproutle heals 2." / "Sproutle is overhealed: +2 Overheal (3 in all)." */
function mendText(b: Battle, c: CreatureInst, r: { healed: number; over: number }): string {
  const name = nameOf(c);
  if (!r.over) return `${name} recovers ${r.healed} Health.`;
  return `${name} ${r.healed ? `recovers ${r.healed} Health and ` : 'has a full heart: '}gains +${r.over} Overheal (${overhealOf(b, c)} in all), which soaks up damage first.`;
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
  // Hot pot Vigor buff: a heart's worth of extra Health per point, as Overheal, for this battle
  if (player.buff?.vigor) for (const c of player.team) if (!c.ko) (b.overheal ??= {})[c.uid] = player.buff.vigor * HEART;
  b.participants.push(activeOf(player).uid);
  noteFoe(b);
  return b;
}

// ── Effective stats ─────────────────────────────────────────────
function eff(b: Battle, si: 0 | 1, k: StatKey): number {
  const side = b.sides[si];
  const c = activeOf(side);
  let v = stats(c, side.buff)[k];
  for (const p of effParts(b, si, k)) v += p.value;
  if (k === 'evasion') return Math.max(1, Math.min(v, 6));
  return Math.max(0, v);
}

/** What changes side `si`'s active creature's attribute in this battle (a Nabe apart: it's part of its stats). */
function effParts(b: Battle, si: 0 | 1, k: StatKey): Part[] {
  const side = b.sides[si];
  const c = activeOf(side);
  const out: Part[] = [];
  const add = (label: string, value?: number) => { if (value) out.push({ label, value }); };
  add('Moves and Instincts', side.mods[k]);
  if (k === 'speed') add(b.weather.name, b.weather.speed);
  if (k === 'evasion') add(b.weather.name, b.weather.evasion);
  const st = b.status[c.uid]?.id;
  if (st === 'soak' && k === 'speed') add(STATUS_INFO[st].name, -2);
  if (st === 'snare' && (k === 'speed' || k === 'evasion')) add(STATUS_INFO[st].name, -1);
  if (st === 'stagger' && (k === 'power' || k === 'focus')) add(STATUS_INFO[st].name, -1);
  if (st === 'sunder' && (k === 'armor' || k === 'ward')) add(STATUS_INFO[st].name, -1);
  // Instincts: weather boosts, last-heart surges
  const inst = instinctOf(c), p = inst?.passive;
  if (p?.weather?.ids.includes(b.weather.id)) add(`${inst!.name} (${b.weather.name})`, p.weather.mods[k]);
  if (p?.lastHeart && c.vitality === 0) add(`${inst!.name} (last heart)`, p.lastHeart[k]);
  if (b.arena) add('The arena', arenaOf(b)?.stat?.(b.arena.tier, si, k));
  return out;
}
/** The attributes that can be up or down on the field (Vigor and Stamina show on their own bars). */
const BOOSTABLE: StatKey[] = ['power', 'armor', 'focus', 'ward', 'speed', 'evasion'];
/** Side `si`'s active creature's attributes that are above or below normal right now (after the limits on them). */
export function boostsOf(b: Battle, si: 0 | 1): Boost[] {
  const side = b.sides[si], c = activeOf(side), base = stats(c);
  return BOOSTABLE.flatMap((stat) => {
    const n = eff(b, si, stat) - base[stat];
    const nabe = side.buff?.[stat];
    return n ? [{ stat, n, parts: [...(nabe ? [{ label: 'Nabe', value: nabe }] : []), ...effParts(b, si, stat)] }] : [];
  });
}
function pushBuff(b: Battle, side: 0 | 1, text: string, ev: BEvent[]) { const e: BEvent = { t: 'buff', side, text, snap: snap(b, activeOf(b.sides[side])) }; ev.push(e); }

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

// ── Instincts (data/instincts.ts) ───────────────────────────────
/** A creature's Instinct: its species' battle passive. */
export const instinctOf = (c: CreatureInst): Instinct | undefined => INSTINCT_BY_ID[instinctIdOf(c)];
const passiveOf = (c: CreatureInst) => instinctOf(c)?.passive;

/** Use up a once-a-battle Instinct. False if it was already used this battle. */
function spendOnce(b: Battle, c: CreatureInst, id: string): boolean {
  const key = `${c.uid}:${id}`;
  if ((b.instinctUsed ??= []).includes(key)) return false;
  b.instinctUsed.push(key);
  return true;
}

/** Fire side `si`'s active creature's Instinct, if it triggers at this moment. */
function fireInstinct(b: Battle, si: 0 | 1, on: InstinctMoment, ev: BEvent[]) {
  if (b.over) return;
  const c = activeOf(b.sides[si]);
  const inst = c && instinctOf(c), t = inst?.trigger;
  if (!inst || !t || t.on !== on || c.ko) return;
  if (t.chance && roll(6) > t.chance) return;
  if (t.once && !spendOnce(b, c, inst.id)) return;
  ev.push({ t: 'say', text: `${INSTINCT_ICON} ${nameOf(c)}’s ${inst.name}!`, tone: si === 0 ? 'good' : 'info' });
  for (const e of t.effects) {
    if (b.over) return;
    instinctEffect(b, si, e, ev);
  }
}

function instinctEffect(b: Battle, si: 0 | 1, e: InstinctEffect, ev: BEvent[]) {
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const c = activeOf(b.sides[si]), foe = activeOf(b.sides[fi]);
  switch (e.t) {
    case 'mod': {
      const side = e.who === 'self' ? si : fi;
      if (activeOf(b.sides[side]).ko) return;
      addMod(b, side, e.stat, e.n);
      pushBuff(b, side, `${e.n >= 0 ? '+' : '−'}${Math.abs(e.n)} ${STAT_LABEL[e.stat]}`, ev);
      return;
    }
    case 'status': afflict(b, fi, e.status, ev); return;
    case 'heal': {
      const r = mend(b, c, e.n);
      if (!r.healed && !r.over) return;
      ev.push({ t: 'heal', side: si, amount: r.healed + r.over, snap: snap(b, c) });
      if (r.over) ev.push({ t: 'say', text: mendText(b, c, r), tone: si === 0 ? 'good' : 'info' });
      return;
    }
    case 'refill':
      c.stamina = maxStamina(c);
      pushBuff(b, si, 'Stamina restored', ev);
      ev.push({ t: 'stamina', side: si, snap: snap(b, c) });
      return;
    case 'cure': {
      const st = b.status[c.uid];
      if (!st) return;
      delete b.status[c.uid];
      ev.push({ t: 'say', text: `${nameOf(c)} shook off ${STATUS_INFO[st.id].name}.`, tone: si === 0 ? 'good' : 'info' });
      ev.push({ t: 'heal', side: si, amount: 0, snap: snap(b, c) });
      return;
    }
    case 'sting': {
      if (foe.ko) return;
      const hit = takeHit(b, fi, e.n);
      ev.push({ t: 'damage', side: fi, amount: hit.dmg, eff: 1, crit: false, snap: snap(b, foe) });
      afterHit(b, fi, hit, false, ev);
      if (foe.ko) handleKO(b, fi, ev);
      return;
    }
  }
}

/** What a blow did: the damage actually dealt, hearts lost, whether Hold Fast kept it standing, and how much Overheal soaked up. */
interface Struck { dmg: number; hearts: number; held: boolean; soaked: number }

/** Deal `dmg` to side `si`'s active creature. A Hold-Fast-like Instinct turns the first knockout blow into a 1-Health survival. */
function takeHit(b: Battle, si: 0 | 1, dmg: number): Struck {
  const c = activeOf(b.sides[si]);
  const before = c.vitality;
  let held = false;
  const inst = instinctOf(c);
  const over = overhealOf(b, c);
  if (inst?.passive?.holdFast && !c.ko && dmg > 0) {
    const left = over + c.health + c.vitality * maxHealth(c);
    if (dmg >= left && spendOnce(b, c, inst.id)) { dmg = left - 1; held = true; }
  }
  // Overheal soaks up damage first
  const soaked = Math.min(over, dmg);
  if (soaked) b.overheal![c.uid] = over - soaked;
  applyDamage(c, dmg - soaked);
  return { dmg, hearts: before - c.vitality, held, soaked };
}

/** After a blow lands (and its damage is shown): Hold Fast's message, then heart-lost and on-hit Instincts. */
function afterHit(b: Battle, si: 0 | 1, s: Struck, physical: boolean, ev: BEvent[]) {
  const c = activeOf(b.sides[si]);
  if (s.soaked) ev.push({ t: 'say', text: `${nameOf(c)}’s Overheal soaks up ${s.soaked} damage${overhealOf(b, c) ? ` (${overhealOf(b, c)} left)` : ''}.`, tone: 'info' });
  if (s.held) ev.push({ t: 'say', text: `${INSTINCT_ICON} ${nameOf(c)}’s ${instinctOf(c)!.name}: it hangs on with 1 Health!`, tone: si === 0 ? 'good' : 'info' });
  if (c.ko || b.over) return;
  if (s.hearts > 0) fireInstinct(b, si, 'heartLost', ev);
  if (physical) fireInstinct(b, si, 'hitPhysical', ev);
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
    swaps: b.round >= 1 ? side.team.map((c, i) => ({ c, i })).filter((x) => !x.c.ko && x.i !== side.active).map(({ c, i }) => ({ i, name: nameOf(c), row: swapRowInfo(b, 1, i) })) : [],
    vs: speciesOf(activeOf(b.sides[0])).types,
    health: `${totalHealth(me)}/${maxTotal(me)}`, stamina: `${me.stamina}/${maxStamina(me)}`, fatigue: me.fatigue,
    lead: { name: nameOf(me), morale: me.morale, bond: me.bond },
  };
}
export type FoeOptions = ReturnType<typeof foeOptions>;

// ── The AI's swaps ──────────────────────────────────────────────
/** How much better (natural log of how the two would fare) a swap must look before each kind of trainer makes it. Others never swap. */
export const AI_SWAP_MARGIN: Partial<Record<SideKind, number>> = { trainer: 1.2, arbiter: 0.65, champion: 0.5 };
/** Rivals are readier to swap than other trainers. */
export const RIVAL_SWAP_MARGIN = 0.75;
/** Rounds a trainer waits between swaps. */
const AI_SWAP_REST = 2;
/** Bringing the Ace out early takes a better reason. */
const ACE_RELUCTANCE = 0.5;

/** The average damage a creature's best attack does to another (types, accuracy and crits included). */
function bestHit(st: Stats, c: CreatureInst, vs: Stats, foe: CreatureInst): number {
  const types = speciesOf(foe).types;
  return Math.max(0.5, ...c.playbook.map((id) => MOVE_BY_ID[id]).filter((m) => m && m.kind !== 'support')
    .map((m) => moveWorth(c, m, { types, armor: vs.armor - (st.power - stats(c).power), ward: vs.ward - (st.focus - stats(c).focus), evasion: vs.evasion })));
}
/**
 * How well a creature (a team index) would fare against the foe's active one, as the log of how many of its
 * hits the foe can take against how many of the foe's hits it can: 0 is even, more is better. For a creature
 * on the bench it counts what coming in costs (a hit on the way) and what its Swap Move does.
 */
export function outlook(b: Battle, si: 0 | 1, idx: number, opts: { free?: boolean } = {}): number {
  const side = b.sides[si], fi: 0 | 1 = si === 0 ? 1 : 0;
  const c = side.team[idx], foe = activeOf(b.sides[fi]);
  const here = idx === side.active;
  const mine = here ? statsOf(b, si) : stats(c, side.buff), theirs = statsOf(b, fi);
  const deal = bestHit(mine, c, theirs, foe), take = bestHit(theirs, foe, mine, c);
  let foeHp = totalHealth(foe) + overhealOf(b, foe), hp = totalHealth(c) + overhealOf(b, c);
  if (!here && !opts.free) {
    hp -= take * 0.9;
    const m = swapMoveOf(c, activeOf(side));
    if (m.hit) {
      const v = swapVals(c, activeOf(side), { f: theirs, foe });
      const chart = swapChart(m, v);
      const def = m.hit.kind === 'physical' ? theirs.armor : theirs.ward;
      foeHp -= (m.hit.acc ? hitChance(m.hit.acc, theirs.evasion) : 1) * Math.max(1, (m.hit.die + 1) / 2 + m.hit.parts(v).reduce((a, p) => a + p.value, 0) - def) * (chart ? effectiveness(chart, speciesOf(foe).types) : 1);
    }
    for (const e of [...(m.before ?? []), ...(m.after ?? [])]) if (e.t === 'heal' && e.who === 'alpha') hp += Math.min(3, e.n(swapVals(c, activeOf(side))));
  }
  if (hp <= 0) return -3;
  // weariness costs turns; being slower costs a hit
  const tired = 1 - Math.min(0.8, c.fatigue / 10);
  const first = mine.speed >= theirs.speed ? 0.5 : -0.5;
  return Math.log(((hp / take + first) * tired + 0.2) / (Math.max(0.5, foeHp) / deal + 0.2));
}
/** The team index the AI would rather have out, or null to carry on. */
export function aiSwap(b: Battle, si: 0 | 1): number | null {
  const side = b.sides[si];
  const margin = side.npc && side.kind === 'trainer' ? RIVAL_SWAP_MARGIN : AI_SWAP_MARGIN[side.kind];
  if (margin === undefined || b.foeChooses || b.round < 1 || b.round - (b.aiSwapped ?? -9) < AI_SWAP_REST) return null;
  const c = activeOf(side), foe = activeOf(b.sides[si === 0 ? 1 : 0]);
  // nothing to gain by rescuing one that's nearly down (its replacement comes in free), or leaving a foe that is
  if (healthFraction(c) < 0.25 || totalHealth(foe) <= 4) return null;
  const now = outlook(b, si, side.active);
  let best: number | null = null, gain = margin;
  side.team.forEach((x, i) => {
    if (x.ko || i === side.active) return;
    const g = outlook(b, si, i) - now - (x.ace ? ACE_RELUCTANCE : 0);
    if (g > gain) { gain = g; best = i; }
  });
  // (not every time: a little unpredictability)
  return best !== null && Math.random() < 0.85 ? best : null;
}
/** Who a Rival, Champion or Arbiter sends in after a knockout: whoever fares best, keeping the Ace for last. Anyone else sends the next in line. */
function aiReplacement(b: Battle): number {
  const s = b.sides[1];
  const left = s.team.map((_, i) => i).filter((i) => !s.team[i].ko);
  if (!s.npc && s.kind !== 'arbiter' && s.kind !== 'champion') return left[0];
  const pool = left.length > 1 ? left.filter((i) => !s.team[i].ace) : left;
  return [...pool].sort((x, y) => outlook(b, 1, y, { free: true }) - outlook(b, 1, x, { free: true }))[0] ?? left[0];
}

export function chooseAI(b: Battle, si: 0 | 1): Action {
  const side = b.sides[si];
  const c = activeOf(side);
  const to = aiSwap(b, si);
  if (to !== null) { b.aiSwapped = b.round; return { kind: 'swap', to }; }
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
      // buffs, debuffs and heals are worth what the situation makes them worth (see effectValue); a status move, what the status is
      const st = m.status && !statusBlock(b, fi, m.status) ? STATUS_WORTH[m.status] ?? 2 : 0;
      score = hit * (effectValue(b, si, m.effect) + st) * SUPPORT_WEIGHT * (finishingBlow ? 0.35 : 1) * (desperate && !m.effect?.heal ? 0.4 : 1);
    } else {
      const atk = (m.kind === 'physical' ? eff(b, si, 'power') - eff(b, fi, 'armor') : eff(b, si, 'focus') - eff(b, fi, 'ward')) + purgeBonus(m, b.status[foe.uid]?.id);
      const mult = m.kind === 'elemental' && m.type ? effectiveness(m.type, speciesOf(foe).types) : 1;
      score = hit * Math.max(1, avgRoll(m) + atk) * mult;
      // crits, the status it may leave, and the aim a miss would give the next attack
      const p = passiveOf(c);
      if (mult > 0 && critFaces(m) && typeof m.accuracy === 'number') score *= 1 + Math.min(1, Math.min(critFaces(m) + (p?.keen ?? 0), m.accuracy - 1) / Math.max(1, hit * m.accuracy));
      if (m.kind === 'elemental' && m.status && !finishingBlow && !statusBlock(b, fi, m.status)) score += hit * statusChance(m, p?.spread ? 1 : 0) * (STATUS_WORTH[m.status] ?? 2) * 0.7;
      if (m.effect) score += hit * effectValue(b, si, m.effect) * SUPPORT_WEIGHT * 0.5; // a rider on a hit
      // close to a knockout: landing first and landing at all matter more than how hard
      if (finishingBlow) score = Math.min(score, 8) * (0.6 + 0.4 * hit) + Math.max(0, m.speed) * 0.2;
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

/** Cascade chains stop after this many extra rolls (a safety cap; a d4 chaining 20 times is about 1 in a trillion). */
const CASCADE_MAX = 20;

/**
 * Why side `fi`'s active creature won't take `status` right now (null if it would): it already has a
 * status, its Instinct makes it immune, or its Instinct will shrug off the first status of the battle.
 */
export function statusBlock(b: Battle, fi: 0 | 1, status: StatusId): string | null {
  const c = activeOf(b.sides[fi]);
  const had = b.status[c.uid]?.id;
  if (had) return `${nameOf(c)} already has ${STATUS_INFO[had].name}, and a creature holds one status at a time.`;
  const inst = instinctOf(c), p = inst?.passive;
  if (p?.immune?.includes(status)) return `${nameOf(c)}’s ${inst!.name} makes it immune to ${STATUS_INFO[status].name}.`;
  if (p?.shrugFirst && !(b.instinctUsed ?? []).includes(`${c.uid}:${inst!.id}`)) return `${nameOf(c)}’s ${inst!.name} will shrug off the first status that would afflict it this battle.`;
  return null;
}

/**
 * The status protection a creature has from its Instinct, for its nameplate: what it's immune to,
 * and whether its shrug-off is still waiting. Null if none.
 */
export function statusGuard(b: Battle, c: CreatureInst): { label: string; text: string } | null {
  const inst = instinctOf(c), p = inst?.passive;
  if (!inst || !p) return null;
  const out: string[] = [];
  if (p.immune?.length) out.push(`immune to ${p.immune.map((s) => STATUS_INFO[s].name).join(' and ')}`);
  const shrug = p.shrugFirst && !(b.instinctUsed ?? []).includes(`${c.uid}:${inst.id}`);
  if (shrug) out.push('will shrug off the first status that would afflict it');
  if (!out.length) return null;
  return {
    label: p.immune?.length ? p.immune.map((s) => STATUS_INFO[s].icon).join('') : '🛡',
    text: `${inst.name}: ${out.join(', and ')}.`,
  };
}

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
    const healed = Math.min(e.heal, missing);
    v += healed * (me.vitality <= 1 ? 1.2 : 0.6);
    // the rest becomes Overheal: worth less than real Health, but not nothing
    v += Math.max(0, Math.min(e.heal - healed, overhealCap(me) - overhealOf(b, me))) * 0.3;
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
  if (pa.kind === 'surrender') return surrender(b, 0);
  if (foeAction?.kind === 'surrender') return surrender(b, 1);
  if (b.foeNeedSwap) ev.push(...foeSendIn(b, -1)); // nobody picked a replacement: the next in line goes
  b.round++;
  // the leads take the field as round 1 begins (after the trainer picked who leads)
  if (b.round === 1) for (const si of [0, 1] as const) fireInstinct(b, si, 'enter', ev);
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
    ev.push({ t: 'say', text: (b.hardRun && activeRegion().gimmicks.find((g) => g.apart?.noEscape)?.apart!.noEscape) || `Couldn't escape!`, tone: 'bad' });
  }

  const speedOf = (si: 0 | 1, a: Action | { kind: 'flee' }) => {
    let s = eff(b, si, 'speed');
    if (a.kind === 'move') s += (MOVE_BY_ID[a.move] ?? CATCH_BREATH).speed;
    if (a.kind === 'swap') {
      const inc = b.sides[si].team[a.to];
      s += swapMoveOf(inc, activeOf(b.sides[si])).speed ?? 0;
    }
    if (a.kind === 'flee') s = stats(activeOf(b.sides[si])).speed;
    else if (b.round === 1) s += passiveOf(activeOf(b.sides[si]))?.opener ?? 0;
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
    const dice: [number, number] = [clashDieOf(cs[0]), clashDieOf(cs[1])];
    const rolls: [number, number] = [roll(dice[0]), roll(dice[1])];
    let loser: 0 | 1 | null = null;
    let dmg = 0;
    if (rolls[0] !== rolls[1]) {
      loser = rolls[0] < rolls[1] ? 0 : 1;
      dmg = Math.abs(rolls[0] - rolls[1]);
    }
    // equal rolls: a coin flip decides who goes first (decided here so the UI can show it before anyone acts)
    const first: 0 | 1 = loser === 0 ? 1 : loser === 1 ? 0 : Math.random() < 0.5 ? 0 : 1;
    ev.push({ t: 'clash', dice, rolls, loser, dmg, first, ...(loser === null ? { coin: true } : {}) });
    if (loser !== null) {
      const hit = takeHit(b, loser, dmg);
      ev.push({ t: 'damage', side: loser, amount: hit.dmg, eff: 1, crit: false, snap: snap(b, cs[loser]) });
      afterHit(b, loser, hit, false, ev);
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
    else if (act.kind === 'move') useMove(b, si, MOVE_BY_ID[act.move] ?? CATCH_BREATH, ev);
  }

  if (!b.over) endOfRound(b, ev, order[0] === 0 ? 1 : 0);
  // both plates end the round as things stand (statuses wear off, for one)
  if (!b.over) for (const si of [0, 1] as const) { const c = activeOf(b.sides[si]); if (!c.ko) ev.push({ t: 'stamina', side: si, snap: snap(b, c) }); }
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
  const fatigued = c.stamina <= 0;
  if (fatigued) {
    c.fatigue++;
    c.stamina = maxStamina(c);
  }
  ev.push({ t: 'stamina', side: si, snap: snap(b, c) });
  if (fatigued) ev.push({ t: 'say', text: `${nameOf(c)} is fatigued (${c.fatigue}).`, tone: 'bad' });
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
    const die = accDie(b, si, m.accuracy);
    const natural = roll(die);
    const mods = accuracyMods(b, si);
    const v = natural + mods.reduce((a, p) => a + p.value, 0);
    const need = eff(b, fi, 'evasion');
    hit = v >= need;
    const critAt = critOn(b, si, m, die);
    crit = hit && critAt > 0 && natural >= critAt;
    ev.push({ t: 'roll', side: si, die, value: v, need, hit, crit, label: 'Accuracy', natural, mods });
    // Zeroing In: the roll uses up any bonus; a miss builds it back up (stacking over a streak of misses).
    // Against a Shadow-like Instinct it's neither used nor built.
    if (!passiveOf(foe)?.shroud) {
      const had = side.zeroIn ?? 0;
      const gain = hit ? 0 : zeroGain(b, si, m);
      side.zeroIn = gain ? Math.min(ZERO_IN_MAX, had + gain) : 0;
      if (had || side.zeroIn) ev.push({ t: 'zero', side: si, bonus: side.zeroIn, gained: side.zeroIn - (gain ? had : 0), snap: snap(b, c) });
    }
  }
  if (!hit) { ev.push({ t: 'say', text: `${m.name} missed!`, tone: 'info' }); fireInstinct(b, si, 'miss', ev); return; }

  if (m.kind === 'support') {
    if (m.status) {
      const had = b.status[foe.uid]?.id;
      if (had) ev.push({ t: 'say', text: `${nameOf(foe)} already has ${STATUS_INFO[had].name}, so ${m.name} can’t add ${STATUS_INFO[m.status].name}.`, tone: 'info' });
      else afflict(b, fi, m.status, ev);
    }
    applyEffects(b, si, m, ev);
    return;
  }

  // damage
  const dice = damageDice(m);
  const rolls = dice.map((d) => roll(d));
  // Cascade: a damage die on its top face rolls the cascade die and adds it, chaining while that rolls its top face
  const chains = dice.map((d, i) => {
    const cd = cascadeDie(m, d);
    if (!cd || rolls[i] !== d) return null;
    const out: number[] = [];
    do out.push(roll(cd)); while (out[out.length - 1] === cd && cd > 1 && out.length < CASCADE_MAX);
    return { die: cd, rolls: out };
  });
  const cascaded = chains.some(Boolean);
  const dmgRoll = rolls.reduce((a, r) => a + r, 0) + chains.reduce((a, ch) => a + (ch ? ch.rolls.reduce((x, y) => x + y, 0) : 0), 0);
  if (cascaded) {
    const total = chains.reduce((a, ch) => a + (ch?.rolls.length ?? 0), 0);
    ev.push({ t: 'say', text: `Cascade! ${chains.filter(Boolean).map((ch) => `d${ch!.die}: ${ch!.rolls.join(', ')}`).join('; ')}${total > 1 ? ` (${total} in a row!)` : ''}`, tone: si === 0 ? 'good' : 'bad' });
  }
  const parts = damageParts(b, si, m);
  const mult = typeMatchup(m, speciesOf(foe).types) ?? 1;
  const raw = Math.max(1, dmgRoll + parts.reduce((a, p) => a + p.value, 0));
  let dmg = mult === 0 ? 0 : Math.max(1, Math.floor(raw * mult));
  if (crit) dmg *= 2;
  const struck = takeHit(b, fi, dmg);
  dmg = struck.dmg;
  ev.push({ t: 'damage', side: fi, amount: dmg, eff: mult, crit, snap: snap(b, foe), calc: { dice, rolls, parts, raw, mult, crit, total: dmg, ...(cascaded ? { cascade: chains } : {}) } });
  if (mult >= 2) ev.push({ t: 'say', text: mult >= 4 ? 'Devastatingly effective!' : 'Super effective!', tone: 'good' });
  else if (mult === 0) ev.push({ t: 'say', text: `${nameOf(foe)} is immune!`, tone: 'info' });
  else if (mult < 1) ev.push({ t: 'say', text: 'It was resisted…', tone: 'info' });

  // status when any damage die shows a 1, up to 1 + Potency (one more with a Wildfire-like Instinct)
  const face = statusFaces(m, passiveOf(c)?.spread ? 1 : 0);
  if (m.kind === 'elemental' && m.status && rolls.some((r) => r <= face) && !foe.ko) afflict(b, fi, m.status, ev);
  if (m.effect) applyEffects(b, si, m, ev);
  afterHit(b, fi, struck, m.kind === 'physical', ev);
  if (foe.ko) handleKO(b, fi, ev);
}

/**
 * Modifiers to an accuracy roll (Beguile, the arena, Zeroing In). A steady Instinct (Fixed
 * Star) ignores the penalties; a foe with a shroud (Shadow) cancels Zeroing In.
 */
function accuracyMods(b: Battle, si: 0 | 1): Part[] {
  const c = activeOf(b.sides[si]);
  const foe = activeOf(b.sides[si === 0 ? 1 : 0]);
  const steady = !!passiveOf(c)?.steady;
  const out: Part[] = [];
  if (!steady && b.status[c.uid]?.id === 'beguile') out.push({ label: 'Beguile', value: -1 });
  const dark = arenaOf(b)?.accuracy, off = dark?.value(b.arena!.tier, si) ?? 0;
  if (off > 0 || (off < 0 && !steady)) out.push({ label: dark!.label, value: off });
  if (b.sides[si].zeroIn && !passiveOf(foe)?.shroud) out.push({ label: 'Zeroing In', value: b.sides[si].zeroIn! });
  return out;
}

/** The accuracy die after Daze shrinks it (a steady Instinct keeps it whole). */
function accDie(b: Battle, si: 0 | 1, die: number): number {
  const c = activeOf(b.sides[si]);
  return b.status[c.uid]?.id === 'daze' && !passiveOf(c)?.steady ? Math.max(4, die - 2) : die;
}
/** The lowest natural roll that crits (0: this move can't crit), widened by a keen Instinct. */
function critOn(b: Battle, si: 0 | 1, m: Move, die: number): number {
  const from = critFrom(m, die);
  return from > 0 ? Math.max(1, from - (passiveOf(activeOf(b.sides[si]))?.keen ?? 0)) : 0;
}
/** How much a miss Zeroes In (0 for all-or-nothing moves), plus a Lock-On-like Instinct. */
function zeroGain(b: Battle, si: 0 | 1, m: Move): number {
  const base = zeroInOf(m);
  return base ? base + (passiveOf(activeOf(b.sides[si]))?.zeroPlus ?? 0) : 0;
}
const DIE_SIZES = [4, 6, 8, 10, 12, 20];
/** A creature's Clash die: by level, one size bigger per point of a Hair-Trigger-like Instinct. */
function clashDieOf(c: CreatureInst): number {
  const d = clashDie(c.level), up = passiveOf(c)?.clash ?? 0;
  return up ? DIE_SIZES[Math.min(DIE_SIZES.length - 1, DIE_SIZES.indexOf(d) + up)] : d;
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
    const st = b.status[activeOf(b.sides[fi]).uid]?.id;
    const pb = purgeBonus(m, st);
    if (pb) parts.push({ label: m.purge!.status ? `Purge: ${STATUS_INFO[st!].name}` : `Purge (${STATUS_INFO[st!].name})`, value: pb });
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

  const opener = (s: 0 | 1) => (b.round === 0 ? passiveOf(activeOf(b.sides[s]))?.opener ?? 0 : 0);
  const base = eff(b, si, 'speed') + opener(si);
  const mySpeed = base + m.speed, foeSpeed = eff(b, fi, 'speed') + opener(fi);
  steps.push({
    icon: '⚡', title: 'Turn order', tone: mySpeed > foeSpeed ? 'good' : mySpeed < foeSpeed ? 'bad' : 'info',
    text: `Your Speed ${base}${m.speed ? ` ${sgn(m.speed)} (${m.name})` : ''} = ${mySpeed}, vs ${foeName}’s ${foeSpeed} before its own move’s modifier. ` +
      (mySpeed > foeSpeed ? 'You likely act first.' : mySpeed < foeSpeed ? 'You likely act second.'
        : `Likely a tie, which means a Clash: you roll a d${clashDieOf(c)} and the foe a d${clashDieOf(foe)}. The low roller takes the difference as damage and acts second.`),
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
    const die = accDie(b, si, m.accuracy);
    const critAt = critOn(b, si, m, die), shrouded = !!passiveOf(foe)?.shroud;
    const mods = accuracyMods(b, si), modSum = mods.reduce((a, p) => a + p.value, 0);
    const need = eff(b, fi, 'evasion');
    const hits = Array.from({ length: die }, (_, i) => i + 1).filter((v) => v + modSum >= need).length;
    const pct = Math.round((hits / die) * 100);
    steps.push({
      icon: '🎯', title: `Accuracy: d${die}${mods.length ? ` ${partsText(mods)}` : ''}`, tone: pct >= 67 ? 'good' : pct < 40 ? 'bad' : 'info',
      text: `${die !== m.accuracy ? `Daze shrinks the die from d${m.accuracy}. ` : ''}Need ${need}+ to beat ${foeName}’s Evasion ${need}: ${pct}% to hit.` +
        (critAt ? ` ${critAt === die ? `A natural ${die}` : `A natural ${critAt}–${die}`} is a critical hit: double damage.` : '') +
        (shrouded ? ` ${foeName}’s ${instinctOf(foe)!.name} stops you Zeroing In.`
          : zeroInOf(m) ? ` A miss zeroes in: +${Math.min(ZERO_IN_MAX, (b.sides[si].zeroIn ?? 0) + zeroGain(b, si, m))} to the next accuracy roll.` : ' All or nothing: a miss never zeroes in.'),
    });
  }

  if (m.kind !== 'support' || m.dmgDie > 0) {
    const parts = damageParts(b, si, m);
    const add = parts.reduce((a, p) => a + p.value, 0);
    const mult = typeMatchup(m, speciesOf(foe).types) ?? 1;
    const dmgFor = (r: number) => (mult === 0 ? 0 : Math.max(1, Math.floor(Math.max(1, r + add) * mult)));
    const dice = damageDice(m);
    const lo = dmgFor(dice.length), hi = dmgFor(dice.reduce((a, d) => a + d, 0));
    const chain = cascadeDie(m, dice[0] ?? 0);
    const dt = dice.map((d) => `d${d}`).join(' + ');
    const multText = mult === 1 ? '' : ` × ${mult} (${mult === 0 ? 'immune' : mult > 1 ? 'super effective' : 'resisted'})`;
    const range = (a: number, z: number) => (a === z ? `${a}` : `${a}–${z}`);
    const stat = m.kind === 'physical' ? 'add your Power and subtract the foe’s Armor (physical move)' : 'add your Focus and subtract the foe’s Ward (elemental move)';
    steps.push({
      icon: '💥', title: `Damage: ${[dt, partsText(parts)].join(' ').trim().replace(/^\+ /, '')}${multText}`,
      tone: mult > 1 ? 'good' : mult < 1 ? 'bad' : undefined,
      text: `${dice.length ? `Roll ${dice.length > 1 ? `${dt} and add them up` : `a ${dt}`}, then ` : ''}${stat}${multText ? `, then apply the type chart${multText}` : ''}. ` +
        `Deals ${range(lo, hi)}${chain ? '+' : ''} damage${critFaces(m) && hi > 0 ? `, or ${range(lo * 2, hi * 2)}${chain ? '+' : ''} on a crit` : ''}. ${foeName} has ${totalHealth(foe)}/${maxTotal(foe)} Health left.` +
        (chain ? ` Cascade: a top-face damage roll ${chain === dice[0] ? 'rolls again' : `rolls a d${chain}`} and adds it, and keeps going while that rolls its top face (no upper limit).` : ''),
    });
    if (m.kind === 'elemental' && m.status && m.dmgDie > 0) {
      const st = STATUS_INFO[m.status];
      const spread = passiveOf(c)?.spread ? 1 : 0;
      const chance = statusChance(m, spread);
      const why = [m.potency ? `Potency ${m.potency}` : '', spread ? instinctOf(c)!.name : ''].filter(Boolean).join(' and ');
      const block = statusBlock(b, fi, m.status);
      steps.push({
        icon: st.icon, title: `Status chance: ${st.name}${block ? ' (blocked)' : ''}`, tone: block ? 'bad' : undefined,
        text: block ? `${block} This hit won’t inflict ${st.name}.`
          : `If ${dice.length > 1 ? 'any damage die' : 'the damage die'} shows ${statusRollText(m, spread)}${why ? ` (${why})` : ''} (${Math.round(chance * 100)}% chance) and the foe has no status yet, it gets ${st.name} for 3 rounds. ${st.text}`,
      });
    }
    if (m.kind === 'elemental' && m.purge) {
      const fst = b.status[foe.uid]?.id, pb = purgeBonus(m, fst);
      const want = m.purge.status ? STATUS_INFO[m.purge.status].name : 'any status';
      steps.push({
        icon: '🧪', title: `Purge${m.purge.status ? `: ${STATUS_INFO[m.purge.status].name}` : ''} +${m.purge.n}`, tone: pb ? 'good' : undefined,
        text: pb ? `${foeName} has ${STATUS_INFO[fst!].name}: +${pb} damage (already in the sum above).` : `+${m.purge.n} damage against a foe with ${want}. ${foeName} ${fst ? `has ${STATUS_INFO[fst].name}, not ${want}` : 'has no status'}, so no bonus this time.`,
      });
    }
  }
  if (m.kind === 'support' && m.status) {
    const st = STATUS_INFO[m.status];
    const block = statusBlock(b, fi, m.status);
    steps.push({
      icon: st.icon, title: `Status: ${st.name}${block ? ' (blocked)' : ''}`, tone: block ? 'bad' : 'good',
      text: block ? `${block} A hit won’t inflict ${st.name}.` : `On a hit, ${foeName} gets ${st.name} for 3 rounds. No damage. ${st.text}`,
    });
  }
  const e = m.effect;
  if (e) {
    const fx: string[] = [];
    for (const [k, v] of Object.entries(e.self ?? {})) fx.push(`your ${k} ${sgn(v!)}`);
    for (const [k, v] of Object.entries(e.foe ?? {})) fx.push(`foe ${k} ${sgn(v!)}`);
    if (e.heal) fx.push(`heal ${e.heal} Health (beyond a full heart: Overheal)`);
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
  if (parts.length) pushBuff(b, si, parts.join(', '), ev);
  const fparts: string[] = [];
  for (const [k, v] of Object.entries(e.foe ?? {})) { addMod(b, fi, k as StatKey, v!); fparts.push(`${v} ${k}`); }
  if (fparts.length) pushBuff(b, fi, fparts.join(', '), ev);
  if (e.heal || e.staminaGain) {
    const r = e.heal ? mend(b, c, e.heal) : { healed: 0, over: 0 };
    if (e.staminaGain) c.stamina = Math.min(maxStamina(c), c.stamina + e.staminaGain);
    ev.push({ t: 'heal', side: si, amount: r.healed + r.over, snap: snap(b, c) });
    if (r.over) ev.push({ t: 'say', text: mendText(b, c, r), tone: si === 0 ? 'good' : 'info' });
  }
}

// ── Swap Moves (data/swapMoves.ts) ──────────────────────────────
const pairKey = (a: CreatureInst, b: CreatureInst) => [a.uid, b.uid].sort().join('|');
const statsOf = (b: Battle, si: 0 | 1): Stats => Object.fromEntries(STAT_KEYS.map((k) => [k, eff(b, si, k)])) as Stats;

/**
 * What swapping `to` in as the Alpha would do right now, for the swap screen: its Swap Move with this
 * partner, their Teamwork and the bonus it gives, whether this swap still earns Teamwork this battle,
 * and the move's effect with the numbers filled in.
 */
export function swapPreview(b: Battle, si: 0 | 1, to: number) {
  const side = b.sides[si];
  const partner = activeOf(side), alpha = side.team[to];
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const m = swapMoveOf(alpha, partner);
  const v = swapVals(alpha, partner, { a: stats(alpha, side.buff), f: statsOf(b, fi), foe: activeOf(b.sides[fi]) });
  const earned = (b.teamworkPairs ?? []).includes(pairKey(alpha, partner));
  const capped = teamworkOf(alpha, partner) >= teamworkCap(alpha, partner) && teamworkOf(partner, alpha) >= teamworkCap(alpha, partner);
  return { move: m, power: m.name, teamwork: teamworkOf(alpha, partner), bonus: v.bonus, earned, capped, effect: describeSwap(m, v), aType: v.aType, pType: v.pType };
}

/** Everything the swap screen shows for one incoming creature: a plain copy, so it can be sent to another browser. */
export function swapRowInfo(b: Battle, si: 0 | 1, to: number) {
  const { move, teamwork, bonus, earned, capped, effect, aType, pType } = swapPreview(b, si, to);
  const plain = (c: CreatureInst) => JSON.parse(JSON.stringify(c)) as CreatureInst;
  return { c: plain(b.sides[si].team[to]), partner: plain(activeOf(b.sides[si])), move: move.id, teamwork, bonus, earned, capped, effect, aType, pType };
}
export type SwapRowInfo = ReturnType<typeof swapRowInfo>;

function doSwap(b: Battle, si: 0 | 1, to: number, ev: BEvent[]) {
  const side = b.sides[si];
  const partner = activeOf(side);
  const alpha = side.team[to];
  if (!alpha || alpha.ko) return;
  const m = swapMoveOf(alpha, partner);
  side.active = to;
  noteFoe(b);
  side.mods = {};
  side.zeroIn = 0;
  if (!b.participants.includes(alpha.uid) && si === 0) b.participants.push(alpha.uid);
  ev.push({ t: 'send', side: si, idx: to, snap: snap(b, alpha) });
  fireInstinct(b, si, 'enter', ev);
  // the bonus uses the Teamwork from before this swap; a pair earns Teamwork from swapping once per battle
  const v = swapVals(alpha, partner, { foe: activeOf(b.sides[si === 0 ? 1 : 0]) });
  const key = pairKey(alpha, partner);
  if (!(b.teamworkPairs ??= []).includes(key)) {
    b.teamworkPairs.push(key);
    const rise = addTeamwork(alpha, partner, TEAMWORK_PER_SWAP);
    if (rise && si === 0) (b.teamworkGains ??= []).push(rise);
  }
  const chart = swapChart(m, v);
  ev.push({ t: 'use', side: si, name: m.name, move: m.id, kind: 'swap', type: chart ?? m.type });
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  // the Alpha's and foe's stats as they stand on the field now
  v.a = statsOf(b, si);
  v.f = statsOf(b, fi);
  for (const e of m.before ?? []) swapEffect(b, si, m, e, v, partner, ev);
  const foe = activeOf(b.sides[fi]);
  for (const h of [m.hit, m.second]) {
    // a second hit never carries over to the foe's replacement
    if (!h || b.over || foe.ko || activeOf(b.sides[fi]) !== foe) continue;
    v.a = statsOf(b, si);
    v.f = statsOf(b, fi);
    swapHit(b, si, m, h, v, ev);
  }
  if (!b.over) for (const e of m.after ?? []) swapEffect(b, si, m, e, v, partner, ev);
}

/**
 * Inflict a status on side `fi`'s creature, if it's standing and has none. Its Instinct may block it
 * (an immunity, or shrugging off the first status of the battle). True if it took hold.
 */
export function afflict(b: Battle, fi: 0 | 1, status: StatusId, ev: BEvent[]): boolean {
  const foe = activeOf(b.sides[fi]);
  if (foe.ko || b.status[foe.uid]) return false;
  const inst = instinctOf(foe), p = inst?.passive;
  if (p?.immune?.includes(status)) {
    ev.push({ t: 'say', text: `${INSTINCT_ICON} ${nameOf(foe)}’s ${inst!.name}: it can’t get ${STATUS_INFO[status].name}!`, tone: fi === 0 ? 'good' : 'info' });
    return false;
  }
  if (p?.shrugFirst && spendOnce(b, foe, inst!.id)) {
    ev.push({ t: 'say', text: `${INSTINCT_ICON} ${nameOf(foe)}’s ${inst!.name} turns ${STATUS_INFO[status].name} aside!`, tone: fi === 0 ? 'good' : 'info' });
    return false;
  }
  b.status[foe.uid] = { id: status, turns: 3 };
  ev.push({ t: 'status', side: fi, status, snap: snap(b, foe) });
  ev.push({ t: 'say', text: `${nameOf(foe)} is afflicted with ${STATUS_INFO[status].name}!`, tone: 'info' });
  return true;
}

function swapEffect(b: Battle, si: 0 | 1, m: SwapMove, e: SwapEffect, v: SwapVals, partner: CreatureInst, ev: BEvent[]) {
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const alpha = activeOf(b.sides[si]);
  switch (e.t) {
    case 'mod': {
      if (e.who === 'foe' && activeOf(b.sides[fi]).ko) return;
      const n = e.n(v);
      addMod(b, e.who === 'self' ? si : fi, e.stat, n);
      pushBuff(b, e.who === 'self' ? si : fi, `${n >= 0 ? '+' : '−'}${Math.abs(n)} ${STAT_LABEL[e.stat]}`, ev);
      return;
    }
    case 'heal': {
      const c = e.who === 'alpha' ? alpha : partner;
      if (c.ko) return;
      const r = mend(b, c, e.n(v));
      if (!r.healed && !r.over) return;
      if (c === alpha) {
        ev.push({ t: 'heal', side: si, amount: r.healed + r.over, snap: snap(b, alpha) });
        if (r.over) ev.push({ t: 'say', text: mendText(b, alpha, r), tone: si === 0 ? 'good' : 'info' });
      } else ev.push({ t: 'say', text: `${mendText(b, partner, r).replace(/\.$/, '')} on the bench.`, tone: 'good' });
      return;
    }
    case 'refill':
      alpha.stamina = maxStamina(alpha);
      partner.stamina = maxStamina(partner);
      pushBuff(b, si, 'Stamina restored', ev);
      ev.push({ t: 'stamina', side: si, snap: snap(b, alpha) });
      return;
    case 'ease':
      alpha.fatigue = Math.max(0, alpha.fatigue - 1);
      partner.fatigue = Math.max(0, partner.fatigue - 1);
      pushBuff(b, si, '−1 Fatigue', ev);
      ev.push({ t: 'stamina', side: si, snap: snap(b, alpha) });
      return;
    case 'status': {
      const st = swapStatus(m);
      if (st) afflict(b, fi, st, ev);
      return;
    }
  }
}

function swapHit(b: Battle, si: 0 | 1, m: SwapMove, h: SwapHit, v: SwapVals, ev: BEvent[]) {
  const fi: 0 | 1 = si === 0 ? 1 : 0;
  const foe = activeOf(b.sides[fi]);
  if (h.acc) {
    const die = accDie(b, si, h.acc);
    const natural = roll(die);
    const mods = accuracyMods(b, si);
    const value = natural + mods.reduce((a, p) => a + p.value, 0);
    const need = eff(b, fi, 'evasion');
    const hit = value >= need;
    ev.push({ t: 'roll', side: si, die, value, need, hit, crit: false, label: `${m.name} accuracy`, natural, mods });
    if (!hit) { ev.push({ t: 'say', text: `${m.name} missed!`, tone: 'info' }); fireInstinct(b, si, 'miss', ev); return; }
  }
  const def = h.kind === 'physical' ? 'armor' : 'ward';
  const parts: Part[] = [...h.parts(v), { label: `${nameOf(foe)}’s ${STAT_LABEL[def]}`, value: -eff(b, fi, def) }];
  const r = roll(h.die);
  const raw = Math.max(1, r + parts.reduce((a, p) => a + p.value, 0));
  const chart = swapChart(m, v, h);
  const mult = chart ? effectiveness(chart, speciesOf(foe).types) : 1;
  const struck = takeHit(b, fi, mult === 0 ? 0 : Math.max(1, Math.floor(raw * mult)));
  const dmg = struck.dmg;
  ev.push({ t: 'damage', side: fi, amount: dmg, eff: mult, crit: false, snap: snap(b, foe), calc: { dice: [h.die], rolls: [r], parts, raw, mult, crit: false, total: dmg } });
  if (mult >= 2) ev.push({ t: 'say', text: mult >= 4 ? 'Devastatingly effective!' : 'Super effective!', tone: 'good' });
  else if (mult === 0) ev.push({ t: 'say', text: `${nameOf(foe)} is immune!`, tone: 'info' });
  else if (mult < 1) ev.push({ t: 'say', text: 'It was resisted…', tone: 'info' });
  const st = h.status ? swapStatus(m) : undefined;
  if (st && r <= (h.statusOn ?? SWAP_STATUS_ON)) afflict(b, fi, st, ev);
  afterHit(b, fi, struck, h.kind === 'physical', ev);
  if (foe.ko) handleKO(b, fi, ev);
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

// ── Surrender ───────────────────────────────────────────────────
/** Morale the active creature loses when its trainer surrenders. */
export const SURRENDER_MORALE = 3;
/** Only battles with another trainer can be surrendered (you run from wild creatures). */
export const canSurrender = (b: Battle) => !b.over && !b.legendary && b.sides[1].kind !== 'wild';
/**
 * A side's trainer gives up: they lose, but nobody is knocked out for it. Their active creature takes it
 * hard. What else it costs is settled after the battle (world.ts → finishBattle, interactions.ts).
 */
export function surrender(b: Battle, side: 0 | 1): BEvent[] {
  const me = activeOf(b.sides[side]);
  if (!canSurrender(b) || me.ko) return [];
  const ev: BEvent[] = [];
  const lost = Math.min(me.morale, SURRENDER_MORALE);
  me.morale -= lost;
  b.surrendered = side;
  b.over = side === 0 ? 'lose' : 'win';
  b.needSwap = b.foeNeedSwap = false;
  ev.push({ t: 'say', text: `${b.sides[side].name} surrenders!`, tone: side === 0 ? 'bad' : 'good' });
  ev.push({ t: 'say', text: `${nameOf(me)} hangs its head: its trainer didn’t believe in it. (−${lost} Morale)`, tone: side === 0 ? 'bad' : 'info' });
  if (b.round > 0) awardBattleXp(b, ev); // nothing is learned from a battle given up before it began
  ev.push({ t: 'end', result: b.over, surrendered: side });
  return ev;
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
    winner.health = maxHealth(winner); // the victor refills its current heart (lost hearts stay lost)
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
  if (!winner.ko) fireInstinct(b, loser === 0 ? 1 : 0, 'ko', ev);
  if (loser === 1 && b.foeChooses) {
    b.foeNeedSwap = true;
  } else if (loser === 1) {
    const to = aiReplacement(b);
    ls.active = to;
    noteFoe(b);
    ls.mods = {};
    ls.zeroIn = 0;
    ev.push({ t: 'send', side: 1, idx: to, snap: snap(b, ls.team[to]) });
    ev.push({ t: 'say', text: `${ls.name} sends out ${nameOf(ls.team[to])}!`, tone: 'info' });
    fireInstinct(b, 1, 'enter', ev);
  } else {
    b.needSwap = true;
  }
}

/** Before round 1: a trainer picks which creature leads (used when nobody is Following; side 1 in a duel). */
export function chooseLead(b: Battle, idx: number, si: 0 | 1 = 0) {
  const s = b.sides[si];
  if (b.round > 0 || !s.team[idx] || s.team[idx].ko) return;
  if (si === 1) {
    s.active = idx;
    // only the creature that really leads has been seen or has fought
    b.seenFoes = [];
    b.foeParticipants = [];
    noteFoe(b);
    return;
  }
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
  const ev: BEvent[] = [
    { t: 'send', side: 1, idx: i, snap: snap(b, s.team[i]) },
    { t: 'say', text: `${s.name} sends out ${nameOf(s.team[i])}!`, tone: 'info' },
  ];
  fireInstinct(b, 1, 'enter', ev);
  return ev;
}

/** Player picks a replacement after a KO (no Swap Move). */
export function sendIn(b: Battle, idx: number): BEvent[] {
  const s = b.sides[0];
  s.active = idx;
  s.mods = {};
  s.zeroIn = 0;
  b.needSwap = false;
  if (!b.participants.includes(s.team[idx].uid)) b.participants.push(s.team[idx].uid);
  const ev: BEvent[] = [{ t: 'send', side: 0, idx, snap: snap(b, s.team[idx]) }];
  fireInstinct(b, 0, 'enter', ev);
  return ev;
}

/** Burn, end-of-round Instincts and statuses wearing off: the creature that moved slower this round goes first. */
function endOfRound(b: Battle, ev: BEvent[], slower: 0 | 1) {
  for (const si of slower ? [1, 0] as const : [0, 1] as const) {
    if (b.over) return;
    const c = activeOf(b.sides[si]);
    if (c.ko) continue;
    const st = b.status[c.uid];
    if (st?.id === 'burn') {
      const hit = takeHit(b, si, BURN_DAMAGE);
      ev.push({ t: 'say', text: `${nameOf(c)} is hurt by its Burn.`, tone: 'info' });
      ev.push({ t: 'damage', side: si, amount: hit.dmg, eff: 1, crit: false, snap: snap(b, c) });
      afterHit(b, si, hit, false, ev);
      if (c.ko) { handleKO(b, si, ev); continue; }
    }
    fireInstinct(b, si, 'roundEnd', ev);
    if (b.over || c.ko) continue;
    if (st) { st.turns--; if (st.turns <= 0) { delete b.status[c.uid]; ev.push({ t: 'say', text: `${nameOf(c)} shook off ${STATUS_INFO[st.id].name}.` }); ev.push({ t: 'heal', side: si, amount: 0, snap: snap(b, c) }); } }
  }
  if (b.arena && !b.over) arenaRound(b, ev);
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

// ── Arenas ──────────────────────────────────────────────────────
/** What this battle's arena does (the region's `arenas`), if it's in one. */
const arenaOf = (b: Battle): ArenaEffect | undefined => (b.arena ? activeRegion().arenas[b.arena.trick] : undefined);
/** The arena's timer, if it has one: it counts down as rounds end, and the challenger loses when it's out. */
export const arenaTimer = (b: Battle): ArenaCountdown | undefined => arenaOf(b)?.countdown;
/** Rounds the arena's timer began with, and has left (null: no timer). */
export const ringRounds = (b: Battle) => arenaTimer(b)?.rounds(b.arena!.tier) ?? null;
export const ringLeft = (b: Battle) => { const total = ringRounds(b); return total === null ? null : Math.max(0, total - b.round); };

function arenaRound(b: Battle, ev: BEvent[]) {
  const hurt = (si: 0 | 1, dmg: number, text: string, type?: ElementType) => {
    const c = activeOf(b.sides[si]);
    if (c.ko || b.over) return;
    const mult = type ? effectiveness(type, speciesOf(c).types) : 1;
    const d = mult === 0 ? 0 : Math.max(1, Math.floor(dmg * mult));
    if (d <= 0) return;
    const hit = takeHit(b, si, d);
    ev.push({ t: 'arena', text: text.replace('{n}', nameOf(c)) });
    ev.push({ t: 'damage', side: si, amount: hit.dmg, eff: mult, crit: false, snap: snap(b, c) });
    afterHit(b, si, hit, false, ev);
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
  arenaOf(b)?.roundEnd?.({ tier: b.arena!.tier, round: b.round, sides: [0, 1], hasType, roll, hurt, mend });
  const timer = arenaTimer(b);
  if (!timer || b.over) return;
  const total = ringRounds(b)!, left = ringLeft(b)!;
  ev.push({ t: 'ring', left, total });
  if (left === 0) {
    ev.push({ t: 'arena', text: timer.over });
    b.over = 'lose';
    awardBattleXp(b, ev);
    ev.push({ t: 'end', result: 'lose' });
  } else if (timer.near[left]) ev.push({ t: 'arena', text: timer.near[left] });
}

export function speciesName(id: string) { return SPECIES_BY_ID[id]?.name ?? id; }
