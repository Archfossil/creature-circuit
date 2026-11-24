// How each Rival and Champion texts (engine/messenger.ts decides when). In these lines {you} is the
// trainer's name, {merit} a Merit's name, {place} somewhere on the map, {thing} an item and {creature} one of the trainer's creatures.
import { MARGOS } from '../regions';

export interface Voice {
  /** They won last time, and are offering another go. */
  taunt: string;
  /** They lost last time, and want another go. */
  grudge: string;
  /** The trainer earned {merit}. */
  congrats: string;
  /** They've earned {merit} themselves. */
  news: string;
  /** Just saying hello. */
  hello: string;
  /** Answering something kind, and something cheeky. */
  warm: string;
  cool: string;
  /** Sending a treat. */
  gift: string;
  /** Stood up for a rematch at {place}. */
  stoodUp: string;
  /** Offering to help one creature up after knocking out the whole team. */
  mercy: string;
  /** Offering something for {thing}, and asking about a trade for {creature}. */
  swap: string;
  keen: string;
  /** Setting a side challenge, finishing it first, and being beaten to it. */
  dare: string;
  first: string;
  beaten: string;
}

export const VOICES: Record<string, Voice> = MARGOS.people.voices;
