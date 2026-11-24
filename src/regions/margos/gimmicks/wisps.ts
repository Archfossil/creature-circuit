// Wisps (the Fog Lantern). Only a lantern with a wisp caught in it lights the misty way into Lantern Glade, and the wisp
// flies home when the trainer leaves the Glade and the Rainbow Plains, so every visit takes a new one.
import type { GameState } from '../../../engine/state';
import type { Gimmick, Tools } from '../../gimmick';
import { WISP_SPOTS, inWispRegion } from '../map';

export const LANTERN = 'fog-lantern';

/**
 * Hide a new wisp somewhere on the mainland for this trainer's Fog Lantern: any wild node, town or
 * city that can be walked to without a key item, never `from` (where they stand). The trainer sees
 * where by checking the lantern.
 */
export function rollWisp(s: GameState, t: Tools, from = s.location) {
  const spots = WISP_SPOTS.filter((id) => id !== from);
  s.flags.wispAt = t.pick(spots);
  s.flags.wispSeen = false;
}
/** A Fog Lantern with a wisp in it: the way into Lantern Glade is lit. */
export const wispLit = (s: GameState) => (s.inventory[LANTERN] ?? 0) > 0 && !!s.flags.wisp;

export const wisps: Gimmick = {
  id: 'wisps',
  hidden: inWispRegion,
  // the misty way into Lantern Glade (leaving is always open)
  enter: (s, { node, edge }, t) => (!edge.requires?.wisp || !inWispRegion(node.id) || inWispRegion(s.location) || wispLit(s) ? null
    : t.hasItem(s, LANTERN)
      ? 'The mist is too thick. Catch a wisp in your Fog Lantern to light the way (check the lantern to see where one waits).'
      : 'The mist is too thick. A Fog Lantern (Mistfall) with a wisp caught in it lights the way.'),
  onMove: (s, from, to, t) => {
    // leaving Lantern Glade and the Rainbow Plains: the wisp flies home, and the lantern feels for a new one
    if (inWispRegion(from) && !inWispRegion(to) && s.flags.wisp) {
      s.flags.wisp = false;
      t.log(s, 'Left the Rainbow Plains behind: your wisp drifted home. Check your Fog Lantern to find a new one.');
      rollWisp(s, t, to);
    }
    // arriving where the wisp waits catches it in the lantern
    if (s.flags.wispAt === to && (s.inventory[LANTERN] ?? 0) > 0) {
      s.flags.wispAt = null;
      s.flags.wispSeen = false;
      s.flags.wisp = true;
      s.flags.wispNews = true;
      t.log(s, `Caught a wisp in your Fog Lantern at ${t.node(to)?.name ?? to}. It will light the way to Lantern Glade.`);
    }
  },
  // a brand new lantern: go and find a wisp first
  onBuy: (s, item, t) => { if (item === LANTERN && !s.flags.wisp) rollWisp(s, t); },
  // a Fog Lantern from before wisps feels for its first one
  migrate: (s, t) => { if ((s.inventory[LANTERN] ?? 0) > 0 && s.flags.wispAt === undefined && !s.flags.wisp) rollWisp(s, t); },
  effects: (s) => (wispLit(s) ? [{ id: 'wisp', icon: '💫', name: 'Wisp in your Fog Lantern', text: 'The misty way from Fogbank Path to Lantern Glade is lit. It drifts home when you leave the Glade and the Rainbow Plains.' }] : []),
};
