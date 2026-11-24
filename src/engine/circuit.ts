// The Creature Circuit: one bracket of eight for everyone in the game, and one winner. Every trainer who
// qualified is in it, duelling each other when they meet; Champions (and any Rival who earned a place) fill
// the rest. Solo, it's kept on the save; in hotseat and online, on the match (state.ts → Circuit).
import type { Circuit, CircuitEntrant, GameState } from './state';
import { log, record } from './state';
import { NPC_BY_ID, NPCS, npcNamed, type Npc } from '../data/npcs';
import { SPECIES } from '../data/species';
import { autoSpend, createCreature, fullRestore, totalHealth } from './creature';
import { chooseAI, createBattle, resolveRound, sendIn, type Battle } from './battle';
import { isContender, npcScore, npcTeam, recordWith } from './npcs';
import { playerSide, weather } from './world';
import { pick } from './dice';
import { rewardDefender } from './interactions';

/** A solo save or a match: whoever is playing, and their bracket once it's drawn. */
export interface CircuitGame { players: GameState[]; circuit?: Circuit }
/** A solo save seen as a game of one. */
export const soloGame = (s: GameState): CircuitGame => ({ players: [s], get circuit() { return s.circuit; }, set circuit(c) { s.circuit = c; } });

export const CIRCUIT_SIZE = 8;
export const CIRCUIT_ROUNDS = ['Quarterfinal', 'Semifinal', 'Grand Final'];
/** The seven matches: four quarterfinals, two semifinals (of 0–1 and 2–3), the final. */
const MATCHES = CIRCUIT_SIZE - 1;
export const roundOf = (k: number) => (k < 4 ? 0 : k < 6 ? 1 : 2);
const FEEDS: Record<number, [number, number]> = { 4: [0, 1], 5: [2, 3], 6: [4, 5] };
/** Seeds in bracket order: 1 and 2 can only meet in the final, 1–4 not before the semifinals. */
const SEEDS = [1, 8, 4, 5, 2, 7, 3, 6];

/** Who plays match `k` (entrant indexes), or null while it waits on an earlier one. */
export function sidesOf(c: Circuit, k: number): [number, number] | null {
  if (k < 4) return [k * 2, k * 2 + 1];
  const [a, b] = FEEDS[k].map((f) => c.winners[f]);
  return a === null || b === null ? null : [a, b];
}
/** The first match not played yet. */
export const nextMatch = (c: Circuit) => c.winners.findIndex((w) => w === null);
export const championOf = (c: Circuit): CircuitEntrant | null => { const w = c.winners[MATCHES - 1]; return w === null ? null : c.entrants[w]; };
/** How far the Circuit has got, to tell when it moves on. */
export const progress = (g: CircuitGame) => (g.circuit ? g.circuit.winners.filter((w) => w !== null).length : -1);
const isOut = (c: Circuit, i: number) => c.winners.some((w, k) => w !== null && w !== i && sidesOf(c, k)!.includes(i));

/** How strong an NPC is in this game: with several trainers, as strong as any of them has made it. */
const strength = (players: GameState[], npc: Npc) => Math.max(...players.map((p) => npcScore(p, npc)));

/** Who has qualified (and, in a match saved under the old one-bracket-each rules, anyone who won theirs: there's only one Champion). */
const qualified = (g: CircuitGame) => g.players.map((p, seat) => ({ p, seat })).filter((x) => x.p.phase === 'endgame' || (g.players.length > 1 && x.p.phase === 'champion'));

