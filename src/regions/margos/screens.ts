// The screens of Margos's gimmicks (gimmicks/ has their rules).
import type { App } from '../../ui/app';
import { closeAllSheets, h, openSheet, tile, toast } from '../../ui/dom';
import { save } from '../../engine/state';
import { tools } from '../../engine/tools';
import * as W from '../../engine/world';
import { gauntletBlock, gauntletOpen, gauntletProgress } from './gimmicks/gauntlet';
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

/** Iron Coast Gauntlet: progress, the next opponent, and the button to face them. */
function gauntletSheet(app: App) {
  const s = app.s;
  const g = gauntletProgress(s, tools);
  const why = gauntletBlock(s, tools);
  const close = openSheet('⚓ Iron Coast Gauntlet', h('div', { class: 'gauntlet' },
    h('p', null, `Stella only faces trainers who prove themselves against the coast’s best. Beat ${g.need} local trainers (2 per Tier) and her fortress rises from the waves, for good.`),
    h('div', { class: 'gauntlet-pips', 'aria-label': `${g.wins} of ${g.need} beaten` }, Array.from({ length: g.need }, (_, i) => h('span', { class: i < g.wins ? 'on' : i === g.wins ? 'next' : '' }))),
    h('p', null, h('b', null, `${g.wins} of ${g.need} beaten.`), ` Next: a Steel-leaning trainer, Lv ${g.nextLevel}${g.wins + 1 >= g.need ? ' (the last and toughest)' : ''}.`),
    h('ul', { class: 'small' },
      h('li', null, 'Take the matches over as many turns as you like, and rest at the Stable in between.'),
      h('li', null, h('b', null, 'Leaving Iron Coast resets your progress'), ' (travelling, or being sent home after a team wipe).'),
      h('li', null, 'A loss doesn’t reset it: rest up and try that trainer again. Trainer stakes apply (coins won or lost).'),
      h('li', null, 'Once cleared, Stella will accept your challenge any time you come back.')),
    h('div', { class: 'row end gap' },
      h('button', { class: 'btn ghost', onclick: () => close() }, 'Not now'),
      h('button', { class: 'btn primary', disabled: !!why, title: why ?? '', onclick: async () => {
        const r = W.gimmickBattle(s, 'gauntlet');
        if (!r) { toast(gauntletBlock(s, tools) ?? 'Not now.', 'info'); return; }
        closeAllSheets();
        app.renderHud();
        await app.runBattle(r.battle, { kind: 'trainer', gimmick: 'gauntlet', intro: `Gauntlet match ${r.match} of ${r.of}: ${r.name} steps up!` });
        if (s.flags.stellaOpen && !s.merits.includes(s.location)) toast('⚓ The Gauntlet is cleared. Stella’s fortress rises from the waves!', 'good', 4500);
      } }, `Battle the next trainer · ${W.cityActionCost(s)}⚡`)),
    why ? h('p', { class: 'small muted' }, why) : null));
}

function gauntletTile(app: App, city: string, cost: string): HTMLElement[] {
  if (!gauntletOpen(app.s, city)) return [];
  const g = gauntletProgress(app.s, tools);
  return [tile('⚓', 'Iron Coast Gauntlet', `Beat ${g.need} local trainers in a row to earn a match with Stella: ${g.wins}/${g.need} so far. Rest at the Stable between matches as often as you like, but leaving the city resets it.`, cost, () => gauntletSheet(app))];
}

export const margosScreens: Screens = {
  show: { fabian: findFabian, gauntlet: gauntletSheet },
  tiles: gauntletTile,
};
