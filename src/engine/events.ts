// Turn events: something happens on the road between turns. One event is rolled at the end of
// every turn (see `rollEvent`), stored on the save as `s.event` until the player answers it, then
// resolved with `resolveEvent`. Everything here is pure game logic; the UI only renders `eventView`.
import type { ElementType, Rarity, TimeOfDay } from '../data/schema';
import { SPECIES_BY_ID } from '../data/species';
import { NATURES, NATURE_BY_ID, ABILITIES, ITEMS, BIOME_MATERIALS, timeOfDay } from '../data/content';
import { INSTINCTS, INSTINCT_BY_ID } from '../data/instincts';
import { TYPE_LABEL } from '../data/types';
import type { GameState } from './state';
import { addItem, follower, log, tierOf, earnCoins } from './state';
import type { CreatureInst } from './creature';
import { createCreature, gainXp, maxHealth, maxStamina, maxVitality, nameOf, speciesOf, stats, addLoyalty, abilityOf, instinctIdOf } from './creature';
import type { Battle } from './battle';
import { createBattle } from './battle';
import { baseWildLevel, here, pickSpecies, playerSide, speciesPool, tierBandLevel, weather, travelTo, travelBlock } from './world';
import { BIOME_TYPES, isCloudNode, FOREST_FLOOR, CITIES } from '../data/map';
import { pick, roll, weightedPick, uid } from './dice';

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
  /**
   * For pick choices: what the picked creature would become (a trade, a new Nature …), so the UI
   * can show a before/after comparison before the player commits. Must match `resolve` exactly.
   */
  preview?: (c: CreatureInst) => { after: CreatureInst; note?: string };
}
export interface EventView {
  id: string; title: string; icon: string; text: string; choices: EventChoice[]; forced?: boolean;
  /** A creature on offer (e.g. the trader's), shown on the event so the player can inspect it. */
  showcase?: CreatureInst;
}
export interface EventResult { text: string; tone: 'good' | 'bad' | 'info'; battle?: Battle; rolls?: number[] }

interface EventDef {
  id: string;
  weight: number;
  /** Optional: only roll this event when it makes sense. */
  when?: (s: GameState) => boolean;
  /** Optional: only by day or only at night (odd turns are day, even turns night). Unset = any time. */
  time?: TimeOfDay;
  /** 'cloud' / 'floor': only happens on Cloud Island / the Forest Floor (and while there, only those events happen). */
  place?: 'cloud' | 'floor';
  create: (s: GameState) => EventData;
  view: (s: GameState, d: EventData) => Omit<EventView, 'id'>;
  resolve: (s: GameState, d: EventData, choice: string, target?: CreatureInst) => EventResult;
}

// ── helpers ─────────────────────────────────────────────────────
const team = (s: GameState) => [...s.roster, ...s.reserve];
const DECLINE: EventChoice = { id: 'decline', label: 'No thanks', detail: 'Go on your way.' };
const afford = (s: GameState, coins: number) => (s.coins >= coins ? undefined : `Needs 💰 ${coins}`);
const notKO = (c: CreatureInst) => (c.ko ? 'KO\'d. Rest at a stable first.' : null);
/** Change Morale within 0–10. */
function cheer(c: CreatureInst, n: number) { c.morale = Math.max(0, Math.min(10, c.morale + n)); }
function markCaught(s: GameState, species: string) {
  if (!s.dex.seen.includes(species)) s.dex.seen.push(species);
  if (!s.dex.caught.includes(species)) s.dex.caught.push(species);
}
/** Add a creature to the active team if there's room, otherwise to the reserve. */
function welcome(s: GameState, c: CreatureInst) {
  if (s.roster.length < 3) s.roster.push(c); else s.reserve.push(c);
  markCaught(s, c.species);
}
function wildSpecies(s: GameState, rarity: Rarity, level: number, time?: TimeOfDay) {
  return pickSpecies(here(s), rarity, level, weather(s).encounter, time).id;
}
/**
 * The trader's creature at a given level. Fixed by the event (species + Nature) and given with its
 * chart points unspent, so the preview the player sees is exactly what they get.
 */
function tradeOffer(d: EventData, level: number): CreatureInst {
  const c = createCreature(d.species as string, level, { nature: (d.nature as string) ?? NATURES[0].id, auto: false });
  c.uid = `offer-${d.species}-${level}`;
  return c;
}
/** A creature as it would be with another Nature (perks kept by count, now from the new Nature). */
function withNature(c: CreatureInst, natureId: string): CreatureInst {
  const n = NATURE_BY_ID[natureId];
  return { ...c, nature: n.id, perks: Math.min(c.perks, n.perks.length) };
}