/** Draw the bracket: trainers seeded first (kept apart as long as the bracket allows), then the strongest of the rest. */
export function drawCircuit(g: CircuitGame): Circuit | null {
  const humans = qualified(g).sort((a, b) => b.p.stats.battlesWon - a.p.stats.battlesWon || a.seat - b.seat);
  if (!humans.length) return null;
  const players = humans.map((h) => h.p);
  const npcs = [...NPCS].sort((a, b) => strength(players, b) - strength(players, a) || a.id.localeCompare(b.id)).slice(0, CIRCUIT_SIZE - humans.length);
  const seeded: CircuitEntrant[] = [...humans.map((h) => ({ name: h.p.trainer.name, seat: h.seat })), ...npcs.map((n) => ({ name: n.name, npc: n.id }))];
  const entrants = SEEDS.map((n) => seeded[n - 1]);
  // a Rival who has earned their place meets the trainer they earned it against first, if that trainer isn't meeting another
  const taken = new Set<string>();
  for (const { p, seat } of humans) {
    const me = entrants.findIndex((e) => e.seat === seat), foe = me ^ 1;
    const rival = npcs.filter((n) => isContender(p, n) && !taken.has(n.id))
      .sort((a, b) => { const x = recordWith(p, a)!, y = recordWith(p, b)!; return y.lost - x.lost || (y.won + y.lost) - (x.won + x.lost); })[0];
    if (!rival || !entrants[foe].npc || taken.has(entrants[foe].npc!)) continue;
    const at = entrants.findIndex((e) => e.npc === rival.id);
    [entrants[foe], entrants[at]] = [entrants[at], entrants[foe]];
    taken.add(rival.id);
  }
  for (const h of humans) {
    h.p.phase = 'endgame';
    h.p.endgame = { round: 0, eliminated: false };
  }
  return { entrants, winners: Array(MATCHES).fill(null) };
}

/** A solo save already in its bracket under the old rules (its three opponents fixed in advance): carry on from there. */
function fromOldBracket(s: GameState): Circuit | null {
  const eg = s.endgame;
  if (!eg?.bracket || eg.bracket.length < CIRCUIT_SIZE || eg.eliminated) return null;
  const [me, qf, sf, final, ...rest] = eg.bracket;
  const entrants = [me, qf, sf, rest[0], final, rest[1], rest[2], rest[3]].map((name, i): CircuitEntrant => (i === 0 ? { name, seat: 0 } : { name, npc: npcNamed(name)?.id }));
  const c: Circuit = { entrants, winners: Array(MATCHES).fill(null) };
  if (eg.round > 0) c.winners.splice(0, 4, 0, 2, 4, 6);
  if (eg.round > 1) c.winners.splice(4, 2, 0, 4);
  eg.bracket = undefined;
  return c;
}

/** The game's bracket, drawn now if it hasn't been. Null when nobody qualified, or while anyone's season is still going. */
export function openCircuit(g: CircuitGame): Circuit | null {
  if (g.circuit) return g.circuit;
  if (g.players.some((p) => p.phase === 'map')) return null;
  const c = (g.players.length === 1 ? fromOldBracket(g.players[0]) : null) ?? drawCircuit(g);
  if (c) g.circuit = c;
  return c;
}

export interface CircuitMatch { k: number; round: number; /** The entrant whose trainer runs it, and their seat. */ me: number; seat: number; /** Who they meet, and their seat if it's another trainer. */ foe: number; foeSeat?: number; /** The other trainer is away: a bot plays for them. */ foeBot?: boolean }

/** A bot plays this trainer's next match for them (they're away, or holding everyone up). */
export function sendBot(g: CircuitGame, seat: number) {
  const c = g.circuit;
  if (!c) return;
  const k = nextMatch(c), side = k < 0 ? undefined : sidesOf(c, k)?.find((i) => c.entrants[i].seat === seat);
  if (side !== undefined) (c.bots ??= []).push(`${k}:${side}`);
}
const botted = (c: Circuit, k: number, i: number) => !!c.bots?.includes(`${k}:${i}`);

/** Play every match that needs nobody here, up to the next one that does (null once the Circuit is over). */
export function advance(g: CircuitGame): CircuitMatch | null {
  const c = g.circuit;
  if (!c) return null;
  for (let k = nextMatch(c); k >= 0; k = nextMatch(c)) {
    const sides = sidesOf(c, k)!;
    const here = sides.filter((i) => c.entrants[i].seat !== undefined && !botted(c, k, i));
    if (here.length) {
      const me = here[0], foe = sides.find((i) => i !== me)!;
      return { k, round: roundOf(k), me, seat: c.entrants[me].seat!, foe, foeSeat: c.entrants[foe].seat, foeBot: botted(c, k, foe) };
    }
    settle(g, k, simulate(g, c, k, sides));
  }
  return null;
}

