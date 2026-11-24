// The Creature Circuit: one bracket for everyone in the game, and exactly one Champion.
import { describe, it, expect } from 'vitest';
import * as C from '../src/engine/circuit';
import * as W from '../src/engine/world';
import { CITIES } from '../src/data/map';
import { createCreature } from '../src/engine/creature';
import { newGame, newMatch, nextSeat, parseSaveFile, stillPlaying, type GameState } from '../src/engine/state';

const trainer = (name: string, ready = true): GameState => {
  const s = newGame(name, 'balanced', 'iron', 'puddlit', '#fff');
  s.roster.push(createCreature('cindercub', 8), createCreature('zapup', 8));
  s.turn = 100;
  if (ready) { s.location = 'stadium'; s.merits = Object.keys(CITIES); }
  return s;
};
/** A match whose trainers all end turn 100; those named in `miss` haven't qualified. */
const table = (n: number, miss: number[] = []) => {
  const m = newMatch(Array.from({ length: n }, (_, i) => trainer(`P${i}`, !miss.includes(i))));
  for (const p of m.players) W.endTurn(p);
  return m;
};
const humans = (m: C.CircuitGame) => m.circuit!.entrants.filter((e) => e.seat !== undefined);

describe('the Creature Circuit', () => {
  it('waits until everyone has ended their season', () => {
    const m = newMatch([trainer('A'), trainer('B')]);
    expect(W.endTurn(m.players[0]).ended).toBe('endgame');
    expect(C.openCircuit(m)).toBe(null);
    expect(nextSeat(m)).toBe(1); // B still travels
    W.endTurn(m.players[1]);
    expect(nextSeat(m)).toBe(-1);
    expect(C.openCircuit(m)).not.toBe(null);
  });
  it('holds every player who qualified, backfilled to eight, in one bracket', () => {
    for (let n = 2; n <= 6; n++) {
      const m = table(n, n > 3 ? [1] : []);
      const c = C.openCircuit(m)!;
      expect(c.entrants).toHaveLength(8);
      expect(humans(m)).toHaveLength(n > 3 ? n - 1 : n);
      expect(new Set(c.entrants.map((e) => e.npc ?? `seat${e.seat}`)).size).toBe(8);
      if (n > 3) expect(humans(m).some((e) => e.seat === 1)).toBe(false);
      expect(C.openCircuit(m)).toBe(c); // drawn once
    }
  });
  it('keeps players apart as long as it can', () => {
    for (let n = 2; n <= 4; n++) {
      const c = C.openCircuit(table(n))!;
      const at = c.entrants.flatMap((e, i) => (e.seat !== undefined ? [i] : []));
      expect(new Set(at.map((i) => i >> 1)).size).toBe(n); // nobody meets in the quarterfinals
      if (n === 2) expect((at[0] >> 2) === (at[1] >> 2)).toBe(false); // only in the final
    }
  });
  it('ends with exactly one Champion, whoever wins', () => {
    for (let trial = 0; trial < 40; trial++) {
      const n = 1 + (trial % 6), m: C.CircuitGame = n === 1 ? C.soloGame(table(1).players[0]) : table(n);
      const c = C.openCircuit(m)!;
      for (let k = 0; k < 8; k++) {
        const next = C.advance(m);
        if (!next) break;
        expect(m.players[next.seat].phase).toBe('endgame');
        C.settle(m, next.k, Math.random() < 0.7 ? next.me : next.foe);
      }
      C.advance(m);
      expect(c.winners.every((w) => w !== null)).toBe(true);
      const champs = m.players.filter((p) => p.phase === 'champion');
      const won = C.championOf(c)!;
      expect(champs).toHaveLength(won.seat === undefined ? 0 : 1);
      if (won.seat !== undefined) expect(champs[0]).toBe(m.players[won.seat]);
      expect(m.players.some(stillPlaying)).toBe(false);
    }
  });
  it('two players duel with their own teams, restored and without Nabes', () => {
    const m = table(6), c = C.openCircuit(m)!;
    const k = [0, 1, 2, 3].find((x) => C.sidesOf(c, x)!.every((i) => c.entrants[i].seat !== undefined))!;
    expect(k).toBeGreaterThanOrEqual(0); // six players: some meet at once
    const [me, foe] = C.sidesOf(c, k)!;
    const a = m.players[c.entrants[me].seat!], b = m.players[c.entrants[foe].seat!];
    a.hotpot = { city: 'iron', buff: { power: 2 } }; b.roster[0].health = 1; b.roster[1].ko = true;
    const battle = C.matchBattle(m, { k, round: 0, me, seat: c.entrants[me].seat!, foe, foeSeat: c.entrants[foe].seat });
    expect(battle.sides.map((s) => s.team)).toEqual([a.roster, b.roster]);
    expect(battle.sides.map((s) => s.buff)).toEqual([undefined, undefined]);
    expect(b.roster.some((x) => x.ko)).toBe(false);
    battle.foeParticipants = [b.roster[0].uid];
    const xp = b.roster[0].xp + b.roster[0].level * 10;
    C.settle(m, k, foe, battle);
    expect([a.phase, b.phase]).toEqual(['over', 'endgame']);
    expect(a.endgame).toEqual({ round: 0, eliminated: true });
    expect(b.roster[0].xp + b.roster[0].level * 10).toBeGreaterThan(xp); // the other trainer's team earns XP too
  });
  it('a bot plays for someone who is away; their opponent here plays on', () => {
    const m = table(6), c = C.openCircuit(m)!;
    for (let guard = 0; guard < 8; guard++) {
      const next = C.advance(m)!;
      if (next.foeSeat === undefined) { C.settle(m, next.k, next.me); continue; }
      C.sendBot(m, next.seat);
      const then = C.advance(m)!;
      expect(then).toMatchObject({ k: next.k, seat: next.foeSeat, foeSeat: next.seat, foeBot: true });
      C.sendBot(m, then.seat); // both away: it's played out
      C.advance(m);
      expect(c.winners[next.k]).not.toBe(null);
      return;
    }
    throw new Error('no two players met');
  });
  it('an absent player alone against an NPC is played by the AI, with their own team', () => {
    const m = table(2), c = C.openCircuit(m)!;
    const next = C.advance(m)!;
    C.sendBot(m, next.seat);
    C.advance(m);
    expect(c.winners[next.k]).not.toBe(null);
    expect(m.players[next.seat].roster.every((x) => !x.ko)).toBe(true);
  });
  it('travels with an exported match, and a solo bracket from an older save carries on', () => {
    const m = table(3);
    C.openCircuit(m);
    const back = parseSaveFile(JSON.stringify(m));
    expect(back?.kind === 'match' && back.match.circuit).toEqual(m.circuit);
    const s = trainer('Old');
    s.phase = 'endgame';
    s.endgame = { round: 1, eliminated: false, bracket: ['Old', 'Champion Noor', 'Champion Bram', 'Champion Ivo', 'Champion Dez', 'Champion Okon', 'Champion Hale', 'Champion Tamsin'] };
    const g = C.soloGame(s);
    C.openCircuit(g);
    const next = C.advance(g)!;
    expect([next.round, g.circuit!.entrants[next.foe].name]).toEqual([1, 'Champion Bram']);
    C.settle(g, next.k, next.me);
    const final = C.advance(g)!;
    expect(final.round).toBe(2);
    expect(C.matchBattle(g, final).sides[1].team).toHaveLength(3);
    C.settle(g, final.k, final.me);
    expect(s.phase).toBe('champion');
  });
});
