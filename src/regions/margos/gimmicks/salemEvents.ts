// What happens on Cloud Island, and nowhere else.
import type { CreatureInst } from '../../../engine/creature';
import type { GameState } from '../../../engine/state';
import type { EventChoice, EventDef } from '../../../engine/events';
import type { Tools } from '../../gimmick';

const DECLINE: EventChoice = { id: 'decline', label: 'No thanks', detail: 'Go on your way.' };
const team = (s: GameState) => [...s.roster, ...s.reserve];
/** Change Morale within 0–10. */
function cheer(c: CreatureInst, n: number) { c.morale = Math.max(0, Math.min(10, c.morale + n)); }

export const cloudEvents = (t: Tools): EventDef[] => [
  {
    id: 'shepherd', weight: 3, time: 'night',
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
      if (choice === 'help') { s.initiative -= 1; t.addItem(s, 'stardust', 2); return { text: 'You herd the stardust into a glittering pile. (+2 Stardust)', tone: 'good' }; }
      if (choice === 'bless') {
        const f = t.follower(s);
        if (!f) return { text: 'The shepherd blesses the empty air beside you, smiling.', tone: 'info' };
        t.addLoyalty(f, 1); cheer(f, 1);
        return { text: `The shepherd touches ${t.nameOf(f)}’s brow. It glows faintly all night. (+1 Loyalty, +1 Morale)`, tone: 'good' };
      }
      return { text: 'The shepherd drifts on into the dark.', tone: 'info' };
    },
  },
  {
    id: 'moonbow', weight: 2, time: 'night',
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
      const r = t.roll(6);
      if (r >= 5) { t.addItem(s, 'moonbow-prism'); return { text: 'Your fingers close on a shard of colour: a Moonbow Prism!', tone: 'good', rolls: [r] }; }
      t.addItem(s, 'cloud-silk');
      return { text: 'The moonbow slips away, leaving a wisp of Cloud Silk in your hand.', tone: 'info', rolls: [r] };
    },
  },
  {
    id: 'skywhale', weight: 2,
    when: (s) => !!t.follower(s),
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
      const f = t.follower(s);
      if (choice === 'ride' && f) {
        s.initiative -= 1;
        const lv = t.gainXp(f, d.xp as number); cheer(f, 1);
        return { text: `${t.nameOf(f)} rides the whale around the island and back: +${d.xp} XP${lv ? `, now Lv ${f.level}` : ''}!`, tone: 'good' };
      }
      t.addItem(s, 'cloud-silk', 2);
      return { text: 'The whale rumbles a greeting and sheds 2 Cloud Silk.', tone: 'good' };
    },
  },
  {
    id: 'cloudbank', weight: 2,
    create: () => ({}),
    view: (s) => {
      const f = t.follower(s);
      const spd = f ? t.stats(f).speed : 0;
      return {
        title: 'Cloud Bank', icon: '🌫️', forced: true,
        text: 'A thick bank of cloud swallows the path. You can barely see your own feet.',
        choices: [
          { id: 'wait', label: 'Wait for it to lift · 1 Initiative', disabled: s.initiative < 1 ? 'No Initiative left.' : undefined },
          { id: 'feel', label: f ? `Let ${t.nameOf(f)} lead the way` : 'Feel your way forward', detail: `Roll d6 + Speed ${spd} ≥ 7: you find a Stardust in the fog. Miss: your active team gets −1 Morale.` },
        ],
      };
    },
    resolve: (s, _d, choice) => {
      if (choice === 'wait') { s.initiative = Math.max(0, s.initiative - 1); return { text: 'The cloud lifts after a while. (−1 Initiative)', tone: 'info' }; }
      const f = t.follower(s);
      const r = t.roll(6);
      if (r + (f ? t.stats(f).speed : 0) >= 7) { t.addItem(s, 'stardust'); return { text: 'Sure-footed through the fog, you stumble onto a Stardust!', tone: 'good', rolls: [r] }; }
      for (const c of s.roster) cheer(c, -1);
      return { text: 'Lost in the fog for hours, your team comes out grumpy. (−1 Morale)', tone: 'bad', rolls: [r] };
    },
  },
  {
    id: 'sunlit', weight: 3, time: 'day',
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
        for (const c of s.roster) if (!c.ko) { c.vitality = t.maxVitality(c); c.health = t.maxHealth(c); c.fatigue = 0; }
        return { text: 'Your team naps on a sunbeam and wakes restored.', tone: 'good' };
      }
      t.addItem(s, 'cloud-silk'); t.addItem(s, 'stardust');
      return { text: 'You comb the clouds and find a Cloud Silk and a Stardust.', tone: 'good' };
    },
  },
];
