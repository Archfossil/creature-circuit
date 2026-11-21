// Trainer interactions (hotseat and online): gifts and coin/item trades (sent by courier from anywhere),
// creature trades (both trainers on the same node), and battle challenges (same node; the challenged
// trainer must accept). All pure game logic; the UI handles asking each trainer.
import type { GameState } from './state';
import { log, stillPlaying, moveTrainer } from './state';
import type { CreatureInst } from './creature';
import { fullRestore, gainXp, nameOf, participationXp, TRAINER_BATTLE_XP_BONUS } from './creature';
import type { Battle } from './battle';
import { createBattle } from './battle';
import { here, playerSide, weather, wipeDefault } from './world';
import { itemInfo } from '../data/content';
import { NODE_BY_ID, CITIES } from '../data/map';

/** What one trainer puts into an exchange. */
export interface Offer { coins: number; items: Record<string, number>; creature?: string }
export const emptyOffer = (): Offer => ({ coins: 0, items: {} });
export const offerIsEmpty = (o: Offer) => !o.coins && !o.creature && !Object.values(o.items).some((n) => n > 0);

export const sameSpot = (a: GameState, b: GameState) => a.location === b.location;
const owned = (s: GameState) => [...s.roster, ...s.reserve];

/** Items that can change hands: anything but key items (passes, lanterns …), which stay with whoever earned them. */
export const giftable = (id: string) => itemInfo(id).kind !== 'key';

/** Why `from` can't hand over this offer to `to` (null = fine). `back` is what `from` receives in return. */
export function offerProblem(from: GameState, o: Offer, to: GameState, back: Offer = emptyOffer()): string | null {
  if (!Number.isInteger(o.coins) || o.coins < 0) return 'Coins must be a whole number.';
  if (o.coins > from.coins) return `${from.trainer.name} doesn’t have 💰 ${o.coins}.`;
  for (const [id, n] of Object.entries(o.items)) {
    if (!n) continue;
    if (!giftable(id)) return `${itemInfo(id).name} can’t be given away.`;
    if ((from.inventory[id] ?? 0) < n) return `${from.trainer.name} doesn’t have ${n} × ${itemInfo(id).name}.`;
  }
  if (o.creature) {
    if (!sameSpot(from, to)) return 'Creatures can only change hands when both trainers are on the same spot.';
    if (!owned(from).some((c) => c.uid === o.creature)) return `${from.trainer.name} doesn’t have that creature.`;
    if (owned(from).find((c) => c.uid === o.creature)!.bond) return `${nameOf(owned(from).find((c) => c.uid === o.creature)!)} shares a special bond with ${from.trainer.name} and won’t leave them.`;
    if (owned(from).length - 1 + (back.creature ? 1 : 0) < 1) return `${from.trainer.name} can’t give away their only creature.`;
  }
  return null;
}

/** Take a creature out of a trainer's team, keeping the team and follower valid. */
function removeCreature(s: GameState, uid: string): CreatureInst {
  const list = s.roster.some((c) => c.uid === uid) ? s.roster : s.reserve;
  const c = list.splice(list.findIndex((x) => x.uid === uid), 1)[0];
  if (!s.roster.length && s.reserve.length) s.roster.push(s.reserve.shift()!);
  if (s.following === uid) s.following = s.roster[0]?.uid ?? null;
  return c;
}
function receiveCreature(s: GameState, c: CreatureInst) {
  c.morale = Math.max(3, c.morale - 1); // a new trainer takes some getting used to
  if (s.roster.length < 3) s.roster.push(c); else s.reserve.push(c);
  if (!s.dex.seen.includes(c.species)) s.dex.seen.push(c.species);
  if (!s.dex.caught.includes(c.species)) s.dex.caught.push(c.species);
  if (!s.following) s.following = c.uid;
}

const describe = (s: GameState, o: Offer) => {
  const parts: string[] = [];
  if (o.creature) parts.push(nameOf(owned(s).find((c) => c.uid === o.creature)!));
  for (const [id, n] of Object.entries(o.items)) if (n) parts.push(`${n} × ${itemInfo(id).name}`);
  if (o.coins) parts.push(`💰 ${o.coins}`);
  return parts.join(', ') || 'nothing';
};

/** Leave a note for a trainer, shown at the start of their next turn. */
export function notify(s: GameState, text: string) { (s.inbox ??= []).push(text); }

/**
 * Carry out an exchange: `a` gives `oa` to `b`, and `b` gives `ob` to `a` (either may be empty, so a
 * gift is just an exchange with nothing back). Checks both sides first; returns an error or null.
 */
