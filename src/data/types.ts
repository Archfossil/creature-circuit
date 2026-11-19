import type { ElementType } from './schema';

export const TYPES: ElementType[] = ['astral', 'charm', 'electric', 'fire', 'grass', 'rock', 'steel', 'water'];

/** Colors sampled from the official type icons (docs/06-assets.md). */
export const TYPE_COLOR: Record<ElementType, string> = {
  astral: '#9013fe',
  charm: '#fc88fc',
  electric: '#f8e71c',
  fire: '#d0021b',
  grass: '#417505',
  rock: '#b57204',
  steel: '#9b9b9b',
  water: '#50e3c2',
};

export const TYPE_LABEL: Record<ElementType, string> = {
  astral: 'Astral', charm: 'Charm', electric: 'Electric', fire: 'Fire',
  grass: 'Grass', rock: 'Rock', steel: 'Steel', water: 'Water',
};

/** Strong against (deals 2x). From docs/03-combat-rules.md. */
export const STRONG: Record<ElementType, ElementType[]> = {
  astral: ['electric', 'fire'],
  charm: ['astral', 'grass'],
  electric: ['steel', 'water'],
  fire: ['grass', 'steel'],
  grass: ['rock', 'water'],
  rock: ['charm', 'electric'],
  steel: ['astral', 'charm'],
  water: ['fire', 'rock'],
};

/** Multiplier of an attack type against a (possibly dual-typed) defender. */
export function effectiveness(attack: ElementType, defender: ElementType[]): number {
  let m = 1;
  for (const d of defender) {
    if (STRONG[attack].includes(d)) m *= 2;
    else if (STRONG[d].includes(attack)) m *= 0.5;
  }
  // Resisted by both types -> immune (docs: "takes no damage at all")
  if (defender.length === 2 && m === 0.25) return 0;
  return m;
}

export function typeIcon(t: ElementType): string {
  return `assets/types/${t}.png`;
}
