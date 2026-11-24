// Katy's Root Maze only opens for a Root Whistle.
import type { Gimmick } from '../../gimmick';

const CITY = 'mangrove', WHISTLE = 'root-whistle';

export const katy: Gimmick = {
  id: 'katy',
  gate: (s, city, t) => (city !== CITY ? null
    : t.hasItem(s, WHISTLE) ? { ok: true } : { ok: false, reason: `The mangrove roots hide Katy. You need a Root Whistle (sold in ${t.keyTownName(s, WHISTLE)} this season).` }),
};
