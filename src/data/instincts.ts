// Instincts: every species' battle passive. Its Nature shapes its stats and its Ability works on the
// overworld; its Instinct fires on its own in battle: when it takes the field, when it loses a heart,
// when something hits it, and so on, or it simply bends a rule while it's out.
//
// Each Instinct is data: an optional `trigger` (a moment + what happens) and optional `passive` rules.
// The battle engine (engine/battle.ts → the "Instincts" section) reads them, and `instinctRules`
// writes the exact rules from the same data for the card and docs/14 (which is generated from this
// file: `npm run docs:instincts`).
//
// These are first drafts from development, grouped six to a type, for the design team to redesign.
import type { ElementType, StatKey, StatusId } from './schema';
import { STATUS_INFO } from './moves';
import { TYPE_LABEL } from './types';

/** The moment a triggered Instinct fires. */
export type InstinctMoment =
  /** It takes the field: as the battle begins (round 1), swapping in, or replacing a knocked-out teammate. */
  | 'enter'
  /** It loses a Vitality heart. */
  | 'heartLost'
  /** A physical attack (move or Swap Move) hits it and it's still standing. */
  | 'hitPhysical'
  /** It knocks out a foe. */
  | 'ko'
  /** One of its attacks misses. */
  | 'miss'
  /** The end of every round it's on the field. */
  | 'roundEnd';

export type InstinctEffect =
  /** A stat change while it stays in (`self`) or on the opposing creature (`foe`), capped at ±3 like any battle modifier. */
  | { t: 'mod'; who: 'self' | 'foe'; stat: StatKey; n: number }
  /** The opposing creature gets a status (if it has none). */
  | { t: 'status'; status: StatusId }
  /** It recovers Health (within its current heart). */
  | { t: 'heal'; n: number }
  /** Its Stamina refills. */
  | { t: 'refill' }
  /** It shakes off its own status. */
  | { t: 'cure' }
  /** Flat damage to the opposing creature. */
  | { t: 'sting'; n: number };

export interface InstinctTrigger {
  on: InstinctMoment;
  /** Only the first time in a battle. */
  once?: boolean;
  /** Fires on a d6 roll of this or lower (omitted: always). */
  chance?: number;
  effects: InstinctEffect[];
}

/** Rules an Instinct bends for as long as its creature is on the field. */
export interface InstinctPassive {
  /** Its accuracy can't be lowered: Daze doesn't shrink its die, and Beguile and the Darkness arena don't cut its rolls. */
  steady?: boolean;
  /** Foes can't Zero In against it: their bonus isn't used, and their misses don't build one. */
  shroud?: boolean;
  /** Shrugs off the first status that would afflict it in a battle. */
  shrugFirst?: boolean;
  /** Statuses it can never get. */
  immune?: StatusId[];
  /** The first blow that would knock it out leaves it at 1 Health instead (once a battle). */
  holdFast?: boolean;
  /** Its attacks that can crit do so on a roll this much lower. */
  keen?: number;
  /** Its elemental moves inflict their status on a 1 or 2 on a damage die, instead of only a 1. */
  spread?: boolean;
  /** Its misses Zero In this much more (on moves that Zero In at all). */
  zeroPlus?: number;
  /** It rolls a bigger die in Clashes (one size up per point: d6 → d8). */
  clash?: number;
  /** Extra Speed in the first round of a battle. */
  opener?: number;
  /** Stat changes while one of these weathers is in the sky. */
  weather?: { ids: string[]; mods: Partial<Record<StatKey, number>> };
  /** Stat changes while it's on its last heart (Vitality 0). */
  lastHeart?: Partial<Record<StatKey, number>>;
}

export interface Instinct {
  id: string;
  name: string;
  /** The type whose pool it belongs to (generated species draw from their types' pools). */
  type: ElementType;
  /** What it does, in a sentence, for players. */
  text: string;
  trigger?: InstinctTrigger;
  passive?: InstinctPassive;
}

const mod = (who: 'self' | 'foe', stat: StatKey, n: number): InstinctEffect => ({ t: 'mod', who, stat, n });

