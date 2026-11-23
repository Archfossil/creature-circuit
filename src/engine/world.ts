import type { Biome, ElementType, MapEdge, MapNode, Rarity, Species, TimeOfDay } from '../data/schema';
import { NODE_BY_ID, neighbors, CITIES, BIOME_TYPES, TOWNS, isTown, MAP_NODES, DEPTHS_STAIR, CLOUD_RING, isCloudNode, ROAMING_KEY_ITEMS, FOREST_FLOOR, inWispRegion } from '../data/map';
import { SPECIES, SPECIES_BY_ID, isActive } from '../data/species';
import { WEATHER, SEASON_INFO, seasonForTurn, BIOME_MATERIALS, ITEMS, itemInfo, isUnique, timeOfDay, RECIPES, NATURE_BY_ID, ABILITIES, type Recipe } from '../data/content';
import { INSTINCT_BY_ID } from '../data/instincts';
import { TYPES, TYPE_LABEL } from '../data/types';
import type { GameState, Training, Retrain, Match, BattleKind } from './state';
import { npcNamed, passerBy } from '../data/npcs';
import { circuitField, mercyOffer, npcBattle, npcTeam, npcTurn, pickRival, rivalChance, settleNpc } from './npcs';
import { tierOf, follower, addItem, hasItem, log, earnCoins, activeMatchOf, moveTrainer, GAUNTLET_CITY, keyTownOf, rollWisp, wispLit } from './state';
import type { CreatureInst } from './creature';
import { STAT_LABEL, HEART, createCreature, fullRestore, speciesOf, abilityOf, instinctIdOf, nameOf, maxHearts, maxVitality, maxHealth, maxStamina, energy, autoSpend, gainXp, addLoyalty, MORALE_HIGH, MORALE_LOW, LEGENDARY_LOYALTY_DRAIN } from './creature';
import type { Battle, Side } from './battle';
import { createBattle } from './battle';
import { roll, pick, starDie, weightedPick, type Star } from './dice';
import { travelTogether, settleTeamwork, riseText } from './teamwork';

export const ability = (s: GameState) => { const f = follower(s); return f ? abilityOf(f) : null; };
/** Today's weather where the trainer stands. In Winter, Aurora Peak is always under Aurora Night. */
export const weather = (s: GameState) => (s.location === 'aurora' && seasonForTurn(s.turn) === 'winter' ? WEATHER.aurora : WEATHER[s.weather] ?? WEATHER.clear);
export const here = (s: GameState): MapNode => NODE_BY_ID[s.location];

// ── Costs ───────────────────────────────────────────────────────
export function cityActionCost(s: GameState) {
  return s.trainer.style === 'nature' ? 2 : s.trainer.style === 'urban' ? 0 : 1;
}
export function reexploreCost(s: GameState) {
  return s.trainer.style === 'urban' ? 2 : 1;
}
/**
 * Initiative to move. Pass the destination: stepping onto a Cloud Island node costs +1 per Tier
 * (Salem makes stronger trainers slog), never more than a whole turn's 5.
 */
export function moveCost(s: GameState, to?: string) {
  const base = (ability(s) === 'trailblazer' || s.trainer.style === 'pathfinder') && !s.flags.firstMoveUsed ? 0 : 1;
  return to && isCloudNode(to) ? Math.min(MAX_STEP_COST, base + cloudStepExtra(s)) : base;
}
/** No single step can cost more than a full turn's Initiative. */
const MAX_STEP_COST = 5;
/** Extra Initiative for each step onto a Cloud Island node: +1 per Tier. */
export const cloudStepExtra = (s: GameState) => tierOf(s);
/** Initiative for a stable rest: a city action, +1 for Pathfinders. */
export function stableCost(s: GameState) {
  return cityActionCost(s) + (s.trainer.style === 'pathfinder' ? 1 : 0);
}
/** Recruitment roll modifier from the trainer's style. */
export const styleRecruitMod = (s: GameState) => (s.trainer.style === 'whisperer' ? 1 : s.trainer.style === 'haggler' ? -1 : 0);
/** Creatures tended per Initiative when camping. */
export const campPerInitiative = (s: GameState) => (s.trainer.style === 'caretaker' ? 2 : 1);

export interface MoveCheck { ok: boolean; cost: number; reason?: string }
export function canMoveTo(s: GameState, id: string): MoveCheck {
  const nb = neighbors(s.location).find((n) => n.node.id === id);
  const cost = moveCost(s, id);
  if (!nb) return { ok: false, cost, reason: 'Not adjacent.' };
  const why = routeBlock(s, nb);
  if (why) return { ok: false, cost, reason: why };
  if (s.initiative < cost) return { ok: false, cost, reason: 'Not enough Initiative.' };
  return { ok: true, cost };
}

/** Why a step along this route is closed to the trainer (a gate: item, Tier, Merit, the portal), or null if open. Initiative isn't checked. */
function routeBlock(s: GameState, nb: { node: MapNode; edge: MapEdge }): string | null {
  if (nb.edge.via === 'portal' && !portalOpen(s)) return 'The Cloud Island portal only opens at night (even turns), or any time in Winter.';
  const req = nb.edge.requires;
  if (req?.item && !hasItem(s, req.item)) return `Requires ${itemInfo(req.item).name}.`;
  // the misty way into Lantern Glade (leaving is always open)
  if (req?.wisp && inWispRegion(nb.node.id) && !inWispRegion(s.location) && !wispLit(s)) {
    return hasItem(s, 'fog-lantern')
      ? 'The mist is too thick. Catch a wisp in your Fog Lantern to light the way (check the lantern to see where one waits).'
      : 'The mist is too thick. A Fog Lantern (Mistfall) with a wisp caught in it lights the way.';
  }
  const nr = nb.node.requires;
  if (nr) {
    if (nr.tier && tierOf(s) < nr.tier) return `Only Tier ${nr.tier}+ trainers may enter.`;
    if (nr.item && !hasItem(s, nr.item)) return `Requires ${itemInfo(nr.item).name}.`;
    if (nr.merit && !s.merits.includes(nr.merit)) return `Only trainers who hold ${CITIES[nr.merit]?.accolade ?? 'that Merit'} may cross. Beat Arbiter ${CITIES[nr.merit]?.arbiter ?? ''} first.`;
  }
  return null;
}

// ── Active effects ──────────────────────────────────────────────
/** Something waiting to kick in (or lasting a while), shown on the map HUD so it isn't forgotten. */
export interface ActiveEffect { id: string; icon: string; name: string; text: string }

/** "+1 Ward, +2 Evasion" */
export const buffText = (buff: Partial<Record<string, number>>) =>
  Object.entries(buff).filter(([, v]) => v).map(([k, v]) => `${v! > 0 ? '+' : ''}${v} ${STAT_LABEL[k as keyof typeof STAT_LABEL] ?? k}`).join(', ');

/**
 * Lingering effects on the trainer: a Chanko Nabe's battle buff (until the next battle), an extra
 * rarity die (Star Charm or the Fortune Teller), Lure Incense, and a wisp in the Fog Lantern.
 */
export function activeEffects(s: GameState): ActiveEffect[] {
  const out: ActiveEffect[] = [];
  if (s.hotpot && Object.keys(s.hotpot.buff).length) {
    const ci = CITIES[s.hotpot.city];
    out.push({ id: 'hotpot', icon: '🍲', name: ci?.hotpot.name ?? 'Chanko Nabe', text: `${buffText(s.hotpot.buff)} for your team in your next battle${ci ? ` (from ${ci.name})` : ''}.` });
  }
  if (s.flags.starCharm) out.push({ id: 'starCharm', icon: '⭐', name: 'Lucky stars', text: 'Your next wild encounter rolls an extra rarity die (a Star Charm or the Fortune Teller).' });
  if (s.flags.lure) out.push({ id: 'lure', icon: '🕯️', name: 'Lure Incense', text: 'Your next explore is a guaranteed wild encounter.' });
  if (s.flags.repel) out.push({ id: 'repel', icon: '💨', name: 'Hush Smoke', text: 'Your next explore can’t turn up a creature or trainer: a 3 finds Nothing and a 4 finds an item.' });
  if (wispLit(s)) out.push({ id: 'wisp', icon: '💫', name: 'Wisp in your Fog Lantern', text: 'The misty way from Fogbank Path to Lantern Glade is lit. It drifts home when you leave the Glade and the Rainbow Plains.' });
  return out;
}

// ── Getting around: travel items & rides ────────────────────────
// The map is big, so a few things move a trainer further than one step at a time: the Bike (a free
// ride of up to d6 steps once a turn), Taxi Tickets (city to city), the Homing Feather (back home)
// and Trail Mix (+1 Initiative). Events add the Hot Air Balloon and the Night Coach (events.ts).

/** Why travel items can't be used here (they only work on the mainland), or null. */
export function travelBlock(s: GameState): string | null {
  if (isCloudNode(s.location)) return 'Not on Cloud Island: leave through the portal first.';
  if (s.location === FOREST_FLOOR) return 'Not on the Forest Floor: climb back up first.';
  return null;
}

/** Arrive somewhere by a ride: `passed` are the nodes travelled through (counted as visited, and as steps when `steps`). */
export function travelTo(s: GameState, dest: string, passed: string[] = [dest], steps = false) {
  moveTrainer(s, dest);
  for (const id of passed) if (!s.visited.includes(id)) s.visited.push(id);
  if (steps) s.stats.steps = (s.stats.steps ?? 0) + passed.length;
}

/**
 * Bike: every node reachable in up to `steps` steps, with the path there (start excluded). Rides
 * stay on land (no sea, portal or rope routes) and respect every gate, and never end at, or pass
 * through, a Legendary's grounds (those are met by walking in).
 */
export function bikeReach(s: GameState, steps: number): Record<string, string[]> {
  const paths: Record<string, string[]> = {};
  let frontier = [s.location];
  const seen = new Set([s.location]);
  for (let d = 0; d < steps; d++) {
    const next: string[] = [];
    for (const at of frontier) {
      for (const nb of neighbors(at)) {
        const id = nb.node.id;
        if (seen.has(id) || nb.edge.via === 'sea' || nb.edge.via === 'portal' || nb.edge.via === 'rope') continue;
        if (isCloudNode(id) || id === FOREST_FLOOR || nb.node.kind === 'legendary' || routeBlock(s, nb)) continue;
        seen.add(id);
        paths[id] = [...(paths[at] ?? []), id];
        next.push(id);
      }
    }
    frontier = next;
  }
  return paths;
}
/** Why the Bike can't be ridden now, or null. */
export function bikeBlock(s: GameState): string | null {
  if (!hasItem(s, 'bike')) return 'You don’t have a Bike.';
  if (s.flags.bikeRoll) return null; // a roll is waiting to be ridden
  if (s.flags.bikeUsed) return 'You’ve already ridden this turn.';
  return travelBlock(s);
}
/** Roll the Bike die (once a turn). A roll not yet ridden is kept, so a reload doesn't re-roll. */
export function rollBike(s: GameState): number | null {
  if (bikeBlock(s)) return null;
  if (!s.flags.bikeRoll) { s.flags.bikeUsed = true; s.flags.bikeRoll = roll(6); }
  return s.flags.bikeRoll;
}
/** Ride to `dest` (within the rolled steps): no Initiative, no exploring. Returns the path, or null. */
export function rideBike(s: GameState, dest: string): string[] | null {
  const n = s.flags.bikeRoll;
  if (!n) return null;
  const path = bikeReach(s, n)[dest];
  if (!path) return null;
  s.flags.bikeRoll = 0;
  travelTo(s, dest, path, true);
  log(s, `Rode the Bike ${path.length} step${path.length === 1 ? '' : 's'} to ${NODE_BY_ID[dest].name}.`);
  return path;
}
/** Get off without riding: the roll is spent. */
export function skipBike(s: GameState) { s.flags.bikeRoll = 0; }

/** Taxi Ticket: from a city, every other city. Empty when not in a city or without a ticket. */
export function taxiTargets(s: GameState): string[] {
  if (!hasItem(s, 'taxi-ticket') || NODE_BY_ID[s.location].kind !== 'city') return [];
  return Object.keys(CITIES).filter((id) => id !== s.location);
}
export function rideTaxi(s: GameState, id: string): boolean {
  if (!taxiTargets(s).includes(id)) return false;
  addItem(s, 'taxi-ticket', -1);
  travelTo(s, id);
  s.initiative = 0;
  log(s, `Took a taxi to ${CITIES[id].name}.`);
  return true;
}

