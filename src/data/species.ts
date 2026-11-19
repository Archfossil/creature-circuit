import type { Species, ElementType, Rarity, StatKey, Stats, Biome, EnergyMap } from './schema';
import { PLACEHOLDER_DEFS, type Def } from './roster';

// Example creature database (placeholder content until the official list lands).
// Base stats are generated from rarity + stage, then nudged by a "bias" so each species feels distinct.

function baseStats(rarity: Rarity, stage: number, bias: StatKey[], weak?: StatKey): Stats {
  const r = rarity === 'common' ? 0 : rarity === 'prime' ? 1 : rarity === 'apex' ? 2 : 3;
  const s = stage - 1;
  const st: Stats = {
    vigor: 3 + s + Math.floor(r / 2) + (r >= 3 ? 1 : 0),
    power: 1 + s + (r >= 2 ? 1 : 0),
    armor: Math.floor((s + r) / 2),
    focus: 1 + s + (r >= 1 ? 1 : 0),
    ward: Math.floor((s + r) / 2),
    speed: 4 + s + r,
    evasion: 3,
    stamina: 5 + s + r,
  };
  for (const b of bias) st[b] += b === 'evasion' ? 1 : 2;
  if (weak) st[weak] = Math.max(0, st[weak] - (weak === 'evasion' ? 1 : 1));
  st.evasion = Math.min(st.evasion, 5);
  return st;
}

/** Energy is generated at 2x the original prototype rate so playbooks have room for real choices. */
export const ENERGY_SCALE = 2;

function energyFor(types: ElementType[], rarity: Rarity, stage: number): EnergyMap {
  const r = rarity === 'common' ? 0 : rarity === 'prime' ? 1 : rarity === 'apex' ? 2 : 3;
  const total = (3 + (stage - 1) * 2 + r) * ENERGY_SCALE;
  const e: EnergyMap = {};
  if (types.length === 1) e[types[0]] = total;
  else { e[types[0]] = Math.ceil(total * 0.6); e[types[1]] = Math.floor(total * 0.4); }
  if (stage === 3 || r >= 2) e.prisma = (r >= 3 ? 2 : 1) * ENERGY_SCALE;
  return e;
}

function sp(d: Def): Species {
  const rt = { common: 5, prime: 7, apex: 9, legendary: 12 }[d.rarity] + (d.stage - 1);
  return {
    id: d.id, name: d.name, types: d.types as Species['types'], rarity: d.rarity, stage: d.stage,
    evolvesTo: d.next, base: baseStats(d.rarity, d.stage, d.bias, d.weak), energy: energyFor(d.types, d.rarity, d.stage),
    rt, ability: d.ability, affinity: d.affinity, signature: d.sig, movement: d.move, biomes: d.biomes, dex: d.dex,
    look: { shape: d.shape, primary: d.c[0], secondary: d.c[1], crest: d.crest },
    ...(d.placeholder ? { placeholder: true } : {}),
  };
}

const AST: Biome[] = ['tundra', 'mountain'];
const CHA: Biome[] = ['grove', 'forest', 'meadow'];
const ELE: Biome[] = ['badlands', 'road', 'desert'];
const FIR: Biome[] = ['volcanic', 'desert'];
const GRA: Biome[] = ['forest', 'meadow', 'swamp'];
const ROC: Biome[] = ['canyon', 'mountain', 'badlands'];
const STE: Biome[] = ['coast', 'road', 'mountain'];
const WAT: Biome[] = ['lake', 'river', 'swamp', 'coast'];

