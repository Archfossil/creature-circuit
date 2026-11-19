// Turn events: something happens on the road between turns. One event is rolled at the end of
// every turn (see `rollEvent`), stored on the save as `s.event` until the player answers it, then
// resolved with `resolveEvent`. Everything here is pure game logic; the UI only renders `eventView`.
import type { ElementType, Rarity } from '../data/schema';
import { SPECIES_BY_ID } from '../data/species';
import { NATURES, NATURE_BY_ID, ITEMS, BIOME_MATERIALS } from '../data/content';
import { TYPE_LABEL } from '../data/types';
import type { GameState } from './state';
import { addItem, follower, log, tierOf } from './state';
import type { CreatureInst } from './creature';
import { createCreature, gainXp, maxHealth, maxStamina, maxVitality, nameOf, speciesOf, stats } from './creature';
import type { Battle } from './battle';
import { createBattle } from './battle';
import { baseWildLevel, here, pickSpecies, playerSide, tierBandLevel, weather } from './world';
import { pick, roll, weightedPick } from './dice';

/** Chance that a turn ends with an event. 1 = every turn (good for playtesting); lower it to taste. */
export const EVENT_CHANCE = 1;

// Event params are stored on the save, so they must be plain JSON.
export type EventData = Record<string, string | number | string[]>;
export interface PendingEvent { id: string; data: EventData }

export interface EventChoice {
  id: string;
  label: string;
  detail?: string;
  /** The choice needs a creature: the UI asks the player to pick one. */
  pick?: boolean;
  /** If set, why this creature can't be picked (null = allowed). */
  canPick?: (c: CreatureInst) => string | null;
  /** If set, the choice is shown but disabled, with this reason. */
  disabled?: string;
}
export interface EventView { id: string; title: string; icon: string; text: string; choices: EventChoice[]; forced?: boolean }
export interface EventResult { text: string; tone: 'good' | 'bad' | 'info'; battle?: Battle; rolls?: number[] }

interface EventDef {
  id: string;
  weight: number;
  /** Optional: only roll this event when it makes sense. */
  when?: (s: GameState) => boolean;
  create: (s: GameState) => EventData;
  view: (s: GameState, d: EventData) => Omit<EventView, 'id'>;
  resolve: (s: GameState, d: EventData, choice: string, target?: CreatureInst) => EventResult;
}

// ── helpers ─────────────────────────────────────────────────────
const team = (s: GameState) => [...s.roster, ...s.reserve];
const DECLINE: EventChoice = { id: 'decline', label: 'No thanks', detail: 'Go on your way.' };
const afford = (s: GameState, coins: number) => (s.coins >= coins ? undefined : `Needs 🪙 ${coins}`);
const notKO = (c: CreatureInst) => (c.ko ? 'KO\'d. Rest at a stable first.' : null);
function markCaught(s: GameState, species: string) {
  if (!s.dex.seen.includes(species)) s.dex.seen.push(species);
  if (!s.dex.caught.includes(species)) s.dex.caught.push(species);
}
/** Add a creature to the active team if there's room, otherwise to the reserve. */
function welcome(s: GameState, c: CreatureInst) {
  if (s.roster.length < 3) s.roster.push(c); else s.reserve.push(c);
  markCaught(s, c.species);
}
function wildSpecies(s: GameState, rarity: Rarity, level: number) {
  return pickSpecies(here(s), rarity, level, weather(s).encounter).id;
}

