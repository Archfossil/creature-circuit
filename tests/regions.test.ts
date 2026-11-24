// Changing region leaves nothing of the last one behind (docs/16-region-packages.md, step 3).
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { Bot, loadGame, type Game } from './baseline/bot';
import { seasons } from './baseline/seasons';
import { TEST_REGION } from './regions/testRegion';
import { codexGaps } from './regions/codexGaps';

const saved = (path: string) => readFileSync(new URL(`./baseline/${path}.txt`, import.meta.url), 'utf-8').replace(/\r\n/g, '\n');
/** The game's files, all from one copy of it: `first` is the region it starts in. */
async function copy(first?: typeof TEST_REGION) {
  vi.resetModules();
  const active = await import('../src/regions/active');
  if (first) active.setRegion(first);
  const g = await loadGame();
  const { dataSnapshot } = await import('./baseline/data');
  const { logBattleEvent: log } = await import('../src/engine/battleLog');
  const { INSTINCTS } = await import('../src/data/instincts');
  const { opponentLook } = await import('../src/render/npcLooks');
  const { MARGOS } = await import('../src/regions');
  return { g, active, dataSnapshot, opponentLook, MARGOS, log, INSTINCTS };
}
/** A season in the test region, and the save it ends with. */
function testSeason(g: Game, home: string) {
  const b = new Bot(g, `test-region-${home}`);
  b.start();
  try {
    const s = g.S.newGame('T', 'balanced', home, 'cindercub', '#fff');
    s.inventory.totem = 30;
    while (s.phase === 'map') b.wander(s);
    return { lines: b.lines, did: b.did, save: s };
  } finally { b.stop(); }
}
function margosSeason(g: Game, name: string) {
  const season = seasons(g).find((x) => x.name === name)!;
  const b = new Bot(g, name);
  b.start();
  try { season.play(b); } finally { b.stop(); }
  return [`# ${season.about}`, ...b.lines].join('\n');
}
/** The data, and what the rules make of it. */
function everything(c: Awaited<ReturnType<typeof copy>>) {
  const b = new Bot(c.g, 'everything');
  b.start();
  try {
    const { N, T, D, npcs } = c.g;
    const s = c.g.S.newGame('E', 'balanced', 'tc-ash', 'cindercub', '#fff');
    s.prismSeed = 7;
    return {
      data: c.dataSnapshot(),
      teams: npcs.NPCS.map((n) => N.npcTeam(s, n, 3)),
      stock: npcs.NPCS.map((n) => T.npcStock(s, n)),
      worth: npcs.NPCS.map((n) => T.creatureValue(N.npcTeam(s, n, 1)[0])),
      stops: N.inviteStops(), rivals: N.rivalsAbout(s).map((x) => x.id),
      walk: [...D.walkSteps('tc-ash')], dares: npcs.NPCS.map((n) => D.ideas(s, n)),
      look: c.opponentLook('Test tr-one'),
    };
  } finally { b.stop(); }
}

/** Every species id in something, however deep. */
function speciesIn(v: unknown, ids: Set<string>, out = new Set<string>()) {
  if (typeof v === 'string') { const id = v.replace(/^effigy:/, ''); if (ids.has(id)) out.add(id); }
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (ids.has(k.replace(/^effigy:/, ''))) out.add(k); speciesIn(x, ids, out); }
  return out;
}

