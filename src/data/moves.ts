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

/** Zeroing In: a missed accuracy roll gives the creature's next accuracy roll this bonus, unless the move says otherwise. */
export const ZERO_IN = 1;
/** Misses in a row stack Zeroing In up to this bonus. */
export const ZERO_IN_MAX = 3;
/** How much a miss with this move zeroes in (sure-hit moves never miss, so 0). */
export const zeroInOf = (m: Move) => (m.accuracy === 'sure' ? 0 : m.zeroIn ?? ZERO_IN);

/** Every damage die a move rolls: its main die plus any extra dice (empty for none). */
export const damageDice = (m: Move): number[] => (m.dmgDie ? [m.dmgDie, ...(m.extraDice ?? [])] : []);
/** The die a Cascade move chains with when a damage die rolls its top face (0: no Cascade). */
export const cascadeDie = (m: Move, die: number) => (m.kind === 'physical' && m.cascade ? (m.cascade === true ? die : m.cascade) : 0);
/** Average total of a die that keeps rolling and adding while it shows its top face. */
const explodingAvg = (d: number) => (d < 2 ? 1 : (d * (d + 1)) / (2 * (d - 1)));
/** Average of one damage die, Cascade included. */
const dieAvg = (m: Move, d: number) => (d + 1) / 2 + (cascadeDie(m, d) ? explodingAvg(cascadeDie(m, d)) / d : 0);
/** Average of a move's damage dice plus its flat bonus, before stats (Cascade chains included). */
export const avgRoll = (m: Move) => damageDice(m).reduce((a, d) => a + dieAvg(m, d), 0) + m.dmgFlat;
/** A move's damage as text, e.g. "d6+d4+1" ('' for none). */
export const diceText = (m: Move) => [...damageDice(m).map((d) => `d${d}`), m.dmgFlat ? `${m.dmgFlat}` : ''].filter(Boolean).join('+');
/** Highest damage roll that inflicts an elemental attack's status: 1, plus its Potency, plus `extra` (a Wildfire-like Instinct). */
export const statusFaces = (m: Move, extra = 0) => 1 + (m.potency ?? 0) + extra;
/** Chance that at least one damage die rolls low enough to inflict an elemental move's status. */
export const statusChance = (m: Move, extra = 0) =>
  (m.dmgDie ? 1 - damageDice(m).reduce((p, d) => p * (1 - Math.min(d, statusFaces(m, extra)) / d), 1) : 0);
/** "a 1" / "1–3": the damage rolls that inflict the status. */
export const statusRollText = (m: Move, extra = 0) => (statusFaces(m, extra) === 1 ? 'a 1' : `1–${statusFaces(m, extra)}`);
/** Purge bonus against a foe with status `st` (0 if it doesn't apply). */
export const purgeBonus = (m: Move, st?: StatusId) => (m.kind === 'elemental' && m.purge && st && (!m.purge.status || m.purge.status === st) ? m.purge.n : 0);
/** Purge's default sizes: any status, and a named one (a bigger payoff for setting it up). */
export const PURGE_ANY = 2, PURGE_NAMED = 4;
/** How many top faces of the accuracy die crit (physical, non-sure-hit moves only). */
export const critFaces = (m: Move) => (m.kind === 'physical' && m.accuracy !== 'sure' ? Math.max(1, m.critRange ?? 1) : 0);
/** The lowest natural accuracy roll that crits on this die (never a 1), or 0 if the move can't crit. */
export const critFrom = (m: Move, die: number) => (critFaces(m) ? Math.max(2, die - critFaces(m) + 1) : 0);

