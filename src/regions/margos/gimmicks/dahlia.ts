// The Forest Floor (Dahlia). One dark node below Gloomshade, reached by rope (Canopy Rope). Exploring it rolls a d8:
// 1–2 nothing (the team loses 1 Morale: they fear the dark), 3–4 a wild creature (hard to run from),
// 5–6 an exotic find, 7–8 a sign of Dahlia's Trail. 3 + Tier signs lead to her arena. Leaving the
// Forest Floor, by choice or by being sent home, loses the trail.
import type { GameState } from '../../../engine/state';
import type { Outcome } from '../../../engine/world';
import type { Gimmick, Tools } from '../../gimmick';
import { floorEvents } from './dahliaEvents';

const CITY = 'gloom', FLOOR = 'forestfloor';

/** Signs of Dahlia's Trail needed to find her arena: 3, +1 per Tier. */
export const trailNeeded = (s: GameState, t: Tools) => 3 + t.tierOf(s);
export function trailProgress(s: GameState, t: Tools) {
  const need = trailNeeded(s, t);
  const steps = Math.min(need, s.flags.dahliaTrail ?? 0);
  return { steps, need, found: steps >= need };
}
export const dahliaBeaten = (s: GameState) => s.merits.includes(CITY);
export const onFloor = (id: string) => id === FLOOR;
/** The city above, whose Arbiter hides down here. */
export const aboveFloor = (id: string) => id === CITY;

/** The Forest Floor's explore die: a d8 while Dahlia's Trail matters, a d6 (no trail results) once she's beaten. */
export const floorDie = (s: GameState) => (dahliaBeaten(s) ? 6 : 8);

export const dahlia: Gimmick = {
  id: 'dahlia',
  apart: { id: 'floor', has: onFloor, noRides: 'Not on the Forest Floor: climb back up first.', found: 'Something exotic glints in the dark!', met: 'Something moves in the dark…', noEscape: 'Couldn\'t escape! The dark Forest Floor hems you in.' },
  events: floorEvents,
  gate: (s, city, t) => {
    if (city !== CITY) return null;
    if (!onFloor(s.location)) return { ok: false, reason: `Dahlia's arena hides on the Forest Floor below Gloomshade. Climb down with a Canopy Rope (sold in ${t.keyTownName(s, 'canopy-rope')} this season) and follow her trail.` };
    if (dahliaBeaten(s)) return { ok: true }; // you know the way to her arena now
    const p = trailProgress(s, t);
    return p.found ? { ok: true } : { ok: false, show: 'floor', reason: `Follow Dahlia's Trail to find her arena: ${p.steps}/${p.need} signs found. Keep exploring the Forest Floor.` };
  },
  // leaving, by choice or by defeat, loses the trail
  onMove: (s, from, to, t) => {
    if (!onFloor(from) || onFloor(to) || !s.flags.dahliaTrail) return;
    t.log(s, `Left the Forest Floor: Dahlia's Trail is lost (${s.flags.dahliaTrail} found).`);
    s.flags.dahliaTrail = 0;
  },
  explore: (s, t): Outcome | null => {
    if (!onFloor(s.location)) return null;
    const node = t.here(s);
    s.stats.explored++;
    const die = floorDie(s);
    let r = t.roll(die);
    if (s.flags.lure) { s.flags.lure = false; r = 3 + (r % 2); }
    // Hush Smoke: a 3 is a quiet Nothing (no fear of the dark), a 4 an exotic find; it's spent on any roll
    if (s.flags.repel) {
      s.flags.repel = false;
      if (r === 3) return { t: 'nothing', roll: r, die, hushed: true };
      if (r >= 4 && r <= 6) return { ...t.discoverItem(s, node, r, t.exoticFind, die), hushed: r === 4 || undefined } as Outcome;
    }
    const encounterTo = t.ability(s) === 'sweetScent' ? 5 : 4;
    if (r <= 2) {
      for (const c of s.roster) if (!c.ko) c.morale = Math.max(0, c.morale - 1);
      return { t: 'nothing', roll: r, die, dark: true };
    }
    if (r <= encounterTo) {
      const { stars, rarity } = t.rollRarity(s, node);
      const level = t.wildLevel(s, node);
      // the Forest Floor is always dark: night creatures are out
      const sp = t.pickSpecies(node, rarity, level, t.weather(s).encounter, 'night');
      const wild = t.createCreature(sp.id, level);
      if (!s.dex.seen.includes(sp.id)) s.dex.seen.push(sp.id);
      const battle = t.createBattle(t.playerSide(s), { kind: 'wild', name: `Wild ${sp.name}`, team: [wild], active: 0, mods: {} }, t.weather(s), { biome: node.biome, quickStep: t.ability(s) === 'quickStep', hardRun: true });
      return { t: 'encounter', roll: r, stars, rarity, battle, die };
    }
    if (r <= 6) return t.discoverItem(s, node, r, t.exoticFind, die);
    s.flags.dahliaTrail = (s.flags.dahliaTrail ?? 0) + 1;
    const p = trailProgress(s, t);
    if (p.found && s.flags.dahliaTrail === p.need) t.log(s, 'Followed Dahlia’s Trail to her arena on the Forest Floor.');
    return { t: 'trail', roll: r, die: 8, steps: p.steps, need: p.need, found: p.found };
  },
  trailText: (o) => (o.found ? 'followed Dahlia’s Trail to her arena' : `found a sign of Dahlia’s Trail (${o.steps}/${o.need})`),
};