/** Homing Feather: back to the home city, or for a Wanderer any city they've rested at. */
export function featherTargets(s: GameState): string[] {
  if (!hasItem(s, 'homing-feather') || travelBlock(s)) return [];
  return wipeOptions(s).filter((id) => id !== s.location);
}
export function useFeather(s: GameState, id: string): boolean {
  if (!featherTargets(s).includes(id)) return false;
  addItem(s, 'homing-feather', -1);
  travelTo(s, id);
  s.initiative = 0;
  log(s, `A Homing Feather carried you to ${CITIES[id].name}.`);
  return true;
}

/** Trail Mix: +1 Initiative (up to 5), once a turn. Returns a message, or null if it can't be eaten. */
export function trailMixBlock(s: GameState): string | null {
  if (!hasItem(s, 'trail-mix')) return 'No Trail Mix left.';
  if (s.flags.trailMix) return 'You’ve already had a handful this turn.';
  if (s.initiative >= 5) return 'Your Initiative is already full.';
  return null;
}
export function eatTrailMix(s: GameState): boolean {
  if (trailMixBlock(s)) return false;
  addItem(s, 'trail-mix', -1);
  s.flags.trailMix = true;
  s.initiative += 1;
  return true;
}


// ── Exploration ─────────────────────────────────────────────────
/** `die`: the explore die (6, or 8 on the Forest Floor). `dark`: a Forest Floor "nothing" (the team loses Morale). */
export type Outcome =
  | { t: 'nothing'; roll: number; die?: number; /** Hush Smoke turned this encounter face into Nothing or a find. */ hushed?: boolean; dark?: boolean; refund?: boolean }
  | { t: 'encounter'; roll: number; stars: { face: number; star: Star }[]; rarity: Rarity; battle: Battle; die?: number }
  | { t: 'trainer'; roll: number; name: string; battle: Battle; /** What a Rival says. */ line?: string }
  | { t: 'item'; roll: number; itemRoll: number; items: { id: string; n: number }[]; coins: number; die?: number; hushed?: boolean }
  | { t: 'itemChoice'; roll: number; options: Find[]; die?: number; hushed?: boolean }
  /** Forest Floor: a sign of Dahlia's Trail. `found`: enough signs to reach her arena. */
  | { t: 'trail'; roll: number; die: number; steps: number; need: number; found: boolean }
  | { t: 'legendary'; battle: Battle }
  | { t: 'arrive'; node: MapNode };

export function moveTo(s: GameState, id: string): Outcome | null {
  const chk = canMoveTo(s, id);
  if (!chk.ok) return null;
  s.initiative -= chk.cost;
  s.flags.firstMoveUsed = true;
  s.stats.steps = (s.stats.steps ?? 0) + 1;
  const from = s.location;
  moveTrainer(s, id);
  stepCloudLap(s, from, id);
  if (!s.visited.includes(id)) s.visited.push(id);
  const node = NODE_BY_ID[id];
  if (node.kind === 'legendary') {
    if (!legendaryHere(s, node)) return { t: 'nothing', roll: 0 };
    return { t: 'legendary', battle: legendaryBattle(s, node) };
  }
  if (node.kind !== 'wild') return { t: 'arrive', node };
  return explore(s);
}

export function reexplore(s: GameState): Outcome | null {
  const cost = reexploreCost(s);
  if (s.initiative < cost) return null;
  s.initiative -= cost;
  return explore(s);
}

/**
 * Ranger: up to Tier times a turn, an explore that finds Nothing gives back 1 Initiative (never
 * above 5). Counts arrival explores (moving onto a wild node) and re-explores alike.
 */
export const rangerRefundsLeft = (s: GameState) => (s.trainer.style === 'nature' ? Math.max(0, tierOf(s) - (s.flags.rangerRefunds ?? 0)) : 0);

function explore(s: GameState): Outcome {
  const out = exploreRoll(s);
  // (a refund only counts when it gives something back: not at a full 5)
  if (out.t === 'nothing' && out.roll && rangerRefundsLeft(s) > 0 && s.initiative < 5) {
    s.flags.rangerRefunds = (s.flags.rangerRefunds ?? 0) + 1;
    s.initiative += 1;
    return { ...out, refund: true };
  }
  return out;
}

function exploreRoll(s: GameState): Outcome {
  if (s.location === FOREST_FLOOR) return exploreFloor(s);
  const node = here(s);
  s.stats.explored++;
  let r = roll(6);
  const ab = ability(s);
  if (s.flags.lure) { s.flags.lure = false; r = 3 + (r % 2); }
  // Hush Smoke: the encounter faces split into a quiet Nothing (3) and a find (4); Sweet Scent is masked too
  if (s.flags.repel) {
    s.flags.repel = false;
    if (r <= 3) return { t: 'nothing', roll: r, hushed: r === 3 || undefined };
    return { ...discoverItem(s, node, r, node.biome === 'prism' ? exoticFind : rollFind), hushed: r === 4 || undefined } as Outcome;
  }
  const encounterRange = ab === 'sweetScent' ? [3, 5] : [3, 4];
  if (r < encounterRange[0]) return { t: 'nothing', roll: r };
  if (r <= encounterRange[1]) {
    if ((node.biome === 'road' || node.biome === 'meadow') && Math.random() < 0.4) return trainerEncounter(s, node, r);
    return wildEncounter(s, node, r);
  }
  return discoverItem(s, node, r, node.biome === 'prism' ? exoticFind : rollFind);
}

/** One possible find from an explore: its find roll, the items, and any coins. Nothing is applied yet. */
export interface Find { itemRoll: number; items: { id: string; n: number }[]; coins: number }

function rollFind(s: GameState, node: MapNode): Find {
  const ir = roll(6);
  const mult = ability(s) === 'forager' ? 2 : 1;
  const items: { id: string; n: number }[] = [];
  let coins = 0;
  if (ir <= 2) items.push({ id: ir === 1 ? 'sunberry' : (Math.random() < 0.2 ? 'moonberry' : 'dewberry'), n: mult });
  else if (ir <= 4) items.push({ id: pick(BIOME_MATERIALS[node.biome]), n: mult });
  else if (ir === 5) items.push({ id: Math.random() < 0.1 ? 'rousing-salts' : pick(['salve', 'calm-tea', 'lure-incense', 'hush-smoke', 'totem', 'trail-mix']), n: 1 });
  else { if (Math.random() < 0.5) items.push({ id: 'totem', n: 1 }); coins = roll(6); }
  return { itemRoll: ir, items, coins };
}

/** Put a find in the bag (coins through earnCoins); returns it with the coins actually received. */
export function claimFind(s: GameState, f: Find): Find {
  for (const it of f.items) addItem(s, it.id, it.n);
  s.stats.itemsFound = (s.stats.itemsFound ?? 0) + f.items.reduce((n, it) => n + it.n, 0);
  return { ...f, coins: earnCoins(s, f.coins) };
}

const findKey = (f: Find) => f.items.map((i) => `${i.id}×${i.n}`).join('+') + `|${f.coins}`;

function discoverItem(s: GameState, node: MapNode, r: number, finder: (s: GameState, node: MapNode) => Find = rollFind, die = 6): Outcome {
  // Keen Nose: sniff out three different finds and let the trainer keep one
  if (ability(s) === 'keenNose') {
    const options: Find[] = [];
    for (let tries = 0; options.length < 3 && tries < 30; tries++) {
      const f = finder(s, node);
      if (!options.some((o) => findKey(o) === findKey(f))) options.push(f);
    }
    return { t: 'itemChoice', roll: r, options, die };
  }
  const f = claimFind(s, finder(s, node));
  return { t: 'item', roll: r, itemRoll: f.itemRoll, items: f.items, coins: f.coins, die };
}

// ── The Forest Floor (Dahlia) ───────────────────────────────────
// One dark node below Gloomshade, reached by rope (Canopy Rope). Exploring it rolls a d8:
// 1–2 nothing (the team loses 1 Morale: they fear the dark), 3–4 a wild creature (hard to run from),
// 5–6 an exotic find, 7–8 a sign of Dahlia's Trail. 3 + Tier signs lead to her arena. Leaving the
// Forest Floor, by choice or by being sent home, loses the trail (see state.ts → moveTrainer).

/** Signs of Dahlia's Trail needed to find her arena: 3, +1 per Tier. */
export const trailNeeded = (s: GameState) => 3 + tierOf(s);
export function trailProgress(s: GameState) {
  const need = trailNeeded(s);
  const steps = Math.min(need, s.flags.dahliaTrail ?? 0);
  return { steps, need, found: steps >= need, onFloor: s.location === FOREST_FLOOR };
}

/** The Forest Floor's explore die: a d8 while Dahlia's Trail matters, a d6 (no trail results) once she's beaten. */
export const floorDie = (s: GameState) => (s.merits.includes('gloom') ? 6 : 8);

function exploreFloor(s: GameState): Outcome {
  const node = here(s);
  s.stats.explored++;
  const die = floorDie(s);
  let r = roll(die);
  if (s.flags.lure) { s.flags.lure = false; r = 3 + (r % 2); }
  // Hush Smoke: a 3 is a quiet Nothing (no fear of the dark), a 4 an exotic find; it's spent on any roll
  if (s.flags.repel) {
    s.flags.repel = false;
    if (r === 3) return { t: 'nothing', roll: r, die, hushed: true };
    if (r >= 4 && r <= 6) return { ...discoverItem(s, node, r, exoticFind, die), hushed: r === 4 || undefined } as Outcome;
  }
  const encounterTo = ability(s) === 'sweetScent' ? 5 : 4;
  if (r <= 2) {
    for (const c of s.roster) if (!c.ko) c.morale = Math.max(0, c.morale - 1);
    return { t: 'nothing', roll: r, die, dark: true };
  }
  if (r <= encounterTo) {
    const { stars, rarity } = rollRarity(s, node);
    const level = wildLevel(s, node);
    // the Forest Floor is always dark: night creatures are out
    const sp = pickSpecies(node, rarity, level, weather(s).encounter, 'night');
    const wild = createCreature(sp.id, level);
    if (!s.dex.seen.includes(sp.id)) s.dex.seen.push(sp.id);
    const battle = createBattle(playerSide(s), { kind: 'wild', name: `Wild ${sp.name}`, team: [wild], active: 0, mods: {} }, weather(s), { biome: node.biome, quickStep: ability(s) === 'quickStep', hardRun: true });
    return { t: 'encounter', roll: r, stars, rarity, battle, die };
  }
  if (r <= 6) return discoverItem(s, node, r, exoticFind, die);
  s.flags.dahliaTrail = (s.flags.dahliaTrail ?? 0) + 1;
  const t = trailProgress(s);
  if (t.found && s.flags.dahliaTrail === t.need) log(s, 'Followed Dahlia’s Trail to her arena on the Forest Floor.');
  return { t: 'trail', roll: r, die: 8, steps: t.steps, need: t.need, found: t.found };
}

/** Forest Floor and Rainbow Plains finds: exotic, a little better than the usual ones (Duskberries, the biome's exotic materials, Root Salve). */
function exoticFind(s: GameState, node: MapNode): Find {
  const ir = roll(6);
  const mult = ability(s) === 'forager' ? 2 : 1;
  const items: { id: string; n: number }[] = [];
  let coins = 0;
  if (ir <= 2) items.push({ id: 'duskberry', n: mult });
  else if (ir <= 4) items.push({ id: pick(BIOME_MATERIALS[node.biome]), n: mult });
  else if (ir === 5) items.push({ id: Math.random() < 0.2 ? 'rousing-salts' : 'root-salve', n: 1 });
  else { items.push({ id: pick(BIOME_MATERIALS[node.biome]), n: 1 }); coins = roll(6) + 3; }
  return { itemRoll: ir, items, coins };
}

// ── Encounter scaling by Trainer Tier ───────────────────────────
// Wild and roaming-trainer creatures sit in a level band set by Tier, just under that Tier's
// Arbiter (Lv 1 + 2·Tier). A node's own level only nudges within the band, so a "Lv 5" route
// is a bit tougher than a "Lv 2" one at any Tier, but never a wall at Tier 1 or a pushover at Tier 5.

/** Centre of the wild level band for a Tier: 1, 3, 5, 7, 9 (starters begin at Lv 1). */
export const tierBandLevel = (tier: number) => 2 * tier - 1;

/** Node difficulty offset within the band: node Lv 1–2 → −1, 3–4 → 0, 5–6 → +1, 7+ → +2. */
export const nodeLevelOffset = (node: MapNode) => Math.max(-1, Math.min(2, Math.floor((node.level - 3) / 2)));

/** Expected wild level at this node for the trainer's current Tier (no dice). */
export function baseWildLevel(s: GameState, node: MapNode) {
  return Math.max(1, tierBandLevel(tierOf(s)) + nodeLevelOffset(node));
}

/** Wild level with a ±1 roll. */
export function wildLevel(s: GameState, node: MapNode) {
  return Math.max(1, baseWildLevel(s, node) + roll(3) - 2);
}

