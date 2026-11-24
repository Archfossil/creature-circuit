// The screens of Margos's gimmicks (gimmicks/ has their rules).
import type { App } from '../../ui/app';
import { h, openSheet, toast } from '../../ui/dom';
import { save } from '../../engine/state';
import type { Screens } from '../screens';

function findFabian(app: App) {
  const s = app.s;
  const faces = ['🧑‍🌾', '👵', '🧔', '👩‍🎨', '🧙'];
  const fab = Math.floor(Math.random() * 3);
  const shown = [...faces].sort(() => Math.random() - 0.5).slice(0, 3);
  const close = openSheet('Where is Fabian?', h('div', null,
    h('p', null, 'Fabian hides among the townsfolk of Hollow Crest in disguise. Who looks suspicious? (A wrong guess costs 1 Initiative as you get pranked.)'),
    h('div', { class: 'fabian' }, shown.map((f, i) => h('button', { class: 'villager', onclick: () => {
      close();
      if (i === fab) { s.flags.fabianFound = true; toast('"Ha! You saw through my glamour." Fabian will accept your challenge.', 'good', 4000); save(s); void app.arbiter(); }
      else { s.initiative = Math.max(0, s.initiative - 1); toast('A bucket of glitter falls on you. Wrong villager!', 'bad', 3000); save(s); app.renderHud(); }
    } }, f)))));
}

export const margosScreens: Screens = {
  show: { fabian: findFabian },
};
