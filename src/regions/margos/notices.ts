// What the Notice Boards say.
import type { Notices } from '../types';

export const notices: Notices = (s, t) => ({
  keys: [
    { item: 'canopy-rope', text: `Dahlia waits on the Gloomshade forest floor. This season, ${t.keyTownName(s, 'canopy-rope')} sells the Canopy Rope to get down.` },
    { item: 'root-whistle', text: `The mangrove roots hide Katy. A Root Whistle opens the way, and ${t.keyTownName(s, 'root-whistle')} has them this season.` },
  ],
  tips: [
    'Amber\u2019s Fire Pit is on Kilauea island. Ferries run from Mangrove Port and Kilauea Forge; buy a Ferry Pass at Saltmarsh Landing or the Forge.',
    'Stella only surfaces her fortress for trainers who clear the Iron Coast Gauntlet: a run of local trainers, without leaving the city.',
    'They say Fabian always hides as a villager. Look closely.',
    'Salem only battles trainers who have walked a full lap of Cloud Island. Its portal in Aurora Peak opens at night, and all Winter.',
    'Sunspire Summit holds a legend. Tier 3 climbers with a Summit Pick only.',
    'Down the Sinkhole Stair below Houndmouth Canyon lies Shifting Depths. Leave an offering at the edge of the dark and something that craves it climbs up.',
    'The Research Facility at Quillhaven pays well for released creatures, and best of all for rare ones.',
    'The Battle School at Valor Ridge trains creatures while you travel: a coin per XP.',
    'Be at Circuit Stadium when Turn 100 ends — with all 8 Merits — or the season is over.',
  ],
});
