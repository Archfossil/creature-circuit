// The screens of each region's gimmicks. Only the app loads this: unlike a gimmick's rules, a screen can use anything.
import type { App } from '../ui/app';
import type { Outcome } from '../engine/world';
import { activeRegion } from './active';
import { margosScreens } from './margos/screens';

export interface Screens {
  /** Opened when a gate says to (`Gate.show`). */
  show: Record<string, (app: App) => void>;
  /** Tiles of its own in a city. `cost` is what a city action costs, to show. */
  tiles?(app: App, city: string, cost: string): HTMLElement[];
  /** Instead of a city's Arbiter tile. `won`: what it says once they're beaten. */
  arbiterTile?(app: App, city: string, won: string): HTMLElement | null;
  /** On the map, at the top left. */
  chips?(app: App): HTMLElement[];
  /** More buttons at the bottom of the map. */
  actions?(app: App): { icon: string; label: string; go: () => void }[];
  /** Before a step that can be taken: ask whether to. Null: nothing to ask. */
  beforeMove?(app: App, to: string, cost: number): Promise<boolean> | null;
  /** A sign of a trail was found. */
  trail?(app: App, out: Extract<Outcome, { t: 'trail' }>): Promise<void>;
}

const SCREENS: Record<string, Screens> = { margos: margosScreens };
/** The active region's. */
export const screens = (): Screens => SCREENS[activeRegion().id] ?? { show: {} };
