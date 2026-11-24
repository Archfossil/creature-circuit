// Cloud Island (Salem). The portal from Aurora Peak opens at night (even turns), or any time in Winter. On the island a
// trainer can walk the ring at any time, but can only leave through the portal.
// Six steps in a row around the ring, the same way round, is a full lap: Salem will battle that
// trainer from then on. Turning back starts the count again; leaving the island ends the lap.
// Items found there wait in the Cloud satchel until the trainer escapes; being sent home after a wipe loses them.
import type { GameState } from '../../../engine/state';
import type { Gimmick, Tools } from '../../gimmick';
import { CLOUD_RING, isCloudNode } from '../map';
import { cloudEvents } from './salemEvents';

const CITY = 'aurora';
export const isSalem = (city: string) => city === CITY;
export const salemBeaten = (s: GameState) => s.merits.includes(CITY);

/** Is the Cloud Island portal open this turn? */
export const portalOpen = (s: GameState, t: Tools) => t.timeOfDay(s.turn) === 'night' || t.seasonForTurn(s.turn) === 'winter';

export const CLOUD_LAP = CLOUD_RING.length;

export function cloudLapProgress(s: GameState) {
  return { steps: Math.min(CLOUD_LAP, s.flags.cloudLap ?? 0), need: CLOUD_LAP, worthy: !!s.flags.salemWorthy, onIsland: isCloudNode(s.location) };
}

/** Count a step around the ring toward a lap. */
export function stepCloudLap(s: GameState, from: string, to: string, t: Tools) {
  const a = CLOUD_RING.indexOf(from), b = CLOUD_RING.indexOf(to);
  if (a < 0 || b < 0) { if (isCloudNode(to)) { s.flags.cloudLap = 0; s.flags.cloudDir = undefined; } return; }
  const dir: 1 | -1 = (b - a + CLOUD_LAP) % CLOUD_LAP === 1 ? 1 : -1;
  s.flags.cloudLap = s.flags.cloudDir === dir ? (s.flags.cloudLap ?? 0) + 1 : 1;
  s.flags.cloudDir = dir;
  if (s.flags.cloudLap >= CLOUD_LAP && !s.flags.salemWorthy) {
    s.flags.salemWorthy = true;
    t.log(s, 'Walked a full lap of Cloud Island. Salem will accept your challenge.');
  }
}

/** Extra Initiative for each step onto the island: +1 per Tier (Salem makes stronger trainers slog). */
export const cloudStepExtra = (s: GameState, t: Tools) => t.tierOf(s);
/** What's in the Cloud satchel. */
export const satchel = (s: GameState) => Object.entries(s.cloudLoot ?? {}).filter(([, n]) => n > 0);

export const salem: Gimmick = {
  id: 'salem',
  apart: { id: 'cloud', has: isCloudNode, noRides: 'Not on Cloud Island: leave through the portal first.', foundNote: ' (held in your Cloud satchel until you escape)' },
  events: cloudEvents,
  gate: (s, city) => {
    if (city !== CITY) return null;
    if (s.flags.salemWorthy) return { ok: true };
    const lap = cloudLapProgress(s);
    return { ok: false, show: 'cloud', reason: `Salem only faces trainers who have walked a full lap of Cloud Island (${lap.steps}/${lap.need} steps). Its portal opens at night, or any time in Winter.` };
  },
  enter: (s, { edge }, t) => (edge.via === 'portal' && !portalOpen(s, t) ? 'The Cloud Island portal only opens at night (even turns), or any time in Winter.' : null),
  stepExtra: (s, to, t) => (isCloudNode(to) ? cloudStepExtra(s, t) : 0),
  onStep: stepCloudLap,
  onMove: (s, from, to, t, wiped) => {
    if (!isCloudNode(from) || isCloudNode(to)) return;
    // leaving ends any lap in progress
    if (s.flags.cloudLap) { s.flags.cloudLap = 0; s.flags.cloudDir = undefined; }
    // escaping secures the satchel; being sent home after a wipe loses it
    const loot = satchel(s);
    if (loot.length) {
      if (wiped) t.log(s, `Lost the Cloud satchel (${loot.map(([i, n]) => `${n} × ${i}`).join(', ')}) when your team was sent home.`);
      else { for (const [i, n] of loot) s.inventory[i] = (s.inventory[i] ?? 0) + n; t.log(s, `Escaped Cloud Island and secured the Cloud satchel.`); }
    }
    s.cloudLoot = undefined;
  },
  // what's gained on the island goes in the satchel
  keep: (s, item, n) => {
    if (!isCloudNode(s.location)) return false;
    (s.cloudLoot ??= {})[item] = (s.cloudLoot[item] ?? 0) + n;
    return true;
  },
  // in Winter, Aurora Peak is always under Aurora Night
  weather: (s, t) => (s.location === CITY && t.seasonForTurn(s.turn) === 'winter' ? 'aurora' : null),
};
