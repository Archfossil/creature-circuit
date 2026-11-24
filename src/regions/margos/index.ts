import type { Region } from '../types';
import { STARTERS } from './codex';
import { NPC_OUTFITS } from './looks';
import { CITIES, MAP_SCALE, TOWNS, edges, nodes } from './map';
import { NPCS } from './npcs';
import { VOICES } from './voices';
import { WEATHER_DICE } from './weather';

export const MARGOS: Region = {
  id: 'margos',
  name: 'Margos',
  map: { scale: MAP_SCALE, nodes, edges, cities: CITIES, towns: TOWNS },
  codex: { starters: STARTERS },
  people: { npcs: NPCS, voices: VOICES, looks: NPC_OUTFITS },
  weather: WEATHER_DICE,
};
