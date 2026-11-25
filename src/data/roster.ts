// The roster table: one slot for every type and dual-type combination (8 single + 28 dual = 36),
// each holding a Common, a Prime and an Apex family (three stages each) plus one Legendary.
//
// Slots already covered by hand-made creatures point at them. Every other slot is filled with a
// generated PLACEHOLDER (id `ph-<type>-<type|mono>-<rarity>-<stage>`, `placeholder: true`) so the
// game has a full roster to test with. To swap one in: add the real species in species.ts and point
// its slot in `HANDMADE_SLOTS` / `HANDMADE_LEGENDARIES` below at it; the placeholder disappears.
import type { Activity, Biome, BodyShape, CreatureLook, ElementType, EyeStyle, Rarity, StatKey } from './schema';
import { TYPES, TYPE_COLOR, TYPE_LABEL } from './types';
import { BIOME_TYPES } from './map';
import { INSTINCT_POOL } from './instincts';

export interface Def {
  id: string; name: string; types: ElementType[]; rarity: Rarity; stage: 1 | 2 | 3; next?: string;
  bias: StatKey[]; weak?: StatKey; shape: BodyShape; c: [string, string]; crest: CreatureLook['crest']; eyes?: EyeStyle; marks?: CreatureLook['marks'];
  biomes: Biome[]; ability: string; instinct: string; sig?: string; dex: string;
  placeholder?: boolean; activity?: Activity; bulky?: true; balanced?: true;
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

/**
 * Placeholder families beside the table, where the wild was short of someone: a single-type Common out
 * at the time of day its type's first family isn't. Ids are `ph-<type>-<key>-common-<stage>`. To replace
 * one, add the real family in species.ts and remove its entry here.
 */
export interface ExtraFamily { type: ElementType; key: 'dusk' | 'sun'; activity: Activity; biomes: Biome[]; shape: BodyShape; names: [string, string, string]; concept: string }
export const EXTRA_FAMILIES: ExtraFamily[] = [
  { type: 'electric', key: 'dusk', activity: 'nocturnal', biomes: ['badlands', 'road', 'desert'], shape: 'lizard', names: ['Glimnewt', 'Lampskink', 'Beacodrake'], concept: 'a lantern-tailed gecko that hunts by its own sparks' },
  { type: 'fire', key: 'dusk', activity: 'nocturnal', biomes: ['volcanic', 'canyon', 'desert'], shape: 'beetle', names: ['Coalgrub', 'Cinderbug', 'Furnarab'], concept: 'a coal-shelled beetle that glows after sundown' },
  { type: 'grass', key: 'dusk', activity: 'nocturnal', biomes: ['river', 'swamp', 'forest'], shape: 'toad', names: ['Moontad', 'Bloomtoad', 'Lunacroak'], concept: 'a moonflower toad that blooms in the dark' },
  { type: 'astral', key: 'sun', activity: 'diurnal', biomes: ['tundra', 'mountain'], shape: 'hare', names: ['Dawnhop', 'Halohare', 'Sunjack'], concept: 'a sundog hare that bends daylight into halos' },
  { type: 'charm', key: 'sun', activity: 'diurnal', biomes: ['lake', 'grove', 'meadow'], shape: 'bird', names: ['Ribbonchick', 'Trillwing', 'Serenadove'], concept: 'a ribbon-finned songbird that duets with its reflection' },
];
export const extraId = (f: ExtraFamily, stage: number) => `ph-${f.type}-${f.key}-common-${stage}`;

/** Look up a slot whichever order the two types are given in. */
export function findCombo(types: ElementType[]): ElementType[] | undefined {
  return TYPE_COMBOS.find((c) => c.length === types.length && types.every((t) => c.includes(t)));
}

// ── Placeholder generation ──────────────────────────────────────
const HEAD: Record<ElementType, string> = { astral: 'Stel', charm: 'Pixi', electric: 'Zap', fire: 'Pyro', grass: 'Sprig', rock: 'Crag', steel: 'Ferro', water: 'Aqua' };
const LINK: Record<ElementType, string> = { astral: 'star', charm: 'bloom', electric: 'volt', fire: 'flare', grass: 'leaf', rock: 'stone', steel: 'gear', water: 'tide' };
/** Name endings by body shape, one per stage, so a placeholder's name says what it looks like. */
const SUFFIX: Record<BodyShape, [string, string, string]> = {
  quad: ['kit', 'pard', 'ox'], blob: ['pip', 'ling', 'arch'], bird: ['chick', 'wing', 'gale'], serpent: ['worm', 'coil', 'wyrm'],
  golem: ['nub', 'hulk', 'titan'], sprite: ['wisp', 'fae', 'nymph'], fish: ['fry', 'fin', 'maw'], lizard: ['newt', 'saur', 'drake'],
  lion: ['cub', 'mane', 'regal'], wraith: ['boo', 'shade', 'djinn'], slime: ['drip', 'goo', 'gloop'], beetle: ['grub', 'bug', 'scarab'],
  toad: ['tad', 'toad', 'croak'], hare: ['hop', 'hare', 'jack'], ape: ['chimp', 'grip', 'brute'],
};
const BIAS: Record<ElementType, [StatKey, StatKey]> = {
  astral: ['speed', 'focus'], charm: ['evasion', 'focus'], electric: ['speed', 'power'], fire: ['power', 'vigor'],
  grass: ['vigor', 'armor'], rock: ['armor', 'power'], steel: ['armor', 'ward'], water: ['vigor', 'focus'],
};
/** Body shapes a type's families draw on (six each, so a slot's three families always differ). */
const SHAPES: Record<ElementType, [BodyShape, BodyShape, BodyShape, BodyShape, BodyShape, BodyShape]> = {
  astral: ['lion', 'sprite', 'wraith', 'hare', 'bird', 'quad'], charm: ['slime', 'hare', 'wraith', 'sprite', 'serpent', 'lion'],
  electric: ['lizard', 'bird', 'beetle', 'quad', 'lion', 'hare'], fire: ['lion', 'slime', 'lizard', 'wraith', 'golem', 'beetle'],
  grass: ['toad', 'ape', 'lizard', 'sprite', 'beetle', 'serpent'], rock: ['ape', 'beetle', 'golem', 'lizard', 'quad', 'toad'],
  steel: ['beetle', 'golem', 'ape', 'serpent', 'lizard', 'lion'], water: ['slime', 'fish', 'toad', 'lizard', 'serpent', 'blob'],
};
const LEGEND_SHAPE: Record<ElementType, BodyShape> = { astral: 'bird', charm: 'wraith', electric: 'lion', fire: 'lizard', grass: 'serpent', rock: 'golem', steel: 'golem', water: 'serpent' };
const familyShape = (types: ElementType[], ri: number, ci: number): BodyShape => SHAPES[types[0]][(ci + ri * 2) % 6];
/** Eyes and markings vary from family to family; rarer ones look fiercer. */
const familyEyes = (shape: BodyShape, ri: number, ci: number): EyeStyle | undefined => (shape === 'wraith' ? 'glow' : ri === 2 || (ri === 1 && ci % 2) ? 'fierce' : ci % 5 === 3 ? 'sleepy' : undefined);
const familyMarks = (ri: number, ci: number): CreatureLook['marks'] => ([undefined, 'spots', 'stripes'] as const)[(ci + ri) % 3];
const CREST: Record<ElementType, NonNullable<CreatureLook['crest']>> = {
  astral: 'halo', charm: 'ears', electric: 'antenna', fire: 'flame', grass: 'leaf', rock: 'crystal', steel: 'plates', water: 'fin',
};
const SIG: Record<ElementType, string> = {
  astral: 'sig-borealis', charm: 'sig-moonveil', electric: 'sig-stormcall', fire: 'sig-caldera',
  grass: 'sig-overgrowth', rock: 'sig-mesa', steel: 'sig-foundry', water: 'sig-riptide',
};
/** Fire families that fight hand to hand learn the Blitz instead. */
const BLITZ_SIG = (types: ElementType[]) => types[0] === 'fire' && (!types[1] || types[1] === 'rock' || types[1] === 'steel');
const sigOf = (types: ElementType[]) => (BLITZ_SIG(types) ? 'sig-backdraft' : SIG[types[0]]);
const ABILITIES = ['sweetScent', 'babyEyes', 'keenNose', 'starSeeker', 'trailblazer', 'forager', 'quickStep', 'luckyCharm'];
/**
 * A generated family's Instinct (data/instincts.ts): from one of its types' pools (alternating between
 * the two types of a dual family by rarity). Each pool is dealt out in turn, so every Instinct goes to
 * about as many families; it starts at the 4th, as hand-made families mostly took a type's first three.
 * Every stage of a family shares it.
 */
const instinctTurn: Partial<Record<ElementType, number>> = {};
function familyInstinct(types: ElementType[], ri: number): string {
  const t = types[ri % types.length];
  const pool = INSTINCT_POOL[t];
  const n = instinctTurn[t] ?? 3;
  instinctTurn[t] = n + 1;
  return pool[n % pool.length].id;
}

/** Mix a hex colour toward black (amt < 0) or white (amt > 0). */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt));
  return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Biomes a family of these types spawns in: where both types live, else everywhere the primary does. */
