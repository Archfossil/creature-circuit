import type { Biome, ElementType, MapNode, Rarity, Species } from '../data/schema';
import { NODE_BY_ID, neighbors, CITIES, BIOME_TYPES, TOWNS, MAP_NODES } from '../data/map';
import { SPECIES, SPECIES_BY_ID } from '../data/species';
import { WEATHER, SEASON_INFO, seasonForTurn, BIOME_MATERIALS, ITEMS, NATURE_BY_ID, itemInfo } from '../data/content';
import { TYPES, TYPE_LABEL } from '../data/types';
import type { GameState } from './state';
import { tierOf, teamMovements, follower, addItem, hasItem, log } from './state';
import type { CreatureInst } from './creature';
import { createCreature, fullRestore, speciesOf, nameOf, maxVitality, maxHealth, maxStamina, energy, autoSpend } from './creature';
import type { Battle, Side } from './battle';
import { createBattle } from './battle';
import { roll, pick, starDie, weightedPick, type Star } from './dice';

export const ability = (s: GameState) => { const f = follower(s); return f ? speciesOf(f).ability : null; };
export const weather = (s: GameState) => WEATHER[s.weather] ?? WEATHER.clear;
export const here = (s: GameState): MapNode => NODE_BY_ID[s.location];

// ── Costs ───────────────────────────────────────────────────────
export function cityActionCost(s: GameState) {
  return s.trainer.style === 'nature' ? 2 : s.trainer.style === 'urban' ? 0 : 1;
}
export function reexploreCost(s: GameState) {
  if (s.trainer.style === 'nature' && !s.flags.freeReexploreUsed) return 0;
  return s.trainer.style === 'urban' ? 2 : 1;
}
export function moveCost(s: GameState) {
  return ability(s) === 'trailblazer' && !s.flags.firstMoveUsed ? 0 : 1;
}

export interface MoveCheck { ok: boolean; cost: number; reason?: string }
export function canMoveTo(s: GameState, id: string): MoveCheck {
  const nb = neighbors(s.location).find((n) => n.node.id === id);
  const cost = moveCost(s);
  if (!nb) return { ok: false, cost, reason: 'Not adjacent.' };
  const req = nb.edge.requires;
  if (req) {
    const mv = teamMovements(s);
    const okItem = req.item ? hasItem(s, req.item) : false;
    const okMove = req.movement ? mv.has(req.movement) : false;
    if (!okItem && !okMove) {
      const parts = [req.item ? itemInfo(req.item).name : null, req.movement ? `a creature that knows ${cap(req.movement)}` : null].filter(Boolean);
      return { ok: false, cost, reason: `Requires ${parts.join(' or ')}.` };
    }
  }
  const nr = nb.node.requires;
  if (nr) {
    if (nr.tier && tierOf(s) < nr.tier) return { ok: false, cost, reason: `Only Tier ${nr.tier}+ trainers may enter.` };
    if (nr.item && !hasItem(s, nr.item)) return { ok: false, cost, reason: `Requires ${itemInfo(nr.item).name}.` };
  }
  if (s.initiative < cost) return { ok: false, cost, reason: 'Not enough Initiative.' };
  return { ok: true, cost };
}

const cap = (x: string) => x[0].toUpperCase() + x.slice(1);

// ── Exploration ─────────────────────────────────────────────────
export type Outcome =
  | { t: 'nothing'; roll: number }
  | { t: 'encounter'; roll: number; stars: { face: number; star: Star }[]; rarity: Rarity; battle: Battle }
  | { t: 'trainer'; roll: number; name: string; battle: Battle }
  | { t: 'item'; roll: number; itemRoll: number; items: { id: string; n: number }[]; coins: number }
  | { t: 'legendary'; battle: Battle }
  | { t: 'arrive'; node: MapNode };