/** Extra rarity dice from Tier: +0 at Tier 1–2, +1 at Tier 3–4, +2 at Tier 5. */
export const tierRarityDice = (tier: number) => Math.floor((tier - 1) / 2);

/** Highest rarity a wild encounter can roll at this Tier: Apex is off the table until Tier 2. */
export const tierRarityCap = (tier: number): Rarity => (tier <= 1 ? 'prime' : 'apex');

const RARITY_RANK: Record<Rarity, number> = { common: 0, prime: 1, apex: 2, legendary: 3 };

/** Rarity for a roaming trainer's creature: mostly common early, prime/apex later. */
function trainerRarity(tier: number): Rarity {
  const r = Math.random();
  const apex = tier >= 4 ? 0.05 * (tier - 3) : 0;     // T4 5%, T5 10%
  const prime = 0.1 + 0.1 * tier;                      // T1 20% … T5 60%
  return r < apex ? 'apex' : r < apex + prime ? 'prime' : 'common';
}

/** Roll the rarity stars for an encounter at a node (Star Charm, Star Seeker and Tier add dice). */
function rollRarity(s: GameState, node: MapNode): { stars: { face: number; star: Star }[]; rarity: Rarity } {
  const tier = tierOf(s);
  const nDice = 2 + tierRarityDice(tier) + (ability(s) === 'starSeeker' ? 1 : 0) + (s.flags.starCharm ? 1 : 0);
  s.flags.starCharm = false;
  const stars = Array.from({ length: nDice }, () => starDie());
  const full = stars.filter((x) => x.star === 'full').length;
  const half = stars.filter((x) => x.star === 'half').length;
  const score = node.rarity + full + Math.floor(half / 2);
  const rolled: Rarity = score >= 3 ? 'apex' : score >= 2 ? 'prime' : 'common';
  const cap = tierRarityCap(tier);
  const capped = RARITY_RANK[rolled] > RARITY_RANK[cap] ? cap : rolled;
  // the Rainbow Plains: always at least one rarity higher (Common → Prime, Prime → Apex), even past the Tier cap
  return { stars, rarity: node.biome === 'prism' ? PRISM_BUMP[capped] : capped };
}
const PRISM_BUMP: Record<Rarity, Rarity> = { common: 'prime', prime: 'apex', apex: 'apex', legendary: 'legendary' };

// ── The Rainbow Plains ──────────────────────────────────────────
// Behind Lantern Glade. Every new day (odd turns) the Plains take on one type at random (never the
// same two days running): only that type turns up, the ground turns its color, finds are exotic
// (the Forest Floor's and Cloud Island's), and every creature is at least one rarity higher.
const mix = (a: number, b: number) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); return (h ^ (h >>> 12)) >>> 0; };
/** The Rainbow Plains' type on this turn's day (turns 1–2 are day 1, 3–4 day 2 …). */
export function prismType(s: GameState, turn = s.turn): ElementType {
  const seed = s.prismSeed ?? 0;
  const day = Math.ceil(Math.max(1, turn) / 2);
  let i = mix(seed, 0) % TYPES.length;
  for (let d = 2; d <= day; d++) i = (i + 1 + (mix(seed, d) % (TYPES.length - 1))) % TYPES.length;
  return TYPES[i];
}

function wildEncounter(s: GameState, node: MapNode, r: number): Outcome {
  const { stars, rarity } = rollRarity(s, node);
  const level = wildLevel(s, node);
  const prism = node.biome === 'prism';
  // the Rainbow Plains: only today's type (the weather doesn't bring others)
  const sp = pickSpecies(node, rarity, level, prism ? [] : weather(s).encounter, timeOfDay(s.turn), prism ? [prismType(s)] : undefined);
  const wild = createCreature(sp.id, level);
  if (!s.dex.seen.includes(sp.id)) s.dex.seen.push(sp.id);
  const battle = createBattle(playerSide(s), { kind: 'wild', name: `Wild ${sp.name}`, team: [wild], active: 0, mods: {} }, weather(s), { biome: node.biome, quickStep: ability(s) === 'quickStep' });
  return { t: 'encounter', roll: r, stars, rarity, battle };
}

/** Chance that an encounter is a stray: a dual type with only its first type native. Higher where just one local is about. */
export const STRAY_CHANCE = 0.1;
export const STRAY_CHANCE_THIN = 0.25;

/**
 * A wild species for this node. Nearly all are locals: every type they have is one of the area's. The
 * rest are strays. `boost` (the weather) makes types already native here twice as common and never
 * brings in others. With a `time` of day, only creatures out at that time are picked (diurnal by day,
 * nocturnal by night, crepuscular always): a type with nobody awake is skipped, and if nobody at all
 * is awake, the time is ignored. `types_` replaces the area's types.
 */
export function pickSpecies(node: MapNode, rarity: Rarity, level: number, boost: ElementType[] = [], time?: TimeOfDay, types_?: ElementType[]): Species {
  const types = types_ ?? BIOME_TYPES[node.biome];
  const stageCap = stageCapFor(level);
  // prefer the highest stage allowed, but keep some variety
  const choose = (list: Species[]) => weightedPick(list.map((x) => ({ v: x, w: x.stage === stageCap ? 3 : 1 })));
  const byType = (poolFor: (t: ElementType) => Species[]) => {
    const options = types.map((t) => ({ t, list: poolFor(t) })).filter((o) => o.list.length);
    return options.length ? choose(weightedPick(options.map((o) => ({ v: o.list, w: boost.includes(o.t) ? 2 : 1 })))) : null;
  };
  if (node.biome === 'prism') {
    const all = (t: ElementType) => speciesPool('prism', t, rarity, stageCap);
    return byType((t) => all(t).filter((x) => !time || isActive(x, time))) ?? byType(all)!;
  }
  const area = areaPool(node.biome, rarity, stageCap, time, types);
  const locals = new Set([...area.locals.values()].flat()).size;
  if (area.strays.length && (!locals || Math.random() < (locals === 1 ? STRAY_CHANCE_THIN : STRAY_CHANCE))) {
    return byType((t) => area.strays.filter((x) => x.types[0] === t))!;
  }
  return byType((t) => area.locals.get(t) ?? []) ?? pickSpecies(node, rarity, level, boost, undefined, types_);
}

// ── Shifting Depths: Explore the Depths ─────────────────────────
/** Initiative to Explore the Depths (plus one offering material). */
export const DEPTHS_COST = 1;

/** The types an offering material calls up from the Depths, with how strongly (its allure). */
export function depthsCalls(material: string): { type: ElementType; w: number }[] {
  const allure = itemInfo(material).allure ?? {};
  return (Object.entries(allure) as [ElementType, number][]).filter(([, w]) => w > 0).map(([type, w]) => ({ type, w })).sort((a, b) => b.w - a.w);
}

/** Why the trainer can't Explore the Depths with this material right now (null = they can). */
export function depthsBlock(s: GameState, material: string): string | null {
  if (TOWNS[s.location]?.special !== 'depths') return 'You need to be at Shifting Depths.';
  if (s.initiative < DEPTHS_COST) return `Exploring the Depths takes ${DEPTHS_COST} Initiative.`;
  if (!s.roster.some((c) => !c.ko)) return 'Your team needs rest before going down.';
  if (itemInfo(material).kind !== 'material' || !depthsCalls(material).length) return 'Offer a material that creatures crave.';
  if ((s.inventory[material] ?? 0) < 1) return `You don’t have any ${itemInfo(material).name}.`;
  return null;
}

/**
 * Explore the Depths: leave an offering material at the edge of the dark and a wild creature that
 * craves it answers. It's one of the material's types (stronger allure, likelier), with rarity rolled
 * as at the Sinkhole Stair (a rare area) and that node's level. It has already accepted the offering,
 * so the material's bonus counts toward recruiting it (s.flags.depthsOffering).
 */
export function exploreDepths(s: GameState, material: string): { stars: { face: number; star: Star }[]; rarity: Rarity; battle: Battle } | null {
  if (depthsBlock(s, material)) return null;
  s.initiative -= DEPTHS_COST;
  addItem(s, material, -1);
  const stair = NODE_BY_ID[DEPTHS_STAIR];
  const { stars, rarity } = rollRarity(s, stair);
  const level = wildLevel(s, stair);
  const sp = depthsSpecies(material, rarity, level);
  const wild = createCreature(sp.id, level);
  if (!s.dex.seen.includes(sp.id)) s.dex.seen.push(sp.id);
  s.flags.depthsOffering = { uid: wild.uid, item: material };
  s.stats.explored++;
  log(s, `Left ${itemInfo(material).name} at the edge of the Depths. A wild ${sp.name} climbed up to claim it.`);
  const battle = createBattle(playerSide(s), { kind: 'wild', name: `Wild ${sp.name}`, team: [wild], active: 0, mods: {} }, weather(s), { biome: 'canyon', quickStep: ability(s) === 'quickStep' });
  return { stars, rarity, battle };
}

/** A species that would accept this material: one of its types matches the material's allure. */
export function depthsSpecies(material: string, rarity: Rarity, level: number): Species {
  const calls = depthsCalls(material);
  const appeal = (sp: Species) => Math.max(0, ...sp.types.map((t) => calls.find((c) => c.type === t)?.w ?? 0));
  const cap = stageCapFor(level);
  const fits = (sp: Species) => sp.rarity !== 'legendary' && appeal(sp) > 0;
  let list = SPECIES.filter((sp) => fits(sp) && sp.rarity === rarity && sp.stage <= cap);
  if (!list.length) list = SPECIES.filter((sp) => fits(sp) && sp.stage <= cap);
  if (!list.length) list = SPECIES.filter(fits);
  return weightedPick(list.map((sp) => ({ v: sp, w: appeal(sp) * (sp.stage === cap ? 3 : 1) })));
}

/** Highest evolution stage that can appear at a wild level. */
export const stageCapFor = (level: number) => (level >= 10 ? 3 : level >= 6 ? 2 : 1);

interface AreaPool { locals: Map<ElementType, Species[]>; strays: Species[] }
const areaCache = new Map<string, AreaPool>();
/**
 * Who can turn up in a biome. Locals, by type (a dual type is under both): every type is native, from
 * those that list this biome, or for a type with nobody awake, from all who'd fit. Strays: dual types
 * listing this biome whose first type is native and second isn't.
 */
function areaPool(biome: Biome, rarity: Rarity, stageCap: number, time?: TimeOfDay, types: ElementType[] = BIOME_TYPES[biome]): AreaPool {
  const key = `${biome}|${rarity}|${stageCap}|${time ?? ''}|${types.join()}`;
  const hit = areaCache.get(key);
  if (hit) return hit;
  const out = SPECIES.filter((x) => x.rarity === rarity && x.stage <= stageCap && (!time || isActive(x, time)));
  const native = out.filter((x) => x.types.every((t) => types.includes(t)));
  const locals = new Map(types.map((t) => {
    const all = native.filter((x) => x.types.includes(t));
    const listed = all.filter((x) => x.biomes.includes(biome));
    return [t, listed.length ? listed : all] as const;
  }));
  const strays = out.filter((x) => types.includes(x.types[0]) && x.biomes.includes(biome) && !native.includes(x));
  const pool = { locals, strays };
  areaCache.set(key, pool);
  return pool;
}

/** The species of a given type (locals of it, and strays led by it) a biome can produce at a rarity and stage cap (shared by encounters and the Codex). */
export function speciesPool(biome: Biome, type: ElementType, rarity: Rarity, stageCap: number, time?: TimeOfDay): Species[] {
  // the Rainbow Plains: anyone led by the day's type
  if (biome === 'prism') return SPECIES.filter((x) => x.types[0] === type && x.rarity === rarity && x.stage <= stageCap);
  const area = areaPool(biome, rarity, stageCap, time);
  return [...(area.locals.get(type) ?? []), ...area.strays.filter((x) => x.types[0] === type)];
}

// ── Creature Codex helpers ──────────────────────────────────────
export interface Spot { node: MapNode; minStage: number }

/**
 * Map nodes where this species can turn up (ignoring weather): wild nodes whose biome
 * pool includes it, plus its legendary node. `minStage` is the wild stage cap needed
 * (2 = wild Lv 6+, 3 = wild Lv 10+).
 */
export function encounterSpots(speciesId: string): Spot[] {
  const sp = SPECIES_BY_ID[speciesId];
  const out: Spot[] = [];
  for (const node of MAP_NODES) {
    if (node.kind === 'legendary') { if (node.legendary === speciesId) out.push({ node, minStage: 1 }); continue; }
    if (node.kind !== 'wild' || sp.rarity === 'legendary') continue;
    if (!BIOME_TYPES[node.biome].includes(sp.types[0])) continue;
    if (node.biome === 'prism' && sp.rarity === 'common') continue; // the Rainbow Plains bump every Common up to Prime
    const cap = [1, 2, 3].find((c) => (['day', 'night'] as const).some((t) => speciesPool(node.biome, sp.types[0], sp.rarity, c, t).includes(sp)));
    if (cap) out.push({ node, minStage: cap });
  }
  return out;
}

