// The hall of records and the farewell (docs/16-region-packages.md, step 9).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import * as S from '../src/engine/state';
import * as H from '../src/engine/hall';
import * as C from '../src/engine/circuit';
import * as W from '../src/engine/world';
import { createCreature, nameOf } from '../src/engine/creature';
import { NODE_BY_ID } from '../src/data/map';

const store = new Map<string, string>();
let full = false;
beforeAll(() => { vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { if (full) throw new Error('full'); store.set(k, v); }, removeItem: (k: string) => void store.delete(k) }); });
beforeEach(() => { store.clear(); full = false; });
afterAll(() => vi.unstubAllGlobals());

const trainer = (name = 'Rowan', phase: S.GameState['phase'] = 'over') => {
  const s = S.newGame(name, 'balanced', 'iron', 'cindercub', '#fff');
  s.phase = phase;
  return s;
};

describe('the hall of records', () => {
  it('keeps how a season ended, and who was there', () => {
    const s = trainer('Rowan', 'champion');
    s.merits = ['iron', 'hollow'];
    s.stats.battlesWon = 9;
    const pal = createCreature('zapup', 7);
    pal.nickname = 'Bolt';
    s.roster.push(pal);
    s.reserve.push(createCreature('puddlit', 3));
    s.circuit = { entrants: [{ name: 'Rowan', seat: 0 }, ...Array.from({ length: 7 }, (_, i) => ({ name: `N${i}` }))], winners: [0, 2, 4, 6, 0, 4, 0] };
    expect(H.recordSeason([s], 'solo', s.circuit)).toBe(true);
    const [e] = H.hall();
    expect(e).toMatchObject({ kind: 'solo', region: 'margos', regionName: 'Margos', meritsNeeded: 8, champion: 'Rowan' });
    expect(e.trainers[0]).toMatchObject({ name: 'Rowan', result: 'champion', merits: 2, wins: 9 });
    expect(e.trainers[0].team.map((c) => [c.species, c.name, c.level, !!c.starter])).toEqual([['cindercub', nameOf(s.roster[0]), 1, true], ['zapup', 'Bolt', 7, false]]);
  });
  it('tells a champion, each round, and missing the Circuit apart', () => {
    const at = (round: number) => { const s = trainer(); s.endgame = { round, eliminated: true }; return H.resultOf(s); };
    expect([at(0), at(1), at(2)]).toEqual([0, 1, 2]);
    expect(H.resultOf(trainer())).toBe('missed');
    expect(H.resultOf(trainer('A', 'champion'))).toBe('champion');
  });
  it('records a game once, when everyone in it has finished', () => {
    const a = trainer('Ann'), b = trainer('Bo', 'map');
    const m = S.newMatch([a, b]);
    expect(H.recordMatch(m, 'hotseat')).toBe(false);
    b.phase = 'endgame';
    expect(H.recordMatch(m, 'hotseat')).toBe(false);
    expect(H.hall()).toEqual([]);
    b.phase = 'champion';
    expect(H.recordMatch(m, 'hotseat')).toBe(true);
    expect(H.recordMatch(m, 'hotseat')).toBe(true); // looked at again
    expect(H.recordMatch(JSON.parse(JSON.stringify(m)), 'hotseat')).toBe(true); // or loaded again
    a.roster.reverse(); a.coins = 999;
    expect(H.recordMatch(m, 'hotseat')).toBe(true);
    expect(H.hall().length).toBe(1);
    const again = S.newMatch([trainer('Ann'), trainer('Bo')]); // the same people's next season
    expect(H.recordMatch(again, 'hotseat')).toBe(true);
    expect(H.hall().length).toBe(2);
    expect(H.seasonOver([])).toBe(false);
  });
  it('knows a starter that’s in a totem or at school, and leaves Stadium battles out', () => {
    const s = trainer(), id = H.seasonId([s]), starter = s.roster[0];
    s.roster = [createCreature('zapup', 2)]; s.reserve = [starter];
    expect(H.seasonId([s])).toBe(id);
    s.reserve = []; s.training = [{ creature: starter, school: 'valor', xp: 1, turns: 1, started: 1 }];
    expect(H.seasonId([s])).toBe(id);
    s.stadium = true;
    expect(H.recordSeason([s], 'solo', undefined)).toBe(false);
    s.stadium = undefined;
    const m = S.newMatch([s]);
    m.stadium = { wins: [0], teams: [] };
    expect(H.recordMatch(m, 'online')).toBe(false);
  });
  it('keeps the newest, forgets on request, and copes with bad or full storage', () => {
    for (let i = 0; i < H.HALL_MAX + 3; i++) H.recordSeason([trainer(`T${i}`)], 'solo', undefined);
    expect(H.hall().length).toBe(H.HALL_MAX);
    expect(H.hall()[0].trainers[0].name).toBe(`T${H.HALL_MAX + 2}`);
    H.forgetSeason(H.hall()[0].id);
    expect(H.hall()[0].trainers[0].name).toBe(`T${H.HALL_MAX + 1}`);
    full = true;
    expect(H.recordSeason([trainer('Late')], 'solo', undefined)).toBe(false);
    full = false;
    for (const bad of ['not json', '{}', 'null', '[null, 5, {"id": 3}, {"id": "x"}]']) { store.set('creature-circuit-hall-v1', bad); expect(H.hall()).toEqual([]); }
  });
  it('leaves no mark on play: nothing in the rules reads it', () => {
    const root = new URL('../src/', import.meta.url);
    const files = (readdirSync(root, { recursive: true }) as string[]).map((f) => f.replace(/\\/g, '/')).filter((f) => f.endsWith('.ts') && f !== 'engine/hall.ts');
    expect(files.filter((f) => /engine\/hall'|'\.\/hall'|circuit-hall/.test(readFileSync(new URL(f, root), 'utf-8')))).toEqual(['ui/app.ts']);
    // a season after a champion's starts as any other
    const real = Math.random;
    const fresh = () => { let seed = 5; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647; try { return S.newGame('R', 'nature', 'iron', 'cindercub', '#fff'); } finally { Math.random = real; } };
    const before = fresh(), champ = trainer('R', 'champion');
    champ.flags.beaten = ['sunspire'];
    H.recordSeason([champ], 'solo', undefined);
    expect(fresh()).toEqual(before);
    for (const n of Object.values(NODE_BY_ID)) if (n.kind === 'legendary') expect(W.legendaryHere(fresh(), n), n.id).toBe(true); // Legendaries are back
  });
  it('says the same farewell each time, and sends Legendaries home', () => {
    const s = trainer(), c = createCreature('zapup', 4), l = createCreature('nimbalune', 9);
    expect(H.farewellText(s, s.roster[0])).toMatchObject({ where: 'the Margos Research Facility in Quillhaven', text: expect.stringMatching(/first partner/) });
    expect(H.farewellText(s, c)).toEqual(H.farewellText(s, JSON.parse(JSON.stringify(c))));
    expect(H.farewellText(s, c).text).toContain(nameOf(c));
    expect(H.farewellText(s, l)).toMatchObject({ where: 'Eye of the Sky', text: expect.stringMatching(/returns to Eye of the Sky/) });
    s.reserve.push(c);
    s.training = [{ creature: l, school: 'valor', xp: 1, turns: 1, started: 1 }];
    expect(H.everyone(s)).toEqual([s.roster[0], c, l]);
    expect(C.CIRCUIT_ROUNDS.length).toBe(3);
  });
});