export function moveTo(s: GameState, id: string): Outcome | null {
  const chk = canMoveTo(s, id);
  if (!chk.ok) return null;
  s.initiative -= chk.cost;
  s.flags.firstMoveUsed = true;
  s.location = id;
  if (!s.visited.includes(id)) s.visited.push(id);
  const node = NODE_BY_ID[id];
  if (node.kind === 'legendary') {
    if (s.flags.beaten.includes(id)) return { t: 'nothing', roll: 0 };
    return { t: 'legendary', battle: legendaryBattle(s, node) };
  }
  if (node.kind !== 'wild') return { t: 'arrive', node };
  return explore(s);
}

export function reexplore(s: GameState): Outcome | null {
  const cost = reexploreCost(s);
  if (s.initiative < cost) return null;
  s.initiative -= cost;
  if (s.trainer.style === 'nature') s.flags.freeReexploreUsed = true;
  return explore(s);
}

function explore(s: GameState): Outcome {
  const node = here(s);
  s.stats.explored++;
  let r = roll(6);
  const ab = ability(s);
  if (s.flags.lure) { s.flags.lure = false; r = 3 + (r % 2); }
  const encounterRange = ab === 'sweetScent' ? [3, 5] : ab === 'keenNose' ? [3, 3] : [3, 4];
  if (r < encounterRange[0]) return { t: 'nothing', roll: r };
  if (r <= encounterRange[1]) {
    if ((node.biome === 'road' || node.biome === 'meadow') && Math.random() < 0.4) return trainerEncounter(s, node, r);
    return wildEncounter(s, node, r);
  }
  return discoverItem(s, node, r);
}