// ── The events ──────────────────────────────────────────────────
const EVENTS: EventDef[] = [
  {
    id: 'trader', weight: 3, time: 'day',
    create: (s) => {
      const level = baseWildLevel(s, here(s));
      return { species: wildSpecies(s, Math.random() < 0.3 ? 'prime' : 'common', level), nature: pick(NATURES).id, level };
    },
    view: (_s, d) => {
      const sp = SPECIES_BY_ID[d.species as string];
      return {
        title: 'Roaming Trader', icon: '🧳',
        showcase: tradeOffer(d, (d.level as number) ?? 1),
        text: `A trader with a cart of totems offers a ${sp.name} (${sp.types.map((t) => TYPE_LABEL[t]).join('/')}, ${sp.rarity}, ${NATURE_BY_ID[(d.nature as string) ?? NATURES[0].id].name}). They'll swap it for one of your creatures, and theirs will match the level of the one you give, with its chart points left for you to spend.`,
        choices: [{ id: 'trade', label: `Trade for ${sp.name}`, detail: 'Pick the creature to give away.', pick: true, preview: (c) => ({ after: tradeOffer(d, c.level), note: c.level > 1 ? `Arrives with ${c.level - 1} chart point${c.level === 2 ? '' : 's'} to spend.` : undefined }), canPick: (c) => (c.ko ? 'The trader won\'t take a KO\'d creature.' : c.species === sp.id ? 'Already this species.' : null) }, DECLINE],
      };
    },
    resolve: (s, d, choice, c) => {
      if (choice !== 'trade' || !c) return { text: 'The trader tips their hat and rolls on.', tone: 'info' };
      const got = tradeOffer(d, c.level);
      got.uid = uid(); // a real creature of its own, not the preview
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
    id: 'caretaker', weight: 3, time: 'night',
    create: () => ({ natures: [...NATURES].sort(() => Math.random() - 0.5).slice(0, 3).map((n) => n.id) }),
    view: (_s, d) => ({
      title: 'Creature Caretaker', icon: '🩺',
      text: 'A gentle caretaker offers to spend the evening with one of your creatures. By morning its temperament will have shifted. It keeps the number of Nature perks it has unlocked, now from its new Nature.',
      choices: [
        ...(d.natures as string[]).map((id): EventChoice => {
          const n = NATURE_BY_ID[id];
          return {
            id: `nature:${id}`, label: `Become ${n.name}`, detail: `+${n.up} / −${n.down}. ${n.text}`, pick: true,
            canPick: (c) => (c.nature === id ? `Already ${n.name}.` : null),
            preview: (c) => ({ after: withNature(c, id), note: c.perks ? `Keeps ${c.perks} Nature perk${c.perks === 1 ? '' : 's'}, now from ${n.name}.` : undefined }),
          };
        }),
        DECLINE,
      ],
    }),
    resolve: (s, _d, choice, c) => {
      if (!choice.startsWith('nature:') || !c) return { text: 'The caretaker waves you off with a smile.', tone: 'info' };
      const n = NATURE_BY_ID[choice.slice(7)];
      const was = NATURE_BY_ID[c.nature].name;
      const after = withNature(c, n.id);
      c.nature = after.nature;
      c.perks = after.perks;
      log(s, `${nameOf(c)}'s Nature changed from ${was} to ${n.name}.`);
      return { text: `${nameOf(c)} is now ${n.name} (was ${was}).`, tone: 'good' };
    },
  },
  {
    id: 'tutor', weight: 2, time: 'day',
    create: () => ({ abilities: Object.keys(ABILITIES).sort(() => Math.random() - 0.5).slice(0, 3) }),
    view: (_s, d) => ({
      title: 'Trail Tutor', icon: '🧑‍🏫',
      text: 'A weathered trail tutor offers to spend the day teaching one of your creatures a new way of getting around the wilds. By evening it will have swapped its old overworld Ability for a new one.',
      choices: [
        ...(d.abilities as string[]).map((id): EventChoice => {
          const a = ABILITIES[id];
          return {
            id: `ability:${id}`, label: `Learn ${a.name}`, detail: a.text, pick: true,
            canPick: (c) => (abilityOf(c) === id ? `Already has ${a.name}.` : null),
          };
        }),
        DECLINE,
      ],
    }),
    resolve: (s, _d, choice, c) => {
      if (!choice.startsWith('ability:') || !c) return { text: 'The tutor tips their hat and walks on.', tone: 'info' };
      const id = choice.slice(8);
      const was = ABILITIES[abilityOf(c)]?.name ?? abilityOf(c);
      c.ability = id === speciesOf(c).ability ? undefined : id;
      if (c.ability === undefined) delete c.ability;
      log(s, `${nameOf(c)}'s Ability changed from ${was} to ${ABILITIES[id].name}.`);
      return { text: `${nameOf(c)} learned ${ABILITIES[id].name} (was ${was}).`, tone: 'good' };
    },
  },
  {
    id: 'drums', weight: 2, time: 'night',
    create: () => ({ instincts: [...INSTINCTS].sort(() => Math.random() - 0.5).slice(0, 3).map((i) => i.id) }),
    view: (_s, d) => ({
      title: 'Drum Circle', icon: '🥁',
      text: 'Drums carry through the night from a ring of fires. The drummers invite one of your creatures to dance until dawn: by morning a different battle Instinct will have woken in it.',
      choices: [
        ...(d.instincts as string[]).map((id): EventChoice => {
          const i = INSTINCT_BY_ID[id];
          return {
            id: `instinct:${id}`, label: `Wake ${i.name}`, detail: `${TYPE_LABEL[i.type]} · ${i.text}`, pick: true,
            canPick: (c) => (instinctIdOf(c) === id ? `Already has ${i.name}.` : null),
          };
        }),
        DECLINE,
      ],
    }),
    resolve: (s, _d, choice, c) => {
      if (!choice.startsWith('instinct:') || !c) return { text: 'The drums fade as you head on.', tone: 'info' };
      const id = choice.slice(9);
      const was = INSTINCT_BY_ID[instinctIdOf(c)]?.name ?? instinctIdOf(c);
      c.instinct = id === speciesOf(c).instinct ? undefined : id;
      if (c.instinct === undefined) delete c.instinct;
      log(s, `${nameOf(c)}'s Instinct changed from ${was} to ${INSTINCT_BY_ID[id].name}.`);
      return { text: `${nameOf(c)}'s Instinct is now ${INSTINCT_BY_ID[id].name} (was ${was}).`, tone: 'good' };
    },
  },
  {
    id: 'cook', weight: 3,
    when: (s) => s.roster.some((c) => !c.ko && (c.vitality < maxVitality(c) || c.fatigue > 0)),
    create: () => ({ price: 4 }),
    view: (s, d) => ({
      title: 'Wandering Cook', icon: '🍲',
      text: 'A cook with a steaming pot on their back offers your active team a hearty meal: all Health restored, Fatigue cleared. KO\'d creatures still need a stable.',
      choices: [{ id: 'eat', label: `Share a meal · 💰 ${d.price}`, disabled: afford(s, d.price as number) }, DECLINE],
    }),
    resolve: (s, d, choice) => {
      if (choice !== 'eat') return { text: 'The cook shrugs and ladles a bowl for themself.', tone: 'info' };
      s.coins -= d.price as number;
      for (const c of s.roster) if (!c.ko) { c.vitality = maxVitality(c); c.health = maxHealth(c); c.fatigue = 0; }
      return { text: 'Your team eats well and feels restored.', tone: 'good' };
    },
  },
  {
    id: 'lost', weight: 2, time: 'night',
    create: (s) => {
      const level = Math.max(1, tierBandLevel(tierOf(s)) - 1);
      return { species: wildSpecies(s, 'common', level, timeOfDay(s.turn)), level };
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
    id: 'caravan', weight: 3, time: 'night',
    create: () => {
      const item = pick(['elixir', 'moonberry', 'star-charm', 'lure-incense', 'hush-smoke']);
      return { item, price: Math.max(1, Math.floor(ITEMS[item].price / 2)) };
    },
    view: (s, d) => {
      const it = ITEMS[d.item as string];
      return {
        title: 'Merchant Caravan', icon: '🐫',
        text: `A caravan stops for the night and is clearing stock: a ${it.name} for half price. ${it.text}`,
        choices: [{ id: 'buy', label: `Buy ${it.icon} ${it.name} · 💰 ${d.price}`, disabled: afford(s, d.price as number) }, DECLINE],
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
        { id: 'push', label: 'Push on', detail: 'Each active creature loses a heart (never its last).' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'shelter') { s.initiative = Math.max(0, s.initiative - 1); return { text: 'You huddle under a ledge until it passes. (−1 Initiative)', tone: 'info' }; }
      for (const c of s.roster) if (!c.ko) c.vitality = Math.max(0, c.vitality - 1);
      return { text: 'Soaked and shivering, your team pushes on. (−1 heart each)', tone: 'bad' };
    },
  },
  {
    id: 'sparring', weight: 3, time: 'day',
    create: () => ({ price: 5 }),
    view: (s, d) => ({
      title: 'Sparring Master', icon: '🥋',
      text: 'A retired champion offers a private training session for one creature: +10 XP (one level).',
      choices: [{ id: 'train', label: `Train · 💰 ${d.price}`, pick: true, canPick: notKO, disabled: afford(s, d.price as number) }, DECLINE],
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
      choices: [{ id: 'pay', label: `Hear your fortune · 💰 ${d.price}`, disabled: afford(s, d.price as number) }, DECLINE],
    }),
    resolve: (s, d, choice) => {
      if (choice !== 'pay') return { text: '"Suit yourself," she says, already shuffling.', tone: 'info' };
      s.coins -= d.price as number;
      s.flags.starCharm = true;
      return { text: 'The stars align. Your next encounter rolls +1 rarity die.', tone: 'good' };
    },
  },
  {
    id: 'windfall', weight: 3, time: 'night',
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
    id: 'rival', weight: 2, time: 'day',
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
      choices: [{ id: 'study', label: `Study the scroll · 💰 ${d.price}`, pick: true, disabled: afford(s, d.price as number) }, DECLINE],
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
      if (r + (f ? stats(f).speed : 0) >= 7) { const got = earnCoins(s, amt); return { text: `Caught it! You recover your pouch and ${got} extra coins.`, tone: 'good', rolls: [r, amt] }; }
      const lost = Math.min(s.coins, amt);
      s.coins -= lost;
      return { text: `It got away with ${lost} coins.`, tone: 'bad', rolls: [r, amt] };
    },
  },
  {
    id: 'pilgrim', weight: 2, time: 'day',
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
        { id: 'soak', label: 'Soak · 1 Initiative', detail: 'All your partner creatures (in totems too, if not KO\'d) clear Fatigue, refill Stamina and gain +1 Morale.', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
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

  // ── More road events ───────────────────────────────────────────
  {
    id: 'gambler', weight: 2,
    when: (s) => s.coins >= 5,
    create: () => ({}),
    view: (s) => ({
      title: 'Dice Gambler', icon: '🎲',
      text: 'A grinning gambler rattles a cup of dice. "Your d6 against mine. Higher roll doubles the stake; a tie, you keep it."',
      choices: [
        { id: 'bet5', label: 'Bet 💰 5', disabled: afford(s, 5) },
        { id: 'bet10', label: 'Bet 💰 10', disabled: afford(s, 10) },
        { id: 'decline', label: 'Not tonight', detail: 'Keep your coins.' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'decline') return { text: 'The gambler shrugs and finds another mark.', tone: 'info' };
      const stake = choice === 'bet10' ? 10 : 5;
      const mine = roll(6), theirs = roll(6);
      if (mine > theirs) { const got = earnCoins(s, stake); return { text: `You roll ${mine}, they roll ${theirs}. You win 💰 ${got}!`, tone: 'good', rolls: [mine, theirs] }; }
      if (mine < theirs) { s.coins -= stake; return { text: `You roll ${mine}, they roll ${theirs}. You lose 💰 ${stake}.`, tone: 'bad', rolls: [mine, theirs] }; }
      return { text: `Both roll ${mine}. A tie: you keep your stake.`, tone: 'info', rolls: [mine, theirs] };
    },
  },
  {
    id: 'bard', weight: 3, time: 'night',
    create: () => ({ price: 3 }),
    view: (s, d) => ({
      title: 'Traveling Bard', icon: '🪕',
      text: 'A bard sets up by your campfire and plays a rousing tune about the Creature Circuit.',
      choices: [
        { id: 'listen', label: 'Listen', detail: 'Your active team gains +1 Morale.' },
        { id: 'tip', label: `Request a ballad about your team · 💰 ${d.price}`, detail: 'All your partner creatures (in totems too) gain +1 Morale, and your follower +1 Loyalty.', disabled: afford(s, d.price as number) },
      ],
    }),
    resolve: (s, d, choice) => {
      if (choice === 'tip') {
        s.coins -= d.price as number;
        for (const c of team(s)) cheer(c, 1);
        const f = follower(s);
        if (f) addLoyalty(f, 1);
        return { text: `The ballad of ${s.trainer.name} has your whole team beaming.`, tone: 'good' };
      }
      for (const c of s.roster) cheer(c, 1);
      return { text: 'Your team hums along long after the fire dies down. (+1 Morale)', tone: 'good' };
    },
  },
  {
    id: 'mentor', weight: 2, time: 'day',
    create: () => ({ xp: 5 }),
    view: (s, d) => ({
      title: 'Old Trainer’s Advice', icon: '🧓',
      text: `A retired trainer watches your team and offers to walk one creature through its footwork. It takes time, but it’s free: +${d.xp} XP.`,
      choices: [
        { id: 'train', label: 'Spend the morning · 1 Initiative', pick: true, canPick: notKO, disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
        DECLINE,
      ],
    }),
    resolve: (s, d, choice, c) => {
      if (choice !== 'train' || !c) return { text: 'The old trainer tips their hat and wishes you luck.', tone: 'info' };
      s.initiative -= 1;
      const lv = gainXp(c, d.xp as number);
      return { text: `${nameOf(c)} learns a thing or two: +${d.xp} XP${lv ? `, now Lv ${c.level}` : ''}.`, tone: 'good' };
    },
  },
  {
    id: 'guide', weight: 2, time: 'day',
    create: () => ({ price: 3 }),
    view: (s, d) => ({
      title: 'Local Guide', icon: '🧭',
      text: 'A local knows every shortcut in the area and offers to show you the quickest trails today.',
      choices: [{ id: 'hire', label: `Hire them · 💰 ${d.price}`, detail: '+1 Initiative this turn.', disabled: afford(s, d.price as number) }, DECLINE],
    }),
    resolve: (s, d, choice) => {
      if (choice !== 'hire') return { text: 'You’ll find your own way, thanks.', tone: 'info' };
      s.coins -= d.price as number;
      s.initiative += 1;
      return { text: 'With a guide leading, you’ll cover more ground today. (+1 Initiative)', tone: 'good' };
    },
  },
  {
    // getting around the big map: a free ride to one of three cities
    id: 'balloon', weight: 2, time: 'day',
    when: (s) => !travelBlock(s),
    create: (s) => {
      const options = Object.keys(CITIES).filter((id) => id !== s.location).sort(() => Math.random() - 0.5).slice(0, 3);
      return { cities: options };
    },
    view: (s, d) => ({
      title: 'Hot Air Balloon', icon: '🎈',
      text: 'A striped hot air balloon settles in the field beside you. The pilot is heading out on the morning winds and has room for one more, and your creatures.',
      choices: [
        ...(d.cities as string[]).map((id) => ({
          id, label: `Float to ${CITIES[id].name}`,
          detail: `${TYPE_LABEL[CITIES[id].type]} City · Arbiter ${CITIES[id].arbiter}${s.visited.includes(id) ? ' · visited' : ' · somewhere new'}`,
        })),
        { id: 'decline', label: 'Stay on the ground', detail: 'Go on your way.' },
      ],
    }),
    resolve: (s, d, choice) => {
      if (!(d.cities as string[]).includes(choice)) return { text: 'You wave as the balloon drifts away.', tone: 'info' };
      travelTo(s, choice);
      log(s, `Rode a hot air balloon to ${CITIES[choice].name}.`);
      return { text: `The balloon sets you down gently in ${CITIES[choice].name}. What a view!`, tone: 'good' };
    },
  },
  {
    // getting around the big map: a paid overnight ride to one named city
    id: 'coach', weight: 2, time: 'night',
    when: (s) => !travelBlock(s),
    create: (s) => ({ city: pick(Object.keys(CITIES).filter((id) => id !== s.location)), price: 4 }),
    view: (s, d) => {
      const c = CITIES[d.city as string];
      return {
        title: 'Night Coach', icon: '🚌',
        text: `A coach rattles up the road, lanterns swinging. The driver is bound for ${c.name} overnight and offers you a seat. You'd wake up there.`,
        choices: [{ id: 'ride', label: `Ride to ${c.name} · 💰 ${d.price}`, detail: `${TYPE_LABEL[c.type]} City · Arbiter ${c.arbiter}. Your Initiative is untouched.`, disabled: afford(s, d.price as number) }, DECLINE],
      };
    },
    resolve: (s, d, choice) => {
      if (choice !== 'ride') return { text: 'The coach rolls on into the night without you.', tone: 'info' };
      s.coins -= d.price as number;
      travelTo(s, d.city as string);
      log(s, `Took the Night Coach to ${CITIES[d.city as string].name}.`);
      return { text: `You doze off to the rocking of the coach and wake in ${CITIES[d.city as string].name}.`, tone: 'good' };
    },
  },
  {
    id: 'squabble', weight: 2, time: 'night',
    when: (s) => s.roster.length >= 2,
    create: (s) => {
      const [a, b] = [...s.roster].sort(() => Math.random() - 0.5);
      return { a: a.uid, b: b.uid, an: nameOf(a), bn: nameOf(b) };
    },
    view: (s, d) => ({
      title: 'Team Squabble', icon: '😾', forced: true,
      text: `${d.an} and ${d.bn} are fighting over the warm spot by the fire. Someone has to settle it.`,
      choices: [
        { id: 'a', label: `Side with ${d.an}`, detail: `${d.an} +2 Morale, ${d.bn} −1 Morale.` },
        { id: 'b', label: `Side with ${d.bn}`, detail: `${d.bn} +2 Morale, ${d.an} −1 Morale.` },
        { id: 'calm', label: 'Calm them both · 1 Initiative', detail: 'Both +1 Morale.', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
      ],
    }),
    resolve: (s, d, choice) => {
      const a = team(s).find((c) => c.uid === d.a), b = team(s).find((c) => c.uid === d.b);
      if (!a || !b) return { text: 'By morning the argument has blown over on its own.', tone: 'info' };
      if (choice === 'calm') { s.initiative -= 1; cheer(a, 1); cheer(b, 1); return { text: `You split the spot and some treats between them. ${nameOf(a)} and ${nameOf(b)} curl up together.`, tone: 'good' }; }
      const [win, lose] = choice === 'a' ? [a, b] : [b, a];
      cheer(win, 2); cheer(lose, -1);
      return { text: `${nameOf(win)} gets the warm spot. ${nameOf(lose)} sulks. (+2 / −1 Morale)`, tone: 'info' };
    },
  },
  {
    id: 'scholar', weight: 2, time: 'day',
    create: (s) => {
      const biome = here(s).biome;
      const unseen = [...new Set(BIOME_TYPES[biome].flatMap((t) => speciesPool(biome, t, 'common', 2).map((x) => x.id)))].filter((id) => !s.dex.seen.includes(id));
      return { species: unseen.sort(() => Math.random() - 0.5).slice(0, 2) };
    },
    view: (_s, d) => ({
      title: 'Codex Scholar', icon: '🔍',
      text: (d.species as string[]).length
        ? 'A field researcher sketching by the trail offers to copy a few pages of notes on the creatures around here into your Codex.'
        : 'A field researcher compares notes with you. Your Codex already covers everything around here, so they pay you for a copy of yours.',
      choices: [{ id: 'accept', label: (d.species as string[]).length ? 'Copy their notes' : 'Sell a copy · +💰 3' }],
    }),
    resolve: (s, d) => {
      const ids = d.species as string[];
      if (!ids.length) { const got = earnCoins(s, 3); return { text: `The researcher pays ${got} coins for your notes.`, tone: 'good' }; }
      for (const id of ids) if (!s.dex.seen.includes(id)) s.dex.seen.push(id);
      return { text: `Your Codex now has entries for ${ids.map((id) => SPECIES_BY_ID[id].name).join(' and ')}, so you can carve their Effigies too.`, tone: 'good' };
    },
  },
  {
    id: 'satchel', weight: 2, time: 'day',
    create: () => ({ coins: 2 + roll(6) }),
    view: (_s, d) => ({
      title: 'Lost Satchel', icon: '🎒',
      text: `You find a satchel by the trail with 💰 ${d.coins} inside and a name stitched on the strap.`,
      choices: [
        { id: 'keep', label: `Keep it · +💰 ${d.coins}`, detail: 'Your follower gives you a look. (−1 Morale)' },
        { id: 'return', label: 'Track down the owner', detail: 'They give you a Calm Tea, and your team is proud of you (+1 Morale).' },
      ],
    }),
    resolve: (s, d, choice) => {
      if (choice === 'keep') {
        const got = earnCoins(s, d.coins as number);
        const f = follower(s);
        if (f) cheer(f, -1);
        return { text: `You pocket 💰 ${got}.${f ? ` ${nameOf(f)} looks away.` : ''}`, tone: 'info' };
      }
      addItem(s, 'calm-tea');
      for (const c of s.roster) cheer(c, 1);
      return { text: 'The grateful owner presses a Calm Tea into your hands.', tone: 'good' };
    },
  },
  {
    id: 'star', weight: 2, time: 'night',
    create: () => ({}),
    view: () => ({
      title: 'Shooting Star', icon: '🌠',
      text: 'A star streaks across the sky. Your team looks at you expectantly. Make a wish!',
      choices: [
        { id: 'luck', label: 'Wish for luck', detail: 'Receive a Star Charm (+1 rarity die on an encounter).' },
        { id: 'team', label: 'Wish for your team', detail: 'All your partner creatures (in totems too) gain +1 Morale.' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'luck') { addItem(s, 'star-charm'); return { text: 'At dawn, a glittering Star Charm lies where the star fell.', tone: 'good' }; }
      for (const c of team(s)) cheer(c, 1);
      return { text: 'Your team sleeps soundly under the stars. (+1 Morale)', tone: 'good' };
    },
  },
  {
    id: 'berries', weight: 2, time: 'night',
    when: (s) => s.roster.some((c) => !c.ko),
    create: (s) => { const c = pick(s.roster.filter((x) => !x.ko)); return { uid: c.uid, name: nameOf(c) }; },
    view: (s, d) => ({
      title: 'Bad Berries', icon: '🤢', forced: true,
      text: `${d.name} snuck a handful of wild berries before bed. They were not the good kind.`,
      choices: [
        { id: 'salve', label: 'Give it a Salve', detail: 'Uses one Salve. It’s fine by morning.', disabled: (s.inventory.salve ?? 0) > 0 ? undefined : 'You have no Salve.' },
        { id: 'rest', label: 'Stay with it · 1 Initiative', detail: 'Nurse it through the night.', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
        { id: 'endure', label: 'Let it sleep it off', detail: '−1 heart (never its last) and −1 Morale.' },
      ],
    }),
    resolve: (s, d, choice) => {
      const c = team(s).find((x) => x.uid === d.uid);
      if (!c) return { text: 'Whoever it was, they seem fine now.', tone: 'info' };
      if (choice === 'salve') { addItem(s, 'salve', -1); return { text: `${nameOf(c)} perks up after the Salve.`, tone: 'good' }; }
      if (choice === 'rest') { s.initiative -= 1; cheer(c, 1); return { text: `You sit up with ${nameOf(c)} all night. It’s grateful (+1 Morale).`, tone: 'good' }; }
      c.vitality = Math.max(0, c.vitality - 1);
      cheer(c, -1);
      return { text: `${nameOf(c)} has a rough night. (−1 heart, −1 Morale)`, tone: 'bad' };
    },
  },
  {
    id: 'apprentice', weight: 2, time: 'day',
    when: (s) => s.roster.some((c) => !c.ko),
    create: () => ({ xp: 3, tip: 2 }),
    view: (_s, d) => ({
      title: 'Eager Apprentice', icon: '🧒',
      text: 'A young would-be trainer begs to watch one of your creatures run its drills. They even offer to pay.',
      choices: [
        { id: 'show', label: 'Show them a drill', detail: `The creature gains +${d.xp} XP and +1 Morale, and the kid tips 💰 ${d.tip}.`, pick: true, canPick: notKO },
        { id: 'decline', label: 'Not today', detail: 'They wander off, disappointed.' },
      ],
    }),
    resolve: (s, d, choice, c) => {
      if (choice !== 'show' || !c) return { text: 'The apprentice waves goodbye.', tone: 'info' };
      const lv = gainXp(c, d.xp as number);
      cheer(c, 1);
      const got = earnCoins(s, d.tip as number);
      return { text: `${nameOf(c)} shows off: +${d.xp} XP${lv ? `, now Lv ${c.level}` : ''}, and the kid tips you 💰 ${got}.`, tone: 'good' };
    },
  },

  // ── Cloud Island (only while on the island) ────────────────────
  {
    id: 'shepherd', weight: 3, time: 'night', place: 'cloud',
    create: () => ({}),
    view: (s) => ({
      title: 'Star Shepherd', icon: '🌟',
      text: 'A glowing figure with a crook herds drifting stardust across the clouds. "Lend a hand, and keep what falls."',
      choices: [
        { id: 'help', label: 'Help gather · 1 Initiative', detail: 'Get 2 Stardust (+2 to recruit any creature).', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
        { id: 'bless', label: 'Ask for a blessing', detail: 'Your follower gets +1 Loyalty and +1 Morale.' },
        DECLINE,
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'help') { s.initiative -= 1; addItem(s, 'stardust', 2); return { text: 'You herd the stardust into a glittering pile. (+2 Stardust)', tone: 'good' }; }
      if (choice === 'bless') {
        const f = follower(s);
        if (!f) return { text: 'The shepherd blesses the empty air beside you, smiling.', tone: 'info' };
        addLoyalty(f, 1); cheer(f, 1);
        return { text: `The shepherd touches ${nameOf(f)}’s brow. It glows faintly all night. (+1 Loyalty, +1 Morale)`, tone: 'good' };
      }
      return { text: 'The shepherd drifts on into the dark.', tone: 'info' };
    },
  },
  {
    id: 'moonbow', weight: 2, time: 'night', place: 'cloud',
    create: () => ({}),
    view: () => ({
      title: 'Moonbow', icon: '🌈',
      text: 'A rainbow arcs across the clouds in silver moonlight. Its end touches the ground right beside you.',
      choices: [
        { id: 'reach', label: 'Reach for its end', detail: 'Roll d6: 5–6 a Moonbow Prism (+3 to recruit any creature), otherwise a Cloud Silk.' },
        { id: 'watch', label: 'Watch it with your team', detail: 'All your partner creatures (in totems too) gain +1 Morale.' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'watch') { for (const c of team(s)) cheer(c, 1); return { text: 'Your team watches until the moonbow fades. (+1 Morale)', tone: 'good' }; }
      const r = roll(6);
      if (r >= 5) { addItem(s, 'moonbow-prism'); return { text: 'Your fingers close on a shard of colour: a Moonbow Prism!', tone: 'good', rolls: [r] }; }
      addItem(s, 'cloud-silk');
      return { text: 'The moonbow slips away, leaving a wisp of Cloud Silk in your hand.', tone: 'info', rolls: [r] };
    },
  },
  {
    id: 'skywhale', weight: 2, place: 'cloud',
    when: (s) => !!follower(s),
    create: () => ({ xp: 6 }),
    view: (s, d) => ({
      title: 'Sky Whale', icon: '🐋',
      text: 'An enormous whale of cloud glides past, close enough to touch. Your follower stares at it, wide-eyed.',
      choices: [
        { id: 'ride', label: 'Let your follower ride along · 1 Initiative', detail: `Your follower gains +${d.xp} XP and +1 Morale.`, disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
        { id: 'wave', label: 'Wave hello', detail: 'It shakes loose 2 Cloud Silk as it passes.' },
      ],
    }),
    resolve: (s, d, choice) => {
      const f = follower(s);
      if (choice === 'ride' && f) {
        s.initiative -= 1;
        const lv = gainXp(f, d.xp as number); cheer(f, 1);
        return { text: `${nameOf(f)} rides the whale around the island and back: +${d.xp} XP${lv ? `, now Lv ${f.level}` : ''}!`, tone: 'good' };
      }
      addItem(s, 'cloud-silk', 2);
      return { text: 'The whale rumbles a greeting and sheds 2 Cloud Silk.', tone: 'good' };
    },
  },
  {
    id: 'cloudbank', weight: 2, place: 'cloud',
    create: () => ({}),
    view: (s) => {
      const f = follower(s);
      const spd = f ? stats(f).speed : 0;
      return {
        title: 'Cloud Bank', icon: '🌫️', forced: true,
        text: 'A thick bank of cloud swallows the path. You can barely see your own feet.',
        choices: [
          { id: 'wait', label: 'Wait for it to lift · 1 Initiative', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
          { id: 'feel', label: f ? `Let ${nameOf(f)} lead the way` : 'Feel your way forward', detail: `Roll d6 + Speed ${spd} ≥ 7: you find a Stardust in the fog. Miss: your active team gets −1 Morale.` },
        ],
      };
    },
    resolve: (s, _d, choice) => {
      if (choice === 'wait') { s.initiative = Math.max(0, s.initiative - 1); return { text: 'The cloud lifts after a while. (−1 Initiative)', tone: 'info' }; }
      const f = follower(s);
      const r = roll(6);
      if (r + (f ? stats(f).speed : 0) >= 7) { addItem(s, 'stardust'); return { text: 'Sure-footed through the fog, you stumble onto a Stardust!', tone: 'good', rolls: [r] }; }
      for (const c of s.roster) cheer(c, -1);
      return { text: 'Lost in the fog for hours, your team comes out grumpy. (−1 Morale)', tone: 'bad', rolls: [r] };
    },
  },
  {
    id: 'sunlit', weight: 3, time: 'day', place: 'cloud',
    create: () => ({}),
    view: () => ({
      title: 'Sunlit Clouds', icon: '☀️',
      text: 'Daylight burns the portal shut until night. The clouds glow warm and soft under the sun.',
      choices: [
        { id: 'bask', label: 'Bask in the sun', detail: 'Your active team (not KO’d) gets full Health, and Fatigue cleared.' },
        { id: 'comb', label: 'Comb the clouds', detail: 'Find 1 Cloud Silk and 1 Stardust.' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'bask') {
        for (const c of s.roster) if (!c.ko) { c.vitality = maxVitality(c); c.health = maxHealth(c); c.fatigue = 0; }
        return { text: 'Your team naps on a sunbeam and wakes restored.', tone: 'good' };
      }
      addItem(s, 'cloud-silk'); addItem(s, 'stardust');
      return { text: 'You comb the clouds and find a Cloud Silk and a Stardust.', tone: 'good' };
    },
  },

  // ── The Forest Floor (only there; all hostile) ─────────────────
  {
    id: 'stalker', weight: 3, place: 'floor',
    when: (s) => s.roster.some((c) => !c.ko),
    create: () => ({}),
    view: (s) => ({
      title: 'Something in the Dark', icon: '👁️', forced: true,
      text: 'Eyes glint between the roots. Something big has been stalking you, and now it’s close.',
      choices: [
        { id: 'fight', label: 'Turn and fight', detail: 'A tough wild creature, 2 levels above the usual. Running is hard down here.' },
        { id: 'bait', label: 'Throw it some food', detail: 'Lose a random treat or offering material from your bag.', disabled: baitItems(s).length ? undefined : 'You have no treats or materials.' },
        { id: 'flee', label: 'Flee into the dark', detail: 'You lose your bearings: −1 sign of Dahlia’s Trail.' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'bait') { const id = pick(baitItems(s)); addItem(s, id, -1); return { text: `You toss it the ${ITEMS[id]?.name ?? id}. It drags it off into the dark.`, tone: 'info' }; }
      if (choice === 'flee') { s.flags.dahliaTrail = Math.max(0, (s.flags.dahliaTrail ?? 0) - 1); return { text: 'You run until the eyes are gone, and lose the trail. (−1 sign)', tone: 'bad' }; }
      const level = baseWildLevel(s, here(s)) + 2;
      const wild = createCreature(pickSpecies(here(s), 'prime', level, [], 'night').id, level);
      if (!s.dex.seen.includes(wild.species)) s.dex.seen.push(wild.species);
      const battle = createBattle(playerSide(s), { kind: 'wild', name: `Wild ${nameOf(wild)}`, team: [wild], active: 0, mods: {} }, weather(s), { biome: 'deepwood', hardRun: true });
      return { text: `A wild ${nameOf(wild)} lunges from the dark!`, tone: 'bad', battle };
    },
  },
  {
    id: 'roots', weight: 3, place: 'floor',
    when: (s) => s.roster.some((c) => !c.ko),
    create: (s) => { const c = pick(s.roster.filter((x) => !x.ko)); return { uid: c.uid, name: nameOf(c) }; },
    view: (s, d) => ({
      title: 'Grasping Roots', icon: '🌱', forced: true,
      text: `Roots coil out of the dark and seize ${d.name}, dragging it toward the soil.`,
      choices: [
        { id: 'cut', label: 'Cut it free · 1 Initiative', detail: 'Slow, careful work.', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
        { id: 'tear', label: 'Tear it free', detail: `${d.name} loses a heart (never its last) and 1 Morale.` },
      ],
    }),
    resolve: (s, d, choice) => {
      const c = team(s).find((x) => x.uid === d.uid);
      if (!c) return { text: 'The roots slither back into the soil.', tone: 'info' };
      if (choice === 'cut') { s.initiative -= 1; return { text: `You hack ${nameOf(c)} free, root by root.`, tone: 'info' }; }
      c.vitality = Math.max(0, c.vitality - 1); cheer(c, -1);
      return { text: `${nameOf(c)} rips free, bruised and shaken. (−1 heart, −1 Morale)`, tone: 'bad' };
    },
  },
  {
    id: 'spores', weight: 2, place: 'floor',
    create: () => ({}),
    view: (s) => {
      const f = follower(s);
      const spd = f ? stats(f).speed : 0;
      return {
        title: 'Spore Cloud', icon: '🍄', forced: true,
        text: 'A huge fungus bursts, and a choking cloud of spores rolls toward your team.',
        choices: [
          { id: 'tea', label: 'Brew a Calm Tea', detail: 'Uses one Calm Tea. Your team breathes through the steam, unharmed.', disabled: (s.inventory['calm-tea'] ?? 0) > 0 ? undefined : 'You have no Calm Tea.' },
          { id: 'run', label: f ? `Follow ${nameOf(f)} out of the cloud` : 'Run for it', detail: `Roll d6 + Speed ${spd} ≥ 7 to escape. Miss: your active team gains 1 Fatigue and −1 Morale.` },
        ],
      };
    },
    resolve: (s, _d, choice) => {
      if (choice === 'tea') { addItem(s, 'calm-tea', -1); return { text: 'The tea’s steam keeps the spores at bay.', tone: 'info' }; }
      const f = follower(s);
      const r = roll(6);
      if (r + (f ? stats(f).speed : 0) >= 7) return { text: 'You burst out of the cloud before it reaches you.', tone: 'good', rolls: [r] };
      for (const c of s.roster) if (!c.ko) { c.fatigue = Math.min(5, c.fatigue + 1); cheer(c, -1); }
      return { text: 'The spores catch you. Your team coughs and stumbles. (+1 Fatigue, −1 Morale)', tone: 'bad', rolls: [r] };
    },
  },
  {
    id: 'whispers', weight: 2, place: 'floor',
    create: () => ({}),
    view: (s) => ({
      title: 'Whispers in the Dark', icon: '🌫️', forced: true,
      text: 'Voices whisper from every direction, mimicking Dahlia’s. The trail blurs.',
      choices: [
        { id: 'retrace', label: 'Retrace your steps · 2 Initiative', detail: 'Keep the trail.', disabled: s.initiative < 2 ? 'Not enough Initiative.' : undefined },
        { id: 'follow', label: 'Follow the voices', detail: '−1 sign of Dahlia’s Trail.' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'retrace') { s.initiative -= 2; return { text: 'You find your own footprints again. The trail holds.', tone: 'info' }; }
      s.flags.dahliaTrail = Math.max(0, (s.flags.dahliaTrail ?? 0) - 1);
      return { text: 'The voices lead you in circles. (−1 sign of the trail)', tone: 'bad' };
    },
  },
  {
    id: 'shadethieves', weight: 2, place: 'floor',
    when: (s) => Object.keys(s.inventory).some((id) => (s.inventory[id] ?? 0) > 0 && ITEMS[id]?.kind !== 'key'),
    create: () => ({}),
    view: (s) => {
      const f = follower(s);
      const spd = f ? stats(f).speed : 0;
      return {
        title: 'Shade Thieves', icon: '🦇', forced: true,
        text: 'Shadows flit across your bag. Something small and quick is making off with your things!',
        choices: [
          { id: 'let', label: 'Let them go', detail: 'Lose one random item (never a key item).' },
          { id: 'chase', label: f ? `Send ${nameOf(f)} after them` : 'Chase them', detail: `Roll d6 + Speed ${spd} ≥ 7: you lose nothing. Miss: you lose the item, and your follower loses a heart in the scramble (never its last).` },
        ],
      };
    },
    resolve: (s, _d, choice) => {
      const loot = Object.keys(s.inventory).filter((id) => (s.inventory[id] ?? 0) > 0 && ITEMS[id]?.kind !== 'key');
      const id = loot.length ? pick(loot) : null;
      if (choice === 'chase') {
        const f = follower(s);
        const r = roll(6);
        if (r + (f ? stats(f).speed : 0) >= 7) return { text: 'You catch the thieves and shake your things loose.', tone: 'good', rolls: [r] };
        if (f && !f.ko) f.vitality = Math.max(0, f.vitality - 1);
        if (id) addItem(s, id, -1);
        return { text: `They get away${id ? ` with your ${ITEMS[id]?.name ?? id}` : ''}, and the scramble leaves ${f ? nameOf(f) : 'you'} bruised.`, tone: 'bad', rolls: [r] };
      }
      if (id) addItem(s, id, -1);
      return { text: id ? `The shadows vanish with your ${ITEMS[id]?.name ?? id}.` : 'The shadows find nothing worth taking.', tone: 'bad' };
    },
  },
];

/** Treats and materials a trainer could throw to a stalker. */
function baitItems(s: GameState) {
  return Object.keys(s.inventory).filter((id) => (s.inventory[id] ?? 0) > 0 && ['treat', 'material'].includes(ITEMS[id]?.kind ?? ''));
}

export const EVENT_IDS = EVENTS.map((e) => e.id);
/** Where each event can happen: 'cloud' (Cloud Island only), 'floor' (the Forest Floor only) or 'anywhere' (anywhere else). */
export const EVENT_PLACES: Record<string, 'cloud' | 'floor' | 'anywhere'> = Object.fromEntries(EVENTS.map((e) => [e.id, e.place ?? 'anywhere']));
/** When each event can happen: 'day', 'night' or 'any'. */
export const EVENT_TIMES: Record<string, TimeOfDay | 'any'> = Object.fromEntries(EVENTS.map((e) => [e.id, e.time ?? 'any']));
const BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

/** Roll the start-of-turn event. Never repeats the previous event. Returns it (also stored on `s.event`). */
export function rollEvent(s: GameState, force?: string): PendingEvent | null {
  if (s.phase !== 'map' || s.event) return s.event ?? null;
  if (!force && Math.random() >= EVENT_CHANCE) return null;
  const now = timeOfDay(s.turn);
  // Cloud Island and the Forest Floor have their own events, and only those happen there
  const place = isCloudNode(s.location) ? 'cloud' : s.location === FOREST_FLOOR ? 'floor' : undefined;
  const pool = force ? [BY_ID[force]] : EVENTS.filter((e) => e.id !== s.lastEvent && e.place === place && (!e.time || e.time === now) && (!e.when || e.when(s)));
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
