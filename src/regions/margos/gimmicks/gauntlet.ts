// The Iron Coast Gauntlet. Before Stella will battle, a trainer must beat a run of local trainers in a row without leaving
// Iron Coast: 2 per Tier (2, 4, 6, 8, 10), each a level above that Tier's Trainer Hall opponents, with
// the last one a level higher still. Matches can be spread over turns, with Stable rests between
// them, as long as the trainer stays in the city. Leaving resets the count.
// Once cleared, Stella can be challenged at any time, and the Gauntlet never needs repeating.
import type { GameState } from '../../../engine/state';
import type { Gimmick, Tools } from '../../gimmick';

const CITY = 'iron';
const GAUNTLET_TRAINERS = ['Deckhand Ines', 'Dockworker Bram', 'Smith Oriel', 'Lighthouse Keeper Tove', 'Diver Kaito', 'Riveter Juno', 'Harbor Guard Pell', 'Foundry Hand Mags', 'Net-Mender Sol', 'Sea Captain Ardo'];

/** How many trainers it takes at a Tier: 2, 4, 6, 8, 10. */
export const gauntletSize = (tier: number) => 2 * tier;
/** Their level at a Tier: one above Trainer Hall opponents (the final trainer one more). */
export const gauntletLevel = (tier: number, final: boolean, t: Tools) => Math.max(1, t.tierBandLevel(tier) + 2 + (final ? 1 : 0));

/** Where it shows as something to do: in the city, until it's cleared. */
export const gauntletOpen = (s: GameState, at: string) => at === CITY && !s.flags.stellaOpen && !s.merits.includes(CITY);

export function gauntletProgress(s: GameState, t: Tools) {
  const tier = t.tierOf(s), need = gauntletSize(tier);
  const wins = Math.min(need, s.flags.gauntletWins ?? 0);
  return { wins, need, open: !!s.flags.stellaOpen, nextLevel: gauntletLevel(tier, wins + 1 >= need, t) };
}

/** Why the trainer can't take the next match right now (null = they can). */
export function gauntletBlock(s: GameState, t: Tools): string | null {
  if (s.location !== CITY) return 'The Gauntlet is at Iron Coast.';
  if (s.flags.stellaOpen) return 'You’ve cleared the Gauntlet. Stella will see you any time.';
  if (s.merits.includes(CITY)) return 'You already hold Stella’s accolade.';
  if (!s.roster.some((c) => !c.ko)) return 'Your team needs rest first. The Stable is right here.';
  if (s.initiative < t.cityActionCost(s)) return 'Not enough Initiative.';
  return null;
}

export const gauntlet: Gimmick = {
  id: 'gauntlet',
  gate: (s, city, t) => {
    if (city !== CITY) return null;
    if (s.flags.stellaOpen) return { ok: true };
    const g = gauntletProgress(s, t);
    return { ok: false, show: 'gauntlet', reason: `Stella only faces trainers who clear the Iron Coast Gauntlet: ${g.wins}/${g.need} trainers beaten. Leaving the city resets it.` };
  },
  onMove: (s, from, to, t) => {
    if (from !== CITY || to === CITY || s.flags.stellaOpen || !s.flags.gauntletWins) return;
    t.log(s, `Left Iron Coast: the Gauntlet resets (${s.flags.gauntletWins} trainer${s.flags.gauntletWins === 1 ? '' : 's'} beaten).`);
    s.flags.gauntletWins = 0;
  },
  /** The next match: a Steel-leaning local trainer, for a city action's Initiative. */
  battle: (s, t) => {
    if (gauntletBlock(s, t)) return null;
    s.initiative -= t.cityActionCost(s);
    const node = t.here(s);
    const tier = t.tierOf(s);
    const { wins, need } = gauntletProgress(s, t);
    const lvl = gauntletLevel(tier, wins + 1 >= need, t);
    const size = Math.max(1, Math.min(s.roster.filter((c) => !c.ko).length, tier >= 3 ? 3 : 2));
    const team = Array.from({ length: size }, () => t.createCreature(t.pickSpecies(node, t.trainerRarity(tier), lvl, ['steel']).id, lvl));
    for (const c of team) t.autoSpend(c, false);
    const name = GAUNTLET_TRAINERS[wins % GAUNTLET_TRAINERS.length];
    const battle = t.createBattle(t.playerSide(s), { kind: 'trainer', name, team, active: 0, mods: {} }, t.weather(s), { biome: node.biome });
    return { name, battle, match: wins + 1, of: need };
  },
  /** Won: count it, and open Stella's arena once enough are beaten. */
  won: (s, t) => {
    const need = gauntletSize(t.tierOf(s));
    const wins = (s.flags.gauntletWins ?? 0) + 1;
    if (wins >= need) {
      s.flags.stellaOpen = true;
      s.flags.gauntletWins = 0;
      t.log(s, `Cleared the Iron Coast Gauntlet (${need} trainers). Stella will accept your challenge.`);
      return 'Gauntlet cleared! Stella will accept your challenge, now or any time you return.';
    }
    s.flags.gauntletWins = wins;
    return `Gauntlet: ${wins}/${need} trainers beaten. Stay in Iron Coast to keep your progress.`;
  },
  surrenderNote: 'Your Gauntlet progress is kept.',
};
