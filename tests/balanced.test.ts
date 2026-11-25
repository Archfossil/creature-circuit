// Balanced starters (docs/16-region-packages.md, step 10), with a made-up family: nobody in the game is balanced yet.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as Sp from '../src/data/species';
import * as S from '../src/engine/state';
import * as W from '../src/engine/world';
import * as Cr from '../src/engine/creature';
import { createBattle, outlook, resolveRound, swapPreview } from '../src/engine/battle';
import { ownType, setSwapMove, swapTypes, swapVals } from '../src/engine/swaps';
import { SWAP_MOVE_BY_ID, describeSwap, swapText } from '../src/data/swapMoves';
import { INSTINCT_POOL } from '../src/data/instincts';
import { MOVE_BY_ID } from '../src/data/moves';
import { BIOME_TYPES } from '../src/data/map';
import { WEATHER } from '../src/data/content';
import { TYPES, effectiveness } from '../src/data/types';
import { setRegion } from '../src/regions/active';
import { MARGOS } from '../src/regions';
import type { ElementType } from '../src/data/schema';
import type { Region } from '../src/regions/types';
import { TEST_REGION } from './regions/testRegion';

type T2 = [ElementType, ElementType];
const family = (id: string, types: T2, balanced: boolean, biomes: ('lake' | 'volcanic' | 'desert' | 'river')[] = ['lake', 'volcanic']) => ([1, 2, 3] as const).map((stage) => ({
  id: `${id}-${stage}`, name: `${id} ${stage}`, types, rarity: 'common' as const, stage, next: stage < 3 ? `${id}-${stage + 1}` : undefined,
  bias: ['focus' as const], shape: 'quad' as const, c: ['#ff0000', '#0000ff'] as [string, string], crest: 'crystal' as const, biomes, ability: 'forager', instinct: INSTINCT_POOL[types[0]][0].id, dex: '',
  ...(balanced ? { balanced: true as const } : {}),
}));
const before = JSON.stringify(Object.values(Sp.SPECIES_BY_ID));
const REGION: Region = { ...TEST_REGION, id: 'balanced', codex: { ...TEST_REGION.codex, species: [...(TEST_REGION.codex.species as string[]), 'bal-1', 'bal-2', 'bal-3', 'ord-1', 'ord-2', 'ord-3'], starters: ['bal-1', 'cindercub'] } };
beforeAll(() => {
  Sp.addSpecies([...family('bal', ['fire', 'water'], true), ...family('ord', ['fire', 'water'], false)]);
  for (const a of TYPES) for (const b of TYPES) if (a < b) Sp.addSpecies(family(`p-${a}-${b}`, [a, b], true));
  setRegion(REGION);
});
afterAll(() => setRegion(MARGOS));
const energyOf = (id: string) => Sp.SPECIES_BY_ID[id].energy;
const seeded = <T>(fn: () => T): T => { const real = Math.random; let seed = 9; Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647; try { return fn(); } finally { Math.random = real; } };
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe('balanced creatures', () => {
  it('change nothing for anyone else', () => {
    setRegion(MARGOS);
    expect(JSON.stringify(Object.values(Sp.SPECIES_BY_ID).filter((s) => !/^(bal|ord|p)-/.test(s.id) || /^ph-/.test(s.id)))).toBe(before);
    expect(Object.values(Sp.SPECIES_BY_ID).filter((s) => s.balanced && !/^(bal|p)-/.test(s.id))).toEqual([]);
    setRegion(REGION);
    expect(energyOf('ord-1')).toEqual({ fire: 4, water: 2 });
    expect(energyOf('ord-3')).toEqual({ fire: 9, water: 5, prisma: 2 });
    const c = Cr.createCreature('ord-1', 1);
    expect(Cr.progressionTree(c).filter((n) => n.kind === 'energy').map((n) => n.label)).toEqual(['+2 Fire Energy', '+2 Water Energy']);
    expect(Cr.starterInstincts(Sp.SPECIES_BY_ID['ord-1'])).toEqual(INSTINCT_POOL.fire);
    expect(Sp.leadTypes(Sp.SPECIES_BY_ID['ord-1'])).toEqual(['fire']);
  });

  it('gain both types equally at every stage, and no more in all', () => {
    expect([energyOf('bal-1'), energyOf('bal-2'), energyOf('bal-3')]).toEqual([{ fire: 3, water: 3 }, { fire: 5, water: 5 }, { fire: 7, water: 7, prisma: 2 }]);
    const sum = (e: object) => Object.values(e).reduce((a: number, v: number) => a + v, 0);
    for (const n of [1, 2, 3]) expect(sum(energyOf(`bal-${n}`))).toBe(sum(energyOf(`ord-${n}`)));
    for (const s of Object.values(Sp.SPECIES_BY_ID)) if (s.balanced) expect(s.energy[s.types[0]], s.id).toBe(s.energy[s.types[1]!]);
  });

  it('stay equal down every path of the chart, whenever they evolve', () => {
    const even = (c: Cr.CreatureInst) => { const e = Cr.energy(c); expect(e.fire).toBe(e.water); };
    let seed = 3;
    const rnd = (n: number) => (seed = (seed * 16807) % 2147483647) % n;
    const ends = new Set<string>();
    for (let k = 0; k < 120; k++) {
      const c = Cr.createCreature('bal-1', 1);
      c.points = 40;
      for (let i = 0; i < 60; i++) {
        const open = Cr.availableNodes(c);
        if (!open.length) break;
        Cr.unlockNode(c, open[rnd(open.length)].id);
        even(c);
      }
      ends.add(JSON.stringify(Cr.energy(c)));
      expect(c.species).toBe('bal-3');
    }
    expect(ends.size).toBeGreaterThan(2); // really different paths
    const nodes = Cr.progressionTree(Cr.createCreature('bal-1', 1)).filter((n) => n.kind === 'energy');
    expect(nodes.map((n) => [n.id, n.label])).toEqual([['b', '+1 Fire & Water Energy'], ['g', '+1 Fire & Water Energy']]);
    const all = Cr.createCreature('bal-3', 1), o = Cr.createCreature('ord-3', 1);
    for (const c of [all, o]) { c.points = 40; while (Cr.availableNodes(c).length) Cr.unlockNode(c, Cr.availableNodes(c)[0].id); }
    const tot = (c: Cr.CreatureInst) => Object.values(Cr.energy(c)).reduce((a, v) => a + v!, 0);
    expect(tot(all)).toBe(tot(o));
  });

  it('let the trainer pick which energy a Tonic gives', () => {
    const s = S.newGame('T', 'balanced', 'tc-ash', 'bal-1', '#fff'), c = s.roster[0];
    s.inventory['energy-tonic'] = 5;
    expect(W.useItem(s, 'energy-tonic', c.uid, 'water')).toMatch(/4 Water/);
    expect(Cr.energy(c)).toMatchObject({ fire: 3, water: 4 });
    W.useItem(s, 'energy-tonic', c.uid, 'water');
    expect(Cr.energy(c)).toMatchObject({ fire: 3, water: 5 });
    W.useItem(s, 'energy-tonic', c.uid); // nobody asked: the one it has less of
    expect(Cr.energy(c)).toMatchObject({ fire: 4, water: 5 });
    W.useItem(s, 'energy-tonic', c.uid, 'grass'); // not one of its types
    expect(Cr.energy(c)).toMatchObject({ fire: 5, water: 5 });
    expect(Cr.energy(c).grass ?? 0).toBe(0);
    const o = S.newGame('T', 'balanced', 'tc-ash', 'ord-1', '#fff');
    o.inventory['energy-tonic'] = 1;
    W.useItem(o, 'energy-tonic', o.roster[0].uid, 'water'); // anyone else: their main type, as ever
    expect(Cr.energy(o.roster[0])).toMatchObject({ fire: 5, water: 2 });
  });

  it('can start with any Instinct of either type', () => {
    const pool = Cr.starterInstincts(Sp.SPECIES_BY_ID['bal-1']);
    expect(pool).toEqual([...INSTINCT_POOL.fire, ...INSTINCT_POOL.water]);
    expect(pool.length).toBe(12);
  });

  it('use their better type against the foe, for Swap Moves of their own type', () => {
    const b = Cr.createCreature('bal-1', 4), pal = Cr.createCreature('puddlit', 4);
    const foes = Object.values(Sp.SPECIES_BY_ID).filter((x) => x.rarity === 'common').slice(0, 80).map((x) => Cr.createCreature(x.id, 3));
    const seen = new Set<string>();
    for (const f of foes) {
      const t = ownType(b, f), types = Cr.speciesOf(f).types;
      expect(effectiveness(t, types)).toBe(Math.max(effectiveness('fire', types), effectiveness('water', types)));
      if (effectiveness('fire', types) === effectiveness('water', types)) expect(t).toBe('fire');
      seen.add(t);
      expect(ownType(Cr.createCreature('ord-1', 4), f)).toBe('fire');
    }
    expect([...seen].sort()).toEqual(['fire', 'water']);
    // as the Alpha (Siphon) and as the partner (Tag Strike), in words and in battle
    const fireFoe = Cr.createCreature('cindercub', 4), grassFoe = Cr.createCreature('sproutle', 4);
    for (const [move, a, p] of [['siphon', b, pal], ['tagStrike', pal, b]] as const) {
      const m = SWAP_MOVE_BY_ID[move];
      expect(swapText(m, swapVals(a, p))).toContain('(Fire or Water, whichever is better)');
      expect(describeSwap(m, swapVals(a, p))).toContain('as Fire or Water, whichever is better');
      for (const [foe, want] of [[fireFoe, 'water'], [grassFoe, 'fire']] as const) {
        expect(setSwapMove(a, p, move)).toBe(true);
        const bt = createBattle({ kind: 'player', name: 'P', team: [p, a], active: 0, mods: {} }, { kind: 'trainer', name: 'F', team: [plain(foe)], active: 0, mods: {} }, WEATHER.clear);
        for (const c of [a, p]) { c.ko = false; c.health = 99; c.morale = 7; }
        bt.round = 1;
        const said = swapPreview(bt, 0, 1);
        expect(said.effect).toContain(want === 'fire' ? 'as Fire' : 'as Water');
        expect(said.effect).not.toContain('whichever');
        expect(move === 'siphon' ? said.aType : said.pType).toBe(want);
        const ev = resolveRound(bt, { kind: 'swap', to: 1 });
        const use = ev.find((e) => e.t === 'use' && e.move === move);
        expect(use && use.t === 'use' && use.type).toBe(want);
        const dmg = ev.slice(ev.indexOf(use!)).find((e) => e.t === 'damage' && e.side === 1);
        if (dmg?.t === 'damage') expect(dmg.eff).toBe(effectiveness(want, Cr.speciesOf(foe).types));
      }
    }
    // the AI's forecast uses it too: the swap looks better against a foe its second type beats
    const hopes = (id: string) => { const a = Cr.createCreature('bal-1', 5); a.species = id; const p = Cr.createCreature('puddlit', 5), f = Cr.createCreature('cindercub', 5); setSwapMove(a, p, 'siphon'); for (const c of [a, p]) c.health = 20; return outlook(createBattle({ kind: 'player', name: 'P', team: [p, a], active: 0, mods: {} }, { kind: 'trainer', name: 'F', team: [f], active: 0, mods: {} }, WEATHER.clear), 0, 1); };
    Sp.SPECIES_BY_ID.ctl = { ...Sp.SPECIES_BY_ID['bal-1'], id: 'ctl', balanced: undefined };
    try { expect(seeded(() => hopes('bal-1'))).toBeGreaterThan(seeded(() => hopes('ctl'))); } finally { delete Sp.SPECIES_BY_ID.ctl; }
    expect(swapTypes(pal, pal)).toEqual({ aType: 'water', pType: 'water' }); // nothing new for anyone else
  });

  it('get playbooks that lean to neither type', () => {
    const uses = { fire: 0, water: 0 }, ord = { fire: 0, water: 0 };
    for (let i = 0; i < 60; i++) for (const [id, n] of [['bal-2', uses], ['ord-2', ord]] as const) {
      const c = Cr.createCreature(id, 6);
      const book = Cr.autoPlaybook(c, true);
      expect(Cr.fits(Cr.energy(c), book)).toBe(true);
      for (const m of book) for (const t of ['fire', 'water'] as const) n[t] += MOVE_BY_ID[m].cost[t] ?? 0;
    }
    const lean = (n: typeof uses) => n.fire / (n.fire + n.water);
    expect(lean(uses)).toBeGreaterThan(0.42); expect(lean(uses)).toBeLessThan(0.58);
    expect(lean(ord)).toBeGreaterThan(lean(uses));
    const c = Cr.createCreature('bal-3', 10), rec = Cr.recommendPlaybook(c, { kind: 'balanced' });
    expect(Cr.fits(Cr.energy(c), rec)).toBe(true);
    const even = (l: string[]) => l.filter((m) => { const x = MOVE_BY_ID[m].cost; return x.fire && x.fire === x.water; }).length;
    // toward moves that cost both evenly: more of them than the same creature without the lean
    const pull = (id: string) => seeded(() => { let n = 0; for (let i = 0; i < 150; i++) n += even(Cr.autoPlaybook(Cr.createCreature(id, 9))); return n; });
    Sp.SPECIES_BY_ID.ctl = { ...Sp.SPECIES_BY_ID['bal-2'], id: 'ctl', balanced: undefined };
    try {
      expect(pull('bal-2')).toBeGreaterThan(pull('ctl'));
    } finally { delete Sp.SPECIES_BY_ID.ctl; }
    // and no type is favoured for being written first, over every pair
    let first = 0, both = 0;
    seeded(() => { for (const s of Object.values(Sp.SPECIES_BY_ID)) if (/^p-.*-2$/.test(s.id)) for (let i = 0; i < 8; i++) for (const m of Cr.autoPlaybook(Cr.createCreature(s.id, 6), true)) { const x = MOVE_BY_ID[m].cost; first += x[s.types[0]] ?? 0; both += (x[s.types[0]] ?? 0) + (x[s.types[1]!] ?? 0); } });
    // an attack of each type is carried as often as the other, and mostly both are
    const has = [0, 0], n = { both: 0, all: 0 };
    seeded(() => { for (const s of Object.values(Sp.SPECIES_BY_ID)) if (/^p-.*-[12]$/.test(s.id)) for (let i = 0; i < 6; i++) {
      const book = Cr.autoPlaybook(Cr.createCreature(s.id, s.stage * 3)), got = s.types.map((t) => book.some((m) => MOVE_BY_ID[m].kind === 'elemental' && MOVE_BY_ID[m].type === t));
      got.forEach((g, k) => { has[k] += Number(g); }); n.all++; n.both += Number(got.every(Boolean));
    } });
    expect(has[0]).toBe(has[1]); expect(n.both).toBe(n.all);
    expect(first / both).toBeGreaterThan(0.47); expect(first / both).toBeLessThan(0.53);
  });

  it('live in the wild where either type does', () => {
    const spots = (id: string) => new Set(W.encounterSpots(id).map((x) => x.node.biome));
    expect([...spots('bal-1')].sort()).toEqual(['desert', 'lake', 'river', 'swamp', 'volcanic'].filter((b) => spots('bal-1').has(b as 'lake')));
    expect(spots('bal-1').has('lake')).toBe(true); // Water, its second type
    expect(BIOME_TYPES.lake).not.toContain('fire');
    expect(spots('ord-1').has('lake')).toBe(false);
    expect(W.speciesPool('lake', 'water', 'common', 1).map((x) => x.id)).toContain('bal-1');
    expect(W.speciesPool('lake', 'water', 'common', 1).map((x) => x.id)).not.toContain('ord-1');
    const lake = REGION.map.nodes.find((n) => n.biome === 'lake')!, met = new Set<string>();
    for (let i = 0; i < 600; i++) met.add(W.pickSpecies(lake, 'common', 3).id);
    expect(met.has('bal-1')).toBe(true);
    expect(met.has('ord-1')).toBe(false);
    // a gimmick's lands: led by either
    TEST_REGION.gimmicks[0].lands = { biome: 'lake', types: () => ['water'] };
    try { expect(W.speciesPool('lake', 'water', 'common', 1).map((x) => x.id)).toContain('bal-1'); expect(W.speciesPool('lake', 'water', 'common', 1).map((x) => x.id)).not.toContain('ord-1'); } finally { delete TEST_REGION.gimmicks[0].lands; }
  });

  it('can be chosen in all 28 pairs, and played as a starter', () => {
    const pairs = Object.values(Sp.SPECIES_BY_ID).filter((x) => /^p-/.test(x.id) && x.stage === 1);
    expect(pairs.length).toBe(28);
    for (const p of pairs) {
      const c = Cr.createCreature(p.id, 1);
      expect(Cr.energy(c), p.id).toEqual({ [p.types[0]]: 3, [p.types[1]!]: 3 });
      expect(Cr.learnable(c).length, p.id).toBeGreaterThan(3);
      const book = Cr.recommendPlaybook(c, Cr.suggestGoal(c).goal);
      expect(book.length, p.id).toBeGreaterThan(1);
      expect(Cr.fits(Cr.energy(c), book), p.id).toBe(true);
    }
    expect(Sp.STARTERS).toContain('bal-1');
    expect(S.migrate(plain(S.newGame('T', 'balanced', 'tc-ash', 'bal-1', '#fff')))).toBe(null); // (this region isn't one of the game's)
  });
});