export const INSTINCTS: Instinct[] = [
  // ── Astral ──
  { id: 'starlit-gaze', name: 'Starlit Gaze', type: 'astral', text: 'Its cold stare pins the foe in place: the foe’s Evasion drops by 1 when it takes the field.',
    trigger: { on: 'enter', effects: [mod('foe', 'evasion', -1)] } },
  { id: 'fixed-star', name: 'Fixed Star', type: 'astral', text: 'Its aim never wavers: nothing can lower its accuracy.',
    passive: { steady: true } },
  { id: 'shadow', name: 'Shadow', type: 'astral', text: 'It melts into the dark: foes can’t Zero In against it.',
    passive: { shroud: true } },
  { id: 'comet-tail', name: 'Comet Tail', type: 'astral', text: 'It streaks in ahead of everyone: +2 Speed in the first round.',
    passive: { opener: 2 } },
  { id: 'lucid-mind', name: 'Lucid Mind', type: 'astral', text: 'Its thoughts stay clear: it can never be Dazed.',
    passive: { immune: ['daze'] } },
  { id: 'supernova', name: 'Supernova', type: 'astral', text: 'The first time it loses a heart, it flares: the foe is Dazed and it gains +1 Focus.',
    trigger: { on: 'heartLost', once: true, effects: [{ t: 'status', status: 'daze' }, mod('self', 'focus', 1)] } },

  // ── Charm ──
  { id: 'disarming-smile', name: 'Disarming Smile', type: 'charm', text: 'A sweet look as it arrives takes the foe’s mind off its aim: the foe’s Focus drops by 1.',
    trigger: { on: 'enter', effects: [mod('foe', 'focus', -1)] } },
  { id: 'glamour', name: 'Glamour', type: 'charm', text: 'It makes an entrance that’s hard to look at directly: +1 Evasion when it takes the field.',
    trigger: { on: 'enter', effects: [mod('self', 'evasion', 1)] } },
  { id: 'heartmend', name: 'Heartmend', type: 'charm', text: 'The first time it loses a heart, it pulls itself together: it recovers 3 Health and shakes off its status.',
    trigger: { on: 'heartLost', once: true, effects: [{ t: 'heal', n: 3 }, { t: 'cure' }] } },
  { id: 'captivate', name: 'Captivate', type: 'charm', text: 'Touching it is a mistake: a foe that hits it with a physical attack may be Beguiled (1–2 on a d6).',
    trigger: { on: 'hitPhysical', chance: 2, effects: [{ t: 'status', status: 'beguile' }] } },
  { id: 'pure-heart', name: 'Pure Heart', type: 'charm', text: 'Nothing clouds it: it can never be Beguiled or Dazed.',
    passive: { immune: ['beguile', 'daze'] } },
  { id: 'curtain-call', name: 'Curtain Call', type: 'charm', text: 'It takes a bow after every knockout: +1 Evasion.',
    trigger: { on: 'ko', effects: [mod('self', 'evasion', 1)] } },

  // ── Electric ──
  { id: 'static-field', name: 'Static Field', type: 'electric', text: 'Its fur crackles: a foe that hits it with a physical attack may be Shocked (1–2 on a d6).',
    trigger: { on: 'hitPhysical', chance: 2, effects: [{ t: 'status', status: 'shock' }] } },
  { id: 'overclock', name: 'Overclock', type: 'electric', text: 'It arrives already buzzing: +1 Speed when it takes the field.',
    trigger: { on: 'enter', effects: [mod('self', 'speed', 1)] } },
  { id: 'hair-trigger', name: 'Hair Trigger', type: 'electric', text: 'It’s quickest off the mark: in a Clash it rolls a die one size bigger.',
    passive: { clash: 1 } },
  { id: 'lock-on', name: 'Lock-On', type: 'electric', text: 'Every miss sharpens it: its misses Zero In 1 more than usual.',
    passive: { zeroPlus: 1 } },
  { id: 'backup-battery', name: 'Backup Battery', type: 'electric', text: 'The first time it loses a heart, a reserve kicks in: its Stamina refills and it gains +1 Speed.',
    trigger: { on: 'heartLost', once: true, effects: [{ t: 'refill' }, mod('self', 'speed', 1)] } },
  { id: 'storm-rider', name: 'Storm Rider', type: 'electric', text: 'Wild weather charges it: +1 Speed and +1 Focus in a Thunderstorm or Gusty Winds.',
    passive: { weather: { ids: ['storm', 'windy'], mods: { speed: 1, focus: 1 } } } },

  // ── Fire ──
  { id: 'eruption', name: 'Eruption', type: 'fire', text: 'The first time it loses a heart, it erupts: the foe is Burned.',
    trigger: { on: 'heartLost', once: true, effects: [{ t: 'status', status: 'burn' }] } },
  { id: 'ember-hide', name: 'Ember Hide', type: 'fire', text: 'Its hide smoulders: a foe that hits it with a physical attack may be Burned (1–2 on a d6).',
    trigger: { on: 'hitPhysical', chance: 2, effects: [{ t: 'status', status: 'burn' }] } },
  { id: 'last-blaze', name: 'Last Blaze', type: 'fire', text: 'Cornered, it burns hottest: +2 Power and +1 Focus while it’s on its last heart.',
    passive: { lastHeart: { power: 2, focus: 1 } } },
  { id: 'sunbather', name: 'Sunbather', type: 'fire', text: 'It loves the heat: +1 Power and +1 Speed in a Heat Wave or Drought.',
    passive: { weather: { ids: ['heat', 'drought'], mods: { power: 1, speed: 1 } } } },
  { id: 'wildfire', name: 'Wildfire', type: 'fire', text: 'Its flames spread: its elemental moves inflict their status on a 1 or 2 on a damage die.',
    passive: { spread: true } },
  { id: 'stoke', name: 'Stoke', type: 'fire', text: 'Every win feeds the fire: +1 Power after each knockout.',
    trigger: { on: 'ko', effects: [mod('self', 'power', 1)] } },

  // ── Grass ──
  { id: 'deep-roots', name: 'Deep Roots', type: 'grass', text: 'It draws strength from the ground: it recovers 1 Health at the end of every round.',
    trigger: { on: 'roundEnd', effects: [{ t: 'heal', n: 1 }] } },
  { id: 'bramble-coat', name: 'Bramble Coat', type: 'grass', text: 'Thorns line its back: a foe that hits it with a physical attack takes 1 damage.',
    trigger: { on: 'hitPhysical', effects: [{ t: 'sting', n: 1 }] } },
  { id: 'creeping-vines', name: 'Creeping Vines', type: 'grass', text: 'Vines spread out as it arrives: the foe’s Speed drops by 1.',
    trigger: { on: 'enter', effects: [mod('foe', 'speed', -1)] } },
  { id: 'spore-puff', name: 'Spore Puff', type: 'grass', text: 'A cloud of spores bursts when it’s struck: a foe that hits it with a physical attack may be Snared (1–2 on a d6).',
    trigger: { on: 'hitPhysical', chance: 2, effects: [{ t: 'status', status: 'snare' }] } },
  { id: 'bloomrush', name: 'Bloomrush', type: 'grass', text: 'Rain and blossom wake it up: +1 Speed and +1 Ward in Rain or Spring Bloom.',
    passive: { weather: { ids: ['rain', 'bloom'], mods: { speed: 1, ward: 1 } } } },
  { id: 'firm-roots', name: 'Firm Roots', type: 'grass', text: 'It won’t be moved: it can never be Snared or Staggered.',
    passive: { immune: ['snare', 'stagger'] } },

  // ── Rock ──
  { id: 'menace', name: 'Menace', type: 'rock', text: 'It looms over the foe as it arrives: the foe’s Power drops by 1.',
    trigger: { on: 'enter', effects: [mod('foe', 'power', -1)] } },
  { id: 'hold-fast', name: 'Hold Fast', type: 'rock', text: 'Once a battle, the blow that would knock it out leaves it hanging on with 1 Health.',
    passive: { holdFast: true } },
  { id: 'bedrock', name: 'Bedrock', type: 'rock', text: 'It settles in like stone: +1 Armor when it takes the field.',
    trigger: { on: 'enter', effects: [mod('self', 'armor', 1)] } },
  { id: 'jagged-shell', name: 'Jagged Shell', type: 'rock', text: 'Its shell bites back: a foe that hits it with a physical attack may be Staggered (1–2 on a d6).',
    trigger: { on: 'hitPhysical', chance: 2, effects: [{ t: 'status', status: 'stagger' }] } },
  { id: 'rockfall', name: 'Rockfall', type: 'rock', text: 'The first time it loses a heart, stones come down: the foe is Staggered and it gains +1 Armor.',
    trigger: { on: 'heartLost', once: true, effects: [{ t: 'status', status: 'stagger' }, mod('self', 'armor', 1)] } },
  { id: 'dust-devil', name: 'Dust Devil', type: 'rock', text: 'It vanishes into flying grit: +1 Evasion and +1 Armor in a Drought or Gusty Winds.',
    passive: { weather: { ids: ['drought', 'windy'], mods: { evasion: 1, armor: 1 } } } },

  // ── Steel ──
  { id: 'steel-coat', name: 'Steel Coat', type: 'steel', text: 'Its plating turns the first status of every battle aside.',
    passive: { shrugFirst: true } },
  { id: 'keen-edge', name: 'Keen Edge', type: 'steel', text: 'Honed to a fine edge: its attacks that can crit do so on a roll 1 lower.',
    passive: { keen: 1 } },
  { id: 'polished-plate', name: 'Polished Plate', type: 'steel', text: 'Fresh polish turns energy aside: +1 Ward when it takes the field.',
    trigger: { on: 'enter', effects: [mod('self', 'ward', 1)] } },
  { id: 'corrode', name: 'Corrode', type: 'steel', text: 'A metallic tang hangs around it: the foe’s Ward drops by 1 when it takes the field.',
    trigger: { on: 'enter', effects: [mod('foe', 'ward', -1)] } },
  { id: 'iron-will', name: 'Iron Will', type: 'steel', text: 'It doesn’t bend or break: it can never be Staggered or Sundered.',
    passive: { immune: ['stagger', 'sunder'] } },
  { id: 'tempered', name: 'Tempered', type: 'steel', text: 'Each fight hardens it: +1 Armor and +1 Ward after each knockout.',
    trigger: { on: 'ko', effects: [mod('self', 'armor', 1), mod('self', 'ward', 1)] } },

  // ── Water ──
  { id: 'rain-dancer', name: 'Rain Dancer', type: 'water', text: 'It’s in its element in a downpour: +1 Speed and +1 Evasion in Rain or a Thunderstorm.',
    passive: { weather: { ids: ['rain', 'storm'], mods: { speed: 1, evasion: 1 } } } },
  { id: 'fresh-spring', name: 'Fresh Spring', type: 'water', text: 'It arrives clear-headed: +1 Focus when it takes the field.',
    trigger: { on: 'enter', effects: [mod('self', 'focus', 1)] } },
  { id: 'slick-scales', name: 'Slick Scales', type: 'water', text: 'It’s slippery to grab: a foe that hits it with a physical attack may be Soaked (1–2 on a d6).',
    trigger: { on: 'hitPhysical', chance: 2, effects: [{ t: 'status', status: 'soak' }] } },
  { id: 'second-wave', name: 'Second Wave', type: 'water', text: 'A miss only builds the swell: +1 Focus each time one of its attacks misses.',
    trigger: { on: 'miss', effects: [mod('self', 'focus', 1)] } },
  { id: 'wet-coat', name: 'Wet Coat', type: 'water', text: 'Always damp: it can never be Burned or Soaked.',
    passive: { immune: ['burn', 'soak'] } },
  { id: 'undercurrent', name: 'Undercurrent', type: 'water', text: 'The first time it loses a heart, the tide turns: the foe is Soaked and its own Stamina refills.',
    trigger: { on: 'heartLost', once: true, effects: [{ t: 'status', status: 'soak' }, { t: 'refill' }] } },
];

