// Rivals and Champions (data/npcs.ts): the teams they bring, each trainer's history with them, who turns
// up where, rematch invitations, Revenge, and the Circuit Standings that fill the Finals' bracket.
//
// Most of it is worked out from the game's seed and the turn rather than stored, so everyone in a match
// sees the same teams and the same tour, and saves stay small. What a trainer's own save keeps
// (GameState.npcs) is their history with each one they've met.
import type { ElementType, Species } from '../data/schema';
import { NPCS, NPC_BY_ID, type Npc } from '../data/npcs';
import { CITIES, NODE_BY_ID, TOWNS, isCloudNode } from '../data/map';
import { SPECIES, SPECIES_BY_ID } from '../data/species';
import { NATURES, itemInfo } from '../data/content';
import type { GameState } from './state';
import { earnCoins, log, record, tierOf } from './state';
import { dareTurn, type Dare } from './dares';
import { textStoodUp, textTurn, type Chat } from './messenger';
import { createBattle, type Battle } from './battle';
import { createCreature, fullRestore, gainXp, recommendPlaybook, type CreatureInst } from './creature';
import { teach } from './imprints';
import { assignSwapMoves } from './swaps';
import { teamworkCap } from './teamwork';
import { cityActionCost, here, playerSide, stageCapFor, tierBandLevel, weather } from './world';

/** A trainer's history with one Rival or Champion. */
export interface NpcRecord {
  /** The turn they first met. */
  met: number;
  won: number;
  lost: number;
  /** Losses to them since last beating them: what a win now avenges. */
  owed: number;
  /** How they feel about this trainer (starts at 0). */
  rapport: number;
  /** Which of their creatures have been seen (slots of `npcFamilies`; 0 is the Ace). */
  seen: number[];
  revenges: number;
  last?: { turn: number; at: string; won: boolean };
  /** The stay (npcStay) they last chatted in. */
  chatted?: number;
  invite?: Invite;
  /** Texts with them (engine/messenger.ts). */
  chat?: Chat;
  /** Trades this stay (engine/npcTrade.ts). */
  trade?: { stay: number; sold: number[]; spent: number; warmed?: boolean };
  /** Creatures of this trainer's that now fill slots on their team. */
  swaps?: Record<number, { species: string; nature: string; nickname?: string; imprints?: CreatureInst['imprints'] }>;
  /** A creature of this trainer's (uid) they've said they want. */
  keen?: string;
  /** A side challenge under way, when the last one ended, and how they've gone (engine/dares.ts). */
  dare?: Dare;
  dared?: number;
  daresWon?: number;
  daresLost?: number;
  /** A Champion's offer to sponsor this trainer has been announced. */
  offered?: boolean;
}
/** A rematch arranged: they're at `at` from turn `from` until the end of turn `until`. */
export interface Invite { at: string; from: number; until: number; /** You've seen each other there. */ met?: boolean }

export const RIVALS = NPCS.filter((x) => x.kind === 'rival');
export const CHAMPIONS = NPCS.filter((x) => x.kind === 'champion');

