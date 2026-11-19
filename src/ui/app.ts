import { h, $, toast, openSheet, closeAllSheets, confirmSheet, rollDice, floatText, wait } from './dom';
import { sfx } from './sound';
import { settings, setSetting } from './settings';
import { creatureCard, miniCard, moveCard, typeChip, typeIconImg, rarityBadge, typeChartSheet, statusGuide } from './cards';
import { Engine, portrait } from '../render/engine';
import { WorldView, type Reach } from '../render/world';
import { BattleView } from '../render/battle';
import { playerLook, arbiterLook, championLook, roamingLook, type TrainerLook } from '../render/trainerModel';
import type { GameState, TrainerStyle } from '../engine/state';
import { newGame, save, load, clearSave, tierOf, season, follower, log } from '../engine/state';
import * as W from '../engine/world';
import * as E from '../engine/events';
import type { Battle, BEvent, Snap } from '../engine/battle';
import { resolveRound, sendIn, activeOf, movePreview, partsText } from '../engine/battle';
import type { CreatureInst } from '../engine/creature';
import { nameOf, speciesOf, maxHealth, maxVitality, maxStamina } from '../engine/creature';
import { NODE_BY_ID, CITIES, TOWNS, BIOME_TYPES, neighbors } from '../data/map';
import { SPECIES, SPECIES_BY_ID, STARTERS } from '../data/species';
import { MOVE_BY_ID, CATCH_BREATH, STATUS_INFO } from '../data/moves';
import { ABILITIES, AFFINITIES, BIOME_INFO, SEASON_INFO, WEATHER, itemInfo, materialBiomes } from '../data/content';
import { TYPE_COLOR, TYPE_LABEL, TYPES, typeIcon } from '../data/types';
import type { ElementType, Item } from '../data/schema';

const TRAINER_COLORS = ['#ff6b3d', '#3d8bff', '#2fbf71', '#b05cff', '#ffcc33', '#ff4fa3'];

export class App {
  engine: Engine;
  world: WorldView;
  battleView: BattleView;
  s!: GameState;
  ui = h('div', { id: 'ui' });
  busy = false;
  selected: string | null = null;

  constructor(root: HTMLElement) {
    this.engine = new Engine(root);
    this.world = new WorldView(this.engine.canvas);
    this.battleView = new BattleView();
    this.engine.setView(this.world);
    root.append(this.ui);
    this.world.onNodeTap = (id) => this.onNodeTap(id);
    this.world.onNodeDoubleTap = (id) => this.onNodeDoubleTap(id);
    this.title();
  }

  // ════════════════════════════════════════════════════════════
  // Title & new game
  // ════════════════════════════════════════════════════════════
  title() {
    closeAllSheets();
    this.engine.setView(this.world);
    this.world.setTitleMode(true);
    this.world.setWeather('clear', 'spring');
    this.world.setSeason('spring');
    this.world.setReach({});
    const saved = load();
    this.ui.replaceChildren(h('div', { class: 'title-screen' },
      h('div', { class: 'title-card' },
        h('div', { class: 'logo' },
          h('div', { class: 'logo-icons' }, TYPES.map((t) => h('img', { src: typeIcon(t), alt: '' }))),
          h('h1', null, 'Creature', h('br'), 'Circuit'),
          h('p', null, 'Explore Margos · Befriend creatures · Earn 8 Merits · Win the Circuit')),
        h('div', { class: 'title-actions' },
          saved && saved.phase !== 'over' ? h('button', { class: 'btn primary big', onclick: () => this.start(saved) }, `Continue · ${saved.trainer.name}, Turn ${saved.turn}`) : null,
          h('button', { class: `btn ${saved ? 'ghost' : 'primary'} big`, onclick: () => this.newGameWizard() }, 'New Journey'),
          h('button', { class: 'btn ghost', onclick: () => this.howToPlay() }, 'How to Play')),
        h('small', { class: 'muted' }, 'v0.1 · Prototype content — creatures, moves and map are examples'))));
  }