/** The status each type's elemental attacks inflict. */
export const STATUS_FOR: Record<ElementType, StatusId> = {
  astral: 'daze', charm: 'beguile', electric: 'shock', fire: 'burn',
  grass: 'snare', rock: 'stagger', steel: 'sunder', water: 'soak',
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

const HANDMADE: Move[] = [
  // ── Physical (type-less, can crit) ─────────────────────────────
  P('tackle', 'Tackle', { cost: { neutral: 1 }, dmgDie: 4 }, 'A reliable body slam.'),
  P('claw', 'Claw', { cost: { neutral: 2 }, dmgDie: 6, effort: 1, critRange: 2 }, 'Raking swipe that finds the soft spots.'),
  P('quick-jab', 'Quick Jab', { cost: { neutral: 1 }, dmgDie: 0, dmgFlat: 2, speed: 3, accuracy: 'sure' }, 'Strikes first and never misses.'),
  P('headbutt', 'Headbutt', { cost: { neutral: 3 }, dmgDie: 8, effort: 2, speed: -1 }, 'Heavy, slow, and hard to shrug off.'),
  P('pounce', 'Pounce', { cost: { neutral: 2 }, dmgDie: 4, dmgFlat: 1, speed: 2, zeroIn: 2 }, 'Leaps in before the foe can react.'),
  P('rampage', 'Rampage', { cost: { neutral: 4 }, dmgDie: 10, effort: 3, speed: -2, accuracy: 8, zeroIn: 0, critRange: 3 }, 'An all-out charge. Exhausting.'),
  P('tail-whip', 'Tail Lash', { cost: { neutral: 2 }, dmgDie: 4, effect: { foe: { armor: -1 } } }, 'A stinging lash of the tail.'),
  // Cascade: a top-face damage roll rolls again (or rolls the named die) and keeps chaining
  P('flurry', 'Flurry', { cost: { neutral: 2 }, dmgDie: 4, cascade: true }, 'A blur of quick blows that can snowball.'),
  P('wild-swing', 'Wild Swing', { cost: { neutral: 3 }, dmgDie: 6, dmgFlat: 1, effort: 2, cascade: 4 }, 'A reckless haymaker. Sometimes it just keeps landing.'),
  P('avalanche-slam', 'Avalanche Slam', { cost: { neutral: 4 }, dmgDie: 6, dmgFlat: 1, effort: 3, speed: -2, cascade: 10 }, 'Starts as a shove and can end as a landslide.'),

  // ── Support (type-less) ────────────────────────────────────────
  S('brace', 'Brace', undefined, { cost: { neutral: 1 }, speed: 4, effect: { self: { armor: 2, ward: 2 } } }, 'Digs in and braces for impact.'),
  S('second-wind', 'Second Wind', undefined, { cost: { neutral: 2 }, effort: 0, speed: 1, effect: { staminaGain: 4, heal: 1 } }, 'A deep, steadying breath.'),

  // ── Status moves (no damage: a hit inflicts the status) ────────
  S('dizzy-lights', 'Dizzy Lights', 'astral', { cost: { astral: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'daze' }, 'Swirling pinpricks of starlight.'),
  S('sweet-nothings', 'Sweet Nothings', 'charm', { cost: { charm: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'beguile' }, 'Whispered flattery the foe can’t shake.'),
  S('live-wire', 'Live Wire', 'electric', { cost: { electric: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'shock' }, 'A crackling touch that locks up muscles.'),
  S('smolder', 'Smolder', 'fire', { cost: { fire: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'burn' }, 'Breathes on embers until they catch.'),
  S('creeping-vines', 'Creeping Vines', 'grass', { cost: { grass: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'snare' }, 'Tendrils that wind around the legs.'),
  S('ground-rumble', 'Ground Rumble', 'rock', { cost: { rock: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'stagger' }, 'Shakes the footing out from under the foe.'),
  S('corrode', 'Corrode', 'steel', { cost: { steel: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'sunder' }, 'Eats away at hide and plating.'),
  S('drench', 'Drench', 'water', { cost: { water: 1, neutral: 1 }, accuracy: 6, speed: 1, status: 'soak' }, 'A cold soaking that weighs the foe down.'),

  // ── Astral ─────────────────────────────────────────────────────
  E('stardust', 'Stardust', 'astral', { cost: { astral: 1 }, dmgDie: 4 }, 'Glittering motes that can Daze.'),
  E('comet-tail', 'Comet Tail', 'astral', { cost: { astral: 2, neutral: 1 }, dmgDie: 6, speed: 1 }, 'A streaking blow of starlight.'),
  E('aurora-veil', 'Aurora Veil', 'astral', { kind: 'support', cost: { astral: 2 }, dmgDie: 0, speed: 3, accuracy: 'sure', effect: { self: { ward: 2, evasion: 1 } } }, 'A shimmering curtain of aurora light.'),
  E('meteor', 'Meteor', 'astral', { cost: { astral: 4, neutral: 1 }, dmgDie: 10, extraDice: [4], effort: 3, speed: -2 }, 'Calls down a falling star and its shower of fragments.'),

  // ── Charm ──────────────────────────────────────────────────────
  E('pixie-glint', 'Pixie Glint', 'charm', { cost: { charm: 1 }, dmgDie: 4 }, 'A dazzling wink that can Beguile.'),
  E('heartbreaker', 'Heartbreaker', 'charm', { cost: { charm: 2, neutral: 1 }, dmgDie: 6, purge: { n: PURGE_ANY } }, 'Wounds the pride as much as the body, and hurts most when the foe is already suffering.'),
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
  E('magma-surge', 'Magma Surge', 'fire', { cost: { fire: 4, neutral: 1 }, dmgDie: 10, dmgFlat: 1, effort: 3, speed: -2, potency: 1 }, 'A wave of molten rock.'),

  // ── Grass ──────────────────────────────────────────────────────
  E('vine-snap', 'Vine Snap', 'grass', { cost: { grass: 1 }, dmgDie: 4 }, 'A whipping vine that can Snare.'),
  E('thorn-volley', 'Thorn Volley', 'grass', { cost: { grass: 2, neutral: 1 }, dmgDie: 4, extraDice: [4] }, 'A spray of needle-sharp thorns.'),
  E('photosynth', 'Photosynth', 'grass', { kind: 'support', cost: { grass: 2 }, dmgDie: 0, accuracy: 'sure', effect: { heal: 3, staminaGain: 2 } }, 'Drinks in the light.'),
  E('redwood-crush', 'Redwood Crush', 'grass', { cost: { grass: 4, neutral: 1 }, dmgDie: 10, effort: 3, speed: -2 }, 'Topples an ancient trunk onto the foe.'),

  // ── Rock ───────────────────────────────────────────────────────
  E('pebble-shot', 'Pebble Shot', 'rock', { cost: { rock: 1 }, dmgDie: 4 }, 'Flung grit that can Stagger.'),
  E('rockslide', 'Rockslide', 'rock', { cost: { rock: 2, neutral: 1 }, dmgDie: 4, extraDice: [4], speed: -1 }, 'A tumble of loose boulders.'),
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
  E('maelstrom', 'Maelstrom', 'water', { cost: { water: 4, neutral: 1 }, dmgDie: 10, extraDice: [4], effort: 3, speed: -2, purge: { n: PURGE_ANY } }, 'A whirlpool that drags the foe under, worst of all for a foe already struggling.'),

  // ── Potency: status hitters (3 of one type; status on a damage roll of 1–3) ──
  E('starglimmer', 'Starglimmer', 'astral', { cost: { astral: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'A haze of twinkling light that leaves the foe seeing stars.'),
  E('bewitching-waltz', 'Bewitching Waltz', 'charm', { cost: { charm: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'A twirling dance that’s hard to look away from.'),
  E('crackle-web', 'Crackle Web', 'electric', { cost: { electric: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'A net of sparks that clings and stings.'),
  E('cinder-storm', 'Cinder Storm', 'fire', { cost: { fire: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'A whirl of glowing ash that sets everything smoldering.'),
  E('thicket-lash', 'Thicket Lash', 'grass', { cost: { grass: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'Thorny stems that whip and tangle.'),
  E('grit-squall', 'Grit Squall', 'rock', { cost: { rock: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'A blast of sand and gravel that rattles the senses.'),
  E('rust-rain', 'Rust Rain', 'steel', { cost: { steel: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'Flakes of corroding metal that eat into armor.'),
  E('undertow', 'Undertow', 'water', { cost: { water: 3 }, dmgDie: 6, effort: 2, potency: 2 }, 'A heavy drag of water that clings and soaks.'),

  // ── Purge: payoffs against a status (2 of the lead type + 1 of the type that inflicts it) ──
  E('starstruck', 'Starstruck', 'astral', { cost: { astral: 2, charm: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'beguile' } }, 'Strikes a smitten foe while its guard is down.'),
  E('dream-kiss', 'Dream Kiss', 'charm', { cost: { charm: 2, astral: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'daze' } }, 'A tender blow to a foe already lost in a daze.'),
  E('conductive-arc', 'Conductive Arc', 'electric', { cost: { electric: 2, water: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'soak' } }, 'Lightning loves a soaked target.'),
  E('kindling-flare', 'Kindling Flare', 'fire', { cost: { fire: 2, grass: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'snare' } }, 'Sets the tangled vines ablaze.'),
  E('grounding-roots', 'Grounding Roots', 'grass', { cost: { grass: 2, electric: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'shock' } }, 'Roots drink the charge out of a shocked foe.'),
  E('shatterpoint', 'Shatterpoint', 'rock', { cost: { rock: 2, steel: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'sunder' } }, 'Finds the cracks in sundered armor.'),
  E('pile-driver', 'Pile Driver', 'steel', { cost: { steel: 2, rock: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'stagger' } }, 'Hammers a staggering foe into the ground.'),
  E('quench', 'Quench', 'water', { cost: { water: 2, fire: 1 }, dmgDie: 6, dmgFlat: 1, effort: 2, purge: { n: PURGE_NAMED, status: 'burn' } }, 'Cold water on hot wounds: a burst of scalding steam.'),

  // ── Signature moves (unlocked via progression trees) ──────────
  E('sig-borealis', 'Borealis Lance', 'astral', { cost: { astral: 3, neutral: 1 }, dmgDie: 6, dmgFlat: 4, speed: 1 }, 'Signature. A spear of aurora light.'),
  E('sig-moonveil', 'Moonveil Kiss', 'charm', { cost: { charm: 3, neutral: 1 }, dmgDie: 8, accuracy: 'sure' }, 'Signature. Never misses.'),
  E('sig-stormcall', 'Stormcall', 'electric', { cost: { electric: 3, neutral: 1 }, dmgDie: 8, speed: 2 }, 'Signature. Lightning before thunder.'),
  E('sig-caldera', 'Caldera Roar', 'fire', { cost: { fire: 3, neutral: 1 }, dmgDie: 8, dmgFlat: 2, effort: 2 }, 'Signature. Erupts from within.'),
  E('sig-overgrowth', 'Overgrowth', 'grass', { cost: { grass: 3, neutral: 1 }, dmgDie: 8, effect: { heal: 2 } }, 'Signature. Roots that drain and regrow.'),
  E('sig-mesa', 'Mesa Breaker', 'rock', { cost: { rock: 3, neutral: 1 }, dmgDie: 10, dmgFlat: 2, speed: -1 }, 'Signature. Shears a cliff face.'),
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

// Every elemental attack carries its type's status (inflicted when any damage die shows a 1).
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

/** A move's Zeroing In when it isn't the usual +1, e.g. "Pursuit: a miss zeroes in +2." */
export function zeroInText(m: Move): string {
  const z = zeroInOf(m);
  if (m.accuracy === 'sure' || z === ZERO_IN) return '';
  return z === 0 ? 'All or nothing: a miss never zeroes in.' : `Pursuit: a miss zeroes in +${z} (not +${ZERO_IN}).`;
}

/** A move's keywords (Potency, Cascade, Purge) with what each does, e.g. { name: 'Potency 2', text: '…' }. */
export function moveKeywords(m: Move): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  if (m.kind === 'elemental' && m.potency && m.status) out.push({
    name: `Potency ${m.potency}`,
    text: `inflicts ${STATUS_INFO[m.status].name} on a damage roll of ${statusRollText(m)}${m.extraDice?.length ? ' on any die' : ''}, not just a 1 (${Math.round(statusChance(m) * 100)}%).`,
  });
  if (m.kind === 'physical' && m.cascade) {
    const d = m.cascade === true ? 0 : m.cascade;
    out.push({
      name: d ? `Cascade d${d}` : 'Cascade',
      text: `a damage die that rolls its highest face ${d ? `rolls a d${d}` : 'rolls again'} and adds it, and keeps going while that rolls its highest face.`,
    });
  }
  if (m.kind === 'elemental' && m.purge) out.push({
    name: m.purge.status ? `Purge: ${STATUS_INFO[m.purge.status].name}` : 'Purge',
    text: `+${m.purge.n} damage against a foe with ${m.purge.status ? STATUS_INFO[m.purge.status].name : 'any status'} (the status stays on).`,
  });
  return out;
}

/** What a status move does on a hit, e.g. "If it lands, the foe gets Burn for 3 rounds (no damage)." */
export function statusMoveText(m: Move): string {
  return m.kind === 'support' && m.status ? `If it lands, the foe gets ${STATUS_INFO[m.status].name} for 3 rounds (no damage; nothing happens if it already has a status).` : '';
}

/** Extra dice and wider crits, spelled out, e.g. "Crits on an accuracy roll of 5–6." */
export function diceRulesText(m: Move): string {
  const out: string[] = [];
  if (m.extraDice?.length && m.kind === 'elemental' && m.status && !m.potency) out.push(`Rolls ${diceText(m)}: a 1 on any die inflicts the status (${Math.round(statusChance(m) * 100)}%).`);
  else if (m.extraDice?.length) out.push(`Rolls ${diceText(m)}.`);
  for (const k of moveKeywords(m)) out.push(`${k.name}: ${k.text[0].toUpperCase()}${k.text.slice(1)}`);
  if (critFaces(m) > 1 && typeof m.accuracy === 'number') out.push(`Wide crits: an accuracy roll of ${critFrom(m, m.accuracy)}–${m.accuracy} crits.`);
  return out.join(' ');
}

// Spell out every effect's exact numbers in the move's text, so cards never go vague or stale.
for (const m of MOVES) { const fx = [diceRulesText(m), statusMoveText(m), effectText(m), zeroInText(m)].filter(Boolean).join(' '); if (fx) m.text = `${m.text} ${fx}`; }

export const MOVE_BY_ID: Record<string, Move> = Object.fromEntries(MOVES.map((m) => [m.id, m]));

/**
 * Placeholder attacks retired by a hand-made move in the same grid slot: old id → the move that fills
 * the slot now. Saves made while the placeholder existed may still have it in a playbook (see migrate).
 */
export const RETIRED_MOVES: Record<string, string> = Object.fromEntries(ATTACK_SLOTS
  .filter((sl) => filled.has(slotKey(sl.cost, sl.type)))
  .map((sl) => [placeholderAttack(sl).id, HANDMADE.find((m) => m.kind === 'elemental' && !m.id.startsWith('sig-') && slotKey(m.cost, m.type) === slotKey(sl.cost, sl.type))!.id]));

/** A stored move id as it is now: a retired placeholder becomes its replacement; unknown ids give undefined. */
export function currentMoveId(id: string): string | undefined {
  const now = RETIRED_MOVES[id] ?? id;
  return MOVE_BY_ID[now] ? now : undefined;
}

/** Always-available action that isn't part of the 4-move playbook. */
export const CATCH_BREATH: Move = {
  id: 'catch-breath', name: 'Catch Breath', kind: 'support', cost: {}, effort: 0, speed: 0,
  accuracy: 'sure', dmgDie: 0, dmgFlat: 0, effect: { staminaGain: 99 }, text: 'Skip attacking to fully restore Stamina.',
};