const biomeCache = new Map<string, Biome[]>();
/** Biomes where this species or an earlier stage of it turns up (its wild nodes, or its Legendary node). For Codex filters. */
export function speciesBiomes(speciesId: string): Biome[] {
  let out = biomeCache.get(speciesId);
  if (!out) {
    out = [...new Set(evolutionLine(speciesId).flatMap((m) => encounterSpots(m.id).map((spot) => spot.node.biome)))];
    biomeCache.set(speciesId, out);
  }
  return out;
}

/** This species and its earlier stages, earliest first. */
export function evolutionLine(speciesId: string): Species[] {
  const line = [SPECIES_BY_ID[speciesId]];
  for (let prev = SPECIES.find((x) => x.evolvesTo === line[0].id); prev; prev = SPECIES.find((x) => x.evolvesTo === line[0].id)) line.unshift(prev);
  return line;
}

/** Offering materials that help recruit this species, best first. */
export function bestOfferings(speciesId: string): { id: string; bonus: number }[] {
  const types = SPECIES_BY_ID[speciesId].types;
  return Object.values(ITEMS).filter((it) => it.kind === 'material' && it.allure)
    .map((it) => ({ id: it.id, bonus: Math.max(0, ...types.map((t) => it.allure![t] ?? 0)) }))
    .filter((x) => x.bonus > 0)
    .sort((a, b) => b.bonus - a.bonus || a.id.localeCompare(b.id));
}

function trainerEncounter(s: GameState, node: MapNode, r: number): Outcome {
  const rival = Math.random() < rivalChance(s) ? pickRival(s) : null;
  if (rival) return { t: 'trainer', roll: r, name: rival.name, battle: npcBattle(s, rival), line: rival.lines.greet };
  const name = passerBy('road');
  const lvl = wildLevel(s, node);
  const tier = tierOf(s);
  const n = Math.min(s.roster.filter((c) => !c.ko).length, roll(tier >= 3 ? 3 : 2));
  const team = Array.from({ length: Math.max(1, n) }, () => createCreature(pickSpecies(node, trainerRarity(tier), lvl).id, lvl));
  const battle = createBattle(playerSide(s), { kind: 'trainer', name, team, active: 0, mods: {} }, weather(s), { biome: node.biome });
  return { t: 'trainer', roll: r, name, battle };
}

// ── City Trainer Halls ──────────────────────────────────────────
/** Why you can't battle in this city's Trainer Hall right now (null = you can). */
export function hallBlock(s: GameState): string | null {
  if (NODE_BY_ID[s.location]?.kind !== 'city') return 'Trainer Halls are in cities.';
  if (s.flags.sparred?.includes(s.location)) return 'You’ve already battled here this turn. Come back next turn.';
  if (!s.roster.some((c) => !c.ko)) return 'Your team needs rest first.';
  if (s.initiative < cityActionCost(s)) return 'Not enough Initiative.';
  return null;
}

/**
 * A battle against a local trainer in a city's Trainer Hall: once per city per turn, for a city
 * action's Initiative. City trainers are a touch above the wild band (+1 level), lean toward the
 * city's type, and bring 2 creatures (3 from Tier 3) or as many as you have healthy.
 */
export function hallBattle(s: GameState): { name: string; battle: Battle; line?: string } | null {
  if (hallBlock(s)) return null;
  s.initiative -= cityActionCost(s);
  (s.flags.sparred ??= []).push(s.location);
  const rival = Math.random() < rivalChance(s) ? pickRival(s) : null;
  if (rival) {
    log(s, `${rival.name} took up your challenge at the ${here(s).name} Trainer Hall.`);
    return { name: rival.name, battle: npcBattle(s, rival), line: rival.lines.greet };
  }
  const node = here(s);
  const tier = tierOf(s);
  const lvl = Math.max(1, tierBandLevel(tier) + 1);
  const size = Math.max(1, Math.min(s.roster.filter((c) => !c.ko).length, tier >= 3 ? 3 : 2));
  const cityType = CITIES[node.id]?.type;
  const team = Array.from({ length: size }, () => createCreature(pickSpecies(node, trainerRarity(tier), lvl, cityType ? [cityType] : [], undefined, cityType ? [...new Set([...BIOME_TYPES[node.biome], cityType])] : undefined).id, lvl));
  for (const c of team) autoSpend(c, false);
  const name = passerBy('hall');
  const battle = createBattle(playerSide(s), { kind: 'trainer', name, team, active: 0, mods: {} }, weather(s), { biome: node.biome });
  log(s, `Accepted a challenge from ${name} at the ${node.name} Trainer Hall.`);
  return { name, battle };
}

// ── Cloud Island (Salem) ────────────────────────────────────────
// The portal from Aurora Peak opens at night (even turns), or any time in Winter. On the island a
// trainer can walk the ring at any time, but can only leave through the portal.
// Six steps in a row around the ring, the same way round, is a full lap: Salem will battle that
// trainer from then on. Turning back starts the count again; leaving the island ends the lap.

/** Is the Cloud Island portal open this turn? */
export const portalOpen = (s: GameState) => timeOfDay(s.turn) === 'night' || seasonForTurn(s.turn) === 'winter';

export const CLOUD_LAP = CLOUD_RING.length;

export function cloudLapProgress(s: GameState) {
  return { steps: Math.min(CLOUD_LAP, s.flags.cloudLap ?? 0), need: CLOUD_LAP, worthy: !!s.flags.salemWorthy, onIsland: isCloudNode(s.location) };
}

/** Count a move around the ring toward a lap (called after every move). */
export function stepCloudLap(s: GameState, from: string, to: string) {
  const a = CLOUD_RING.indexOf(from), b = CLOUD_RING.indexOf(to);
  if (a < 0 || b < 0) { if (isCloudNode(to)) { s.flags.cloudLap = 0; s.flags.cloudDir = undefined; } return; }
  const dir: 1 | -1 = (b - a + CLOUD_LAP) % CLOUD_LAP === 1 ? 1 : -1;
  s.flags.cloudLap = s.flags.cloudDir === dir ? (s.flags.cloudLap ?? 0) + 1 : 1;
  s.flags.cloudDir = dir;
  if (s.flags.cloudLap >= CLOUD_LAP && !s.flags.salemWorthy) {
    s.flags.salemWorthy = true;
    log(s, 'Walked a full lap of Cloud Island. Salem will accept your challenge.');
  }
}

// ── Iron Coast Gauntlet ─────────────────────────────────────────
// Before Stella will battle, a trainer must beat a run of local trainers in a row without leaving
// Iron Coast: 2 per Tier (2, 4, 6, 8, 10), each a level above that Tier's Trainer Hall opponents, with
// the last one a level higher still. Matches can be spread over turns, with Stable rests between
// them, as long as the trainer stays in the city. Leaving resets the count (see moveTrainer).
// Once cleared, Stella can be challenged at any time, and the Gauntlet never needs repeating.
const GAUNTLET_TRAINERS = ['Deckhand Ines', 'Dockworker Bram', 'Smith Oriel', 'Lighthouse Keeper Tove', 'Diver Kaito', 'Riveter Juno', 'Harbor Guard Pell', 'Foundry Hand Mags', 'Net-Mender Sol', 'Sea Captain Ardo'];

/** How many trainers the Gauntlet takes at a Tier: 2, 4, 6, 8, 10. */
export const gauntletSize = (tier: number) => 2 * tier;

/** Gauntlet level at a Tier: one above Trainer Hall opponents (the final trainer one more). */
export const gauntletLevel = (tier: number, final: boolean) => Math.max(1, tierBandLevel(tier) + 2 + (final ? 1 : 0));

export function gauntletProgress(s: GameState) {
  const need = gauntletSize(tierOf(s));
  const wins = Math.min(need, s.flags.gauntletWins ?? 0);
  return { wins, need, open: !!s.flags.stellaOpen, nextLevel: gauntletLevel(tierOf(s), wins + 1 >= need) };
}

/** Why the trainer can't take the next Gauntlet match right now (null = they can). */
export function gauntletBlock(s: GameState): string | null {
  if (s.location !== GAUNTLET_CITY) return 'The Gauntlet is at Iron Coast.';
  if (s.flags.stellaOpen) return 'You’ve cleared the Gauntlet. Stella will see you any time.';
  if (s.merits.includes(GAUNTLET_CITY)) return 'You already hold Stella’s accolade.';
  if (!s.roster.some((c) => !c.ko)) return 'Your team needs rest first. The Stable is right here.';
  if (s.initiative < cityActionCost(s)) return 'Not enough Initiative.';
  return null;
}

/** The next Gauntlet match: a Steel-leaning local trainer, for a city action's Initiative. */
export function gauntletBattle(s: GameState): { name: string; battle: Battle; match: number; of: number } | null {
  if (gauntletBlock(s)) return null;
  s.initiative -= cityActionCost(s);
  const node = here(s);
  const tier = tierOf(s);
  const { wins, need } = gauntletProgress(s);
  const lvl = gauntletLevel(tier, wins + 1 >= need);
  const size = Math.max(1, Math.min(s.roster.filter((c) => !c.ko).length, tier >= 3 ? 3 : 2));
  const team = Array.from({ length: size }, () => createCreature(pickSpecies(node, trainerRarity(tier), lvl, ['steel']).id, lvl));
  for (const c of team) autoSpend(c, false);
  const name = GAUNTLET_TRAINERS[wins % GAUNTLET_TRAINERS.length];
  const battle = createBattle(playerSide(s), { kind: 'trainer', name, team, active: 0, mods: {} }, weather(s), { biome: node.biome });
  return { name, battle, match: wins + 1, of: need };
}

/** A Gauntlet match was won: count it, and open Stella's arena once enough are beaten. */
export function gauntletWin(s: GameState): { wins: number; need: number; cleared: boolean } {
  const need = gauntletSize(tierOf(s));
  const wins = (s.flags.gauntletWins ?? 0) + 1;
  if (wins >= need) {
    s.flags.stellaOpen = true;
    s.flags.gauntletWins = 0;
    log(s, `Cleared the Iron Coast Gauntlet (${need} trainers). Stella will accept your challenge.`);
    return { wins: need, need, cleared: true };
  }
  s.flags.gauntletWins = wins;
  return { wins, need, cleared: false };
}

// ── Hotseat weather ─────────────────────────────────────────────
/**
 * Roll a turn's weather once for the whole hotseat table (when the first trainer starts that turn),
 * record it on the match and apply it to every trainer on that turn. Returns the roll.
 */
export function rollRoundWeather(m: Match, turn: number): number {
  const r = roll(6);
  m.rolls[turn] = r;
  const w = SEASON_INFO[seasonForTurn(turn)].dice[r - 1];
  for (const p of m.players) if (p.turn === turn) p.weather = w;
  return r;
}

// ── Legendaries: one of each per game ───────────────────────────
/**
 * Each Legendary exists once per game. It waits at its node until it is beaten (recruited or driven
 * off), and it can't appear while any trainer holds it. Releasing it at a Research Facility puts it
 * back on its node for someone else to try.
 */
export function legendaryHere(s: GameState, node: MapNode): boolean {
  if (node.kind !== 'legendary' || !node.legendary) return false;
  // in hotseat, every trainer shares the board: anyone beating or holding it takes it off the map
  const trainers = allTrainers(s);
  if (trainers.some((t) => t.flags.beaten.includes(node.id))) return false;
  return !trainers.some((t) => [...t.roster, ...t.reserve, ...(t.training ?? []).map((x) => x.creature)].some((c) => c.species === node.legendary));
}

/** This trainer plus everyone else in the hotseat match (just this trainer in a solo journey). */
export function allTrainers(s: GameState): GameState[] {
  const m = activeMatchOf();
  return m && m.players.includes(s) ? m.players : [s];
}

// ── Research Facility (Quillhaven) ──────────────────────────────
/** Coins per level for a released creature, by rarity. */
export const RESEARCH_RATE: Record<Rarity, number> = { common: 2, prime: 3, apex: 4, legendary: 5 };
export const researchPayout = (c: CreatureInst) => c.level * RESEARCH_RATE[speciesOf(c).rarity];

/** Why this creature can't be released right now (null = it can). */
export function releaseBlock(s: GameState, uid: string): string | null {
  const all = [...s.roster, ...s.reserve];
  if (!all.some((c) => c.uid === uid)) return 'Not one of your creatures.';
  if (all.find((c) => c.uid === uid)!.bond) return 'Your starter shares a special bond with you. It stays by your side.';
  if (all.length <= 1) return 'You can’t give up your last creature.';
  if (s.roster.length === 1 && s.roster[0].uid === uid) return 'Your only active creature. Swap another in from a totem first.';
  return null;
}

