// The screens of each region's gimmicks. Only the app loads this: unlike a gimmick's rules, a screen can use anything.
import type { App } from '../ui/app';
import { activeRegion } from './active';
import { margosScreens } from './margos/screens';

export interface Screens {
  /** Opened when a gate says to (`Gate.show`). */
  show: Record<string, (app: App) => void>;
  /** Tiles of its own in a city. `cost` is what a city action costs, to show. */
  tiles?(app: App, city: string, cost: string): HTMLElement[];
}

const SCREENS: Record<string, Screens> = { margos: margosScreens };
/** The active region's. */
export const screens = (): Screens => SCREENS[activeRegion().id] ?? { show: {} };
