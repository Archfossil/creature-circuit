// What each Rival and Champion wears (data/npcs.ts says who they are). An outfit picks from the same tops,
// hats, hair and patterns as the player's, to suit their character. Skin still comes from their name, and
// Champions keep their cape and gold base. Anyone without an outfit here falls back to a look seeded from their name.
import { npcNamed, type Npc } from '../data/npcs';
import { TYPE_COLOR } from '../data/types';
import { championLook, roamingLook, type TrainerLook } from './trainerModel';

type Outfit = Omit<TrainerLook, 'skin' | 'rim' | 'cape' | 'emblem'>;

export const NPC_OUTFITS: Record<string, Outfit> = {
  // Rivals
  juniper: { jacket: 'overalls', outfit: '#4f9a4a', accent: '#ffc2dc', topPattern: 'dots', hat: 'bucket', hatColor: '#ff8fc8', hatAccent: '#fff8e8', hatPattern: 'dots', hairStyle: 'braid', hair: '#b8432f', hairAccent: '#8fd36b', pants: '#4f9a4a' },
  ozzie: { jacket: 'vest', outfit: '#e0b020', accent: '#6b6577', topPattern: 'checks', hat: 'headband', hatColor: '#5a5f70', hatAccent: '#ffd84a', hatPattern: 'badge', hairStyle: 'spiky', hair: '#4a3226', hairAccent: '#ffe45c', hairPattern: 'tips', pants: '#3a3f55', pack: true },
  dex: { jacket: 'jacket', outfit: '#d8482d', accent: '#2b2a33', topPattern: 'chevrons', hat: 'backcap', hatColor: '#2b2a33', hatAccent: '#ff8a3d', hatPattern: 'panels', hairStyle: 'spiky', hair: '#7a4a2a', hairAccent: '#ff8a3d', hairPattern: 'fringe', pants: '#a88a5c', pack: true },
  calla: { jacket: 'poncho', outfit: '#2a8a9a', accent: '#d8e8b0', topPattern: 'stripes', hat: 'brim', hatColor: '#c9a86a', hatAccent: '#2f9e6a', hatPattern: 'band', hairStyle: 'long', hair: '#2b2a33', hairAccent: '#5fd3e8', hairPattern: 'tips', pants: '#4a5a3a' },
  tavi: { jacket: 'coat', outfit: '#3a2f7a', accent: '#ffe45c', topPattern: 'dots', hat: 'beanie', hatColor: '#2a2358', hatAccent: '#ffe45c', hatPattern: 'dots', hairStyle: 'streak', hair: '#e9e6ef', hairAccent: '#b05cff', hairPattern: 'plain', pants: '#2b2a33' },
  bex: { jacket: 'overalls', outfit: '#5a6478', accent: '#d8783d', hat: 'cap', hatColor: '#d8783d', hatAccent: '#e8e2d4', hatPattern: 'badge', hairStyle: 'mohawk', hair: '#b8432f', hairAccent: '#ff8a3d', pants: '#5a6478' },
  lune: { jacket: 'vest', outfit: '#b0408a', accent: '#ffd84a', topPattern: 'pinstripes', hat: 'tophat', hatColor: '#3a2350', hatAccent: '#ff8fc8', hatPattern: 'band', hairStyle: 'curls', hair: '#2b2a33', hairAccent: '#ff8fc8', hairPattern: 'streaks', pants: '#3a2350' },
  corrin: { jacket: 'poncho', outfit: '#8a7a66', accent: '#4a4a55', topPattern: 'chevrons', hat: 'ushanka', hatColor: '#5a5f70', hatAccent: '#d8cbb4', hairStyle: 'short', hair: '#6b6577', pants: '#5a4a3a' },
  pim: { jacket: 'tee', outfit: '#ff8fc8', accent: '#ffe45c', topPattern: 'stripes', hat: 'beret', hatColor: '#ffcc33', hatAccent: '#ff6fb5', hatPattern: 'dots', hairStyle: 'pigtails', hair: '#c99a4a', hairAccent: '#ff6fb5', hairPattern: 'tips', pants: '#3d8bff', pack: true },
  wes: { jacket: 'pouch', outfit: '#1f5a9a', accent: '#ffe45c', topPattern: 'stripes', hat: 'cap', hatColor: '#fff8e8', hatAccent: '#1f3a93', hatPattern: 'band', hairStyle: 'ponytail', hair: '#c99a4a', hairAccent: '#5fd3e8', hairPattern: 'streaks', pants: '#e8e2d4' },
  nadia: { jacket: 'coat', outfit: '#8a2338', accent: '#ff8a3d', topPattern: 'pinstripes', hat: 'none', hairStyle: 'bun', hair: '#2b2a33', hairAccent: '#ff6b3d', hairPattern: 'split', pants: '#2b2a33' },
  sol: { jacket: 'tee', outfit: '#e8b82f', accent: '#5aa83d', topPattern: 'checks', hat: 'cowboy', hatColor: '#c9924a', hatAccent: '#5aa83d', hatPattern: 'band', hairStyle: 'curls', hair: '#c99a4a', hairAccent: '#fff8e8', pants: '#7a5a3a', pack: true },

  // Champions: all caped (the cape takes the accent, or the outfit under gold trim)
  ivo: { jacket: 'coat', outfit: '#4a5568', accent: '#ffd84a', topPattern: 'chevrons', hat: 'none', hairStyle: 'short', hair: '#6b6577', hairAccent: '#e9e6ef', hairPattern: 'tips', pants: '#2b2a33' },
  selene: { jacket: 'coat', outfit: '#2f2a6b', accent: '#cbb8ff', topPattern: 'dots', hat: 'beret', hatColor: '#2f2a6b', hatAccent: '#cbb8ff', hatPattern: 'badge', hairStyle: 'long', hair: '#e9e6ef', hairAccent: '#9b5cd6', hairPattern: 'tips', pants: '#2b2a33' },
  marisol: { jacket: 'vest', outfit: '#1f8a9a', accent: '#8fd36b', topPattern: 'stripes', hat: 'brim', hatColor: '#e8d9a8', hatAccent: '#ff6b3d', hatPattern: 'band', hairStyle: 'braid', hair: '#2b2a33', hairAccent: '#5fd3e8', hairPattern: 'streaks', pants: '#e8e2d4' },
  dez: { jacket: 'jacket', outfit: '#2b2a33', accent: '#ffe02f', topPattern: 'chevrons', hat: 'headband', hatColor: '#ff3d3d', hatAccent: '#ffe02f', hatPattern: 'stripes', hairStyle: 'mohawk', hair: '#ff5a2f', hairAccent: '#ffe02f', hairPattern: 'tips', pants: '#d8483d' },
  okon: { jacket: 'pouch', outfit: '#9a4a2a', accent: '#e8c890', topPattern: 'checks', hat: 'headband', hatColor: '#e8e2d4', hatAccent: '#d8482d', hatPattern: 'badge', hairStyle: 'bun', hair: '#2b2a33', hairAccent: '#d8482d', pants: '#5a4a3a' },
  hale: { jacket: 'coat', outfit: '#2f5a3a', accent: '#b8a0e0', topPattern: 'pinstripes', hat: 'ushanka', hatColor: '#4a3a2a', hatAccent: '#c9b48a', hatPattern: 'badge', hairStyle: 'ponytail', hair: '#e9e6ef', hairAccent: '#8fd36b', pants: '#5a4a3a' },
  bram: { jacket: 'vest', outfit: '#c04a8a', accent: '#d5dbe8', topPattern: 'checks', hat: 'tophat', hatColor: '#4a4a5a', hatAccent: '#ff8fc8', hatPattern: 'badge', hairStyle: 'streak', hair: '#2b2a33', hairAccent: '#d5dbe8', pants: '#3a3f55' },
  noor: { jacket: 'jacket', outfit: '#e0562f', accent: '#5fd3e8', topPattern: 'stripes', hat: 'backcap', hatColor: '#a51d2d', hatAccent: '#5fd3e8', hatPattern: 'panels', hairStyle: 'pigtails', hair: '#4a3226', hairAccent: '#5fd3e8', hairPattern: 'split', pants: '#2b2a33' },
};

/** A Rival's or Champion's mini. */
export function npcLook(npc: Npc): TrainerLook {
  const base = npc.kind === 'champion' ? championLook(npc.name) : roamingLook(npc.name);
  const o = NPC_OUTFITS[npc.id];
  return o ? { ...base, pack: false, ...o, rim: npc.kind === 'champion' ? base.rim : TYPE_COLOR[npc.types[0]] } : base;
}

/** The mini of an opposing trainer, by name: a Rival's or Champion's own look, or one seeded from the name. */
export function opponentLook(name: string, champion = false): TrainerLook {
  const npc = npcNamed(name);
  return npc ? npcLook(npc) : champion ? championLook(name) : roamingLook(name);
}