/**
 * Release a recruited creature to the Research Facility for coins (level × 2/3/4/5 by rarity).
 * A Legendary returns to its node on the board.
 */
export function releaseToResearch(s: GameState, uid: string): { coins: number; text: string } | null {
  if (releaseBlock(s, uid)) return null;
  const list = s.roster.some((c) => c.uid === uid) ? s.roster : s.reserve;
  const c = list.find((x) => x.uid === uid)!;
  list.splice(list.indexOf(c), 1);
  if (s.following === uid) s.following = s.roster[0]?.uid ?? null;
  const coins = earnCoins(s, researchPayout(c));
  let text = `${nameOf(c)} is in the researchers’ care now. You receive 💰 ${coins}.`;
  const home = returnLegendary(s, c);
  if (home) text += ` The researchers return it to ${home}, where it waits for its next challenger.`;
  log(s, `Released ${nameOf(c)} (Lv ${c.level}) to the Research Facility for ${coins} coins.`);
  return { coins, text };
}

// ── Battle School (Valor Ridge) ─────────────────────────────────
// Pay coins and leave a creature: it earns XP equal to the coins, at 2 XP a turn (so the course
// takes half as many turns as the XP). Pick it up any time for the XP earned so far.
export const SCHOOL_XP_PER_TURN = 2;
export const trainingTurns = (coins: number) => Math.ceil(coins / SCHOOL_XP_PER_TURN);

/** Why a creature can't be enrolled (null = it can). */
export function enrollBlock(s: GameState, uid: string, coins: number): string | null {
  if (TOWNS[s.location]?.special !== 'school') return 'You need to be at a Battle School.';
  const all = [...s.roster, ...s.reserve];
  if (!all.some((c) => c.uid === uid)) return 'Not one of your creatures.';
  if (all.length <= 1) return 'You can’t send away your only creature.';
  if (!Number.isInteger(coins) || coins < SCHOOL_XP_PER_TURN) return `Training costs at least 💰 ${SCHOOL_XP_PER_TURN}.`;
  if (coins > s.coins) return 'Not enough coins.';
  return null;
}

/** Take a creature off the team to leave it at the school (a totem steps in if the team empties). */
function leaveAtSchool(s: GameState, uid: string): CreatureInst {
  const list = s.roster.some((c) => c.uid === uid) ? s.roster : s.reserve;
  const c = list.splice(list.findIndex((x) => x.uid === uid), 1)[0];
  if (!s.roster.length && s.reserve.length) s.roster.push(s.reserve.shift()!);
  if (s.following === uid) s.following = s.roster[0]?.uid ?? null;
  return c;
}

/** Leave a creature at the Battle School for `coins` coins (XP = coins, turns = coins / 2). */
export function enrollTraining(s: GameState, uid: string, coins: number): Training | null {
  if (enrollBlock(s, uid, coins)) return null;
  const c = leaveAtSchool(s, uid);
  s.coins -= coins;
  const t: Training = { creature: c, school: s.location, xp: coins, turns: trainingTurns(coins), started: s.turn };
  (s.training ??= []).push(t);
  log(s, `Left ${nameOf(c)} at ${NODE_BY_ID[s.location].name}'s Battle School: ${coins} XP over ${t.turns} turns.`);
  return t;
}

/** How far along a course is: turns elapsed, XP earned so far, and whether it's finished. */
export function trainingProgress(s: GameState, t: Training) {
  const elapsed = Math.max(0, Math.min(t.turns, s.turn - t.started));
  return { elapsed, xp: Math.min(t.xp, elapsed * SCHOOL_XP_PER_TURN), done: elapsed >= t.turns };
}

// ── Retraining (Battle School) ──────────────────────────────────
// Pick a new Nature, Ability and/or Instinct for a creature. Each change costs coins and 1 Loyalty
// (the drills are harsh), and the creature stays at the school until the next morning.
export const RETRAIN_COST = { nature: 6, ability: 8, instinct: 10 } as const;
export type RetrainPart = keyof typeof RETRAIN_COST;
export const RETRAIN_PARTS: RetrainPart[] = ['nature', 'ability', 'instinct'];
/** Loyalty each change costs, taken when the creature is picked up. */
export const RETRAIN_LOYALTY = 1;
/** The parts a course actually changes. */
export const retrainParts = (r: Retrain): RetrainPart[] => RETRAIN_PARTS.filter((k) => r[k]);
export const retrainCost = (r: Retrain) => retrainParts(r).reduce((a, k) => a + RETRAIN_COST[k], 0);
/** The next morning: the next day turn after `turn` (odd turns are day). */
export const nextMorning = (turn: number) => (turn % 2 === 1 ? turn + 2 : turn + 1);
const currentOf = (c: CreatureInst, k: RetrainPart) => (k === 'nature' ? c.nature : k === 'ability' ? abilityOf(c) : instinctIdOf(c));

/** Why this retraining can't be booked (null = it can). */
export function retrainBlock(s: GameState, uid: string, r: Retrain): string | null {
  if (TOWNS[s.location]?.special !== 'school') return 'You need to be at a Battle School.';
  const all = [...s.roster, ...s.reserve];
  const c = all.find((x) => x.uid === uid);
  if (!c) return 'Not one of your creatures.';
  if (all.length <= 1) return 'You can’t send away your only creature.';
  const parts = retrainParts(r);
  if (!parts.length) return 'Choose something to change.';
  if (r.nature && !NATURE_BY_ID[r.nature]) return 'Unknown Nature.';
  if (r.ability && !ABILITIES[r.ability]) return 'Unknown Ability.';
  if (r.instinct && !INSTINCT_BY_ID[r.instinct]) return 'Unknown Instinct.';
  const same = parts.find((k) => currentOf(c, k) === r[k]);
  if (same) return `It already has that ${same === 'nature' ? 'Nature' : same === 'ability' ? 'Ability' : 'Instinct'}.`;
  if (retrainCost(r) > s.coins) return 'Not enough coins.';
  return null;
}

/** Leave a creature at the Battle School to be retrained. It's ready the next morning. */
export function enrollRetraining(s: GameState, uid: string, r: Retrain): Training | null {
  if (retrainBlock(s, uid, r)) return null;
  const cost = retrainCost(r);
  const c = leaveAtSchool(s, uid);
  s.coins -= cost;
  const retrain: Retrain = Object.fromEntries(retrainParts(r).map((k) => [k, r[k]]));
  const t: Training = { creature: c, school: s.location, xp: 0, turns: nextMorning(s.turn) - s.turn, started: s.turn, retrain };
  (s.training ??= []).push(t);
  log(s, `Left ${nameOf(c)} at ${NODE_BY_ID[s.location].name}'s Battle School for retraining (${retrainSummary(c, retrain)}), 💰 ${cost}.`);
  return t;
}

/** "Nature: Brave → Calm, Instinct: Menace → Hold Fast". */
export function retrainSummary(c: CreatureInst, r: Retrain): string {
  const name = (k: RetrainPart, id: string) => (k === 'nature' ? NATURE_BY_ID[id]?.name : k === 'ability' ? ABILITIES[id]?.name : INSTINCT_BY_ID[id]?.name) ?? id;
  const label = { nature: 'Nature', ability: 'Ability', instinct: 'Instinct' };
  return retrainParts(r).map((k) => `${label[k]}: ${name(k, currentOf(c, k))} → ${name(k, r[k]!)}`).join(', ');
}

/** Apply a course's changes: a new Nature keeps the number of perks unlocked; an Ability or Instinct matching the species' is stored as unset. */
export function applyRetrain(c: CreatureInst, r: Retrain) {
  if (r.nature) { c.nature = r.nature; c.perks = Math.min(c.perks, NATURE_BY_ID[r.nature].perks.length); }
  if (r.ability) c.ability = r.ability === speciesOf(c).ability ? undefined : r.ability;
  if (r.instinct) c.instinct = r.instinct === speciesOf(c).instinct ? undefined : r.instinct;
  if (c.ability === undefined) delete c.ability;
  if (c.instinct === undefined) delete c.instinct;
}

export type TrainingMood = 'great' | 'fine' | 'rough';
export interface PickupResult { name: string; xp: number; levels: number; mood: TrainingMood; morale: number; loyalty: number; roll: number; legendLeft?: string; text: string; /** Set for a retraining course: what changed. */ retrained?: string }

/**
 * Collect a creature from the Battle School (you must be there). It gets the XP earned so far (its
 * chart points are then yours to spend), and a d6 decides how it felt about the stay:
 * 1–2 rough (−2 Morale, −1 Loyalty), 3–4 fine (no change), 5–6 great (+2 Morale, +1 Loyalty).
 * A Legendary keeps losing Loyalty while away, so it may have left for its grounds.
 */
export function pickUpTraining(s: GameState, uid: string): PickupResult | null {
  const i = (s.training ?? []).findIndex((t) => t.creature.uid === uid);
  if (i < 0 || s.training![i].school !== s.location) return null;
  const t = s.training![i];
  const c = t.creature;
  const { elapsed, xp, done } = trainingProgress(s, t);
  if (t.retrain) return done ? pickUpRetraining(s, i) : null; // not ready until the morning
  s.training!.splice(i, 1);
  const levels = xp > 0 ? gainXp(c, xp) : 0;
  const r = roll(6);
  const mood: TrainingMood = r <= 2 ? 'rough' : r >= 5 ? 'great' : 'fine';
  const dm = mood === 'great' ? 2 : mood === 'rough' ? -2 : 0, dl = mood === 'great' ? 1 : mood === 'rough' ? -1 : 0;
  c.morale = Math.max(0, Math.min(10, c.morale + dm));
  addLoyalty(c, dl);
  const moodText = mood === 'great' ? 'loved its time there' : mood === 'rough' ? 'had a rough time' : 'got through it fine';
  let text = `${nameOf(c)} earned ${xp} XP${levels ? ` (+${levels} level${levels === 1 ? '' : 's'}: chart points to spend)` : ''} and ${moodText}${dm ? ` (Morale ${dm > 0 ? '+' : ''}${dm}, Loyalty ${dl > 0 ? '+' : ''}${dl})` : ''}.`;
  let legendLeft: string | undefined;
  if (speciesOf(c).rarity === 'legendary') {
    addLoyalty(c, -elapsed * LEGENDARY_LOYALTY_DRAIN); // the drain doesn't pause for school
    if (c.loyalty <= 0) {
      legendLeft = returnLegendary(s, c) ?? 'the wilds';
      text += ` Its Loyalty ran out while it was away: it has returned to ${legendLeft}.`;
    }
  }
  if (!legendLeft) { if (s.roster.length < 3) s.roster.push(c); else s.reserve.push(c); }
  if (!s.following) s.following = s.roster[0]?.uid ?? null;
  log(s, `Picked up ${nameOf(c)} from the Battle School: +${xp} XP, ${mood} stay.`);
  return { name: nameOf(c), xp, levels, mood, morale: dm, loyalty: dl, roll: r, legendLeft, text };
}

/** Collect a retrained creature: apply its changes and take the Loyalty hit. */
function pickUpRetraining(s: GameState, i: number): PickupResult {
  const t = s.training![i];
  const c = t.creature;
  const { elapsed } = trainingProgress(s, t);
  s.training!.splice(i, 1);
  const r = t.retrain!;
  const what = retrainSummary(c, r);
  applyRetrain(c, r);
  const dl = -RETRAIN_LOYALTY * retrainParts(r).length;
  addLoyalty(c, dl);
  let text = `${nameOf(c)} is back from retraining (${what}). The drills were harsh: Loyalty ${dl}.`;
  let legendLeft: string | undefined;
  if (speciesOf(c).rarity === 'legendary') {
    addLoyalty(c, -elapsed * LEGENDARY_LOYALTY_DRAIN);
    if (c.loyalty <= 0) {
      legendLeft = returnLegendary(s, c) ?? 'the wilds';
      text += ` Its Loyalty ran out: it has returned to ${legendLeft}.`;
    }
  }
  if (!legendLeft) { if (s.roster.length < 3) s.roster.push(c); else s.reserve.push(c); }
  if (!s.following) s.following = s.roster[0]?.uid ?? null;
  log(s, `Picked up ${nameOf(c)} from retraining: ${what}. Loyalty ${dl}.`);
  return { name: nameOf(c), xp: 0, levels: 0, mood: 'fine', morale: 0, loyalty: dl, roll: 0, legendLeft, text, retrained: what };
}

function legendaryBattle(s: GameState, node: MapNode): Battle {
  const c = createCreature(node.legendary!, node.level + Math.floor(s.turn / 25));
  if (!s.dex.seen.includes(c.species)) s.dex.seen.push(c.species);
  return createBattle(playerSide(s), { kind: 'wild', name: `Legendary ${speciesOf(c).name}`, team: [c], active: 0, mods: {} }, weather(s), { legendary: true, biome: node.biome });
}

