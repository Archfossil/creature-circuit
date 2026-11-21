import type { Move, ElementType, StatusId, EnergyMap } from './schema';
import { TYPES, TYPE_LABEL } from './types';

// Example Master Move List. Costs are playbook requirements (not spent per use).
// accuracy: die rolled vs target Evasion ('sure' always hits). Physical max roll = critical (x2).

const P = (id: string, name: string, o: Partial<Move>, text: string): Move => ({
  id, name, kind: 'physical', cost: {}, effort: 1, speed: 0, accuracy: 6, dmgDie: 4, dmgFlat: 0, text, ...o,
});
const E = (id: string, name: string, type: ElementType, o: Partial<Move>, text: string): Move => ({
  id, name, kind: 'elemental', type, cost: {}, effort: 1, speed: 0, accuracy: 6, dmgDie: 4, dmgFlat: 0, text, ...o,
});
const S = (id: string, name: string, type: ElementType | undefined, o: Partial<Move>, text: string): Move => ({
  id, name, kind: 'support', type, cost: {}, effort: 1, speed: 2, accuracy: 'sure', dmgDie: 0, dmgFlat: 0, text, ...o,
});

/** The status each type's elemental attacks inflict. */
export const STATUS_FOR: Record<ElementType, StatusId> = {
  astral: 'daze', charm: 'beguile', electric: 'shock', fire: 'burn',
  grass: 'snare', rock: 'stagger', steel: 'sunder', water: 'soak',
};

