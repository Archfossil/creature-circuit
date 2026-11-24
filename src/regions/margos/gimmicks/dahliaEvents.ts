// What happens on the Forest Floor, and nowhere else. It's all hostile.
import type { CreatureInst } from '../../../engine/creature';
import type { GameState } from '../../../engine/state';
import type { EventDef } from '../../../engine/events';
import type { Tools } from '../../gimmick';

const team = (s: GameState) => [...s.roster, ...s.reserve];
/** Change Morale within 0–10. */
function cheer(c: CreatureInst, n: number) { c.morale = Math.max(0, Math.min(10, c.morale + n)); }

/** Treats and materials a trainer could throw to a stalker. */
function baitItems(s: GameState, t: Tools) {
  return Object.keys(s.inventory).filter((id) => (s.inventory[id] ?? 0) > 0 && ['treat', 'material'].includes(t.ITEMS[id]?.kind ?? ''));
}

export const floorEvents = (t: Tools): EventDef[] => [
  {
    id: 'stalker', weight: 3,
    when: (s) => s.roster.some((c) => !c.ko),
    create: () => ({}),
    view: (s) => ({
      title: 'Something in the Dark', icon: '👁️', forced: true,
      text: 'Eyes glint between the roots. Something big has been stalking you, and now it’s close.',
      choices: [
        { id: 'fight', label: 'Turn and fight', detail: 'A tough wild creature, 2 levels above the usual. Running is hard down here.' },
        { id: 'bait', label: 'Throw it some food', detail: 'Lose a random treat or offering material from your bag.', disabled: baitItems(s, t).length ? undefined : 'You have no treats or materials.' },
        { id: 'flee', label: 'Flee into the dark', detail: 'You lose your bearings: −1 sign of Dahlia’s Trail.' },
      ],
    }),
    resolve: (s, _d, choice) => {
      if (choice === 'bait') { const id = t.pick(baitItems(s, t)); t.addItem(s, id, -1); return { text: `You toss it the ${t.ITEMS[id]?.name ?? id}. It drags it off into the dark.`, tone: 'info' }; }
      if (choice === 'flee') { s.flags.dahliaTrail = Math.max(0, (s.flags.dahliaTrail ?? 0) - 1); return { text: 'You run until the eyes are gone, and lose the trail. (−1 sign)', tone: 'bad' }; }
      const level = t.baseWildLevel(s, t.here(s)) + 2;
      const wild = t.createCreature(t.pickSpecies(t.here(s), 'prime', level, [], 'night').id, level);
      if (!s.dex.seen.includes(wild.species)) s.dex.seen.push(wild.species);
      const battle = t.createBattle(t.playerSide(s), { kind: 'wild', name: `Wild ${t.nameOf(wild)}`, team: [wild], active: 0, mods: {} }, t.weather(s), { biome: 'deepwood', hardRun: true });
      return { text: `A wild ${t.nameOf(wild)} lunges from the dark!`, tone: 'bad', battle };
    },
  },
  {
    id: 'roots', weight: 3,
    when: (s) => s.roster.some((c) => !c.ko),
    create: (s) => { const c = t.pick(s.roster.filter((x) => !x.ko)); return { uid: c.uid, name: t.nameOf(c) }; },
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
      if (choice === 'cut') { s.initiative -= 1; return { text: `You hack ${t.nameOf(c)} free, root by root.`, tone: 'info' }; }
      c.vitality = Math.max(0, c.vitality - 1); cheer(c, -1);
      return { text: `${t.nameOf(c)} rips free, bruised and shaken. (−1 heart, −1 Morale)`, tone: 'bad' };
    },
  },
  {
    id: 'spores', weight: 2,
    create: () => ({}),
    view: (s) => {
      const f = t.follower(s);
      const spd = f ? t.stats(f).speed : 0;
      return {
        title: 'Spore Cloud', icon: '🍄', forced: true,
        text: 'A huge fungus bursts, and a choking cloud of spores rolls toward your team.',
        choices: [
          { id: 'tea', label: 'Brew a Calm Tea', detail: 'Uses one Calm Tea. Your team breathes through the steam, unharmed.', disabled: (s.inventory['calm-tea'] ?? 0) > 0 ? undefined : 'You have no Calm Tea.' },
          { id: 'run', label: f ? `Follow ${t.nameOf(f)} out of the cloud` : 'Run for it', detail: `Roll d6 + Speed ${spd} ≥ 7 to escape. Miss: your active team gains 1 Fatigue and −1 Morale.` },
        ],
      };
    },
    resolve: (s, _d, choice) => {
      if (choice === 'tea') { t.addItem(s, 'calm-tea', -1); return { text: 'The tea’s steam keeps the spores at bay.', tone: 'info' }; }
      const f = t.follower(s);
      const r = t.roll(6);
      if (r + (f ? t.stats(f).speed : 0) >= 7) return { text: 'You burst out of the cloud before it reaches you.', tone: 'good', rolls: [r] };
      for (const c of s.roster) if (!c.ko) { c.fatigue = Math.min(5, c.fatigue + 1); cheer(c, -1); }
      return { text: 'The spores catch you. Your team coughs and stumbles. (+1 Fatigue, −1 Morale)', tone: 'bad', rolls: [r] };
    },
  },
  {
    id: 'whispers', weight: 2,
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
    id: 'shadethieves', weight: 2,
    when: (s) => Object.keys(s.inventory).some((id) => (s.inventory[id] ?? 0) > 0 && t.ITEMS[id]?.kind !== 'key'),
    create: () => ({}),
    view: (s) => {
      const f = t.follower(s);
      const spd = f ? t.stats(f).speed : 0;
      return {
        title: 'Shade Thieves', icon: '🦇', forced: true,
        text: 'Shadows flit across your bag. Something small and quick is making off with your things!',
        choices: [
          { id: 'let', label: 'Let them go', detail: 'Lose one random item (never a key item).' },
          { id: 'chase', label: f ? `Send ${t.nameOf(f)} after them` : 'Chase them', detail: `Roll d6 + Speed ${spd} ≥ 7: you lose nothing. Miss: you lose the item, and your follower loses a heart in the scramble (never its last).` },
        ],
      };
    },
    resolve: (s, _d, choice) => {
      const loot = Object.keys(s.inventory).filter((id) => (s.inventory[id] ?? 0) > 0 && t.ITEMS[id]?.kind !== 'key');
      const id = loot.length ? t.pick(loot) : null;
      if (choice === 'chase') {
        const f = t.follower(s);
        const r = t.roll(6);
        if (r + (f ? t.stats(f).speed : 0) >= 7) return { text: 'You catch the thieves and shake your things loose.', tone: 'good', rolls: [r] };
        if (f && !f.ko) f.vitality = Math.max(0, f.vitality - 1);
        if (id) t.addItem(s, id, -1);
        return { text: `They get away${id ? ` with your ${t.ITEMS[id]?.name ?? id}` : ''}, and the scramble leaves ${f ? t.nameOf(f) : 'you'} bruised.`, tone: 'bad', rolls: [r] };
      }
      if (id) t.addItem(s, id, -1);
      return { text: id ? `The shadows vanish with your ${t.ITEMS[id]?.name ?? id}.` : 'The shadows find nothing worth taking.', tone: 'bad' };
    },
  },
];
