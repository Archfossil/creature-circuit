import type { Ability, AffinityPower, Item, Nature, WeatherDef, Biome, ElementType } from './schema';
import { TYPES, TYPE_LABEL } from './types';

export const NATURES: Nature[] = [
  { id: 'adamant', name: 'Adamant', up: 'power', down: 'focus', text: 'Favors raw physical brawling over elemental channeling.',
    perks: [{ cost: 3, name: 'Knuckle Down', bonus: { power: 1 }, text: '+1 Power' }, { cost: 6, name: 'Thick Hide', bonus: { armor: 1 }, text: '+1 Armor' }, { cost: 10, name: 'Unbreakable', bonus: { vigor: 1, power: 1 }, text: '+1 Vigor, +1 Power' }] },
  { id: 'timid', name: 'Timid', up: 'speed', down: 'power', text: 'Prioritizes lightning-fast positioning at the cost of force.',
    perks: [{ cost: 3, name: 'Light Feet', bonus: { speed: 1 }, text: '+1 Speed' }, { cost: 6, name: 'Skittish', bonus: { evasion: 1 }, text: '+1 Evasion' }, { cost: 10, name: 'Brave Heart', bonus: { power: 2 }, text: '+2 Power' }] },
  { id: 'fortified', name: 'Fortified', up: 'armor', down: 'speed', text: 'Builds an immovable defensive wall, sacrificing mobility.',
    perks: [{ cost: 3, name: 'Shell Up', bonus: { armor: 1 }, text: '+1 Armor' }, { cost: 6, name: 'Rooted', bonus: { ward: 1 }, text: '+1 Ward' }, { cost: 10, name: 'Bastion', bonus: { vigor: 1, armor: 1 }, text: '+1 Vigor, +1 Armor' }] },
  { id: 'resonant', name: 'Resonant', up: 'focus', down: 'armor', text: 'Leans into elemental mastery and status effects; physical defenses go soft.',
    perks: [{ cost: 3, name: 'Attuned', bonus: { focus: 1 }, text: '+1 Focus' }, { cost: 6, name: 'Harmonic', bonus: { ward: 1 }, text: '+1 Ward' }, { cost: 10, name: 'Crescendo', bonus: { focus: 2 }, text: '+2 Focus' }] },
  { id: 'enduring', name: 'Enduring', up: 'vigor', down: 'ward', text: 'Piles on health to soak damage, but is open to elemental energy.',
    perks: [{ cost: 3, name: 'Deep Breath', bonus: { stamina: 2 }, text: '+2 Stamina' }, { cost: 6, name: 'Stubborn', bonus: { ward: 1 }, text: '+1 Ward' }, { cost: 10, name: 'Last Stand', bonus: { vigor: 1, armor: 1 }, text: '+1 Vigor, +1 Armor' }] },
  { id: 'volatile', name: 'Volatile', up: 'stamina', down: 'evasion', text: 'Pushes limits with demanding moves; cavalier with its own safety.',
    perks: [{ cost: 3, name: 'Hot Blooded', bonus: { stamina: 2 }, text: '+2 Stamina' }, { cost: 6, name: 'Reckless', bonus: { power: 1, focus: 1 }, text: '+1 Power, +1 Focus' }, { cost: 10, name: 'Overdrive', bonus: { speed: 2 }, text: '+2 Speed' }] },
];
export const NATURE_BY_ID = Object.fromEntries(NATURES.map((n) => [n.id, n]));

/** Overworld passives — only the Following creature's ability is active. */
export const ABILITIES: Record<string, Ability> = {
  sweetScent: { id: 'sweetScent', name: 'Sweet Scent', text: 'Explore rolls of 3–5 become wild encounters.' },
  babyEyes: { id: 'babyEyes', name: 'Baby-Doll Eyes', text: 'Market prices are 25% cheaper.' },
  keenNose: { id: 'keenNose', name: 'Keen Nose', text: 'Explore rolls of 4–6 discover items.' },
  starSeeker: { id: 'starSeeker', name: 'Star Seeker', text: 'Roll one extra rarity die on encounters.' },
  trailblazer: { id: 'trailblazer', name: 'Trailblazer', text: 'Your first move each turn costs no Initiative.' },
  forager: { id: 'forager', name: 'Forager', text: 'Found berries and materials come in pairs.' },
  quickStep: { id: 'quickStep', name: 'Quick Step', text: 'Always escape from wild battles.' },
  luckyCharm: { id: 'luckyCharm', name: 'Lucky Charm', text: '+1 to recruitment rolls.' },
};