/** True when nobody healthy is Following and there's more than one creature that could lead, so the trainer picks. */
export function needsLeadChoice(s: GameState): boolean {
  const followerUp = s.roster.some((c) => c.uid === s.following && !c.ko);
  return !followerUp && s.roster.filter((c) => !c.ko).length > 1;
}

export function playerSide(s: GameState): Side {
  const team = s.roster;
  let active = team.findIndex((c) => c.uid === s.following && !c.ko);
  if (active < 0) active = team.findIndex((c) => !c.ko);
  return { kind: 'player', name: s.trainer.name, team, active: Math.max(0, active), mods: {}, buff: s.hotpot?.buff, xpBonus: s.trainer.style === 'drill' ? 2 : s.trainer.style === 'caretaker' ? -1 : 0 };
}

// ── After battle ────────────────────────────────────────────────
export interface BattleSummary { coins: number; wiped: boolean; text: string[] }

/** Quick Step refunds this much Initiative after escaping a wild battle (never above a full turn's 5). */
export const QUICK_STEP_REFUND = 1;
const QUICK_STEP_MAX = 5;

/** Trainer ID: fold a finished battle into the trainer's running stats. */
function recordBattle(s: GameState, b: Battle, kind: BattleKind) {
  const st = s.stats;
  const rec = ((st.record ??= {})[kind] ??= { won: 0, lost: 0, ran: 0 });
  if (b.over === 'win') rec.won++;
  else if (b.over === 'lose') rec.lost++;
  else if (b.over === 'escaped' || b.over === 'fled') rec.ran++;
  if (kind === 'wild' || kind === 'legendary') st.encountered = (st.encountered ?? 0) + 1;
  st.foesKO = (st.foesKO ?? 0) + (b.foeKOs ?? 0);
  const mt = (st.moveTypes ??= {});
  for (const [t, n] of Object.entries(b.moveTypes ?? {})) mt[t] = (mt[t] ?? 0) + n;
}

export function finishBattle(s: GameState, b: Battle, ctx: { kind: 'wild' | 'trainer' | 'arbiter' | 'legendary' | 'endgame' | 'rival'; city?: string; nodeId?: string; gauntlet?: boolean; wipeTo?: string; /** The creature (uid) a Rival or Champion who won helps up, instead of a wipe. */ mercy?: string }): BattleSummary {
  const out: BattleSummary = { coins: 0, wiped: false, text: [] };
  s.hotpot = undefined;
  for (const id of b.seenFoes ?? []) if (!s.dex.seen.includes(id)) s.dex.seen.push(id);
  recordBattle(s, b, ctx.kind);
  if (b.over === 'win') {
    s.stats.battlesWon++;
    if (ctx.kind === 'trainer') {
      out.coins = roll(6) + Math.floor(b.sides[1].team[0].level / 2);
      if (s.trainer.style === 'whisperer') out.coins = Math.max(1, Math.floor(out.coins / 2));
      out.text.push(`${b.sides[1].name} hands over ${out.coins} coins.`);
    }
    if (ctx.kind === 'wild') { out.coins = 1 + Math.floor(b.sides[1].team[0].level / 3); out.text.push(`You found ${out.coins} coins in the grass.`); }
    if (ctx.gauntlet) {
      const g = gauntletWin(s);
      out.text.push(g.cleared ? `Gauntlet cleared! Stella will accept your challenge, now or any time you return.` : `Gauntlet: ${g.wins}/${g.need} trainers beaten. Stay in Iron Coast to keep your progress.`);
    }
    if (ctx.kind === 'arbiter' && ctx.city) {
      const city = CITIES[ctx.city];
      if (!s.merits.includes(ctx.city)) s.merits.push(ctx.city);
      out.coins = 10 * tierOf(s);
      out.text.push(`${city.arbiter} awards you the ${city.accolade}!`);
      log(s, `Earned the ${city.accolade} from ${city.arbiter}.`);
    }
    if (ctx.kind === 'legendary' && ctx.nodeId) s.flags.beaten.push(ctx.nodeId);
    const base = out.coins;
    out.coins = earnCoins(s, base);
    if (out.coins > base) out.text.push(`Merchant’s cut: +${out.coins - base} coins.`);
  } else if (b.over === 'lose' && ctx.kind === 'trainer') {
    const lost = Math.min(s.coins, roll(6));
    s.coins -= lost;
    out.text.push(`You hand ${lost} coins to ${b.sides[1].name}.`);
  } else if (b.over === 'escaped' && b.quickStep && s.initiative < QUICK_STEP_MAX) {
    // Quick Step: a clean getaway also wins back a little time
    s.initiative = Math.min(QUICK_STEP_MAX, s.initiative + QUICK_STEP_REFUND);
    out.text.push(`Quick Step: a clean getaway. +${QUICK_STEP_REFUND} Initiative back.`);
  }
  const helped = ctx.mercy && mercyOffer(s, b) ? s.roster.find((c) => c.uid === ctx.mercy) : undefined;
  out.text.push(...settleNpc(s, b, out.coins, ctx.kind !== 'endgame'));
  // morale for participants
  for (const uid of b.participants) {
    const c = s.roster.find((x) => x.uid === uid);
    if (c && b.over === 'win') c.morale = Math.min(10, c.morale + 1);
  }
  if (helped) {
    revive(helped);
    s.following = helped.uid;
    out.text.push(`${b.sides[1].name} helps ${nameOf(helped)} back up. You can carry on from here.`);
    log(s, `${b.sides[1].name} helped ${nameOf(helped)} back on its feet.`);
  }
  if (s.roster.every((c) => c.ko) && ctx.kind !== 'rival') { // hotseat duels settle their own losses (interactions.ts)
    out.wiped = true;
    const dest = wipe(s, ctx.wipeTo);
    out.text.push(`Your team was wiped out. You rush back to ${CITIES[dest].name}…`);
  }
  // out of combat: the current heart refills (lost hearts need rest)
  for (const c of s.roster) if (!c.ko) { c.health = maxHealth(c); c.stamina = maxStamina(c); }
  return out;
}
/** Cities this trainer has rested at this game: the home city first, then the rest in the order first rested. */
export function restedCities(s: GameState): string[] {
  const out = [s.trainer.home];
  for (const id of s.rested ?? []) if (CITIES[id] && !out.includes(id)) out.push(id);
  return out;
}
/** Where a wiped-out team can be sent: home, or for a Wanderer (who makes their home anywhere) any city they've rested at. */
export const wipeOptions = (s: GameState) => (s.trainer.style === 'balanced' ? restedCities(s) : [s.trainer.home]);
/** Where a trainer goes when there's no one to ask (a hotseat duel): home, or for a Wanderer the city they rested at last. */
export function wipeDefault(s: GameState): string {
  if (s.trainer.style !== 'balanced') return s.trainer.home;
  const last = [...(s.rested ?? [])].reverse().find((id) => CITIES[id]);
  return last ?? s.trainer.home;
}

/** Send a wiped-out team to `to` (when it's one of wipeOptions; home otherwise). Returns the city. */
function wipe(s: GameState, to?: string): string {
  const dest = to && wipeOptions(s).includes(to) ? to : s.trainer.home;
  moveTrainer(s, dest, { wiped: true });
  for (const c of s.roster) { fullRestore(c); c.morale = Math.max(0, c.morale - 1); }
  s.coins = Math.floor(s.coins / 2);
  s.initiative = 0;
  log(s, dest === s.trainer.home ? 'Team wiped. Returned home and lost half your coins.' : `Team wiped. Returned to ${CITIES[dest].name} and lost half your coins.`);
  return dest;
}

// ── Recruitment ─────────────────────────────────────────────────
export function totemBonus(totem: string, c: CreatureInst): number {
  const sp = speciesOf(c);
  if (totem === 'totem') return 1;
  if (totem.startsWith('totem:')) return sp.types.includes(totem.slice(6) as ElementType) ? 3 : -1;
  if (totem.startsWith('effigy:')) return totem.slice(7) === sp.id ? 5 : -3;
  return 0;
}
export function offeringBonus(ids: string[], c: CreatureInst): number {
  const sp = speciesOf(c);
  let total = 0;
  for (const id of ids) {
    const it = ITEMS[id];
    if (!it) continue;
    if (it.kind === 'treat') total += id === 'moonberry' || id === 'duskberry' ? 2 : 1;
    else if (it.allure) total += Math.max(0, ...sp.types.map((t) => it.allure![t] ?? 0));
  }
  return total;
}
export function recruitTarget(c: CreatureInst) { return speciesOf(c).rt + Math.floor(c.level / 3); }

/** The offering this wild creature already accepted (Explore the Depths), counted toward recruiting it. */
export function acceptedOffering(s: GameState, wild: CreatureInst): string | null {
  const o = s.flags.depthsOffering;
  return o && o.uid === wild.uid ? o.item : null;
}

export function attemptRecruit(s: GameState, wild: CreatureInst, totem: string, offerings: string[]) {
  const dice = [roll(6), roll(6)];
  const accepted = acceptedOffering(s, wild);
  s.flags.depthsOffering = undefined;
  const mods = totemBonus(totem, wild) + offeringBonus(offerings, wild) + (accepted ? offeringBonus([accepted], wild) : 0) + (ability(s) === 'luckyCharm' ? 1 : 0) + styleRecruitMod(s);
  const total = dice[0] + dice[1] + mods;
  const need = recruitTarget(wild);
  addItem(s, totem, -1);
  for (const o of offerings) addItem(s, o, -1);
  const success = total >= need;
  if (success) {
    fullRestore(wild);
    wild.morale = 6;
    // Legendaries arrive with full Loyalty, then burn through it (see moraleAndLoyalty)
    if (speciesOf(wild).rarity === 'legendary') addLoyalty(wild, LEGENDARY_START_LOYALTY);
    if (s.roster.length < 3) s.roster.push(wild); else s.reserve.push(wild);
    if (!s.dex.caught.includes(wild.species)) s.dex.caught.push(wild.species);
    s.stats.recruited++;
    log(s, `${nameOf(wild)} accepted your offering and joined you!`);
  }
  return { dice, mods, total, need, success };
}

// ── Cities ──────────────────────────────────────────────────────
export function spendCityAction(s: GameState): boolean {
  const c = cityActionCost(s);
  if (s.initiative < c) return false;
  s.initiative -= c;
  return true;
}

/** A city facility that's free to browse and costs a city action on the first purchase each turn. */
export type Facility = 'market' | 'shrine' | 'workbench';
const facilityKey = (s: GameState, f: Facility) => `${f}:${s.location}`;
/** Whether this city's market or shrine is already paid for this turn (then buying more is free). */
export const facilityPaid = (s: GameState, f: Facility) => !!s.flags.paid?.includes(facilityKey(s, f));
/**
 * Pay for using a facility: 'already' if it's paid for this turn, 'paid' if this spent the city action now,
 * or false if there isn't enough Initiative. Towns' markets are free and don't call this.
 */
export function payFacility(s: GameState, f: Facility): 'paid' | 'already' | false {
  if (facilityPaid(s, f)) return 'already';
  if (!spendCityAction(s)) return false;
  (s.flags.paid ??= []).push(facilityKey(s, f));
  return 'paid';
}
/** Undo a payFacility that just paid, when the purchase itself then failed. */
export function refundFacility(s: GameState, f: Facility) {
  if (!facilityPaid(s, f)) return;
  s.flags.paid = s.flags.paid!.filter((k) => k !== facilityKey(s, f));
  s.initiative += cityActionCost(s);
}

/**
 * Rest at a stable: full recovery (KOs, Health, Stamina, Fatigue) and +1 Morale for the active team.
 * City stables also serve their Chanko Nabe, a battle buff (doubled at your home city). Town stables don't.
 */
export function rest(s: GameState, nodeId: string) {
  for (const c of [...s.roster, ...s.reserve]) fullRestore(c);
  for (const c of s.roster) c.morale = Math.min(10, c.morale + (s.trainer.style === 'caretaker' ? 2 : 1));
  const ci = CITIES[nodeId];
  if (!ci) return { advanced: false, buff: {} as Record<string, number> };
  // remember where we've rested (most recent last): a Wanderer can be sent back to any of these after a wipe
  s.rested = [...(s.rested ?? [s.trainer.home]).filter((id) => id !== nodeId), nodeId];
  const advanced = s.trainer.home === nodeId || s.trainer.style === 'balanced'; // Wanderers are at home anywhere
  const buff = Object.fromEntries(Object.entries(ci.hotpot.buff).map(([k, v]) => [k, v! * (advanced ? 2 : 1)]));
  s.hotpot = { city: nodeId, buff };
  return { advanced, buff };
}

