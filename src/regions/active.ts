// The region being played. Only one is at a time, so the game's lists (NODE_BY_ID, CITIES, NPCS …) are that region's,
// and are worked out again whenever it changes. Anything that handles several saves at once must ask each save for
// its region instead.
import { MARGOS } from './margos';
import type { Region } from './types';

let region: Region = MARGOS;
const rebuilds: ((r: Region) => void)[] = [];

/**
 * Work something out from the region: now, and again whenever it changes. Anything kept from a region's data (a list,
 * a table, a cache) must be made here, or it would keep the last region's answer. They run in the order the game
 * loaded them, so one can use what an earlier file made. Nothing here may roll dice.
 */
export function onRegion(rebuild: (r: Region) => void) { rebuilds.push(rebuild); rebuild(region); }

export const activeRegion = () => region;

/** Change region. A journey in progress must be put away first: its trainer is standing on the old map. */
export function setRegion(r: Region) {
  if (r === region) return;
  region = r;
  for (const rebuild of rebuilds) rebuild(r);
}