function biomesFor(types: ElementType[]): Biome[] {
  // (the Rainbow Plains turn up every type, one a day, so no family calls them home)
  const all = (Object.keys(BIOME_TYPES) as Biome[]).filter((b) => b !== 'prism' && BIOME_TYPES[b].includes(types[0]));
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
  const shape = familyShape(types, ri, ci);
  const instinct = familyInstinct(types, ri);
  return ([1, 2, 3] as const).map((stage) => ({
    id: phId(types, rarity, stage),
    name: cap(stem + SUFFIX[shape][stage - 1]),
    types, rarity, stage,
    next: stage < 3 ? phId(types, rarity, stage + 1) : undefined,
    bias: stage === 1 ? [BIAS[t1][0]] : [BIAS[t1][0], t2 ? BIAS[t2][0] : BIAS[t1][1]],
    shape,
    eyes: familyEyes(shape, ri, ci),
    marks: familyMarks(ri, ci),
    c: [shade(TYPE_COLOR[t1], -0.14 * (stage - 1)), t2 ? TYPE_COLOR[t2] : shade(TYPE_COLOR[t1], 0.55)],
    crest: stage === 3 && rarity === 'apex' ? 'horns' : CREST[t2 ?? t1],
    biomes: biomesFor(types),
    ability: ABILITIES[(TYPES.indexOf(t1) + ri * 3 + ci) % ABILITIES.length],
    instinct,
    sig: rarity === 'common' ? sigOf(types) : undefined,
    dex: `Placeholder: the ${comboLabel(types)} ${cap(rarity)} family, stage ${stage} of 3. To be replaced with a real creature.`,
    placeholder: true,
  }));
}

