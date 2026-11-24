// The screens of Margos's gimmicks (gimmicks/ has their rules).
import type { App } from '../../ui/app';
import { closeAllSheets, h, openSheet, rollDice, tile, toast } from '../../ui/dom';
import { sfx } from '../../ui/sound';
import { CITIES } from '../../data/map';
import { save, tierOf } from '../../engine/state';
import { tools } from '../../engine/tools';
import * as W from '../../engine/world';
import { aboveFloor, dahliaBeaten, floorDie, onFloor, trailProgress } from './gimmicks/dahlia';
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

/** The Forest Floor rules, with the trainer's current trail. Before climbing down, and from the HUD chip there. */
function floorRules(app: App): HTMLElement {
  const s = app.s;
  const t = trailProgress(s, tools);
  const beaten = dahliaBeaten(s);
  const rule = (icon: string, title: string, ...body: (string | Node)[]) => h('div', { class: 'cloud-rule' }, h('span', { class: 'cloud-rule-ico' }, icon), h('div', null, h('b', null, title), h('p', null, ...body)));
  return h('div', { class: 'cloud-rules' },
    h('p', null, 'The Forest Floor is a single, lightless place below Gloomshade. Here’s how it works.'),
    h('div', { class: 'cloud-status' },
      h('div', null, h('small', null, 'Dahlia’s Trail'), h('b', null, beaten ? '✓ Dahlia beaten' : t.found ? '🏮 Arena found' : `${t.steps} / ${t.need} signs`)),
      h('div', null, h('small', null, 'Signs needed'), h('b', null, `${t.need} (3 + Tier ${tierOf(s)})`)),
      h('div', null, h('small', null, 'Explore die'), h('b', null, `🎲 d${floorDie(s)}`))),
    beaten ? '' : h('div', { class: 'gauntlet-pips', 'aria-label': `${t.steps} of ${t.need} signs` }, Array.from({ length: t.need }, (_, k) => h('span', { class: k < t.steps ? 'on' : k === t.steps ? 'next' : '' }))),
    rule('➰', 'Getting down', 'Climb down from Gloomshade with a ', h('b', null, 'Canopy Rope'), ` (sold in ${W.keyTownName(s, 'canopy-rope')} this season). The Forest Floor is one node: you explore it again and again (🔍 Explore, the usual Initiative).`),
    rule('🎲', beaten ? 'Exploring the dark (d6, now Dahlia is beaten)' : 'Exploring the dark (d8)', h('b', null, '1–2'), ' nothing, and your active team loses 1 Morale: they fear the dark. ', h('b', null, '3–4'), ' a wild creature (night creatures, it’s always dark). ', h('b', null, '5–6'), ' an exotic find. ', h('b', null, '7–8'), ' a sign of ', h('b', null, 'Dahlia’s Trail'), '.', beaten ? ' With Dahlia beaten, the die is a d6: the same table without the trail, so no explore is wasted on it.' : ''),
    rule('🏮', 'Dahlia’s Trail', beaten ? 'You know the way now: challenge her to a rematch right there with 🏟️ Dahlia, no trail needed.' : `Find ${t.need} signs (3, +1 per Tier) and her arena appears. Challenge her right there with 🏟️ Dahlia.`),
    rule('🚪', 'Leaving loses the trail', h('b', null, 'Leaving the Forest Floor, by choice or by being sent home after a defeat, loses every sign.'), ' You’ll have to start over.'),
    rule('🏃', 'No easy escape', 'Wild creatures are hard to run from down here (you need a 7+, not 4+), unless your follower has Quick Step.'),
    rule('🍄', 'Exotic finds', 'Slightly better than usual: Duskberries (+2 Morale, +1 Loyalty), Root Salve (+2 hearts and clears Fatigue), Heartwood Resin and Glowcaps (stronger offerings).'),
    rule('⚠️', 'Hostile events', 'While you’re down here, only the Forest Floor’s events happen, and they’re all dangerous: stalkers, grasping roots, spore clouds, whispers and thieves.'));
}

