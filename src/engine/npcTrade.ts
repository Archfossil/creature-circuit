// Trading with Rivals and Champions. Face to face it can include creatures (one for one); by courier it's
// coins and items. They think in coins, and judge a creature by what it can do. A traded creature joins their
// team, so they won't take one that would leave them weaker, now or by the end of the season.
import type { Npc } from '../data/npcs';
import { BIOME_MATERIALS, ITEMS, itemInfo } from '../data/content';
import type { GameState } from './state';
import { log } from './state';
import { createCreature, creaturePower, nameOf, speciesOf, type CreatureInst } from './creature';
import { stageCapFor } from './world';
import { uid as newUid } from './dice';
import { giftable, receiveCreature, removeCreature } from './interactions';
import { SPECIES, SPECIES_BY_ID } from '../data/species';
import { MIFFED, chanceOf, meet, npcCreature, npcRoster, npcStay, npcTier, npcsHere, recordWith, seededly, type NpcRecord } from './npcs';

/** What the trainer puts in, and what they ask for. */
export interface Mine { coins: number; items: Record<string, number>; creature?: string }
export interface Theirs { coins: number; stock: number[]; slot?: number }
export const emptyMine = (): Mine => ({ coins: 0, items: {} });
export const emptyTheirs = (): Theirs => ({ coins: 0, stock: [] });

// ── What things are worth to them ───────────────────────────────
// A creature is priced by what it can do, not by what it's called: its level (a level costs about 10 coins of
// training anywhere in Margos), how its real attributes compare with others of its level, and how good its
// family and Nature will be by the end of the season. So growth, training, retraining and events all count.
const LATE = 12;
const powers = new Map<string, number>();
/** A creature's strength (creature.ts → creaturePower), remembered: it's slow to work out. */
export function powerOf(c: CreatureInst): number {
  const key = JSON.stringify([c.species, c.level, c.nature, c.bonus, c.extraEnergy, c.bond, c.perks, c.unlocked, c.instinct]);
  let p = powers.get(key);
  if (p === undefined) { p = creaturePower(c); if (powers.size > 600) powers.clear(); powers.set(key, p); }
  return p;
}
/** What a creature of this family and Nature grows into: an average over a few ways it might grow. */
export function potentialOf(species: string, nature: string): number {
  const key = `late|${species}|${nature}`;
  let p = powers.get(key);
  if (p === undefined) {
    let sp = SPECIES_BY_ID[species];
    while (sp.evolvesTo) sp = SPECIES_BY_ID[sp.evolvesTo];
    p = seededly(key, () => [0, 1, 2].reduce((a) => a + creaturePower(createCreature(sp.id, LATE, { nature })), 0) / 3);
    powers.set(key, p);
  }
  return p;
}
/** The usual strength at a level, from a spread of ordinary creatures. */
const usual = new Map<number, number>();
function usualAt(level: number): number {
  let u = usual.get(level);
  if (u === undefined) {
    const stage = stageCapFor(level);
    const pool = SPECIES.filter((x) => x.stage === stage && x.rarity !== 'legendary');
    u = seededly(`usual|${level}`, () => Array.from({ length: 24 }, (_, i) => creaturePower(createCreature(pool[Math.floor((i / 24) * pool.length)].id, level))).reduce((a, x) => a + x, 0) / 24);
    usual.set(level, u);
  }
  return u;
}
/** How strong one of its species and Nature usually is at its level. */
function grownAt(c: CreatureInst): number {
  const key = `at|${c.species}|${c.nature}|${c.level}`;
  let p = powers.get(key);
  if (p === undefined) { p = seededly(key, () => [0, 1, 2].reduce((a) => a + creaturePower(createCreature(c.species, c.level, { nature: c.nature })), 0) / 3); powers.set(key, p); }
  return p;
}
/** A creature's price in coins, before anyone's taste comes into it. */
export function creatureValue(c: CreatureInst): number {
  const now = powerOf(c) / usualAt(c.level), late = potentialOf(c.species, c.nature) / usualAt(LATE);
  const rare = { common: 0, prime: 4, apex: 10, legendary: 30 }[speciesOf(c).rarity]; // being hard to find is worth a little
  return Math.max(1, 10 * c.level + 40 * (now - 1) + 60 * (late - 1) + 10 + rare);
}
/** They pay a little over for their own types, and charge a little over for giving them up. Nothing is ever discounted. */
export const fits = (npc: Npc, c: CreatureInst) => speciesOf(c).types.some((t) => npc.types.includes(t));
export const payFor = (npc: Npc, c: CreatureInst) => creatureValue(c) * (fits(npc, c) ? 1.1 : 0.85);
export const askFor = (npc: Npc, c: CreatureInst) => creatureValue(c) * (fits(npc, c) ? 1.25 : 1.1);