// ── The events ──────────────────────────────────────────────────
const EVENTS: EventDef[] = [
  {
    id: 'trader', weight: 3,
    create: (s) => ({ species: wildSpecies(s, Math.random() < 0.3 ? 'prime' : 'common', baseWildLevel(s, here(s))) }),
    view: (_s, d) => {
      const sp = SPECIES_BY_ID[d.species as string];
      return {
        title: 'Roaming Trader', icon: '🧳',
        text: `A trader with a cart of totems offers a ${sp.name} (${sp.types.map((t) => TYPE_LABEL[t]).join('/')}, ${sp.rarity}). They'll swap it for one of your creatures, and theirs will match the level of the one you give.`,
        choices: [{ id: 'trade', label: `Trade for ${sp.name}`, detail: 'Pick the creature to give away.', pick: true, canPick: (c) => (c.ko ? 'The trader won\'t take a KO\'d creature.' : c.species === sp.id ? 'Already this species.' : null) }, DECLINE],
      };
    },
    resolve: (s, d, choice, c) => {
      if (choice !== 'trade' || !c) return { text: 'The trader tips their hat and rolls on.', tone: 'info' };
      const got = createCreature(d.species as string, c.level);
      got.morale = Math.max(5, c.morale);
      for (const list of [s.roster, s.reserve]) {
        const i = list.indexOf(c);
        if (i >= 0) list[i] = got;
      }
      if (s.following === c.uid) s.following = got.uid;
      markCaught(s, got.species);
      log(s, `Traded ${nameOf(c)} for a Lv ${got.level} ${nameOf(got)}.`);
      return { text: `You traded ${nameOf(c)} for a Lv ${got.level} ${nameOf(got)}.`, tone: 'good' };
    },
  },
  {
    id: 'caretaker', weight: 3,
    create: () => ({ natures: [...NATURES].sort(() => Math.random() - 0.5).slice(0, 3).map((n) => n.id) }),
    view: (_s, d) => ({
      title: 'Creature Caretaker', icon: '🩺',
      text: 'A gentle caretaker offers to spend the evening with one of your creatures. By morning its temperament will have shifted. It keeps the number of Nature perks it has unlocked, now from its new Nature.',
      choices: [
        ...(d.natures as string[]).map((id): EventChoice => {
          const n = NATURE_BY_ID[id];
          return { id: `nature:${id}`, label: `Become ${n.name}`, detail: `+${n.up} / −${n.down}. ${n.text}`, pick: true, canPick: (c) => (c.nature === id ? `Already ${n.name}.` : null) };
        }),
        DECLINE,
      ],
    }),
    resolve: (s, _d, choice, c) => {
      if (!choice.startsWith('nature:') || !c) return { text: 'The caretaker waves you off with a smile.', tone: 'info' };
      const n = NATURE_BY_ID[choice.slice(7)];
      const was = NATURE_BY_ID[c.nature].name;
      c.nature = n.id;
      c.perks = Math.min(c.perks, n.perks.length);
      log(s, `${nameOf(c)}'s Nature changed from ${was} to ${n.name}.`);
      return { text: `${nameOf(c)} is now ${n.name} (was ${was}).`, tone: 'good' };
    },
  },
  {
    id: 'cook', weight: 3,
    when: (s) => s.roster.some((c) => !c.ko && (c.vitality < maxVitality(c) || c.fatigue > 0)),
    create: () => ({ price: 4 }),
    view: (s, d) => ({
      title: 'Wandering Cook', icon: '🍲',
      text: 'A cook with a steaming pot on their back offers your active team a hearty meal: all Vitality and Health restored, Fatigue cleared. KO\'d creatures still need a stable.',
      choices: [{ id: 'eat', label: `Share a meal · 🪙 ${d.price}`, disabled: afford(s, d.price as number) }, DECLINE],
    }),
    resolve: (s, d, choice) => {
      if (choice !== 'eat') return { text: 'The cook shrugs and ladles a bowl for themself.', tone: 'info' };
      s.coins -= d.price as number;
      for (const c of s.roster) if (!c.ko) { c.vitality = maxVitality(c); c.health = maxHealth(c); c.fatigue = 0; }
      return { text: 'Your team eats well and feels restored.', tone: 'good' };
    },
  },
  {
    id: 'lost', weight: 2,
    create: (s) => {
      const level = Math.max(1, tierBandLevel(tierOf(s)) - 1);
      return { species: wildSpecies(s, 'common', level), level };
    },
    view: (_s, d) => {
      const sp = SPECIES_BY_ID[d.species as string];
      return {
        title: 'A Lost Creature', icon: '🥺',
        text: `A young ${sp.name} (Lv ${d.level}) has been trailing you since sundown. It seems lost.`,
        choices: [
          { id: 'adopt', label: `Take it in`, detail: 'It joins your team (or rests in a totem if your team is full).' },
          { id: 'guide', label: 'Guide it home', detail: 'Your active team is heartened: +1 Morale each.' },
        ],
      };
    },
    resolve: (s, d, choice) => {
      if (choice === 'adopt') {
        const c = createCreature(d.species as string, d.level as number);
        c.morale = 6;
        welcome(s, c);
        log(s, `A lost ${nameOf(c)} joined the team.`);
        return { text: `${nameOf(c)} joins you${s.reserve.includes(c) ? ' and rests in a totem' : ''}!`, tone: 'good' };
      }
      for (const c of s.roster) c.morale = Math.min(10, c.morale + 1);
      return { text: 'You walk it back to its family. Your team looks proud of you.', tone: 'good' };
    },
  },
  {
    id: 'caravan', weight: 3,
    create: () => {
      const item = pick(['elixir', 'moonberry', 'star-charm', 'lure-incense']);
      return { item, price: Math.max(1, Math.floor(ITEMS[item].price / 2)) };
    },
    view: (s, d) => {
      const it = ITEMS[d.item as string];
      return {
        title: 'Merchant Caravan', icon: '🐫',
        text: `A caravan stops for the night and is clearing stock: a ${it.name} for half price. ${it.text}`,
        choices: [{ id: 'buy', label: `Buy ${it.icon} ${it.name} · 🪙 ${d.price}`, disabled: afford(s, d.price as number) }, DECLINE],
      };
    },
    resolve: (s, d, choice) => {
      if (choice !== 'buy') return { text: 'The caravan moves on at dawn.', tone: 'info' };
      s.coins -= d.price as number;
      addItem(s, d.item as string);
      return { text: `Bought a ${ITEMS[d.item as string].name}.`, tone: 'good' };
    },
  },
  {
    id: 'storm', weight: 2,
    create: () => ({}),
    view: () => ({
      title: 'Sudden Storm', icon: '⛈️', forced: true,
      text: 'A storm rolls in fast. You can wait it out or push through the downpour.',
      choices: [
        { id: 'shelter', label: 'Take shelter', detail: 'Lose 1 Initiative this turn.' },
        { id: 'push', label: 'Push on', detail: 'Each active creature loses 1 Vitality (never below its last heart).' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'shelter') { s.initiative = Math.max(0, s.initiative - 1); return { text: 'You huddle under a ledge until it passes. (−1 Initiative)', tone: 'info' }; }
      for (const c of s.roster) if (!c.ko) c.vitality = Math.max(0, c.vitality - 1);
      return { text: 'Soaked and shivering, your team pushes on. (−1 Vitality each)', tone: 'bad' };
    },
  },
  {
    id: 'sparring', weight: 3,
    create: () => ({ price: 5 }),
    view: (s, d) => ({
      title: 'Sparring Master', icon: '🥋',
      text: 'A retired champion offers a private training session for one creature: +10 XP (one level).',
      choices: [{ id: 'train', label: `Train · 🪙 ${d.price}`, pick: true, canPick: notKO, disabled: afford(s, d.price as number) }, DECLINE],
    }),
    resolve: (s, d, choice, c) => {
      if (choice !== 'train' || !c) return { text: 'The master returns to their meditation.', tone: 'info' };
      s.coins -= d.price as number;
      const lv = gainXp(c, 10);
      return { text: `${nameOf(c)} trains hard: +10 XP${lv ? `, now Lv ${c.level}` : ''}!`, tone: 'good' };
    },
  },
  {
    id: 'fortune', weight: 2,
    when: (s) => !s.flags.starCharm,
    create: () => ({ price: 3 }),
    view: (s, d) => ({
      title: 'Fortune Teller', icon: '🔮',
      text: 'A fortune teller peers into a cracked crystal. "Rare things await you…" Pay, and your next wild encounter rolls an extra rarity die.',
      choices: [{ id: 'pay', label: `Hear your fortune · 🪙 ${d.price}`, disabled: afford(s, d.price as number) }, DECLINE],
    }),
    resolve: (s, d, choice) => {
      if (choice !== 'pay') return { text: '"Suit yourself," she says, already shuffling.', tone: 'info' };
      s.coins -= d.price as number;
      s.flags.starCharm = true;
      return { text: 'The stars align. Your next encounter rolls +1 rarity die.', tone: 'good' };
    },
  },
  {
    id: 'windfall', weight: 3,
    create: (s) => ({ items: [pick(BIOME_MATERIALS[here(s).biome]), pick(BIOME_MATERIALS[here(s).biome])] }),
    view: (_s, d) => ({
      title: 'Windfall', icon: '🧺',
      text: `Overnight, wind knocks loose a pile of ${(d.items as string[]).map((i) => ITEMS[i].name).join(' and ')} near your camp.`,
      choices: [{ id: 'gather', label: 'Gather them', detail: (d.items as string[]).map((i) => `${ITEMS[i].icon} ${ITEMS[i].name}`).join(', ') }],
    }),
    resolve: (s, d) => {
      for (const i of d.items as string[]) addItem(s, i);
      return { text: `Gathered ${(d.items as string[]).map((i) => ITEMS[i].name).join(' and ')}.`, tone: 'good' };
    },
  },
  {
    id: 'rival', weight: 2,
    when: (s) => s.roster.some((c) => !c.ko),
    create: () => ({ name: pick(['Rival Juniper', 'Rival Ozzie', 'Rival Marisol', 'Rival Dex', 'Rival Calla']) }),
    view: (_s, d) => ({
      title: 'Rival Challenge', icon: '🤺',
      text: `${d.name} blocks the path. "Think you're Circuit material? Prove it." Their team is a level above the local wilds. Normal trainer stakes: win coins, or pay them if you lose.`,
      choices: [{ id: 'fight', label: 'Accept the challenge' }, { id: 'decline', label: 'Walk away', detail: '"Figures." No penalty.' }],
    }),
    resolve: (s, d, choice) => {
      if (choice !== 'fight') return { text: `${d.name} scoffs and lets you pass.`, tone: 'info' };
      const lvl = baseWildLevel(s, here(s)) + 1;
      const size = Math.min(3, Math.max(1, s.roster.filter((c) => !c.ko).length));
      const foes = Array.from({ length: size }, () => createCreature(wildSpecies(s, Math.random() < 0.4 ? 'prime' : 'common', lvl), lvl));
      const battle = createBattle(playerSide(s), { kind: 'trainer', name: d.name as string, team: foes, active: 0, mods: {} }, weather(s), { biome: here(s).biome });
      return { text: `${d.name} sends out ${nameOf(foes[0])}!`, tone: 'info', battle };
    },
  },
  {
    id: 'hermit', weight: 2,
    create: () => ({ price: 8 }),
    view: (s, d) => ({
      title: 'Wise Hermit', icon: '📜',
      text: 'A hermit shares an old training scroll. One creature gains a free point to spend on its progression chart.',
      choices: [{ id: 'study', label: `Study the scroll · 🪙 ${d.price}`, pick: true, disabled: afford(s, d.price as number) }, DECLINE],
    }),
    resolve: (s, d, choice, c) => {
      if (choice !== 'study' || !c) return { text: 'The hermit rolls the scroll back up.', tone: 'info' };
      s.coins -= d.price as number;
      c.points++;
      return { text: `${nameOf(c)} gains a progression point. Open its card to spend it.`, tone: 'good' };
    },
  },
  {
    id: 'pickpocket', weight: 2,
    when: (s) => s.coins >= 3,
    create: () => ({}),
    view: (s) => {
      const f = follower(s);
      const spd = f ? stats(f).speed : 0;
      return {
        title: 'Pickpocket!', icon: '🦝', forced: true,
        text: 'A masked critter snatches your coin pouch and bolts!',
        choices: [
          { id: 'chase', label: f ? `Send ${nameOf(f)} after it` : 'Chase it yourself', detail: `Roll d6 + Speed ${spd} ≥ 7: catch it and take its stash (+d6 coins). Miss: lose d6 coins.` },
          { id: 'let', label: 'Let it go', detail: 'Lose 3 coins.' },
        ],
      };
    },
    resolve: (s, _d, choice) => {
      if (choice !== 'chase') { s.coins = Math.max(0, s.coins - 3); return { text: 'It vanishes with 3 coins.', tone: 'bad' }; }
      const f = follower(s);
      const r = roll(6), amt = roll(6);
      if (r + (f ? stats(f).speed : 0) >= 7) { s.coins += amt; return { text: `Caught it! You recover your pouch and ${amt} extra coins.`, tone: 'good', rolls: [r, amt] }; }
      const lost = Math.min(s.coins, amt);
      s.coins -= lost;
      return { text: `It got away with ${lost} coins.`, tone: 'bad', rolls: [r, amt] };
    },
  },
  {
    id: 'pilgrim', weight: 2,
    create: (s) => ({ type: pick([...new Set(team(s).flatMap((c) => speciesOf(c).types))] as ElementType[]) }),
    view: (_s, d) => ({
      title: 'Passing Pilgrim', icon: '🙏',
      text: `A pilgrim on the way to a shrine notices your team and leaves you a gift: a carved ${TYPE_LABEL[d.type as ElementType]} Totem (+3 to recruit ${TYPE_LABEL[d.type as ElementType]} creatures).`,
      choices: [{ id: 'accept', label: 'Accept with thanks' }],
    }),
    resolve: (s, d) => {
      addItem(s, `totem:${d.type}`);
      return { text: `Received a ${TYPE_LABEL[d.type as ElementType]} Totem.`, tone: 'good' };
    },
  },
  {
    id: 'springs', weight: 2,
    create: () => ({}),
    view: (s) => ({
      title: 'Hidden Hot Spring', icon: '♨️',
      text: 'You find a steaming spring off the trail. A long soak would do everyone good, but it takes time.',
      choices: [
        { id: 'soak', label: 'Soak · 1 Initiative', detail: 'All creatures (not KO\'d) clear Fatigue, refill Stamina and gain +1 Morale.', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
        DECLINE,
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice !== 'soak') return { text: 'You mark it on your map for another day.', tone: 'info' };
      s.initiative -= 1;
      for (const c of team(s)) if (!c.ko) { c.fatigue = 0; c.stamina = maxStamina(c); c.morale = Math.min(10, c.morale + 1); }
      return { text: 'Everyone comes out relaxed and refreshed.', tone: 'good' };
    },
  },
];

export const EVENT_IDS = EVENTS.map((e) => e.id);
const BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

/** Roll the end-of-turn event. Never repeats the previous event. Returns it (also stored on `s.event`). */
export function rollEvent(s: GameState, force?: string): PendingEvent | null {
  if (s.phase !== 'map' || s.event) return s.event ?? null;
  if (!force && Math.random() >= EVENT_CHANCE) return null;
  const pool = force ? [BY_ID[force]] : EVENTS.filter((e) => e.id !== s.lastEvent && (!e.when || e.when(s)));
  if (!pool.length) return null;
  const def = weightedPick(pool.map((e) => ({ v: e, w: e.weight })));
  s.event = { id: def.id, data: def.create(s) };
  s.lastEvent = def.id;
  return s.event;
}

/** What to show for the pending event. */
export function eventView(s: GameState): EventView | null {
  if (!s.event) return null;
  const def = BY_ID[s.event.id];
  if (!def) { s.event = undefined; return null; }
  return { id: def.id, ...def.view(s, s.event.data) };
}

/** Answer the pending event. Returns null if the choice isn't valid right now. */
export function resolveEvent(s: GameState, choiceId: string, targetUid?: string): EventResult | null {
  const view = eventView(s);
  if (!view || !s.event) return null;
  const choice = view.choices.find((c) => c.id === choiceId);
  if (!choice || choice.disabled) return null;
  let target: CreatureInst | undefined;
  if (choice.pick) {
    target = team(s).find((c) => c.uid === targetUid);
    if (!target || choice.canPick?.(target)) return null;
  }
  const result = BY_ID[s.event.id].resolve(s, s.event.data, choiceId, target);
  s.event = undefined;
  return result;
}
