// The roster table: one slot for every type and dual-type combination (8 single + 28 dual = 36),
// each holding a Common, a Prime and an Apex family (three stages each) plus one Legendary.
//
// Slots already covered by hand-made creatures point at them. Every other slot is filled with a
// generated PLACEHOLDER (id `ph-<type>-<type|mono>-<rarity>-<stage>`, `placeholder: true`) so the
// game has a full roster to test with. To swap one in: add the real species in species.ts and point
// its slot in `HANDMADE_SLOTS` / `HANDMADE_LEGENDARIES` below at it; the placeholder disappears.
import type { Biome, BodyShape, CreatureLook, ElementType, Rarity, StatKey } from './schema';
import { TYPES, TYPE_COLOR, TYPE_LABEL } from './types';
import { BIOME_TYPES } from './map';

export interface Def {
  id: string; name: string; types: ElementType[]; rarity: Rarity; stage: 1 | 2 | 3; next?: string;
  bias: StatKey[]; weak?: StatKey; shape: BodyShape; c: [string, string]; crest: CreatureLook['crest'];
  biomes: Biome[]; ability: string; affinity: string; sig?: string; dex: string;
  placeholder?: boolean;
}

export type FamilyRarity = 'common' | 'prime' | 'apex';
export const FAMILY_RARITIES: FamilyRarity[] = ['common', 'prime', 'apex'];

/** Slot key: the types in roster order, e.g. "fire", "fire+water". */
export const slotKey = (types: ElementType[]) => types.join('+');

/**
 * Every type combination once. A dual pair's leading (primary) type is chosen so each type leads
 * 3–4 of its 7 pairs; the primary decides where the family spawns and its Codex colour.
 */
export const TYPE_COMBOS: ElementType[][] = (() => {
  const out: ElementType[][] = TYPES.map((t) => [t]);
  for (let i = 0; i < TYPES.length; i++) for (let j = i + 1; j < TYPES.length; j++) {
    const d = j - i;
    const iLeads = d <= 3 || (d === 4 && i < 4);
    out.push(iLeads ? [TYPES[i], TYPES[j]] : [TYPES[j], TYPES[i]]);
  }
  return out;
})();

/** Hand-made three-stage families that already fill a slot (keyed `<slot>/<rarity>`). */
export const HANDMADE_SLOTS: Record<string, [string, string, string]> = {
  'astral/common': ['twinkit', 'lumenox', 'polarion'],
  'charm/common': ['mossprite', 'fernixie', 'glamorwyn'],
  'electric/common': ['zapup', 'voltusk', 'stormhound'],
  'fire/common': ['cindercub', 'blazmane', 'pyrothane'],
  'grass/common': ['sproutle', 'thornback', 'redwarden'],
  'rock/common': ['pebbark', 'cragjaw', 'mesahound'],
  'steel/common': ['rivetail', 'ferrocrab', 'ironclawd'],
  'water/common': ['puddlit', 'marshfin', 'mangrovore'],
};
/** Hand-made Legendaries that already fill a slot. */
export const HANDMADE_LEGENDARIES: Record<string, string> = {
  'astral+fire': 'solstara',
  'steel+water': 'thalassor',
  'water+astral': 'nimbalune',
};

/** Look up a slot whichever order the two types are given in. */
export function findCombo(types: ElementType[]): ElementType[] | undefined {
  return TYPE_COMBOS.find((c) => c.length === types.length && types.every((t) => c.includes(t)));
}

// ── Placeholder generation ──────────────────────────────────────
const HEAD: Record<ElementType, string> = { astral: 'Stel', charm: 'Pixi', electric: 'Zap', fire: 'Pyro', grass: 'Sprig', rock: 'Crag', steel: 'Ferro', water: 'Aqua' };
const LINK: Record<ElementType, string> = { astral: 'star', charm: 'bloom', electric: 'volt', fire: 'flare', grass: 'leaf', rock: 'stone', steel: 'gear', water: 'tide' };
const SUFFIX: Record<FamilyRarity, [string, string, string]> = {
  common: ['kit', 'ox', 'or'], prime: ['mite', 'ling', 'arch'], apex: ['wisp', 'wyrm', 'titan'],
};
const BIAS: Record<ElementType, [StatKey, StatKey]> = {
  astral: ['speed', 'focus'], charm: ['evasion', 'focus'], electric: ['speed', 'power'], fire: ['power', 'vigor'],
  grass: ['vigor', 'armor'], rock: ['armor', 'power'], steel: ['armor', 'ward'], water: ['vigor', 'focus'],
};
const SHAPES: Record<ElementType, [BodyShape, BodyShape, BodyShape, BodyShape]> = { // common, prime, apex, legendary
  astral: ['quad', 'sprite', 'bird', 'bird'], charm: ['sprite', 'blob', 'serpent', 'sprite'],
  electric: ['quad', 'sprite', 'bird', 'bird'], fire: ['quad', 'blob', 'golem', 'bird'],
  grass: ['quad', 'sprite', 'serpent', 'serpent'], rock: ['quad', 'blob', 'golem', 'golem'],
  steel: ['golem', 'sprite', 'serpent', 'golem'], water: ['fish', 'blob', 'serpent', 'serpent'],
};
const CREST: Record<ElementType, NonNullable<CreatureLook['crest']>> = {
  astral: 'halo', charm: 'ears', electric: 'antenna', fire: 'flame', grass: 'leaf', rock: 'crystal', steel: 'plates', water: 'fin',
};
const SIG: Record<ElementType, string> = {
  astral: 'sig-borealis', charm: 'sig-moonveil', electric: 'sig-stormcall', fire: 'sig-caldera',
  grass: 'sig-overgrowth', rock: 'sig-mesa', steel: 'sig-foundry', water: 'sig-riptide',
};
const ABILITIES = ['sweetScent', 'babyEyes', 'keenNose', 'starSeeker', 'trailblazer', 'forager', 'quickStep', 'luckyCharm'];
const AFFINITIES = ['tagStrike', 'shieldPass', 'slipstream', 'siphon', 'rally'];

