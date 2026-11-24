// The safety net (docs/16-region-packages.md, step 1): the game's data, and whole seasons played with seeded dice,
// must be exactly what they were. If you meant to change the game, run `npm run baseline` to record it as it is now,
// and read what changed in tests/baseline before committing it.
import { describe, it, expect, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { Bot, loadGame } from './baseline/bot';
import { seasons } from './baseline/seasons';
import { dataSnapshot } from './baseline/data';

const UPDATE = !!process.env.UPDATE_BASELINE;
const dir = (sub: string) => new URL(`./baseline/${sub}/`, import.meta.url);
const file = (sub: string, name: string) => new URL(`${name}.txt`, dir(sub));
const HOW = 'If it was meant to change, run npm run baseline and check what changed in tests/baseline.';

/** Compare with the saved copy (or save it), and say where they part. */
function check(sub: string, name: string, now: string) {
  if (UPDATE) { mkdirSync(dir(sub), { recursive: true }); writeFileSync(file(sub, name), now); return; }
  const was = existsSync(file(sub, name)) ? readFileSync(file(sub, name), 'utf-8').replace(/\r\n/g, '\n') : '';
  if (was === now) return;
  const a = was.split('\n'), b = now.split('\n');
  const at = Math.max(a.length, b.length) && [...Array(Math.max(a.length, b.length)).keys()].find((i) => a[i] !== b[i])!;
  const bare = (t: string) => t.replace(/ words:\w+/g, '');
  const words = bare(was) === bare(now) ? ' Only wording changed, not the rules.' : '';
  expect.fail(`${sub}/${name} changed at line ${at + 1}.${words} ${HOW}\n  was: ${(a[at] ?? '(nothing)').slice(0, 600)}\n  now: ${(b[at] ?? '(nothing)').slice(0, 600)}`);
}
/** Files nothing writes any more. */
function tidyUp(sub: string, names: string[]) {
  if (UPDATE) for (const f of readdirSync(dir(sub))) if (!names.includes(f.replace('.txt', ''))) rmSync(new URL(f, dir(sub)));
  expect(readdirSync(dir(sub)).sort()).toEqual(names.map((x) => `${x}.txt`).sort());
}
async function play(name: string) {
  vi.resetModules(); // a new copy of the game, with nothing remembered from the season before
  const g = await loadGame();
  const season = seasons(g).find((x) => x.name === name)!;
  const b = new Bot(g, name);
  b.start();
  try { season.play(b); } finally { b.stop(); }
  const did = Object.entries(b.did).sort(([x], [y]) => (x < y ? -1 : 1));
  return { text: [`# ${season.about}`, ...b.lines, `# ${did.map(([k, n]) => `${k} ${n}`).join(', ')}`].join('\n') + '\n', did: b.did };
}
const g0 = await loadGame();
const NAMES = seasons(g0).map((x) => x.name);
const total: Record<string, number> = {};

describe('baseline: data', () => {
  const now = dataSnapshot();
  for (const [name, text] of Object.entries(now)) it(name, () => check('data', name, text));
  it('has a copy of every file', () => tidyUp('data', Object.keys(now)));
});

describe('baseline: seasons', () => {
  for (const name of NAMES) it(name, async () => {
    const { text, did } = await play(name);
    for (const [k, n] of Object.entries(did)) total[k] = (total[k] ?? 0) + n;
    check('seasons', name, text);
  }, 120000);
  it('has a copy of every season', () => tidyUp('seasons', NAMES));
  it('tells the same story whatever was played before it', async () => {
    const a = await play('tour-arbiters');
    await play('wander-nature');
    expect((await play('tour-arbiters')).text).toBe(a.text);
  }, 120000);
  it('takes in the whole game', () => {
    const { map, E } = g0;
    const want = [
      ...Object.values(map.CITIES).flatMap((c) => [`arbiter:${c.nodeId}`, `arena:${c.arena.trick}`]),
      ...[...new Set(map.MAP_NODES.filter((n) => n.kind !== 'legendary').map((n) => `biome:${n.biome}`))],
      ...map.MAP_NODES.filter((n) => n.kind === 'legendary').map((n) => `at:${n.id}`),
      ...E.EVENT_IDS.map((id) => `event:${id}`),
      ...[...map.ROAMING_KEY_ITEMS, ...Object.values(map.TOWNS).flatMap((x) => x.key ?? [])].map((id) => `key:${id}`),
      ...['race', 'arbiter', 'codex', 'recruit', 'solo', 'night', 'nabe', 'coasts', 'walk', 'finds', 'craft', 'treats'].map((k) => `dare:${k}`),
      'wild:win', 'wild:lose', 'wild:escaped', 'trainer:win', 'trainer:lose', 'arbiter:win', 'arbiter:lose', 'legendary:win', 'wiped', 'mercy', 'evolve', 'recruit', 'keen', 'left', 'legendBack',
      'fabian', 'gauntlet', 'trail', 'lap', 'satchel', 'wisp', 'plains', 'depths', 'school', 'retrain', 'pickup', 'research', 'sponsor', 'sponsorRest', 'imprint', 'gates',
      'bike', 'taxi', 'feather', 'trailmix', 'craft', 'carve', 'check', 'work', 'camp', 'rest', 'buy', 'trade', 'swapMade', 'chat', 'reply', 'write', 'invite', 'daresWon',
      'gift', 'exchange', 'duel', 'bracket', 'champion', 'circuitDuel', 'unqualified', 'stadium',
    ];
    expect(want.filter((k) => !total[k]), 'nothing in the baseline does these').toEqual([]);
  });
});