function discoverItem(s: GameState, node: MapNode, r: number): Outcome {
  const ir = roll(6);
  const mult = ability(s) === 'forager' ? 2 : 1;
  const items: { id: string; n: number }[] = [];
  let coins = 0;
  if (ir <= 2) items.push({ id: ir === 1 ? 'sunberry' : (Math.random() < 0.2 ? 'moonberry' : 'dewberry'), n: mult });
  else if (ir <= 4) items.push({ id: pick(BIOME_MATERIALS[node.biome]), n: mult });
  else if (ir === 5) items.push({ id: pick(['salve', 'calm-tea', 'lure-incense', 'totem']), n: 1 });
  else { if (Math.random() < 0.5) items.push({ id: 'totem', n: 1 }); coins = roll(6); }
  for (const it of items) addItem(s, it.id, it.n);
  s.coins += coins;
  return { t: 'item', roll: r, itemRoll: ir, items, coins };
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

function wildEncounter(s: GameState, node: MapNode, r: number): Outcome {
  const tier = tierOf(s);
  const nDice = 2 + tierRarityDice(tier) + (ability(s) === 'starSeeker' ? 1 : 0) + (s.flags.starCharm ? 1 : 0);
  s.flags.starCharm = false;
  const stars = Array.from({ length: nDice }, () => starDie());
  const full = stars.filter((x) => x.star === 'full').length;
  const half = stars.filter((x) => x.star === 'half').length;
  const score = node.rarity + full + Math.floor(half / 2);
  const rolled: Rarity = score >= 3 ? 'apex' : score >= 2 ? 'prime' : 'common';
  const cap = tierRarityCap(tier);
  const rarity: Rarity = RARITY_RANK[rolled] > RARITY_RANK[cap] ? cap : rolled;
  const level = wildLevel(s, node);
  const sp = pickSpecies(node, rarity, level, weather(s).encounter);
  const wild = createCreature(sp.id, level);
  if (!s.dex.seen.includes(sp.id)) s.dex.seen.push(sp.id);
  const battle = createBattle(playerSide(s), { kind: 'wild', name: `Wild ${sp.name}`, team: [wild], active: 0, mods: {} }, weather(s), { biome: node.biome, quickStep: ability(s) === 'quickStep' });
  return { t: 'encounter', roll: r, stars, rarity, battle };
}

export function pickSpecies(node: MapNode, rarity: Rarity, level: number, boost: ElementType[] = []): Species {
  const pool = BIOME_TYPES[node.biome];
  const type = weightedPick(TYPES.filter((t) => pool.includes(t) || boost.includes(t)).map((t) => ({ v: t, w: (pool.includes(t) ? 3 : 0) + (boost.includes(t) ? 2 : 0) })));
  const stageCap = stageCapFor(level);
  const list = speciesPool(node.biome, type, rarity, stageCap);
  // prefer the highest stage allowed, but keep some variety
  return weightedPick(list.map((x) => ({ v: x, w: x.stage === stageCap ? 3 : 1 })));
}

/** Highest evolution stage that can appear at a wild level. */
export const stageCapFor = (level: number) => (level >= 10 ? 3 : level >= 6 ? 2 : 1);

/** The species a biome can produce for a given type, rarity and stage cap (shared by encounters and the Codex). */
export function speciesPool(biome: Biome, type: ElementType, rarity: Rarity, stageCap: number): Species[] {
  let cands = SPECIES.filter((x) => x.types[0] === type && x.rarity === rarity && x.stage <= stageCap);
  if (!cands.length) cands = SPECIES.filter((x) => x.types[0] === type && x.rarity === rarity);
  if (!cands.length) cands = SPECIES.filter((x) => x.rarity === 'common' && x.stage === 1);
  const inBiome = cands.filter((x) => x.biomes.includes(biome));
  return inBiome.length ? inBiome : cands;
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
    const cap = [1, 2, 3].find((c) => speciesPool(node.biome, sp.types[0], sp.rarity, c).includes(sp));
    if (cap) out.push({ node, minStage: cap });
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

const TRAINER_NAMES = ['Hiker Rosa', 'Ranger Theo', 'Birder Juno', 'Camper Malik', 'Angler Pip', 'Botanist Ines', 'Geologist Rhea', 'Drifter Kane', 'Scout Ola', 'Painter Wren'];

function trainerEncounter(s: GameState, node: MapNode, r: number): Outcome {
  const name = pick(TRAINER_NAMES);
  const lvl = wildLevel(s, node);
  const tier = tierOf(s);
  const n = Math.min(s.roster.filter((c) => !c.ko).length, roll(tier >= 3 ? 3 : 2));
  const team = Array.from({ length: Math.max(1, n) }, () => createCreature(pickSpecies(node, trainerRarity(tier), lvl).id, lvl));
  const battle = createBattle(playerSide(s), { kind: 'trainer', name, team, active: 0, mods: {} }, weather(s), { biome: node.biome });
  return { t: 'trainer', roll: r, name, battle };
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
  return { kind: 'player', name: s.trainer.name, team, active: Math.max(0, active), mods: {}, buff: s.hotpot?.buff };
}

// ── After battle ────────────────────────────────────────────────
export interface BattleSummary { coins: number; wiped: boolean; text: string[] }

export function finishBattle(s: GameState, b: Battle, ctx: { kind: 'wild' | 'trainer' | 'arbiter' | 'legendary' | 'endgame'; city?: string; nodeId?: string }): BattleSummary {
  const out: BattleSummary = { coins: 0, wiped: false, text: [] };
  s.hotpot = undefined;
  for (const id of b.seenFoes ?? []) if (!s.dex.seen.includes(id)) s.dex.seen.push(id);
  if (b.over === 'win') {
    s.stats.battlesWon++;
    if (ctx.kind === 'trainer') { out.coins = roll(6) + Math.floor(b.sides[1].team[0].level / 2); out.text.push(`${b.sides[1].name} hands over ${out.coins} coins.`); }
    if (ctx.kind === 'wild') { out.coins = 1 + Math.floor(b.sides[1].team[0].level / 3); out.text.push(`You found ${out.coins} coins in the grass.`); }
    if (ctx.kind === 'arbiter' && ctx.city) {
      const city = CITIES[ctx.city];
      if (!s.merits.includes(ctx.city)) s.merits.push(ctx.city);
      out.coins = 10 * tierOf(s);
      out.text.push(`${city.arbiter} awards you the ${city.accolade}!`);
      log(s, `Earned the ${city.accolade} from ${city.arbiter}.`);
    }
    if (ctx.kind === 'legendary' && ctx.nodeId) s.flags.beaten.push(ctx.nodeId);
    s.coins += out.coins;
  } else if (b.over === 'lose' && ctx.kind === 'trainer') {
    const lost = Math.min(s.coins, roll(6));
    s.coins -= lost;
    out.text.push(`You hand ${lost} coins to ${b.sides[1].name}.`);
  }
  // morale for participants
  for (const uid of b.participants) {
    const c = s.roster.find((x) => x.uid === uid);
    if (c && b.over === 'win') c.morale = Math.min(10, c.morale + 1);
  }
  if (s.roster.every((c) => c.ko)) {
    out.wiped = true;
    wipe(s);
    out.text.push(`Your team was wiped out. You rush back to ${CITIES[s.trainer.home].name}…`);
  }
  // out of combat: creatures restore all Health (not Vitality)
  for (const c of s.roster) if (!c.ko) { c.health = maxHealth(c); c.stamina = maxStamina(c); }
  return out;
}
function wipe(s: GameState) {
  s.location = s.trainer.home;
  for (const c of s.roster) { fullRestore(c); c.morale = Math.max(0, c.morale - 1); }
  s.coins = Math.floor(s.coins / 2);
  s.initiative = 0;
  log(s, 'Team wiped. Returned home and lost half your coins.');
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
    if (it.kind === 'treat') total += id === 'moonberry' ? 2 : 1;
    else if (it.allure) total += Math.max(0, ...sp.types.map((t) => it.allure![t] ?? 0));
  }
  return total;
}
export function recruitTarget(c: CreatureInst) { return speciesOf(c).rt + Math.floor(c.level / 3); }

export function attemptRecruit(s: GameState, wild: CreatureInst, totem: string, offerings: string[]) {
  const dice = [roll(6), roll(6)];
  const mods = totemBonus(totem, wild) + offeringBonus(offerings, wild) + (ability(s) === 'luckyCharm' ? 1 : 0);
  const total = dice[0] + dice[1] + mods;
  const need = recruitTarget(wild);
  addItem(s, totem, -1);
  for (const o of offerings) addItem(s, o, -1);
  const success = total >= need;
  if (success) {
    fullRestore(wild);
    wild.morale = 6;
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

/**
 * Rest at a stable: full recovery (KOs, Vitality, Health, Stamina, Fatigue) and +1 Morale for the active team.
 * City stables also serve their Chanko Nabe, a battle buff (doubled at your home city). Town stables don't.
 */
export function rest(s: GameState, nodeId: string) {
  for (const c of [...s.roster, ...s.reserve]) fullRestore(c);
  for (const c of s.roster) c.morale = Math.min(10, c.morale + 1);
  const ci = CITIES[nodeId];
  if (!ci) return { advanced: false, buff: {} as Record<string, number> };
  const advanced = s.trainer.home === nodeId;
  const buff = Object.fromEntries(Object.entries(ci.hotpot.buff).map(([k, v]) => [k, v! * (advanced ? 2 : 1)]));
  s.hotpot = { city: nodeId, buff };
  return { advanced, buff };
}

export function priceOf(s: GameState, id: string) {
  const p = itemInfo(id).price;
  return ability(s) === 'babyEyes' ? Math.max(1, Math.ceil(p * 0.75)) : p;
}
export function buy(s: GameState, id: string): boolean {
  const p = priceOf(s, id);
  const it = itemInfo(id);
  if (s.coins < p) return false;
  if (it.kind === 'key' && hasItem(s, id)) return false;
  s.coins -= p;
  addItem(s, id, 1);
  return true;
}
export function marketStock(nodeId: string): string[] {
  const n = NODE_BY_ID[nodeId];
  if (n.kind === 'city') return ['salve', 'elixir', 'calm-tea', 'totem', 'sunberry', 'dewberry', 'lure-incense', 'star-charm', ...(CITIES[nodeId]?.arenaNode ? ['ferry-pass'] : [])];
  return TOWNS[nodeId]?.sells ?? [];
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
export function useItem(s: GameState, id: string, uid: string): string | null {
  const c = [...s.roster, ...s.reserve].find((x) => x.uid === uid);
  if (!c || !hasItem(s, id)) return null;
  const it = itemInfo(id);
  let msg: string | null = null;
  if (id === 'salve') { if (c.ko) return 'KO\'d creatures must be revived at a stable.'; c.vitality = Math.min(maxVitality(c), c.vitality + 1); msg = `${nameOf(c)} regained 1 Vitality.`; }
  else if (id === 'elixir') { if (c.ko) return 'KO\'d creatures must be revived at a stable.'; c.vitality = maxVitality(c); c.fatigue = 0; msg = `${nameOf(c)} is fully refreshed.`; }
  else if (id === 'calm-tea') { c.fatigue = 0; msg = `${nameOf(c)} sips the tea. Fatigue cleared.`; }
  else if (id === 'energy-tonic') { const t = speciesOf(c).types[0]; c.extraEnergy[t] = (c.extraEnergy[t] ?? 0) + 1; msg = `${nameOf(c)} now generates ${energy(c)[t]} ${TYPE_LABEL[t]} energy.`; }
  else if (it.kind === 'treat') { const n = id === 'moonberry' ? 2 : 1; c.morale = Math.min(10, c.morale + n); c.loyalty += n; msg = `${nameOf(c)} happily munches the ${it.name}! (+${n} Morale, +${n} Loyalty)`; }
  else if (id === 'lure-incense') { s.flags.lure = true; msg = 'You light the incense. Wild creatures will come to you.'; }
  else if (id === 'star-charm') { s.flags.starCharm = true; msg = 'The Star Charm glimmers. Your next encounter rolls an extra star die.'; }
  else return 'That can\'t be used here.';
  addItem(s, id, -1);
  return msg;
}

export function buyPerk(s: GameState, uid: string): boolean {
  const c = [...s.roster, ...s.reserve].find((x) => x.uid === uid);
  if (!c) return false;
  const n = NATURE_BY_ID[c.nature];
  const perk = n.perks[c.perks];
  if (!perk || c.loyalty < perk.cost) return false;
  c.loyalty -= perk.cost;
  c.perks++;
  return true;
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
  if (n.kind === 'city' && !CITIES[n.id].arenaNode) return n.id;
  return null;
}

export function arbiterGate(s: GameState, cityId: string): { ok: boolean; reason?: string; wait?: boolean; findHim?: boolean } {
  if (s.merits.includes(cityId)) return { ok: false, reason: 'You already hold this Arbiter\'s accolade.' };
  if (s.roster.every((c) => c.ko)) return { ok: false, reason: 'Your team needs rest first.' };
  switch (cityId) {
    case 'aurora': return s.weather === 'aurora' || seasonForTurn(s.turn) === 'winter' || s.flags.salemNight ? { ok: true } : { ok: false, wait: true, reason: 'Salem\'s arena only opens under the aurora.' };
    case 'hollow': return s.flags.fabianFound ? { ok: true } : { ok: false, findHim: true, reason: 'Fabian is hiding somewhere in town, in disguise.' };
    case 'gloom': return hasItem(s, 'canopy-rope') ? { ok: true } : { ok: false, reason: 'Dahlia\'s arena is on the forest floor. You need a Canopy Rope (Lumber Hollow).' };
    case 'iron': return tierOf(s) >= 2 ? { ok: true } : { ok: false, reason: 'Stella\'s fortress stays beneath the waves until you hold 2 accolades.' };
    case 'mangrove': return hasItem(s, 'root-whistle') || teamMovements(s).has('sail') ? { ok: true } : { ok: false, reason: 'The mangrove roots hide Katy. You need a Root Whistle (Saltmarsh Landing) or a creature that can Sail.' };
    default: return { ok: true };
  }
}

const CHAMPIONS = ['Champion Ivo', 'Champion Selene', 'Champion Marisol', 'Champion Dez', 'Champion Okon', 'Champion Hale', 'Champion Tamsin', 'Champion Bram', 'Champion Noor'];

export function startEndgame(s: GameState) {
  const rivals = [...CHAMPIONS].sort(() => Math.random() - 0.5).slice(0, 7);
  s.phase = 'endgame';
  s.endgame = { round: 0, bracket: [s.trainer.name, ...rivals], eliminated: false };
  for (const c of [...s.roster, ...s.reserve]) fullRestore(c);
}

export function endgameBattle(s: GameState): Battle {
  const eg = s.endgame!;
  const opponent = eg.bracket[1 + eg.round];
  const avg = Math.round(s.roster.reduce((a, c) => a + c.level, 0) / Math.max(1, s.roster.length));
  const lvl = Math.max(9, avg) + eg.round;
  const team = [0, 1, 2].map(() => {
    const sp = pick(SPECIES.filter((x) => x.rarity !== 'legendary' && (x.stage >= 2 || x.rarity === 'apex')));
    const c = createCreature(sp.id, lvl);
    autoSpend(c, false);
    return c;
  });
  for (const c of s.roster) fullRestore(c);
  return createBattle(playerSide(s), { kind: 'champion', name: opponent, team, active: 0, mods: {} }, weather(s), { biome: 'meadow' });
}

// ── Turn flow ───────────────────────────────────────────────────
export interface TurnReport { weatherRoll: number; seasonChanged: boolean; left: string[]; ended?: 'endgame' | 'over' }

/** Creatures that would benefit from camping, most in need first (missing Vitality, then Fatigue). KO'd ones need a stable. */
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
  return [...new Set(pool)].slice(0, Math.max(0, s.initiative));
}

/** End the turn. `camping`: true tends the most wounded, or pass the uids the trainer chose to tend. */
export function endTurn(s: GameState, camping: boolean | string[] = false): TurnReport {
  const report: TurnReport = { weatherRoll: 0, seasonChanged: false, left: [] };
  if (camping) {
    const tended = campTargets(s, Array.isArray(camping) ? camping : undefined);
    for (const c of tended) { c.vitality = maxVitality(c); c.fatigue = 0; }
    s.initiative = 0;
    log(s, tended.length ? `You made camp. ${tended.map(nameOf).join(', ')} recovered Vitality and shook off Fatigue.` : 'You made camp, but no one needed tending.');
  }
  // follower bonds
  const f = follower(s);
  if (f) { f.loyalty += 1; if (s.turn % 2 === 0) f.morale = Math.min(10, f.morale + 1); }
  // neglected creatures in totems lose morale over time
  if (s.turn % 10 === 0) {
    for (const c of s.reserve) c.morale = Math.max(0, c.morale - 1);
  }
  // creatures with no morale return to the wild
  for (const list of [s.reserve, s.roster]) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].morale <= 0 && (list !== s.roster || s.roster.length > 1)) {
        report.left.push(nameOf(list[i]));
        log(s, `${nameOf(list[i])} lost faith and returned to the wild.`);
        list.splice(i, 1);
      }
    }
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
  s.flags.firstMoveUsed = false;
  s.flags.salemNight = false;
  const season = seasonForTurn(s.turn);
  report.seasonChanged = season !== prevSeason;
  report.weatherRoll = roll(6);
  s.weather = SEASON_INFO[season].dice[report.weatherRoll - 1];
  if (!s.roster.some((c) => c.uid === s.following)) s.following = s.roster[0]?.uid ?? null;
  return report;
}

export function flyTargets(s: GameState): string[] {
  if (!teamMovements(s).has('fly')) return [];
  return s.visited.filter((id) => NODE_BY_ID[id].kind === 'city' && id !== s.location);
}
export function fly(s: GameState, id: string): boolean {
  if (s.initiative < 3 || !flyTargets(s).includes(id)) return false;
  s.initiative -= 3;
  s.location = id;
  return true;
}