export const AFFINITIES: Record<string, AffinityPower> = {
  tagStrike: { id: 'tagStrike', name: 'Tag Strike', mode: 'tagStrike', text: 'Swaps in with an attack of the benched partner\'s type, powered by the partner\'s Focus.' },
  shieldPass: { id: 'shieldPass', name: 'Shield Pass', mode: 'shieldPass', text: 'Borrows the partner\'s Armor and Ward for this round, then counters.' },
  slipstream: { id: 'slipstream', name: 'Slipstream', mode: 'slipstream', text: 'Rides the partner\'s Speed to strike first with a physical hit.' },
  siphon: { id: 'siphon', name: 'Siphon', mode: 'siphon', text: 'Drains the foe, healing using the partner\'s Vigor.' },
  rally: { id: 'rally', name: 'Rally', mode: 'rally', text: 'Partner cheers: restores Stamina and raises Power and Focus.' },
};

// ── Items ────────────────────────────────────────────────
const material = (id: string, name: string, icon: string, allure: Partial<Record<ElementType, number>>, text: string): Item =>
  ({ id, name, kind: 'material', price: 3, icon, allure, text });

export const ITEMS: Record<string, Item> = {
  // restores (overworld only — items are never used in battle)
  'salve': { id: 'salve', name: 'Vigor Salve', kind: 'restore', price: 4, icon: '🩹', text: 'Restore 1 Vitality to a creature.' },
  'elixir': { id: 'elixir', name: 'Hot Spring Elixir', kind: 'restore', price: 10, icon: '🧪', text: 'Fully restore Vitality and clear Fatigue.' },
  'calm-tea': { id: 'calm-tea', name: 'Calm Tea', kind: 'restore', price: 5, icon: '🍵', text: 'Clear all Fatigue from a creature.' },
  'energy-tonic': { id: 'energy-tonic', name: 'Energy Tonic', kind: 'restore', price: 30, icon: '⚗️', text: 'Permanently +1 energy of the creature\'s primary type.' },
  // treats (morale & loyalty)
  'sunberry': { id: 'sunberry', name: 'Sunberry', kind: 'treat', price: 2, icon: '🍓', text: 'A treat: +1 Morale, +1 Loyalty.' },
  'dewberry': { id: 'dewberry', name: 'Dewberry', kind: 'treat', price: 2, icon: '🫐', text: 'A treat: +1 Morale, +1 Loyalty.' },
  'moonberry': { id: 'moonberry', name: 'Moonberry', kind: 'treat', price: 5, icon: '🍇', text: 'A rare treat: +2 Morale, +2 Loyalty.' },
  // charms
  'lure-incense': { id: 'lure-incense', name: 'Lure Incense', kind: 'charm', price: 6, icon: '🕯️', text: 'Your next explore is a guaranteed wild encounter.' },
  'star-charm': { id: 'star-charm', name: 'Star Charm', kind: 'charm', price: 8, icon: '⭐', text: 'Roll +1 rarity die on your next encounter.' },
  // totems
  'totem': { id: 'totem', name: 'Plain Totem', kind: 'totem', price: 4, icon: '🗿', text: 'A generic carving. +1 to any recruitment.' },
  // offering materials (found by biome)
  'pine-resin': material('pine-resin', 'Pine Resin', '🌲', { grass: 2, charm: 1 }, 'Sticky, fragrant. Forest creatures love it.'),
  'glacier-salt': material('glacier-salt', 'Glacier Salt', '🧂', { astral: 2, water: 1 }, 'Crystals from ancient ice.'),
  'ember-charcoal': material('ember-charcoal', 'Ember Charcoal', '🪵', { fire: 2, rock: 1 }, 'Still warm to the touch.'),
  'river-chalk': material('river-chalk', 'River Chalk', '🪨', { water: 2, rock: 1 }, 'Smooth chalk from riverbeds.'),
  'marsh-lotus': material('marsh-lotus', 'Marsh Lotus', '🪷', { water: 2, grass: 1 }, 'Blooms only in still water.'),
  'sage-bundle': material('sage-bundle', 'Sage Bundle', '🌾', { electric: 1, fire: 1, charm: 1 }, 'Burned as incense on the plains.'),
  'sea-glass': material('sea-glass', 'Sea Glass', '🔷', { steel: 1, water: 2 }, 'Frosted glass from the tide.'),
  'iron-filings': material('iron-filings', 'Iron Filings', '⚙️', { steel: 2, electric: 1 }, 'Mystery ore from the Iron Coast.'),
  'moon-moss': material('moon-moss', 'Moon Moss', '🌙', { astral: 1, charm: 2 }, 'Glows faintly under starlight.'),
  'thunder-quartz': material('thunder-quartz', 'Thunder Quartz', '💎', { electric: 2, rock: 1 }, 'Fulgurite fused by lightning.'),
  'wildflower': material('wildflower', 'Wildflower', '🌼', { charm: 2, grass: 1 }, 'A bright meadow bloom.'),
  'canyon-ochre': material('canyon-ochre', 'Canyon Ochre', '🟠', { rock: 2, fire: 1 }, 'Earth pigment for carving paint.'),
  'volcanic-glass': material('volcanic-glass', 'Volcanic Glass', '🖤', { fire: 2, steel: 1 }, 'Obsidian shards.'),
  // key items
  'fog-lantern': { id: 'fog-lantern', name: 'Fog Lantern', kind: 'key', price: 12, icon: '🏮', text: 'Lights the fog road into Hollow Crest.' },
  'canopy-rope': { id: 'canopy-rope', name: 'Canopy Rope', kind: 'key', price: 12, icon: '🪢', text: 'Lets you descend to Dahlia\'s arena on the forest floor.' },
  'ferry-pass': { id: 'ferry-pass', name: 'Ferry Pass', kind: 'key', price: 15, icon: '⛴️', text: 'Ride the ferry from Mangrove Port to Kilauea Forge.' },
  'root-whistle': { id: 'root-whistle', name: 'Root Whistle', kind: 'key', price: 14, icon: '🎐', text: 'Asks the mangrove roots to open the path to Katy.' },
  'summit-pick': { id: 'summit-pick', name: 'Summit Pick', kind: 'key', price: 18, icon: '⛏️', text: 'Climb to Sunspire Summit.' },
};