export function priceOf(s: GameState, id: string) {
  const p = itemInfo(id).price;
  // Baby Eyes and the Merchant style each take 25% off, and stack
  const off = (ability(s) === 'babyEyes' ? 1 : 0) + (s.trainer.style === 'haggler' ? 1 : 0);
  return off ? Math.max(1, Math.ceil(p * Math.pow(0.75, off))) : p;
}
export function buy(s: GameState, id: string): boolean {
  const p = priceOf(s, id);
  const it = itemInfo(id);
  if (s.coins < p) return false;
  if (isUnique(it) && hasItem(s, id)) return false;
  s.coins -= p;
  addItem(s, id, 1);
  if (id === 'fog-lantern' && !s.flags.wisp) rollWisp(s); // a brand new lantern: go and find a wisp first
  return true;
}
/** Key items a town sells in this game: its own (Fog Lantern, Summit Pick, Ferry Pass) plus any roaming one rolled here. */
export function townKeyItems(s: GameState, townId: string): string[] {
  return [...(TOWNS[townId]?.key ? [TOWNS[townId].key!] : []), ...ROAMING_KEY_ITEMS.filter((id) => keyTownOf(s, id) === townId)];
}
/** "Lumber Hollow": where this game's copy of a roaming key item is sold. */
export const keyTownName = (s: GameState, item: string) => NODE_BY_ID[keyTownOf(s, item)]?.name ?? 'a town';

export function marketStock(nodeId: string): string[] {
  const n = NODE_BY_ID[nodeId];
  if (n.kind === 'city') return ['salve', 'elixir', 'rousing-salts', 'calm-tea', 'totem', 'sunberry', 'dewberry', 'lure-incense', 'hush-smoke', 'star-charm', 'taxi-ticket', 'trail-mix', ...(CITIES[nodeId]?.arenaNode ? ['ferry-pass'] : [])];
  return TOWNS[nodeId]?.sells ?? [];
}

// ── Odd jobs (every city and town) ──────────────────────────────
/** Coins die rolled for each Initiative spent on odd jobs. */
export const WORK_DIE = 4;
/** Why odd jobs aren't available here and now, or null if they are. */
export function workBlock(s: GameState): string | null {
  if ((here(s).kind !== 'city' && !isTown(s.location)) || isCloudNode(s.location)) return 'Odd jobs are only found in cities and towns.';
  if (s.initiative < 1) return 'Odd jobs need Initiative: each point left rolls a d4 for coins.';
  return null;
}
/**
 * Take odd jobs: spend all remaining Initiative, rolling a d4 of coins for each point (through
 * earnCoins, so a Haggler's bonus applies to the total). Like camping, it uses up the rest of the turn.
 */
export function doWork(s: GameState): { rolls: number[]; coins: number } | null {
  if (workBlock(s)) return null;
  const rolls = Array.from({ length: s.initiative }, () => roll(WORK_DIE));
  s.initiative = 0;
  const coins = earnCoins(s, rolls.reduce((a, b) => a + b, 0));
  s.stats.worked = (s.stats.worked ?? 0) + rolls.length;
  log(s, `Took odd jobs in ${here(s).name} and earned ${coins} coins.`);
  return { rolls, coins };
}

// ── Workbench crafting (every city and town) ────────────────────
/** Can this material fill a recipe slot of this type? Any allure for the type counts. */
export const fitsSlot = (material: string, type: ElementType) => (itemInfo(material).allure?.[type] ?? 0) > 0;
/** Workbenches stand in every city and town (not on Cloud Island). */
export const canCraftHere = (s: GameState) => (here(s).kind === 'city' || isTown(s.location)) && !isCloudNode(s.location);
/** Owned materials that could fill this slot. */
export const slotOptions = (s: GameState, type: ElementType) =>
  Object.keys(s.inventory).filter((id) => s.inventory[id] > 0 && itemInfo(id).kind === 'material' && fitsSlot(id, type));

/** How precious a material is: its total allure (universal and exotic ones are worth more). */
const materialWorth = (id: string) => Object.values(itemInfo(id).allure ?? {}).reduce((a, b) => a + (b ?? 0), 0);

/** Do these materials fill this recipe's slots, in order, out of what's in the bag? */
export function validIngredients(s: GameState, r: Recipe, mats: string[]): boolean {
  if (mats.length !== r.slots.length || !mats.every((m, i) => fitsSlot(m, r.slots[i]))) return false;
  const need: Record<string, number> = {};
  for (const m of mats) need[m] = (need[m] ?? 0) + 1;
  return Object.entries(need).every(([m, n]) => (s.inventory[m] ?? 0) >= n);
}

/**
 * The cheapest way to fill a recipe from the bag (least precious materials first, then the
 * most plentiful), or null if it can't be made. A small search: recipes have at most 3 slots.
 */
export function autoIngredients(s: GameState, r: Recipe): string[] | null {
  let best: string[] | null = null, bestCost = Infinity;
  const go = (i: number, picked: string[], cost: number) => {
    if (cost >= bestCost) return;
    if (i === r.slots.length) { best = picked; bestCost = cost; return; }
    const opts = slotOptions(s, r.slots[i]).sort((a, b) => materialWorth(a) - materialWorth(b) || s.inventory[b] - s.inventory[a]);
    for (const m of opts) {
      if (picked.filter((x) => x === m).length >= s.inventory[m]) continue;
      // a little extra cost per same-item reuse keeps scarce stacks for later
      go(i + 1, [...picked, m], cost + materialWorth(m) + picked.filter((x) => x === m).length * 0.1);
    }
  };
  go(0, [], 0);
  return best;
}

/** Craft a recipe with these materials (one per slot). Returns the item made, or null. */
export function craft(s: GameState, recipeId: string, mats: string[]): string | null {
  const r = RECIPES.find((x) => x.id === recipeId);
  if (!r || !canCraftHere(s) || !validIngredients(s, r, mats)) return null;
  for (const m of mats) addItem(s, m, -1);
  addItem(s, r.out, r.n);
  s.stats.crafted = (s.stats.crafted ?? 0) + r.n;
  log(s, `Crafted ${r.n > 1 ? `${r.n} ` : ''}${itemInfo(r.out).name} from ${mats.map((m) => itemInfo(m).name).join(', ')}.`);
  return r.out;
}

export function carveTotem(s: GameState, kind: 'type' | 'effigy', target: string, materials: string[]): string | null {
  const cost = kind === 'type' ? 6 : 10;
  const need = kind === 'type' ? 1 : 2;
  if (s.coins < cost || materials.length < need) return null;
  if (kind === 'effigy' && !s.dex.seen.includes(target)) return null; // effigies need a Creature Codex entry
  for (const m of materials.slice(0, need)) if (!hasItem(s, m)) return null;
  s.coins -= cost;
  for (const m of materials.slice(0, need)) addItem(s, m, -1);
  const id = kind === 'type' ? `totem:${target}` : `effigy:${target}`;
  addItem(s, id, 1);
  return id;
}

export function itemDisplayName(id: string) {
  if (id.startsWith('effigy:')) return `${SPECIES_BY_ID[id.slice(7)]?.name ?? '?'} Effigy`;
  if (id.startsWith('totem:')) return `${TYPE_LABEL[id.slice(6) as ElementType]} Totem`;
  return itemInfo(id).name;
}

/** Overworld item use on a creature. */
/** Fatigue added by Rousing Salts. */
export const SALTS_FATIGUE = 4;
/** Back on its feet from a KO, with half its hearts (rounded up). Its Fatigue stays. */
function revive(c: CreatureInst) {
  c.ko = false;
  c.vitality = Math.ceil(maxHearts(c) / 2) - 1;
  c.health = maxHealth(c);
  c.stamina = maxStamina(c);
}

export function useItem(s: GameState, id: string, uid: string): string | null {
  const c = [...s.roster, ...s.reserve].find((x) => x.uid === uid);
  if (!c || !hasItem(s, id)) return null;
  const it = itemInfo(id);
  let msg: string | null = null;
  if (id === 'salve') { if (c.ko) return 'KO\'d creatures must be revived at a stable or with Rousing Salts.'; c.vitality = Math.min(maxVitality(c), c.vitality + 1); msg = `${nameOf(c)} regained a heart (+${HEART} Health).`; }
  else if (id === 'elixir') { if (c.ko) return 'KO\'d creatures must be revived at a stable or with Rousing Salts.'; c.vitality = maxVitality(c); c.health = maxHealth(c); c.fatigue = 0; msg = `${nameOf(c)} is fully refreshed.`; }
  else if (id === 'rousing-salts') { if (!c.ko) return 'A creature must be KO\'d to need Rousing Salts.'; revive(c); c.fatigue += SALTS_FATIGUE; msg = `${nameOf(c)} is back on its feet with ${c.vitality + 1} of ${maxHearts(c)} hearts, but worn out (Fatigue ${c.fatigue}).`; }
  else if (id === 'calm-tea') { c.fatigue = 0; msg = `${nameOf(c)} sips the tea. Fatigue cleared.`; }
  else if (id === 'root-salve') { if (c.ko) return 'KO\'d creatures must be revived at a stable or with Rousing Salts.'; c.vitality = Math.min(maxVitality(c), c.vitality + 2); c.fatigue = 0; msg = `${nameOf(c)} regained up to 2 hearts, and its Fatigue is cleared.`; }
  else if (id === 'energy-tonic') { const t = speciesOf(c).types[0]; c.extraEnergy[t] = (c.extraEnergy[t] ?? 0) + 1; msg = `${nameOf(c)} now generates ${energy(c)[t]} ${TYPE_LABEL[t]} energy.`; }
  else if (it.kind === 'treat') {
    const mor = id === 'moonberry' || id === 'duskberry' ? 2 : 1, loy = id === 'moonberry' ? 2 : 1;
    c.morale = Math.min(10, c.morale + mor); addLoyalty(c, loy); msg = `${nameOf(c)} happily munches the ${it.name}! (+${mor} Morale, +${loy} Loyalty)`;
  }
  else if (id === 'lure-incense') { s.flags.lure = true; s.flags.repel = false; msg = 'You light the incense. Wild creatures will come to you.'; }
  else if (id === 'hush-smoke') { s.flags.repel = true; s.flags.lure = false; msg = 'You wave the smoke around. Nothing will come near on your next explore.'; }
  else if (id === 'star-charm') { s.flags.starCharm = true; msg = 'The Star Charm glimmers. Your next encounter rolls an extra star die.'; }
  else return 'That can\'t be used here.';
  addItem(s, id, -1);
  return msg;
}


// ── Arbiters & NPC teams ────────────────────────────────────────
export function arbiterTeam(type: ElementType, tier: number): CreatureInst[] {
  const count = tier === 1 ? 2 : 3;
  const level = 1 + tier * 2;
  const pool = SPECIES.filter((x) => x.types.includes(type) && x.rarity !== 'legendary');
  const want = (i: number) => {
    const maxStage = tier <= 1 ? 1 : tier <= 3 ? 2 : 3;
    const allowApex = tier >= 4 || (tier === 3 && i === count - 1);
    const c = pool.filter((x) => x.stage <= maxStage && (x.rarity !== 'apex' || allowApex));
    return c.sort((a, b) => (b.stage - a.stage) + (b.rarity === 'apex' ? 1 : 0) - (a.rarity === 'apex' ? 1 : 0) + Math.random() - 0.5);
  };
  const team: CreatureInst[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const opts = want(i).filter((x) => !used.has(x.id));
    const sp = opts[0] ?? pool[0];
    used.add(sp.id);
    const c = createCreature(sp.id, level + (i === count - 1 ? 1 : 0));
    team.push(c);
  }
  return team;
}

export function arbiterBattle(s: GameState, cityId: string): Battle {
  const city = CITIES[cityId];
  const tier = tierOf(s);
  const team = arbiterTeam(city.type, tier);
  return createBattle(playerSide(s), { kind: 'arbiter', name: `Arbiter ${city.arbiter}`, team, active: 0, mods: {} }, weather(s), { arena: { trick: city.arena.trick, tier, city: cityId }, biome: NODE_BY_ID[cityId].biome });
}

/** Arena entry conditions (flavor gates from the docs). */
/** The city whose Arbiter can be challenged where the trainer stands: a city with its arena in town, or an arena node. */
export function arbiterHere(s: GameState): string | null {
  const n = here(s);
  if (n.kind === 'arena') return n.arenaOf ?? null;
  if (n.id === FOREST_FLOOR) return 'gloom'; // Dahlia's arena hides on the Forest Floor
  if (n.kind === 'city' && !CITIES[n.id].arenaNode) return n.id;
  return null;
}

