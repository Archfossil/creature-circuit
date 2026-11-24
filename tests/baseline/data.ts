// A readable copy of everything the game's data says: tests/baseline.test.ts compares it with the saved one, so
// moving data between files can't change it unnoticed. One line per item, so a difference shows which item.
import { tools } from '../../src/engine/tools';
import { prismType } from '../../src/regions/margos/gimmicks/plains';
import { neighbors, MAP_NODES, TOWNS } from '../../src/data/map';
import * as content from '../../src/data/content';
import * as icons from '../../src/data/icons';
import * as instincts from '../../src/data/instincts';
import * as map from '../../src/data/map';
import * as moves from '../../src/data/moves';
import * as npcs from '../../src/data/npcs';
import * as roster from '../../src/data/roster';
import * as species from '../../src/data/species';
import * as swapMoves from '../../src/data/swapMoves';
import * as texts from '../../src/data/texts';
import * as types from '../../src/data/types';
import * as looks from '../../src/render/npcLooks';
import * as land from '../../src/render/land';
import * as W from '../../src/engine/world';
import * as N from '../../src/engine/npcs';
import * as E from '../../src/engine/events';
import { newGame } from '../../src/engine/state';
import { TYPES } from '../../src/data/types';

/** Everything but functions, in the order it's written (the order of lists and keys can matter to dice). */
const text = (v: unknown): string => JSON.stringify(v, (_k, x) => (x instanceof Map ? { map: [...x] } : x instanceof Set ? { set: [...x] } : x instanceof RegExp ? String(x) : typeof x === 'function' ? 'function' : typeof x === 'number' && !Number.isFinite(x) ? String(x) : x)) ?? 'undefined';
/** A value as lines: lists and tables get one line per entry. */
function lines(name: string, v: unknown): string[] {
  if (Array.isArray(v)) return [`${name} (${v.length})`, ...v.map((x) => `  ${text(x)}`)];
  if (v && typeof v === 'object' && !(v instanceof Map) && !(v instanceof Set) && !(v instanceof RegExp)) { const e = Object.entries(v); return [`${name} (${e.length})`, ...e.map(([k, x]) => `  ${k}: ${text(x)}`)]; }
  return [`${name}: ${text(v)}`];
}
/** A module's exports, by name (the order of exports doesn't matter). */
const exportsOf = (m: Record<string, unknown>) => Object.keys(m).sort().filter((k) => typeof m[k] !== 'function').flatMap((k) => lines(k, m[k]));
const ids = (l: { id: string }[]) => l.map((x) => x.id).join(' ');

/** What the rules work out from the data: lists made when the game loads, and who lives where. */
function derived(): string[] {
  const s = newGame('T', 'balanced', 'thunder', 'sproutle', '#fff');
  s.prismSeed = 12345;
  const out = [
    ...lines('RIVALS', ids(N.RIVALS)), ...lines('CHAMPIONS', ids(N.CHAMPIONS)), ...lines('inviteStops', N.inviteStops()),
    ...lines('CLOUD_LAP', W.CLOUD_LAP), ...lines('EVENT_IDS', E.EVENT_IDS), ...lines('EVENT_PLACES', E.EVENT_PLACES), ...lines('EVENT_TIMES', E.EVENT_TIMES),
    'neighbors', ...MAP_NODES.map((n) => `  ${n.id}: ${neighbors(n.id).map((x) => `${x.node.id}${x.edge.via ? `(${x.edge.via})` : ''}`).join(' ')}`),
    'marketStock', ...MAP_NODES.filter((n) => n.kind === 'city' || TOWNS[n.id]).map((n) => `  ${n.id}: ${W.marketStock(n.id).join(' ')}`),
    'prismType', `  ${Array.from({ length: 101 }, (_, t) => prismType(s, tools, t)).join(' ')}`,
    'speciesPool',
  ];
  for (const biome of Object.keys(map.BIOME_TYPES) as (keyof typeof map.BIOME_TYPES)[]) for (const type of TYPES) for (const rarity of ['common', 'prime', 'apex'] as const) for (const time of ['day', 'night'] as const) out.push(`  ${biome} ${type} ${rarity} ${time}: ${ids(W.speciesPool(biome, type, rarity, 3, time))}`);
  out.push('encounterSpots', ...species.SPECIES.map((x) => `  ${x.id}: ${W.encounterSpots(x.id).map((p) => `${p.node.id}${p.minStage > 1 ? `/${p.minStage}` : ''}`).join(' ')}`));
  out.push('speciesBiomes', ...species.SPECIES.map((x) => `  ${x.id}: ${W.speciesBiomes(x.id).join(' ')}`));
  out.push('championAt'); // where each Champion travels, with this game seed
  for (const c of N.CHAMPIONS) out.push(`  ${c.id}: ${Array.from({ length: 20 }, (_, i) => N.championAt(s, c, 1 + i * 5)).join(' ')}`);
  out.push('npcMerits');
  for (const c of N.RIVALS) out.push(`  ${c.id}: ${N.npcMerits(s, c, 100).join(' ')}`);
  out.push('npcTeam at turn 99');
  s.turn = 99;
  for (const c of npcs.NPCS) out.push(`  ${c.id}: ${N.npcTeam(s, c, 3).map((x) => `${x.species} ${x.nature} ${x.playbook.join('+')}`).join(' | ')}`);
  // the coast, as a coarse picture (0 sea … 9 land)
  const S = map.MAP_SCALE, row = (z: number) => Array.from({ length: 61 }, (_, i) => Math.round(land.landField((i * 3 - 90) * S, z * S) * 9)).join('');
  out.push('landField', ...Array.from({ length: 61 }, (_, i) => `  ${row(i * 3 - 75)}`));
  return out;
}

/** File name → its lines. */
export function dataSnapshot(): Record<string, string> {
  const mods: Record<string, Record<string, unknown>> = { content, icons, instincts, map, moves, npcs, roster, species, swapMoves, texts, types, npcLooks: looks, land };
  const out: Record<string, string> = {};
  for (const [name, m] of Object.entries(mods)) out[name] = exportsOf(m).join('\n') + '\n';
  out.derived = derived().join('\n') + '\n';
  return out;
}