describe('the Codex', () => {
  const lives = TEST_REGION.codex.species as string[];
  let t: Awaited<ReturnType<typeof copy>>, m: Awaited<ReturnType<typeof copy>>;
  let outsiders: (v: unknown) => string[];
  beforeAll(async () => {
    m = await copy();
    t = await copy(TEST_REGION);
    const all = new Set(Object.keys(t.g.species.SPECIES_BY_ID));
    outsiders = (v) => [...speciesIn(v, all)].filter((id) => !lives.includes(id));
  }, 60000);

  it('is every species in Margos, and only its own in the test region, in the library’s order', () => {
    expect(m.g.species.SPECIES.length).toBe(Object.keys(m.g.species.SPECIES_BY_ID).length);
    const here = t.g.species.SPECIES.map((x) => x.id);
    expect([...here].sort()).toEqual([...lives].sort());
    expect(here).toEqual(m.g.species.SPECIES.map((x) => x.id).filter((id) => here.includes(id)));
    expect(Object.keys(t.g.species.SPECIES_BY_ID)).toEqual(Object.keys(m.g.species.SPECIES_BY_ID)); // anyone can still be looked up
  });

  it('leaves nothing without an answer in Margos, and the check notices when something is', () => {
    expect(codexGaps(m.g)).toEqual([]);
    const kinds = [...new Set(codexGaps(t.g).map((x) => x.split(' ')[0]))];
    expect(kinds.sort()).toEqual(['circuit', 'team', 'wild']); // (too small a region for these, on purpose)
  });

  it('lets a region change where a species lives, when and how rare it is, but never what it is', () => {
    const here = t.g.species.SPECIES_BY_ID, there = m.g.species.SPECIES_BY_ID;
    expect(here.puddlit).toEqual({ ...there.puddlit, biomes: ['desert'], activity: 'nocturnal' });
    expect(here.sproutle).toEqual({ ...there.sproutle, rarity: 'prime' });
    expect(there.sproutle.rarity).toBe('common');
    expect(here.cindercub).toEqual(there.cindercub);
  });

  it('never lets anyone from outside it turn up in the wild', () => {
    const { W, map } = t.g, b = new Bot(t.g, 'wild');
    b.start();
    try {
      for (const n of map.MAP_NODES) for (const biome of [n.biome, 'prism', 'cloud', 'tundra'] as const) for (const r of ['common', 'prime', 'apex'] as const) for (const lv of [1, 6, 10]) for (const time of ['day', 'night', undefined] as const) for (let i = 0; i < 3; i++) {
        const sp = W.pickSpecies({ ...n, biome }, r, lv, ['astral'], time);
        expect(lives, `${n.id} ${biome} ${r}`).toContain(sp.id);
        expect(sp.stage).toBeLessThanOrEqual(W.stageCapFor(lv));
      }
    } finally { b.stop(); }
  });

  it('or on a team', () => {
    const { W, N, S, Circuit, npcs, map } = t.g, b = new Bot(t.g, 'teams');
    b.start();
    try {
      const s = S.newGame('T', 'balanced', 'tc-ash', 'cindercub', '#fff');
      for (let turn = 1; turn <= 100; turn += 9) for (const n of npcs.NPCS) {
        s.turn = turn; s.prismSeed = turn;
        const team = N.npcTeam(s, n, 3);
        expect(team.length).toBeGreaterThan(0);
        expect(outsiders(team)).toEqual([]);
        expect(outsiders(t.g.T.npcOffers(s, n))).toEqual([]);
      }
      for (const c of Object.values(map.CITIES)) for (let tier = 1; tier <= 5; tier++) expect(outsiders(W.arbiterTeam(c.type, tier))).toEqual([]);
      s.turn = 60; s.location = 'tc-fen';
      for (let i = 0; i < 20; i++) { s.initiative = 9; s.flags.sparred = []; expect(outsiders(W.hallBattle(s)!.battle.sides[1].team)).toEqual([]); }
      // the Circuit, with a bracket that holds a name nobody goes by
      const g = { players: [s], circuit: { entrants: [{ name: 'T', seat: 0 }, { name: 'Nobody' }], winners: [null] } };
      for (let i = 0; i < 20; i++) expect(outsiders(Circuit.matchBattle(g, { k: 0, round: 0, me: 0, seat: 0, foe: 1, foeBot: false }).sides[1].team)).toEqual([]);
    } finally { b.stop(); }
  });

  it('or from the Depths', () => {
    const { W, content } = t.g, b = new Bot(t.g, 'depths');
    b.start();
    try {
      for (const it of Object.values(content.ITEMS)) if (it.kind === 'material') for (const r of ['common', 'prime', 'apex'] as const) for (const lv of [1, 6, 10]) for (let i = 0; i < 5; i++) expect(lives).toContain(W.depthsSpecies(it.id, r, lv).id);
    } finally { b.stop(); }
  });

  it('gives a Rival or Champion somebody, even with none of their types about', () => {
    const { N, S, npcs } = t.g, s = S.newGame('T', 'balanced', 'tc-ash', 'cindercub', '#fff');
    for (const kind of ['rival', 'champion'] as const) for (const types of [['steel', 'rock'], ['rock', 'fire'], ['astral', 'charm']] as const) {
      const fam = N.npcFamilies(s, { ...npcs.NPCS[0], id: `x-${kind}`, kind, types: [...types] });
      expect(fam.length).toBeGreaterThan(0);
      expect(outsiders(fam.map((x) => x.id))).toEqual([]);
    }
    // (a Codex whose Commons are the only ones of a type)
    const { SPECIES } = t.g.species, all = SPECIES.splice(0);
    try {
      SPECIES.push(...all.filter((x) => !x.id.startsWith('ph-')));
      expect(N.npcFamilies(s, { ...npcs.NPCS[0], id: 'y', types: ['water', 'steel'] })[0].id).toBe('puddlit');
      expect(lives).toContain(N.npcFamilies(s, { ...npcs.NPCS[0], id: 'y', types: ['steel', 'rock'] })[0].id);
    } finally { SPECIES.splice(0, SPECIES.length, ...all); }
  });

  it('is what prices and challenges go by', () => {
    const { D, S, Cr, npcs } = t.g, s = S.newGame('T', 'balanced', 'tc-ash', 'cindercub', '#fff');
    const value = (g: Game) => {
      const b = new Bot(g, 'value'); // the same dice for both
      b.start();
      try { return g.T.creatureValue(g.Cr.createCreature('cindercub', 6, { nature: 'adamant' })); } finally { b.stop(); }
    };
    expect(value(t.g)).toBe(value(t.g));
    expect(Cr.speciesOf(s.roster[0]).rarity).toBe('common');
    expect(value(t.g)).not.toBe(value(m.g)); // against what's usual here
    const asked = () => { for (let i = 0; i < 200; i++) { s.prismSeed = i; if (npcs.NPCS.some((n) => D.ideas(s, n).some((d) => d.kind === 'codex'))) return true; } return false; };
    expect(asked()).toBe(true);
    s.dex.seen = lives.slice(0, lives.length - 5); // too few left to meet
    expect(asked()).toBe(false);
  });

  it('or in an event', () => {
    const { E, S } = t.g, b = new Bot(t.g, 'events');
    b.start();
    try {
      for (const place of ['tc-ash', 'w2', 'n1', 'tt-quay', 'stadium']) for (const id of E.EVENT_IDS) for (const turn of [11, 60]) {
        const s = S.newGame('T', 'balanced', 'tc-ash', 'cindercub', '#fff');
        Object.assign(s, { location: place, turn, coins: 200 });
        for (const id of ['puddlit', 'sproutle', 'blazmane']) (s.roster.length < 3 ? s.roster : s.reserve).push(t.g.Cr.createCreature(id, 6));
        s.inventory = { ...s.inventory, 'sea-glass': 9, 'pine-resin': 9, totem: 9 };
        E.rollEvent(s, id);
        expect(outsiders(s.event), `${id} at ${place}`).toEqual([]);
        b.event(s);
        expect(outsiders(s), `${id} at ${place}`).toEqual([]);
      }
    } finally { b.stop(); }
  }, 120000);

  it('or anywhere in a season’s save', () => {
    for (const h of ['tc-ash', 'tc-fen']) {
      const s = testSeason(t.g, h).save;
      expect(s.dex.seen.length).toBeGreaterThan(8);
      expect(outsiders(s)).toEqual([]);
    }
  }, 120000);
});