/**
 * Why they won't take this creature for that slot of their team, whatever the price, or null. They think of
 * the whole season: it must be as strong as the one it replaces, now and at the end of it, and keep their
 * team mostly their own types.
 */
export function teamBlock(s: GameState, npc: Npc, c: CreatureInst, slot: number): string | null {
  const theirs = npcRoster(s, npc)[slot];
  if (!theirs) return 'They don’t have that creature.';
  if (potentialOf(c.species, c.nature) < potentialOf(theirs.species, theirs.nature) * 0.97) return `They don’t think ${nameOf(c)} will grow as strong as ${nameOf(theirs)}.`;
  // how it would be on their team today (their training, its family and Nature)
  const there = powerOf(npcCreature(s, npc, slot, theirs.level, { species: familyOf(c), nature: c.nature }));
  if (there < powerOf(theirs) * 0.95) return `${nameOf(c)} would weaken their team.`;
  // its own attributes: one that training or events have left weak for its level
  if (powerOf(c) < grownAt(c) * 0.85) return `${nameOf(c)} is too weak for its level.`;
  if (!fits(npc, c)) {
    const r = recordWith(s, npc);
    const strays = Object.entries(r?.swaps ?? {}).filter(([k, x]) => Number(k) !== slot && !SPECIES_BY_ID[x.species]?.types.some((t) => npc.types.includes(t))).length;
    if (strays >= 1) return 'They want the rest of their team to be their own types.';
  }
  return null;
}
/** Materials that tempt creatures of their types are worth their full price; anything else, a little less. */
export function itemWorth(npc: Npc, id: string): number {
  const it = itemInfo(id);
  return (it.price ?? 0) * (it.allure && npc.types.some((t) => (it.allure![t] ?? 0) >= 2) ? 1 : 0.8);
}
/** What they expect for what they give: less from a friend, more from someone they're miffed with. */
export const asking = (r: NpcRecord | undefined) => { const k = r?.rapport ?? 0; return k >= 6 ? 0.92 : k >= 3 ? 0.96 : k <= MIFFED ? 1.25 : 1; };

// ── What they have ──────────────────────────────────────────────
/** Trading with each person this stay: what's been sold and spent. */
const book = (r: NpcRecord, s: GameState) => { if (r.trade?.stay !== npcStay(s.turn)) r.trade = { stay: npcStay(s.turn), sold: [], spent: 0 }; return r.trade!; };
/** Items they'd part with this stay. */
export function npcStock(s: GameState, npc: Npc): string[] {
  const key = `${npc.id}:stock:${npcStay(s.turn)}`;
  const from = (list: string[], i: number) => list[Math.floor(chanceOf(s, `${key}:${i}`) * list.length)];
  // everyday materials: not the Rainbow Plains' or Forest Floor's, nor the ones that tempt every type
  const any = Object.keys(ITEMS).filter((id) => ITEMS[id].kind === 'material' && ITEMS[id].price === 3 && !BIOME_MATERIALS.prism.includes(id) && Object.keys(ITEMS[id].allure ?? {}).length < 8);
  const mats = any.filter((id) => npc.types.some((t) => (ITEMS[id].allure?.[t] ?? 0) >= 2));
  return [from(mats.length ? mats : any, 0), from(any, 1), from(['sunberry', 'dewberry', 'moonberry'], 2), from(['salve', 'calm-tea', 'elixir', 'hush-smoke', 'lure-incense', ...(npcTier(s.turn) >= 2 ? ['rousing-salts', 'star-charm'] : [])], 3)];
}
export const stockSold = (s: GameState, npc: Npc, i: number) => { const t = recordWith(s, npc)?.trade; return t?.stay === npcStay(s.turn) && t.sold.includes(i); };
/** Coins they can still spend this stay. */
export const npcPurse = (s: GameState, npc: Npc) => { const t = recordWith(s, npc)?.trade; return Math.max(0, 8 + 4 * npcTier(s.turn) - (t?.stay === npcStay(s.turn) ? t.spent : 0)); };
/** Their creatures that can change hands: never the Ace, nor one they got from this trainer. */
export const npcOffers = (s: GameState, npc: Npc): { slot: number; c: CreatureInst }[] =>
  npcRoster(s, npc).map((c, slot) => ({ slot, c })).filter((x) => !x.c.ace && !recordWith(s, npc)?.swaps?.[x.slot]);

