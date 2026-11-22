import type { Ability, AffinityPower, Item, Nature, WeatherDef, Biome, ElementType, TimeOfDay, Activity } from './schema';
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
  keenNose: { id: 'keenNose', name: 'Keen Nose', text: 'When you discover an item, sniff out three finds and keep the one you like.' },
  starSeeker: { id: 'starSeeker', name: 'Star Seeker', text: 'Roll one extra rarity die on encounters.' },
  trailblazer: { id: 'trailblazer', name: 'Trailblazer', text: 'Your first move each turn costs no Initiative.' },
  forager: { id: 'forager', name: 'Forager', text: 'Found berries and materials come in pairs.' },
  quickStep: { id: 'quickStep', name: 'Quick Step', text: 'Always escape from wild battles, and get 1 Initiative back when you do.' },
  luckyCharm: { id: 'luckyCharm', name: 'Lucky Charm', text: '+1 to recruitment rolls.' },
};

export const AFFINITIES: Record<string, AffinityPower> = {
  tagStrike: { id: 'tagStrike', name: 'Tag Strike', mode: 'tagStrike', text: 'Swaps in with an attack of the benched partner\'s type, powered by the partner\'s Focus.' },
  shieldPass: { id: 'shieldPass', name: 'Shield Pass', mode: 'shieldPass', text: 'Borrows the partner\'s Armor and Ward while it stays in, then counters.' },
  slipstream: { id: 'slipstream', name: 'Slipstream', mode: 'slipstream', text: 'Rides the partner\'s Speed to strike first with a physical hit.' },
  siphon: { id: 'siphon', name: 'Siphon', mode: 'siphon', text: 'Drains the foe, healing using the partner\'s Vigor.' },
  rally: { id: 'rally', name: 'Rally', mode: 'rally', text: 'Partner cheers: restores Stamina, eases Fatigue and raises Power and Focus.' },
};

// ── Items ────────────────────────────────────────────────
const material = (id: string, name: string, icon: string, allure: Partial<Record<ElementType, number>>, text: string): Item =>
  ({ id, name, kind: 'material', price: 3, icon, allure, text });
/** A universal offering: the same bonus for every type, so it works on any creature. */
const universal = (n: number): Partial<Record<ElementType, number>> => Object.fromEntries(TYPES.map((t) => [t, n]));