describe('arenas', () => {
  let t: Awaited<ReturnType<typeof copy>>, m: Awaited<ReturnType<typeof copy>>;
  beforeAll(async () => { m = await copy(); t = await copy(TEST_REGION); }, 60000);
  const arena = (g: Game, city: string, tier = 1) => {
    const s = g.S.newGame('T', 'balanced', city, 'cindercub', '#fff');
    s.merits = Array.from({ length: (tier - 1) * 2 }, (_, i) => `m${i}`);
    const b = g.W.arbiterBattle(s, city);
    for (const side of b.sides) for (const c of side.team) { c.health = 999; c.vitality = 9; }
    return b;
  };
  const rest = { kind: 'move' as const, move: 'catch-breath' };
  // (the same dice every run)
  let die: Bot;
  beforeEach(() => { die = new Bot(m.g, 'arenas'); die.start(); });
  afterEach(() => die.stop());

  it('every city’s is in its region, and every one has a city', () => {
    for (const g of [m.MARGOS, TEST_REGION]) expect(Object.values(g.map.cities).map((c) => c.arena.trick).sort()).toEqual(Object.keys(g.arenas).sort());
  });
  it('are the region’s own, even when they share a name', () => {
    const { B } = t.g, b = arena(t.g, 'tc-ash', 3);
    const parts = B.boostsOf(b, 1).find((x) => x.stat === 'power')!.parts;
    expect(parts).toContainEqual({ label: 'The arena', value: 3 });
    const texts = B.resolveRound(b, rest).filter((e) => e.t === 'arena').map((e) => (e as { text: string }).text);
    expect(texts.length).toBe(2); // and it happens on an odd round, to Fire creatures too
    expect(texts[0]).toMatch(/^Test flames singe \w+/);
    const there = arena(m.g, 'kilauea', 3);
    expect(m.g.B.boostsOf(there, 1).find((x) => x.stat === 'power')).toBeUndefined();
    expect(m.g.B.resolveRound(there, rest).filter((e) => e.t === 'arena')).toEqual([]);
  });
  it('can have any timer', () => {
    const { B } = t.g, b = arena(t.g, 'tc-brook');
    expect([B.ringRounds(b), B.ringLeft(b)]).toEqual([4, 4]);
    const seen: string[] = [], lefts: number[] = [], lines: string[] = [];
    for (let i = 0; i < 9 && !b.over; i++) for (const e of B.resolveRound(b, rest)) {
      if (e.t === 'arena') seen.push(e.text);
      if (e.t === 'ring') lefts.push(e.left);
      const lg = { title: '', turn: 1, entries: [] as { text: string; round: number }[] };
      t.log(lg, b, e, () => 'x');
      lines.push(...lg.entries.map((x) => x.text).filter((x) => x.startsWith('Tide')));
    }
    expect(lefts).toEqual([3, 2, 1, 0]);
    expect(seen).toEqual(['Test soon.', 'Test wave.', 'Test nearly.', 'Test swept out.']);
    expect(lines[0]).toBe('Tide: 3 of 4 rounds left.');
    expect([b.over, b.round]).toEqual(['lose', 4]);
    expect(B.ringLeft(arena(t.g, 'tc-ash'))).toBe(null);
  });
  it('stops its timer when its own hazard wins the battle', () => {
    const { B } = t.g, b = arena(t.g, 'tc-brook');
    B.resolveRound(b, rest);
    b.sides[1].team.forEach((c, i) => { c.health = 1; c.vitality = 0; if (i !== b.sides[1].active) c.ko = true; });
    const ev = B.resolveRound(b, rest);
    expect(b.over).toBe('win');
    expect(ev.filter((e) => e.t === 'ring')).toEqual([]);
  });
  it('can help a side’s accuracy as well as spoil it, and only a penalty is ignored by a steady Instinct', () => {
    const { B, Cr } = t.g;
    const rolls = (steady: boolean) => {
      const b = arena(t.g, 'tc-fen'), out: Record<number, (number | undefined)[]> = { 0: [], 1: [] };
      const inst = t.INSTINCTS.find((x) => x.passive?.steady)!;
      for (const side of b.sides) for (const c of side.team) if (steady) c.instinct = inst.id;
      for (let i = 0; i < 8 && !b.over; i++) {
        for (const e of B.resolveRound(b, B.chooseAI(b, 0))) if (e.t === 'roll' && e.mods) out[e.side].push(e.mods.find((p) => p.label === 'Lanterns')?.value);
        if (b.needSwap) break;
      }
      expect(Cr.instinctIdOf(b.sides[0].team[0]) === inst.id).toBe(steady);
      return [new Set(out[0]), new Set(out[1])];
    };
    const plain = rolls(false), steady = rolls(true);
    expect(plain[0].has(2)).toBe(true);
    expect(plain[1].has(-1)).toBe(true);
    expect(steady[0].has(2)).toBe(true);
    expect(steady[1].has(-1)).toBe(false);
  });
  it('the engine and screens know none of Margos’s by name', () => {
    const root = new URL('../src/', import.meta.url);
    const files = (readdirSync(root, { recursive: true }) as string[]).map((f) => f.replace(/\\/g, '/')).filter((f) => f.endsWith('.ts') && !f.startsWith('regions/'));
    const names = new RegExp(`trick\\s*[!=]==|case '(${Object.keys(m.MARGOS.arenas).join('|')})'`);
    expect(files.filter((f) => names.test(readFileSync(new URL(f, root), 'utf-8')))).toEqual([]);
  });
});

