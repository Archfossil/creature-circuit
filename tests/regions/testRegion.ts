// A tiny made-up region, only for tests: never built into the game. Three cities, two towns, a stadium and five wilds,
// with none of Margos's gimmicks. Its wild nodes have ids Margos uses too (w1, n1 …), which is where something
// remembered from another region would do harm.
import type { Npc } from '../../src/data/npcs';
import type { City, ElementType, MapEdge, MapNode } from '../../src/data/schema';
import type { Voice } from '../../src/data/texts';
import type { Outfit, Region } from '../../src/regions/types';

const node = (id: string, name: string, kind: MapNode['kind'], biome: MapNode['biome'], x: number, z: number, more: Partial<MapNode> = {}): MapNode => ({ id, name, kind, biome, x, z, rarity: 0, level: 2, ...more });
const nodes = [
  node('tc-ash', 'Testash', 'city', 'volcanic', 0, 0, { cityType: 'fire' }),
  node('tc-brook', 'Testbrook', 'city', 'lake', 40, 0, { cityType: 'water' }),
  node('tc-fen', 'Testfen', 'city', 'forest', 20, 40, { cityType: 'grass' }),
  node('stadium', 'Test Stadium', 'stadium', 'road', 20, 14),
  node('tt-mill', 'Testmill', 'town', 'meadow', 10, 25),
  node('tt-quay', 'Testquay', 'town', 'coast', 55, 12),
  node('w1', 'Test Cinders', 'wild', 'desert', 13, 1),
  node('w2', 'Test Shallows', 'wild', 'river', 27, 1),
  node('n1', 'Test Thicket', 'wild', 'forest', 12, 34, { level: 6, rarity: 1 }),
  node('n2', 'Test Marsh', 'wild', 'swamp', 33, 27),
  node('w3', 'Test Pond', 'wild', 'lake', 30, 8),
  node('tl-crown', 'Test Crown', 'legendary', 'mountain', 5, -15, { rarity: 3, level: 8, legendary: 'ph-grass-water-legendary', requires: { tier: 2 } }),
];
const edges: MapEdge[] = ([
  ['tc-ash', 'w1'], ['w1', 'w2'], ['w2', 'tc-brook'], ['tc-ash', 'tt-mill'], ['tt-mill', 'n1'], ['n1', 'tc-fen'], ['tc-fen', 'n2'], ['n2', 'tc-brook'],
  ['tc-brook', 'tt-quay'], ['w2', 'w3'], ['w3', 'stadium'], ['tt-mill', 'stadium'], ['tc-ash', 'tl-crown'],
] as const).map(([a, b]) => ({ a, b }));
const city = (nodeId: string, name: string, type: ElementType, arbiter: string, trick: City['arena']['trick']): City => ({
  nodeId, name, type, park: 'Nowhere', arbiter, accolade: `${name} Merit`, arena: { name: `${name} Arena`, trick, text: '' }, hotpot: { name: `${name} Nabe`, buff: { power: 1 }, text: '' }, blurb: '',
});
const npc = (id: string, kind: Npc['kind'], types: Npc['types'], home: string, rating: number): Npc => ({ id, name: `Test ${id}`, kind, types, home, rating, blurb: '', lines: { greet: 'Hi.', gloat: 'Ha.', concede: 'Oh.', chat: 'Hm.' } });
const npcs = [
  npc('tr-one', 'rival', ['fire', 'rock'], 'tc-ash', 40), npc('tr-two', 'rival', ['water', 'steel'], 'tc-brook', 45), npc('tr-three', 'rival', ['grass', 'charm'], 'tc-fen', 35),
  npc('tr-four', 'champion', ['fire', 'astral'], 'tc-ash', 80), npc('tr-five', 'champion', ['water', 'electric'], 'tc-brook', 85),
];
const VOICE_KEYS = ['taunt', 'grudge', 'congrats', 'news', 'hello', 'warm', 'cool', 'gift', 'stoodUp', 'mercy', 'swap', 'keen', 'dare', 'first', 'beaten'];
const voice = Object.fromEntries(VOICE_KEYS.map((k) => [k, `Test ${k}.`])) as unknown as Voice;
const outfit = { jacket: 'tee', outfit: '#123456', accent: '#654321', hat: 'none', hairStyle: 'short', hair: '#000000', pants: '#111111' } as Outfit;

export const TEST_REGION: Region = {
  id: 'test',
  name: 'Testland',
  map: {
    scale: 1, nodes, edges,
    cities: { 'tc-ash': city('tc-ash', 'Testash', 'fire', 'Arb Ash', 'flames'), 'tc-brook': city('tc-brook', 'Testbrook', 'water', 'Arb Brook', 'roots'), 'tc-fen': city('tc-fen', 'Testfen', 'grass', 'Arb Fen', 'darkness') },
    towns: { 'tt-mill': { blurb: '', sells: ['salve', 'totem'] }, 'tt-quay': { blurb: '', sells: ['calm-tea', 'sunberry'] }, stadium: { blurb: '', sells: ['salve'], special: 'stadium' } },
    places: { wispSpots: nodes.filter((n) => n.kind !== 'legendary' && n.kind !== 'stadium').map((n) => n.id), roamingKeyItems: [], keyItemTowns: [], classicKeyTowns: {}, coasts: [] },
  },
  codex: { starters: ['cindercub', 'puddlit', 'sproutle'] },
  people: { npcs, voices: Object.fromEntries(npcs.map((x) => [x.id, voice])), looks: Object.fromEntries(npcs.map((x) => [x.id, outfit])) },
  weather: { spring: ['clear', 'rain'], summer: ['heat'], autumn: ['fog'], winter: ['snow'] },
};
