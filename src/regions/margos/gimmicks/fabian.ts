// Fabian hides among the townsfolk of Hollow Crest, and battles whoever finds him (once, for good).
import type { Gimmick } from '../../gimmick';

const CITY = 'hollow';

export const fabian: Gimmick = {
  id: 'fabian',
  gate: (s, city) => (city !== CITY ? null : s.flags.fabianFound ? { ok: true } : { ok: false, show: 'fabian', reason: 'Fabian is hiding somewhere in town, in disguise.' }),
};