// ── Seeded randomness ───────────────────────────────────────────
const hash = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; };
/** A repeatable random number (0–1) for this game. */
export const chanceOf = (s: GameState, key: string) => { let t = hash(`${s.prismSeed ?? 0}|${key}`) + 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
/** Run `fn` with Math.random replaced by a repeatable sequence (it must not be async). */
export function seededly<T>(seed: string, fn: () => T): T {
  const real = Math.random;
  let i = 0;
  Math.random = () => { let t = hash(`${seed}|${i++}`); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = real; }
}

// ── Growth and teams ────────────────────────────────────────────
/** The turns on which Rivals and Champions move up a tier. */
export const NPC_TIER_TURNS = [1, 20, 40, 60, 80];
export const npcTier = (turn: number) => NPC_TIER_TURNS.filter((t) => turn >= t).length;
/** How many creatures they own at each tier (the Ace included), and how many they bring. */
const OWNED = [2, 3, 4, 4, 5];
const FIELDED = [2, 2, 3, 3, 3];

/** A battle's level: halfway between the season's pace and the challenger's own, a level above local trainers. */
export function npcLevel(s: GameState, npc: Npc): number {
  const pace = (tierBandLevel(npcTier(s.turn)) + tierBandLevel(tierOf(s))) / 2;
  return Math.max(1, Math.round(pace) + (npc.kind === 'champion' && npcTier(s.turn) === 1 ? 2 : 1)); // (Champions are ahead of everyone early on)
}

const lineFrom = (base: Species): Species[] => { const out = [base]; while (out[out.length - 1].evolvesTo) out.push(SPECIES_BY_ID[out[out.length - 1].evolvesTo!]); return out; };
const formAt = (base: Species, level: number) => { const line = lineFrom(base); return line[Math.min(line.length, stageCapFor(level)) - 1]; };
const families = (rarity: Species['rarity'], fits: (types: ElementType[]) => boolean) => SPECIES.filter((x) => x.stage === 1 && x.evolvesTo && x.rarity === rarity && fits(x.types));
/** Their creatures' families (base species), the Ace first. The Ace is always the same; the rest are this game's. */
export function npcFamilies(s: GameState, npc: Npc): Species[] {
  const [a, b] = npc.types;
  const aceRarity = npc.kind === 'champion' ? 'apex' : 'prime';
  const ace = families(aceRarity, (t) => t.includes(a) && t.includes(b))[0] ?? families(aceRarity, (t) => t[0] === a)[0];
  const out = [ace];
  const want: Species['rarity'][] = npc.kind === 'champion' ? ['prime', 'prime', 'apex', 'apex'] : ['common', 'common', 'prime', 'prime'];
  want.forEach((rarity, i) => {
    // mostly their two types; now and then something else turns their head
    const type = npc.types[i % 2];
    const pool = families(rarity, (t) => t.includes(type)).filter((x) => !out.includes(x));
    out.push(pool[Math.floor(chanceOf(s, `${npc.id}:family:${i}`) * pool.length)]);
  });
  const swaps = recordWith(s, npc)?.swaps ?? {};
  // a creature this trainer traded them has taken a slot
  return out.filter(Boolean).map((f, i) => SPECIES_BY_ID[swaps[i]?.species ?? ''] ?? f);
}
/** How much energy they've imprinted on a creature they teach, at each tier. */
const TAUGHT = { rival: [0, 1, 1, 2, 2], champion: [1, 1, 2, 2, 3] };
/** How many of their creatures they teach. */
const TEACHES = { rival: 0.6, champion: 0.85 };
/** The favourite type they teach a creature of theirs that isn't of that type, and how much of it. Null: it keeps to its own. */
export function taughtTo(s: GameState, npc: Npc, slot: number, sp: Species): { type: ElementType; n: number } | null {
  const n = TAUGHT[npc.kind][npcTier(s.turn) - 1];
  const type = npc.types.find((t) => !sp.types.includes(t));
  return n && type && chanceOf(s, `${npc.id}:teach:${slot}`) < TEACHES[npc.kind] ? { type, n } : null;
}
/** Built creatures, to copy (picking a playbook is slow). */
const built = new Map<string, string>();
/** One of their creatures as it stands at a level. */
export function npcCreature(s: GameState, npc: Npc, slot: number, level: number, as?: { species: string; nature: string }): CreatureInst {
  const sp = formAt(as ? SPECIES_BY_ID[as.species] : npcFamilies(s, npc)[slot], level);
  const swap: { nature: string; nickname?: string; imprints?: CreatureInst['imprints'] } | undefined = as ?? recordWith(s, npc)?.swaps?.[slot];
  const seed = `${s.prismSeed ?? 0}|${npc.id}|${slot}${swap ? `|${swap.nature}|${swap.nickname ?? ''}` : ''}`;
  // a creature this trainer had imprinted keeps that; otherwise they may teach it a favourite type
  const taught = swap?.imprints ? null : taughtTo(s, npc, slot, sp);
  const key = `${seed}|${sp.id}|${level}|${taught ? `${taught.type}${taught.n}` : JSON.stringify(swap?.imprints ?? '')}`;
  const had = built.get(key);
  if (had) return JSON.parse(had) as CreatureInst;
  const made = seededly(seed, () => {
    const c = createCreature(sp.id, level, { nature: swap?.nature ?? NATURES[hash(seed) % NATURES.length].id });
    if (swap?.nickname) c.nickname = swap.nickname;
    if (swap?.imprints) c.imprints = swap.imprints.map((x) => ({ ...x }));
    if (taught) teach(c, taught.type, taught.n);
    c.playbook = recommendPlaybook(c, { kind: 'balanced' }, taught?.type);
    c.uid = `npc-${npc.id}-${slot}`;
    if (slot === 0) { c.ace = true; c.bond = true; } // an Ace has the same bond as a trainer's own starter
    fullRestore(c);
    return c;
  });
  if (built.size > 300) built.clear();
  built.set(key, JSON.stringify(made));
  return made;
}
/** Who they own by now (species at their level), the Ace first. */
export const npcLineup = (s: GameState, npc: Npc): Species[] => npcFamilies(s, npc).slice(0, OWNED[npcTier(s.turn) - 1]).map((f) => formAt(f, npcLevel(s, npc)));
/** Their creatures, the Ace first. */
export const npcRoster = (s: GameState, npc: Npc, level = npcLevel(s, npc)): CreatureInst[] =>
  Array.from({ length: Math.min(OWNED[npcTier(s.turn) - 1], npcFamilies(s, npc).length) }, (_, i) => npcCreature(s, npc, i, level));
/** The team they bring: the Ace goes last. Against a lone creature they send a lesser one instead. */
export function npcTeam(s: GameState, npc: Npc, size: number, level = npcLevel(s, npc)): CreatureInst[] {
  const [ace, ...others] = npcRoster(s, npc, level);
  if (size <= 1) return [others[0] ?? ace];
  const drilled = (team: CreatureInst[]) => { drill(team, npc, s.turn); return team; };
  const pickFrom = [...others].sort((x, y) => chanceOf(s, `${npc.id}:${s.turn}:${x.uid}`) - chanceOf(s, `${npc.id}:${s.turn}:${y.uid}`));
  return drilled([...pickFrom.slice(0, size - 1), ace]);
}
/** Their creatures have fought side by side: Teamwork that grows with the season, and the best Swap Move for every pair. */
function drill(team: CreatureInst[], npc: Npc, turn: number) {
  for (const c of team) c.loyalty = Math.min(10, 2 * npcTier(turn) + (npc.kind === 'champion' ? 2 : 0));
  for (const a of team) for (const p of team) if (a !== p) a.teamwork[p.uid] = Math.floor(teamworkCap(a, p));
  assignSwapMoves(team);
}

// ── History ─────────────────────────────────────────────────────
export const recordWith = (s: GameState, npc: Npc): NpcRecord | undefined => s.npcs?.[npc.id];
export function meet(s: GameState, npc: Npc): NpcRecord {
  const all = (s.npcs ??= {});
  return (all[npc.id] ??= { met: s.turn, won: 0, lost: 0, owed: 0, rapport: 0, seen: [], revenges: 0 });
}
export const npcMood = (r: NpcRecord): string => (r.rapport >= 6 ? '💛 Firm friends' : r.rapport >= 3 ? '🙂 Friendly' : r.rapport <= MIFFED ? '😠 Miffed' : r.lost > r.won + 1 ? '😏 Smug' : r.won > r.lost + 1 ? '🔥 Out to beat you' : '🤺 Sizing you up');

// ── Sponsorship ─────────────────────────────────────────────────
/** A Champion who likes a trainer this much (firm friends) offers to sponsor them. */
export const SPONSOR_RAPPORT = 6;
/** Would this Champion sponsor the trainer? (Not if they already do.) */
export const wouldSponsor = (s: GameState, npc: Npc) => npc.kind === 'champion' && s.sponsor?.npc !== npc.id && (recordWith(s, npc)?.rapport ?? 0) >= SPONSOR_RAPPORT;
/** What being sponsored by this Champion gives the trainer: a second home, or a free Nabe where they're at home already. */
export const sponsorPerk = (s: GameState, npc: Npc): 'home' | 'free' => (s.trainer.home === npc.home || s.trainer.style === 'balanced' ? 'free' : 'home');
/**
 * Take up a Champion's sponsorship, face to face. Their home city becomes a second home: its Nabe is doubled, and
 * a wiped-out team or a Homing Feather can go there. A trainer already at home there (it's their home city, or
 * they're a Wanderer) rests there for no Initiative instead. One sponsor at a time: a new one takes the place of
 * the last. It's kept even if they fall out.
 */
export function sponsor(s: GameState, npc: Npc): boolean {
  if (!wouldSponsor(s, npc) || !npcsHere(s).includes(npc)) return false;
  s.sponsor = { npc: npc.id, city: npc.home, since: s.turn };
  log(s, `${npc.name} is sponsoring you: ${NODE_BY_ID[npc.home].name} ${sponsorPerk(s, npc) === 'free' ? 'serves your Nabe for no Initiative' : 'is your home too'}.`);
  record(s, 'place', `was sponsored by ${npc.name}, of ${NODE_BY_ID[npc.home].name}`);
  return true;
}

/** A battle against a Rival or Champion where the trainer stands. */
export function npcBattle(s: GameState, npc: Npc): Battle {
  meet(s, npc);
  const size = Math.max(1, Math.min(s.roster.filter((c) => !c.ko).length, FIELDED[npcTier(s.turn) - 1]));
  return createBattle(playerSide(s), { kind: npc.kind === 'champion' ? 'champion' : 'trainer', name: npc.name, npc: npc.id, team: npcTeam(s, npc, size), active: 0, mods: {} }, weather(s), { biome: here(s).biome });
}

/** Revenge: what beating them now is worth, for `owed` losses in a row (it stops growing at 3). */
export function revengeBonus(owed: number): { coins: number; xp: number; item: string } | null {
  if (owed <= 0) return null;
  const k = Math.min(3, owed);
  return { coins: k, xp: 2 + 2 * k, item: k >= 3 ? 'energy-tonic' : k === 2 ? 'elixir' : 'moonberry' };
}

/** After any battle with a Rival or Champion (world.ts → finishBattle): history, what they say, and Revenge. `prize` is the win's usual coins. */
export function settleNpc(s: GameState, b: Battle, prize: number, rewards: boolean): string[] {
  const npc = b.sides[1].npc ? NPC_BY_ID[b.sides[1].npc] : undefined;
  if (!npc || (b.over !== 'win' && b.over !== 'lose')) return [];
  const r = meet(s, npc);
  const won = b.over === 'win';
  const out: string[] = [];
  for (const uid of b.foeParticipants ?? []) {
    const slot = Number(uid.split('-').pop());
    if (!r.seen.includes(slot)) r.seen.push(slot);
  }
  r.rapport++;
  r.last = { turn: s.turn, at: s.location, won };
  r.invite = undefined;
  if (won) {
    r.won++;
    const rev = rewards ? revengeBonus(r.owed) : null;
    if (rev) {
      const coins = earnCoins(s, Math.max(3, prize) * rev.coins);
      s.inventory[rev.item] = (s.inventory[rev.item] ?? 0) + 1;
      for (const uid of b.participants) { const c = s.roster.find((x) => x.uid === uid); if (c) gainXp(c, rev.xp); }
      r.revenges++;
      const it = itemInfo(rev.item);
      out.push(`🔥 Revenge! +${coins} coins, +${rev.xp} XP for everyone who fought, and ${it.icon} ${it.name}.`);
      log(s, `Took revenge on ${npc.name} (${r.owed} ${r.owed === 1 ? 'loss' : 'losses'} avenged).`);
    } else log(s, `Beat ${npc.name}.`);
    r.owed = 0;
  } else { r.lost++; r.owed++; log(s, `Lost to ${npc.name}.`); }
  out.push(`${npc.name}: “${won ? npc.lines.concede : npc.lines.gloat}”`);
  return out;
}

/** A Rival or Champion who has just knocked out the whole team offers to help one creature up (unless they're miffed, or it's the Finals). */
export function mercyOffer(s: GameState, b: Battle): Npc | null {
  const npc = b.sides[1].npc ? NPC_BY_ID[b.sides[1].npc] : undefined;
  if (!npc || b.over !== 'lose' || s.phase !== 'map' || !s.roster.every((c) => c.ko)) return null;
  return (recordWith(s, npc)?.rapport ?? 0) <= MIFFED ? null : npc;
}
/** At or under this rapport they hold a grudge. */
export const MIFFED = -2;

// ── Meeting them ────────────────────────────────────────────────
const away = (a: string, b: string) => { const p = NODE_BY_ID[a], q = NODE_BY_ID[b]; return Math.hypot(p.x - q.x, p.z - q.z); };
/** The Rivals on this trainer's patch by now: the three nearest home at first, and one more every 8 turns. */
export function rivalsAbout(s: GameState): Npc[] {
  return [...RIVALS].sort((x, y) => away(x.home, s.trainer.home) - away(y.home, s.trainer.home) || hash(`${s.prismSeed}|${x.id}`) - hash(`${s.prismSeed}|${y.id}`)).slice(0, 3 + Math.floor(s.turn / 8));
}
/** Turns a Rival or Champion needs between battles with the same trainer. */
export const NPC_REST = 3;
export const npcResting = (s: GameState, npc: Npc) => { const l = recordWith(s, npc)?.last; return !!l && s.turn - l.turn < NPC_REST; };
/** A Rival to bump into, or null (resting, or waiting somewhere for a rematch). */
export function pickRival(s: GameState): Npc | null {
  const pool = rivalsAbout(s).filter((x) => !npcResting(s, x) && !recordWith(s, x)?.invite);
  if (!pool.length) return null;
  // familiar faces are likelier, and one who beat you last time most of all
  const w = pool.map((x) => { const r = recordWith(s, x); return r ? (r.owed ? 3 : 2) : 1; });
  let roll = Math.random() * w.reduce((a, x) => a + x, 0);
  for (let i = 0; i < pool.length; i++) { roll -= w[i]; if (roll <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
/** Chance that a trainer met on the road or in a Hall is a Rival: one in three, rising while none turns up. */
export function rivalChance(s: GameState): number {
  const last = Math.max(0, ...RIVALS.map((x) => recordWith(s, x)?.last?.turn ?? 0));
  return Math.min(0.8, 1 / 3 + Math.floor((s.turn - last) / 5) * 0.1);
}

/** Champions tour the cities and towns, staying `STAY` turns in each. */
export const STAY = 5;
export const npcStay = (turn: number) => Math.floor((turn - 1) / STAY);
const STOPS = [...Object.keys(CITIES), ...Object.keys(TOWNS)].filter((id) => NODE_BY_ID[id] && !isCloudNode(id) && !['lanternglade', 'stadium'].includes(id));
export function championAt(s: GameState, npc: Npc, turn = s.turn): string {
  const i = CHAMPIONS.indexOf(npc);
  // a fresh shuffle of the stops each stay, dealt out so no two Champions share one
  const order = [...STOPS].sort((x, y) => chanceOf(s, `tour:${npcStay(turn)}:${x}`) - chanceOf(s, `tour:${npcStay(turn)}:${y}`));
  return order[i];
}
/** Rivals and Champions who can be found where the trainer stands. */
export function npcsHere(s: GameState): Npc[] {
  if (!STOPS.includes(s.location)) return [];
  return NPCS.filter((x) => {
    const inv = recordWith(s, x)?.invite;
    if (inv) return inv.at === s.location && s.turn >= inv.from && s.turn <= inv.until;
    return x.kind === 'champion' && championAt(s, x) === s.location;
  });
}
export function challengeNpcBlock(s: GameState, npc: Npc): string | null {
  if (!npcsHere(s).includes(npc)) return `${npc.name} isn’t here.`;
  if (npcResting(s, npc)) return `${npc.name}’s team is resting. Come back in ${NPC_REST - (s.turn - recordWith(s, npc)!.last!.turn)} turns.`;
  if (!s.roster.some((c) => !c.ko)) return 'Your team needs rest first.';
  if (s.initiative < cityActionCost(s)) return 'Not enough Initiative.';
  return null;
}
/** Challenge someone who's here, for a city action's Initiative. */
export function challengeNpc(s: GameState, npc: Npc): Battle | null {
  if (challengeNpcBlock(s, npc)) return null;
  s.initiative -= cityActionCost(s);
  return npcBattle(s, npc);
}
/** Pass the time with someone who's here: friendlier for it, and once a stay they may share a treat. Null if you already have. */
export function chatWith(s: GameState, npc: Npc): { line: string; gift?: string } | null {
  if (!npcsHere(s).includes(npc)) return null;
  const r = meet(s, npc);
  if (r.invite) r.invite.met = true;
  if (r.chatted === npcStay(s.turn)) return null;
  r.chatted = npcStay(s.turn);
  r.rapport++;
  const gift = r.rapport >= 3 && Math.random() < 0.5 ? 'dewberry' : r.rapport === 1 ? 'sunberry' : undefined;
  if (gift) s.inventory[gift] = (s.inventory[gift] ?? 0) + 1;
  return { line: npc.lines.chat, gift };
}

// ── Rematches ───────────────────────────────────────────────────
export const INVITE_TRAVEL = 2;
export const INVITE_WAIT = 5;
export const INVITES_MAX = 2;
export const invites = (s: GameState) => NPCS.filter((x) => recordWith(s, x)?.invite);
export const inviteStops = () => STOPS;
export function inviteBlock(s: GameState, npc: Npc): string | null {
  const r = recordWith(s, npc);
  if (!r) return 'You haven’t met.';
  if (r.invite) return 'A rematch is already arranged.';
  if (invites(s).length >= INVITES_MAX) return `You already have ${INVITES_MAX} rematches arranged.`;
  if (npcResting(s, npc)) return 'They’re resting their team after your last battle.';
  if (s.turn + INVITE_TRAVEL > 99) return 'There’s no time left before the Circuit.';
  return null;
}
/** Invite someone you've met to a rematch at a city or town. */
export function inviteNpc(s: GameState, npc: Npc, at: string): boolean {
  if (inviteBlock(s, npc) || !STOPS.includes(at)) return false;
  const from = s.turn + INVITE_TRAVEL;
  recordWith(s, npc)!.invite = { at, from, until: Math.min(100, from + INVITE_WAIT - 1) };
  log(s, `Invited ${npc.name} to a rematch at ${NODE_BY_ID[at].name}.`);
  return true;
}
export function cancelInvite(s: GameState, npc: Npc) { const r = recordWith(s, npc); if (r) r.invite = undefined; }

// ── Circuit Standings ───────────────────────────────────────────
export interface Standing { npc: Npc; merits: number; score: number; seeded: boolean; contender: boolean }
/** Places in the Finals' bracket besides the trainer's. */
export const FIELD = 7;
/** A Rival who keeps beating this trainer, or whom they've battled most, becomes a contender. */
export function isContender(s: GameState, npc: Npc): boolean {
  if (npc.kind !== 'rival') return false;
  const r = recordWith(s, npc);
  return !!r && ((r.lost > r.won && r.lost >= 2) || r.won + r.lost >= 5);
}
export function npcScore(s: GameState, npc: Npc): number {
  const r = recordWith(s, npc);
  const battles = r ? r.won + r.lost : 0;
  const form = npc.rating + Math.round((chanceOf(s, `${npc.id}:form`) - 0.5) * 8);
  if (npc.kind === 'champion') return form;
  const raw = form + Math.min(12, battles * 2);
  // a contender always makes the bracket, but the top Champions stay favourites
  return isContender(s, npc) ? Math.min(87, Math.max(84, raw + (r!.lost > r!.won ? 36 : 30))) : raw;
}
/** Arbiters they've beaten by this turn, in their own order. */
export function npcMerits(s: GameState, npc: Npc, turn = s.turn): string[] {
  const order = Object.keys(CITIES).sort((x, y) => (x === npc.home ? -1 : y === npc.home ? 1 : chanceOf(s, `${npc.id}:road:${x}`) - chanceOf(s, `${npc.id}:road:${y}`)));
  const pace = Math.min(1, 0.46 + npcScore(s, npc) / 160); // the best are done around turn 90; most Rivals never finish
  return order.slice(0, Math.max(0, Math.min(8, Math.floor((turn / 92) * 8 * pace + chanceOf(s, `${npc.id}:start`) * 0.6))));
}
/** Everyone with a shot at the Circuit, best first. The first FIELD are on course for the bracket. */
export function standings(s: GameState): Standing[] {
  return NPCS.map((npc) => ({ npc, merits: npcMerits(s, npc).length, score: npcScore(s, npc), contender: isContender(s, npc), seeded: false }))
    .sort((a, b) => b.score - a.score || a.npc.id.localeCompare(b.npc.id))
    .map((x, i) => ({ ...x, seeded: i < FIELD }));
}
/** A new turn has begun: rematches nobody came to, and news of the Circuit. Returns notes for the start of the turn. */
export function npcTurn(s: GameState): string[] {
  const notes: string[] = [];
  for (const npc of NPCS) {
    const r = recordWith(s, npc);
    if (r && !r.offered && wouldSponsor(s, npc)) {
      r.offered = true;
      notes.push(`💛 ${npc.name} is impressed, and offers to sponsor you! Find them to accept${s.sponsor ? ` (in place of ${NPC_BY_ID[s.sponsor.npc]?.name ?? 'your sponsor'})` : ''}.`);
    }
    if (!r?.invite) continue;
    if (s.turn === r.invite.from) notes.push(`🤺 ${npc.name} is waiting for you at ${NODE_BY_ID[r.invite.at].name} until the end of turn ${r.invite.until}.`);
    else if (s.turn > r.invite.until) {
      const { at, met } = r.invite;
      r.invite = undefined;
      if (met) continue; // you did meet: you just didn't battle
      r.rapport--;
      textStoodUp(s, npc, at);
      notes.push(`🤺 ${npc.name} waited for your rematch, then left.`);
      log(s, `${npc.name} waited for a rematch, then left.`);
    }
  }
  for (const npc of NPCS) {
    const now = npcMerits(s, npc), before = npcMerits(s, npc, s.turn - 1);
    if (now.length <= before.length) continue;
    const city = CITIES[now[now.length - 1]];
    const text = `${npc.name} beat ${city.arbiter} for the ${city.accolade} (${now.length}/8).`;
    (s.circuitNews ??= []).unshift({ turn: s.turn, text });
    // only people you know are worth interrupting for
    if (recordWith(s, npc)) notes.push(`📰 ${text}`);
  }
  notes.push(...dareTurn(s), ...textTurn(s));
  if (s.circuitNews) s.circuitNews.length = Math.min(s.circuitNews.length, 20);
  return notes;
}
