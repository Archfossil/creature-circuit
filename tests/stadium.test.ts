import { MOVE_BY_ID } from '../src/data/moves';
// Stadium Mode: every creature can be brought, teams are legal, and the AI opponents can be fought to a finish.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as S from '../src/engine/stadium';
import * as W from '../src/engine/world';
import * as C from '../src/engine/circuit';
import { chooseAI, resolveRound, sendIn, type Battle } from '../src/engine/battle';
import { chartComplete, energy, fits, learnable } from '../src/engine/creature';
import { NATURES } from '../src/data/content';
import { SPECIES } from '../src/data/species';
import { parseSaveFile, save, saveMatch, newMatch, setActiveMatch } from '../src/engine/state';

const finish = (b: Battle) => { for (let n = 0; n < 300 && !b.over; n++) { resolveRound(b, chooseAI(b, 0)); if (b.needSwap && !b.over) sendIn(b, b.sides[0].team.findIndex((x) => !x.ko)); } return b; };

describe('Stadium Mode', () => {
  it('trains any final stage or Legendary as far as it goes', () => {
    const all = S.stadiumSpecies();
    expect(all.length).toBeGreaterThan(100);
    for (const sp of all) {
      const c = S.trained(sp.id, NATURES[0].id, sp.instinct);
      expect([c.level, c.points, c.loyalty, c.capstone], sp.id).toEqual([12, 0, 10, true]);
      expect(chartComplete(c), sp.id).toBe(true);
      expect(c.perks).toBe(NATURES[0].perks.length);
    }
  }, 60000);
  it('random teams have their own moves: they fit, and few creatures share a set', () => {
    const sets = new Map<string, number>(); let n = 0, rampage = 0;
    for (let i = 0; i < 40; i++) {
      const t = S.randomTeam();
      for (const [k, c] of S.buildTeam(t).entries()) {
        expect(c.playbook, c.species).toEqual(t.picks[k].playbook); // kept, so a team's the same each battle
        expect(S.playbookFits(c, c.playbook), c.species).toBe(true);
        expect(c.playbook.filter((m) => MOVE_BY_ID[m].kind === 'physical').length, c.species).toBeLessThan(3);
        const key = [...c.playbook].sort().join('+');
        sets.set(key, (sets.get(key) ?? 0) + 1); n++; rampage += Number(c.playbook.includes('rampage'));
      }
    }
    expect(Math.max(...sets.values()) / n).toBeLessThan(0.08); // (17% had the same four physical moves)
    expect(sets.size / n).toBeGreaterThan(0.75);
    expect(rampage / n).toBeLessThan(0.5);
  });
  it('builds the same team every time, with legal playbooks, and keeps edits', () => {
    const t = S.randomTeam();
    const a = S.buildTeam(t), b = S.buildTeam(t);
    expect(b.map((c) => [c.uid, c.playbook, c.swapMoves])).toEqual(a.map((c) => [c.uid, c.playbook, c.swapMoves]));
    for (const c of a) { expect(c.playbook.every((m) => learnable(c).includes(m))).toBe(true); expect(fits(energy(c), c.playbook)).toBe(true); }
    a[0].playbook = [a[0].playbook[0]];
    t.picks[0] = S.readPick(a[0], a);
    expect(S.buildTeam(t)[0].playbook).toEqual(a[0].playbook);
    t.picks[0].playbook = ['no-such-move'];
    expect(S.buildTeam(t)[0].playbook.length).toBeGreaterThan(0); // an impossible playbook falls back
  });
  it('checks teams', () => {
    const t = S.randomTeam();
    expect(S.teamProblem(t)).toBe(null);
    expect(S.teamProblem({ ...t, picks: t.picks.slice(1) })).toMatch(/Choose 3/);
    expect(S.teamProblem({ ...t, picks: [t.picks[0], t.picks[0], t.picks[1]] })).toMatch(/two of the same/);
    const legends = SPECIES.filter((s) => s.rarity === 'legendary').slice(0, 2).map((s) => ({ species: s.id, nature: NATURES[0].id }));
    expect(S.teamProblem({ ...t, picks: [...legends, t.picks[0]] })).toMatch(/One Legendary/);
    expect(S.readTeamCode(S.teamCode(t))).toEqual(JSON.parse(JSON.stringify(t)));
    for (const bad of ['', '{}', '{"cc":"stadium","picks":[]}', '{"cc":"stadium","picks":[null,{"species":"nope"}]}']) expect(S.readTeamCode(bad)).toBe(null);
  });
  it('every AI opponent brings three creatures at the top level and can be fought to a finish', () => {
    const f = S.stadiumFoes();
    for (const foe of [{ kind: 'random' } as const, ...f.champions, ...f.rivals, ...f.arbiters]) {
      const s = S.stadiumTrainer('T', '#fff', undefined, S.buildTeam(S.randomTeam()));
      const b = S.stadiumBattle(s, foe);
      expect(b.sides[1].team.map((c) => c.level), S.foeName(foe)).toEqual([12, 12, 12]);
      if (foe.kind === 'arbiter') expect(b.arena?.tier).toBe(5);
      expect(finish(b).over, S.foeName(foe)).toMatch(/win|lose/);
    }
  }, 60000);
  it('two players battle with their own teams, even the same one', () => {
    const t = S.randomTeam();
    const a = S.stadiumTrainer('A', '#fff', undefined, S.buildTeam(t, 'a')), b = S.stadiumTrainer('B', '#000', undefined, S.buildTeam(t, 'b'));
    expect(new Set([...a.roster, ...b.roster].map((c) => c.uid)).size).toBe(6);
    expect(finish(S.stadiumDuel(a, b)).over).toMatch(/win|lose/);
  });
  it('is never saved over a journey', () => {
    const g = globalThis as unknown as { localStorage?: unknown }, prev = g.localStorage, wrote: string[] = [];
    g.localStorage = { getItem: () => null, setItem: (k: string) => void wrote.push(k), removeItem: () => {} };
    try {
      setActiveMatch(null);
      const s = S.stadiumTrainer('T', '#fff', undefined, S.buildTeam(S.randomTeam()));
      save(s);
      const m = newMatch([s]); m.stadium = { wins: [0], teams: [] };
      saveMatch(m);
      expect(wrote).toEqual([]);
    } finally { g.localStorage = prev; }
  });
});

describe('debug saves', () => {
  const file = (n: string) => parseSaveFile(readFileSync(new URL(`../debug/${n}`, import.meta.url), 'utf-8'));
  it('import, and go straight into the Circuit', () => {
    const solo = file('solo-turn-99.json');
    if (solo?.kind !== 'solo') throw new Error('not a solo save');
    const s = solo.save;
    expect([s.turn, s.location, s.merits.length]).toEqual([99, 'stadium', 8]);
    expect(s.dex.caught.length).toBe(SPECIES.length);
    W.endTurn(s);
    expect(W.endTurn(s).ended).toBe('endgame');
    expect(C.openCircuit(C.soloGame(s))).not.toBe(null);
  });
  it('the hotseat one brings two trainers to one bracket', () => {
    const f = file('hotseat-2-players-turn-99.json');
    if (f?.kind !== 'match') throw new Error('not a match');
    for (const p of f.match.players) { W.endTurn(p); W.endTurn(p); }
    expect(C.openCircuit(f.match)!.entrants.filter((e) => e.seat !== undefined)).toHaveLength(2);
  });
});