// ── Deals ───────────────────────────────────────────────────────
const owned = (s: GameState) => [...s.roster, ...s.reserve];
/** Why this trainer's creature can't be traded, or null. */
export function mineBlock(s: GameState, c: CreatureInst): string | null {
  if (c.bond) return 'It shares a special bond with you.';
  if (speciesOf(c).rarity === 'legendary') return 'Legendaries choose their own trainers.';
  if (c.ko) return 'It needs reviving first.';
  return owned(s).includes(c) ? null : 'It isn’t with you.';
}
/** Whether they'd take it, and how many coins' worth it's short (or over, if negative). */
export function verdict(s: GameState, npc: Npc, mine: Mine, theirs: Theirs): { ok: boolean; short: number; why?: string } {
  const no = (why: string) => ({ ok: false, short: 0, why });
  const r = recordWith(s, npc);
  if (!r) return no('You haven’t met.');
  const whole = [mine.coins, theirs.coins, ...Object.values(mine.items)].every((n) => Number.isInteger(n) && n >= 0);
  if (!whole) return no('Only whole numbers.');
  const give = Object.entries(mine.items).filter(([, n]) => n > 0);
  if (!mine.coins && !give.length && !mine.creature) return no('Offer something.');
  if (!theirs.coins && !theirs.stock.length && theirs.slot === undefined) return no('Ask for something.');
  if (mine.coins > s.coins) return no('You don’t have that many coins.');
  if (mine.coins && theirs.coins) return no('Coins for coins? Pick a side.');
  for (const [id, n] of give) { if (!giftable(id)) return no(`${itemInfo(id).name} can’t be traded.`); if ((s.inventory[id] ?? 0) < n) return no(`You don’t have ${n} × ${itemInfo(id).name}.`); }
  if (theirs.coins > npcPurse(s, npc)) return no(`They only have 💰 ${npcPurse(s, npc)} to spend.`);
  const stock = npcStock(s, npc);
  if (new Set(theirs.stock).size !== theirs.stock.length || theirs.stock.some((i) => !stock[i] || stockSold(s, npc, i))) return no('They don’t have that any more.');
  if (!!mine.creature !== (theirs.slot !== undefined)) return no('Creatures are traded one for one.');
  let mineC: CreatureInst | undefined, theirC: CreatureInst | undefined;
  if (mine.creature) {
    if (!npcsHere(s).includes(npc)) return no('Creatures can only change hands face to face.');
    mineC = owned(s).find((c) => c.uid === mine.creature);
    theirC = npcOffers(s, npc).find((x) => x.slot === theirs.slot)?.c;
    if (!mineC || !theirC) return no('That creature isn’t on offer.');
    const why = mineBlock(s, mineC);
    if (why) return no(why);
    const team = teamBlock(s, npc, mineC, theirs.slot!);
    if (team) return no(team);
  }
  const get = mine.coins + give.reduce((a, [id, n]) => a + itemWorth(npc, id) * n, 0) + (mineC ? payFor(npc, mineC) * (r.keen === mineC.uid ? 1.1 : 1) : 0);
  const part = theirs.stock.reduce((a, i) => a + (itemInfo(stock[i]).price ?? 0) * 1.1, 0) + (theirC ? askFor(npc, theirC) : 0);
  const short = Math.ceil(theirs.coins + part * asking(r) - get - 1e-6);
  return { ok: short <= 0, short };
}
/** Make the trade. Null if it went through, otherwise why not. */
export function trade(s: GameState, npc: Npc, mine: Mine, theirs: Theirs): string | null {
  const v = verdict(s, npc, mine, theirs);
  if (!v.ok) return v.why ?? 'They want a little more.';
  const r = meet(s, npc), t = book(r, s);
  const stock = npcStock(s, npc);
  const put = (id: string, n: number) => { s.inventory[id] = (s.inventory[id] ?? 0) + n; if (s.inventory[id] <= 0) delete s.inventory[id]; };
  const got: string[] = [], gave: string[] = [];
  if (theirs.slot !== undefined) {
    const theirC = npcOffers(s, npc).find((x) => x.slot === theirs.slot)!.c;
    const mineC = removeCreature(s, mine.creature!);
    // theirs comes as it is (its own creature now); yours takes its place on their team
    // and has to learn to trust you: no Loyalty or Teamwork comes with it
    receiveCreature(s, { ...theirC, uid: newUid(), loyalty: 0, perks: 0, morale: 5, teamwork: {}, swapMoves: {} });
    (r.swaps ??= {})[theirs.slot] = { species: familyOf(mineC), nature: mineC.nature, ...(mineC.nickname ? { nickname: mineC.nickname } : {}) };
    if (!r.seen.includes(theirs.slot)) r.seen.push(theirs.slot);
    if (r.keen === mineC.uid) r.keen = undefined;
    got.push(nameOf(theirC)); gave.push(nameOf(mineC));
  }
  for (const i of theirs.stock) { put(stock[i], 1); t.sold.push(i); got.push(itemInfo(stock[i]).name); }
  for (const [id, n] of Object.entries(mine.items)) if (n > 0) { put(id, -n); gave.push(`${n} × ${itemInfo(id).name}`); }
  s.coins += theirs.coins - mine.coins;
  t.spent += theirs.coins - mine.coins; // coins you pay them are theirs to spend
  if (theirs.coins) got.push(`${theirs.coins} coins`);
  if (mine.coins) gave.push(`${mine.coins} coins`);
  if (!t.warmed) { t.warmed = true; r.rapport++; }
  if (r.invite) r.invite.met = true;
  log(s, `Traded ${gave.join(', ')} to ${npc.name} for ${got.join(', ')}.`);
  return null;
}
/** The first stage of a creature's line. */
function familyOf(c: CreatureInst): string {
  let sp = speciesOf(c);
  for (;;) { const prev = SPECIES.find((x) => x.evolvesTo === sp.id); if (!prev) return sp.id; sp = prev; }
}