/** Decide a match nobody here is playing. Two NPCs: by how strong they are. A trainer's team: played out by the AI. */
function simulate(g: CircuitGame, c: Circuit, k: number, sides: [number, number]): number {
  const [a, b] = sides;
  const human = sides.find((i) => c.entrants[i].seat !== undefined);
  if (human === undefined) {
    const s = (i: number) => { const n = c.entrants[i].npc; return n && NPC_BY_ID[n] ? strength(g.players, NPC_BY_ID[n]) : 60; };
    return Math.random() < 1 / (1 + 10 ** ((s(b) - s(a)) / 50)) ? a : b;
  }
  const foe = sides.find((i) => i !== human)!;
  const battle = matchBattle(g, { k, round: roundOf(k), me: human, seat: c.entrants[human].seat!, foe, foeSeat: c.entrants[foe].seat });
  for (let n = 0; n < 300 && !battle.over; n++) {
    resolveRound(battle, chooseAI(battle, 0));
    if (battle.needSwap && !battle.over) sendIn(battle, battle.sides[0].team.findIndex((x) => !x.ko));
  }
  const left = (si: 0 | 1) => battle.sides[si].team.reduce((n, x) => n + (x.ko ? 0 : totalHealth(x)), 0);
  return battle.over === 'win' || (battle.over !== 'lose' && left(0) >= left(1)) ? human : foe;
}

/** Set up a trainer's match, both teams fully restored. Against another trainer neither side brings a Nabe. */
export function matchBattle(g: CircuitGame, m: CircuitMatch): Battle {
  const s = g.players[m.seat];
  for (const c of s.roster) fullRestore(c);
  if (m.foeSeat !== undefined) {
    const f = g.players[m.foeSeat];
    for (const c of f.roster) fullRestore(c);
    s.hotpot = f.hotpot = undefined;
    return createBattle(playerSide(s), { ...playerSide(f), kind: 'trainer' }, weather(s), { biome: 'meadow' });
  }
  const e = g.circuit!.entrants[m.foe];
  const avg = Math.round(s.roster.reduce((a, c) => a + c.level, 0) / Math.max(1, s.roster.length));
  const lvl = Math.max(9, avg) + m.round;
  const npc = e.npc ? NPC_BY_ID[e.npc] : undefined;
  // (a bracket drawn before the Champions had teams of their own can hold a name nobody goes by now)
  const team = npc ? npcTeam(s, npc, 3, lvl) : [0, 1, 2].map(() => {
    const sp = pick(SPECIES.filter((x) => x.rarity !== 'legendary' && (x.stage >= 2 || x.rarity === 'apex')));
    const c = createCreature(sp.id, lvl);
    autoSpend(c, false);
    return c;
  });
  return createBattle(playerSide(s), { kind: 'champion', name: e.name, ...(npc ? { npc: npc.id } : {}), team, active: 0, mods: {} }, weather(s), { biome: 'meadow' });
}

/** A match is decided: the loser's season is over, and whoever wins the last one is the Champion. */
export function settle(g: CircuitGame, k: number, winner: number, battle?: Battle) {
  const c = g.circuit!;
  if (c.winners[k] !== null) return;
  const sides = sidesOf(c, k)!, loser = sides.find((i) => i !== winner)!;
  c.winners[k] = winner;
  const round = CIRCUIT_ROUNDS[roundOf(k)];
  const on = (i: number) => (c.entrants[i].seat === undefined ? undefined : g.players[c.entrants[i].seat!]);
  const won = on(winner), lost = on(loser);
  if (battle && won && lost) rewardDefender(battle.sides[1].team === won.roster ? won : lost, battle);
  for (const p of [won, lost]) if (p) for (const x of p.roster) fullRestore(x);
  if (lost) {
    lost.phase = 'over';
    lost.endgame = { round: roundOf(k), eliminated: true };
    log(lost, `Out of the Creature Circuit in the ${round}, to ${c.entrants[winner].name}.`);
    record(lost, 'battle', `went out of the Creature Circuit in the ${round}, to ${c.entrants[winner].name}`);
  }
  if (won) {
    won.endgame = { round: roundOf(k) + 1, eliminated: false };
    log(won, `Won the ${round} of the Creature Circuit against ${c.entrants[loser].name}.`);
    if (k === MATCHES - 1) {
      won.phase = 'champion';
      record(won, 'battle', 'became Champion of the Creature Circuit! 🏆');
    }
  }
}

/** Whether an entrant is still in. */
export const stillIn = (c: Circuit, i: number) => !isOut(c, i);