export const ITEMS: Record<string, Item> = {
  // restores (overworld only — items are never used in battle)
  'salve': { id: 'salve', name: 'Vigor Salve', kind: 'restore', price: 4, icon: '🩹', text: 'Restore 1 Vitality to a creature.' },
  'elixir': { id: 'elixir', name: 'Hot Spring Elixir', kind: 'restore', price: 10, icon: '🧪', text: 'Fully restore Vitality and clear Fatigue.' },
  'root-salve': { id: 'root-salve', name: 'Root Salve', kind: 'restore', price: 8, icon: '🌿', text: 'A Forest Floor remedy: restore 2 Vitality and clear Fatigue.' },
  'calm-tea': { id: 'calm-tea', name: 'Calm Tea', kind: 'restore', price: 5, icon: '🍵', text: 'Clear all Fatigue from a creature.' },
  'energy-tonic': { id: 'energy-tonic', name: 'Energy Tonic', kind: 'restore', price: 30, icon: '⚗️', text: 'Permanently +1 energy of the creature\'s primary type.' },
  // treats (morale & loyalty)
  'sunberry': { id: 'sunberry', name: 'Sunberry', kind: 'treat', price: 2, icon: '🍓', text: 'A treat: +1 Morale, +1 Loyalty.' },
  'dewberry': { id: 'dewberry', name: 'Dewberry', kind: 'treat', price: 2, icon: '🍒', text: 'A treat: +1 Morale, +1 Loyalty.' },
  'duskberry': { id: 'duskberry', name: 'Duskberry', kind: 'treat', price: 4, icon: '🍑', text: 'A Forest Floor treat: +2 Morale, +1 Loyalty.' },
  'moonberry': { id: 'moonberry', name: 'Moonberry', kind: 'treat', price: 5, icon: '🍇', text: 'A rare treat: +2 Morale, +2 Loyalty.' },
  // charms
  'lure-incense': { id: 'lure-incense', name: 'Lure Incense', kind: 'charm', price: 6, icon: '🕯️', text: 'Your next explore is a guaranteed wild encounter.' },
  'hush-smoke': { id: 'hush-smoke', name: 'Hush Smoke', kind: 'charm', price: 5, icon: '💨', text: 'Your next explore can’t turn up a creature or trainer: its encounter faces become Nothing and a find instead.' },
  'star-charm': { id: 'star-charm', name: 'Star Charm', kind: 'charm', price: 8, icon: '⭐', text: 'Roll +1 rarity die on your next encounter.' },
  // travel: getting around the big map faster (world.ts → travel items & rides)
  'bike': { id: 'bike', name: 'Bike', kind: 'travel', unique: true, price: 25, icon: '🚲', text: 'Once a turn, roll a d6 and ride up to that many steps for free, without exploring on the way or where you stop. Not on Cloud Island or the Forest Floor, and not over the sea.' },
  'taxi-ticket': { id: 'taxi-ticket', name: 'Taxi Ticket', kind: 'travel', price: 10, icon: '🚕', text: 'In a city: ride to any other city. Uses up the rest of your Initiative this turn.' },
  'homing-feather': { id: 'homing-feather', name: 'Homing Feather', kind: 'travel', price: 8, icon: '🕊️', text: 'From anywhere on the mainland, fly back to your home city (a Wanderer may pick any city they’ve rested at). Uses up the rest of your Initiative this turn.' },
  'trail-mix': { id: 'trail-mix', name: 'Trail Mix', kind: 'travel', price: 6, icon: '🥜', text: '+1 Initiative this turn (up to 5). One handful a turn.' },
  // totems
  'totem': { id: 'totem', name: 'Plain Totem', kind: 'totem', price: 4, icon: '🗿', text: 'A generic carving. +1 to any recruitment.' },
  // offering materials (found by biome)
  'pine-resin': material('pine-resin', 'Pine Resin', '🌲', { grass: 2, charm: 1 }, 'Sticky, fragrant. Forest creatures love it.'),
  'glacier-salt': material('glacier-salt', 'Glacier Salt', '🧂', { astral: 2, water: 1 }, 'Crystals from ancient ice.'),
  'ember-charcoal': material('ember-charcoal', 'Ember Charcoal', '⚫', { fire: 2, rock: 1 }, 'Still warm to the touch.'),
  'river-chalk': material('river-chalk', 'River Chalk', '⬜', { water: 2, rock: 1 }, 'Smooth chalk from riverbeds.'),
  'marsh-lotus': material('marsh-lotus', 'Marsh Lotus', '💮', { water: 2, grass: 1 }, 'Blooms only in still water.'),
  'sage-bundle': material('sage-bundle', 'Sage Bundle', '🌾', { electric: 1, fire: 1, charm: 1 }, 'Burned as incense on the plains.'),
  'sea-glass': material('sea-glass', 'Sea Glass', '🔷', { steel: 1, water: 2 }, 'Frosted glass from the tide.'),
  'iron-filings': material('iron-filings', 'Iron Filings', '⚙️', { steel: 2, electric: 1 }, 'Mystery ore from the Iron Coast.'),
  'moon-moss': material('moon-moss', 'Moon Moss', '🌙', { astral: 1, charm: 2 }, 'Glows faintly under starlight.'),
  'thunder-quartz': material('thunder-quartz', 'Thunder Quartz', '💎', { electric: 2, rock: 1 }, 'Fulgurite fused by lightning.'),
  'wildflower': material('wildflower', 'Wildflower', '🌼', { charm: 2, grass: 1 }, 'A bright meadow bloom.'),
  'canyon-ochre': material('canyon-ochre', 'Canyon Ochre', '🟠', { rock: 2, fire: 1 }, 'Earth pigment for carving paint.'),
  'volcanic-glass': material('volcanic-glass', 'Volcanic Glass', '🖤', { fire: 2, steel: 1 }, 'Obsidian shards.'),
  // universal offerings (Cloud Island): every creature likes them
  'cloud-silk': material('cloud-silk', 'Cloud Silk', '☁️', universal(1), 'Threads spun from a passing cloud. Every creature finds it soothing: +1 to recruit any creature.'),
  'stardust': material('stardust', 'Stardust', '✨', universal(2), 'Glittering dust that drifts down on Cloud Island. +2 to recruit any creature.'),
  // exotic Forest Floor finds: slight improvements over the usual ones
  'heartwood-resin': material('heartwood-resin', 'Heartwood Resin', '🍯', { grass: 3, charm: 2, rock: 1 }, 'Amber sap from the oldest trunks on the Forest Floor. A richer Pine Resin.'),
  'glowcap': material('glowcap', 'Glowcap', '🍄', { charm: 3, grass: 2, astral: 1 }, 'A mushroom that glows in the dark of the Forest Floor. A richer Moon Moss.'),
  'moonbow-prism': material('moonbow-prism', 'Moonbow Prism', '🌈', universal(3), 'A rare shard of a rainbow seen by moonlight. +3 to recruit any creature.'),
  // key items
  'fog-lantern': { id: 'fog-lantern', name: 'Fog Lantern', kind: 'key', price: 12, icon: '🏮', text: 'Catch a wisp in it and it lights the misty way to Lantern Glade and the Rainbow Plains. Check it to see where a wisp waits.' },
  'canopy-rope': { id: 'canopy-rope', name: 'Canopy Rope', kind: 'key', price: 12, icon: '➰', text: 'Lets you descend to Dahlia\'s arena on the forest floor.' },
  'ferry-pass': { id: 'ferry-pass', name: 'Ferry Pass', kind: 'key', price: 15, icon: '⛴️', text: 'Ride the ferry to Black Sand Cove on Kilauea island, from Mangrove Port or Kilauea Forge.' },
  'root-whistle': { id: 'root-whistle', name: 'Root Whistle', kind: 'key', price: 14, icon: '🎐', text: 'Asks the mangrove roots to open the path to Katy.' },
  'summit-pick': { id: 'summit-pick', name: 'Summit Pick', kind: 'key', price: 18, icon: '⛏️', text: 'Climb to Sunspire Summit.' },
};