// ── Offers they text ────────────────────────────────────────────
export interface TextOffer { give: string; want: string; n: number }
/** A small swap they'd like: something in the bag that suits their types, for something worth a bit more. */
export function thinkOfSwap(s: GameState, npc: Npc): TextOffer | null {
  const wants = Object.keys(s.inventory).filter((id) => s.inventory[id] > 0 && (itemInfo(id).kind === 'material' ? npc.types.some((t) => (itemInfo(id).allure?.[t] ?? 0) >= 2) : itemInfo(id).kind === 'treat'));
  if (!wants.length) return null;
  const want = wants[Math.floor(Math.random() * wants.length)];
  const n = Math.min(s.inventory[want], 1 + Math.floor(Math.random() * 3));
  const worth = (itemInfo(want).price ?? 0) * n;
  const gives = ['dewberry', 'salve', 'calm-tea', 'moonberry', 'hush-smoke', 'lure-incense', 'elixir', 'star-charm', 'rousing-salts'].filter((id) => id !== want && ITEMS[id].price! >= worth && ITEMS[id].price! <= worth * 1.5 + 1);
  return gives.length ? { give: gives[Math.floor(Math.random() * gives.length)], want, n } : null;
}
export const swapLock = (s: GameState, o: TextOffer) => ((s.inventory[o.want] ?? 0) < o.n ? `You need ${o.n} × ${itemInfo(o.want).name}.` : null);
export function doSwapOffer(s: GameState, npc: Npc, o: TextOffer): boolean {
  if (swapLock(s, o)) return false;
  s.inventory[o.want] -= o.n;
  if (s.inventory[o.want] <= 0) delete s.inventory[o.want];
  s.inventory[o.give] = (s.inventory[o.give] ?? 0) + 1;
  log(s, `Swapped ${o.n} × ${itemInfo(o.want).name} with ${npc.name} for a ${itemInfo(o.give).name}.`);
  return true;
}
/** A creature of this trainer's they've had an eye on (their types, tradable), or null. */
export function eyedCreature(s: GameState, npc: Npc): CreatureInst | null {
  if (!npcOffers(s, npc).length) return null;
  const pool = owned(s).filter((c) => !mineBlock(s, c) && fits(npc, c) && npcOffers(s, npc).some((x) => !teamBlock(s, npc, c, x.slot)));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}