function floorSheet(app: App) { openSheet('🌲 The Forest Floor', floorRules(app), { wide: true }); }

/** Before climbing down: the rules, and a last chance to turn back. */
function floorPrompt(app: App, cost: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (go: boolean) => { if (done) return; done = true; close(); resolve(go); };
    const close = openSheet('➰ Climb down to the Forest Floor?', h('div', null,
      floorRules(app),
      h('p', { class: 'small muted' }, 'You can read these rules again any time down there: tap the 🌲 Forest Floor chip at the top left.'),
      h('div', { class: 'row end gap sticky-foot' },
        h('button', { class: 'btn ghost', onclick: () => finish(false) }, 'Not now'),
        h('button', { class: 'btn primary', onclick: () => finish(true) }, `Climb down · ${cost}⚡`))), { wide: true, onClose: () => { if (!done) { done = true; resolve(false); } } });
  });
}

/** On the Forest Floor only: Dahlia's Trail at a glance, and the rules on tap. */
function floorChip(app: App): HTMLElement[] {
  const s = app.s, p = trailProgress(s, tools);
  return onFloor(s.location) ? [h('button', { class: 'cloud-chip floor-chip', title: 'Forest Floor rules', onclick: () => floorSheet(app) },
    h('b', null, '🌲 Forest Floor'),
    h('small', null, dahliaBeaten(s) ? 'Dahlia beaten' : p.found ? '🏮 Dahlia’s arena found!' : `Dahlia’s Trail ${p.steps}/${p.need}`),
    h('small', { class: 'cloud-chip-link' }, 'Tap for the rules'))] : [];
}

/** A sign of Dahlia's Trail. */
async function trailSign(app: App, out: Extract<W.Outcome, { t: 'trail' }>) {
  await rollDice('Explore', [{ sides: out.die, value: out.roll, tone: 'good', label: '7–8 Dahlia’s Trail' }], out.found ? 'The trail ends at a ring of lanterns: Dahlia’s arena!' : `A sign of Dahlia’s Trail: ${out.steps}/${out.need}.`, 700, { read: true });
  sfx.good();
  if (out.found) { toast('🏮 You found Dahlia’s arena! Challenge her from here (🏟️ Dahlia), before you leave the Forest Floor.', 'good', 5000); app.renderHud(); }
  else toast(`🌲 Dahlia’s Trail: ${out.steps}/${out.need}. Keep exploring.`, 'info', 2600);
}

/** The city tile for an Arbiter whose arena is somewhere else. */
function awayTile(app: App, id: string, won: string): HTMLElement | null {
  const s = app.s, c = CITIES[id];
  if (!c.arenaNode) return null;
  if (aboveFloor(id)) return tile('🌲', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `${won} Climb down to the Forest Floor to face Dahlia again.` : `${c.arbiter}’s arena hides on the Forest Floor below. Climb down with a Canopy Rope and follow her trail in the dark.`, '', () => floorSheet(app));
  return tile('⛴️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `${won} Find ${c.arbiter} on the island.` : `${c.arbiter}\u2019s ${c.arena.name} is offshore, on the island. Take the ferry from the docks to Black Sand Cove (needs a Ferry Pass, sold at this market).`, '', () => {}, true);
}

export const margosScreens: Screens = {
  show: { fabian: findFabian, gauntlet: gauntletSheet, floor: floorSheet },
  tiles: gauntletTile,
  arbiterTile: awayTile,
  chips: floorChip,
  actions: (app) => (onFloor(app.s.location) && (trailProgress(app.s, tools).found || dahliaBeaten(app.s)) ? [{ icon: '🏟️', label: 'Dahlia', go: () => { void app.arbiter(); } }] : []),
  beforeMove: (app, to, cost) => (!onFloor(app.s.location) && onFloor(to) ? floorPrompt(app, cost) : null),
  trail: trailSign,
};