// Typed totems & effigies are synthesized: "totem:fire", "effigy:cindercub"
for (const t of TYPES) {
  ITEMS[`totem:${t}`] = { id: `totem:${t}`, name: `${TYPE_LABEL[t]} Totem`, kind: 'totem', price: 0, icon: '🗿', text: `+3 for ${TYPE_LABEL[t]} creatures, -1 for others.` };
}
/** Items you can only own one of: key items, and reusable gear like the Bike. */
export const isUnique = (it: Item) => it.kind === 'key' || !!it.unique;

export function itemInfo(id: string): Item {
  if (ITEMS[id]) return ITEMS[id];
  if (id.startsWith('effigy:')) return { id, name: 'Effigy', kind: 'totem', price: 0, icon: '🎎', text: '+5 for its creature, -3 for others.' };
  return { id, name: id, kind: 'material', price: 0, icon: '❔', text: '' };
}

/**
 * Workbench recipes (every city and town): each slot takes one offering material that has some
 * allure for that type (a universal material fits any slot). The output is a general consumable.
 */
export interface Recipe { id: string; out: string; n: number; slots: ElementType[]; text: string }
export const RECIPES: Recipe[] = [
  { id: 'salve', out: 'salve', n: 2, slots: ['grass', 'water'], text: 'Pound a sticky plant into wet clay.' },
  { id: 'calm-tea', out: 'calm-tea', n: 1, slots: ['grass', 'charm'], text: 'Steep fragrant leaves and petals.' },
  { id: 'trail-mix', out: 'trail-mix', n: 1, slots: ['grass', 'rock'], text: 'Roast seeds on a hot stone.' },
  { id: 'lure-incense', out: 'lure-incense', n: 1, slots: ['charm', 'fire'], text: 'Smoulder something sweet.' },
  { id: 'hush-smoke', out: 'hush-smoke', n: 1, slots: ['fire', 'steel'], text: 'Burn something acrid in a tin.' },
  { id: 'star-charm', out: 'star-charm', n: 1, slots: ['astral', 'electric'], text: 'Charge a cold crystal with a spark.' },
  { id: 'elixir', out: 'elixir', n: 1, slots: ['water', 'fire', 'astral'], text: 'Heat spring water with salts until it glows.' },
];

