// Every region there is.
import { MARGOS } from './margos';
import type { Region } from './types';

export { MARGOS };
export const REGIONS: Record<string, Region> = { [MARGOS.id]: MARGOS };
/** The region of saves from before they said which, and the one the game opens with. */
export const DEFAULT_REGION = MARGOS.id;
