import type { Move, ElementType, StatusId } from './schema';

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

const STATUS_FOR: Record<ElementType, StatusId> = {
  astral: 'daze', charm: 'beguile', electric: 'shock', fire: 'burn',
  grass: 'snare', rock: 'stagger', steel: 'sunder', water: 'soak',
};

export const MOVES: Move[] = [
  // ── Physical (type-less, can crit) ─────────────────────────────
  P('tackle', 'Tackle', { cost: { neutral: 1 }, dmgDie: 4 }, 'A reliable body slam.'),
  P('claw', 'Claw', { cost: { neutral: 2 }, dmgDie: 6, effort: 1 }, 'Raking swipe. Crits on a max accuracy roll.'),
  P('quick-jab', 'Quick Jab', { cost: { neutral: 1 }, dmgDie: 0, dmgFlat: 2, speed: 3, accuracy: 'sure' }, 'Strikes first and never misses.'),
  P('headbutt', 'Headbutt', { cost: { neutral: 3 }, dmgDie: 8, effort: 2, speed: -1 }, 'Heavy, slow, and hard to shrug off.'),
  P('pounce', 'Pounce', { cost: { neutral: 2 }, dmgDie: 4, dmgFlat: 1, speed: 2 }, 'Leaps in before the foe can react.'),
  P('rampage', 'Rampage', { cost: { neutral: 4 }, dmgDie: 10, effort: 3, speed: -2, accuracy: 8 }, 'An all-out charge. Exhausting.'),
  P('tail-whip', 'Tail Lash', { cost: { neutral: 2 }, dmgDie: 4, effect: { foe: { armor: -1 } } }, 'Lowers the target\'s Armor.'),

  // ── Support (type-less) ────────────────────────────────────────
  S('brace', 'Brace', undefined, { cost: { neutral: 1 }, speed: 4, effect: { self: { armor: 2, ward: 2 } } }, 'Raises Armor and Ward for the round. Very fast.'),
  S('second-wind', 'Second Wind', undefined, { cost: { neutral: 2 }, effort: 0, speed: 1, effect: { staminaGain: 4, heal: 1 } }, 'Recovers Stamina and a sliver of Health.'),

  // ── Astral ─────────────────────────────────────────────────────
  E('stardust', 'Stardust', 'astral', { cost: { astral: 1 }, dmgDie: 4 }, 'Glittering motes that can Daze.'),
  E('comet-tail', 'Comet Tail', 'astral', { cost: { astral: 2, neutral: 1 }, dmgDie: 6, speed: 1 }, 'A streaking blow of starlight.'),
  E('aurora-veil', 'Aurora Veil', 'astral', { kind: 'support', cost: { astral: 2 }, dmgDie: 0, speed: 3, accuracy: 'sure', effect: { self: { ward: 2, evasion: 1 } } }, 'Shimmering curtain raises Ward and Evasion.'),
  E('meteor', 'Meteor', 'astral', { cost: { astral: 4, neutral: 1 }, dmgDie: 10, dmgFlat: 1, effort: 3, speed: -2 }, 'Calls down a falling star.'),

  // ── Charm ──────────────────────────────────────────────────────
  E('pixie-glint', 'Pixie Glint', 'charm', { cost: { charm: 1 }, dmgDie: 4 }, 'A dazzling wink that can Beguile.'),
  E('heartbreaker', 'Heartbreaker', 'charm', { cost: { charm: 2, neutral: 1 }, dmgDie: 6 }, 'Wounds the pride as much as the body.'),
  E('lullaby', 'Lullaby', 'charm', { kind: 'support', cost: { charm: 2 }, dmgDie: 0, accuracy: 6, effect: { foe: { speed: -2, focus: -1 } } }, 'Slows the foe and dulls their Focus.'),
  E('glamour-burst', 'Glamour Burst', 'charm', { cost: { charm: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -1 }, 'An overwhelming flash of fey light.'),

  // ── Electric ───────────────────────────────────────────────────
  E('spark', 'Spark', 'electric', { cost: { electric: 1 }, dmgDie: 4, speed: 1 }, 'A quick zap that can Shock.'),
  E('volt-fang', 'Volt Fang', 'electric', { cost: { electric: 2, neutral: 1 }, dmgDie: 6, speed: 1 }, 'Crackling bite.'),
  E('static-field', 'Static Field', 'electric', { kind: 'support', cost: { electric: 2 }, dmgDie: 0, effect: { self: { speed: 3 }, foe: { evasion: -1 } } }, 'Charges the air: +Speed, foe -Evasion.'),
  E('thunderclap', 'Thunderclap', 'electric', { cost: { electric: 4, neutral: 1 }, dmgDie: 10, effort: 3 }, 'A deafening bolt from above.'),

  // ── Fire ───────────────────────────────────────────────────────
  E('ember', 'Ember', 'fire', { cost: { fire: 1 }, dmgDie: 4 }, 'Hot cinders that can Burn.'),
  E('fire-claw', 'Fire Claw', 'fire', { cost: { fire: 2, neutral: 1 }, dmgDie: 6 }, 'Talons wreathed in flame.'),
  E('heat-haze', 'Heat Haze', 'fire', { kind: 'support', cost: { fire: 2 }, dmgDie: 0, effect: { self: { evasion: 1, focus: 1 } } }, 'Shimmering heat: +Evasion, +Focus.'),
  E('magma-surge', 'Magma Surge', 'fire', { cost: { fire: 4, neutral: 1 }, dmgDie: 10, dmgFlat: 1, effort: 3, speed: -2 }, 'A wave of molten rock.'),

  // ── Grass ──────────────────────────────────────────────────────
  E('vine-snap', 'Vine Snap', 'grass', { cost: { grass: 1 }, dmgDie: 4 }, 'A whipping vine that can Snare.'),
  E('thorn-volley', 'Thorn Volley', 'grass', { cost: { grass: 2, neutral: 1 }, dmgDie: 6 }, 'A spray of needle-sharp thorns.'),
  E('photosynth', 'Photosynth', 'grass', { kind: 'support', cost: { grass: 2 }, dmgDie: 0, effect: { heal: 3, staminaGain: 2 } }, 'Drinks in light to restore Health.'),
  E('redwood-crush', 'Redwood Crush', 'grass', { cost: { grass: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -2 }, 'Topples an ancient trunk onto the foe.'),

  // ── Rock ───────────────────────────────────────────────────────
  E('pebble-shot', 'Pebble Shot', 'rock', { cost: { rock: 1 }, dmgDie: 4 }, 'Flung grit that can Stagger.'),
  E('rockslide', 'Rockslide', 'rock', { cost: { rock: 2, neutral: 1 }, dmgDie: 6, speed: -1 }, 'A tumble of loose boulders.'),
  E('stone-skin', 'Stone Skin', 'rock', { kind: 'support', cost: { rock: 2 }, dmgDie: 0, speed: 3, effect: { self: { armor: 2, ward: 1 } } }, 'Hardens the hide.'),
  E('canyon-quake', 'Canyon Quake', 'rock', { cost: { rock: 4, neutral: 1 }, dmgDie: 10, dmgFlat: 1, effort: 3, speed: -3 }, 'Splits the ground beneath the foe.'),

  // ── Steel ──────────────────────────────────────────────────────
  E('rivet', 'Rivet', 'steel', { cost: { steel: 1 }, dmgDie: 4 }, 'A hammered bolt that can Sunder.'),
  E('iron-tide', 'Iron Tide', 'steel', { cost: { steel: 2, neutral: 1 }, dmgDie: 6 }, 'A wave of liquid ore.'),
  E('bulwark', 'Bulwark', 'steel', { kind: 'support', cost: { steel: 2 }, dmgDie: 0, speed: 4, effect: { self: { armor: 3 } } }, 'Locks into a fortress stance.'),
  E('anchor-drop', 'Anchor Drop', 'steel', { cost: { steel: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -2 }, 'Drops a ship\'s anchor from on high.'),

  // ── Water ──────────────────────────────────────────────────────
  E('splash-jet', 'Splash Jet', 'water', { cost: { water: 1 }, dmgDie: 4 }, 'A pressurized squirt that can Soak.'),
  E('tide-crash', 'Tide Crash', 'water', { cost: { water: 2, neutral: 1 }, dmgDie: 6 }, 'Rolling breaker.'),
  E('mist-cloak', 'Mist Cloak', 'water', { kind: 'support', cost: { water: 2 }, dmgDie: 0, speed: 3, effect: { self: { evasion: 2 } } }, 'Wraps in mist: +2 Evasion.'),
  E('maelstrom', 'Maelstrom', 'water', { cost: { water: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -1 }, 'A whirlpool that drags the foe under.'),

  // ── Signature moves (unlocked via progression trees) ──────────
  E('sig-borealis', 'Borealis Lance', 'astral', { cost: { astral: 3, neutral: 1 }, dmgDie: 8, dmgFlat: 1, speed: 1 }, 'Signature. A spear of aurora light.'),
  E('sig-moonveil', 'Moonveil Kiss', 'charm', { cost: { charm: 3, neutral: 1 }, dmgDie: 8, accuracy: 'sure' }, 'Signature. Never misses.'),
  E('sig-stormcall', 'Stormcall', 'electric', { cost: { electric: 3, neutral: 1 }, dmgDie: 8, speed: 2 }, 'Signature. Lightning before thunder.'),
  E('sig-caldera', 'Caldera Roar', 'fire', { cost: { fire: 3, neutral: 1 }, dmgDie: 8, dmgFlat: 2, effort: 2 }, 'Signature. Erupts from within.'),
  E('sig-overgrowth', 'Overgrowth', 'grass', { cost: { grass: 3, neutral: 1 }, dmgDie: 8, effect: { heal: 2 } }, 'Signature. Drains and regrows.'),
  E('sig-mesa', 'Mesa Breaker', 'rock', { cost: { rock: 3, neutral: 1 }, dmgDie: 8, dmgFlat: 2, speed: -1 }, 'Signature. Shears a cliff face.'),
  E('sig-foundry', 'Foundry Hammer', 'steel', { cost: { steel: 3, neutral: 1 }, dmgDie: 8, effect: { foe: { armor: -1 } } }, 'Signature. Forge-hot strike.'),
  E('sig-riptide', 'Riptide', 'water', { cost: { water: 3, neutral: 1 }, dmgDie: 8, speed: 2 }, 'Signature. Pulls the foe off balance.'),
];

// Every elemental attack carries its type's status (inflicted on minimum damage roll).
for (const m of MOVES) if (m.kind === 'elemental' && m.type && !m.status) m.status = STATUS_FOR[m.type];

export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(MOVES.map((m) => [m.id, m]));

/** Always-available action that isn't part of the 4-move playbook. */
export const CATCH_BREATH: Move = {
  id: 'catch-breath', name: 'Catch Breath', kind: 'support', cost: {}, effort: 0, speed: 0,
  accuracy: 'sure', dmgDie: 0, dmgFlat: 0, effect: { staminaGain: 99 }, text: 'Skip attacking to fully restore Stamina.',
};

export const STATUS_INFO: Record<StatusId, { name: string; icon: string; text: string }> = {
  burn: { name: 'Burn', icon: '🔥', text: 'Takes 1 damage at end of each round.' },
  soak: { name: 'Soak', icon: '💧', text: '-2 Speed.' },
  shock: { name: 'Shock', icon: '⚡', text: '1-in-3 chance to lose the attack.' },
  snare: { name: 'Snare', icon: '🌿', text: '-1 Evasion, -1 Speed.' },
  stagger: { name: 'Stagger', icon: '🪨', text: '-1 Power and Focus.' },
  sunder: { name: 'Sunder', icon: '⚙️', text: '-1 Armor and Ward.' },
  beguile: { name: 'Beguile', icon: '💗', text: 'Rolls 1 lower to hit.' },
  daze: { name: 'Daze', icon: '✨', text: 'Accuracy die drops one size.' },
};
