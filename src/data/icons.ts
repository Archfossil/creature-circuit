// Custom icons, drawn wherever the game's text has the emoji they stand for. Text stays plain text (saves, logs,
// tooltips, notifications and dropdowns show the emoji); ui/dom.ts → `richText` draws the image on screen.
// Art: public/assets/icons/<name>.png (160px, made from the 512px originals in art/icons/).
import type { ElementType } from './schema';

/**
 * An emoji that means more than one thing is told apart by an invisible variation selector after it, so only
 * the meaning we have art for changes. `mark('🗿', 1)` still looks like 🗿 wherever images can't be shown.
 */
const mark = (emoji: string, n: number) => emoji + String.fromCharCode(0xfe00 + n);

export const COIN = '💰';
/** The Merchant style's 💰: not the coin icon. */
export const MERCHANT = mark('💰', 1);
export const STAGGER = mark('💥', 1);
export const PLAIN_TOTEM = mark('🗿', 1);
const TOTEM_ORDER: ElementType[] = ['astral', 'charm', 'electric', 'fire', 'grass', 'rock', 'steel', 'water'];
export const typedTotem = (t: ElementType) => mark('🗿', 2 + TOTEM_ORDER.indexOf(t));
/** Rarity die faces. */
export const STAR_FACE = { full: mark('★', 1), half: mark('☆', 1), blank: mark('🚫', 1) } as const;

/** Text → icon name, or null to keep the emoji. */
const ICONS: Record<string, string | null> = {
  [COIN]: 'coin', [MERCHANT]: null, [STAGGER]: 'status-stagger',
  '🍒': 'item-dewberry', '🍑': 'item-duskberry', '🕊️': 'item-homing-feather', '🎎': 'item-effigy',
  '⚫': 'mat-ember-charcoal', '⬜': 'mat-river-chalk', '💮': 'mat-marsh-lotus', '🍯': 'mat-heartwood-resin',
  '➰': 'key-canopy-rope', '🌄': 'biome-canyon', '💫': 'wisp',
  [PLAIN_TOTEM]: 'item-totem', ...Object.fromEntries(TOTEM_ORDER.map((t) => [typedTotem(t), `totem-${t}`])),
  [STAR_FACE.full]: 'die-star-full', [STAR_FACE.half]: 'die-star-half', [STAR_FACE.blank]: 'die-star-blank',
};
export const ICON_NAMES = [...new Set(Object.values(ICONS).filter((x): x is string => !!x))];
export const iconUrl = (name: string) => `assets/icons/${name}.png`;
/** The icon for a text that is just one emoji (an item's or biome's `icon`), if it has one. */
export const iconFor = (text: string): string | null => ICONS[text] ?? null;

// longest first, so a marked emoji wins over the plain one
const RE = new RegExp(`(${Object.keys(ICONS).sort((a, b) => b.length - a.length).join('|')})`, 'u');
/** Split text into plain pieces and icons; null when it has no icons (nearly always). */
export function splitIcons(text: string): (string | { name: string; emoji: string })[] | null {
  if (!RE.test(text)) return null;
  const out = text.split(RE).filter(Boolean).map((p) => { const name = iconFor(p); return name ? { name, emoji: p } : p; });
  return out.some((p) => typeof p !== 'string') ? out : null;
}
