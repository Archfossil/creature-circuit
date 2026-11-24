// Shifting Depths: Explore the Depths.
import type { Rarity, ElementType, Species } from '../../../data/schema';
import type { Battle } from '../../../engine/battle';
import type { Star } from '../../../engine/dice';
import type { GameState } from '../../../engine/state';
import type { Tools } from '../../gimmick';
import { DEPTHS_STAIR } from '../map';

const TOWN = 'depths';
export const inDepths = (id: string) => id === TOWN;

/** Initiative to Explore the Depths (plus one offering material). */
export const DEPTHS_COST = 1;

/** The types an offering material calls up from the Depths, with how strongly (its allure). */
export function depthsCalls(material: string, t: Tools): { type: ElementType; w: number }[] {
  const allure = t.itemInfo(material).allure ?? {};
  return (Object.entries(allure) as [ElementType, number][]).filter(([, w]) => w > 0).map(([type, w]) => ({ type, w })).sort((a, b) => b.w - a.w);
}

/** Why the trainer can't Explore the Depths with this material right now (null = they can). */
export function depthsBlock(s: GameState, material: string, t: Tools): string | null {
  if (s.location !== TOWN) return 'You need to be at Shifting Depths.';
  if (s.initiative < DEPTHS_COST) return `Exploring the Depths takes ${DEPTHS_COST} Initiative.`;
  if (!s.roster.some((c) => !c.ko)) return 'Your team needs rest before going down.';
  if (t.itemInfo(material).kind !== 'material' || !depthsCalls(material, t).length) return 'Offer a material that creatures crave.';
  if ((s.inventory[material] ?? 0) < 1) return `You don’t have any ${t.itemInfo(material).name}.`;
  return null;
}

/**
 * Explore the Depths: leave an offering material at the edge of the dark and a wild creature that
 * craves it answers. It's one of the material's types (stronger allure, likelier), with rarity rolled
 * as at the Sinkhole Stair (a rare area) and that node's level. It has already accepted the offering,
 * so the material's bonus counts toward recruiting it (s.flags.depthsOffering).
 */
export function exploreDepths(s: GameState, material: string, t: Tools): { stars: { face: number; star: Star }[]; rarity: Rarity; battle: Battle } | null {
  if (depthsBlock(s, material, t)) return null;
  s.initiative -= DEPTHS_COST;
  t.addItem(s, material, -1);
  const stair = t.node(DEPTHS_STAIR);
  const { stars, rarity } = t.rollRarity(s, stair);
  const level = t.wildLevel(s, stair);
  const sp = depthsSpecies(material, rarity, level, t);
  const wild = t.createCreature(sp.id, level);
  if (!s.dex.seen.includes(sp.id)) s.dex.seen.push(sp.id);
  s.flags.depthsOffering = { uid: wild.uid, item: material };
  s.stats.explored++;
  t.log(s, `Left ${t.itemInfo(material).name} at the edge of the Depths. A wild ${sp.name} climbed up to claim it.`);
  const battle = t.createBattle(t.playerSide(s), { kind: 'wild', name: `Wild ${sp.name}`, team: [wild], active: 0, mods: {} }, t.weather(s), { biome: 'canyon', quickStep: t.ability(s) === 'quickStep' });
  return { stars, rarity, battle };
}

/** A species that would accept this material: one of its types matches the material's allure. */
export function depthsSpecies(material: string, rarity: Rarity, level: number, t: Tools): Species {
  const calls = depthsCalls(material, t);
  const appeal = (sp: Species) => Math.max(0, ...sp.types.map((x) => calls.find((c) => c.type === x)?.w ?? 0));
  const cap = t.stageCapFor(level);
  const fits = (sp: Species) => sp.rarity !== 'legendary' && appeal(sp) > 0;
  let list = t.species().filter((sp) => fits(sp) && sp.rarity === rarity && sp.stage <= cap);
  if (!list.length) list = t.species().filter((sp) => fits(sp) && sp.stage <= cap);
  if (!list.length) list = t.species().filter(fits);
  if (!list.length) return t.nearest(calls.map((c) => c.type), rarity, cap);
  return t.weightedPick(list.map((sp) => ({ v: sp, w: appeal(sp) * (sp.stage === cap ? 3 : 1) })));
}