// Typed totems & effigies are synthesized: "totem:fire", "effigy:cindercub"
for (const t of TYPES) {
  ITEMS[`totem:${t}`] = { id: `totem:${t}`, name: `${TYPE_LABEL[t]} Totem`, kind: 'totem', price: 0, icon: '🗿', text: `+3 for ${TYPE_LABEL[t]} creatures, -1 for others.` };
}
export function itemInfo(id: string): Item {
  if (ITEMS[id]) return ITEMS[id];
  if (id.startsWith('effigy:')) return { id, name: 'Effigy', kind: 'totem', price: 0, icon: '🪆', text: '+5 for its creature, -3 for others.' };
  return { id, name: id, kind: 'material', price: 0, icon: '❔', text: '' };
}

export const BIOME_MATERIALS: Record<Biome, string[]> = {
  forest: ['pine-resin', 'moon-moss'], grove: ['moon-moss', 'wildflower'], meadow: ['wildflower', 'sage-bundle'],
  mountain: ['glacier-salt', 'canyon-ochre'], tundra: ['glacier-salt', 'moon-moss'], lake: ['river-chalk', 'marsh-lotus'],
  river: ['river-chalk', 'sea-glass'], road: ['iron-filings', 'sage-bundle'], swamp: ['marsh-lotus', 'pine-resin'],
  desert: ['sage-bundle', 'ember-charcoal'], badlands: ['thunder-quartz', 'canyon-ochre'], coast: ['sea-glass', 'iron-filings'],
  volcanic: ['volcanic-glass', 'ember-charcoal'], canyon: ['canyon-ochre', 'thunder-quartz'],
};

export const BIOME_INFO: Record<Biome, { label: string; color: string; icon: string }> = {
  forest: { label: 'Forest', color: '#3f7a3a', icon: '🌲' }, grove: { label: 'Fey Grove', color: '#6aa36a', icon: '🍄' },
  meadow: { label: 'Meadow', color: '#94c25a', icon: '🌼' }, mountain: { label: 'Mountain', color: '#8c8f99', icon: '⛰️' },
  tundra: { label: 'Tundra', color: '#dfe9f2', icon: '❄️' }, lake: { label: 'Lake', color: '#4aa8c9', icon: '🏞️' },
  river: { label: 'River', color: '#5fb8d6', icon: '🌊' }, road: { label: 'Road', color: '#c9b48a', icon: '🛤️' },
  swamp: { label: 'Swamp', color: '#557a4a', icon: '🐊' }, desert: { label: 'Desert', color: '#e2c27a', icon: '🌵' },
  badlands: { label: 'Badlands', color: '#c98f5a', icon: '🏜️' }, coast: { label: 'Coast', color: '#d9cfb0', icon: '🏖️' },
  volcanic: { label: 'Volcanic', color: '#4a3a38', icon: '🌋' }, canyon: { label: 'Canyon', color: '#c4703a', icon: '🪨' },
};

