// What each Rival and Champion wears (data/npcs.ts says who they are). An outfit picks from the same tops,
// hats, hair and patterns as the player's, to suit their character. Skin still comes from their name, and
// Champions keep their cape and gold base. Anyone without an outfit here falls back to a look seeded from their name.
import { npcNamed, type Npc } from '../data/npcs';
import { TYPE_COLOR } from '../data/types';
import { onRegion } from '../regions/active';
import type { Outfit } from '../regions/types';
import { championLook, roamingLook, type TrainerLook } from './trainerModel';

export let NPC_OUTFITS: Record<string, Outfit>;
onRegion((r) => { NPC_OUTFITS = r.people.looks; });

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
