// What Margos's Arbiters' arenas do (docs/11-arbiters-and-arenas.md). The tricks favour the Arbiter (side 1), and get
// stronger with the challenger's Tier.
import type { ArenaEffect } from '../types';

/** How far a stat or accuracy trick goes. */
const strength = (tier: number) => (tier >= 4 ? 2 : 1);

export const ARENAS: Record<string, ArenaEffect> = {
  // Salem: anyone but an Astral creature may slip
  iceFloes: {
    roundEnd: ({ tier, sides, hasType, roll, hurt }) => {
      for (const si of sides) if (!hasType(si, 'astral') && roll(6) <= (tier >= 3 ? 2 : 1)) hurt(si, 1 + Math.floor(tier / 2), '{n} slipped off the ice floe into the frigid water!');
    },
  },
  // Fabian
  illusion: { stat: (tier, si, k) => (si === 1 && k === 'evasion' ? strength(tier) : 0) },
  // Watson: the great rod discharges across the arena: Electric creatures (dual types too) drink it in, everyone else is shocked
  volts: {
    roundEnd: ({ tier, sides, hasType, roll, hurt, mend }) => {
      if (roll(6) > 2 + Math.floor(tier / 2)) return;
      const n = 1 + Math.floor(tier / 2);
      for (const si of sides) {
        if (hasType(si, 'electric')) mend(si, n, 'The Thunder Spike discharges, and {n} soaks up the current!');
        else hurt(si, n, 'The Thunder Spike discharges into {n}!', 'electric');
      }
    },
  },
  // Amber: every other round
  flames: {
    roundEnd: ({ tier, round, sides, hasType, hurt }) => {
      if (round % 2 === 0) for (const si of sides) if (!hasType(si, 'fire')) hurt(si, 1 + Math.floor(tier / 3), 'Scalding steam vents blast {n}!');
    },
  },
  // Dahlia
  darkness: { accuracy: { label: 'Darkness', value: (tier, si) => (si === 0 ? -strength(tier) : 0) } },
  // Cliff: the plateau shrinks every round, and when it's gone the challenger is rung out (loses) if Cliff still has a creature standing
  crumble: {
    countdown: {
      rounds: (tier) => [10, 10, 9, 9, 8][Math.max(1, Math.min(5, tier)) - 1],
      name: 'Plateau',
      hint: 'Beat Cliff before the plateau is gone, or you’re rung out and lose.',
      leftHint: 'before the plateau is gone',
      surrenderNote: 'Being rung out when the plateau is gone costs none of this.',
      overShort: 'Rung out!',
      over: 'The last of the plateau crumbles away. You’re rung out!',
      near: { 2: 'The plateau edges fall away: two rounds left!', 1: 'The plateau is almost gone: one round left!' },
    },
  },
  // Stella
  fortress: { stat: (tier, si, k) => (si === 1 && (k === 'armor' || k === 'ward') ? strength(tier) : 0) },
  // Katy
  roots: { stat: (tier, si, k) => (si === 0 && k === 'speed' ? -strength(tier) : 0) },
};