export function arbiterGate(s: GameState, cityId: string): { ok: boolean; reason?: string; findHim?: boolean; gauntlet?: boolean; cloud?: boolean; trail?: boolean } {
  if (s.merits.includes(cityId)) return { ok: false, reason: 'You already hold this Arbiter\'s accolade.' };
  if (s.roster.every((c) => c.ko)) return { ok: false, reason: 'Your team needs rest first.' };
  switch (cityId) {
    case 'aurora': {
      if (s.flags.salemWorthy) return { ok: true };
      const lap = cloudLapProgress(s);
      return { ok: false, cloud: true, reason: `Salem only faces trainers who have walked a full lap of Cloud Island (${lap.steps}/${lap.need} steps). Its portal opens at night, or any time in Winter.` };
    }
    case 'hollow': return s.flags.fabianFound ? { ok: true } : { ok: false, findHim: true, reason: 'Fabian is hiding somewhere in town, in disguise.' };
    case 'gloom': {
      if (s.location !== FOREST_FLOOR) return { ok: false, reason: `Dahlia's arena hides on the Forest Floor below Gloomshade. Climb down with a Canopy Rope (sold in ${keyTownName(s, 'canopy-rope')} this season) and follow her trail.` };
      const t = trailProgress(s);
      return t.found ? { ok: true } : { ok: false, trail: true, reason: `Follow Dahlia's Trail to find her arena: ${t.steps}/${t.need} signs found. Keep exploring the Forest Floor.` };
    }
    case 'iron': {
      if (s.flags.stellaOpen) return { ok: true };
      const g = gauntletProgress(s);
      return { ok: false, gauntlet: true, reason: `Stella only faces trainers who clear the Iron Coast Gauntlet: ${g.wins}/${g.need} trainers beaten. Leaving the city resets it.` };
    }
    case 'mangrove': return hasItem(s, 'root-whistle') ? { ok: true } : { ok: false, reason: `The mangrove roots hide Katy. You need a Root Whistle (sold in ${keyTownName(s, 'root-whistle')} this season).` };
    default: return { ok: true };
  }
}

export function startEndgame(s: GameState) {
  const field = circuitField(s).map((x) => x.name);
  s.phase = 'endgame';
  s.endgame = { round: 0, bracket: [s.trainer.name, ...field], eliminated: false };
  for (const c of [...s.roster, ...s.reserve]) fullRestore(c);
}

export function endgameBattle(s: GameState): Battle {
  const eg = s.endgame!;
  const opponent = eg.bracket[1 + eg.round];
  const avg = Math.round(s.roster.reduce((a, c) => a + c.level, 0) / Math.max(1, s.roster.length));
  const lvl = Math.max(9, avg) + eg.round;
  const npc = npcNamed(opponent);
  // (a bracket drawn before the Champions had teams of their own can hold a name nobody goes by now)
  const team = npc ? npcTeam(s, npc, 3, lvl) : [0, 1, 2].map(() => {
    const sp = pick(SPECIES.filter((x) => x.rarity !== 'legendary' && (x.stage >= 2 || x.rarity === 'apex')));
    const c = createCreature(sp.id, lvl);
    autoSpend(c, false);
    return c;
  });
  for (const c of s.roster) fullRestore(c);
  return createBattle(playerSide(s), { kind: 'champion', name: opponent, ...(npc ? { npc: npc.id } : {}), team, active: 0, mods: {} }, weather(s), { biome: 'meadow' });
}

// ── Turn flow ───────────────────────────────────────────────────
/** A low-morale check at the end of a turn: d10 against Loyalty. */
export interface MoraleCheck { name: string; roll: number; loyalty: number; left: boolean }
export interface TurnReport {
  weatherRoll: number; seasonChanged: boolean; left: string[]; ended?: 'endgame' | 'over';
  /** Creatures that just dropped to low morale (the warning). */
  warned: string[];
  /** Morale checks rolled this turn for creatures that stayed unhappy after their warning. */
  checks: MoraleCheck[];
  /** Legendaries that left this turn and went back to their grounds on the map. */
  legendsReturned: { name: string; home: string }[];
  /** Creatures that finished their Battle School training this turn. */
  trainingDone: { name: string; school: string; retrain?: boolean }[];
}

/** Creatures that would benefit from camping, most in need first (missing hearts, then Fatigue). KO'd ones need a stable. */
export function campNeeds(s: GameState): CreatureInst[] {
  return s.roster.filter((c) => !c.ko && (c.vitality < maxVitality(c) || c.fatigue > 0))
    .sort((a, b) => (maxVitality(b) - b.vitality) - (maxVitality(a) - a.vitality) || b.fatigue - a.fatigue);
}

/**
 * Who camping tends: one creature per Initiative left, so it is never free. `chosen` (creature
 * uids) is the trainer's pick; KO'd and fully rested creatures are skipped, and extras beyond the
 * Initiative left are dropped. Without a pick, the most wounded are tended first.
 */
export function campTargets(s: GameState, chosen?: string[]): CreatureInst[] {
  const needs = campNeeds(s);
  const pool = chosen ? chosen.map((uid) => needs.find((c) => c.uid === uid)).filter((c): c is CreatureInst => !!c) : needs;
  return [...new Set(pool)].slice(0, Math.max(0, s.initiative) * campPerInitiative(s));
}

/**
 * End-of-turn Morale & Loyalty:
 * - the Following creature gains +1 Morale every other turn; creatures waiting in totems lose 1 every 10 turns;
 * - high Morale (7+) earns +1 Loyalty, which unlocks Nature perks at their thresholds (perks never re-lock);
 * - low Morale (3 or less) first triggers a warning. After that, each turn that ends without its Morale
 *   having risen rolls a d10: above its Loyalty, it leaves; otherwise it loses 1 Loyalty instead.
 *   At 0 Loyalty any roll is above it. Your last active creature never leaves (it just loses Loyalty),
 *   and neither does the starter (its special bond): low Morale never warns or checks it.
 */
/** Loyalty a Legendary arrives with. It loses 1 every turn, so this is roughly how many turns you keep it. */
export const LEGENDARY_START_LOYALTY = 10;

/** A Legendary that leaves a trainer (released, or gone of its own accord) returns to its grounds on the map. */
function returnLegendary(s: GameState, c: CreatureInst): string | null {
  const sp = speciesOf(c);
  if (sp.rarity !== 'legendary') return null;
  const home = MAP_NODES.find((n) => n.kind === 'legendary' && n.legendary === sp.id);
  if (!home) return null;
  for (const t of allTrainers(s)) t.flags.beaten = t.flags.beaten.filter((id) => id !== home.id);
  return home.name;
}

/** Remove a creature that leaves the team; promote one from a totem if the active team empties. */
function depart(s: GameState, list: CreatureInst[], i: number) {
  const [c] = list.splice(i, 1);
  if (!s.roster.length && s.reserve.length) s.roster.push(s.reserve.shift()!);
  if (s.following === c.uid) s.following = s.roster[0]?.uid ?? null;
  return returnLegendary(s, c);
}

export function moraleAndLoyalty(s: GameState, report: TurnReport) {
  const f = follower(s);
  if (f && s.turn % 2 === 0) f.morale = Math.min(10, f.morale + 1);
  if (s.turn % (s.trainer.style === 'drill' ? 5 : 10) === 0) for (const c of s.reserve) c.morale = Math.max(0, c.morale - 1);
  for (const list of [s.roster, s.reserve]) {
    for (let i = list.length - 1; i >= 0; i--) {
      const c = list[i];
      const raised = c.moraleMark !== undefined && c.morale > c.moraleMark;
      const legendary = speciesOf(c).rarity === 'legendary';
      const onlyOne = s.roster.length + s.reserve.length <= 1;
      if (legendary) {
        // Legendaries never settle: they lose 1 Loyalty every turn, whatever their Morale,
        // and at 0 Loyalty they return to their grounds for another trainer to find.
        addLoyalty(c, -LEGENDARY_LOYALTY_DRAIN);
        if (c.loyalty <= 0 && !onlyOne) {
          const home = depart(s, list, i);
          report.left.push(nameOf(c));
          report.legendsReturned.push({ name: nameOf(c), home: home ?? 'the wilds' });
          log(s, `${nameOf(c)}'s Loyalty ran out. It returned to ${home ?? 'the wilds'}.`);
          continue;
        }
      } else if (c.morale >= MORALE_HIGH) addLoyalty(c, 1);
      if (c.morale > MORALE_LOW || c.bond) c.moraleWarned = false; // a special bond never breaks: no warning, no check
      else if (!c.moraleWarned) {
        c.moraleWarned = true;
        report.warned.push(nameOf(c));
        log(s, `${nameOf(c)} is unhappy (Morale ${c.morale}). Raise its Morale or it may leave.`);
      } else if (!raised) {
        const r = roll(10);
        const leaves = r > c.loyalty && !onlyOne;
        report.checks.push({ name: nameOf(c), roll: r, loyalty: c.loyalty, left: leaves });
        if (leaves) {
          report.left.push(nameOf(c));
          const home = depart(s, list, i);
          if (home) report.legendsReturned.push({ name: nameOf(c), home });
          log(s, `${nameOf(c)} lost faith and returned to ${home ?? 'the wild'} (rolled ${r} over Loyalty ${c.loyalty}).`);
          continue;
        }
        addLoyalty(c, -1);
        log(s, `${nameOf(c)} stays, for now (rolled ${r} against Loyalty ${c.loyalty + 1}). Loyalty −1.`);
      }
      c.moraleMark = c.morale;
    }
  }
}

/** End the turn. `camping`: true tends the most wounded, or the uids the trainer chose to tend. `weatherRoll` (hotseat) reuses the roll another trainer already made for the coming turn. */
export function endTurn(s: GameState, camping: boolean | string[] = false, weatherRoll?: number | null): TurnReport {
  const report: TurnReport = { weatherRoll: 0, seasonChanged: false, left: [], warned: [], checks: [], legendsReturned: [], trainingDone: [] };
  if (camping) {
    const tended = campTargets(s, Array.isArray(camping) ? camping : undefined);
    for (const c of tended) { c.vitality = maxVitality(c); c.health = maxHealth(c); c.fatigue = 0; }
    s.initiative = 0;
    log(s, tended.length ? `You made camp. ${tended.map(nameOf).join(', ')} recovered all Health and shook off Fatigue.` : 'You made camp, but no one needed tending.');
  }
  moraleAndLoyalty(s, report);
  // Teamwork: the creatures on the active team grow closer travelling together (announced at the start of the next turn)
  // Loyalty has just changed: Teamwork above a pair's new cap (half the lower Loyalty) drops to it
  const falls = settleTeamwork(s.roster).map(riseText);
  if (falls.length) {
    s.teamworkFell = [...(s.teamworkFell ?? []), ...falls];
    for (const t of falls) log(s, `Teamwork fell with Loyalty. ${t}.`);
  }
  const rises = travelTogether(s.roster).map(riseText);
  if (rises.length) {
    s.teamworkNews = [...(s.teamworkNews ?? []), ...rises];
    for (const t of rises) log(s, `Teamwork grew. ${t}.`);
  }
  if (s.turn === 100) {
    if (s.location === 'stadium' && s.merits.length >= 8) { startEndgame(s); report.ended = 'endgame'; }
    else { s.phase = 'over'; report.ended = 'over'; }
    return report;
  }
  const prevSeason = seasonForTurn(s.turn);
  s.turn++;
  s.initiative = 5;
  s.flags.freeReexploreUsed = false;
  s.flags.rangerRefunds = 0;
  s.flags.bikeUsed = false; s.flags.bikeRoll = 0; s.flags.trailMix = false;
  s.flags.firstMoveUsed = false;
  s.flags.salemNight = false;
  s.flags.sparred = [];
  s.flags.paid = [];
  s.flags.challenged = [];
  const notes = npcTurn(s);
  if (notes.length) s.npcNotes = [...(s.npcNotes ?? []), ...notes];
  const season = seasonForTurn(s.turn);
  report.seasonChanged = season !== prevSeason;
  // hotseat passes null: the coming turn's weather is rolled once, when the first trainer starts it (rollRoundWeather)
  if (weatherRoll !== null) {
    report.weatherRoll = weatherRoll ?? roll(6);
    s.weather = SEASON_INFO[season].dice[report.weatherRoll - 1];
  }
  if (!s.roster.some((c) => c.uid === s.following)) s.following = s.roster[0]?.uid ?? null;
  for (const t of s.training ?? []) {
    if (!t.notified && trainingProgress(s, t).done) {
      t.notified = true;
      report.trainingDone.push({ name: nameOf(t.creature), school: NODE_BY_ID[t.school].name, ...(t.retrain ? { retrain: true } : {}) });
      log(s, `${nameOf(t.creature)} finished training at ${NODE_BY_ID[t.school].name}.`);
    }
  }
  return report;
}