const HANDMADE: Move[] = [
  // ── Physical (type-less, can crit) ─────────────────────────────
  P('tackle', 'Tackle', { cost: { neutral: 1 }, dmgDie: 4 }, 'A reliable body slam.'),
  P('claw', 'Claw', { cost: { neutral: 2 }, dmgDie: 6, effort: 1 }, 'Raking swipe. Crits on a max accuracy roll.'),
  P('quick-jab', 'Quick Jab', { cost: { neutral: 1 }, dmgDie: 0, dmgFlat: 2, speed: 3, accuracy: 'sure' }, 'Strikes first and never misses.'),
  P('headbutt', 'Headbutt', { cost: { neutral: 3 }, dmgDie: 8, effort: 2, speed: -1 }, 'Heavy, slow, and hard to shrug off.'),
  P('pounce', 'Pounce', { cost: { neutral: 2 }, dmgDie: 4, dmgFlat: 1, speed: 2 }, 'Leaps in before the foe can react.'),
  P('rampage', 'Rampage', { cost: { neutral: 4 }, dmgDie: 10, effort: 3, speed: -2, accuracy: 8 }, 'An all-out charge. Exhausting.'),
  P('tail-whip', 'Tail Lash', { cost: { neutral: 2 }, dmgDie: 4, effect: { foe: { armor: -1 } } }, 'A stinging lash of the tail.'),

  // ── Support (type-less) ────────────────────────────────────────
  S('brace', 'Brace', undefined, { cost: { neutral: 1 }, speed: 4, effect: { self: { armor: 2, ward: 2 } } }, 'Digs in and braces for impact.'),
  S('second-wind', 'Second Wind', undefined, { cost: { neutral: 2 }, effort: 0, speed: 1, effect: { staminaGain: 4, heal: 1 } }, 'A deep, steadying breath.'),

  // ── Astral ─────────────────────────────────────────────────────
  E('stardust', 'Stardust', 'astral', { cost: { astral: 1 }, dmgDie: 4 }, 'Glittering motes that can Daze.'),
  E('comet-tail', 'Comet Tail', 'astral', { cost: { astral: 2, neutral: 1 }, dmgDie: 6, speed: 1 }, 'A streaking blow of starlight.'),
  E('aurora-veil', 'Aurora Veil', 'astral', { kind: 'support', cost: { astral: 2 }, dmgDie: 0, speed: 3, accuracy: 'sure', effect: { self: { ward: 2, evasion: 1 } } }, 'A shimmering curtain of aurora light.'),
  E('meteor', 'Meteor', 'astral', { cost: { astral: 4, neutral: 1 }, dmgDie: 10, dmgFlat: 1, effort: 3, speed: -2 }, 'Calls down a falling star.'),

  // ── Charm ──────────────────────────────────────────────────────
  E('pixie-glint', 'Pixie Glint', 'charm', { cost: { charm: 1 }, dmgDie: 4 }, 'A dazzling wink that can Beguile.'),
  E('heartbreaker', 'Heartbreaker', 'charm', { cost: { charm: 2, neutral: 1 }, dmgDie: 6 }, 'Wounds the pride as much as the body.'),
  E('lullaby', 'Lullaby', 'charm', { kind: 'support', cost: { charm: 2 }, dmgDie: 0, accuracy: 6, effect: { foe: { speed: -2, focus: -1 } } }, 'A drowsy melody.'),
  E('glamour-burst', 'Glamour Burst', 'charm', { cost: { charm: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -1 }, 'An overwhelming flash of fey light.'),

  // ── Electric ───────────────────────────────────────────────────
  E('spark', 'Spark', 'electric', { cost: { electric: 1 }, dmgDie: 4, speed: 1 }, 'A quick zap that can Shock.'),
  E('volt-fang', 'Volt Fang', 'electric', { cost: { electric: 2, neutral: 1 }, dmgDie: 6, speed: 1 }, 'Crackling bite.'),
  E('static-field', 'Static Field', 'electric', { kind: 'support', cost: { electric: 2 }, dmgDie: 0, effect: { self: { speed: 3 }, foe: { evasion: -1 } } }, 'Charges the air with static.'),
  E('thunderclap', 'Thunderclap', 'electric', { cost: { electric: 4, neutral: 1 }, dmgDie: 10, effort: 3 }, 'A deafening bolt from above.'),

  // ── Fire ───────────────────────────────────────────────────────
  E('ember', 'Ember', 'fire', { cost: { fire: 1 }, dmgDie: 4 }, 'Hot cinders that can Burn.'),
  E('fire-claw', 'Fire Claw', 'fire', { cost: { fire: 2, neutral: 1 }, dmgDie: 6 }, 'Talons wreathed in flame.'),
  E('heat-haze', 'Heat Haze', 'fire', { kind: 'support', cost: { fire: 2 }, dmgDie: 0, accuracy: 'sure', effect: { self: { evasion: 1, focus: 1 } } }, 'A shimmer of rising heat.'),
  E('magma-surge', 'Magma Surge', 'fire', { cost: { fire: 4, neutral: 1 }, dmgDie: 10, dmgFlat: 1, effort: 3, speed: -2 }, 'A wave of molten rock.'),

  // ── Grass ──────────────────────────────────────────────────────
  E('vine-snap', 'Vine Snap', 'grass', { cost: { grass: 1 }, dmgDie: 4 }, 'A whipping vine that can Snare.'),
  E('thorn-volley', 'Thorn Volley', 'grass', { cost: { grass: 2, neutral: 1 }, dmgDie: 6 }, 'A spray of needle-sharp thorns.'),
  E('photosynth', 'Photosynth', 'grass', { kind: 'support', cost: { grass: 2 }, dmgDie: 0, accuracy: 'sure', effect: { heal: 3, staminaGain: 2 } }, 'Drinks in the light.'),
  E('redwood-crush', 'Redwood Crush', 'grass', { cost: { grass: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -2 }, 'Topples an ancient trunk onto the foe.'),

  // ── Rock ───────────────────────────────────────────────────────
  E('pebble-shot', 'Pebble Shot', 'rock', { cost: { rock: 1 }, dmgDie: 4 }, 'Flung grit that can Stagger.'),
  E('rockslide', 'Rockslide', 'rock', { cost: { rock: 2, neutral: 1 }, dmgDie: 6, speed: -1 }, 'A tumble of loose boulders.'),
  E('stone-skin', 'Stone Skin', 'rock', { kind: 'support', cost: { rock: 2 }, dmgDie: 0, accuracy: 'sure', speed: 3, effect: { self: { armor: 2, ward: 1 } } }, 'Hardens the hide.'),
  E('canyon-quake', 'Canyon Quake', 'rock', { cost: { rock: 4, neutral: 1 }, dmgDie: 10, dmgFlat: 1, effort: 3, speed: -3 }, 'Splits the ground beneath the foe.'),

  // ── Steel ──────────────────────────────────────────────────────
  E('rivet', 'Rivet', 'steel', { cost: { steel: 1 }, dmgDie: 4 }, 'A hammered bolt that can Sunder.'),
  E('iron-tide', 'Iron Tide', 'steel', { cost: { steel: 2, neutral: 1 }, dmgDie: 6 }, 'A wave of liquid ore.'),
  E('bulwark', 'Bulwark', 'steel', { kind: 'support', cost: { steel: 2 }, dmgDie: 0, accuracy: 'sure', speed: 4, effect: { self: { armor: 3 } } }, 'Locks into a fortress stance.'),
  E('anchor-drop', 'Anchor Drop', 'steel', { cost: { steel: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -2 }, 'Drops a ship\'s anchor from on high.'),

  // ── Water ──────────────────────────────────────────────────────
  E('splash-jet', 'Splash Jet', 'water', { cost: { water: 1 }, dmgDie: 4 }, 'A pressurized squirt that can Soak.'),
  E('tide-crash', 'Tide Crash', 'water', { cost: { water: 2, neutral: 1 }, dmgDie: 6 }, 'Rolling breaker.'),
  E('mist-cloak', 'Mist Cloak', 'water', { kind: 'support', cost: { water: 2 }, dmgDie: 0, accuracy: 'sure', speed: 3, effect: { self: { evasion: 2 } } }, 'Wraps itself in mist.'),
  E('maelstrom', 'Maelstrom', 'water', { cost: { water: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -1 }, 'A whirlpool that drags the foe under.'),

  // ── Signature moves (unlocked via progression trees) ──────────
  E('sig-borealis', 'Borealis Lance', 'astral', { cost: { astral: 3, neutral: 1 }, dmgDie: 8, dmgFlat: 1, speed: 1 }, 'Signature. A spear of aurora light.'),
  E('sig-moonveil', 'Moonveil Kiss', 'charm', { cost: { charm: 3, neutral: 1 }, dmgDie: 8, accuracy: 'sure' }, 'Signature. Never misses.'),
  E('sig-stormcall', 'Stormcall', 'electric', { cost: { electric: 3, neutral: 1 }, dmgDie: 8, speed: 2 }, 'Signature. Lightning before thunder.'),
  E('sig-caldera', 'Caldera Roar', 'fire', { cost: { fire: 3, neutral: 1 }, dmgDie: 8, dmgFlat: 2, effort: 2 }, 'Signature. Erupts from within.'),
  E('sig-overgrowth', 'Overgrowth', 'grass', { cost: { grass: 3, neutral: 1 }, dmgDie: 8, effect: { heal: 2 } }, 'Signature. Roots that drain and regrow.'),
  E('sig-mesa', 'Mesa Breaker', 'rock', { cost: { rock: 3, neutral: 1 }, dmgDie: 8, dmgFlat: 2, speed: -1 }, 'Signature. Shears a cliff face.'),
  E('sig-foundry', 'Foundry Hammer', 'steel', { cost: { steel: 3, neutral: 1 }, dmgDie: 8, effect: { foe: { armor: -1 } } }, 'Signature. Forge-hot strike.'),
  E('sig-riptide', 'Riptide', 'water', { cost: { water: 3, neutral: 1 }, dmgDie: 8, speed: 2 }, 'Signature. Pulls the foe off balance.'),
];

// ── The attack grid ─────────────────────────────────────────────
// One elemental attack for every typed energy cost with a total of 1–5, and for every type that
// could lead it:
//   • single type: 1–5 of that type (8 × 5 = 40 slots)
//   • two types: at least 1 of each, 5 at most in total. An uneven split hits as the type it
//     spends more of (2 Fire + 1 Water is a Fire attack). An even split (1+1, 2+2) gets one attack
//     for EACH type, so 2 Fire + 2 Grass exists as a Fire attack and as a Grass attack.
//     (8 uneven + 2 × 2 even = 12 slots per pair × 28 pairs = 336 slots)
// That keeps the grid perfectly even: every type leads 47 attacks (5 single + 6 per pair × 7).
// Neutral energy doesn't count toward a slot, so Comet Tail (2 Astral + 1 Neutral) fills "2 Astral".
// Hand-made attacks fill their slots; the rest get a generated PLACEHOLDER (`placeholder: true`,
// id `atk-<type><n>[-<type><n>]`, plus `-<hit type>` on even splits) to be swapped for real moves.

/** Typed part of a cost as a stable key, e.g. "fire2+water1". Empty for type-less moves. */
export const costKey = (cost: Move['cost']) =>
  TYPES.filter((t) => (cost[t] ?? 0) > 0).map((t) => `${t}${cost[t]}`).join('+');

/** A grid slot: a typed cost and the type the attack hits as. */
export interface AttackSlot { cost: EnergyMap; type: ElementType }

/** Slot key: cost plus hit type, e.g. "fire2+grass2>grass". */
export const slotKey = (cost: Move['cost'], type?: ElementType) => `${costKey(cost)}>${type ?? ''}`;

/** Every slot of the attack grid. */
export const ATTACK_SLOTS: AttackSlot[] = (() => {
  const out: AttackSlot[] = [];
  for (const t of TYPES) for (let n = 1; n <= 5; n++) out.push({ cost: { [t]: n }, type: t });
  for (let i = 0; i < TYPES.length; i++) for (let j = i + 1; j < TYPES.length; j++) {
    const [ti, tj] = [TYPES[i], TYPES[j]];
    for (let a = 1; a <= 4; a++) for (let b = 1; a + b <= 5; b++) {
      const cost = { [ti]: a, [tj]: b };
      if (a === b) out.push({ cost, type: ti }, { cost, type: tj });
      else out.push({ cost, type: a > b ? ti : tj });
    }
  }
  return out;
})();

const STEM: Record<ElementType, string> = { astral: 'Star', charm: 'Glam', electric: 'Volt', fire: 'Flame', grass: 'Bramble', rock: 'Stone', steel: 'Iron', water: 'Tide' };
const TAIL: Record<ElementType, string> = { astral: 'light', charm: 'heart', electric: 'spark', fire: 'blaze', grass: 'thorn', rock: 'grit', steel: 'forge', water: 'spray' };
const SINGLE_NOUN = ['', 'Flick', 'Shot', 'Lance', 'Storm', 'Nova'];
/** Dual names by split: ties and lopsided splits get their own nouns so every name is unique. */
const DUAL_NOUN = (major: number, minor: number) =>
  ({ '1-1': 'Pulse', '2-1': 'Strike', '2-2': 'Wave', '3-1': 'Crash', '3-2': 'Barrage', '4-1': 'Cataclysm' } as Record<string, string>)[`${major}-${minor}`];

/** Attack numbers by total cost: bigger costs hit harder, tire more and act later (the placeholder formula, also the balance baseline). */
export const BY_TOTAL: Record<number, Pick<Move, 'dmgDie' | 'dmgFlat' | 'effort' | 'speed'>> = {
  1: { dmgDie: 4, dmgFlat: 0, effort: 1, speed: 0 },
  2: { dmgDie: 6, dmgFlat: 0, effort: 1, speed: 0 },
  3: { dmgDie: 6, dmgFlat: 1, effort: 2, speed: 0 },
  4: { dmgDie: 8, dmgFlat: 1, effort: 2, speed: -1 },
  5: { dmgDie: 10, dmgFlat: 1, effort: 3, speed: -2 },
};

function placeholderAttack({ cost, type }: AttackSlot): Move {
  const types = TYPES.filter((t) => (cost[t] ?? 0) > 0);
  const total = types.reduce((a, t) => a + cost[t]!, 0);
  const even = types.length === 2 && cost[types[0]] === cost[types[1]];
  const id = `atk-${types.map((t) => `${t}${cost[t]}`).join('-')}${even ? `-${type}` : ''}`;
  if (types.length === 1) {
    return {
      id, name: `${STEM[type]} ${SINGLE_NOUN[total]}`, kind: 'elemental', type, cost: { ...cost }, accuracy: 6, ...BY_TOTAL[total],
      text: `A focused burst of ${TYPE_LABEL[type]} energy.`, placeholder: true,
    };
  }
  const major = type, minor = types.find((t) => t !== type)!;
  const s = BY_TOTAL[total];
  return {
    id, name: `${STEM[major]}${TAIL[minor]} ${DUAL_NOUN(cost[major]!, cost[minor]!)}`, kind: 'elemental', type: major, cost: { ...cost }, accuracy: 6,
    ...s, dmgFlat: s.dmgFlat + 1, // needing two energy types earns a little extra punch
    text: `Fuses ${TYPE_LABEL[major]} and ${TYPE_LABEL[minor]} energy. Hits as ${TYPE_LABEL[major]}.`, placeholder: true,
  };
}

/** Hand-made attacks that fill a grid slot (signature moves are unlocked separately, so they don't count). */
const filled = new Set(HANDMADE.filter((m) => m.kind === 'elemental' && !m.id.startsWith('sig-')).map((m) => slotKey(m.cost, m.type)));

export const MOVES: Move[] = [...HANDMADE, ...ATTACK_SLOTS.filter((sl) => !filled.has(slotKey(sl.cost, sl.type))).map(placeholderAttack)];

// Every elemental attack carries its type's status (inflicted on minimum damage roll).
for (const m of MOVES) if (m.kind === 'elemental' && m.type && !m.status) m.status = STATUS_FOR[m.type];

const STAT_NAME: Record<string, string> = { vigor: 'Vigor', power: 'Power', armor: 'Armor', focus: 'Focus', ward: 'Ward', speed: 'Speed', evasion: 'Evasion', stamina: 'Stamina' };

/**
 * Exactly what a move's effect does, from its data, e.g. "You: +2 Armor, +2 Ward." or
 * "On a hit: foe −1 Armor." Stat changes stay until that creature leaves the field (±3 max per stat).
 */
export function effectText(m: Move): string {
  const e = m.effect;
  if (!e) return '';
  const list = (o: Partial<Record<string, number>>) => {
    const xs = Object.entries(o).map(([k, v]) => `${v! > 0 ? '+' : '−'}${Math.abs(v!)} ${STAT_NAME[k] ?? k}`);
    return xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0];
  };
  const parts: string[] = [];
  if (e.self && Object.keys(e.self).length) parts.push(`you get ${list(e.self)}`);
  if (e.foe && Object.keys(e.foe).length) parts.push(`the foe gets ${list(e.foe)}`);
  if (e.heal) parts.push(`you heal ${e.heal} Health`);
  if (e.staminaGain) parts.push(e.staminaGain >= 99 ? 'your Stamina refills' : `you recover ${e.staminaGain} Stamina`);
  if (!parts.length) return '';
  const body = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  const when = m.kind !== 'support' ? 'On a hit, ' : m.accuracy !== 'sure' ? 'If it lands, ' : '';
  const sentence = when ? `${when}${body}.` : `${body[0].toUpperCase()}${body.slice(1)}.`;
  return `${sentence}${e.self || e.foe ? ' Stat changes last until that creature leaves the field (max ±3 each).' : ''}`;
}

// Spell out every effect's exact numbers in the move's text, so cards never go vague or stale.
for (const m of MOVES) { const fx = effectText(m); if (fx) m.text = `${m.text} ${fx}`; }

export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(MOVES.map((m) => [m.id, m]));

/** Always-available action that isn't part of the 4-move playbook. */
export const CATCH_BREATH: Move = {
  id: 'catch-breath', name: 'Catch Breath', kind: 'support', cost: {}, effort: 0, speed: 0,
  accuracy: 'sure', dmgDie: 0, dmgFlat: 0, effect: { staminaGain: 99 }, text: 'Skip attacking to fully restore Stamina.',
};

export const STATUS_INFO: Record<StatusId, { name: string; icon: string; text: string }> = {
  burn: { name: 'Burn', icon: '🔥', text: 'Takes 1 damage at the end of each round.' },
  soak: { name: 'Soak', icon: '💧', text: '−2 Speed, so it is more likely to act second.' },
  shock: { name: 'Shock', icon: '⚡', text: 'Each time it uses a move, a 1-in-3 chance to lock up and lose the action (no Stamina spent).' },
  snare: { name: 'Snare', icon: '🌿', text: '−1 Speed and −1 Evasion, so it is easier to hit.' },
  stagger: { name: 'Stagger', icon: '💥', text: '−1 Power and −1 Focus: its physical and elemental attacks each deal 1 less damage.' },
  sunder: { name: 'Sunder', icon: '⚙️', text: '−1 Armor and −1 Ward: it takes 1 more damage from physical and elemental attacks.' },
  beguile: { name: 'Beguile', icon: '💗', text: '−1 to its accuracy rolls (Sure-hit moves are unaffected).' },
  daze: { name: 'Daze', icon: '✨', text: 'Its accuracy die shrinks one size (d8 → d6, d6 → d4; never below d4). Sure-hit moves are unaffected.' },
};