function extraFamily(f: ExtraFamily): Def[] {
  const t = f.type;
  const instinct = familyInstinct([t], 0);
  return ([1, 2, 3] as const).map((stage) => ({
    id: extraId(f, stage),
    name: f.names[stage - 1],
    types: [t], rarity: 'common' as const, stage,
    next: stage < 3 ? extraId(f, stage + 1) : undefined,
    bias: stage === 1 ? [BIAS[t][1]] : [BIAS[t][1], BIAS[t][0]],
    shape: f.shape,
    ...(f.key === 'dusk' ? { eyes: 'sleepy' as const } : {}),
    c: [shade(TYPE_COLOR[t], f.key === 'dusk' ? -0.35 - 0.08 * stage : 0.2), f.key === 'dusk' ? '#ffe27a' : '#fff6d8'],
    crest: CREST[t],
    biomes: f.biomes,
    ability: ABILITIES[(TYPES.indexOf(t) + 5) % ABILITIES.length],
    instinct,
    sig: sigOf([t]),
    dex: `Placeholder: a second ${TYPE_LABEL[t]} Common family, stage ${stage} of 3, out by ${f.key === 'dusk' ? 'night' : 'day'}. Concept: ${f.concept}. To be replaced with a real creature.`,
    placeholder: true,
    activity: f.activity,
  }));
}

function placeholderLegendary(types: ElementType[], ci: number): Def {
  const [t1, t2] = types;
  return {
    id: phId(types, 'legendary'),
    name: cap(HEAD[t1] + (t2 ? LINK[t2] : '') + 'eon'),
    types, rarity: 'legendary', stage: 1,
    bias: [BIAS[t1][0], t2 ? BIAS[t2][0] : BIAS[t1][1]],
    shape: LEGEND_SHAPE[t1],
    eyes: LEGEND_SHAPE[t1] === 'wraith' ? 'glow' : 'fierce',
    c: [shade(TYPE_COLOR[t1], -0.25), t2 ? TYPE_COLOR[t2] : '#ffd84a'],
    crest: 'halo',
    biomes: biomesFor(types),
    ability: ABILITIES[(ci * 5) % ABILITIES.length],
    instinct: familyInstinct(types, 3),
    dex: `Placeholder: the ${comboLabel(types)} Legendary. To be replaced with a real creature (and given a roaming node on the map).`,
    placeholder: true,
  };
}

/** Placeholder defs for every slot not already filled by a hand-made creature, then the extra families (last, so they don't shift anyone's Instinct). */
export const PLACEHOLDER_DEFS: Def[] = [...TYPE_COMBOS.flatMap((types, ci) => [
  ...FAMILY_RARITIES.flatMap((r) => (HANDMADE_SLOTS[`${slotKey(types)}/${r}`] ? [] : placeholderFamily(types, r, ci))),
  ...(HANDMADE_LEGENDARIES[slotKey(types)] ? [] : [placeholderLegendary(types, ci)]),
]), ...EXTRA_FAMILIES.flatMap(extraFamily)];

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
