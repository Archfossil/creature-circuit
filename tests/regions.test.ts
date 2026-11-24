// Changing region leaves nothing of the last one behind (docs/16-region-packages.md, step 3).
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { Bot, loadGame, type Game } from './baseline/bot';
import { seasons } from './baseline/seasons';
import { TEST_REGION } from './regions/testRegion';

const saved = (path: string) => readFileSync(new URL(`./baseline/${path}.txt`, import.meta.url), 'utf-8').replace(/\r\n/g, '\n');
/** The game's files, all from one copy of it: `first` is the region it starts in. */
async function copy(first?: typeof TEST_REGION) {
  vi.resetModules();
  const active = await import('../src/regions/active');
  if (first) active.setRegion(first);
  const g = await loadGame();
  const { dataSnapshot } = await import('./baseline/data');
  const { opponentLook } = await import('../src/render/npcLooks');
  const { MARGOS } = await import('../src/regions');
  return { g, active, dataSnapshot, opponentLook, MARGOS };
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
