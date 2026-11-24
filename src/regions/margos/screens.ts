// The screens of Margos's gimmicks (gimmicks/ has their rules).
import type { App } from '../../ui/app';
import { typeChip } from '../../ui/cards';
import { closeAllSheets, h, openSheet, rollDice, tile, toast } from '../../ui/dom';
import { sfx } from '../../ui/sound';
import { itemInfo } from '../../data/content';
import { STAR_FACE } from '../../data/icons';
import { CITIES, NODE_BY_ID, neighbors } from '../../data/map';
import { nameOf } from '../../engine/creature';
import { hasItem, save, tierOf } from '../../engine/state';
import { tools } from '../../engine/tools';
import * as W from '../../engine/world';
import { aboveFloor, dahliaBeaten, floorDie, onFloor, trailProgress } from './gimmicks/dahlia';
import { DEPTHS_COST, depthsBlock, depthsCalls, exploreDepths, inDepths } from './gimmicks/depths';
import { gauntletBlock, gauntletOpen, gauntletProgress } from './gimmicks/gauntlet';
import { LANTERN, rollWisp, wispLit } from './gimmicks/wisps';
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

const depthsTile = (app: App, town: string): HTMLElement[] => (inDepths(town) ? [tile('🕳️', 'Explore the Depths', 'Leave an offering material at the edge of the dark: a wild creature that craves it climbs up to battle you. Win, and it has already accepted your offering toward joining you.', `${DEPTHS_COST}⚡ + 1 material`, () => depthsSheet(app))] : []);

/** Shifting Depths → Explore the Depths: choose an offering material; a creature that craves it answers. */
function depthsSheet(app: App) {
  const s = app.s;
  const mats = Object.keys(s.inventory).filter((id) => s.inventory[id] > 0 && depthsCalls(id, tools).length);
  const close = openSheet('🕳️ Explore the Depths', h('div', null,
    h('p', null, `Choose an offering to leave at the edge of the dark. A wild creature of a type that craves it climbs up to meet you (the stronger the craving, the likelier that type), as rare as those on the Sinkhole Stair. It has already accepted the offering, so it counts toward recruiting it if you win. Costs ${DEPTHS_COST} Initiative and the material.`),
    mats.length ? h('div', { class: 'list' }, mats.map((id) => {
      const it = itemInfo(id);
      const why = depthsBlock(s, id, tools);
      return h('button', { class: 'choice depths-offer', disabled: !!why, title: why ?? '', onclick: async () => { close(); await goDown(app, id); } },
        h('div', { class: 'row gap-s' }, h('span', { class: 'bi-ico' }, it.icon), h('b', null, `${it.name} ×${s.inventory[id]}`)),
        h('div', { class: 'row gap-s wrap' }, h('small', { class: 'muted' }, 'Calls: '), depthsCalls(id, tools).map((c) => h('span', { class: 'row gap-xs' }, typeChip(c.type, true), h('small', null, c.w >= 2 ? 'strongly' : 'sometimes')))),
        why ? h('small', { class: 'bad-text' }, why) : null);
    })) : h('p', { class: 'small muted' }, 'You have no offering materials. Find them by exploring (each biome has its own), or buy Canyon Ochre and Ember Charcoal at the market here.')), { wide: true });
}

async function goDown(app: App, material: string) {
  const s = app.s;
  if (app.busy) return;
  const out = exploreDepths(s, material, tools);
  if (!out) { toast(depthsBlock(s, material, tools) ?? 'Nothing stirs below.', 'info'); return; }
  app.busy = true;
  closeAllSheets();
  save(s); app.renderHud();
  try {
    await rollDice('Rarity Stars', out.stars.map((x) => ({ sides: 6, value: x.face, face: STAR_FACE[x.star], tone: x.star === 'full' ? 'good' : 'info', label: x.star })), `${out.rarity[0].toUpperCase() + out.rarity.slice(1)} creature! (+★ the Depths)`, 900, { read: true });
  } finally { app.busy = false; }
  await app.runBattle(out.battle, { kind: 'wild', intro: `Drawn by your ${itemInfo(material).name}, a wild ${nameOf(out.battle.sides[1].team[0])} climbs out of the Depths!` });
}

/** Check the Fog Lantern: a wisp held in it, or where the next one waits (marked on the map from now on). */
function lanternSheet(app: App) {
  const s = app.s;
  if (!hasItem(s, LANTERN)) return;
  if (!wispLit(s) && !s.flags.wispAt) rollWisp(s, tools);
  closeAllSheets();
  if (wispLit(s)) {
    openSheet('🏮 Fog Lantern', h('div', null,
      h('p', null, '💫 A wisp glows inside your lantern. The misty way from Fogbank Path to Lantern Glade is lit.'),
      h('p', { class: 'small muted' }, 'When you leave Lantern Glade and the Rainbow Plains behind, it drifts home, and you’ll need to catch a new one to come back.')));
    return;
  }
  const at = s.flags.wispAt!;
  s.flags.wispSeen = true;
  save(s);
  app.renderHud();
  // steps by road from here (ignoring Initiative and gates)
  const dist: Record<string, number> = { [s.location]: 0 };
  const q = [s.location];
  while (q.length && dist[at] === undefined) { const id = q.shift()!; for (const nb of neighbors(id)) if (dist[nb.node.id] === undefined) { dist[nb.node.id] = dist[id] + 1; q.push(nb.node.id); } }
  const n = NODE_BY_ID[at];
  const close = openSheet('🏮 Fog Lantern', h('div', null,
    h('p', null, 'The lantern is empty, but its flame leans one way: a wisp waits at ', h('b', null, n.name), ` (${app.nodeSubtitle(at).split(' · ')[0]}), ${dist[at] ?? '?'} step${dist[at] === 1 ? '' : 's'} away.`),
    h('p', { class: 'small' }, 'Go there to catch it. A wisp in your lantern lights the misty way from Fogbank Path to Lantern Glade and the Rainbow Plains. It drifts home when you leave them, so every visit takes a new one.'),
    h('p', { class: 'small muted' }, 'The wisp is marked on the map with a little light.'),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { close(); app.world.focus(at); } }, 'Show on map'))));
}

/** A wisp was just caught. */
function wispNews(app: App) {
  const s = app.s;
  if (s.flags.wispNews) {
    s.flags.wispNews = false;
    save(s);
    toast(`💫 You caught a wisp in your Fog Lantern! It lights the misty way from Fogbank Path to Lantern Glade.`, 'good', 5000);
  }
}

export const margosScreens: Screens = {
  show: { fabian: findFabian, gauntlet: gauntletSheet, floor: floorSheet },
  tiles: (app, at, cost) => [...gauntletTile(app, at, cost), ...depthsTile(app, at)],
  arbiterTile: awayTile,
  chips: floorChip,
  actions: (app) => (onFloor(app.s.location) && (trailProgress(app.s, tools).found || dahliaBeaten(app.s)) ? [{ icon: '🏟️', label: 'Dahlia', go: () => { void app.arbiter(); } }] : []),
  beforeMove: (app, to, cost) => (!onFloor(app.s.location) && onFloor(to) ? floorPrompt(app, cost) : null),
  trail: trailSign,
  news: wispNews,
  light: (s) => (hasItem(s, LANTERN) && s.flags.wispSeen && s.flags.wispAt ? s.flags.wispAt : null),
  itemAction: (app, item) => (item === LANTERN ? { label: 'Check', go: () => lanternSheet(app) } : null),
};
