// The trainers with names: Rivals (met on the road and in Trainer Halls, and growing through the season)
// and Champions (the established field of the Creature Circuit, who tour the towns before it). Who they
// are lives in the region's package (src/regions); how they behave (teams, records, standings, invitations) is in engine/npcs.ts.
// Everyone else a trainer bumps into is a passer-by with a made-up name (`passerBy`).
import type { ElementType } from './schema';
import { MARGOS } from '../regions';

export interface Npc {
  id: string;
  name: string;
  kind: 'rival' | 'champion';
  /** Favourite types, best loved first (their Ace's type). */
  types: [ElementType, ElementType];
  /** Home city (a city id). Each city is home to one Champion, whose first type is the city's: they can sponsor a trainer there (npcs.ts → sponsor). */
  home: string;
  /** How good they are, for the Circuit Standings (rivals 30–55, Champions 70–95). */
  rating: number;
  blurb: string;
  lines: { greet: string; gloat: string; concede: string; chat: string };
}

export const NPCS: Npc[] = MARGOS.people.npcs;
export const NPC_BY_ID: Record<string, Npc> = Object.fromEntries(NPCS.map((x) => [x.id, x]));
export const npcNamed = (name: string) => NPCS.find((x) => x.name === name);

// ── Passers-by ───────────────────────────────────────────────────
const ROAD = ['Hiker', 'Ranger', 'Birder', 'Camper', 'Angler', 'Botanist', 'Geologist', 'Drifter', 'Scout', 'Painter'];
const HALL = ['Veteran', 'Captain', 'Scout', 'Ranger', 'Botanist', 'Angler'];
const FIRST = ['Rosa', 'Theo', 'Malik', 'Ines', 'Rhea', 'Kane', 'Ola', 'Wren', 'Mira', 'Bo', 'Lio', 'Ode', 'Petra', 'Anders', 'Suki', 'Fen', 'Dario', 'Elke', 'Gus', 'Hana', 'Iris', 'Jonah', 'Kaya', 'Lars', 'Mabel', 'Nico', 'Oona', 'Paz', 'Quinn', 'Remy', 'Sana', 'Tomas', 'Uma', 'Vito', 'Yara', 'Zeke'];
const any = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
/** A one-off trainer's name: a job and a first name. They have no Ace, don't grow and leave no contact. */
export const passerBy = (where: 'road' | 'hall') => `${any(where === 'road' ? ROAD : HALL)} ${any(FIRST)}`;