describe('gimmicks', () => {
  let t: Awaited<ReturnType<typeof copy>>, m: Awaited<ReturnType<typeof copy>>;
  beforeAll(async () => { m = await copy(); t = await copy(TEST_REGION); }, 60000);
  const start = (g: Game, home: string) => g.S.newGame('T', 'balanced', home, 'cindercub', '#fff');

  it('gate their own region’s Arbiters, the first with an answer deciding', () => {
    const { W } = t.g, s = start(t.g, 'tc-brook');
    expect(W.arbiterGate(s, 'tc-brook')).toEqual({ ok: false, reason: 'Arb Brook is shy.' });
    s.turn = 5;
    expect(W.arbiterGate(s, 'tc-brook')).toEqual({ ok: true });
    expect(W.arbiterGate(s, 'tc-fen').ok).toBe(true);
    s.inventory.totem = 0;
    expect(W.arbiterGate(s, 'tc-fen')).toMatchObject({ ok: false, reason: 'No totem.' });
    for (const c of s.roster) c.ko = true; // (what's true everywhere comes first)
    expect(W.arbiterGate(s, 'tc-fen').reason).toMatch(/rest first/);
    expect(m.g.W.arbiterGate(start(m.g, 'thunder'), 'mangrove').reason).toMatch(/Root Whistle/);
  });
  it('only name screens that there are', () => {
    const src = (f: string) => readFileSync(new URL(`../src/regions/margos/${f}`, import.meta.url), 'utf-8');
    const named = readdirSync(new URL('../src/regions/margos/gimmicks/', import.meta.url)).flatMap((f) => [...src(`gimmicks/${f}`).matchAll(/show: '(\w+)'/g)].map((x) => x[1]));
    const there = /show: \{([^}]*)\}/.exec(src('screens.ts'))![1];
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((x) => !new RegExp(`\\b${x}:`).test(there))).toEqual([]);
  });
  it('that have moved leave nothing behind in the engine or screens', () => {
    const root = new URL('../src/', import.meta.url);
    const files = (readdirSync(root, { recursive: true }) as string[]).map((f) => f.replace(/\\/g, '/')).filter((f) => /^(engine|ui|render)\/.*\.ts$/.test(f));
    const gone = ['mangrove', 'hollow'];
    for (const id of gone) expect(files.filter((f) => new RegExp(`'${id}'`).test(readFileSync(new URL(f, root), 'utf-8'))), id).toEqual([]);
  });
});

