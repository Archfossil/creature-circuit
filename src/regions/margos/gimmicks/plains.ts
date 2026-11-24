// The Rainbow Plains, behind Lantern Glade. Every new day (odd turns) they take on one type at random (never the
// same two days running): only that type turns up, the ground turns its color, finds are exotic
// (the Forest Floor's and Cloud Island's), and every creature is at least one rarity higher.
import type { ElementType, Rarity } from '../../../data/schema';
import type { GameState } from '../../../engine/state';
import type { Gimmick, Tools } from '../../gimmick';

const mix = (a: number, b: number) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); return (h ^ (h >>> 12)) >>> 0; };
/** The Rainbow Plains' type on this turn's day (turns 1–2 are day 1, 3–4 day 2 …). */
export function prismType(s: GameState, t: Tools, turn = s.turn): ElementType {
  const seed = s.prismSeed ?? 0;
  const day = Math.ceil(Math.max(1, turn) / 2);
  let i = mix(seed, 0) % t.TYPES.length;
  for (let d = 2; d <= day; d++) i = (i + 1 + (mix(seed, d) % (t.TYPES.length - 1))) % t.TYPES.length;
  return t.TYPES[i];
}

const BUMP: Record<Rarity, Rarity> = { common: 'prime', prime: 'apex', apex: 'apex', legendary: 'legendary' };

export const plains: Gimmick = {
  id: 'plains',
  lands: {
    biome: 'prism',
    types: (s, t) => [prismType(s, t)],
    rarity: (r) => BUMP[r],
    rarityNote: '(+1 rarity: the Rainbow Plains)',
    exotic: true,
  },
};