// ── Weather ─────────────────────────────────────────────
export const WEATHER: Record<string, WeatherDef> = {
  clear: { id: 'clear', name: 'Clear Skies', icon: '☀️', text: 'No effects.', fx: 'none' },
  rain: { id: 'rain', name: 'Rain', icon: '🌧️', text: 'Water attacks +1, Fire attacks -1.', typeBoost: { water: 1, fire: -1 }, encounter: ['water', 'grass'], fx: 'rain' },
  bloom: { id: 'bloom', name: 'Spring Bloom', icon: '🌸', text: 'Grass and Charm attacks +1.', typeBoost: { grass: 1, charm: 1 }, encounter: ['grass', 'charm'], fx: 'petals' },
  windy: { id: 'windy', name: 'Gusty Winds', icon: '🌬️', text: 'All creatures +1 Speed.', speed: 1, encounter: ['electric', 'astral'], fx: 'wind' },
  heat: { id: 'heat', name: 'Heat Wave', icon: '🥵', text: 'Fire attacks +1, Water attacks -1.', typeBoost: { fire: 1, water: -1 }, encounter: ['fire', 'rock'], fx: 'heat' },
  storm: { id: 'storm', name: 'Thunderstorm', icon: '⛈️', text: 'Electric attacks +1, Water +1.', typeBoost: { electric: 1, water: 1 }, encounter: ['electric'], fx: 'storm' },
  drought: { id: 'drought', name: 'Drought', icon: '🏜️', text: 'Rock and Fire attacks +1, Grass -1.', typeBoost: { rock: 1, fire: 1, grass: -1 }, encounter: ['rock', 'fire'], fx: 'heat' },
  fog: { id: 'fog', name: 'Fog', icon: '🌫️', text: 'All creatures +1 Evasion. Charm attacks +1.', evasion: 1, typeBoost: { charm: 1 }, encounter: ['charm'], fx: 'fog' },
  overcast: { id: 'overcast', name: 'Overcast', icon: '☁️', text: 'Steel attacks +1.', typeBoost: { steel: 1 }, encounter: ['steel'], fx: 'none' },
  snow: { id: 'snow', name: 'Snowfall', icon: '🌨️', text: 'All creatures -1 Speed. Astral +1.', speed: -1, typeBoost: { astral: 1 }, encounter: ['astral', 'steel'], fx: 'snow' },
  blizzard: { id: 'blizzard', name: 'Blizzard', icon: '❄️', text: 'Fire -1, Steel and Astral +1, all -1 Speed.', speed: -1, typeBoost: { fire: -1, steel: 1, astral: 1 }, encounter: ['astral', 'steel'], fx: 'snow' },
  aurora: { id: 'aurora', name: 'Aurora Night', icon: '🌌', text: 'Astral attacks +2. Salem\'s arena opens.', typeBoost: { astral: 2 }, encounter: ['astral'], fx: 'aurora' },
};

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASON_INFO: Record<Season, { label: string; icon: string; dice: string[] }> = {
  spring: { label: 'Spring', icon: '🌱', dice: ['clear', 'clear', 'rain', 'rain', 'bloom', 'windy'] },
  summer: { label: 'Summer', icon: '🌞', dice: ['clear', 'clear', 'heat', 'storm', 'drought', 'rain'] },
  autumn: { label: 'Autumn', icon: '🍂', dice: ['clear', 'fog', 'windy', 'rain', 'overcast', 'aurora'] },
  winter: { label: 'Winter', icon: '❄️', dice: ['clear', 'snow', 'blizzard', 'aurora', 'fog', 'overcast'] },
};

export function seasonForTurn(turn: number): Season {
  const t = Math.min(turn, 100);
  if (t <= 25) return 'spring';
  if (t <= 50) return 'summer';
  if (t <= 75) return 'autumn';
  return 'winter';
}
