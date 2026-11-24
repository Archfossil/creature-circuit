// Margos's weather: each season's die, one face per weather (data/content.ts → WEATHER).
import type { Season } from '../../data/content';

export const WEATHER_DICE: Record<Season, string[]> = {
  spring: ['clear', 'clear', 'rain', 'rain', 'bloom', 'windy'],
  summer: ['clear', 'clear', 'heat', 'storm', 'drought', 'rain'],
  autumn: ['clear', 'fog', 'windy', 'rain', 'overcast', 'aurora'],
  winter: ['clear', 'snow', 'blizzard', 'aurora', 'fog', 'overcast'],
};