describe('changing region', () => {
  const homes = ['tc-ash', 'tc-brook', 'tc-fen'];
  let fresh: ReturnType<typeof everything>, freshSeasons: ReturnType<typeof testSeason>[];
  let c: Awaited<ReturnType<typeof copy>>;
  beforeAll(async () => {
    const f = await copy(TEST_REGION); // never been anywhere else
    fresh = everything(f);
    freshSeasons = homes.map((h) => testSeason(f.g, h));
    c = await copy(); // this one plays Margos first
    c.dataSnapshot();
    margosSeason(c.g, 'wander-urban');
    c.active.setRegion(TEST_REGION);
  }, 120000);

  it('plays the test region as if Margos had never been loaded', () => {
    expect(everything(c)).toEqual(fresh);
    homes.forEach((h, i) => expect(testSeason(c.g, h).lines).toEqual(freshSeasons[i].lines));
  }, 120000);

  it('reaches enough of the test region to mean something', () => {
    const did: Record<string, number> = {};
    for (const f of freshSeasons) for (const [k, n] of Object.entries(f.did)) did[k] = (did[k] ?? 0) + n;
    const want = ['wild:win', 'recruit', 'trainer:win', 'buy', 'rest', 'chat', 'evolve', ...homes.map((x) => `arbiter:${x}`)];
    expect(want.filter((k) => !did[k])).toEqual([]);
  });

  it('mentions nothing of Margos in its saves', () => {
    const { MARGOS } = c;
    const mine = new Set(TEST_REGION.map.nodes.map((n) => n.id));
    const biomes = new Set(Object.keys(c.g.map.BIOME_TYPES)); // a biome can share its name with a place (canyon)
    const ids = new Set([...MARGOS.map.nodes.map((n) => n.id), ...MARGOS.people.npcs.map((n) => n.id)].filter((id) => !mine.has(id) && !biomes.has(id)));
    const names = [...MARGOS.map.nodes.map((n) => n.name), ...Object.values(MARGOS.map.cities).flatMap((x) => [x.arbiter, x.accolade, x.arena.name, x.hotpot.name]), ...MARGOS.people.npcs.map((n) => n.name)];
    const found = new Set<string>();
    const look = (v: unknown, at: string) => {
      if (typeof v === 'string') {
        if (ids.has(v)) found.add(`${at} = ${v}`);
        for (const n of names) if (new RegExp(`\\b${n.replace(/[^\w ]/g, '.')}\\b`).test(v)) found.add(`${at}: ${v} [${n}]`);
      } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
        if (ids.has(k) && !(at === 'save' && k === 'dex')) found.add(`${at}.${k}`); // (the Codex, not the Rival)
        look(x, `${at}.${k}`);
      }
    };
    for (const f of freshSeasons) look(f.save, 'save');
    expect([...found]).toEqual([]);
  });

  it('leaves Margos exactly as it was, after there and back twice', () => {
    for (let i = 0; i < 2; i++) { c.active.setRegion(TEST_REGION); everything(c); c.active.setRegion(c.MARGOS); }
    for (const [name, now] of Object.entries(c.dataSnapshot())) expect(now === saved(`data/${name}`), name).toBe(true);
    for (const name of ['tour-arbiters', 'wander-nature']) expect(saved(`seasons/${name}`).startsWith(margosSeason(c.g, name)), name).toBe(true);
  }, 120000);

  it('keeps the test region out of the game, and Margos out of the engine', () => {
    const root = new URL('../src/', import.meta.url);
    const files = (readdirSync(root, { recursive: true }) as string[]).map((f) => f.replace(/\\/g, '/')).filter((f) => f.endsWith('.ts'));
    const text = (f: string) => readFileSync(new URL(f, root), 'utf-8');
    expect(files.length).toBeGreaterThan(40);
    expect(files.filter((f) => /testRegion|Testland/.test(text(f)))).toEqual([]);
    // only the active region may name Margos: anything else that did would keep its data after a change
    expect(files.filter((f) => !f.startsWith('regions/') && /\bMARGOS\b/.test(text(f)))).toEqual([]);
  });
});