const HANDMADE: Species[] = [
  // ── ASTRAL ───────────────────────────────────────────
  sp({ id: 'twinkit', name: 'Twinkit', types: ['astral'], rarity: 'common', stage: 1, next: 'lumenox', bias: ['speed'], shape: 'quad', c: ['#6b4bd6', '#f6e7ff'], crest: 'ears', biomes: AST, ability: 'starSeeker', affinity: 'slipstream', sig: 'sig-borealis', dex: 'A fox kit whose tail tip glows brighter on clear nights. Packs of them chase falling stars across the tundra.' }),
  sp({ id: 'lumenox', name: 'Lumenox', types: ['astral'], rarity: 'common', stage: 2, next: 'polarion', bias: ['speed', 'focus'], shape: 'quad', c: ['#5a35c9', '#d9c6ff'], crest: 'ears', biomes: AST, ability: 'starSeeker', affinity: 'slipstream', sig: 'sig-borealis', dex: 'Its fur stores starlight by day and releases it in slow ripples after dusk.' }),
  sp({ id: 'polarion', name: 'Polarion', types: ['astral', 'water'], rarity: 'common', stage: 3, bias: ['speed', 'focus'], shape: 'quad', c: ['#3d2a8f', '#bff6ff'], crest: 'halo', biomes: AST, ability: 'starSeeker', affinity: 'slipstream', sig: 'sig-borealis', move: 'fly', dex: 'Said to run along the aurora itself. Trainers who earn its loyalty never lose their way north.' }),
  sp({ id: 'orbuddle', name: 'Orbuddle', types: ['astral'], rarity: 'prime', stage: 1, next: 'nebulith', bias: ['ward'], shape: 'blob', c: ['#2b2368', '#b38bff'], crest: 'crystal', biomes: AST, ability: 'luckyCharm', affinity: 'shieldPass', dex: 'A drifting puddle of night sky. Pebble-sized stars orbit its body.' }),
  sp({ id: 'nebulith', name: 'Nebulith', types: ['astral', 'rock'], rarity: 'prime', stage: 2, bias: ['ward', 'vigor'], weak: 'speed', shape: 'golem', c: ['#2b2368', '#d4b8ff'], crest: 'crystal', biomes: ['mountain'], ability: 'luckyCharm', affinity: 'shieldPass', dex: 'Meteor iron fused to its hide over centuries of stargazing on high ridges.' }),
  sp({ id: 'zenithar', name: 'Zenithar', types: ['astral'], rarity: 'apex', stage: 1, bias: ['focus', 'speed'], shape: 'bird', c: ['#9013fe', '#fff6c2'], crest: 'halo', biomes: ['tundra'], ability: 'starSeeker', affinity: 'tagStrike', move: 'fly', dex: 'Appears at the peak of the aurora. Its wingbeats leave constellations hanging in the air.' }),

  // ── CHARM ────────────────────────────────────────────
  sp({ id: 'mossprite', name: 'Mossprite', types: ['charm'], rarity: 'common', stage: 1, next: 'fernixie', bias: ['evasion'], shape: 'sprite', c: ['#ff9be8', '#a8e07a'], crest: 'leaf', biomes: CHA, ability: 'babyEyes', affinity: 'rally', sig: 'sig-moonveil', dex: 'Hides in moss beds and giggles at lost hikers. Means no harm. Mostly.' }),
  sp({ id: 'fernixie', name: 'Fernixie', types: ['charm'], rarity: 'common', stage: 2, next: 'glamorwyn', bias: ['evasion', 'focus'], shape: 'sprite', c: ['#f77fdc', '#8fd16a'], crest: 'leaf', biomes: CHA, ability: 'babyEyes', affinity: 'rally', sig: 'sig-moonveil', dex: 'Weaves illusions from fog and fern. Can appear as a deer, a stump, or your best friend.' }),
  sp({ id: 'glamorwyn', name: 'Glamorwyn', types: ['charm', 'astral'], rarity: 'common', stage: 3, bias: ['evasion', 'focus'], shape: 'sprite', c: ['#fc88fc', '#fff1a8'], crest: 'halo', biomes: ['grove'], ability: 'babyEyes', affinity: 'rally', sig: 'sig-moonveil', move: 'wayfind', dex: 'Queen of the Hollow Crest fog. Its gaze is said to show you who you could become.' }),
  sp({ id: 'puffwisp', name: 'Puffwisp', types: ['charm'], rarity: 'prime', stage: 1, next: 'velvetuft', bias: ['vigor'], shape: 'blob', c: ['#ffd1f5', '#ff6fcf'], crest: 'ears', biomes: ['meadow', 'grove'], ability: 'sweetScent', affinity: 'siphon', dex: 'Its fluff smells of honey and rain. Wild creatures flock to it.' }),
  sp({ id: 'velvetuft', name: 'Velvetuft', types: ['charm'], rarity: 'prime', stage: 2, bias: ['vigor', 'ward'], shape: 'blob', c: ['#ffb8ee', '#d1007a'], crest: 'ears', biomes: ['meadow', 'grove'], ability: 'sweetScent', affinity: 'siphon', dex: 'Hugging one is said to cure homesickness. It insists on the hug.' }),
  sp({ id: 'mirageon', name: 'Mirageon', types: ['charm', 'water'], rarity: 'apex', stage: 1, bias: ['focus', 'evasion'], shape: 'serpent', c: ['#ff7ad9', '#7fffe6'], crest: 'fin', biomes: ['grove', 'lake'], ability: 'luckyCharm', affinity: 'tagStrike', move: 'sail', dex: 'A shimmering serpent seen only in mirror-still lakes. Most sightings are reflections.' }),

  // ── ELECTRIC ─────────────────────────────────────────
  sp({ id: 'zapup', name: 'Zapup', types: ['electric'], rarity: 'common', stage: 1, next: 'voltusk', bias: ['speed'], shape: 'quad', c: ['#ffe14a', '#3a3a3a'], crest: 'antenna', biomes: ELE, ability: 'trailblazer', affinity: 'slipstream', sig: 'sig-stormcall', dex: 'Its fur stands on end before every storm. Ranchers keep one as a barometer.' }),
  sp({ id: 'voltusk', name: 'Voltusk', types: ['electric'], rarity: 'common', stage: 2, next: 'stormhound', bias: ['speed', 'power'], shape: 'quad', c: ['#f8d81c', '#2c2c2c'], crest: 'horns', biomes: ELE, ability: 'trailblazer', affinity: 'slipstream', sig: 'sig-stormcall', dex: 'Grinds its tusks on sandstone to sharpen the sparks between them.' }),
  sp({ id: 'stormhound', name: 'Stormhound', types: ['electric', 'steel'], rarity: 'common', stage: 3, bias: ['speed', 'power'], shape: 'quad', c: ['#f8e71c', '#5b6270'], crest: 'spikes', biomes: ['badlands'], ability: 'trailblazer', affinity: 'slipstream', sig: 'sig-stormcall', move: 'tunnel', dex: 'Runs ahead of the Thunder Spike storm front, herding lightning like cattle.' }),
  sp({ id: 'fizzlet', name: 'Fizzlet', types: ['electric'], rarity: 'prime', stage: 1, next: 'arcwing', bias: ['focus'], shape: 'sprite', c: ['#fff36b', '#59c8ff'], crest: 'antenna', biomes: ['road', 'badlands'], ability: 'keenNose', affinity: 'tagStrike', dex: 'A static-charged bug that loves roadside power lines.' }),
  sp({ id: 'arcwing', name: 'Arcwing', types: ['electric'], rarity: 'prime', stage: 2, bias: ['focus', 'speed'], shape: 'bird', c: ['#f8e71c', '#2f8cff'], crest: 'antenna', biomes: ['badlands'], ability: 'keenNose', affinity: 'tagStrike', move: 'fly', dex: 'Glides on updrafts from the badlands. Its wings arc with blue static.' }),
  sp({ id: 'tempestrix', name: 'Tempestrix', types: ['electric', 'astral'], rarity: 'apex', stage: 1, bias: ['focus', 'power'], shape: 'serpent', c: ['#f8e71c', '#7a2cff'], crest: 'horns', biomes: ['badlands'], ability: 'starSeeker', affinity: 'tagStrike', move: 'fly', dex: 'The storm at Thunder Spike is rumored to be its breathing.' }),

  // ── FIRE ─────────────────────────────────────────────
  sp({ id: 'cindercub', name: 'Cindercub', types: ['fire'], rarity: 'common', stage: 1, next: 'blazmane', bias: ['power'], shape: 'quad', c: ['#e2412c', '#ffc23d'], crest: 'flame', biomes: FIR, ability: 'forager', affinity: 'tagStrike', sig: 'sig-caldera', dex: 'Naps in warm ash. Sneezes sparks when startled.' }),
  sp({ id: 'blazmane', name: 'Blazmane', types: ['fire'], rarity: 'common', stage: 2, next: 'pyrothane', bias: ['power', 'vigor'], shape: 'quad', c: ['#c7231b', '#ffb02e'], crest: 'flame', biomes: FIR, ability: 'forager', affinity: 'tagStrike', sig: 'sig-caldera', dex: 'Its mane is real fire. It grows brighter when it is proud of its trainer.' }),
  sp({ id: 'pyrothane', name: 'Pyrothane', types: ['fire', 'rock'], rarity: 'common', stage: 3, bias: ['power', 'vigor'], shape: 'quad', c: ['#8f1410', '#ff8a1f'], crest: 'horns', biomes: ['volcanic'], ability: 'forager', affinity: 'tagStrike', sig: 'sig-caldera', move: 'tunnel', dex: 'Swims through lava tubes beneath Kilauea Forge. Its roar cracks basalt.' }),
  sp({ id: 'emberwick', name: 'Emberwick', types: ['fire'], rarity: 'prime', stage: 1, next: 'lavalume', bias: ['focus'], shape: 'sprite', c: ['#ff6a2b', '#fff0a6'], crest: 'flame', biomes: ['volcanic', 'desert'], ability: 'sweetScent', affinity: 'siphon', dex: 'A living candle flame. Travelers follow it home on dark nights.' }),
  sp({ id: 'lavalume', name: 'Lavalume', types: ['fire'], rarity: 'prime', stage: 2, bias: ['focus', 'ward'], shape: 'blob', c: ['#d0021b', '#ffd84a'], crest: 'flame', biomes: ['volcanic'], ability: 'sweetScent', affinity: 'siphon', dex: 'A slow, glowing ooze. The ground hisses wherever it rests.' }),
  sp({ id: 'calderex', name: 'Calderex', types: ['fire', 'rock'], rarity: 'apex', stage: 1, bias: ['power', 'armor'], weak: 'speed', shape: 'golem', c: ['#3b2a26', '#ff5a1f'], crest: 'spikes', biomes: ['volcanic'], ability: 'forager', affinity: 'shieldPass', move: 'tunnel', dex: 'A walking caldera. Islanders say new land forms where it sleeps.' }),

  // Emberfish line — a fish that swims through lava and seawater alike
  sp({ id: 'emberfish', name: 'Emberfish', types: ['fire', 'water'], rarity: 'common', stage: 1, next: 'cinderkoi', bias: ['speed', 'focus'], shape: 'fish', c: ['#ff5a1f', '#ffd23f'], crest: 'flame', biomes: ['volcanic', 'coast', 'river'], ability: 'forager', affinity: 'slipstream', sig: 'sig-caldera', dex: 'Swims where hot springs meet the sea. Its scales glow like coals and the water around it never quite stops simmering.' }),
  sp({ id: 'cinderkoi', name: 'Cinderkoi', types: ['fire', 'water'], rarity: 'prime', stage: 2, bias: ['speed', 'focus'], shape: 'fish', c: ['#d0021b', '#ffe08a'], crest: 'halo', biomes: ['volcanic', 'coast'], ability: 'luckyCharm', affinity: 'slipstream', sig: 'sig-caldera', move: 'sail', dex: 'Kilauea fishers say a Cinderkoi leaping from the lava lake brings a year of good fortune.' }),

  // ── GRASS ────────────────────────────────────────────
  sp({ id: 'sproutle', name: 'Sproutle', types: ['grass'], rarity: 'common', stage: 1, next: 'thornback', bias: ['vigor'], shape: 'quad', c: ['#5ea832', '#c6e98a'], crest: 'leaf', biomes: GRA, ability: 'forager', affinity: 'shieldPass', sig: 'sig-overgrowth', dex: 'Buries its feet in sunlit soil to nap. Grows a new leaf every birthday.' }),
  sp({ id: 'thornback', name: 'Thornback', types: ['grass'], rarity: 'common', stage: 2, next: 'redwarden', bias: ['vigor', 'armor'], shape: 'quad', c: ['#417505', '#a3d36b'], crest: 'spikes', biomes: GRA, ability: 'forager', affinity: 'shieldPass', sig: 'sig-overgrowth', dex: 'Thorny bark armor shields its soft underside. Shy around fire.' }),
  sp({ id: 'redwarden', name: 'Redwarden', types: ['grass', 'rock'], rarity: 'common', stage: 3, bias: ['vigor', 'armor'], weak: 'speed', shape: 'golem', c: ['#6b3b1e', '#4f9a1e'], crest: 'leaf', biomes: ['forest'], ability: 'forager', affinity: 'shieldPass', sig: 'sig-overgrowth', dex: 'Stands guard on the Gloomshade forest floor. Mistaken for a redwood until it moves.' }),
  sp({ id: 'shadeleaf', name: 'Shadeleaf', types: ['grass'], rarity: 'prime', stage: 1, next: 'gloomoth', bias: ['evasion'], shape: 'sprite', c: ['#2f5d1a', '#c1ff7a'], crest: 'antenna', biomes: ['forest', 'swamp'], ability: 'keenNose', affinity: 'siphon', dex: 'A caterpillar that drinks moonlight through its leaves.' }),
  sp({ id: 'gloomoth', name: 'Gloomoth', types: ['grass', 'charm'], rarity: 'prime', stage: 2, bias: ['evasion', 'focus'], shape: 'bird', c: ['#24401a', '#e1a6ff'], crest: 'antenna', biomes: ['forest'], ability: 'keenNose', affinity: 'siphon', move: 'fly', dex: 'Its wing scales glow faintly, the only light in the deep Gloomshade.' }),
  sp({ id: 'canopyre', name: 'Canopyre', types: ['grass'], rarity: 'apex', stage: 1, bias: ['vigor', 'focus'], shape: 'serpent', c: ['#1f4d12', '#9be35a'], crest: 'leaf', biomes: ['forest'], ability: 'sweetScent', affinity: 'rally', dex: 'Coils through the canopy so slowly that moss grows on its scales.' }),

  // ── ROCK ─────────────────────────────────────────────
  sp({ id: 'pebbark', name: 'Pebbark', types: ['rock'], rarity: 'common', stage: 1, next: 'cragjaw', bias: ['armor'], shape: 'quad', c: ['#b57204', '#e8c98e'], crest: 'ears', biomes: ROC, ability: 'keenNose', affinity: 'shieldPass', sig: 'sig-mesa', dex: 'A pup that digs for shiny pebbles and barks echoes off canyon walls.' }),
  sp({ id: 'cragjaw', name: 'Cragjaw', types: ['rock'], rarity: 'common', stage: 2, next: 'mesahound', bias: ['armor', 'power'], shape: 'quad', c: ['#9a5d06', '#d8b072'], crest: 'spikes', biomes: ROC, ability: 'keenNose', affinity: 'shieldPass', sig: 'sig-mesa', dex: 'Can chew through sandstone. Its bite reshapes canyon tunnels.' }),
  sp({ id: 'mesahound', name: 'Mesahound', types: ['rock'], rarity: 'common', stage: 3, bias: ['armor', 'power'], shape: 'quad', c: ['#7b4705', '#f0c27a'], crest: 'plates', biomes: ['canyon'], ability: 'keenNose', affinity: 'shieldPass', sig: 'sig-mesa', move: 'tunnel', dex: 'The namesake of Houndmouth Canyon. Its howl shifts the walls.' }),
  sp({ id: 'rubblet', name: 'Rubblet', types: ['rock'], rarity: 'prime', stage: 1, next: 'boulderon', bias: ['vigor'], weak: 'speed', shape: 'blob', c: ['#8a7a66', '#b57204'], crest: 'crystal', biomes: ['canyon', 'mountain'], ability: 'luckyCharm', affinity: 'rally', dex: 'Rolls downhill on purpose. Collects gemstones in its cracks.' }),
  sp({ id: 'boulderon', name: 'Boulderon', types: ['rock'], rarity: 'prime', stage: 2, bias: ['vigor', 'armor'], weak: 'speed', shape: 'golem', c: ['#6e6152', '#e09b2d'], crest: 'crystal', biomes: ['canyon', 'mountain'], ability: 'luckyCharm', affinity: 'rally', dex: 'Its geode heart glows when it is happy.' }),
  sp({ id: 'stratagon', name: 'Stratagon', types: ['rock', 'steel'], rarity: 'apex', stage: 1, bias: ['armor', 'power'], shape: 'serpent', c: ['#a3612a', '#cfd6dd'], crest: 'plates', biomes: ['canyon'], ability: 'keenNose', affinity: 'shieldPass', move: 'tunnel', dex: 'Each band of its body is a different geologic era.' }),

  // ── STEEL ────────────────────────────────────────────
  sp({ id: 'rivetail', name: 'Rivetail', types: ['steel'], rarity: 'common', stage: 1, next: 'ferrocrab', bias: ['armor'], shape: 'quad', c: ['#9b9b9b', '#4a6fa5'], crest: 'plates', biomes: STE, ability: 'babyEyes', affinity: 'shieldPass', sig: 'sig-foundry', dex: 'Washes ashore with the mystery ore. Polishes its tail on wet pebbles.' }),
  sp({ id: 'ferrocrab', name: 'Ferrocrab', types: ['steel'], rarity: 'common', stage: 2, next: 'ironclawd', bias: ['armor', 'power'], shape: 'golem', c: ['#8a8f99', '#c4462c'], crest: 'spikes', biomes: STE, ability: 'babyEyes', affinity: 'shieldPass', sig: 'sig-foundry', dex: 'Its shell is harder than any forged steel on the Iron Coast.' }),
  sp({ id: 'ironclawd', name: 'Ironclawd', types: ['steel', 'water'], rarity: 'common', stage: 3, bias: ['armor', 'power'], shape: 'golem', c: ['#5d6470', '#2fb5a0'], crest: 'horns', biomes: ['coast'], ability: 'babyEyes', affinity: 'shieldPass', sig: 'sig-foundry', move: 'sail', dex: 'Guards lighthouses. Sailors salute it on the way out to sea.' }),
  sp({ id: 'cogling', name: 'Cogling', types: ['steel'], rarity: 'prime', stage: 1, next: 'anvilisk', bias: ['ward'], shape: 'sprite', c: ['#b8bec7', '#ffcc33'], crest: 'antenna', biomes: ['road', 'coast'], ability: 'trailblazer', affinity: 'rally', dex: 'Ticks like a pocket watch. Follows travelers along old roads.' }),
  sp({ id: 'anvilisk', name: 'Anvilisk', types: ['steel', 'fire'], rarity: 'prime', stage: 2, bias: ['ward', 'power'], weak: 'evasion', shape: 'golem', c: ['#4a4f58', '#ff7a2b'], crest: 'plates', biomes: ['mountain'], ability: 'trailblazer', affinity: 'rally', dex: 'Blacksmiths prize its company. Its back is a perfect anvil.' }),
  sp({ id: 'leviathorn', name: 'Leviathorn', types: ['steel'], rarity: 'apex', stage: 1, bias: ['armor', 'vigor'], shape: 'serpent', c: ['#6f7884', '#a7f0ff'], crest: 'spikes', biomes: ['coast'], ability: 'quickStep', affinity: 'shieldPass', move: 'sail', dex: 'Iron scales the size of shields. Surfaces only when the tide turns metallic.' }),

  // ── WATER ────────────────────────────────────────────
  sp({ id: 'puddlit', name: 'Puddlit', types: ['water'], rarity: 'common', stage: 1, next: 'marshfin', bias: ['evasion'], shape: 'blob', c: ['#50e3c2', '#1d6f8c'], crest: 'fin', biomes: WAT, ability: 'quickStep', affinity: 'siphon', sig: 'sig-riptide', dex: 'Hops between puddles after rain. Gets grumpy in droughts.' }),
  sp({ id: 'marshfin', name: 'Marshfin', types: ['water'], rarity: 'common', stage: 2, next: 'mangrovore', bias: ['evasion', 'focus'], shape: 'serpent', c: ['#2fbfa0', '#0f4f66'], crest: 'fin', biomes: WAT, ability: 'quickStep', affinity: 'siphon', sig: 'sig-riptide', move: 'sail', dex: 'Slips between mangrove roots faster than the eye can follow.' }),
  sp({ id: 'mangrovore', name: 'Mangrovore', types: ['water', 'grass'], rarity: 'common', stage: 3, bias: ['vigor', 'focus'], shape: 'quad', c: ['#1d7a6b', '#7bbf3f'], crest: 'leaf', biomes: ['swamp'], ability: 'quickStep', affinity: 'siphon', sig: 'sig-riptide', move: 'sail', dex: 'Mangroves sprout from its back. Katy\'s roots open for it alone.' }),
  sp({ id: 'bubbloon', name: 'Bubbloon', types: ['water'], rarity: 'prime', stage: 1, next: 'tidecall', bias: ['ward'], shape: 'sprite', c: ['#9df5ff', '#3a8cff'], crest: 'halo', biomes: ['lake', 'river'], ability: 'sweetScent', affinity: 'rally', dex: 'Floats inside its own bubble. Pops when embarrassed.' }),
  sp({ id: 'tidecall', name: 'Tidecall', types: ['water'], rarity: 'prime', stage: 2, bias: ['ward', 'focus'], shape: 'bird', c: ['#50e3c2', '#f4f9ff'], crest: 'fin', biomes: ['coast', 'lake'], ability: 'sweetScent', affinity: 'rally', move: 'fly', dex: 'Its cry raises the tide a finger-width. Fishermen follow its flocks.' }),
  sp({ id: 'gatormaw', name: 'Gatormaw', types: ['water'], rarity: 'apex', stage: 1, bias: ['power', 'vigor'], shape: 'quad', c: ['#2c5e4f', '#d8f07a'], crest: 'plates', biomes: ['swamp'], ability: 'quickStep', affinity: 'tagStrike', move: 'sail', dex: 'King of the Everglades shallows. Its yawn is a warning.' }),

  // ── LEGENDARY ────────────────────────────────────────
  sp({ id: 'solstara', name: 'Solstara', types: ['astral', 'fire'], rarity: 'legendary', stage: 1, bias: ['focus', 'speed'], shape: 'bird', c: ['#ffcf3a', '#9013fe'], crest: 'halo', biomes: ['mountain'], ability: 'starSeeker', affinity: 'tagStrike', move: 'fly', dex: 'The sun and the aurora in one body. Nests on the highest summit of Margos.' }),
  sp({ id: 'thalassor', name: 'Thalassor', types: ['water', 'steel'], rarity: 'legendary', stage: 1, bias: ['vigor', 'armor'], shape: 'serpent', c: ['#0f3d5c', '#c9d3dc'], crest: 'spikes', biomes: ['coast'], ability: 'luckyCharm', affinity: 'shieldPass', move: 'sail', dex: 'The source of the Iron Coast ore. Its scales shed as metal into the tide.' }),
];

/** Hand-made creatures first, then the generated placeholders filling the rest of the roster table (roster.ts). */
export const SPECIES: Species[] = [...HANDMADE, ...PLACEHOLDER_DEFS.map(sp)];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(SPECIES.map((s) => [s.id, s]));

/** One starter per type: stage 1 of each common line. */
export const STARTERS = ['twinkit', 'mossprite', 'zapup', 'cindercub', 'sproutle', 'pebbark', 'rivetail', 'puddlit'];