export function exchange(a: GameState, oa: Offer, b: GameState, ob: Offer = emptyOffer()): string | null {
  if (a === b) return 'Pick another trainer.';
  if (offerIsEmpty(oa) && offerIsEmpty(ob)) return 'Nothing to exchange.';
  const err = offerProblem(a, oa, b, ob) ?? offerProblem(b, ob, a, oa);
  if (err) return err;
  const textA = describe(a, oa), textB = describe(b, ob);
  const move = (from: GameState, o: Offer, to: GameState) => {
    from.coins -= o.coins; to.coins += o.coins;
    for (const [id, n] of Object.entries(o.items)) {
      if (!n) continue;
      from.inventory[id] -= n;
      if (from.inventory[id] <= 0) delete from.inventory[id];
      to.inventory[id] = (to.inventory[id] ?? 0) + n;
    }
  };
  move(a, oa, b); move(b, ob, a);
  const ca = oa.creature ? removeCreature(a, oa.creature) : null;
  const cb = ob.creature ? removeCreature(b, ob.creature) : null;
  if (ca) receiveCreature(b, ca);
  if (cb) receiveCreature(a, cb);
  const gift = offerIsEmpty(ob);
  log(a, gift ? `Sent ${textA} to ${b.trainer.name}.` : `Traded ${textA} to ${b.trainer.name} for ${textB}.`);
  log(b, gift ? `Received ${textA} from ${a.trainer.name}.` : `Traded ${textB} to ${a.trainer.name} for ${textA}.`);
  notify(b, gift ? `📦 ${a.trainer.name} sent you ${textA}.` : `🤝 You traded ${textB} to ${a.trainer.name} for ${textA}.`);
  return null;
}

// ── Challenges ──────────────────────────────────────────────────
/** Why `a` can't challenge `b` right now (null = they can). */
export function challengeProblem(a: GameState, b: GameState): string | null {
  if (a === b) return 'Pick another trainer.';
  if (!stillPlaying(b) || b.phase !== 'map') return `${b.trainer.name} has finished their season.`;
  if (!sameSpot(a, b)) return `You need to be on the same spot as ${b.trainer.name}.`;
  if (a.initiative < 1) return 'A challenge takes 1 Initiative.';
  if (a.flags.challenged?.includes(b.trainer.name)) return `You’ve already challenged ${b.trainer.name} this turn.`;
  if (!a.roster.some((c) => !c.ko)) return 'Your team needs rest first.';
  if (!b.roster.some((c) => !c.ko)) return `${b.trainer.name}’s team is in no shape to fight.`;
  return null;
}

/** The largest wager both trainers can cover. */
export const maxWager = (a: GameState, b: GameState) => Math.min(a.coins, b.coins);

/**
 * Start an accepted challenge: `a` plays their own team against `b`'s active team. In the app,
 * `b` picks their creatures' actions too (resolveRound's foe action); left to itself, side 1 uses the
 * AI. Costs `a` 1 Initiative; once per opponent per turn.
 */
export function startChallenge(a: GameState, b: GameState): Battle | null {
  if (challengeProblem(a, b)) return null;
  a.initiative -= 1;
  (a.flags.challenged ??= []).push(b.trainer.name);
  const lead = Math.max(0, b.roster.findIndex((c) => c.uid === b.following && !c.ko));
  const active = b.roster[lead] && !b.roster[lead].ko ? lead : b.roster.findIndex((c) => !c.ko);
  return createBattle(playerSide(a), { kind: 'trainer', name: b.trainer.name, team: b.roster, active, mods: {} }, weather(a), { biome: here(a).biome });
}

/** A duel's loser whose whole team is down is helped home to rest; no coins are lost (that's for the wager). */
function helpHome(s: GameState) {
  const to = wipeDefault(s); // home, or for a Wanderer the city they last rested at (nobody's there to ask)
  moveTrainer(s, to, { wiped: true });
  for (const c of s.roster) fullRestore(c);
  log(s, `Your team was knocked out in a duel. You were helped ${to === s.trainer.home ? 'home ' : ''}to ${CITIES[to].name} to rest.`);
}

/**
 * After a challenge: the winner takes the wager, `b`'s creatures that fought earn trainer-battle XP
 * (`a`'s already did in the battle), and a team that's fully knocked out is helped home.
 */
export function settleChallenge(a: GameState, b: GameState, battle: Battle, wager: number): string[] {
  const out: string[] = [];
  const aWon = battle.over === 'win';
  const bWon = battle.over === 'lose';
  const stake = Math.min(wager, aWon ? b.coins : bWon ? a.coins : 0);
  if (stake > 0) {
    if (aWon) { b.coins -= stake; a.coins += stake; } else { a.coins -= stake; b.coins += stake; }
    out.push(`${aWon ? a.trainer.name : b.trainer.name} wins the 💰 ${stake} wager.`);
  }
  const foeLevel = Math.max(...a.roster.map((c) => c.level));
  for (const uid of battle.foeParticipants ?? []) {
    const c = b.roster.find((x) => x.uid === uid) ?? b.reserve.find((x) => x.uid === uid);
    if (c) gainXp(c, participationXp(c.level, foeLevel) + TRAINER_BATTLE_XP_BONUS);
  }
  for (const c of b.roster) if (!c.ko) c.health = Math.max(c.health, 1);
  const result = aWon ? `${a.trainer.name} beat you in a duel at ${NODE_BY_ID[a.location].name}.` : bWon ? `You beat ${a.trainer.name} in a duel at ${NODE_BY_ID[a.location].name}!` : `Your duel with ${a.trainer.name} ended without a winner.`;
  notify(b, `⚔️ ${result}${stake ? ` (💰 ${stake} ${bWon ? 'won' : 'lost'})` : ''} Your creatures that fought earned XP.`);
  log(b, result);
  if (a.roster.every((c) => c.ko)) { helpHome(a); out.push(`${a.trainer.name}’s team is helped home to rest.`); }
  if (b.roster.every((c) => c.ko)) { helpHome(b); out.push(`${b.trainer.name}’s team is helped home to rest.`); }
  return out;
}
