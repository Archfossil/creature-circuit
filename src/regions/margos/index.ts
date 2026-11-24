import type { Region } from '../types';
import { ARENAS } from './arenas';
import { STARTERS } from './codex';
import { GIMMICKS } from './gimmicks';
import { GUIDE } from './guide';
import { NPC_OUTFITS } from './looks';
import { CITIES, CLASSIC_KEY_TOWNS, DEPTHS_STAIR, KEY_ITEM_TOWNS, MAP_SCALE, ROAMING_KEY_ITEMS, TOWNS, WISP_SPOTS, edges, nodes } from './map';
import { notices } from './notices';
import { NPCS } from './npcs';
import { VOICES } from './voices';
import { WEATHER_DICE } from './weather';

export const MARGOS: Region = {
  id: 'margos',
  name: 'Margos',
  map: {
    scale: MAP_SCALE, nodes, edges, cities: CITIES, towns: TOWNS,
    places: { wispSpots: WISP_SPOTS, roamingKeyItems: ROAMING_KEY_ITEMS, keyItemTowns: KEY_ITEM_TOWNS, classicKeyTowns: CLASSIC_KEY_TOWNS, depthsStair: DEPTHS_STAIR, coasts: ['iron', 'blackSand'] },
    offshore: ['ironwake'],
    walls: { iron: ['#e85d5d', '#f2c14e', '#5da9e9', '#7bc47f'] },
  },
  codex: { species: 'all', starters: STARTERS },
  people: { npcs: NPCS, voices: VOICES, looks: NPC_OUTFITS },
  arenas: ARENAS,
  gimmicks: GIMMICKS,
  home: 'thunder',
  notices,
  guide: GUIDE,
  weather: WEATHER_DICE,
};