  newGameWizard() {
    let name = 'Rowan', color = TRAINER_COLORS[0], style: TrainerStyle = 'balanced', home = 'thunder', starter = STARTERS[3];
    const step = (n: number) => {
      let body: HTMLElement;
      if (n === 0) {
        body = h('div', { class: 'wizard' },
          h('label', { class: 'field' }, h('span', null, 'Trainer name'), h('input', { value: name, maxlength: 16, oninput: (e: Event) => { name = (e.target as HTMLInputElement).value || 'Rowan'; } })),
          h('div', { class: 'field' }, h('span', null, 'Pawn color'), h('div', { class: 'swatches' }, TRAINER_COLORS.map((c) => h('button', { class: `swatch ${c === color ? 'sel' : ''}`, style: `background:${c}`, onclick: () => { color = c; step(0); } })))),
          h('div', { class: 'field' }, h('span', null, 'Trainer style'),
            h('div', { class: 'choice-grid three' },
              ([['nature', '🌲 Wild-at-heart', 'First re-explore each turn is free. City actions cost +1 Initiative.'],
                ['balanced', '⚖️ Wanderer', 'Every action costs the standard 1 Initiative.'],
                ['urban', '🏙️ City-slicker', 'City actions are free. Re-exploring costs 2 Initiative.']] as const).map(([id, label, text]) =>
                h('button', { class: `choice ${style === id ? 'sel' : ''}`, onclick: () => { style = id; step(0); } }, h('b', null, label), h('small', null, text))))),
          h('div', { class: 'row end' }, h('button', { class: 'btn primary', onclick: () => step(1) }, 'Next: Home City →')));
      } else if (n === 1) {
        body = h('div', { class: 'wizard' },
          h('p', { class: 'small' }, 'Your home city is where you return after a total team wipe. Its stable serves you an advanced Chanko Nabe (double hot-pot buff).'),
          h('div', { class: 'choice-grid' }, Object.values(CITIES).map((c) =>
            h('button', { class: `choice city ${home === c.nodeId ? 'sel' : ''}`, style: `--tc:${TYPE_COLOR[c.type]}`, onclick: () => { home = c.nodeId; step(1); } },
              h('div', { class: 'row gap-s' }, typeIconImg(c.type, 28), h('b', null, c.name)),
              h('small', null, `${c.park} · Arbiter ${c.arbiter}`), h('small', { class: 'muted' }, c.blurb)))),
          h('div', { class: 'row between' }, h('button', { class: 'btn ghost', onclick: () => step(0) }, '← Back'), h('button', { class: 'btn primary', onclick: () => step(2) }, 'Next: Starter →')));
      } else {
        const sp = SPECIES_BY_ID[starter];
        body = h('div', { class: 'wizard' },
          h('div', { class: 'starter-grid' }, STARTERS.map((id) => {
            const x = SPECIES_BY_ID[id];
            return h('button', { class: `starter ${starter === id ? 'sel' : ''}`, style: `--tc:${TYPE_COLOR[x.types[0]]}`, onclick: () => { starter = id; step(2); } },
              h('img', { src: portrait(id), alt: x.name }), h('b', null, x.name), typeChip(x.types[0], true));
          })),
          h('div', { class: 'starter-detail', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
            h('img', { src: portrait(sp.id) }),
            h('div', null, h('h3', null, sp.name), h('div', { class: 'row gap-s' }, sp.types.map((t) => typeChip(t))), h('p', { class: 'small' }, sp.dex),
              h('p', { class: 'small' }, h('b', null, ABILITIES[sp.ability].name), ' — ', ABILITIES[sp.ability].text),
              h('p', { class: 'small muted' }, `Evolves: ${sp.name} → ${SPECIES_BY_ID[sp.evolvesTo!].name} → ${SPECIES_BY_ID[SPECIES_BY_ID[sp.evolvesTo!].evolvesTo!].name}`))),
          h('div', { class: 'row between' }, h('button', { class: 'btn ghost', onclick: () => step(1) }, '← Back'),
            h('button', { class: 'btn primary', onclick: () => { close(); this.start(newGame(name.trim() || 'Rowan', style, home, starter, color), true); } }, 'Begin Journey ✦')));
      }
      sheetBody.replaceChildren(body);
      $('.sheet-head h2', sheetEl).textContent = ['Your Trainer', 'Home City', 'Choose a Starter'][n];
    };
    const sheetBody = h('div');
    const close = openSheet('Your Trainer', sheetBody, { wide: true });
    const sheetEl = sheetBody.closest('.sheet') as HTMLElement;
    step(0);
  }

  start(s: GameState, fresh = false) {
    this.s = s;
    closeAllSheets();
    this.world.setTitleMode(false);
    this.world.setTrainerColor(s.trainer.color);
    this.world.setPawnAt(s.location);
    this.world.focus(s.location, true);
    this.engine.setView(this.world);
    if (s.phase === 'endgame') { this.renderHud(); this.endgameSheet(); return; }
    if (s.phase === 'over') { this.gameOver(); return; }
    this.renderHud();
    if (s.event) setTimeout(() => this.eventFlow(), 400);
    if (fresh) {
      log(s, `${s.trainer.name} set out from ${CITIES[s.trainer.home].name}.`);
      save(s);
      setTimeout(() => this.howToPlay(true), 400);
    }
  }

  // ════════════════════════════════════════════════════════════
  // HUD
  // ════════════════════════════════════════════════════════════
  renderHud() {
    const s = this.s;
    const node = NODE_BY_ID[s.location];
    const w = WEATHER[s.weather];
    const se = season(s);
    this.world.setSeason(se);
    this.world.setWeather(s.weather, se);
    this.world.setVisited(s.visited, s.flags.beaten);
    const f = follower(s);
    this.world.setFollower(f ? f.species : null);
    this.world.setReach(this.reach());
    const daysLeft = 100 - s.turn;
    const top = h('div', { class: 'hud-top' },
      h('button', { class: 'hud-pill turn', onclick: () => this.calendar() },
        h('span', { class: 'season' }, SEASON_INFO[se].icon), h('b', null, `Turn ${s.turn}`), h('small', null, `/100 · ${SEASON_INFO[se].label}`)),
      h('button', { class: 'hud-pill', onclick: () => this.calendar() }, h('span', null, w.icon), h('small', { class: 'hide-xs' }, w.name)),
      h('div', { class: 'hud-pill coins' }, '🪙 ', h('b', null, s.coins)),
      h('button', { class: 'hud-pill merits', onclick: () => this.meritsSheet() }, Object.values(CITIES).map((c) =>
        h('span', { class: `merit ${s.merits.includes(c.nodeId) ? 'on' : ''}`, style: `--tc:${TYPE_COLOR[c.type]}` }, h('img', { src: typeIcon(c.type), alt: '' })))),
      h('button', { class: 'hud-pill icon menu', onclick: () => this.menu(), 'aria-label': 'Menu' }, '☰'));
    const loc = h('div', { class: 'loc-card', style: node.cityType ? `--tc:${TYPE_COLOR[node.cityType]}` : '' },
      h('div', { class: 'loc-title' },
        h('span', { class: 'loc-ico' }, node.kind === 'city' ? h('img', { src: typeIcon(node.cityType!), alt: '' }) : BIOME_INFO[node.biome].icon),
        h('div', null, h('b', null, node.name), h('small', null, this.nodeSubtitle(node.id)))),
      h('div', { class: 'init' }, h('small', null, 'Initiative'), h('div', { class: 'pips-init' }, Array.from({ length: 5 }, (_, i) => h('span', { class: i < s.initiative ? 'on' : '' })))),
      daysLeft <= 10 ? h('div', { class: 'warn' }, `⏳ ${daysLeft + 1} turns left — reach Circuit Stadium with 8 Merits!`) : null);
    const actions = h('div', { class: 'action-bar' }, this.actionButtons());
    const followerBtn = h('button', { class: 'follower-chip', onclick: () => this.pickFollower() },
      f ? h('img', { src: portrait(f.species), alt: '' }) : h('span', { class: 'none' }, '—'),
      h('div', null, h('small', null, 'Following'), h('b', null, f ? nameOf(f) : 'Nobody')),
      f ? h('span', { class: 'ability-tag' }, ABILITIES[speciesOf(f).ability].name) : null);
    const team = h('div', { class: 'team-strip' }, s.roster.map((c) => h('button', { class: `team-dot ${c.ko ? 'ko' : ''} ${c.points ? 'up' : ''}`, style: `--tc:${TYPE_COLOR[speciesOf(c).types[0]]}`, onclick: () => this.showCreature(c) },
      h('img', { src: portrait(c.species), alt: nameOf(c) }),
      h('i', { style: `--p:${c.ko ? 0 : (c.vitality * maxHealth(c) + c.health) / (maxHealth(c) * (maxVitality(c) + 1))}` }))));
    const ev = E.eventView(s);
    const eventPill = ev ? h('button', { class: 'event-pill', onclick: () => this.eventFlow(), title: 'Answer this event before ending your turn' },
      h('span', { class: 'event-pill-ico' }, ev.icon), h('div', null, h('small', null, 'Event waiting'), h('b', null, ev.title))) : null;
    this.ui.replaceChildren(h('div', { class: 'hud' }, top, h('div', { class: 'hud-left' }, followerBtn, team), h('div', { class: 'hud-bottom' }, eventPill, loc, actions)));
    if (this.selected) this.showNodePreview(this.selected);
  }

  nodeSubtitle(id: string) {
    const n = NODE_BY_ID[id];
    if (n.kind === 'city') return `${TYPE_LABEL[n.cityType!]} City · Arbiter ${CITIES[id].arbiter}${this.s.merits.includes(id) ? ' ✓' : ''}`;
    if (n.kind === 'town') return 'Town · Safe haven';
    if (n.kind === 'stadium') return 'Circuit Stadium · Be here at the end of Turn 100';
    if (n.kind === 'legendary') return 'Legendary grounds';
    if (n.kind === 'arena') { const c = CITIES[n.arenaOf!]; return `${TYPE_LABEL[c.type]} Arena · Arbiter ${c.arbiter}${this.s.merits.includes(c.nodeId) ? ' ✓' : ''}`; }
    return `${BIOME_INFO[n.biome].label} · Wild Lv ~${W.baseWildLevel(this.s, n)}${n.rarity ? ' · ★ rare' : ''}`;
  }

  actionButtons(): HTMLElement[] {
    const s = this.s;
    const node = NODE_BY_ID[s.location];
    const out: HTMLElement[] = [];
    const btn = (icon: string, label: string, fn: () => void, opts: { cost?: number; disabled?: boolean; cls?: string } = {}) =>
      h('button', { class: `act ${opts.cls ?? ''}`, disabled: opts.disabled, onclick: () => { if (!this.busy) fn(); } },
        h('span', { class: 'act-ico' }, icon), h('span', { class: 'act-lbl' }, label), opts.cost !== undefined ? h('span', { class: 'cost' }, opts.cost === 0 ? 'free' : `${opts.cost}⚡`) : null);
    if (node.kind === 'wild') {
      const c = W.reexploreCost(s);
      out.push(btn('🔍', 'Explore', () => this.doExplore(), { cost: c, disabled: s.initiative < c }));
      out.push(btn('⛺', 'Camp', () => this.camp(), { disabled: s.initiative < 1 || !W.campNeeds(s).length }));
    }
    if (node.kind === 'city') out.push(btn('🏙️', 'City', () => this.citySheet(), { cls: 'hl' }));
    if (node.kind === 'arena') out.push(btn('🏟️', 'Arena', () => this.arbiter(), { cls: 'hl' }));
    if (node.kind === 'town') out.push(btn('🏘️', 'Town', () => this.townSheet(), { cls: 'hl' }));
    if (node.kind === 'stadium') out.push(btn('🏟️', 'Stadium', () => this.stadiumSheet(), { cls: 'hl' }));
    if (W.flyTargets(s).length) out.push(btn('🪽', 'Fly', () => this.flySheet(), { cost: 3, disabled: s.initiative < 3 }));
    out.push(btn('🐾', 'Team', () => this.teamSheet()));
    out.push(btn('🎒', 'Bag', () => this.bagSheet()));
    out.push(btn('⏭️', 'End Turn', () => this.endTurn(), { cls: s.initiative === 0 ? 'primary pulse' : 'primary' }));
    return out;
  }

  reach(): Reach {
    const r: Reach = {};
    for (const { node } of neighbors(this.s.location)) r[node.id] = W.canMoveTo(this.s, node.id).ok ? 'ok' : 'locked';
    return r;
  }

  // ════════════════════════════════════════════════════════════
  // Map interaction
  // ════════════════════════════════════════════════════════════
  onNodeTap(id: string) {
    if (this.busy || !this.s || this.s.phase !== 'map') return;
    this.selected = id;
    this.showNodePreview(id);
  }

  /** Double-tap shortcut: travel straight to an adjacent node. Blocked moves leave the preview up to explain why. */
  onNodeDoubleTap(id: string) {
    if (!settings().doubleTapTravel || this.busy || !this.s || this.s.phase !== 'map') return;
    if (id === this.s.location || !neighbors(this.s.location).some((x) => x.node.id === id)) return;
    if (W.canMoveTo(this.s, id).ok) this.travel(id);
  }

  showNodePreview(id: string) {
    $('.node-preview')?.remove();
    const s = this.s;
    const n = NODE_BY_ID[id];
    const isHere = id === s.location;
    const adj = neighbors(s.location).some((x) => x.node.id === id);
    const chk = W.canMoveTo(s, id);
    const extra: (HTMLElement | null)[] = [];
    if (n.kind === 'city') {
      const c = CITIES[id];
      extra.push(h('p', { class: 'small' }, c.blurb));
      extra.push(h('p', { class: 'small' }, h('b', null, c.arena.name), ' — ', c.arena.text));
    } else if (n.kind === 'town') extra.push(h('p', { class: 'small' }, TOWNS[id].blurb, TOWNS[id].key ? h('b', null, ` Sells: ${itemInfo(TOWNS[id].key!).name}.`) : null));
    else if (n.kind === 'wild') {
      extra.push(h('p', { class: 'small row gap-s' }, 'Wild types:', ...BIOME_TYPES[n.biome].map((t: ElementType) => typeIconImg(t, 18))));
    } else if (n.kind === 'arena') {
      const c = CITIES[n.arenaOf!];
      extra.push(h('p', { class: 'small' }, h('b', null, c.arena.name), ` · Arbiter ${c.arbiter}. `, c.arena.text));
    } else if (n.kind === 'legendary') {
      const sp = SPECIES_BY_ID[n.legendary!];
      extra.push(h('p', { class: 'small' }, s.flags.beaten.includes(id) ? 'The legend has moved on.' : `Something powerful stirs here… (${sp.types.map((t) => TYPE_LABEL[t]).join('/')})`));
    }
    const card = h('div', { class: 'node-preview', style: n.cityType ? `--tc:${TYPE_COLOR[n.cityType]}` : '' },
      h('button', { class: 'icon-btn close', onclick: () => { this.selected = null; card.remove(); } }, '✕'),
      h('div', { class: 'np-head' }, h('span', { class: 'loc-ico' }, n.kind === 'city' ? h('img', { src: typeIcon(n.cityType!) }) : BIOME_INFO[n.biome].icon),
        h('div', null, h('b', null, n.name), h('small', null, this.nodeSubtitle(id)))),
      ...extra,
      isHere ? h('div', { class: 'small muted' }, 'You are here.') :
        adj ? (chk.ok ? h('button', { class: 'btn primary block', onclick: () => this.travel(id) }, `Travel here · ${chk.cost === 0 ? 'free' : chk.cost + '⚡'}`) : h('div', { class: 'lock' }, '🔒 ', chk.reason)) :
          h('div', { class: 'small muted' }, 'Not adjacent — travel node by node.'));
    this.ui.append(card);
  }

  async travel(id: string) {
    if (this.busy) return;
    const s = this.s;
    const from = s.location;
    const out = W.moveTo(s, id);
    if (!out) return;
    this.busy = true;
    this.selected = null;
    $('.node-preview')?.remove();
    this.world.setReach({});
    sfx.hop();
    await this.world.hop(from, id);
    this.busy = false;
    await this.handleOutcome(out);
  }

  async doExplore() {
    const out = W.reexplore(this.s);
    if (!out) { toast('Not enough Initiative.', 'bad'); return; }
    await this.handleOutcome(out);
  }

  async handleOutcome(out: W.Outcome) {
    const s = this.s;
    this.busy = true;
    try {
      if (out.t === 'arrive') {
        const n = out.node;
        toast(`Arrived at ${n.name}`, 'info');
        if (n.kind === 'city' || n.kind === 'town') save(s);
      } else if (out.t === 'nothing') {
        if (out.roll) await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'info', label: '1–2 Nothing' }], 'Nothing but wind and birdsong.', 600);
      } else if (out.t === 'item') {
        await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'good', label: '5–6 Item' }, { sides: 6, value: out.itemRoll, label: 'Find' }], 'You discovered something!', 500);
        const names = out.items.map((i) => `${itemInfo(i.id).icon} ${W.itemDisplayName(i.id)}${i.n > 1 ? ' ×' + i.n : ''}`);
        if (out.coins) names.push(`🪙 ${out.coins} coins`);
        sfx.good();
        toast(`Found ${names.join(', ')}`, 'good', 3200);
        log(s, `Found ${names.join(', ')} at ${NODE_BY_ID[s.location].name}.`);
      } else if (out.t === 'encounter') {
        await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'bad', label: '3–4 Encounter' }], 'Something rustles nearby…', 300);
        await rollDice('Rarity Stars', out.stars.map((x) => ({ sides: 6, value: x.face, face: x.star === 'full' ? '★' : x.star === 'half' ? '⯪' : '·', tone: x.star === 'full' ? 'good' : 'info', label: x.star })), `${out.rarity[0].toUpperCase() + out.rarity.slice(1)} creature! ${NODE_BY_ID[s.location].rarity ? '(+★ rare area)' : ''}`, 700);
        this.busy = false;
        await this.runBattle(out.battle, { kind: 'wild', intro: `A wild ${nameOf(out.battle.sides[1].team[0])} appeared!` });
        return;
      } else if (out.t === 'trainer') {
        await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'bad', label: '3–4 Encounter' }], `${out.name} challenges you!`, 500);
        this.busy = false;
        await this.runBattle(out.battle, { kind: 'trainer', intro: `${out.name} wants to battle!` });
        return;
      } else if (out.t === 'legendary') {
        this.busy = false;
        await this.runBattle(out.battle, { kind: 'legendary', intro: `${out.battle.sides[1].name} descends!`, nodeId: s.location });
        return;
      }
    } finally {
      this.busy = false;
    }
    save(s);
    this.renderHud();
    if (s.initiative === 0) toast('Out of Initiative — end your turn.', 'info');
  }

  // ════════════════════════════════════════════════════════════
  // Battle
  // ════════════════════════════════════════════════════════════
  async runBattle(b: Battle, ctx: { kind: 'wild' | 'trainer' | 'arbiter' | 'legendary' | 'endgame'; intro: string; city?: string; nodeId?: string }): Promise<Battle['over']> {
    const s = this.s;
    closeAllSheets();
    $('.node-preview')?.remove();
    this.busy = true;
    const bv = this.battleView;
    const arenaType = ctx.city ? CITIES[ctx.city].type : undefined;
    bv.setup(b.biome as never, arenaType, s.weather === 'aurora' || ctx.city === 'aurora');
    // trainer minis: only when the opponent is a trainer of some kind
    const foeSide = b.sides[1];
    const foeLook: TrainerLook | null =
      foeSide.kind === 'arbiter' ? arbiterLook(foeSide.name, arenaType ?? CITIES[b.arena?.city ?? '']?.type ?? 'fire')
        : foeSide.kind === 'champion' ? championLook(foeSide.name)
          : foeSide.kind === 'trainer' ? roamingLook(foeSide.name) : null;
    bv.setTrainers(foeLook ? playerLook(s.trainer.name, s.trainer.color) : null, foeLook);
    this.engine.setView(bv);
    const disp: [Snap, Snap] = [snapOf(activeOf(b.sides[0])), snapOf(activeOf(b.sides[1]))];
    const panel = h('div', { class: 'battle-ui' });
    const logLine = h('div', { class: 'battle-log' }, ctx.intro);
    const plates = [h('div', { class: 'plate me' }), h('div', { class: 'plate foe' })];
    const controls = h('div', { class: 'battle-controls' });
    const header = h('div', { class: 'battle-head' },
      h('span', { class: 'chip' }, WEATHER[s.weather].icon, ' ', WEATHER[s.weather].name),
      b.arena ? h('span', { class: 'chip arena', style: `--tc:${TYPE_COLOR[arenaType!]}` }, '🏟 ', CITIES[ctx.city!].arena.name, ` · Tier ${b.arena.tier}`) : null,
      h('span', { class: 'chip' }, `Round `, h('b', { class: 'rnd' }, '1')));
    panel.append(header, plates[1], h('div', { class: 'battle-stack' }, plates[0], h('div', { class: 'battle-bottom' }, logLine, controls)));
    this.ui.replaceChildren(panel);

    const renderPlate = (side: 0 | 1) => {
      const sd = b.sides[side];
      const c = sd.team.find((x) => x.uid === disp[side].uid)!;
      const sn = disp[side];
      const sp = speciesOf(c);
      const mh = maxHealth(c), mv = maxVitality(c);
      const pct = sn.ko ? 0 : Math.min(100, (sn.health / mh) * 100);
      const recruited = sd.kind === 'wild' && s.dex.caught.includes(c.species);
      plates[side].replaceChildren(
        h('div', { class: 'pl-top' },
          h('b', null, nameOf(c)), h('span', { class: 'lv' }, `Lv ${c.level}`),
          h('span', { class: 'pl-types' }, sp.types.map((t) => typeIconImg(t, 16))),
          recruited ? h('span', { class: 'caught-mark', title: 'Already recruited', 'aria-label': 'Already recruited' }, '🗿') : null,
          sn.status ? h('button', { class: 'status-tag', title: `${STATUS_INFO[sn.status].text} (tap for all statuses)`, onclick: () => openSheet('Status Effects', statusGuide()) }, STATUS_INFO[sn.status].icon, ' ', STATUS_INFO[sn.status].name) : null),
        // Vitality first: hearts are what actually decide the fight
        h('div', { class: 'pl-vit' },
          h('span', { class: 'hearts', title: `Vitality ${sn.vitality}/${mv}` }, Array.from({ length: mv }, (_, i) => h('span', { class: `heart ${i < sn.vitality ? 'on' : ''}` }, '♥'))),
          h('span', { class: 'team-balls' }, sd.team.map((x) => h('i', { class: x.ko ? 'ko' : '' })))),
        h('div', { class: 'hp-row', title: 'Health' }, h('div', { class: 'bar' }, h('i', { style: `width:${pct}%`, class: pct < 34 ? 'low' : pct < 67 ? 'mid' : '' })), h('span', { class: 'num' }, sn.ko ? 'KO' : `${sn.health}/${mh}`)),
        ...(side === 0 ? [h('div', { class: 'pl-sub' },
          h('span', { class: 'sta' }, '💨 ', `${sn.stamina}/${maxStamina(c)}`, sn.fatigue ? h('b', { class: 'fat' }, ` · Fatigue ${sn.fatigue}`) : null))] : []));
    };
    const say = (t: string, tone?: string) => { logLine.textContent = t; logLine.className = `battle-log ${tone ?? ''}`; };
    // Normal battles slow down and explain every roll; Fast battles (Settings) keep the quick pace
    const slow = () => !settings().fastBattle;
    const pace = (ms: number) => (slow() ? Math.round(ms * 1.6) : ms);
    const whoOn = (side: 0 | 1) => nameOf(b.sides[side].team.find((x) => x.uid === disp[side].uid) ?? activeOf(b.sides[side]));

    bv.trainerHop(0); bv.trainerHop(1);
    await Promise.all([bv.setCreature(0, activeOf(b.sides[0]).species), bv.setCreature(1, activeOf(b.sides[1]).species)]);
    renderPlate(0); renderPlate(1);

    const play = async (events: BEvent[]) => {
      for (const e of events) {
        try { await playOne(e); } catch (err) { console.error('battle fx error', err); }
      }
      renderPlate(0); renderPlate(1);
    };
    const playOne = async (e: BEvent) => {
      {
        switch (e.t) {
          case 'say': say(e.text, e.tone); await wait(pace(650)); break;
          case 'arena': say(e.text, 'bad'); await bv.arenaFlash(arenaType ? TYPE_COLOR[arenaType] : '#ffffff'); break;
          case 'use': {
            const who = nameOf(b.sides[e.side].team.find((x) => x.uid === disp[e.side].uid)!);
            say(e.kind === 'affinity' ? `${who} swaps in with ${e.name}!` : `${who} used ${e.name}!`);
            if (e.kind === 'elemental' || e.kind === 'affinity') sfx.zap(); else if (e.kind === 'support') sfx.heal();
            if (e.kind === 'physical') await bv.lunge(e.side);
            else if (e.kind === 'elemental' && e.type) await bv.projectile(e.side, e.type);
            else if (e.kind === 'affinity') await (e.move === 'shieldPass' || e.move === 'rally' ? bv.support(e.side, e.type) : e.type ? bv.projectile(e.side, e.type) : bv.lunge(e.side));
            else await bv.support(e.side, e.type);
            break;
          }
          case 'roll': {
            if (e.die === 20) { await rollDice(e.label, [{ sides: e.die, value: e.value, tone: e.hit ? 'good' : 'bad' }], e.hit ? 'It stays to fight.' : 'It loses interest…', 350); break; }
            const mods = e.mods?.length ? ` ${partsText(e.mods)} = ${e.value}` : '';
            const verdict = e.crit ? 'Critical hit!' : e.hit ? 'Hit!' : 'Miss';
            await rollDice(slow() ? `${whoOn(e.side)} · ${e.label} d${e.die}` : e.label, [{ sides: e.die, value: e.natural ?? e.value, tone: e.hit ? 'good' : 'bad' }],
              slow() ? `Rolled ${e.natural ?? e.value}${mods}, needs ${e.need}+ to beat Evasion ${e.need}: ${verdict}${e.crit ? ' Double damage.' : ''}`
                : `Need ${e.need}+ vs Evasion ${e.need}${e.crit ? ' · CRITICAL!' : ''}`, slow() ? 1100 : 350);
            break;
          }
          case 'clash':
            await rollDice('Clash! Speeds tied', [{ sides: e.dice[0], value: e.rolls[0], label: 'You', tone: e.loser === 0 ? 'bad' : 'good' }, { sides: e.dice[1], value: e.rolls[1], label: 'Foe', tone: e.loser === 1 ? 'bad' : 'good' }], e.loser === null ? 'Even clash! Turn order is a coin flip.' : `${e.loser === 0 ? 'You' : 'Foe'} rolled lower: ${e.dmg} damage (the difference) and acts second.`, slow() ? 1300 : 500);
            break;
          case 'tired':
            await rollDice('Fatigue check', [{ sides: 10, value: e.value, tone: e.fail ? 'bad' : 'good' }], e.fail ? `Rolled ≤ ${e.fatigue}: catching breath!` : `Beat Fatigue ${e.fatigue}.`, slow() ? 1000 : 300);
            disp[e.side] = e.snap; renderPlate(e.side);
            break;
          case 'damage': {
            if (slow() && e.calc) {
              const k = e.calc;
              const attacker = whoOn(e.side === 0 ? 1 : 0);
              const steps = `${k.die ? k.roll : ''} ${partsText(k.parts)}`.trim().replace(/^\+ /, '');
              const math = `${steps} = ${k.raw}${k.mult !== 1 ? ` × ${k.mult} type` : ''}${k.crit ? ' × 2 crit' : ''}`;
              const caption = `${math} → ${k.total} damage`;
              if (k.die) await rollDice(`${attacker} · Damage d${k.die}`, [{ sides: k.die, value: k.roll, tone: k.mult > 1 || k.crit ? 'good' : k.mult < 1 ? 'bad' : undefined }], caption, 1300);
              else { say(`${attacker}: ${caption}`); await wait(900); }
            }
            disp[e.side] = e.snap;
            const p = bv.screenOf(e.side);
            (e.crit || e.eff >= 2 ? sfx.crit : sfx.hit)();
            floatText(p.x, p.y, `-${e.amount}${e.crit ? '!' : ''}`, `${e.eff >= 2 ? 'super' : e.eff < 1 ? 'weak' : ''} ${e.crit ? 'crit' : ''}`);
            await bv.hit(e.side, e.crit || e.eff >= 2);
            renderPlate(e.side);
            break;
          }
          case 'heal':
            disp[e.side] = e.snap; renderPlate(e.side);
            if (e.amount > 0) { const p = bv.screenOf(e.side); floatText(p.x, p.y, `+${e.amount}`, 'heal'); await bv.heal(e.side); }
            break;
          case 'status': disp[e.side] = e.snap; renderPlate(e.side); break;
          case 'buff': { const p = bv.screenOf(e.side); floatText(p.x, p.y + 30, e.text, 'buff'); await wait(450); break; }
          case 'ko': sfx.ko(); await bv.ko(e.side); break;
          case 'send': {
            bv.trainerHop(e.side);
            disp[e.side] = e.snap;
            await bv.setCreature(e.side, b.sides[e.side].team.find((x) => x.uid === e.snap.uid)!.species);
            renderPlate(e.side);
            break;
          }
          case 'xp': {
            const c = b.sides[0].team.find((x) => x.uid === e.uid);
            if (c) { say(e.reason === 'ko' ? `${nameOf(c)} gained ${e.amount} XP for knocking out ${e.foe ?? 'its foe'}!` : `${nameOf(c)} gained ${e.amount} XP for battling.`, 'good'); if (e.levels) sfx.good(); if (e.levels) toast(`${nameOf(c)} reached Lv ${c.level}! Unlock a node on its chart.`, 'good', 3500); await wait(600); }
            break;
          }
          case 'end': break;
        }
      }
    };

    say(ctx.intro);
    await wait(700);
    // round loop
    const result = await new Promise<Battle['over']>((resolve) => {
      const showControls = () => {
        $('.rnd', header).textContent = String(b.round + 1);
        if (b.over) { finish(b.over); return; }
        if (b.needSwap) { forcedSwap(); return; }
        const me = activeOf(b.sides[0]);
        say(`What will ${nameOf(me)} do?`);
        const canSwap = b.round >= 1 && b.sides[0].team.filter((c) => !c.ko).length > 1;
        const canRun = ctx.kind === 'wild' || ctx.kind === 'legendary';
        const foeTypes = speciesOf(activeOf(b.sides[1])).types;
        controls.replaceChildren(
          h('div', { class: 'move-grid', role: 'group', 'aria-label': 'Moves (keys 1–4)' }, me.playbook.map((id, i) => moveCard(MOVE_BY_ID[id], { compact: true, hotkey: String(i + 1), vs: foeTypes, onClick: () => choose(id) }))),
          h('div', { class: 'row gap-s sub-actions' },
            h('button', { class: 'btn ghost sm', onclick: () => choose(CATCH_BREATH.id) }, '😮‍💨 Catch Breath'),
            h('button', { class: 'btn ghost sm', disabled: !canSwap, title: canSwap ? '' : 'Swapping is allowed from round 2', onclick: () => swapPicker() }, '🔁 Swap'),
            canRun ? h('button', { class: 'btn ghost sm', onclick: () => act({ kind: 'run' }) }, '🏃 Run') : null,
            h('button', { class: 'btn ghost sm', title: 'Type chart for this matchup (T)', onclick: () => showTypes() }, '🔺 Types'),
            h('button', { class: 'btn ghost sm', onclick: () => this.showCreature(me, true) }, '📇 Card')));
      };
      // Picking a move: Fast battles act at once; otherwise show the step-by-step readout first
      let readoutFor: string | null = null;
      const choose = (id: string) => (slow() ? showReadout(id) : act({ kind: 'move', move: id }));
      const showReadout = (id: string) => {
        readoutFor = id;
        const m = MOVE_BY_ID[id] ?? CATCH_BREATH;
        const me = activeOf(b.sides[0]);
        say(`${nameOf(me)} · ${m.name}: here’s what will happen.`);
        controls.replaceChildren(h('div', { class: 'readout' },
          h('div', { class: 'readout-head' },
            m.type ? typeIconImg(m.type, 18) : null, h('b', null, m.name),
            h('span', { class: 'chip' }, m.kind === 'physical' ? 'Physical · Power vs Armor' : m.kind === 'elemental' ? 'Elemental · Focus vs Ward' : 'Support'),
            h('small', { class: 'muted' }, m.text)),
          h('ol', { class: 'readout-steps' }, movePreview(b, id).map((st) => h('li', { class: st.tone ?? '' },
            h('span', { class: 'ro-ico' }, st.icon), h('div', null, h('b', null, st.title), h('p', null, st.text))))),
          h('p', { class: 'small muted' }, 'Then the foe acts (its move stays hidden until the round plays out). The faster creature goes first.'),
          h('div', { class: 'row gap-s end' },
            h('button', { class: 'btn ghost', onclick: () => { readoutFor = null; showControls(); } }, '← Back (Esc)'),
            h('button', { class: 'btn primary', onclick: () => { readoutFor = null; act({ kind: 'move', move: id }); } }, `Use ${m.name} (Enter)`))));
        (controls.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
      };
      const showTypes = () => {
        const me = activeOf(b.sides[0]), foe = activeOf(b.sides[1]);
        const attack = [...new Set(me.playbook.map((id) => MOVE_BY_ID[id]).filter((m) => m.kind === 'elemental' && m.type).map((m) => m.type!))];
        typeChartSheet({ attack, defend: speciesOf(foe).types, foeName: nameOf(foe) });
      };
      const onKey = (ev: KeyboardEvent) => {
        if (document.querySelector('.sheet-wrap')) return;
        if (readoutFor && controls.querySelector('.readout')) {
          if (ev.key === 'Escape' || ev.key === 'Backspace') { readoutFor = null; showControls(); }
          else if (ev.key === 'Enter') { ev.preventDefault(); const id = readoutFor; readoutFor = null; act({ kind: 'move', move: id }); }
          return;
        }
        if (!controls.querySelector('.move-grid')) return;
        const me = activeOf(b.sides[0]);
        const n = Number(ev.key);
        if (n >= 1 && n <= me.playbook.length) choose(me.playbook[n - 1]);
        else if (ev.key.toLowerCase() === 'b') choose(CATCH_BREATH.id);
        else if (ev.key.toLowerCase() === 'r' && (ctx.kind === 'wild' || ctx.kind === 'legendary')) act({ kind: 'run' });
        else if (ev.key.toLowerCase() === 't') showTypes();
        else if (ev.key.toLowerCase() === 's' && b.round >= 1 && b.sides[0].team.filter((c) => !c.ko).length > 1) swapPicker();
      };
      addEventListener('keydown', onKey);
      const finish = (r: Battle['over']) => { removeEventListener('keydown', onKey); resolve(r); };
      const act = async (a: Parameters<typeof resolveRound>[1]) => {
        controls.replaceChildren(h('div', { class: 'waiting' }, '…'));
        const ev = resolveRound(b, a);
        await play(ev);
        showControls();
      };
      const swapPicker = () => {
        const cur = activeOf(b.sides[0]);
        const close = openSheet('Swap — choose the incoming Alpha', h('div', null,
          h('p', { class: 'small' }, `The incoming creature is the Alpha: its Affinity Power triggers, borrowing from ${nameOf(cur)}. The swap resolves at ${nameOf(cur)}'s speed.`),
          h('div', { class: 'list' }, b.sides[0].team.map((c, i) => c.ko || c === cur ? null : h('div', { class: 'swap-row' },
            miniCard(c, { onClick: () => { close(); act({ kind: 'swap', to: i }); } }),
            h('small', null, '🔁 ', speciesOf(c).affinity && h('b', null, AFFINITY_NAME(speciesOf(c).affinity)), ` · bond ${c.affinity[cur.uid] ?? 0}`))))));
      };
      const forcedSwap = () => {
        say('Choose your next creature!', 'bad');
        controls.replaceChildren(h('div', { class: 'list' }, b.sides[0].team.map((c, i) => c.ko ? null : miniCard(c, { onClick: async () => { controls.replaceChildren(); await play(sendIn(b, i)); showControls(); } }))));
      };
      showControls();
    });

    // ── Aftermath ──────────────────────────────────────────────
    if (result === 'win') { sfx.fanfare(); say('Victory!', 'good'); await wait(600); }
    if (result === 'lose') { sfx.bad(); say('Your team is out of creatures…', 'bad'); await wait(900); }
    if (result === 'fled') await wait(500);
    const wild = b.sides[1].team[0];
    if (result === 'win' && (ctx.kind === 'wild' || ctx.kind === 'legendary')) {
      await this.recruitFlow(wild);
    }
    const summary = W.finishBattle(s, b, { kind: ctx.kind, city: ctx.city, nodeId: ctx.nodeId });
    for (const t of summary.text) toast(t, summary.wiped ? 'bad' : 'good', 3500);
    this.busy = false;
    if (ctx.kind !== 'endgame') {
      this.engine.setView(this.world);
      if (summary.wiped) { this.world.setPawnAt(s.location); this.world.focus(s.location, true); }
      save(s);
      this.renderHud();
      if (ctx.kind === 'arbiter' && result === 'win') this.meritCelebration(ctx.city!);
    }
    return result;
  }

  async recruitFlow(wild: CreatureInst) {
    const s = this.s;
    const sp = speciesOf(wild);
    const totems = Object.keys(s.inventory).filter((k) => itemInfo(k).kind === 'totem');
    const offers = Object.keys(s.inventory).filter((k) => ['material', 'treat'].includes(itemInfo(k).kind));
    if (!totems.length) { toast(`${sp.name} wanders off. You have no totem to offer.`, 'info', 3200); return; }
    let totem = totems.sort((a, b) => W.totemBonus(b, wild) - W.totemBonus(a, wild))[0];
    let chosen: string[] = [];
    await new Promise<void>((resolve) => {
      let done = false;
      const body = h('div');
      const render = () => {
        const mods = W.totemBonus(totem, wild) + W.offeringBonus(chosen, wild) + (W.ability(s) === 'luckyCharm' ? 1 : 0);
        const need = W.recruitTarget(wild);
        const chance = probAtLeast(need - mods);
        body.replaceChildren(
          h('div', { class: 'recruit-head', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
            h('img', { src: portrait(sp.id) }),
            h('div', null, h('h3', null, sp.name), h('div', { class: 'row gap-s' }, sp.types.map((t) => typeChip(t, true)), rarityBadge(sp.rarity)),
              h('p', { class: 'small' }, `Defeated, ${sp.name} watches you warily. Offer a totem — if it accepts, it will inhabit the totem and join you.`))),
          h('h4', null, 'Totem'),
          h('div', { class: 'chips' }, totems.map((t) => h('button', { class: `pick ${t === totem ? 'sel' : ''}`, onclick: () => { totem = t; render(); } }, `${itemInfo(t).icon} ${W.itemDisplayName(t)} (${fmt(W.totemBonus(t, wild))})`))),
          h('h4', null, 'Offerings ', h('span', { class: 'muted' }, '(up to 2)')),
          h('p', { class: 'small muted' }, `${sp.name} likes: ${W.bestOfferings(sp.id).slice(0, 4).map((o) => `${itemInfo(o.id).icon} ${itemInfo(o.id).name} +${o.bonus}`).join(', ')}. Any berry helps too.`),
          offers.length ? h('div', { class: 'chips' }, offers.map((o) => {
            const on = chosen.includes(o);
            return h('button', { class: `pick ${on ? 'sel' : ''}`, disabled: !on && chosen.length >= 2, onclick: () => { chosen = on ? chosen.filter((x) => x !== o) : [...chosen, o]; render(); } },
              `${itemInfo(o).icon} ${itemInfo(o).name} ×${s.inventory[o]} (${fmt(W.offeringBonus([o], wild))})`);
          })) : h('p', { class: 'small muted' }, 'No materials or treats. Explore to find some.'),
          h('div', { class: 'odds' }, h('span', null, `Roll 2d6 ${fmt(mods)} vs RT ${need}`), h('b', null, `${Math.round(chance * 100)}% chance`)),
          h('div', { class: 'row end gap' },
            h('button', { class: 'btn ghost', onclick: () => { done = true; close(); resolve(); } }, 'Let it go'),
            h('button', { class: 'btn primary', onclick: async () => {
              done = true; close();
              const r = W.attemptRecruit(s, wild, totem, chosen);
              await rollDice('Offering', r.dice.map((v) => ({ sides: 6, value: v, tone: r.success ? 'good' : 'bad' })), `${r.dice[0]} + ${r.dice[1]} ${fmt(r.mods)} = ${r.total} vs ${r.need}`, 700);
              if (r.success) { toast(`${sp.name} embraced your totem and joined you!`, 'good', 3500); if (s.roster.length >= 3 && !s.roster.includes(wild)) toast('Your active team is full — it rests in its totem (swap at a stable).', 'info', 4000); }
              else toast(`${sp.name} refused the offering and slipped away.`, 'bad', 3000);
              resolve();
            } }, 'Make offering')));
      };
      const close = openSheet('Offer a Totem', body, { onClose: () => { if (!done) resolve(); } });
      render();
    });
  }

  // ════════════════════════════════════════════════════════════
  // Cities, towns, stadium
  // ════════════════════════════════════════════════════════════
  citySheet() {
    const s = this.s;
    const id = s.location;
    const c = CITIES[id];
    const cost = W.cityActionCost(s);
    const costTag = cost === 0 ? 'free' : `${cost}⚡`;
    const gate = W.arbiterGate(s, id);
    const body = h('div', { class: 'city' },
      h('div', { class: 'city-hero', style: `--tc:${TYPE_COLOR[c.type]}` },
        h('img', { src: typeIcon(c.type) }),
        h('div', null, h('h3', null, c.name), h('small', null, `Inspired by ${c.park} · ${TYPE_LABEL[c.type]} City${s.trainer.home === id ? ' · 🏠 Home' : ''}`), h('p', { class: 'small' }, c.blurb))),
      h('div', { class: 'tiles' },
        tile('🍲', 'Stable', `${c.hotpot.name}: full recovery + ${c.hotpot.text}${s.trainer.home === id ? ' (doubled — home!)' : ''}`, costTag, () => this.stable()),
        tile('🛒', 'Market', 'Restores, treats, charms and totems.', costTag, () => this.market()),
        tile('🪵', 'Carving Shrine', 'Carve type totems and creature effigies.', costTag, () => this.shrine()),
        c.arenaNode
          ? tile('⛴️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `✓ ${c.accolade} earned` : `${c.arbiter}\u2019s ${c.arena.name} is offshore, on the island. Take the ferry from the docks to Black Sand Cove (needs a Ferry Pass, sold at this market, or a creature that can Sail).`, '', () => {}, true)
          : tile('🏟️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `✓ ${c.accolade} earned` : `${c.arena.name}. ${gate.ok ? 'Ready to accept your challenge.' : gate.reason}`, s.merits.includes(id) ? '' : costTag, () => this.arbiter(), s.merits.includes(id))));
    openSheet(c.name, body, { wide: true });
  }

  spend(): boolean {
    if (!W.spendCityAction(this.s)) { toast('Not enough Initiative for that.', 'bad'); return false; }
    return true;
  }

  stable() {
    if (!this.spend()) return;
    const r = W.rest(this.s, this.s.location);
    const city = CITIES[this.s.location];
    closeAllSheets();
    toast(city ? `Your team devours the ${city.hotpot.name}${r.advanced ? ' (home special!)' : ''}. Fully restored!` : 'Your team rests up at the town stable. Fully restored!', 'good', 3500);
    save(this.s);
    this.renderHud();
    if (this.s.reserve.length) this.rosterManager();
  }

  rosterManager() {
    const s = this.s;
    let pick: string | null = null;
    const body = h('div');
    const render = () => {
      body.replaceChildren(
        h('p', { class: 'small' }, 'Tap an active creature, then a resting one to swap them. Resting creatures lose Morale if neglected too long.'),
        h('h4', null, 'Active team (max 3)'),
        h('div', { class: 'list' }, s.roster.map((c) => miniCard(c, { selected: pick === c.uid, onClick: () => { pick = pick === c.uid ? null : c.uid; render(); } }))),
        h('h4', null, `Resting in totems (${s.reserve.length})`),
        h('div', { class: 'list' }, s.reserve.map((c) => miniCard(c, { onClick: () => {
          if (s.roster.length < 3) { s.reserve = s.reserve.filter((x) => x !== c); s.roster.push(c); }
          else if (pick) { const i = s.roster.findIndex((x) => x.uid === pick); const out = s.roster[i]; s.roster[i] = c; s.reserve = s.reserve.filter((x) => x !== c); s.reserve.push(out); if (s.following === out.uid) s.following = c.uid; pick = null; }
          else { toast('Select an active creature first.', 'info'); return; }
          save(s); this.renderHud(); render();
        } }))),
        s.roster.length > 1 ? h('div', { class: 'row end' }, h('button', { class: 'btn ghost sm', disabled: !pick, onclick: () => { const c = s.roster.find((x) => x.uid === pick); if (c) { s.roster = s.roster.filter((x) => x !== c); s.reserve.push(c); if (s.following === c.uid) s.following = s.roster[0].uid; pick = null; save(s); this.renderHud(); render(); } } }, 'Send selected to rest')) : '');
    };
    openSheet('Stable · Manage Team', body, { wide: true });
    render();
  }

  market(free = false) {
    if (!free && !this.spend()) return;
    this.renderHud();
    const s = this.s;
    const stock = [...W.marketStock(s.location)];
    const town = TOWNS[s.location];
    if (town?.key && !stock.includes(town.key)) stock.unshift(town.key);
    const body = h('div');
    const render = () => {
      body.replaceChildren(
        h('div', { class: 'row between' }, h('span', { class: 'chip' }, '🪙 ', h('b', null, s.coins), ' coins'), W.ability(s) === 'babyEyes' ? h('span', { class: 'chip good' }, 'Baby-Doll Eyes: −25%') : null),
        h('p', { class: 'small muted' }, 'Items are never used in battle — use them from your Bag between fights.'),
        h('div', { class: 'shop' }, stock.map((id) => {
          const it = itemInfo(id);
          const owned = s.inventory[id] ?? 0;
          const p = W.priceOf(s, id);
          const isKey = it.kind === 'key';
          return h('div', { class: `shop-row ${isKey ? 'key' : ''}` },
            h('span', { class: 'shop-ico' }, it.icon),
            h('div', null, h('b', null, it.name), h('small', null, it.text), owned ? h('small', { class: 'muted' }, ` · owned ${isKey ? '✓' : owned}`) : null),
            h('button', { class: 'btn sm primary', disabled: s.coins < p || (isKey && owned > 0), onclick: () => { if (W.buy(s, id)) { toast(`Bought ${it.name}`, 'good', 1500); save(s); this.renderHud(); render(); } } }, `🪙 ${p}`));
        })));
    };
    openSheet(town ? `${NODE_BY_ID[s.location].name} · Market` : 'Market', body, { wide: true });
    render();
  }

  shrine() {
    if (!this.spend()) return;
    this.renderHud();
    const s = this.s;
    let kind: 'type' | 'effigy' = 'type';
    let target: string = 'fire';
    let mats: string[] = [];
    const body = h('div');
    const render = () => {
      const materials = Object.keys(s.inventory).filter((k) => itemInfo(k).kind === 'material');
      const need = kind === 'type' ? 1 : 2;
      const cost = kind === 'type' ? 6 : 10;
      body.replaceChildren(
        h('p', { class: 'small' }, 'Carved totems lure specific creatures. Type totems: +3 for that type, −1 for others. Effigies: +5 for one species, −3 for all others (in bad taste!). A Plain Totem gives +1 to anyone.'),
        ...(kind === 'effigy' ? [h('p', { class: 'small muted' }, 'You can carve an Effigy of any creature in your Creature Codex: anything you’ve seen in the wild or in a trainer’s team. ', h('button', { class: 'link', onclick: () => this.codex() }, 'Open Codex'))] : []),
        h('div', { class: 'seg' }, h('button', { class: kind === 'type' ? 'sel' : '', onclick: () => { kind = 'type'; target = 'fire'; mats = []; render(); } }, 'Type Totem'), h('button', { class: kind === 'effigy' ? 'sel' : '', onclick: () => { kind = 'effigy'; target = codexOrder(s.dex.seen)[0]; mats = []; render(); } }, 'Effigy')),
        kind === 'type'
          ? h('div', { class: 'chips' }, TYPES.map((t) => h('button', { class: `pick ${target === t ? 'sel' : ''}`, onclick: () => { target = t; render(); } }, typeIconImg(t, 16), ' ', TYPE_LABEL[t])))
          : h('div', { class: 'chips' }, codexOrder(s.dex.seen).map((id) => h('button', { class: `pick ${target === id ? 'sel' : ''}`, onclick: () => { target = id; render(); } },
              h('img', { src: portrait(id), alt: '', width: 22, height: 22 }), SPECIES_BY_ID[id].name, s.dex.caught.includes(id) ? ' 🗿' : ''))),
        h('h4', null, `Materials (${mats.length}/${need})`),
        materials.length ? h('div', { class: 'chips' }, materials.map((m) => {
          const on = mats.includes(m);
          return h('button', { class: `pick ${on ? 'sel' : ''}`, disabled: !on && mats.length >= need, onclick: () => { mats = on ? mats.filter((x) => x !== m) : [...mats, m]; render(); } }, `${itemInfo(m).icon} ${itemInfo(m).name} ×${s.inventory[m]}`);
        })) : h('p', { class: 'small muted' }, 'You have no carving materials. Explore wild nodes to find them.'),
        h('div', { class: 'row end gap' }, h('span', { class: 'chip' }, '🪙 ', s.coins),
          h('button', { class: 'btn primary', disabled: mats.length < need || s.coins < cost, onclick: () => {
            const id = W.carveTotem(s, kind, target, mats);
            if (id) { toast(`Carved a ${W.itemDisplayName(id)}!`, 'good'); mats = []; save(s); this.renderHud(); render(); }
          } }, `Carve · 🪙 ${cost}`)));
    };
    openSheet('Carving Shrine', body, { wide: true });
    render();
  }

  async arbiter() {
    const s = this.s;
    const id = W.arbiterHere(s);
    if (!id) return;
    const c = CITIES[id];
    const gate = W.arbiterGate(s, id);
    if (s.merits.includes(id)) { toast(gate.reason ?? '', 'info'); return; }
    if (!gate.ok) {
      if (gate.wait) {
        const ok = await confirmSheet('Wait for the aurora?', `${gate.reason} Wait until nightfall for 2 Initiative?`, 'Wait (2⚡)');
        if (ok) { if (s.initiative < 2) { toast('Not enough Initiative.', 'bad'); return; } s.initiative -= 2; s.flags.salemNight = true; save(s); this.renderHud(); toast('The aurora ignites over the ice floes…', 'good'); this.arbiter(); }
        return;
      }
      if (gate.findHim) { this.findFabian(); return; }
      toast(gate.reason ?? 'Not yet.', 'bad', 3500);
      return;
    }
    const tier = tierOf(s);
    const body = h('div', { class: 'arbiter', style: `--tc:${TYPE_COLOR[c.type]}` },
      h('div', { class: 'city-hero' }, h('img', { src: typeIcon(c.type) }), h('div', null, h('h3', null, `Arbiter ${c.arbiter}`), h('small', null, `${c.arena.name} · ${TYPE_LABEL[c.type]} specialist`))),
      h('p', null, c.arena.text),
      h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, `Your Tier: ${tier}`), h('span', { class: 'chip' }, `${tier === 1 ? 2 : 3} creatures · Lv ~${1 + tier * 2}`), h('span', { class: 'chip' }, `Prize: ${c.accolade} + 🪙${10 * tier}`)),
      h('p', { class: 'small muted' }, 'Arbiters scale to your Tier, so you may challenge them in any order.'),
      h('div', { class: 'row end gap' }, h('button', { class: 'btn ghost', onclick: () => closeAllSheets() }, 'Not yet'), h('button', { class: 'btn primary', onclick: async () => {
        if (!this.spend()) return;
        closeAllSheets();
        await this.runBattle(W.arbiterBattle(s, id), { kind: 'arbiter', intro: `Arbiter ${c.arbiter} accepts your challenge!`, city: id });
      } }, `Challenge · ${W.cityActionCost(s) || 'free'}${W.cityActionCost(s) ? '⚡' : ''}`)));
    openSheet(`${c.name} Arena`, body);
  }

  findFabian() {
    const s = this.s;
    const faces = ['🧑‍🌾', '👵', '🧔', '👩‍🎨', '🧙'];
    const fab = Math.floor(Math.random() * 3);
    const shown = [...faces].sort(() => Math.random() - 0.5).slice(0, 3);
    const close = openSheet('Where is Fabian?', h('div', null,
      h('p', null, 'Fabian hides among the townsfolk of Hollow Crest in disguise. Who looks suspicious? (A wrong guess costs 1 Initiative as you get pranked.)'),
      h('div', { class: 'fabian' }, shown.map((f, i) => h('button', { class: 'villager', onclick: () => {
        close();
        if (i === fab) { s.flags.fabianFound = true; toast('"Ha! You saw through my glamour." Fabian will accept your challenge.', 'good', 4000); save(s); this.arbiter(); }
        else { s.initiative = Math.max(0, s.initiative - 1); toast('A bucket of glitter falls on you. Wrong villager!', 'bad', 3000); save(s); this.renderHud(); }
      } }, f)))));
  }

  townSheet() {
    const s = this.s;
    const t = TOWNS[s.location];
    const n = NODE_BY_ID[s.location];
    const body = h('div', { class: 'city' },
      h('p', null, t.blurb),
      h('div', { class: 'tiles' },
        tile('🐴', 'Stable', 'Full recovery for your team, KOs included. No Chanko Nabe buff: that’s a city specialty.', W.cityActionCost(s) ? `${W.cityActionCost(s)}⚡` : 'free', () => this.stable()),
        tile('🛒', 'Market', t.key ? `Sells the ${itemInfo(t.key).name}. ${itemInfo(t.key).text}` : 'Local goods.', 'free', () => this.market(true)),
        tile('🗺️', 'Notice Board', 'Local rumors and tips.', '', () => this.rumors())),
      h('p', { class: 'small muted' }, 'Towns are safe from the wilds. Town markets cost no Initiative; the stable costs the same as a city action.'));
    openSheet(n.name, body, { wide: true });
  }

  rumors() {
    const tips = [
      'Amber\u2019s Fire Pit is on Kilauea island. Ferries run from Mangrove Port and Kilauea Forge; buy a Ferry Pass at Saltmarsh Landing or the Forge.',
      'Stella only surfaces her fortress for trainers with 2 or more accolades.',
      'Dahlia waits on the Gloomshade forest floor. Lumber Hollow sells the rope to get down.',
      'They say Fabian always hides as a villager. Look closely.',
      'Salem\'s arena only opens under the aurora — come in winter, or be ready to wait for nightfall.',
      'Sunspire Summit holds a legend. Tier 3 climbers with a Summit Pick only.',
      'The Shifting Depths below Houndmouth Canyon hold rare creatures. Bring a strong team.',
      'Creatures that learn Fly can whisk you to any city you\'ve visited.',
      'Be at Circuit Stadium when Turn 100 ends — with all 8 Merits — or the season is over.',
    ];
    openSheet('Notice Board', h('ul', { class: 'tips' }, tips.sort(() => Math.random() - 0.5).slice(0, 4).map((t) => h('li', null, '📌 ', t))));
  }

  stadiumSheet() {
    const s = this.s;
    openSheet('Circuit Stadium', h('div', null,
      h('p', null, 'The grand tournament of Margos convenes here when the year ends. Be standing in this stadium as Turn 100 ends with all 8 Merits to enter the bracket.'),
      h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, `Merits: ${s.merits.length}/8`), h('span', { class: 'chip' }, `Turn ${s.turn}/100`)),
      h('p', { class: 'small muted' }, 'Bracket: 8 trainers, 3v3 elimination. Your team is fully restored between matches.')));
  }

  flySheet() {
    const s = this.s;
    const close = openSheet('Fly · 3 Initiative', h('div', { class: 'list' }, W.flyTargets(s).map((id) => h('button', { class: 'choice city', style: `--tc:${TYPE_COLOR[CITIES[id].type]}`, onclick: async () => {
      close();
      const from = s.location;
      if (W.fly(s, id)) { this.busy = true; await this.world.hop(from, id); this.busy = false; save(s); this.renderHud(); }
    } }, h('div', { class: 'row gap-s' }, typeIconImg(CITIES[id].type, 22), h('b', null, CITIES[id].name))))));
  }

  // ════════════════════════════════════════════════════════════
  // Team, bag, follower
  // ════════════════════════════════════════════════════════════
  teamSheet() {
    const s = this.s;
    const body = h('div', null,
      h('div', { class: 'list' }, s.roster.map((c) => miniCard(c, { badge: c.uid === s.following ? 'Following' : undefined, onClick: () => this.showCreature(c) }))),
      s.reserve.length ? [h('h4', null, `Resting in totems (${s.reserve.length})`), h('div', { class: 'list' }, s.reserve.map((c) => miniCard(c, { onClick: () => this.showCreature(c) }))), h('p', { class: 'small muted' }, 'Swap your active team at any city Stable.')] : null);
    openSheet('Your Team', body, { wide: true });
  }

  showCreature(c: CreatureInst, readOnly = false) {
    const close = openSheet(nameOf(c), creatureCard(c, { editable: !readOnly, onChange: () => { save(this.s); if (!readOnly) this.renderHud(); } }), { wide: true, cls: 'card-sheet' });
    void close;
  }

  pickFollower() {
    const s = this.s;
    const close = openSheet('Who follows you?', h('div', null,
      h('p', { class: 'small' }, 'Your Following creature gains Loyalty and Morale each turn, applies its overworld Ability, and leads in battle. Going without one hides your type from challengers.'),
      h('div', { class: 'list' },
        s.roster.map((c) => h('div', { class: 'swap-row' }, miniCard(c, { selected: c.uid === s.following, onClick: () => { if (c.ko) { toast('KO\'d creatures can\'t follow.', 'bad'); return; } s.following = c.uid; save(s); close(); this.renderHud(); } }),
          h('small', null, '🌿 ', h('b', null, ABILITIES[speciesOf(c).ability].name), ' — ', ABILITIES[speciesOf(c).ability].text))),
        h('button', { class: 'btn ghost', onclick: () => { s.following = null; save(s); close(); this.renderHud(); } }, 'Nobody follows'))));
  }

  bagSheet() {
    const s = this.s;
    const body = h('div');
    const render = () => {
      const groups: Record<string, string[]> = { restore: [], treat: [], charm: [], totem: [], material: [], key: [] };
      for (const id of Object.keys(s.inventory)) groups[itemInfo(id).kind]?.push(id);
      const labels: Record<string, string> = { restore: 'Restoratives', treat: 'Treats', charm: 'Charms', totem: 'Totems', material: 'Offering & Carving Materials', key: 'Key Items' };
      body.replaceChildren(
        h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, '🪙 ', h('b', null, s.coins)), s.flags.lure ? h('span', { class: 'chip good' }, '🕯️ Lure active') : null, s.flags.starCharm ? h('span', { class: 'chip good' }, '⭐ Star Charm active') : null),
        ...Object.entries(groups).filter(([, v]) => v.length).map(([k, ids]) => h('section', null, h('h4', null, labels[k]),
          h('div', { class: 'bag-grid' }, ids.map((id) => {
            const it = itemInfo(id);
            const usable = ['restore', 'treat', 'charm'].includes(it.kind);
            return h('div', { class: 'bag-item' }, h('span', { class: 'bi-ico' }, it.icon), h('div', null, h('b', null, W.itemDisplayName(id), ' ×', s.inventory[id]), h('small', null, it.text), it.kind === 'material' ? materialDetail(it) : null),
              usable ? h('button', { class: 'btn sm', onclick: () => this.useItemFlow(id, render) }, 'Use') : null);
          })))),
        Object.keys(s.inventory).length === 0 ? h('p', { class: 'muted' }, 'Your bag is empty.') : '');
    };
    openSheet('Bag', body, { wide: true });
    render();
  }

  useItemFlow(id: string, after: () => void) {
    const s = this.s;
    const it = itemInfo(id);
    if (it.kind === 'charm') { const m = W.useItem(s, id, s.roster[0].uid); if (m) toast(m, 'good'); save(s); after(); return; }
    const close = openSheet(`Use ${it.name} on…`, h('div', { class: 'list' }, [...s.roster, ...s.reserve].map((c) => miniCard(c, { onClick: () => {
      const m = W.useItem(s, id, c.uid);
      if (m) toast(m, m.includes('must') || m.includes('can\'t') ? 'bad' : 'good', 2800);
      save(s); close(); after(); this.renderHud();
    } }))));
  }

  // ════════════════════════════════════════════════════════════
  // Turn flow
  // ════════════════════════════════════════════════════════════
  /** True (and the event reopens) if an end-of-turn event is still waiting for an answer. */
  private eventBlocks(): boolean {
    if (!this.s.event) return false;
    toast('Answer the waiting event before ending your turn.', 'info', 3000);
    this.eventFlow();
    return true;
  }

  async camp() {
    if (this.eventBlocks()) return;
    const s = this.s;
    const needs = W.campNeeds(s);
    if (s.initiative < 1 || !needs.length) { toast(s.initiative < 1 ? 'Camping needs Initiative: each point left tends one creature.' : 'No one needs tending.', 'info', 3000); return; }
    const limit = s.initiative;
    // start with the most wounded picked; the trainer can change it
    const picked = new Set(W.campTargets(s).map((c) => c.uid));
    const list = h('div', { class: 'camp-list' });
    const count = h('b');
    const go = h('button', { class: 'btn primary', onclick: () => { close(); this.endTurn([...picked], true); } }, 'Camp & end turn') as HTMLButtonElement;
    const render = () => {
      count.textContent = `${picked.size}/${limit}`;
      go.disabled = picked.size === 0;
      list.replaceChildren(...s.roster.map((c) => {
        const mv = maxVitality(c), canTend = needs.includes(c), on = picked.has(c.uid);
        const full = picked.size >= limit && !on;
        const why = c.ko ? 'KO’d: needs a stable' : !canTend ? 'Fully rested' : full ? 'Out of Initiative' : null;
        // hearts: kept (on), recovered by tending (gain), still missing (off)
        const hearts = h('span', { class: 'hearts' }, Array.from({ length: mv }, (_, i) =>
          h('span', { class: `heart ${i < c.vitality ? 'on' : on ? 'gain' : ''}` }, '♥')));
        return h('button', {
          class: `camp-mon ${on ? 'on' : ''} ${canTend ? '' : 'na'}`, disabled: !canTend || full, 'aria-pressed': String(on),
          onclick: () => { if (on) picked.delete(c.uid); else picked.add(c.uid); render(); },
        },
          h('span', { class: 'camp-check' }, on ? '✓' : ''),
          h('img', { src: portrait(c.species), alt: '' }),
          h('div', { class: 'camp-info' },
            h('div', { class: 'row gap-s' }, h('b', null, nameOf(c)), h('small', { class: 'muted' }, `Lv ${c.level}`)),
            h('div', { class: 'row gap-s' }, hearts,
              h('small', { class: on ? 'gain-txt' : 'muted' }, c.ko ? '' : on ? `+${mv - c.vitality} ♥` : `${c.vitality}/${mv}`),
              c.fatigue ? h('span', { class: `chip ${on ? 'good' : 'bad'}` }, on ? `😮‍💨 Fatigue ${c.fatigue} → 0` : `😮‍💨 Fatigue ${c.fatigue}`) : null),
            why ? h('small', { class: 'muted' }, why) : null));
      }));
    };
    render();
    const close = openSheet('Make camp', h('div', null,
      h('p', { class: 'small' }, `Camping ends your turn and uses all ${limit} Initiative you have left. Each point tends one creature: it recovers all its Vitality and shakes off Fatigue.`),
      h('p', { class: 'small muted' }, 'Highlighted hearts are what tending restores. KO’d creatures need a stable.'),
      h('div', { class: 'row gap-s' }, h('span', null, 'Tending '), count),
      list,
      h('div', { class: 'row gap end' }, h('button', { class: 'btn ghost', onclick: () => close() }, 'Cancel'), go)));
  }

  async endTurn(camping: boolean | string[] = false, skipConfirm = false) {
    const s = this.s;
    if (this.busy) return;
    if (this.eventBlocks()) return;
    if (!skipConfirm && s.initiative > 0) {
      const ok = await confirmSheet('End turn?', `You still have ${s.initiative} Initiative left.`, 'End turn');
      if (!ok) return;
    }
    this.busy = true;
    closeAllSheets();
    $('.node-preview')?.remove();
    const r = W.endTurn(s, camping);
    for (const n of r.left) toast(`${n} lost faith in you and returned to the wild…`, 'bad', 4000);
    if (r.ended === 'endgame') { this.busy = false; save(s); this.renderHud(); this.endgameSheet(); return; }
    if (r.ended === 'over') { this.busy = false; save(s); this.gameOver(); return; }
    const se = season(s);
    if (r.seasonChanged) await this.banner(`${SEASON_INFO[se].icon} ${SEASON_INFO[se].label}`, `Turn ${s.turn} — the season turns in Margos.`);
    const w = WEATHER[s.weather];
    await rollDice(`Weather · ${SEASON_INFO[se].label}`, [{ sides: 6, value: r.weatherRoll, face: w.icon, label: w.name }], `${w.name}: ${w.text}`, 650);
    this.busy = false;
    E.rollEvent(s);
    save(s);
    this.renderHud();
    if (s.turn === 90) toast('10 turns left! Head toward Circuit Stadium.', 'bad', 5000);
    if (s.event) await this.eventFlow();
  }

  /**
   * Show the pending end-of-turn event and resolve the player's answer. Closing the window does NOT
   * decline it: the event stays pending (reopen it from the HUD) until a choice is made.
   */
  async eventFlow(): Promise<void> {
    const s = this.s;
    const view = E.eventView(s);
    if (!view || document.querySelector('.sheet-wrap.event-sheet')) return;
    const answer = await new Promise<{ choice: string; uid?: string } | null>((resolve) => {
      let settled = false;
      const done = (v: { choice: string; uid?: string } | null) => { if (!settled) { settled = true; close(); resolve(v); } };
      const choose = (ch: E.EventChoice) => {
        if (!ch.pick) { done({ choice: ch.id }); return; }
        const all = [...s.roster, ...s.reserve];
        const closePick = openSheet(`${view.title} · choose a creature`, h('div', null,
          h('p', { class: 'small' }, ch.label, ch.detail ? ` · ${ch.detail}` : ''),
          h('div', { class: 'list' }, all.map((c) => {
            const why = ch.canPick?.(c) ?? null;
            const card = miniCard(c, { badge: why ? '✕' : undefined, onClick: () => { if (why) { toast(why, 'info'); return; } closePick(); done({ choice: ch.id, uid: c.uid }); } });
            if (why) { card.classList.add('unpickable'); card.title = why; }
            return card;
          }))), { wide: true });
      };
      const body = h('div', { class: 'event' },
        h('div', { class: 'event-head' }, h('span', { class: 'event-ico' }, view.icon), h('p', null, view.text)),
        h('div', { class: 'event-choices' }, view.choices.map((ch) =>
          h('button', { class: `event-choice ${ch.id === 'decline' ? 'ghost' : ''}`, disabled: !!ch.disabled, onclick: () => choose(ch) },
            h('b', null, ch.label),
            ch.disabled ? h('small', { class: 'bad-text' }, ch.disabled) : ch.detail ? h('small', null, ch.detail) : null))));
      const close = openSheet(`${view.title}`, h('div', null, body,
        h('p', { class: 'small muted center' }, 'Close this to check your team first. The event waits at the bottom of the screen.')),
        { cls: 'event-sheet', onClose: () => { if (!settled) { settled = true; resolve(null); } } });
    });
    if (!answer) { this.renderHud(); return; }
    const r = E.resolveEvent(s, answer.choice, answer.uid);
    if (!r) { this.renderHud(); return; }
    save(s);
    this.renderHud();
    toast(r.text, r.tone, 3500);
    if (r.battle) {
      await wait(400);
      await this.runBattle(r.battle, { kind: 'trainer', intro: r.text });
    }
  }

  async banner(title: string, sub: string) {
    const b = h('div', { class: 'banner' }, h('h2', null, title), h('p', null, sub));
    document.body.append(b);
    requestAnimationFrame(() => b.classList.add('in'));
    await wait(1600);
    b.classList.remove('in');
    setTimeout(() => b.remove(), 400);
  }

  meritCelebration(city: string) {
    sfx.fanfare();
    const c = CITIES[city];
    const s = this.s;
    openSheet('Accolade earned!', h('div', { class: 'center celebrate', style: `--tc:${TYPE_COLOR[c.type]}` },
      h('img', { class: 'big-emblem', src: typeIcon(c.type) }),
      h('h3', null, c.accolade),
      h('p', null, `Arbiter ${c.arbiter}: "${['Well fought.', 'You have a real bond with your team.', 'Remarkable. Go on, then.', 'I\'ll be watching at the Circuit.'][Math.floor(Math.random() * 4)]}"`),
      h('p', { class: 'small' }, `Merits: ${s.merits.length}/8 · Trainer Tier ${tierOf(s)}`)));
  }

  // ════════════════════════════════════════════════════════════
  // Endgame
  // ════════════════════════════════════════════════════════════
  endgameSheet() {
    const s = this.s;
    const eg = s.endgame!;
    const rounds = ['Quarterfinal', 'Semifinal', 'Grand Final'];
    const body = h('div', { class: 'bracket-wrap' },
      h('p', null, 'The Creature Circuit has begun! Eight trainers, 3v3 elimination. Your team is fully restored before each match.'),
      h('div', { class: 'bracket' }, eg.bracket.map((name, i) => h('div', { class: `br ${i === 0 ? 'me' : ''} ${i > 0 && i <= eg.round ? 'out' : ''} ${i === eg.round + 1 ? 'next' : ''}` }, i === 0 ? '⭐ ' : '', name))),
      h('div', { class: 'row end' }, h('button', { class: 'btn primary big', onclick: async () => {
        close();
        const b = W.endgameBattle(s);
        const res = await this.runBattle(b, { kind: 'endgame', intro: `${rounds[eg.round]}! ${b.sides[1].name} takes the field.` });
        if (res === 'win') {
          eg.round++;
          if (eg.round >= 3) { s.phase = 'champion'; save(s); this.champion(); return; }
        } else { eg.eliminated = true; s.phase = 'over'; save(s); this.gameOver(); return; }
        save(s);
        this.engine.setView(this.world);
        this.renderHud();
        this.endgameSheet();
      } }, `Fight: ${rounds[eg.round]} vs ${eg.bracket[eg.round + 1]}`)));
    const close = openSheet('🏆 The Creature Circuit', body, { noClose: true });
  }

  champion() {
    this.engine.setView(this.world);
    this.world.setTitleMode(true);
    const s = this.s;
    this.ui.replaceChildren(h('div', { class: 'title-screen' }, h('div', { class: 'title-card celebrate' },
      h('h1', null, '🏆 Champion!'),
      h('p', null, `${s.trainer.name} is the Champion of the Creature Circuit — the best trainer of all time.`),
      h('div', { class: 'row center gap-s' }, s.roster.map((c) => h('div', { class: 'champ-mon' }, h('img', { src: portrait(c.species) }), h('b', null, nameOf(c)), h('small', null, `Lv ${c.level}`)))),
      this.statsLine(),
      h('button', { class: 'btn primary big', onclick: () => { clearSave(); this.title(); } }, 'New Journey'))));
  }

  gameOver() {
    this.engine.setView(this.world);
    this.world.setTitleMode(true);
    const s = this.s;
    const why = s.endgame?.eliminated ? `Eliminated in the ${['Quarterfinal', 'Semifinal', 'Grand Final'][s.endgame.round]}.` : s.merits.length < 8 ? `The year ended with ${s.merits.length}/8 Merits.` : 'You weren\'t at Circuit Stadium when Turn 100 ended.';
    this.ui.replaceChildren(h('div', { class: 'title-screen' }, h('div', { class: 'title-card' },
      h('h1', null, 'Season Over'),
      h('p', null, why),
      this.statsLine(),
      h('button', { class: 'btn primary big', onclick: () => { clearSave(); this.title(); } }, 'New Journey'))));
  }

  statsLine() {
    const s = this.s;
    return h('div', { class: 'row center gap-s wrap' },
      h('span', { class: 'chip' }, `🏅 ${s.merits.length}/8 Merits`), h('span', { class: 'chip' }, `⚔️ ${s.stats.battlesWon} wins`),
      h('span', { class: 'chip' }, `🗿 ${s.stats.recruited} recruited`), h('span', { class: 'chip' }, `📖 ${s.dex.caught.length}/${SPECIES.length} caught`));
  }

  // ════════════════════════════════════════════════════════════
  // Menus & info
  // ════════════════════════════════════════════════════════════
  menu() {
    const close = openSheet('Menu', h('div', { class: 'tiles' },
      tile('📖', 'Creature Codex', `${this.s.dex.caught.length} recruited · ${this.s.dex.seen.length} seen`, '', () => { close(); this.codex(); }),
      tile('🌀', 'Status Effects', 'What Burn, Sunder, Daze and the rest do.', '', () => { close(); openSheet('Status Effects', statusGuide()); }),
      tile('🔺', 'Type Chart', 'Strengths and weaknesses.', '', () => { close(); typeChartSheet(); }),
      tile('📜', 'Journal', 'Recent events.', '', () => { close(); this.journal(); }),
      tile('❓', 'How to Play', 'Rules summary.', '', () => { close(); this.howToPlay(); }),
      tile('⚙️', 'Settings', 'Sound, dice speed, motion, double-tap travel.', '', () => { close(); this.settingsSheet(); }),
      tile('🏠', 'Title Screen', 'Your game is autosaved.', '', () => { close(); this.title(); }),
      tile('🗑️', 'Abandon Journey', 'Delete this save.', '', async () => { close(); if (await confirmSheet('Abandon journey?', 'This deletes your save permanently.', 'Delete')) { clearSave(); this.title(); } })));
  }

  settingsSheet() {
    const body = h('div');
    const render = () => {
      const st = settings();
      const toggle = (k: 'sound' | 'fastDice' | 'reduceMotion' | 'doubleTapTravel' | 'fastBattle', label: string, text: string) =>
        h('label', { class: 'toggle' }, h('div', null, h('b', null, label), h('small', null, text)),
          h('input', { type: 'checkbox', role: 'switch', checked: st[k], onchange: (e: Event) => { setSetting(k, (e.target as HTMLInputElement).checked); if (k === 'sound' && st[k] === false) sfx.tap(); render(); } }));
      body.replaceChildren(
        toggle('sound', 'Sound effects', 'Dice, hits and fanfares (synthesized, no downloads).'),
        toggle('fastDice', 'Fast dice', 'Shorter dice-roll animations for quicker turns.'),
        toggle('fastBattle', 'Fast battles', 'Pick a move and it resolves at once, with no move readout, no damage dice and short pauses. Off: each move shows what it will roll first, and every roll is explained as it happens.'),
        toggle('reduceMotion', 'Reduce motion', 'Tones down UI animations.'),
        toggle('doubleTapTravel', 'Double-tap to travel', 'Double-tap (or double-click) an adjacent node to travel there without the Travel button.'),
        h('p', { class: 'small muted' }, 'Keyboard: 1–4 pick a move (Enter to confirm its readout, Esc to go back), B catch breath, S swap, R run, T type chart, Esc closes panels.'));
    };
    render();
    openSheet('Settings', body);
  }

  codex() {
    const s = this.s;
    openSheet('Creature Codex', h('div', null,
      h('p', { class: 'small muted' }, 'Every creature you meet in the wild or in a trainer’s team is recorded here. Tap one to see where to find it and what it likes. You can carve an Effigy of any creature in the Codex at a Carving Shrine.'),
      h('div', { class: 'dex-grid' }, SPECIES.map((sp) => {
        const caught = s.dex.caught.includes(sp.id), seen = s.dex.seen.includes(sp.id);
        return h(seen ? 'button' : 'div', { class: `dex-entry ${caught ? 'caught' : seen ? 'seen' : 'unknown'}`, style: `--tc:${TYPE_COLOR[sp.types[0]]}`, onclick: seen ? () => this.codexEntry(sp.id) : undefined },
          seen ? h('img', { src: portrait(sp.id), alt: '' }) : h('div', { class: 'qm' }, '?'),
          h('b', null, seen ? sp.name : '???'),
          h('div', { class: 'row gap-s center' }, seen ? sp.types.map((t) => typeIconImg(t, 14)) : null, caught ? h('span', { title: 'Recruited' }, '🗿') : null));
      }))), { wide: true });
  }

  /** One Codex page: where to find the species (or its earlier stages) and how to win it over. */
  codexEntry(id: string) {
    const s = this.s;
    const sp = SPECIES_BY_ID[id];
    const caught = s.dex.caught.includes(id);
    const nodeChip = (spot: W.Spot) => {
      const visited = s.visited.includes(spot.node.id);
      return h('span', { class: `chip ${visited ? '' : 'unvisited'}`, title: visited ? 'Visited' : 'Not visited yet' },
        BIOME_INFO[spot.node.biome].icon, ' ', spot.node.name, spot.minStage > 1 ? h('small', { class: 'muted' }, ` · wild Lv ${spot.minStage === 2 ? 6 : 10}+`) : null);
    };
    const line = W.evolutionLine(id);
    const where = line.map((member) => {
      const spots = W.encounterSpots(member.id);
      const known = s.dex.seen.includes(member.id);
      const label = member.id === id ? sp.name : `Earlier stage: ${known ? member.name : '???'}`;
      return h('div', { class: 'codex-where' },
        h('b', null, label, h('span', { class: 'muted small' }, ` · Stage ${member.stage}`)),
        spots.length ? h('div', { class: 'chips' }, spots.map(nodeChip))
          : h('p', { class: 'small muted' }, member.id === id && line.length > 1 ? 'Not found in the wild at this stage. Evolve it from an earlier stage.' : member.placeholder && member.rarity === 'legendary' ? 'Placeholder Legendary: not placed on the map yet.' : 'Not known to roam the wild.'));
    });
    const offers = W.bestOfferings(id);
    const biomesText = (mid: string) => materialBiomes(mid).map((b) => `${BIOME_INFO[b].icon} ${BIOME_INFO[b].label}`).join(', ');
    openSheet(sp.name, h('div', { class: 'codex-entry' },
      h('div', { class: 'recruit-head', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
        h('img', { src: portrait(sp.id), alt: '' }),
        h('div', null,
          h('h3', null, sp.name, caught ? h('span', { title: 'Recruited' }, ' 🗿') : null),
          h('div', { class: 'row gap-s' }, sp.types.map((t) => typeChip(t, true)), rarityBadge(sp.rarity), h('span', { class: 'chip' }, `Stage ${sp.stage}`), h('span', { class: 'chip' }, `RT ${sp.rt}`)),
          h('p', { class: 'small' }, sp.dex))),
      h('h4', null, '🗺️ Where to look'),
      h('p', { class: 'small muted' }, 'Explore these wild nodes. Faded ones are places you haven’t visited yet. Rarer creatures need good star rolls, and weather can bring out other types too.'),
      ...where,
      h('h4', null, '🎁 Best offerings'),
      offers.length ? h('div', { class: 'offer-list' }, offers.map((o) => {
        const it = itemInfo(o.id);
        const have = s.inventory[o.id] ?? 0;
        return h('div', { class: 'offer-row' },
          h('span', { class: 'bi-ico' }, it.icon),
          h('div', null,
            h('b', null, it.name, ' ', h('span', { class: 'good-text' }, `+${o.bonus}`), have ? h('span', { class: 'muted small' }, ` · you have ${have}`) : null),
            h('small', { class: 'muted' }, `Found in: ${biomesText(o.id)}`)));
      })) : h('p', { class: 'small muted' }, 'No material appeals to it.'),
      h('p', { class: 'small' }, h('b', null, 'Also: '), `Sunberries and Dewberries give +1 and Moonberries +2 to any creature. A ${sp.types.map((t) => TYPE_LABEL[t]).join(' or ')} Totem gives +3, and a ${sp.name} Effigy gives +5. Carve either at a city’s Carving Shrine.`)),
      { wide: true });
  }

  journal() {
    openSheet('Journal', h('ul', { class: 'journal' }, this.s.log.map((l) => h('li', null, h('small', null, `T${l.turn}`), ' ', l.text))));
  }

  calendar() {
    const s = this.s;
    const se = season(s);
    const w = WEATHER[s.weather];
    openSheet('Season & Weather', h('div', null,
      h('div', { class: 'calendar' }, (['spring', 'summer', 'autumn', 'winter'] as const).map((k, i) => h('div', { class: `cal ${k === se ? 'now' : ''}` }, h('span', null, SEASON_INFO[k].icon), h('b', null, SEASON_INFO[k].label), h('small', null, `Turns ${i * 25 + 1}–${i * 25 + 25}`)))),
      h('div', { class: 'progress' }, h('i', { style: `width:${s.turn}%` })),
      h('h4', null, `${w.icon} ${w.name}`), h('p', null, w.text),
      h('h4', null, `${SEASON_INFO[se].label} weather die`),
      h('div', { class: 'chips' }, SEASON_INFO[se].dice.map((id, i) => h('span', { class: 'chip' }, `${i + 1}: ${WEATHER[id].icon} ${WEATHER[id].name}`)))));
  }

  meritsSheet() {
    const s = this.s;
    openSheet(`Merits · Tier ${tierOf(s)}`, h('div', null,
      h('p', { class: 'small' }, 'Every 2 Merits raises your Trainer Tier; Arbiters scale their teams and arena tricks to your Tier. 8 Merits = Tier 5 and an invitation to the Circuit.'),
      h('div', { class: 'merit-list' }, Object.values(CITIES).map((c) => h('div', { class: `merit-row ${s.merits.includes(c.nodeId) ? 'on' : ''}`, style: `--tc:${TYPE_COLOR[c.type]}` },
        h('img', { src: typeIcon(c.type) }), h('div', null, h('b', null, c.accolade), h('small', null, `${c.arbiter} · ${c.name}`)), s.merits.includes(c.nodeId) ? '✓' : '')))));
  }

  howToPlay(welcome = false) {
    openSheet(welcome ? `Welcome, ${this.s.trainer.name}!` : 'How to Play', h('div', { class: 'howto' },
      h('ol', null,
        h('li', null, h('b', null, '5 Initiative per turn. '), 'Moving to an adjacent node costs 1. Tap a glowing node on the map, then Travel, or just double-tap it (you can turn this off in Settings).'),
        h('li', null, h('b', null, 'Entering a wild node explores it: '), 'roll d6 — 1–2 nothing, 3–4 a wild creature (or trainer), 5–6 an item. Rarity star dice decide Common / Prime / Apex.'),
        h('li', null, h('b', null, 'Combat: '), 'faster creature acts first (ties Clash). Roll accuracy vs Evasion. Physical attacks crit on a max roll; elemental attacks use the type chart and inflict a status on a minimum damage roll (see Menu → Status Effects, or tap a status tag in battle). In battle, each Elemental move shows how it lands on the current opponent (2× Super effective, ½ Resisted, No effect…), and 🔺 Types (or T) opens the chart for the matchup. Damage drains the Health bar, then a Vitality heart; out of hearts means KO.'),
        h('li', null, h('b', null, 'Stamina & Fatigue: '), 'each move costs Effort. At 0 Stamina you gain Fatigue — fatigued creatures roll d10 and may lose their turn.'),
        h('li', null, h('b', null, 'Move readouts: '), 'tap a move to see what it will roll, in order: turn order, Stamina, the accuracy die vs the foe’s Evasion, then the damage die plus Power (physical) or Focus (elemental) minus the foe’s Armor or Ward. Confirm to use it. Every roll is explained as it happens. Turn on Fast battles in Settings to skip all this.'),
        h('li', null, h('b', null, 'Camping: '), 'on a wild node, camp to end your turn. Each Initiative you have left lets you tend one creature you choose, restoring its Vitality and clearing Fatigue. Camp early to tend more of your team.'),
        h('li', null, h('b', null, 'Playbook: '), 'up to 4 moves. Energy is a requirement, not spent per use: the playbook editor crosses out the energy each move takes and counts what is left.'),
        h('li', null, h('b', null, 'Recruit: '), 'defeat a wild creature, then offer a totem plus up to 2 offerings. Roll 2d6 + bonuses vs its Recruitment Threshold. Each material appeals to certain types (shown in your Bag).'),
        h('li', null, h('b', null, 'Creature Codex: '), 'every creature you meet in the wild or in a trainer\u2019s team is recorded. Its page lists the nodes to explore for it (or its earlier stages) and its favorite offerings. You can carve an Effigy of any creature in your Codex.'),
        h('li', null, h('b', null, 'Grow: '), 'every creature that fights earns XP when the battle ends, win or lose, and knocking out a foe earns a bonus (running away earns nothing). Every 10 XP is a level and a point to spend on the skill tree on the back of the creature\'s index card. A node opens once every node linked above it is bought. Evolving needs the whole center path; side branches are optional but are left behind when it evolves.'),
        h('li', null, h('b', null, 'Cities: '), 'rest at the Stable (full recovery plus a Chanko Nabe battle buff), shop, carve totems and challenge the Arbiter for a Merit.'),
        h('li', null, h('b', null, 'Events: '), 'at the end of each turn something happens on the road: a trader, a caretaker, a storm, a rival… Most can be declined; a few (storms, thieves) make you choose. Close the window to check your team first; the event waits at the bottom of the screen until you answer it, and you can’t end the turn before then.'),
        h('li', null, h('b', null, 'Towns: '), 'their Stable also fully recovers your team, KOs included, but serves no Chanko Nabe buff. Town markets are free.'),
        h('li', null, h('b', null, 'Win: '), 'hold 8 Merits and stand in Circuit Stadium when Turn 100 ends. Then win the 8-trainer bracket.')),
      welcome ? h('p', { class: 'small muted' }, 'Tip: pick a Follower (top-left) — it leads your battles and powers your overworld Ability.') : null));
  }
}

