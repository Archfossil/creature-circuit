export const roll = (sides: number): number => 1 + Math.floor(Math.random() * sides);
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const uid = () => Math.random().toString(36).slice(2, 10);

export function weightedPick<T>(items: { v: T; w: number }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const i of items) { if ((r -= i.w) <= 0) return i.v; }
  return items[items.length - 1].v;
}

/** Rarity star die: 1-2 blank, 3-4 half star, 5-6 full star. */
export type Star = 'blank' | 'half' | 'full';
export function starDie(): { face: number; star: Star } {
  const face = roll(6);
  return { face, star: face <= 2 ? 'blank' : face <= 4 ? 'half' : 'full' };
}

/** Clash die by creature level. */
export function clashDie(level: number): number {
  if (level <= 3) return 4;
  if (level <= 6) return 6;
  if (level <= 9) return 8;
  if (level <= 12) return 10;
  return 12;
}
