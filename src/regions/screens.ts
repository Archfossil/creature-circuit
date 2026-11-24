// The screens of each region's gimmicks. Only the app loads this: unlike a gimmick's rules, a screen can use anything.
import type { App } from '../ui/app';
import { activeRegion } from './active';
import { margosScreens } from './margos/screens';

export interface Screens {
  /** Opened when a gate says to (`Gate.show`). */
  show: Record<string, (app: App) => void>;
}

const SCREENS: Record<string, Screens> = { margos: margosScreens };
/** The active region's. */
export const screens = (): Screens => SCREENS[activeRegion().id] ?? { show: {} };