/** Mix a hex colour toward black (amt < 0) or white (amt > 0). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Biomes a family of these types spawns in: where both types live, else everywhere the primary does. */
function biomesFor(types: ElementType[]): Biome[] {
  const all = (Object.keys(BIOME_TYPES) as Biome[]).filter((b) => BIOME_TYPES[b].includes(types[0]));
  const both = all.filter((b) => types.every((t) => BIOME_TYPES[b].includes(t)));
  return both.length ? both : all;
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const phId = (types: ElementType[], rarity: Rarity, stage?: number) => `ph-${types[0]}-${types[1] ?? 'mono'}-${rarity}${stage ? `-${stage}` : ''}`;
const comboLabel = (types: ElementType[]) => types.map((t) => TYPE_LABEL[t]).join('/');

function placeholderFamily(types: ElementType[], rarity: FamilyRarity, ci: number): Def[] {
  const [t1, t2] = types;
  const ri = FAMILY_RARITIES.indexOf(rarity);
  const stem = HEAD[t1] + (t2 ? LINK[t2] : '');
  return ([1, 2, 3] as const).map((stage) => ({
    id: phId(types, rarity, stage),
    name: cap(stem + SUFFIX[rarity][stage - 1]),
    types, rarity, stage,
    next: stage < 3 ? phId(types, rarity, stage + 1) : undefined,
    bias: stage === 1 ? [BIAS[t1][0]] : [BIAS[t1][0], t2 ? BIAS[t2][0] : BIAS[t1][1]],
    shape: SHAPES[t1][ri],
    c: [shade(TYPE_COLOR[t1], -0.14 * (stage - 1)), t2 ? TYPE_COLOR[t2] : shade(TYPE_COLOR[t1], 0.55)],
    crest: stage === 3 && rarity === 'apex' ? 'horns' : CREST[t2 ?? t1],
    biomes: biomesFor(types),
    ability: ABILITIES[(TYPES.indexOf(t1) + ri * 3 + ci) % ABILITIES.length],
    affinity: AFFINITIES[(ci + ri) % AFFINITIES.length],
    sig: rarity === 'common' ? SIG[t1] : undefined,
    dex: `Placeholder: the ${comboLabel(types)} ${cap(rarity)} family, stage ${stage} of 3. To be replaced with a real creature.`,
    placeholder: true,
  }));
}

function placeholderLegendary(types: ElementType[], ci: number): Def {
  const [t1, t2] = types;
  return {
    id: phId(types, 'legendary'),
    name: cap(HEAD[t1] + (t2 ? LINK[t2] : '') + 'eon'),
    types, rarity: 'legendary', stage: 1,
    bias: [BIAS[t1][0], t2 ? BIAS[t2][0] : BIAS[t1][1]],
    shape: SHAPES[t1][3],
    c: [shade(TYPE_COLOR[t1], -0.25), t2 ? TYPE_COLOR[t2] : '#ffd84a'],
    crest: 'halo',
    biomes: biomesFor(types),
    ability: ABILITIES[(ci * 5) % ABILITIES.length],
    affinity: AFFINITIES[ci % AFFINITIES.length],
    dex: `Placeholder: the ${comboLabel(types)} Legendary. To be replaced with a real creature (and given a roaming node on the map).`,
    placeholder: true,
  };
}

/** Placeholder defs for every slot not already filled by a hand-made creature. */
export const PLACEHOLDER_DEFS: Def[] = TYPE_COMBOS.flatMap((types, ci) => [
  ...FAMILY_RARITIES.flatMap((r) => (HANDMADE_SLOTS[`${slotKey(types)}/${r}`] ? [] : placeholderFamily(types, r, ci))),
  ...(HANDMADE_LEGENDARIES[slotKey(types)] ? [] : [placeholderLegendary(types, ci)]),
]);

export interface RosterSlot {
  types: ElementType[];
  common: [string, string, string];
  prime: [string, string, string];
  apex: [string, string, string];
  legendary: string;
}

/** The full table: 36 slots, each naming the species ids that fill it (hand-made or placeholder). */
export const ROSTER: RosterSlot[] = TYPE_COMBOS.map((types) => {
  const fam = (r: FamilyRarity) => HANDMADE_SLOTS[`${slotKey(types)}/${r}`] ?? [1, 2, 3].map((st) => phId(types, r, st)) as [string, string, string];
  return { types, common: fam('common'), prime: fam('prime'), apex: fam('apex'), legendary: HANDMADE_LEGENDARIES[slotKey(types)] ?? phId(types, 'legendary') };
});