export const BIOME_MATERIALS: Record<Biome, string[]> = {
  forest: ['pine-resin', 'moon-moss'], grove: ['moon-moss', 'wildflower'], meadow: ['wildflower', 'sage-bundle'],
  mountain: ['glacier-salt', 'canyon-ochre'], tundra: ['glacier-salt', 'moon-moss'], lake: ['river-chalk', 'marsh-lotus'],
  river: ['river-chalk', 'sea-glass'], road: ['iron-filings', 'sage-bundle'], swamp: ['marsh-lotus', 'pine-resin'],
  desert: ['sage-bundle', 'ember-charcoal'], badlands: ['thunder-quartz', 'canyon-ochre'], coast: ['sea-glass', 'iron-filings'],
  volcanic: ['volcanic-glass', 'ember-charcoal'], canyon: ['canyon-ochre', 'thunder-quartz'],
  // Cloud Island: universal offerings only (the prism is the rare one, 1 in 5)
  cloud: ['cloud-silk', 'cloud-silk', 'stardust', 'stardust', 'moonbow-prism'],
  // the Forest Floor: exotic, a little stronger than the materials above
  deepwood: ['heartwood-resin', 'glowcap'],
  // the Rainbow Plains: the exotics of the Forest Floor and Cloud Island
  prism: ['heartwood-resin', 'glowcap', 'cloud-silk', 'stardust', 'moonbow-prism'],
};

/** Biomes where exploring can turn up this material. */
export function materialBiomes(id: string): Biome[] {
  return (Object.keys(BIOME_MATERIALS) as Biome[]).filter((b) => BIOME_MATERIALS[b].includes(id));
}

export const BIOME_INFO: Record<Biome, { label: string; color: string; icon: string }> = {
  forest: { label: 'Forest', color: '#3f7a3a', icon: '🌲' }, grove: { label: 'Fey Grove', color: '#6aa36a', icon: '🍄' },
  meadow: { label: 'Meadow', color: '#94c25a', icon: '🌼' }, mountain: { label: 'Mountain', color: '#8c8f99', icon: '⛰️' },
  tundra: { label: 'Tundra', color: '#dfe9f2', icon: '❄️' }, lake: { label: 'Lake', color: '#4aa8c9', icon: '🏞️' },
  river: { label: 'River', color: '#5fb8d6', icon: '🌊' }, road: { label: 'Road', color: '#c9b48a', icon: '🛤️' },
  swamp: { label: 'Swamp', color: '#557a4a', icon: '🐊' }, desert: { label: 'Desert', color: '#e2c27a', icon: '🌵' },
  badlands: { label: 'Badlands', color: '#c98f5a', icon: '🏜️' }, coast: { label: 'Coast', color: '#d9cfb0', icon: '🏖️' },
  volcanic: { label: 'Volcanic', color: '#4a3a38', icon: '🌋' }, canyon: { label: 'Canyon', color: '#c4703a', icon: '🌄' },
  cloud: { label: 'Cloud', color: '#f4a9d8', icon: '☁️' },
  deepwood: { label: 'Forest Floor', color: '#1f3524', icon: '🌑' },
  prism: { label: 'Rainbow Plains', color: '#d8e8b0', icon: '🌈' },
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

// ── Day & night ─────────────────────────────────────────
/** Day and night alternate: odd turns (1, 3, 5 …) are day, even turns (2, 4, 6 …) are night. */
export const timeOfDay = (turn: number): TimeOfDay => (turn % 2 === 1 ? 'day' : 'night');
export const TIME_INFO: Record<TimeOfDay, { label: string; icon: string }> = {
  day: { label: 'Day', icon: '☀️' },
  night: { label: 'Night', icon: '🌙' },
};
export const ACTIVITY_INFO: Record<Activity, { label: string; icon: string; text: string }> = {
  diurnal: { label: 'Diurnal', icon: '☀️', text: 'Out in the wild by day only.' },
  nocturnal: { label: 'Nocturnal', icon: '🌙', text: 'Out in the wild by night only.' },
  crepuscular: { label: 'Day & night', icon: '🌗', text: 'Out in the wild by day and by night.' },
};

export function seasonForTurn(turn: number): Season {
  const t = Math.min(turn, 100);
  if (t <= 25) return 'spring';
  if (t <= 50) return 'summer';
  if (t <= 75) return 'autumn';
  return 'winter';
}