export const INSTINCT_BY_ID: Record<string, Instinct> = Object.fromEntries(INSTINCTS.map((i) => [i.id, i]));
/** Each type's Instincts, in order (generated species draw from these). */
export const INSTINCT_POOL: Record<ElementType, Instinct[]> = INSTINCTS.reduce((acc, i) => {
  (acc[i.type] ??= []).push(i);
  return acc;
}, {} as Record<ElementType, Instinct[]>);

/** The icon battles and cards use for Instincts. */
export const INSTINCT_ICON = '🔆';

// ── Exact rules in words (card hover, docs/14) ─────────────────────
const LABEL: Record<StatKey, string> = { vigor: 'Vigor', power: 'Power', armor: 'Armor', focus: 'Focus', ward: 'Ward', speed: 'Speed', evasion: 'Evasion', stamina: 'Stamina' };
const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`);
const statusName = (s: StatusId) => STATUS_INFO[s].name;
/** Weather names (data/content.ts → WEATHER), kept here so this file doesn't import the content tables. */
const WEATHER_NAME: Record<string, string> = { rain: 'Rain', bloom: 'Spring Bloom', windy: 'Gusty Winds', heat: 'a Heat Wave', storm: 'a Thunderstorm', drought: 'a Drought', fog: 'Fog', overcast: 'Overcast skies', snow: 'Snowfall', blizzard: 'a Blizzard', aurora: 'an Aurora Night' };
const mods = (m: Partial<Record<StatKey, number>>) => Object.entries(m).map(([k, n]) => `${signed(n!)} ${LABEL[k as StatKey]}`).join(', ');

export const MOMENT_TEXT: Record<InstinctMoment, string> = {
  enter: 'When it takes the field',
  heartLost: 'When it loses a Vitality heart',
  hitPhysical: 'When a physical attack hits it',
  ko: 'When it knocks out a foe',
  miss: 'When one of its attacks misses',
  roundEnd: 'At the end of each round',
};

function effectText(e: InstinctEffect): string {
  switch (e.t) {
    case 'mod': return e.who === 'self' ? `${signed(e.n)} ${LABEL[e.stat]} while it stays in` : `the foe gets ${signed(e.n)} ${LABEL[e.stat]}`;
    case 'status': return `${statusName(e.status)} on the foe (if it has no status)`;
    case 'heal': return `it recovers ${e.n} Health (beyond full Health: Overheal, up to half its max Health)`;
    case 'refill': return 'its Stamina refills';
    case 'cure': return 'it shakes off its status';
    case 'sting': return `the foe takes ${e.n} damage`;
  }
}

/** The Instinct's exact rules, generated from its data. */
export function instinctRules(i: Instinct): string {
  const out: string[] = [];
  const t = i.trigger;
  if (t) {
    const when = `${MOMENT_TEXT[t.on]}${t.once ? ' (first time each battle)' : ''}${t.chance ? `, on 1–${t.chance} on a d6` : ''}`;
    out.push(`${when}: ${t.effects.map(effectText).join('; ')}.`);
  }
  const p = i.passive;
  if (p) {
    if (p.steady) out.push('Its accuracy can’t be lowered (no Daze die shrink, no Beguile or Darkness penalty).');
    if (p.shroud) out.push('Foes can’t Zero In against it (their bonus isn’t used, and their misses don’t build one).');
    if (p.shrugFirst) out.push('The first status that would afflict it each battle is shrugged off.');
    if (p.immune?.length) out.push(`Immune to ${p.immune.map(statusName).join(' and ')}.`);
    if (p.holdFast) out.push('Once a battle, a blow that would knock it out leaves it at 1 Health.');
    if (p.keen) out.push(`Crits on a roll ${p.keen} lower (attacks that can crit).`);
    if (p.spread) out.push('Its elemental moves inflict their status on a 1 or 2 on any damage die.');
    if (p.zeroPlus) out.push(`Misses Zero In +${p.zeroPlus} more (moves that Zero In).`);
    if (p.clash) out.push(`Clash die ${p.clash} size${p.clash > 1 ? 's' : ''} bigger.`);
    if (p.opener) out.push(`${signed(p.opener)} Speed in round 1.`);
    if (p.weather) out.push(`${mods(p.weather.mods)} in ${p.weather.ids.map((w) => WEATHER_NAME[w] ?? w).join(' or ')}.`);
    if (p.lastHeart) out.push(`${mods(p.lastHeart)} while on its last heart (Vitality 0).`);
  }
  return out.join(' ');
}

/** "Astral" etc., for docs. */
export const instinctTypeLabel = (i: Instinct) => TYPE_LABEL[i.type];