// ── helpers ──────────────────────────────────────────────────────
/** Species ids in Codex (species list) order. */
function codexOrder(ids: string[]) { return SPECIES.filter((sp) => ids.includes(sp.id)).map((sp) => sp.id); }
/** What an offering material is good for, and where it turns up. */
function materialDetail(it: Item) {
  const allure = (Object.entries(it.allure ?? {}) as [ElementType, number][]).sort((a, b) => b[1] - a[1]);
  return h('div', { class: 'mat-detail' },
    h('span', { class: 'row gap-s' }, allure.map(([t, v]) => h('span', { class: 'chip sm' }, typeIconImg(t, 14), ` ${TYPE_LABEL[t]} +${v}`))),
    h('small', { class: 'muted' }, `Recruiting bonus for creatures of those types (the best match counts). Found in: ${materialBiomes(it.id).map((b) => `${BIOME_INFO[b].icon} ${BIOME_INFO[b].label}`).join(', ')}. Also used to carve totems.`));
}
function tile(icon: string, title: string, text: string, cost: string, fn: () => void, disabled = false) {
  return h('button', { class: 'tile', disabled, onclick: fn }, h('span', { class: 'tile-ico' }, icon), h('div', null, h('b', null, title), h('small', null, text)), cost ? h('span', { class: 'cost' }, cost) : null);
}
const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
function probAtLeast(target: number) {
  let ok = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= target) ok++;
  return ok / 36;
}
function snapOf(c: CreatureInst): Snap { return { uid: c.uid, health: c.health, vitality: c.vitality, stamina: c.stamina, fatigue: c.fatigue, ko: c.ko }; }
const AFFINITY_NAME = (id: string) => AFFINITIES[id]?.name ?? id;
