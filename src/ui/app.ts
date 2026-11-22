import { h, $, toast, openSheet, closeAllSheets, confirmSheet, rollDice, coinFlip, floatText, wait, mirror, type DieSpec } from './dom';
import { sfx } from './sound';
import { settings, setSetting } from './settings';
import { GUIDE, welcomeTour } from './guide';
import { creatureCard, miniCard, moveCard, typeChip, typeIconImg, rarityBadge, typeChartSheet, statusGuide, statCompare, socialHelp, fatigueBadge, fmtTeamwork, editSwapMove, alphaText } from './cards';
import { Engine, portrait } from '../render/engine';
import { WorldView, type Reach } from '../render/world';
import { BattleView } from '../render/battle';
import { playerLook, arbiterLook, championLook, roamingLook, SKIN, HAIR, PANTS, HAT_OPTIONS, JACKET_OPTIONS, HAIR_STYLE_OPTIONS, type TrainerLook } from '../render/trainerModel';
import { trainerPortrait } from '../render/engine';
import type { TrainerLookChoice } from '../engine/state';
import type { GameState, TrainerStyle, BattleKind, Retrain } from '../engine/state';
import { newGame, save, load, clearSave, hasItem, tierOf, season, follower, log, TRAINER_STYLES, MAX_PLAYERS, newMatch, setActiveMatch, activeMatchOf, saveMatch, loadMatch, clearMatch, nextSeat, stillPlaying, takenColors, useMatchSlot, onMatchSaved, loadOnlineMatch, clearOnlineMatch, GAUNTLET_CITY, rollWisp, wispLit, listCopies, saveCopy, restoreCopy, renameCopy, deleteCopy, describeSave, defaultCopyName, saveKindOf, LIBRARY_MAX, type Match, type SaveKind, type SavedCopy } from '../engine/state';
import { applyEdit, setWaypoint, type CreatureEdit } from '../engine/edits';
import * as W from '../engine/world';
import * as E from '../engine/events';
import * as I from '../engine/interactions';
import { Online, lastRoom, rememberRoom, type FeedItem, type ServerMsg } from '../net/online';
import type { Battle, BEvent, Snap } from '../engine/battle';
import { resolveRound, sendIn, activeOf, movePreview, swapPreview, ringRounds, ringLeft, partsText, chooseLead, foeOptions, foeReplacements, foeSendIn, statusGuard, type Action, type FoeOptions } from '../engine/battle';
import type { CreatureInst } from '../engine/creature';
import { nameOf, speciesOf, abilityOf, instinctIdOf, maxHealth, maxVitality, maxStamina, MORALE_LOW, TRAINER_BATTLE_XP_BONUS } from '../engine/creature';
import { SWAP_MOVE_BY_ID, swapText } from '../data/swapMoves';
import { INSTINCTS, INSTINCT_BY_ID, INSTINCT_ICON } from '../data/instincts';
import { riseText, TEAMWORK_PER_BONUS, TEAMWORK_PER_SWAP, TEAMWORK_PER_TURN } from '../engine/teamwork';
import { NODE_BY_ID, FOREST_FLOOR, isCloudNode, CLOUD_EYE, CLOUD_RING, CITIES, TOWNS, BIOME_TYPES, neighbors, MAP_NODES } from '../data/map';
import { SPECIES, SPECIES_BY_ID, isActive, STARTERS } from '../data/species';
import { MOVE_BY_ID, CATCH_BREATH, STATUS_INFO, ZERO_IN_MAX } from '../data/moves';
import { ABILITIES, NATURES, BIOME_INFO, SEASON_INFO, WEATHER, RECIPES, itemInfo, isUnique, materialBiomes, seasonForTurn, timeOfDay, TIME_INFO, ACTIVITY_INFO } from '../data/content';
import { TYPE_COLOR, TYPE_LABEL, TYPES, typeIcon } from '../data/types';
import type { Biome, ElementType, Item, Rarity, Species } from '../data/schema';

/** One line of the 📜 Battle Log: what happened (`text`), the rolls and maths behind it (`detail`), and whose side it was. */
interface BattleLogEntry { round: number; text: string; tone?: string; detail?: string; side?: 0 | 1 }

const TRAINER_COLORS = ['#ff6b3d', '#3d8bff', '#2fbf71', '#b05cff', '#ffcc33', '#ff4fa3', '#a51d2d', '#1f3a93'];
/** Rarity die faces (placeholders until the custom die-star icons arrive). */
const STAR_FACE = { full: '★', half: '☆', blank: '🚫' } as const;
const DEFAULT_NAMES = ['Rowan', 'Juno', 'Kai', 'Mira', 'Ash', 'Tess'];

/**
 * Trainer customisation: a live preview of the mini plus swatches. Your colour always goes on the
 * top and the hat (and the token's base); everything else is free to pick.
 */
function trainerLookEditor(get: () => { name: string; color: string; look: TrainerLookChoice }, set: (color: string, look: TrainerLookChoice) => void, taken: string[] = []) {
  const { name, color, look } = get();
  const full = playerLook(name, color, look);
  const cur = { skin: full.skin, hair: full.hair, pants: full.pants, hat: full.hat, jacket: full.jacket ?? 'jacket', hairStyle: full.hairStyle ?? 'short' };
  const upd = (patch: Partial<TrainerLookChoice>, c = color) => set(c, { ...cur, ...patch });
  const swatches = (label: string, list: string[], value: string, on: (v: string) => void, locked: string[] = []) =>
    h('div', { class: 'field' }, h('span', null, label), h('div', { class: 'swatches sm' }, list.map((c) =>
      h('button', {
        class: `swatch ${c === value ? 'sel' : ''} ${locked.includes(c) ? 'taken' : ''}`, style: `background:${c}`, disabled: locked.includes(c),
        title: locked.includes(c) ? 'Taken by another trainer' : '', 'aria-label': `${label} ${c}${locked.includes(c) ? ' (taken)' : ''}`, 'aria-pressed': String(c === value), onclick: () => on(c),
      }))));
  const options = (label: string, list: { id: string; label: string }[], value: string, on: (v: string) => void) =>
    h('div', { class: 'field' }, h('span', null, label), h('div', { class: 'look-opts' }, list.map((o) =>
      h('button', { class: `pb-filter ${o.id === value ? 'on' : ''}`, 'aria-pressed': String(o.id === value), onclick: () => on(o.id) }, o.label))));
  return h('div', { class: 'look-editor' },
    h('div', { class: 'look-preview', style: `--tc:${color}` }, h('img', { src: trainerPortrait(full), alt: 'Your trainer' }), h('small', null, 'Your trainer, on the map and in battle')),
    h('div', { class: 'look-fields' },
      swatches(taken.length ? 'Main colour (top, hat and token; each trainer’s is unique)' : 'Main colour (top, hat and token)', TRAINER_COLORS, color, (c) => upd({}, c), taken),
      options('Jacket', JACKET_OPTIONS, cur.jacket, (v) => upd({ jacket: v })),
      options('Hat', HAT_OPTIONS, cur.hat, (v) => upd({ hat: v })),
      swatches('Skin tone', SKIN, cur.skin, (v) => upd({ skin: v })),
      options('Hair style (ties and streaks use your main colour)', HAIR_STYLE_OPTIONS, cur.hairStyle, (v) => upd({ hairStyle: v })),
      swatches('Hair colour', HAIR, cur.hair, (v) => upd({ hair: v })),
      swatches('Pants', PANTS, cur.pants, (v) => upd({ pants: v }))));
}

/** A small async queue (online: battle rounds arrive over the network while a battle is being watched). */
class AsyncQueue<T> {
  private items: T[] = [];
  private waiters: ((v: T) => void)[] = [];
  push(v: T) { const w = this.waiters.shift(); if (w) w(v); else this.items.push(v); }
  next(): Promise<T> { return this.items.length ? Promise.resolve(this.items.shift()!) : new Promise((r) => this.waiters.push(r)); }
}

export class App {
  engine: Engine;
  world: WorldView;
  battleView: BattleView;
  s!: GameState;
  ui = h('div', { id: 'ui' });
  busy = false;
  selected: string | null = null;
  /** The current (or most recent) battle's log, for the 📜 Battle Log. Kept in memory only, not saved. */
  lastBattleLog: { title: string; entries: BattleLogEntry[] } | null = null;

  constructor(root: HTMLElement) {
    this.engine = new Engine(root);
    this.world = new WorldView(this.engine.canvas);
    this.battleView = new BattleView();
    this.engine.setView(this.world);
    root.append(this.ui);
    this.world.onNodeTap = (id) => this.onNodeTap(id);
    this.world.onNodeDoubleTap = (id) => this.onNodeDoubleTap(id);
    this.title();
    // invite links: ?room=CODE opens the Online sheet ready to join
    const invite = new URLSearchParams(location.search).get('room');
    if (invite) setTimeout(() => this.onlineSheet(invite.toUpperCase()), 300);
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
    const match = loadMatch();
    const matchLive = match && match.players.some(stillPlaying);
    this.ui.replaceChildren(h('div', { class: 'title-screen' },
      h('div', { class: 'title-card' },
        h('div', { class: 'logo' },
          h('div', { class: 'logo-icons' }, TYPES.map((t) => h('img', { src: typeIcon(t), alt: '' }))),
          h('h1', null, 'Creature', h('br'), 'Circuit'),
          h('p', null, 'Explore Margos · Befriend creatures · Earn 8 Merits · Win the Circuit')),
        h('div', { class: 'title-actions' },
          saved && saved.phase !== 'over' ? h('button', { class: 'btn primary big', onclick: () => this.start(saved) }, `Continue · ${saved.trainer.name}, Turn ${saved.turn}`) : null,
          matchLive ? h('button', { class: 'btn primary big', onclick: () => this.startMatch(match!) }, `Continue hotseat · ${match!.players.length} trainers, Turn ${match!.players[match!.current].turn}`) : null,
          h('button', { class: `btn ${saved || matchLive ? 'ghost' : 'primary'} big`, onclick: async () => {
            if (saved && saved.phase !== 'over' && !(await confirmSheet('Start a new journey?', `Your solo journey with ${saved.trainer.name} (Turn ${saved.turn}) will be replaced once the new one starts. Save a copy from 💾 Saves first to keep it.`, 'Start anyway'))) return;
            setActiveMatch(null); this.newGameWizard();
          } }, 'New Journey'),
          h('button', { class: 'btn ghost big', onclick: async () => {
            if (matchLive && !(await confirmSheet('Start a new hotseat game?', `Your hotseat game with ${match!.players.map((p) => p.trainer.name).join(', ')} will be replaced once the new one starts. Save a copy from 💾 Saves first to keep it.`, 'Start anyway'))) return;
            this.hotseatSetup();
          } }, `👥 Hotseat (2–${MAX_PLAYERS} trainers)`),
          h('div', { class: 'row gap-s center' },
            h('button', { class: 'btn ghost', onclick: () => this.onlineSheet() }, '🌐 Online'),
            h('button', { class: 'btn ghost', onclick: () => this.savesSheet() }, '💾 Saves'),
            h('button', { class: 'btn ghost', onclick: () => this.howToPlay() }, 'How to Play'))),
        h('small', { class: 'muted' }, 'v0.1 · Prototype content — creatures, moves and map are examples'))));
  }

  /**
   * Create a trainer: name, look, style, home city and starter. In hotseat setup, `seat` / `taken` /
   * `onDone` hand the finished trainer back instead of starting a solo journey, and colours already
   * chosen by earlier trainers are locked.
   */
  newGameWizard(opts: { seat?: number; total?: number; taken?: string[]; onDone?: (s: GameState) => void; onCancel?: () => void } = {}) {
    let finished = false;
    const taken = opts.taken ?? [];
    let name = opts.seat !== undefined ? DEFAULT_NAMES[opts.seat] : 'Rowan', color = TRAINER_COLORS.find((c) => !taken.includes(c)) ?? TRAINER_COLORS[0], style: TrainerStyle = 'balanced', home = 'thunder', starter = STARTERS[3];
    const who = opts.seat !== undefined ? `Trainer ${opts.seat + 1} of ${opts.total} · ` : '';
    let look: TrainerLookChoice = { skin: SKIN[1], hair: HAIR[1], pants: PANTS[0], hat: 'cap', jacket: 'jacket', hairStyle: 'short' };
    const step = (n: number) => {
      let body: HTMLElement;
      if (n === 0) {
        body = h('div', { class: 'wizard' },
          h('label', { class: 'field' }, h('span', null, 'Trainer name'), h('input', { value: name, maxlength: 16, oninput: (e: Event) => { name = (e.target as HTMLInputElement).value || 'Rowan'; } })),
          trainerLookEditor(() => ({ name, color, look }), (c, l) => { color = c; look = l; step(0); }, taken),
          h('div', { class: 'field' }, h('span', null, 'Trainer style'),
            h('p', { class: 'small muted' }, 'Your style shapes the whole season. Each has a perk and a drawback.'),
            h('div', { class: 'choice-grid style-grid' }, TRAINER_STYLES.map((st) =>
              h('button', { class: `choice ${style === st.id ? 'sel' : ''}`, onclick: () => { style = st.id; step(0); } },
                h('b', null, `${st.icon} ${st.name}`), h('small', { class: 'good-text' }, '＋ ', st.perk), h('small', { class: 'bad-text' }, '− ', st.drawback))))),
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
              INSTINCT_BY_ID[sp.instinct] ? h('p', { class: 'small' }, `${INSTINCT_ICON} `, h('b', null, INSTINCT_BY_ID[sp.instinct].name), ' — ', INSTINCT_BY_ID[sp.instinct].text) : null,
              h('p', { class: 'small muted' }, `Evolves: ${sp.name} → ${SPECIES_BY_ID[sp.evolvesTo!].name} → ${SPECIES_BY_ID[SPECIES_BY_ID[sp.evolvesTo!].evolvesTo!].name}`))),
          h('div', { class: 'row between' }, h('button', { class: 'btn ghost', onclick: () => step(1) }, '← Back'),
            h('button', { class: 'btn primary', onclick: () => {
              finished = true;
              close();
              const s = newGame(name.trim() || 'Rowan', style, home, starter, color, look);
              if (opts.onDone) opts.onDone(s); else this.start(s, true);
            } }, opts.onDone && opts.seat! + 1 < opts.total! ? 'Next trainer →' : 'Begin Journey ✦')));
      }
      sheetBody.replaceChildren(body);
      $('.sheet-head h2', sheetEl).textContent = who + ['Your Trainer', 'Home City', 'Choose a Starter'][n];
    };
    const sheetBody = h('div');
    const close = openSheet('Your Trainer', sheetBody, { wide: true, onClose: () => { if (!finished) opts.onCancel?.(); } });
    const sheetEl = sheetBody.closest('.sheet') as HTMLElement;
    step(0);
  }

  start(s: GameState, fresh = false) {
    if (!activeMatchOf()?.players.includes(s)) setActiveMatch(null);
    this.s = s;
    closeAllSheets();
    this.world.setTitleMode(false);
    this.world.setTrainerLook(playerLook(s.trainer.name, s.trainer.color, s.trainer.look));
    this.world.setPawnAt(s.location);
    this.world.focus(s.location, true);
    this.engine.setView(this.world);
    this.showRivals();
    if (s.phase === 'endgame') { this.renderHud(); this.endgameSheet(); return; }
    if (s.phase === 'over') { this.gameOver(); return; }
    this.renderHud();
    // (in hotseat, the waiting event opens once the trainer has taken the device: see startOfTurn)
    if (s.event && !activeMatchOf()) setTimeout(() => this.eventFlow(), 400);
    if (fresh) {
      log(s, `${s.trainer.name} set out from ${CITIES[s.trainer.home].name}.`);
      save(s);
      setTimeout(() => this.howToPlay(true), 400);
    }
  }

  // ════════════════════════════════════════════════════════════
  // Save management (title screen)
  // ════════════════════════════════════════════════════════════
  /**
   * Save management: the three live autosaves (solo, hotseat, online) with Continue / Save a copy /
   * Export / Delete, and the library of saved copies with Load / Export / Rename / Delete. Imported
   * files go into the library.
   */
  savesSheet() {
    const body = h('div', { class: 'saves' });
    const download = (name: string, data: unknown) => {
      const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })), download: name.replace(/[^\w.-]+/g, '-') });
      document.body.append(a); a.click(); a.remove();
    };
    const importFile = () => {
      const input = h('input', { type: 'file', accept: '.json,application/json' }) as HTMLInputElement;
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const kind = saveKindOf(text);
        if (!kind) { toast('That file isn’t a Creature Circuit save.', 'bad'); return; }
        const r = saveCopy(kind, JSON.parse(text), file.name.replace(/\.json$/i, ''));
        if (typeof r === 'string') { toast(r, 'bad', 5000); return; }
        toast(`Imported “${r.name}” into your saved copies. Load it from the list.`, 'good', 4000);
        render();
      };
      input.click();
    };
    const keepCopy = async (kind: SaveKind, data: GameState | Match) => {
      const name = await this.askName('📌 Save a copy', defaultCopyName(kind, data));
      if (name === null) return;
      const r = saveCopy(kind, data, name);
      if (typeof r === 'string') { toast(r, 'bad', 5000); return; }
      toast(`Saved “${r.name}”.`, 'good');
      render();
    };
    const loadCopy = async (c: SavedCopy) => {
      const live = c.kind === 'solo' ? load() : c.kind === 'hotseat' ? loadMatch() : loadOnlineMatch();
      const what = c.kind === 'solo' ? 'solo journey' : c.kind === 'hotseat' ? 'hotseat game' : 'saved online game';
      if (live && !(await confirmSheet(`Load “${c.name}”?`, `This replaces your current ${what} (${describeSave(c.kind, live)}). Save a copy of it first if you want to keep it.`, 'Load'))) return;
      const g = restoreCopy(c.id);
      if (!g) { toast('That copy can’t be loaded (it may be from an older version, or storage is full).', 'bad', 5000); return; }
      closeAllSheets();
      if (g.kind === 'solo') { setActiveMatch(null); this.start(g.save); }
      else if (g.kind === 'hotseat') void this.startMatch(g.match);
      else { this.title(); this.onlineSheet(); toast('Loaded. Reopen it as host and share the new room code.', 'good', 5000); }
    };
    const render = () => {
      const solo = load();
      const match = loadMatch();
      const online = loadOnlineMatch();
      const copies = listCopies();
      const status = (p: GameState) => (p.phase === 'champion' ? '🏆 Champion' : p.phase === 'over' ? 'Season over' : p.phase === 'endgame' ? 'In the Circuit bracket' : `Turn ${p.turn}/100`);
      const card = (title: string, lines: (string | HTMLElement)[], actions: (HTMLElement | null)[]) =>
        h('div', { class: 'save-card' }, h('b', null, title), ...lines.map((l) => (typeof l === 'string' ? h('small', null, l) : l)), h('div', { class: 'row gap-s wrap' }, actions));
      const seatsOf = (m: Match) => h('div', { class: 'seats' }, m.players.map((p, i) => h('span', { class: `seat ${i === m.current && stillPlaying(p) ? 'now' : ''} ${stillPlaying(p) ? '' : 'done'}`, style: `--tc:${p.trainer.color}` }, p.trainer.name)));
      const kindIcon: Record<SaveKind, string> = { solo: '🧭 Solo', hotseat: '👥 Hotseat', online: '🌐 Online' };
      body.replaceChildren(
        h('p', { class: 'small muted' }, 'Your games autosave as you play. 📌 Save a copy keeps a snapshot you can load again later (also from ☰ Menu in game). Saves live in this browser: export one to back it up or move it to another device.'),
        h('h4', null, '🧭 Solo journey'),
        solo
          ? card(solo.trainer.name, [`${status(solo)} · ${NODE_BY_ID[solo.location]?.name ?? ''} · ${solo.merits.length}/8 Merits · ${solo.roster.length + solo.reserve.length} creatures`], [
            solo.phase !== 'over' && solo.phase !== 'champion' ? h('button', { class: 'btn primary sm', onclick: () => { closeAllSheets(); this.start(solo); } }, 'Continue') : null,
            h('button', { class: 'btn ghost sm', onclick: () => void keepCopy('solo', solo) }, '📌 Save a copy'),
            h('button', { class: 'btn ghost sm', onclick: () => download(`creature-circuit-${solo.trainer.name}-turn${solo.turn}.json`, solo) }, '⬇ Export'),
            h('button', { class: 'btn ghost sm bad-text', onclick: async () => { if (await confirmSheet('Delete solo journey?', `${solo.trainer.name}’s journey (${status(solo)}) will be deleted. Saved copies and your other games are not affected.`, 'Delete')) { clearSave(); render(); this.title(); this.savesSheet(); } } }, '🗑 Delete'),
          ])
          : h('p', { class: 'small muted' }, 'No solo journey in progress.'),
        h('h4', null, '👥 Hotseat game'),
        match
          ? card(`${match.players.length} trainers`, [seatsOf(match), match.players.map((p) => `${p.trainer.name}: ${status(p)}, ${p.merits.length}/8 Merits`).join(' · ')], [
            match.players.some(stillPlaying) ? h('button', { class: 'btn primary sm', onclick: () => { closeAllSheets(); void this.startMatch(match); } }, 'Continue') : null,
            h('button', { class: 'btn ghost sm', onclick: () => void keepCopy('hotseat', match) }, '📌 Save a copy'),
            h('button', { class: 'btn ghost sm', onclick: () => download(`creature-circuit-hotseat-${match.players.length}p-turn${match.players[match.current].turn}.json`, match) }, '⬇ Export'),
            h('button', { class: 'btn ghost sm bad-text', onclick: async () => { if (await confirmSheet('Delete hotseat game?', `The game with ${match.players.map((p) => p.trainer.name).join(', ')} will be deleted for every trainer. Saved copies and your other games are not affected.`, 'Delete')) { clearMatch(); render(); this.title(); this.savesSheet(); } } }, '🗑 Delete'),
          ])
          : h('p', { class: 'small muted' }, 'No hotseat game in progress.'),
        h('h4', null, '🌐 Online game'),
        online
          ? card(`${online.players.length} trainers${online.code ? ` · room ${online.code}` : ''}`, [seatsOf(online), 'The last state this browser saw. Reopen it as host from 🌐 Online if its room has closed.'], [
            h('button', { class: 'btn primary sm', onclick: () => { closeAllSheets(); this.onlineSheet(); } }, '🌐 Online…'),
            h('button', { class: 'btn ghost sm', onclick: () => void keepCopy('online', online) }, '📌 Save a copy'),
            h('button', { class: 'btn ghost sm', onclick: () => download(`creature-circuit-online-${online.players.length}p-turn${online.players[online.current].turn}.json`, online) }, '⬇ Export'),
            h('button', { class: 'btn ghost sm bad-text', onclick: async () => { if (await confirmSheet('Forget online game?', 'This browser forgets its copy of the online game. The room itself (and everyone else’s copy) is not affected.', 'Forget')) { clearOnlineMatch(); render(); } } }, '🗑 Forget'),
          ])
          : h('p', { class: 'small muted' }, 'No online game on this device.'),
        h('h4', null, `🗂 Saved copies (${copies.length}/${LIBRARY_MAX})`),
        copies.length ? h('div', { class: 'list' }, copies.map((c) => card(c.name, [
          h('small', { class: 'muted' }, `${kindIcon[c.kind]} · saved ${new Date(c.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`), c.summary,
        ], [
          h('button', { class: 'btn primary sm', onclick: () => void loadCopy(c) }, '↺ Load'),
          h('button', { class: 'btn ghost sm', onclick: () => download(`creature-circuit-${c.name}.json`, c.data) }, '⬇ Export'),
          h('button', { class: 'btn ghost sm', onclick: async () => { const n = await this.askName('✏️ Rename', c.name); if (n) { renameCopy(c.id, n); render(); } } }, '✏️ Rename'),
          h('button', { class: 'btn ghost sm bad-text', onclick: async () => { if (await confirmSheet(`Delete “${c.name}”?`, 'This saved copy will be deleted permanently. Your games in progress are not affected.', 'Delete')) { deleteCopy(c.id); render(); } } }, '🗑 Delete'),
        ]))) : h('p', { class: 'small muted' }, 'No saved copies yet. Use 📌 Save a copy above, or ☰ Menu → Save a copy while playing.'),
        h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: importFile }, '⬆ Import a save file…')));
    };
    render();
    openSheet('💾 Saves', body, { wide: true });
  }

  /** Ask for a short name (saved copies). Resolves null if cancelled. */
  askName(title: string, initial: string): Promise<string | null> {
    return new Promise((resolve) => {
      let done = false;
      const input = h('input', { value: initial, maxlength: 40, style: 'width:100%;font-size:16px' }) as HTMLInputElement;
      const finish = (v: string | null) => { if (done) return; done = true; close(); resolve(v); };
      const close = openSheet(title, h('div', { class: 'stack gap-s' },
        h('label', { class: 'field' }, h('span', null, 'Name'), input),
        h('div', { class: 'row end gap-s' },
          h('button', { class: 'btn ghost', onclick: () => finish(null) }, 'Cancel'),
          h('button', { class: 'btn primary', onclick: () => finish(input.value.trim() || initial) }, 'Save'))), { onClose: () => { if (!done) { done = true; resolve(null); } } });
      input.onkeydown = (e) => { if (e.key === 'Enter') finish(input.value.trim() || initial); };
      setTimeout(() => { input.focus(); input.select(); }, 50);
    });
  }

  /** ☰ Menu → Save a copy: snapshot the game being played (solo, hotseat or online). */
  async saveCopyNow() {
    const m = activeMatchOf();
    const kind: SaveKind = this.online ? 'online' : m?.players.includes(this.s) ? 'hotseat' : 'solo';
    const data = kind === 'solo' ? this.s : m;
    if (!data) return;
    const name = await this.askName('📌 Save a copy', defaultCopyName(kind, data));
    if (name === null) return;
    const r = saveCopy(kind, data, name);
    if (typeof r === 'string') toast(r, 'bad', 5000); else toast(`Saved “${r.name}”. Load it any time from 💾 Saves on the title screen.`, 'good', 4000);
  }

  // ════════════════════════════════════════════════════════════
  // Online multiplayer (turn-based over the internet)
  // ════════════════════════════════════════════════════════════
  online: Online | null = null;
  /** Online: watching someone else's turn (read-only). */
  watching = false;
  /** Online: the seat:turn this browser is currently playing (so updates don't restart it). */
  activeKey = '';
  /** Online: the host is ending someone's turn for them. */
  skipping = false;
  private hopping = false;
  private watchQueue: AsyncQueue<FeedItem> | null = null;
  private lobbyBody: HTMLElement | null = null;
  private inWizard = false;
  private closeLobby: (() => void) | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private titleFlash: ReturnType<typeof setInterval> | null = null;

  /** True when this browser is playing the current turn online (so its actions are mirrored to everyone). */
  feeding() { return !!this.online && this.online.isController && !this.watching; }
  feed(item: FeedItem) { if (this.feeding()) this.online!.send({ type: 'feed', item }); }

  /** Title screen → 🌐 Online: create a room, join one by code, or reopen a saved online game. */
  onlineSheet(code?: string) {
    const saved = loadOnlineMatch();
    const last = lastRoom();
    const input = h('input', { value: code ?? '', maxlength: 5, placeholder: 'ABCDE', style: 'text-transform:uppercase;width:8em;font-size:18px;text-align:center' }) as HTMLInputElement;
    const close = openSheet('🌐 Online', h('div', { class: 'online' },
      h('p', null, 'Play turn by turn with up to six trainers over the internet. Everyone watches the current trainer’s moves and battles live; when your turn comes up you’ll get a ping, even in another tab.'),
      h('div', { class: 'row gap-s wrap' },
        h('button', { class: 'btn primary', onclick: async () => { close(); if (await this.connectOnline()) this.online!.create(); } }, '➕ Host a new room')),
      h('h4', null, 'Join a room'),
      h('div', { class: 'row gap-s' }, input,
        h('button', { class: 'btn primary', onclick: async () => { const c = input.value.trim().toUpperCase(); if (c.length !== 5) { toast('Room codes have 5 letters.', 'info'); return; } close(); if (await this.connectOnline()) this.online!.join(c); } }, 'Join')),
      last && !code ? h('p', { class: 'small' }, h('button', { class: 'link', onclick: async () => { close(); if (await this.connectOnline()) this.online!.join(last); } }, `Rejoin room ${last}`)) : '',
      saved && saved.owners ? h('div', null, h('h4', null, 'Your saved online game'),
        h('p', { class: 'small muted' }, `${saved.players.map((p) => p.trainer.name).join(', ')} · Turn ${saved.players[saved.current].turn}. If its room has closed (e.g. the server restarted), open it again as host and share the new code.`),
        h('button', { class: 'btn ghost', onclick: async () => { close(); if (await this.connectOnline()) this.online!.create({ match: saved, owners: saved.owners!, turnSeconds: saved.turnSeconds ?? 0 }); } }, '♻️ Reopen as host')) : '',
      h('p', { class: 'small muted' }, 'Online play needs the game server: it runs on Render from render.yaml, or locally with npm run server.')), { wide: true });
  }

  /** Connect to the game server (once). */
  async connectOnline(): Promise<boolean> {
    if (this.online?.ws?.readyState === 1) return true;
    const net = new Online();
    try { await net.connect(); } catch { toast('Couldn’t reach the game server. Online play needs it running (npm run server, or the Render deployment).', 'bad', 6000); return false; }
    this.online = net;
    net.on((m) => void this.onServer(m));
    useMatchSlot('online');
    onMatchSaved((m) => this.pushState(m));
    mirror.toast = (text, tone) => this.feed({ kind: 'toast', text, tone });
    mirror.dice = (title, dice, caption, hold) => this.feed({ kind: 'dice', title, dice, caption, hold });
    if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission().catch(() => undefined);
    return true;
  }

  /** Leave online play and go back to the title screen. */
  leaveOnline() {
    this.online?.close();
    this.online = null;
    mirror.toast = undefined; mirror.dice = undefined;
    onMatchSaved(null);
    useMatchSlot('hotseat');
    setActiveMatch(null);
    rememberRoom(null);
    this.watching = false; this.activeKey = '';
    this.world.setRivals([]);
    this.title();
  }

  /** After every save while playing the current turn, send the match to the server (batched). */
  pushState(m: Match) {
    if (!this.feeding()) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    const net = this.online!;
    this.pushTimer = setTimeout(() => { this.pushTimer = null; net.send({ type: 'state', match: m }); }, 80);
  }

  async onServer(m: ServerMsg) {
    const net = this.online;
    if (!net) return;
    switch (m.type) {
      case 'created': toast(`Room ${m.code} is open. Share the code (or link) with your friends.`, 'good', 5000); this.lobby(); break;
      case 'room':
        if (!m.started) this.lobby();
        else { this.closeLobby?.(); await this.syncRole(); }
        this.renderTimer();
        break;
      case 'state': this.applyState(m.match); break;
      case 'feed': await this.onFeed(m.item); break;
      case 'ask': this.answerAsk(m); break;
      case 'do-skip': await this.skipFor(m.seat, m.reason); break;
      case 'edit': this.applyRemoteEdit(m.seat, m.edit); break;
      case 'do-play': toast(`You’re playing ${activeMatchOf()?.players[m.seat]?.trainer.name ?? 'their'}’s turn for them.`, 'info', 4000); break;
      case 'error':
        toast(m.text, 'bad', 5000);
        if (/Disconnected/.test(m.text) && net.code) setTimeout(() => void this.reconnect(net.code!), 2500);
        break;
    }
  }

  async reconnect(code: string) {
    if (!this.online || this.online.ws?.readyState === 1) return;
    const old = this.online;
    this.online = null;
    old.close();
    if (await this.connectOnline()) { this.online!.join(code); toast('Reconnected.', 'good'); }
  }

  /** The lobby before the game starts: seats, your trainer, the host's timer and Start. */
  lobby() {
    const net = this.online!;
    const room = net.room;
    if (!room || room.started || this.inWizard) return;
    if (!this.lobbyBody) {
      this.lobbyBody = h('div', { class: 'lobby' });
      this.closeLobby = openSheet(`🌐 Room ${room.code}`, this.lobbyBody, { wide: true, noClose: true });
      const done = this.closeLobby;
      this.closeLobby = () => { done(); this.lobbyBody = null; this.closeLobby = null; };
    }
    const mine = room.seats.find((s) => s.clientId === net.id);
    const link = `${location.origin}${location.pathname}?room=${room.code}`;
    const taken = room.seats.filter((s) => s.clientId !== net.id && s.trainer).map((s) => s.trainer!.trainer.color);
    const ready = room.seats.filter((s) => s.trainer).length;
    this.lobbyBody.replaceChildren(
      h('p', null, 'Share this code or link. Everyone creates a trainer here, then the host starts the game.'),
      h('div', { class: 'row gap-s wrap' }, h('b', { class: 'room-code' }, room.code),
        h('button', { class: 'btn ghost sm', onclick: () => { void navigator.clipboard?.writeText(link); toast('Invite link copied.', 'good'); } }, '🔗 Copy invite link')),
      h('h4', null, `Trainers (${room.seats.length}/${MAX_PLAYERS})`),
      h('div', { class: 'list' }, room.seats.map((s, i) => h('div', { class: 'seat-row', style: `--tc:${s.trainer?.trainer.color ?? '#bbb'}` },
        h('b', null, `${i + 1}. ${s.trainer?.trainer.name ?? s.name}`),
        h('small', null, `${s.online ? '🟢 online' : '⚪ away'}${s.clientId === room.host ? ' · host' : ''}${s.clientId === net.id ? ' · you' : ''}${s.trainer ? '' : ' · creating…'}`)))),
      h('div', { class: 'row gap-s wrap' },
        room.seats.length < MAX_PLAYERS || mine ? h('button', { class: 'btn primary', onclick: () => {
          this.closeLobby?.();
          this.inWizard = true;
          this.newGameWizard({ taken, onDone: (s) => { this.inWizard = false; net.send({ type: 'seat', trainer: s }); this.lobby(); }, onCancel: () => { this.inWizard = false; this.lobby(); } });
        } }, mine?.trainer ? '✏️ Remake my trainer' : '➕ Create my trainer') : h('p', { class: 'small muted' }, 'The room is full.'),
        mine ? h('button', { class: 'btn ghost', onclick: () => net.send({ type: 'leave-seat' }) }, 'Give up my seat') : ''),
      net.isHost ? h('div', { class: 'host-box' },
        h('h4', null, '👑 Host settings'),
        h('label', { class: 'row gap-s' }, 'Turn timer ',
          h('select', { onchange: (e: Event) => net.send({ type: 'settings', turnSeconds: Number((e.target as HTMLSelectElement).value) }) },
            [0, 60, 120, 180, 300, 600, 900].map((sec) => h('option', { value: sec, selected: room.turnSeconds === sec }, sec ? `${sec / 60} min` : 'Off')))),
        h('p', { class: 'small muted' }, 'When a turn’s time runs out, the turn ends automatically. During the game you can also skip a turn, or play one for a trainer who has stepped away.'),
        h('button', { class: 'btn primary big', disabled: ready < 2 || ready !== room.seats.length, onclick: () => {
          const players = room.seats.map((s) => s.trainer!);
          const m = newMatch(players);
          m.owners = room.seats.map((s) => s.clientId);
          m.code = room.code;
          m.turnSeconds = room.turnSeconds;
          net.send({ type: 'start', match: m });
        } }, ready < 2 ? 'Waiting for at least 2 trainers…' : ready !== room.seats.length ? 'Waiting for everyone’s trainer…' : `Start with ${ready} trainers`))
        : h('p', { class: 'small muted' }, `Turn timer: ${room.turnSeconds ? `${room.turnSeconds / 60} min` : 'off'}. Waiting for the host to start…`),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => { this.closeLobby?.(); this.leaveOnline(); } }, 'Leave room')));
  }

  /** A new match snapshot from the server. */
  applyState(match: Match) {
    try { localStorage.setItem('creature-circuit-online-v1', JSON.stringify(match)); } catch { /* ignore */ }
    if (this.feeding()) return; // we're the one playing: our copy is the newest
    setActiveMatch(match);
    this.activeKey = ''; // the server's copy replaces ours, so any turn we were playing restarts from it
    if (!match.players.some(stillPlaying)) { this.matchSummary(); return; }
    void this.syncRole();
  }

  /** Play the current turn if this browser controls it, otherwise watch it. */
  async syncRole() {
    const net = this.online;
    const m = activeMatchOf();
    if (!net?.room?.started || !m || this.skipping) return;
    const s = m.players[m.current];
    const key = `${m.current}:${s.turn}`;
    if (net.room.controller === net.id) {
      if (!this.watching && this.activeKey === key) return;
      this.activeKey = key;
      this.watching = false;
      this.stopTitleFlash();
      this.start(s);
      if (m.owners?.[m.current] === net.id) this.notifyTurn(s);
      else toast(`You’re playing ${s.trainer.name}’s turn for them.`, 'info', 4000);
      await this.startOfTurn();
    } else {
      this.activeKey = '';
      this.spectate();
    }
  }

  /** Follow the current trainer: their token, their place on the map, their HUD (read-only). */
  spectate() {
    const m = activeMatchOf();
    if (!m) return;
    const s = m.players[m.current];
    this.watching = true;
    this.s = s;
    this.world.setTitleMode(false);
    this.world.setTrainerLook(playerLook(s.trainer.name, s.trainer.color, s.trainer.look));
    if (!this.hopping) this.world.setPawnAt(s.location);
    this.world.focus(s.location);
    this.showRivals();
    if (!this.watchQueue) { this.engine.setView(this.world); this.renderHud(); }
  }

  async onFeed(item: FeedItem) {
    if (!this.watching) return;
    switch (item.kind) {
      case 'toast': toast(item.text, item.tone, 3200); break;
      case 'dice': void rollDice(item.title, item.dice as DieSpec[], item.caption, item.hold); break;
      case 'hop':
        this.hopping = true;
        this.world.setPawnAt(item.from);
        await this.world.hop(item.from, item.to);
        this.hopping = false;
        break;
      case 'battle-start': {
        const q = new AsyncQueue<FeedItem>();
        this.watchQueue = q;
        const ctx = item.ctx as { kind: 'wild'; intro: string; city?: string; rivalLook?: TrainerLook };
        await this.runBattle(item.battle as Battle, { ...ctx, watch: q });
        if (this.watchQueue === q) this.watchQueue = null;
        this.spectate();
        break;
      }
      case 'battle-events': case 'battle-end': this.watchQueue?.push(item); break;
    }
  }

  /** It's this browser's turn: ping and flag the tab if it's in the background. */
  notifyTurn(s: GameState) {
    toast(`🔔 ${s.trainer.name}, it’s your turn!`, 'good', 4000);
    if (!document.hidden) return;
    if (settings().turnPing) sfx.ping();
    const base = document.title.replace(/^🔔 Your turn! · /, '');
    let on = false;
    this.stopTitleFlash();
    this.titleFlash = setInterval(() => { on = !on; document.title = on ? `🔔 Your turn! · ${base}` : base; }, 1000);
    const back = () => { if (!document.hidden) { this.stopTitleFlash(); document.title = base; removeEventListener('visibilitychange', back); } };
    addEventListener('visibilitychange', back);
    try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Creature Circuit', { body: `${s.trainer.name}, it’s your turn!`, tag: 'cc-turn' }); } catch { /* ignore */ }
  }
  stopTitleFlash() { if (this.titleFlash) { clearInterval(this.titleFlash); this.titleFlash = null; document.title = document.title.replace(/^🔔 Your turn! · /, ''); } }

  /** We run the current turn: another trainer tended their creatures from their own browser. */
  applyRemoteEdit(seat: number, edit: CreatureEdit) {
    const m = activeMatchOf();
    const s = m?.players[seat];
    if (!m || !s || !applyEdit(s, edit)) return;
    saveMatch(m); // and pushed to everyone if we're playing
    if (s === this.s) this.renderHud();
  }

  /** My seat in an online match (or -1). */
  mySeat(): number { const m = activeMatchOf(); return this.online && m?.owners ? m.owners.indexOf(this.online.id) : -1; }

  /**
   * The trainer whose next-stop marker this screen may show and change, or null. It's private to each
   * trainer: in hotseat that's whoever is taking their turn; online it's this browser's own trainer, even
   * while watching someone else (and never another trainer's while playing their turn for them).
   */
  markerOwner(): GameState | null {
    if (!this.s || this.s.phase !== 'map') return null;
    if (!this.online) return this.watching ? null : this.s;
    const m = activeMatchOf();
    const me = m?.players[this.mySeat()];
    return me && me.phase === 'map' ? me : null;
  }

  /** Mark (or unmark, with null) the next stop. While watching online, the change goes to the trainer playing. */
  markNextStop(id: string | null) {
    const me = this.markerOwner();
    if (!me || !setWaypoint(me, id)) return;
    if (this.watching) {
      const seat = this.mySeat();
      if (seat >= 0) this.online?.send({ type: 'edit', seat, edit: { op: 'waypoint', node: id } });
    } else if (activeMatchOf()?.players.includes(me)) saveMatch(activeMatchOf()!); else save(me);
    this.renderHud();
    toast(id ? `📍 Marked ${NODE_BY_ID[id].name} as your next stop. Only you can see it.` : '📍 Marker removed.', 'info', 2500);
  }

  /** Next-stop chip tapped: glide the map to my flag and light it up in my colour. */
  findNextStop() {
    const me = this.markerOwner();
    if (!me?.waypoint || this.engine.view !== this.world) return;
    const pos = this.world.waypointPos();
    if (!pos) return;
    this.world.focusPos(pos);
    this.world.spotlight(pos, me.trainer.color);
    toast(`📍 Your next stop: ${NODE_BY_ID[me.waypoint]?.name ?? ''}`, 'info', 2000);
  }

  /** While watching: tend my own creatures. The change shows here at once and is sent to the trainer playing. */
  showMyCreature(c: CreatureInst) {
    const seat = this.mySeat();
    const net = this.online;
    if (seat < 0 || !net) { this.showCreature(c, true); return; }
    openSheet(nameOf(c), creatureCard(c, { editable: true, teammates: this.teammatesOf(c), onEdit: (edit) => net.send({ type: 'edit', seat, edit }) }), { wide: true, cls: 'card-sheet' });
  }

  /** The other creatures of whichever trainer owns `c` (for the Teamwork on its card). */
  /**
   * The creatures a card lists Swap Moves for: the owner's active team only (totems would bloat every
   * card as a collection grows). Null for a creature resting in a totem.
   */
  teammatesOf(c: CreatureInst): CreatureInst[] | null {
    const owners = [this.s, ...(activeMatchOf()?.players ?? [])];
    const owner = owners.find((p) => p && [...p.roster, ...p.reserve].some((x) => x.uid === c.uid));
    if (!owner) return [];
    return owner.roster.some((x) => x.uid === c.uid) ? owner.roster : null;
  }

  /** Another trainer's trade or duel offer, answered from this browser. */
  answerAsk(m: Extract<ServerMsg, { type: 'ask' }>) {
    const net = this.online!;
    const pick = m.pick as ({ kind: 'duel'; round: number } & FoeOptions) | undefined;
    const send = m.pick as { kind: 'duel-send'; down: string; vs: string; options: { i: number; c: CreatureInst }[] } | undefined;
    if (send?.kind === 'duel-send') {
      if (document.hidden && settings().turnPing) sfx.ping();
      const close = openSheet(`⚔️ Your next creature against ${m.from}`, h('div', null,
        h('p', { class: 'small muted' }, 'Choose within a minute, or the next in line goes in.'),
        this.duelSendPicker(send.down, send.vs, send.options, (i) => { close(); net.send({ type: 'answer', id: m.id, yes: true, value: i }); })), { noClose: true, wide: true });
      return;
    }
    if (pick?.kind === 'duel') {
      if (document.hidden && settings().turnPing) sfx.ping();
      const close = openSheet(`⚔️ Your move against ${m.from}`, h('div', null,
        h('p', { class: 'small muted' }, 'Choose within a minute, or your creature acts on its own instincts.'),
        this.duelPicker(pick, pick.round, (act) => { close(); net.send({ type: 'answer', id: m.id, yes: true, value: act }); })), { noClose: true, wide: true });
      return;
    }
    if (document.hidden && settings().turnPing) sfx.ping();
    const close = openSheet(m.title, h('div', null, h('p', null, m.text),
      h('div', { class: 'row gap center' },
        h('button', { class: 'btn ghost', onclick: () => { close(); net.send({ type: 'answer', id: m.id, yes: false }); } }, m.no),
        h('button', { class: 'btn primary', onclick: () => { close(); net.send({ type: 'answer', id: m.id, yes: true }); } }, m.yes))), { noClose: true });
  }

  /** End a trainer's turn on their behalf (host's Skip, or the turn timer ran out). */
  async skipFor(seat: number, reason: 'timeout' | 'host') {
    const m = activeMatchOf();
    if (!m || m.current !== seat) return;
    const s = m.players[seat];
    this.skipping = true;
    closeAllSheets();
    this.busy = false;
    this.watching = false;
    this.activeKey = `${seat}:${s.turn}`;
    this.s = s;
    if (s.event) { s.event = undefined; log(s, 'The waiting event passed by.'); }
    toast(reason === 'timeout' ? `⏱ Time’s up: ${s.trainer.name}’s turn ends.` : `⏭ The host skipped ${s.trainer.name}’s turn.`, 'info', 4000);
    try { await this.endTurn(false, true); } finally { this.skipping = false; }
  }

  /** The host's turn timer readout (top of the HUD). */
  renderTimer() {
    const room = this.online?.room;
    let el = document.getElementById('turn-timer');
    if (!room?.deadline) { el?.remove(); return; }
    if (!el) { el = h('div', { id: 'turn-timer', class: 'turn-timer' }); document.body.append(el); }
    const tick = () => {
      const left = Math.max(0, Math.round(((this.online?.room?.deadline ?? 0) - Date.now()) / 1000));
      if (!this.online?.room?.deadline) { el!.remove(); return; }
      el!.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      el!.classList.toggle('low', left <= 15);
      setTimeout(tick, 500);
    };
    tick();
  }

  // ════════════════════════════════════════════════════════════
  // Hotseat multiplayer
  // ════════════════════════════════════════════════════════════
  /** Choose how many trainers, then create each one in turn (their colours are locked as they go). */
  hotseatSetup() {
    const close = openSheet('👥 Hotseat', h('div', null,
      h('p', null, 'Up to six trainers share this device. Turns go in seat order: when one trainer ends their turn, the next one starts theirs. Everyone shares the same map, weather and Legendaries.'),
      h('p', { class: 'small muted' }, 'Each trainer picks a unique main colour so everyone is easy to spot on the map.'),
      h('div', { class: 'row gap-s wrap' }, Array.from({ length: MAX_PLAYERS - 1 }, (_, i) => i + 2).map((n) =>
        h('button', { class: 'btn primary', onclick: () => { close(); this.createTrainers(n); } }, `${n} trainers`)))));
  }

  createTrainers(total: number) {
    const players: GameState[] = [];
    const next = () => {
      if (players.length === total) {
        const m = newMatch(players);
        setActiveMatch(m);
        for (const p of players) log(p, `${p.trainer.name} set out from ${CITIES[p.trainer.home].name}.`);
        saveMatch(m);
        void this.startMatch(m, true);
        return;
      }
      this.newGameWizard({ seat: players.length, total, taken: players.map((p) => p.trainer.color), onDone: (s) => { players.push(s); next(); } });
    };
    next();
  }

  /** Begin (or resume) a hotseat match with whoever's seat it is. */
  async startMatch(m: Match, fresh = false) {
    setActiveMatch(m);
    const s = m.players[m.current];
    this.start(s);
    await this.passDevice(s, fresh);
    await this.startOfTurn();
    if (fresh) this.howToPlay(true);
  }

  /** "Pass the device" screen between turns, so the next trainer knows it's them. */
  passDevice(s: GameState, first = false): Promise<void> {
    return new Promise((resolve) => {
      closeAllSheets();
      const close = openSheet(first ? 'The season begins!' : 'Next trainer', h('div', { class: 'handoff', style: `--tc:${s.trainer.color}` },
        h('img', { src: trainerPortrait(playerLook(s.trainer.name, s.trainer.color, s.trainer.look)), alt: '' }),
        h('h3', null, `${s.trainer.name}, it’s your turn`),
        h('p', { class: 'small muted' }, `Turn ${s.turn} · ${NODE_BY_ID[s.location].name}. Pass the device to ${s.trainer.name}.`),
        h('button', { class: 'btn primary big', onclick: () => { close(); resolve(); } }, `I’m ${s.trainer.name}: start my turn`)), { noClose: true });
    });
  }

  /** End of a hotseat turn: move to the next trainer still playing (or the final standings). */
  async handoff() {
    const m = activeMatchOf();
    if (!m) return;
    const i = nextSeat(m);
    if (this.online) {
      // online: hand the turn over through the server, then watch the next trainer
      if (i >= 0) m.current = i;
      saveMatch(m);
      this.activeKey = '';
      if (i < 0) { this.matchSummary(); return; }
      this.spectate();
      return;
    }
    if (i < 0) { this.matchSummary(); return; }
    m.current = i;
    saveMatch(m);
    const s = m.players[i];
    this.start(s);
    await this.passDevice(s);
    await this.startOfTurn();
  }

  /**
   * Start of a trainer's turn, the same in solo and hotseat: the round's weather (hotseat: if they're
   * first this turn), then from the second round on the turn's event, then the follower prompt.
   */
  async startOfTurn() {
    const s = this.s;
    if (s.phase !== 'map') return;
    const m = activeMatchOf();
    if (m && m.rolls[s.turn] === undefined) {
      // first trainer to start this turn: roll the weather once for the whole table
      const roll = W.rollRoundWeather(m, s.turn);
      saveMatch(m);
      this.renderHud();
      const se = season(s);
      if (s.turn > 1 && seasonForTurn(s.turn - 1) !== se) await this.banner(`${SEASON_INFO[se].icon} ${SEASON_INFO[se].label}`, `Turn ${s.turn} — the season turns in Margos.`);
      const w = WEATHER[s.weather];
      await rollDice(`Weather for Turn ${s.turn} · everyone`, [{ sides: 6, value: roll, face: w.icon, label: w.name }], `${w.name}: ${w.text}`, 900, { read: true });
    }
    if (s.turn > 1) toast(timeOfDay(s.turn) === 'night' ? '🌙 Night falls: nocturnal creatures are out.' : '☀️ Dawn breaks: diurnal creatures are out.', 'info', 2600);
    if (s.turn === 90) toast('10 turns left! Head toward Circuit Stadium.', 'bad', 5000);
    await this.showInbox();
    // Teamwork that grew while travelling last turn
    if (s.teamworkNews?.length) { toast(`🤝 Teamwork grew on the road: ${s.teamworkNews.join(' · ')}.`, 'good', 6000); s.teamworkNews = []; save(s); }
    // Teamwork that fell with a Loyalty (a pair's cap is half the lower Loyalty of the two)
    if (s.teamworkFell?.length) { toast(`🤝 Teamwork fell as Loyalty dropped: ${s.teamworkFell.join(' · ')}.`, 'bad', 7000); s.teamworkFell = []; save(s); }
    // one event per trainer per turn, from the second round, rolled here at the start of the turn
    if (s.turn >= 2 && s.eventTurn !== s.turn) { s.eventTurn = s.turn; E.rollEvent(s); save(s); this.renderHud(); }
    if (s.event) await this.eventFlow();
    if (settings().followerPrompt && s.phase === 'map' && (s.roster.filter((c) => !c.ko).length > 1 || !follower(s))) await this.followerSheet(true);
  }

  // ════════════════════════════════════════════════════════════
  // Hotseat: trainer interactions (gifts, trades, challenges)
  // ════════════════════════════════════════════════════════════
  /** The other trainers in the match, with what you can do with each. */
  trainersSheet() {
    const a = this.s;
    const m = activeMatchOf();
    if (!m) return;
    const others = m.players.filter((p) => p !== a);
    const close = openSheet('👥 Trainers', h('div', { class: 'list' },
      h('p', { class: 'small muted' }, 'Gifts and coin or item trades reach anyone, anywhere (a courier carries them). Trading creatures and challenging to a duel need you both on the same spot.'),
      others.map((b) => {
        const here = I.sameSpot(a, b);
        const why = I.challengeProblem(a, b);
        return h('div', { class: 'trainer-row', style: `--tc:${b.trainer.color}` },
          h('img', { src: trainerPortrait(playerLook(b.trainer.name, b.trainer.color, b.trainer.look)), alt: '' }),
          h('div', { class: 'trainer-info' },
            h('b', null, b.trainer.name, stillPlaying(b) ? '' : ' · finished'),
            h('small', null, `${here ? '📍 Here with you' : `At ${NODE_BY_ID[b.location].name}`} · 💰 ${b.coins} · ${b.merits.length}/8 Merits · ${b.roster.length + b.reserve.length} creatures`),
            h('div', { class: 'row gap-s wrap' },
              h('button', { class: 'btn ghost sm', onclick: () => { close(); this.giftSheet(b); } }, '📦 Send a gift'),
              h('button', { class: 'btn ghost sm', title: here ? 'Trade coins, items and creatures' : 'Trade coins and items by courier (meet on the same spot to trade creatures)', onclick: () => { close(); this.tradeSheet(b); } }, here ? '🤝 Trade' : '🤝 Trade items'),
              h('button', { class: 'btn ghost sm', disabled: !!why, title: why ?? '', onclick: () => { close(); this.challengeSheet(b); } }, '⚔️ Challenge · 1⚡')),
            why ? h('small', { class: 'muted' }, here ? why : `⚔️ Challenges and creature trades need you both on the same spot (${b.trainer.name} is at ${NODE_BY_ID[b.location].name}).`) : null));
      })), { wide: true });
  }

  /** Coins, items and (optionally) a creature from one trainer's belongings, for a gift or trade. */
  offerEditor(owner: GameState, offer: I.Offer, changed: () => void, allowCreature: boolean): HTMLElement {
    const items = Object.keys(owner.inventory).filter((id) => owner.inventory[id] > 0 && I.giftable(id));
    const step = (d: number) => () => { offer.coins = Math.max(0, Math.min(owner.coins, offer.coins + d)); changed(); };
    const itemStep = (id: string, d: number) => () => { offer.items[id] = Math.max(0, Math.min(owner.inventory[id], (offer.items[id] ?? 0) + d)); changed(); };
    return h('div', { class: 'offer' },
      h('div', { class: 'school-pay' }, h('span', null, '💰 Coins'),
        h('button', { class: 'btn ghost sm', onclick: step(-5) }, '−5'), h('button', { class: 'btn ghost sm', onclick: step(-1) }, '−1'),
        h('b', { class: 'school-coins' }, String(offer.coins)),
        h('button', { class: 'btn ghost sm', onclick: step(1) }, '+1'), h('button', { class: 'btn ghost sm', onclick: step(5) }, '+5'),
        h('small', { class: 'muted' }, `of ${owner.coins}`)),
      items.length ? h('div', { class: 'offer-items' }, items.map((id) => h('div', { class: 'offer-item' },
        h('span', null, `${itemInfo(id).icon} ${W.itemDisplayName(id)}`), h('small', { class: 'muted' }, `×${owner.inventory[id]}`),
        h('button', { class: 'btn ghost sm', onclick: itemStep(id, -1) }, '−'), h('b', null, String(offer.items[id] ?? 0)), h('button', { class: 'btn ghost sm', onclick: itemStep(id, 1) }, '+'))))
        : h('p', { class: 'small muted' }, 'No items that can be given.'),
      allowCreature ? h('div', null, h('small', { class: 'muted' }, 'Creature (optional): tap to choose, tap again to clear'),
        h('div', { class: 'list' }, [...owner.roster, ...owner.reserve].map((c) => miniCard(c, { selected: offer.creature === c.uid, onClick: () => { offer.creature = offer.creature === c.uid ? undefined : c.uid; changed(); } })))) : '');
  }

  /** Send coins and items to another trainer (no reply needed). */
  giftSheet(b: GameState) {
    const a = this.s;
    const offer = I.emptyOffer();
    const body = h('div');
    const render = () => {
      const err = I.offerIsEmpty(offer) ? 'Choose something to send.' : I.offerProblem(a, offer, b);
      body.replaceChildren(
        h('p', { class: 'small' }, `A courier will carry it to ${b.trainer.name} at ${NODE_BY_ID[b.location].name}. They’ll find a note at the start of their turn.`),
        this.offerEditor(a, offer, render, false),
        h('div', { class: 'row end gap' }, h('button', { class: 'btn primary', disabled: !!err, title: err ?? '', onclick: () => {
          const e = I.exchange(a, offer, b);
          if (e) { toast(e, 'bad'); return; }
          sfx.good(); save(a); close(); this.renderHud();
          toast(`📦 Sent to ${b.trainer.name}.`, 'good');
        } }, `Send to ${b.trainer.name}`)));
    };
    const close = openSheet(`📦 Gift for ${b.trainer.name}`, body, { wide: true });
    render();
  }

  /**
   * Propose a trade; the other trainer accepts or declines. Coins and items trade at any distance (by
   * courier); creatures only change hands when both trainers are on the same spot.
   */
  tradeSheet(b: GameState) {
    const a = this.s;
    const give = I.emptyOffer(), want = I.emptyOffer();
    const here = I.sameSpot(a, b);
    const body = h('div', { class: 'trade' });
    const render = () => {
      const err = I.offerIsEmpty(give) && I.offerIsEmpty(want) ? 'Add something to the trade.' : I.offerProblem(a, give, b, want) ?? I.offerProblem(b, want, a, give);
      body.replaceChildren(
        here ? '' : h('p', { class: 'small muted' }, `${b.trainer.name} is at ${NODE_BY_ID[b.location].name}, so this trade goes by courier: coins and items only. Meet on the same spot to trade creatures.`),
        h('div', { class: 'trade-cols' },
          h('div', null, h('h4', null, `You give ${b.trainer.name}`), this.offerEditor(a, give, render, here)),
          h('div', null, h('h4', null, `You ask from ${b.trainer.name}`), this.offerEditor(b, want, render, here))),
        h('div', { class: 'row end gap' }, h('button', { class: 'btn primary', disabled: !!err, title: err ?? '', onclick: async () => {
          close();
          const summary = h('div', null, h('p', null, `${a.trainer.name} offers a trade:`), this.offerSummary(a, give, 'You get'), this.offerSummary(b, want, 'You give'));
          const ok = await this.askTrainer(b, `🤝 ${a.trainer.name} proposes a trade`, summary, 'Accept trade', 'Decline');
          await this.backTo(a);
          if (!ok) { toast(`${b.trainer.name} declined the trade.`, 'info'); return; }
          const e = I.exchange(a, give, b, want);
          if (e) { toast(e, 'bad'); return; }
          sfx.good(); save(a); this.renderHud();
          toast(`🤝 Trade complete with ${b.trainer.name}!`, 'good');
        } }, `Propose to ${b.trainer.name}`)));
    };
    const close = openSheet(`🤝 Trade with ${b.trainer.name}`, body, { wide: true });
    render();
  }

  /** A readable list of what's in an offer (creature shown as a card). */
  offerSummary(owner: GameState, o: I.Offer, label: string) {
    const c = o.creature ? [...owner.roster, ...owner.reserve].find((x) => x.uid === o.creature) : undefined;
    const bits = [...Object.entries(o.items).filter(([, n]) => n).map(([id, n]) => `${itemInfo(id).icon} ${W.itemDisplayName(id)} ×${n}`), ...(o.coins ? [`💰 ${o.coins}`] : [])];
    return h('div', { class: 'offer-summary' }, h('b', null, `${label}: `), bits.join(', ') || (c ? '' : 'nothing'), c ? miniCard(c) : '');
  }

  /** Challenge another trainer on the same spot to a duel, with an optional wager they must accept. */
  challengeSheet(b: GameState) {
    const a = this.s;
    const max = I.maxWager(a, b);
    const wagers = [0, 5, 10, 20].filter((w) => w <= max);
    const close = openSheet(`⚔️ Challenge ${b.trainer.name}`, h('div', null,
      h('p', null, `Duel ${b.trainer.name} here at ${NODE_BY_ID[a.location].name}. You each command your own creatures: every round you pick your move, then ${b.trainer.name} picks theirs in secret. Every creature that fights earns trainer-battle XP. Costs 1 Initiative.`),
      h('p', { class: 'small muted' }, 'Choose a wager (the winner takes it). A team that’s fully knocked out is helped home to rest, without losing coins.'),
      h('div', { class: 'row gap-s wrap' }, wagers.map((w) => h('button', { class: 'btn primary', onclick: async () => {
        close();
        const ok = await this.askTrainer(b, `⚔️ ${a.trainer.name} challenges you!`, h('p', null, `A duel at ${NODE_BY_ID[a.location].name}${w ? ` for 💰 ${w}` : ', just for honour'}. You’ll pick your creatures’ moves each round.`), 'Accept the duel', 'Decline');
        await this.backTo(a);
        if (!ok) { toast(`${b.trainer.name} declined the challenge.`, 'info'); return; }
        const battle = I.startChallenge(a, b);
        if (!battle) { toast(I.challengeProblem(a, b) ?? 'The duel can’t start.', 'bad'); return; }
        await this.runBattle(battle, { kind: 'rival', intro: `${b.trainer.name} accepts your challenge!`, rivalLook: playerLook(b.trainer.name, b.trainer.color, b.trainer.look), duel: (bt) => this.duelPick(a, b, bt), duelSend: (bt) => this.duelSendPick(a, b, bt) });
        for (const t of I.settleChallenge(a, b, battle, w)) toast(t, 'info', 4000);
        save(a);
        this.world.setPawnAt(a.location); this.world.focus(a.location, true);
        this.showRivals(); this.renderHud();
      } }, w ? `Wager 💰 ${w}` : 'No wager')))));
  }

  /**
   * Two-player duels: the challenged trainer chooses their creature's action each round. Hotseat:
   * the device is passed to them (choices stay secret) and back. Online: they pick in their own
   * browser; if they don't answer within a minute, their creature acts on its own instincts.
   */
  async duelPick(a: GameState, b: GameState, battle: Battle): Promise<Action | undefined> {
    const opts = foeOptions(battle);
    const m = activeMatchOf();
    if (this.online && m) {
      return this.online.pick<Action>(m.players.indexOf(b), a.trainer.name, { kind: 'duel', round: battle.round + 1, ...opts });
    }
    const pickIt = await new Promise<Action>((resolve) => {
      const close = openSheet(`⚔️ ${b.trainer.name}’s move`, h('div', { class: 'handoff', style: `--tc:${b.trainer.color}` },
        h('p', { class: 'small muted' }, `Pass the device to ${b.trainer.name}. ${a.trainer.name}, no peeking: your move is locked in.`),
        this.duelPicker(opts, battle.round + 1, (act) => { close(); resolve(act); })), { noClose: true, wide: true });
    });
    await this.backTo(a);
    return pickIt;
  }

  /** Duels: after a KO, the challenged trainer picks their next creature (hotseat hand-off or their own browser). */
  async duelSendPick(a: GameState, b: GameState, battle: Battle): Promise<number | undefined> {
    const team = battle.sides[1].team;
    const options = foeReplacements(battle).map((i) => ({ i, c: JSON.parse(JSON.stringify(team[i])) as CreatureInst }));
    const vs = nameOf(activeOf(battle.sides[0]));
    const m = activeMatchOf();
    if (this.online && m) {
      return this.online.pick<number>(m.players.indexOf(b), a.trainer.name, { kind: 'duel-send', down: nameOf(activeOf(battle.sides[1])), vs, options });
    }
    const idx = await new Promise<number>((resolve) => {
      const close = openSheet(`⚔️ ${b.trainer.name}’s next creature`, h('div', { class: 'handoff', style: `--tc:${b.trainer.color}` },
        h('p', { class: 'small muted' }, `Pass the device to ${b.trainer.name}. ${a.trainer.name}, no peeking.`),
        this.duelSendPicker(nameOf(activeOf(battle.sides[1])), vs, options, (i) => { close(); resolve(i); })), { noClose: true, wide: true });
    });
    await this.backTo(a);
    return idx;
  }

  /** The defender's healthy creatures to send in after a KO. */
  duelSendPicker(down: string, vs: string, options: { i: number; c: CreatureInst }[], done: (i: number) => void): HTMLElement {
    return h('div', { class: 'duel-picker' },
      h('p', null, h('b', null, down), ` is knocked out! Who faces `, h('b', null, vs), ' next?'),
      h('div', { class: 'list' }, options.map((o) => miniCard(o.c, { onClick: () => done(o.i) }))));
  }

  /** The defender's choices in a duel round: their moves, Catch Breath, and swaps. */
  duelPicker(o: FoeOptions, round: number, done: (a: Action) => void): HTMLElement {
    return h('div', { class: 'duel-picker' },
      h('p', null, `Round ${round}: what will `, h('b', null, o.name), ' do?'),
      h('div', { class: 'move-grid' }, o.moves.map((id) => moveCard(MOVE_BY_ID[id], { compact: true, vs: o.vs, onClick: () => done({ kind: 'move', move: id }) }))),
      h('div', { class: 'row gap-s wrap center' },
        h('button', { class: 'btn ghost sm', onclick: () => done({ kind: 'move', move: CATCH_BREATH.id }) }, '😮‍💨 Catch Breath'),
        o.swaps.map((sw) => h('button', { class: 'btn ghost sm', onclick: () => done({ kind: 'swap', to: sw.i }) }, `🔁 Swap to ${sw.name}`))));
  }

  /** Hand the device to another trainer for a yes/no answer (a trade or a challenge). */
  askTrainer(b: GameState, title: string, content: HTMLElement, yes: string, no: string): Promise<boolean> {
    const m = activeMatchOf();
    if (this.online && m) {
      toast(`Waiting for ${b.trainer.name} to answer…`, 'info', 4000);
      return this.online.ask(m.players.indexOf(b), this.s.trainer.name, title, content.textContent ?? '', yes, no);
    }
    return new Promise((resolve) => {
      closeAllSheets();
      const close = openSheet(title, h('div', { class: 'handoff', style: `--tc:${b.trainer.color}` },
        h('p', { class: 'small muted' }, `Pass the device to ${b.trainer.name}.`),
        h('img', { src: trainerPortrait(playerLook(b.trainer.name, b.trainer.color, b.trainer.look)), alt: '' }),
        content,
        h('div', { class: 'row gap center' },
          h('button', { class: 'btn ghost', onclick: () => { close(); resolve(false); } }, no),
          h('button', { class: 'btn primary', onclick: () => { close(); resolve(true); } }, yes))), { noClose: true });
    });
  }

  /** "Pass the device back" after another trainer has answered. */
  backTo(a: GameState): Promise<void> {
    if (this.online) return Promise.resolve();
    return new Promise((resolve) => {
      const close = openSheet('Back to you', h('div', { class: 'handoff', style: `--tc:${a.trainer.color}` },
        h('p', null, `Pass the device back to ${a.trainer.name}.`),
        h('button', { class: 'btn primary big', onclick: () => { close(); resolve(); } }, `I’m ${a.trainer.name}`)), { noClose: true });
    });
  }

  /** Notes left by other trainers since your last turn (gifts, trades, duels). */
  async showInbox() {
    const s = this.s;
    if (!s.inbox?.length) return;
    const notes = s.inbox;
    s.inbox = [];
    save(s);
    await new Promise<void>((resolve) => {
      openSheet('📬 While you were away', h('ul', { class: 'tips' }, notes.map((n) => h('li', null, n))), { onClose: () => resolve() });
    });
  }

  /** Other hotseat trainers still on the board, drawn as minis on the map. */
  showRivals() {
    const m = activeMatchOf();
    this.world.setRivals(m ? m.players.filter((p) => p !== this.s && stillPlaying(p)).map((p) => ({ look: playerLook(p.trainer.name, p.trainer.color, p.trainer.look), nodeId: p.location, id: p.trainer.name })) : []);
  }

  /** Everyone has finished: final standings for the hotseat season. */
  matchSummary() {
    const m = activeMatchOf();
    if (!m) { this.title(); return; }
    this.engine.setView(this.world);
    this.world.setTitleMode(true);
    this.world.setRivals([]);
    const result = (p: GameState) => (p.phase === 'champion' ? 3 : p.endgame ? 2 + p.endgame.round / 10 : 0) + p.merits.length / 100;
    const ranked = [...m.players].sort((a, b) => result(b) - result(a));
    this.ui.replaceChildren(h('div', { class: 'title-screen' }, h('div', { class: 'title-card' },
      h('h1', null, '🏁 Season Over'),
      h('ol', { class: 'standings' }, ranked.map((p) => h('li', { style: `--tc:${p.trainer.color}` },
        h('b', null, p.trainer.name),
        h('span', null, p.phase === 'champion' ? ' 🏆 Champion of the Circuit' : p.endgame ? ` · out in the ${['Quarterfinal', 'Semifinal', 'Grand Final'][p.endgame.round]}` : ' · missed the Circuit'),
        h('small', { class: 'muted' }, ` · ${p.merits.length}/8 Merits · ${p.stats.battlesWon} wins · ${p.stats.recruited} recruited`)))),
      h('button', { class: 'btn primary big', onclick: () => { if (this.online) { clearOnlineMatch(); this.leaveOnline(); } else { clearMatch(); this.title(); } } }, 'New Journey'))));
  }

  // ════════════════════════════════════════════════════════════
  // HUD
  // ════════════════════════════════════════════════════════════
  /** Turn-order chip tapped: glide the map to that trainer and light them up in their colour. */
  spotlightTrainer(p: GameState) {
    if (this.engine.view !== this.world) return; // not while a battle is on screen
    const pos = p === this.s ? this.world.trainerPos() : this.world.trainerPos(p.trainer.name) ?? this.world.pawnPos(p.location);
    if (!pos) return;
    this.world.focusPos(pos);
    this.world.spotlight(pos, p.trainer.color);
    toast(`${p.trainer.name}${p === this.s ? ' (now playing)' : ''} · ${NODE_BY_ID[p.location]?.name ?? ''}`, 'info', 2000);
  }

  renderHud() {
    const s = this.s;
    const node = NODE_BY_ID[s.location];
    const w = W.weather(s);
    const se = season(s);
    this.world.setSeason(se);
    const tod = timeOfDay(s.turn);
    this.world.setWeather(w.id, se, tod === 'night', isCloudNode(s.location));
    // legendary nodes glow only while their Legendary is there (not beaten, not held by a trainer)
    this.world.setVisited(s.visited, MAP_NODES.filter((n) => n.kind === 'legendary' && !W.legendaryHere(s, n)).map((n) => n.id));
    const f = follower(s);
    this.world.setFollower(f ? f.species : null);
    this.world.setReach(this.reach());
    // the Rainbow Plains wear the color of the day's type; a wisp the trainer has looked for glows on the map
    this.world.setPrism(TYPE_COLOR[W.prismType(s)]);
    this.world.setWisp(hasItem(s, 'fog-lantern') && s.flags.wispSeen && s.flags.wispAt ? s.flags.wispAt : null);
    const marker = this.markerOwner();
    this.world.setWaypoint(marker?.waypoint ?? null, marker?.trainer.color);
    if (s.flags.wispNews && !this.watching) {
      s.flags.wispNews = false;
      save(s);
      toast(`💫 You caught a wisp in your Fog Lantern! It lights the misty way from Fogbank Path to Lantern Glade.`, 'good', 5000);
    }
    const daysLeft = 100 - s.turn;
    const effects = W.activeEffects(s);
    const top = h('div', { class: 'hud-top' },
      h('button', { class: 'hud-pill turn', onclick: () => this.calendar() },
        h('span', { class: 'season' }, SEASON_INFO[se].icon), h('b', null, `Turn ${s.turn}`), h('small', null, `/100 · ${SEASON_INFO[se].label}`)),
      h('button', { class: `hud-pill tod ${tod}`, title: tod === 'night' ? 'Night (even turns): nocturnal creatures are out, and night events happen.' : 'Day (odd turns): diurnal creatures are out, and day events happen.', onclick: () => this.calendar() },
        h('span', null, TIME_INFO[tod].icon), h('small', { class: 'hide-xs' }, TIME_INFO[tod].label)),
      h('button', { class: 'hud-pill', onclick: () => this.calendar() }, h('span', null, w.icon), h('small', { class: 'hide-xs' }, w.name)),
      // active effects (Nabe, lucky stars, incense, a wisp): one icon each, tap for details
      effects.length ? h('button', { class: 'hud-pill effects', title: effects.map((e) => `${e.icon} ${e.name}: ${e.text}`).join('\n'), 'aria-label': 'Active effects', onclick: () => this.effectsSheet() },
        effects.map((e) => h('span', null, e.icon)), h('small', { class: 'hide-xs' }, effects.length === 1 ? effects[0].name : 'Active')) : null,
      h('div', { class: 'hud-pill coins' }, '💰 ', h('b', null, s.coins)),
      h('button', { class: 'hud-pill merits', onclick: () => this.meritsSheet() }, Object.values(CITIES).map((c) =>
        h('span', { class: `merit ${s.merits.includes(c.nodeId) ? 'on' : ''}`, style: `--tc:${TYPE_COLOR[c.type]}` }, h('img', { src: typeIcon(c.type), alt: '' })))),
      h('button', { class: 'hud-pill icon hide-xs', onclick: () => this.trainerId(), 'aria-label': 'Trainer ID', title: 'Trainer ID: your home town, style and records' }, '📇'),
      h('button', { class: 'hud-pill icon menu', onclick: () => this.menu(), 'aria-label': 'Menu' }, '☰'));
    const loc = h('div', { class: 'loc-card', style: node.cityType ? `--tc:${TYPE_COLOR[node.cityType]}` : '' },
      h('div', { class: 'loc-title' },
        h('span', { class: 'loc-ico' }, node.kind === 'city' ? h('img', { src: typeIcon(node.cityType!), alt: '' }) : BIOME_INFO[node.biome].icon),
        h('div', null, h('b', null, node.name), h('small', null, this.nodeSubtitle(node.id)))),
      h('div', { class: 'init' }, h('small', null, 'Initiative'), h('div', { class: 'pips-init' }, Array.from({ length: 5 }, (_, i) => h('span', { class: i < s.initiative ? 'on' : '' })))),
      // my private next-stop flag: tap to find it on the map
      marker?.waypoint ? h('button', { class: 'next-stop-chip', style: `--tc:${marker.trainer.color}`, title: 'Show your next-stop flag on the map', onclick: () => this.findNextStop() },
        '📍 ', h('small', null, 'Your next stop: '), h('b', null, NODE_BY_ID[marker.waypoint]?.name ?? '')) : null,
      daysLeft <= 10 ? h('div', { class: 'warn' }, `⏳ ${daysLeft + 1} turns left — reach Circuit Stadium with 8 Merits!`) : null);
    const actions = h('div', { class: 'action-bar' }, this.actionButtons());
    const followerBtn = h('button', { class: 'follower-chip', onclick: () => this.pickFollower() },
      f ? h('img', { src: portrait(f.species), alt: '' }) : h('span', { class: 'none' }, '—'),
      h('div', null, h('small', null, 'Following'), h('b', null, f ? nameOf(f) : 'Nobody')),
      f ? h('span', { class: 'ability-tag' }, ABILITIES[abilityOf(f)].name) : null);
    const team = h('div', { class: 'team-strip' }, s.roster.map((c) => h('button', { class: `team-dot ${c.ko ? 'ko' : ''} ${c.points ? 'up' : ''} ${c.morale <= MORALE_LOW ? 'unhappy' : ''}`, title: c.morale <= MORALE_LOW ? `${nameOf(c)} is unhappy (Morale ${c.morale})${c.bond ? '' : ' and may leave'}` : undefined, style: `--tc:${TYPE_COLOR[speciesOf(c).types[0]]}`, onclick: () => this.showCreature(c) },
      h('img', { src: portrait(c.species), alt: nameOf(c) }),
      h('i', { style: `--p:${c.ko ? 0 : (c.vitality * maxHealth(c) + c.health) / (maxHealth(c) * (maxVitality(c) + 1))}` }))));
    const ev = E.eventView(s);
    const eventPill = ev ? h('button', { class: 'event-pill', onclick: () => this.eventFlow(), title: 'Answer this event before ending your turn' },
      h('span', { class: 'event-pill-ico' }, ev.icon), h('div', null, h('small', null, 'Event waiting'), h('b', null, ev.title))) : null;
    const m = activeMatchOf();
    const seats = m ? h('div', { class: 'seats', title: 'Turn order: tap a trainer to find them on the map' }, m.players.map((p) => h('button', {
      class: `seat ${p === s ? 'now' : ''} ${stillPlaying(p) ? '' : 'done'}`, style: `--tc:${p.trainer.color}`,
      title: `Show ${p.trainer.name} on the map (${NODE_BY_ID[p.location]?.name ?? ''})`, onclick: () => this.spotlightTrainer(p),
    }, p.trainer.name, p.phase === 'champion' ? ' 🏆' : ''))) : null;
    // on Cloud Island only: lap, satchel and portal at a glance, and the rules on tap
    const lapNow = W.cloudLapProgress(s);
    const lootN = Object.values(s.cloudLoot ?? {}).reduce((a, n) => a + n, 0);
    const cloudChip = isCloudNode(s.location) ? h('button', { class: 'cloud-chip', title: 'Cloud Island rules', onclick: () => this.cloudSheet() },
      h('b', null, '☁️ Cloud Island'),
      h('small', null, s.flags.salemWorthy ? 'Lap done' : `Lap ${lapNow.steps}/${lapNow.need}`, ' · ', lootN ? `👜 ${lootN} unsecured` : '👜 empty', ' · ', W.portalOpen(s) ? 'portal open' : 'portal shut'),
      h('small', { class: 'cloud-chip-link' }, 'Tap for the rules')) : '';
    // on the Forest Floor only: Dahlia's Trail at a glance, and the rules on tap
    const trailNow = W.trailProgress(s);
    const floorChip = s.location === FOREST_FLOOR ? h('button', { class: 'cloud-chip floor-chip', title: 'Forest Floor rules', onclick: () => this.floorSheet() },
      h('b', null, '🌲 Forest Floor'),
      h('small', null, s.merits.includes('gloom') ? 'Dahlia beaten' : trailNow.found ? '🏮 Dahlia’s arena found!' : `Dahlia’s Trail ${trailNow.steps}/${trailNow.need}`),
      h('small', { class: 'cloud-chip-link' }, 'Tap for the rules')) : '';
    this.ui.replaceChildren(h('div', { class: 'hud' }, top, h('div', { class: 'hud-left' }, seats ?? '', followerBtn, team, cloudChip, floorChip), h('div', { class: 'hud-bottom' }, eventPill, loc, actions)));
    if (this.selected) this.showNodePreview(this.selected);
  }

  nodeSubtitle(id: string) {
    const n = NODE_BY_ID[id];
    if (n.kind === 'city') return `${TYPE_LABEL[n.cityType!]} City · Arbiter ${CITIES[id].arbiter}${this.s.merits.includes(id) ? ' ✓' : ''}`;
    if (n.kind === 'town') return 'Town · Safe haven';
    if (n.kind === 'stadium') return 'Circuit Stadium · Be here at the end of Turn 100';
    if (n.kind === 'legendary') return 'Legendary grounds';
    if (n.kind === 'arena') { const c = CITIES[n.arenaOf!]; return `${TYPE_LABEL[c.type]} Arena · Arbiter ${c.arbiter}${this.s.merits.includes(c.nodeId) ? ' ✓' : ''}`; }
    if (n.biome === 'prism') return `Rainbow Plains · ${TYPE_LABEL[W.prismType(this.s)]} creatures today · Wild Lv ~${W.baseWildLevel(this.s, n)} · ★ +1 rarity`;
    return `${BIOME_INFO[n.biome].label} · Wild Lv ~${W.baseWildLevel(this.s, n)}${n.rarity ? ' · ★ rare' : ''}`;
  }

  actionButtons(): HTMLElement[] {
    const s = this.s;
    if (this.watching) return this.watchButtons();
    const node = NODE_BY_ID[s.location];
    const out: HTMLElement[] = [];
    const btn = (icon: string, label: string, fn: () => void, opts: { cost?: number; disabled?: boolean; cls?: string } = {}) =>
      h('button', { class: `act ${opts.cls ?? ''}`, disabled: opts.disabled, onclick: () => { if (!this.busy) fn(); } },
        h('span', { class: 'act-ico' }, icon), h('span', { class: 'act-lbl' }, label), opts.cost !== undefined ? h('span', { class: 'cost' }, opts.cost === 0 ? '0⚡' : `${opts.cost}⚡`) : null);
    if (s.location === FOREST_FLOOR && W.trailProgress(s).found && !s.merits.includes('gloom')) out.push(btn('🏟️', 'Dahlia', () => this.arbiter(), { cls: 'hl' }));
    if (node.kind === 'wild') {
      const c = W.reexploreCost(s);
      out.push(btn('🔍', 'Explore', () => this.doExplore(), { cost: c, disabled: s.initiative < c }));
      out.push(btn('⛺', 'Camp', () => this.camp(), { disabled: s.initiative < 1 || !W.campNeeds(s).length }));
    }
    if (node.kind === 'city') out.push(btn('🏙️', 'City', () => this.citySheet(), { cls: 'hl' }));
    if (node.kind === 'arena') out.push(btn('🏟️', 'Arena', () => this.arbiter(), { cls: 'hl' }));
    if (node.kind === 'town') out.push(btn('🏘️', 'Town', () => this.townSheet(), { cls: 'hl' }));
    if (node.kind === 'stadium') out.push(btn('🏟️', 'Stadium', () => this.stadiumSheet(), { cls: 'hl' }));
    // getting around: the Bike (once a turn) and a Taxi Ticket (in a city)
    if (hasItem(s, 'bike') && !W.travelBlock(s)) out.push(btn('🚲', s.flags.bikeRoll ? `Ride ${s.flags.bikeRoll}` : 'Bike', () => void this.bikeFlow(), { cost: 0, disabled: !!W.bikeBlock(s) }));
    if (W.taxiTargets(s).length) out.push(btn('🚕', 'Taxi', () => this.taxiFlow()));
    if (activeMatchOf()?.players.includes(s)) out.push(btn('👥', 'Trainers', () => this.trainersSheet()));
    out.push(btn('🐾', 'Team', () => this.teamSheet()));
    out.push(btn('🎒', 'Bag', () => this.bagSheet()));
    out.push(btn('⏭️', 'End Turn', () => this.endTurn(), { cls: s.initiative === 0 ? 'primary pulse' : 'primary' }));
    return out;
  }

  /** Online, while someone else plays: who's playing, your own team, and the host's controls. */
  watchButtons(): HTMLElement[] {
    const net = this.online!;
    const m = activeMatchOf();
    const cur = m?.players[m.current];
    const mySeat = m?.owners?.indexOf(net.id) ?? -1;
    const me = mySeat >= 0 ? m!.players[mySeat] : null;
    const out: HTMLElement[] = [h('div', { class: 'watch-label', style: `--tc:${cur?.trainer.color ?? '#999'}` }, h('span', null, '👀 ', h('b', null, cur?.trainer.name ?? '…'), '’s turn'))];
    if (me) out.push(h('button', { class: 'act', title: 'Unlock chart nodes and edit playbooks while you wait', onclick: () => openSheet('Your team', h('div', null,
        h('p', { class: 'small muted' }, 'While you wait you can unlock chart nodes and edit playbooks. Changes go to the shared game right away.'),
        h('div', { class: 'list' }, [...me.roster, ...me.reserve].map((c) => miniCard(c, { onClick: () => this.showMyCreature(c) }))))) },
      h('span', { class: 'act-ico' }, '🐾'), h('span', { class: 'act-lbl' }, 'My team')));
    if (me) out.push(h('button', { class: 'act', title: 'Look through your bag (items can be used on your turn)', onclick: () => this.bagSheet(me, true) },
      h('span', { class: 'act-ico' }, '🎒'), h('span', { class: 'act-lbl' }, 'My bag')));
    if (net.isHost && cur) {
      out.push(h('button', { class: 'act', title: `End ${cur.trainer.name}’s turn now`, onclick: async () => { if (await confirmSheet('Skip this turn?', `${cur.trainer.name}’s turn ends now, as if they pressed End Turn.`, 'Skip turn')) net.send({ type: 'host-skip' }); } },
        h('span', { class: 'act-ico' }, '⏭️'), h('span', { class: 'act-lbl' }, 'Skip turn')));
      out.push(h('button', { class: 'act', title: `Take over ${cur.trainer.name}’s turn on this device`, onclick: async () => { if (await confirmSheet(`Play for ${cur.trainer.name}?`, `You’ll play the rest of ${cur.trainer.name}’s turn from this device (their own screen switches to watching).`, 'Play for them')) net.send({ type: 'host-play' }); } },
        h('span', { class: 'act-ico' }, '🎮'), h('span', { class: 'act-lbl' }, `Play for ${cur.trainer.name}`)));
    }
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

  /** Double-tap shortcuts: travel straight to an adjacent node (blocked moves leave the preview up to explain
   *  why), or open the City / Town menu of the place you're standing in. Arenas and the Stadium are left to
   *  their buttons, since those start battles. */
  onNodeDoubleTap(id: string) {
    if (!settings().doubleTapTravel || this.busy || this.watching || !this.s || this.s.phase !== 'map') return;
    if (id === this.s.location) {
      const kind = NODE_BY_ID[id].kind;
      if (kind !== 'city' && kind !== 'town') return;
      $('.node-preview')?.remove();
      this.selected = null;
      if (kind === 'city') this.citySheet(); else this.townSheet();
      return;
    }
    if (!neighbors(this.s.location).some((x) => x.node.id === id)) return;
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
    } else if (n.kind === 'town') { const keys = W.townKeyItems(this.s, id); extra.push(h('p', { class: 'small' }, TOWNS[id].blurb, keys.length ? h('b', null, ` Sells: ${keys.map((k) => itemInfo(k).name).join(', ')}.`) : null)); }
    else if (n.kind === 'wild') {
      extra.push(h('p', { class: 'small row gap-s' }, 'Wild types:', ...BIOME_TYPES[n.biome].map((t: ElementType) => typeIconImg(t, 18))));
    } else if (n.kind === 'arena') {
      const c = CITIES[n.arenaOf!];
      extra.push(h('p', { class: 'small' }, h('b', null, c.arena.name), ` · Arbiter ${c.arbiter}. `, c.arena.text));
    } else if (n.kind === 'legendary') {
      const sp = SPECIES_BY_ID[n.legendary!];
      const held = [...s.roster, ...s.reserve].some((c) => c.species === n.legendary);
      extra.push(h('p', { class: 'small' }, held ? `${sp.name} travels with you. Each Legendary exists once per game.` : s.flags.beaten.includes(id) ? 'The legend has moved on.' : `Something powerful stirs here… (${sp.types.map((t) => TYPE_LABEL[t]).join('/')})`));
    }
    const card0 = () => card;
    const card = h('div', { class: 'node-preview', style: n.cityType ? `--tc:${TYPE_COLOR[n.cityType]}` : '' },
      h('button', { class: 'icon-btn close', onclick: () => { this.selected = null; card.remove(); } }, '✕'),
      h('div', { class: 'np-head' }, h('span', { class: 'loc-ico' }, n.kind === 'city' ? h('img', { src: typeIcon(n.cityType!) }) : BIOME_INFO[n.biome].icon),
        h('div', null, h('b', null, n.name), h('small', null, this.nodeSubtitle(id)))),
      ...extra,
      isHere ? h('div', { class: 'small muted' }, 'You are here.') :
        this.watching ? '' : adj ? (chk.ok ? h('button', { class: 'btn primary block', onclick: () => this.travel(id) }, `Travel here · ${chk.cost}⚡`) : h('div', { class: 'lock' }, '🔒 ', chk.reason)) :
          h('div', { class: 'small muted' }, 'Not adjacent — travel node by node.'),
      this.markerButton(id, card0));
    this.ui.append(card);
  }

  /** Node preview: mark this node as your next stop, or remove the marker (not for the node you're on). */
  markerButton(id: string, card: () => HTMLElement): HTMLElement | string {
    const me = this.markerOwner();
    if (!me || id === me.location) return '';
    const marked = me.waypoint === id;
    return h('button', { class: 'btn ghost block', title: 'A reminder of where you mean to go next. Only you can see it, and it clears when you get there.',
      onclick: () => { this.markNextStop(marked ? null : id); card().remove(); this.showNodePreview(id); } },
    marked ? '📍 Remove next-stop marker' : '📍 Mark as next stop');
  }

  async travel(id: string) {
    if (this.busy) return;
    const s = this.s;
    const from = s.location;
    if (from !== FOREST_FLOOR && id === FOREST_FLOOR) {
      const chk = W.canMoveTo(s, id);
      if (chk.ok && !(await this.floorPrompt(chk.cost))) return;
      if (this.busy) return;
    }
    if (!isCloudNode(from) && isCloudNode(id)) {
      const chk = W.canMoveTo(s, id);
      if (chk.ok && !(await this.cloudPrompt(chk.cost))) return;
      if (this.busy) return;
    }
    const worthy = !!s.flags.salemWorthy;
    const marked = s.waypoint === id && this.markerOwner() === s;
    const held = Object.entries(s.cloudLoot ?? {}).filter(([, n]) => n > 0);
    const out = W.moveTo(s, id);
    if (!out) return;
    if (marked) toast(`📍 You reached your next stop, ${NODE_BY_ID[id].name}. Marker cleared.`, 'good', 2500);
    if (held.length && !s.cloudLoot) toast(`☁️ Escaped Cloud Island! Secured: ${held.map(([i, n]) => `${itemInfo(i).icon} ${W.itemDisplayName(i)} ×${n}`).join(', ')}.`, 'good', 5000);
    if (!worthy && s.flags.salemWorthy) toast('☁️ A full lap of Cloud Island! Salem will accept your challenge at Aurora Peak.', 'good', 5000);
    else if (!s.flags.salemWorthy && W.cloudLapProgress(s).steps > 0) toast(`☁️ Cloud Island lap: ${W.cloudLapProgress(s).steps}/${W.CLOUD_LAP}${s.flags.cloudLap === 1 && W.cloudLapProgress(s).onIsland ? ' (keep going the same way round)' : ''}`, 'info', 2200);
    else if (from === 'aurora' && id === CLOUD_RING[0]) toast('☁️ Through the portal: walk a full lap of the ring, the same way round, without leaving the island.', 'info', 4500);
    this.busy = true;
    this.selected = null;
    $('.node-preview')?.remove();
    this.world.setReach({});
    sfx.hop();
    this.feed({ kind: 'hop', from, to: id });
    await this.world.hop(from, id);
    this.busy = false;
    this.syncWatchers();
    await this.handleOutcome(out);
    this.syncWatchers();
  }

  /** Online: send the latest match now (moves and explores don't always save, but watchers should see them). */
  syncWatchers() { const m = activeMatchOf(); if (m && this.feeding()) this.pushState(m); }

  async doExplore() {
    const out = W.reexplore(this.s);
    if (!out) { toast('Not enough Initiative.', 'bad'); return; }
    this.syncWatchers();
    await this.handleOutcome(out);
    this.syncWatchers();
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
        if (out.roll) await rollDice('Explore', [{ sides: out.die ?? 6, value: out.roll, tone: out.dark ? 'bad' : 'info', label: out.hushed ? '💨 3 Hushed: Nothing' : '1–2 Nothing' }], out.dark ? 'Nothing but the dark. Your team shivers. (−1 Morale)' : out.hushed ? 'Something stirs, then slinks off from the Hush Smoke.' : 'Nothing but wind and birdsong.', 600, { read: true });
        if (out.refund) { toast(`🌲 Ranger’s instinct: +1 Initiative back (${W.rangerRefundsLeft(s)} more this turn).`, 'good', 2600); this.renderHud(); }
        if (out.dark) this.renderHud();
      } else if (out.t === 'trail') {
        await rollDice('Explore', [{ sides: out.die, value: out.roll, tone: 'good', label: '7–8 Dahlia’s Trail' }], out.found ? 'The trail ends at a ring of lanterns: Dahlia’s arena!' : `A sign of Dahlia’s Trail: ${out.steps}/${out.need}.`, 700, { read: true });
        sfx.good();
        if (out.found) { toast('🏮 You found Dahlia’s arena! Challenge her from here (🏟️ Dahlia), before you leave the Forest Floor.', 'good', 5000); this.renderHud(); }
        else toast(`🌲 Dahlia’s Trail: ${out.steps}/${out.need}. Keep exploring.`, 'info', 2600);
      } else if (out.t === 'item') {
        // two beats: the explore roll reveals that something's here, then the find roll reveals what
        await rollDice('Explore', [{ sides: out.die ?? 6, value: out.roll, tone: 'good', label: out.hushed ? '💨 4 Hushed: Item' : '5–6 Item' }], s.location === FOREST_FLOOR ? 'Something exotic glints in the dark!' : out.hushed ? 'With nothing around to bother you, you poke about and find something!' : 'You discovered something!', 700, { read: true });
        const names = out.items.map((i) => `${itemInfo(i.id).icon} ${W.itemDisplayName(i.id)}${i.n > 1 ? ' ×' + i.n : ''}`);
        if (out.coins) names.push(`💰 ${out.coins} coins`);
        await rollDice('Find', [{ sides: 6, value: out.itemRoll, tone: 'good', label: 'Find d6' }], `Found ${names.join(', ')}!`, 900, { read: true });
        sfx.good();
        toast(`Found ${names.join(', ')}${isCloudNode(s.location) ? ' (held in your Cloud satchel until you escape)' : ''}`, 'good', 3200);
        log(s, `Found ${names.join(', ')} at ${NODE_BY_ID[s.location].name}.`);
      } else if (out.t === 'itemChoice') {
        // Keen Nose: three finds to choose from
        await rollDice('Explore', [{ sides: out.die ?? 6, value: out.roll, tone: 'good', label: out.hushed ? '💨 4 Hushed: Item' : '5–6 Item' }], 'Your follower’s Keen Nose picks up three scents…', 500, { read: true });
        const label = (f: W.Find) => [...f.items.map((i) => `${itemInfo(i.id).icon} ${W.itemDisplayName(i.id)}${i.n > 1 ? ' ×' + i.n : ''}`), ...(f.coins ? [`💰 ${f.coins} coins`] : [])].join(' + ');
        const pickIt = await new Promise<W.Find>((resolve) => {
          const close = openSheet('👃 Keen Nose · pick one find', h('div', null,
            h('p', { class: 'small' }, `${follower(s) ? nameOf(follower(s)!) : 'Your follower'} sniffs out three things nearby. You can only carry one away.`),
            h('div', { class: 'list' }, out.options.map((f) => h('button', { class: 'choice', onclick: () => { close(); resolve(f); } },
              h('b', null, label(f)),
              h('small', { class: 'muted' }, f.items.map((i) => itemInfo(i.id).text).join(' ') || 'A little extra coin.'))))), { noClose: true });
        });
        const got = W.claimFind(s, pickIt);
        sfx.good();
        toast(`Found ${label(got)}${isCloudNode(s.location) ? ' (held in your Cloud satchel until you escape)' : ''}`, 'good', 3200);
        log(s, `Found ${label(got)} at ${NODE_BY_ID[s.location].name}.`);
      } else if (out.t === 'encounter') {
        await rollDice('Explore', [{ sides: out.die ?? 6, value: out.roll, tone: 'bad', label: '3–4 Encounter' }], s.location === FOREST_FLOOR ? 'Something moves in the dark…' : 'Something rustles nearby…', 700, { read: true });
        await rollDice('Rarity Stars', out.stars.map((x) => ({ sides: 6, value: x.face, face: STAR_FACE[x.star], tone: x.star === 'full' ? 'good' : 'info', label: x.star })), `${out.rarity[0].toUpperCase() + out.rarity.slice(1)} creature! ${NODE_BY_ID[s.location].biome === 'prism' ? '(+1 rarity: the Rainbow Plains)' : NODE_BY_ID[s.location].rarity ? '(+★ rare area)' : ''}`, 900, { read: true });
        this.busy = false;
        await this.runBattle(out.battle, { kind: 'wild', intro: `A wild ${nameOf(out.battle.sides[1].team[0])} appeared!` });
        return;
      } else if (out.t === 'trainer') {
        await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'bad', label: '3–4 Encounter' }], `${out.name} challenges you!`, 700, { read: true });
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
  /** Ask which creature leads a battle (no healthy Following creature). Resolves once one is picked. */
  pickLead(b: Battle, intro: string): Promise<void> {
    const foe = activeOf(b.sides[1]);
    return new Promise((resolve) => {
      const close = openSheet('Who leads?', h('div', null,
        h('p', null, intro, ' ', h('b', null, `${nameOf(foe)}`), ` (Lv ${foe.level}, `, speciesOf(foe).types.map((t) => typeChip(t, true)), ').'),
        h('p', { class: 'small muted' }, 'Nobody is Following you, so choose who to send out first. Set a Following creature in Team to lead automatically.'),
        h('div', { class: 'list' }, b.sides[0].team.map((c, i) => c.ko ? null : miniCard(c, { onClick: () => { chooseLead(b, i); close(); resolve(); } })))),
        { noClose: true });
    });
  }

  async runBattle(b: Battle, ctx: { kind: 'wild' | 'trainer' | 'arbiter' | 'legendary' | 'endgame' | 'rival'; intro: string; city?: string; nodeId?: string; gauntlet?: boolean; rivalLook?: TrainerLook; watch?: AsyncQueue<FeedItem>; duel?: (b: Battle) => Promise<Action | undefined>; duelSend?: (b: Battle) => Promise<number | undefined> }): Promise<Battle['over']> {
    const s = this.s;
    closeAllSheets();
    $('.node-preview')?.remove();
    this.busy = true;
    const bv = this.battleView;
    const arenaType = ctx.city ? CITIES[ctx.city].type : undefined;
    // Cliff's crumbling plateau: a countdown chip, updated by 'ring' events
    const ringTimer = b.arena?.trick === 'crumble' ? h('span', { class: 'chip ring-timer', title: 'Beat Cliff before the plateau is gone, or you’re rung out and lose.' }) : null;
    const showRing = (left: number, total: number) => {
      if (!ringTimer) return;
      ringTimer.textContent = left > 0 ? `⏳ Plateau: ${left} round${left === 1 ? '' : 's'} left` : '⏳ Rung out!';
      ringTimer.classList.toggle('urgent', left <= 2);
      ringTimer.title = `${left} of ${total} rounds left before the plateau is gone`;
    };
    if (b.arena?.trick === 'crumble') showRing(ringLeft(b) ?? 0, ringRounds(b.arena.tier));
    bv.setup(b.biome as never, arenaType, W.weather(s).id === 'aurora' || ctx.city === 'aurora' || timeOfDay(s.turn) === 'night');
    // trainer minis: only when the opponent is a trainer of some kind
    const foeSide = b.sides[1];
    const foeLook: TrainerLook | null =
      foeSide.kind === 'arbiter' ? arbiterLook(foeSide.name, arenaType ?? CITIES[b.arena?.city ?? '']?.type ?? 'fire')
        : foeSide.kind === 'champion' ? championLook(foeSide.name)
          : ctx.rivalLook ? ctx.rivalLook : foeSide.kind === 'trainer' ? roamingLook(foeSide.name) : null;
    bv.setTrainers(foeLook ? playerLook(s.trainer.name, s.trainer.color, s.trainer.look) : null, foeLook);
    this.engine.setView(bv);
    // Nobody (healthy) is Following: the trainer picks who leads before the fight starts
    if (!ctx.watch && W.needsLeadChoice(s) && b.round === 0) await this.pickLead(b, ctx.intro);
    // online: everyone else watches this battle live
    this.feed({ kind: 'battle-start', battle: JSON.parse(JSON.stringify(b)), ctx: { kind: ctx.kind, intro: ctx.intro, city: ctx.city, rivalLook: ctx.rivalLook } as never });
    const disp: [Snap, Snap] = [snapOf(activeOf(b.sides[0])), snapOf(activeOf(b.sides[1]))];
    const panel = h('div', { class: 'battle-ui' });
    const logLine = h('div', { class: 'battle-log' }, ctx.intro);
    const plates = [h('div', { class: 'plate me' }), h('div', { class: 'plate foe' })];
    const controls = h('div', { class: 'battle-controls' });
    const header = h('div', { class: 'battle-head' },
      h('span', { class: 'chip' }, WEATHER[s.weather].icon, ' ', WEATHER[s.weather].name),
      b.arena ? h('span', { class: 'chip arena', style: `--tc:${TYPE_COLOR[arenaType!]}` }, '🏟 ', CITIES[ctx.city!].arena.name, ` · Tier ${b.arena.tier}`) : null,
      ringTimer,
      h('span', { class: 'chip' }, `Round `, h('b', { class: 'rnd' }, '1')),
      h('button', { class: 'chip log-btn', title: 'Battle Log: every move, roll and hit so far (L)', onclick: () => this.battleLogSheet() }, '📜 Log'),
      b.sides[0].buff && Object.keys(b.sides[0].buff).length ? h('span', { class: 'chip good', title: `Chanko Nabe: ${W.buffText(b.sides[0].buff)} for your team this battle` }, '🍲 ', W.buffText(b.sides[0].buff)) : null);
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
      const guard = statusGuard(b, c); // an Instinct that keeps statuses off: say so up front
      plates[side].replaceChildren(
        h('div', { class: 'pl-top' },
          h('b', null, nameOf(c)), h('span', { class: 'lv' }, `Lv ${c.level}`),
          h('span', { class: 'pl-types' }, sp.types.map((t) => typeIconImg(t, 16))),
          recruited ? h('span', { class: 'caught-mark', title: 'Already recruited', 'aria-label': 'Already recruited' }, '🗿') : null,
          sn.zero ? h('span', { class: 'zero-tag', title: `Zeroing In: +${sn.zero} to its next accuracy roll, from missing. Misses stack it up to +${ZERO_IN_MAX}; leaving the field loses it.` }, h('i', { class: 'zi' }, '⌖'), ` +${sn.zero}`) : null,
          guard && !sn.ko ? h('span', { class: 'guard-tag', title: `${guard.text} Its Instinct protects it from status effects.`, 'aria-label': `Status protection: ${guard.text}` }, '🛡', guard.label === '🛡' ? '' : ` ${guard.label}`) : null,
          sn.status ? h('button', { class: 'status-tag', title: `${STATUS_INFO[sn.status].text} (tap for all statuses)`, onclick: () => openSheet('Status Effects', statusGuide()) }, STATUS_INFO[sn.status].icon, ' ', STATUS_INFO[sn.status].name) : null),
        // Vitality first: hearts are what actually decide the fight
        h('div', { class: 'pl-vit' },
          h('span', { class: 'hearts', title: `Vitality ${sn.vitality}/${mv}` }, Array.from({ length: mv }, (_, i) => h('span', { class: `heart ${i < sn.vitality ? 'on' : ''}` }, '♥'))),
          h('span', { class: 'team-balls' }, sd.team.map((x) => h('i', { class: x.ko ? 'ko' : '' })))),
        // Health bar and the Fatigue warning diamond on both sides; your side also gets a thin Stamina bar under Health
        h('div', { class: `pl-bars ${side === 0 ? 'mine' : 'foe'}` },
          h('div', { class: 'bar hp-bar', title: `Health ${sn.health}/${mh}${sn.over ? ` · Overheal +${sn.over}: soaks up damage before Health` : ''}` },
            h('i', { style: `width:${pct}%`, class: pct < 34 ? 'low' : pct < 67 ? 'mid' : '' }),
            sn.over && !sn.ko ? h('b', { class: 'over', style: `width:${Math.min(100, (sn.over / mh) * 100)}%` }) : null),
          h('span', { class: 'num' }, sn.ko ? 'KO' : `${sn.health}/${mh}`, sn.over && !sn.ko ? h('span', { class: 'over-num', title: 'Overheal: extra Health beyond full that soaks up damage first' }, ` +${sn.over}`) : null),
          fatigueBadge(sn.fatigue),
          ...(side === 0 ? [
            h('div', { class: 'bar sta-bar', title: `Stamina ${sn.stamina}/${maxStamina(c)}: each move's 💨 Effort comes out of it. Running out adds Fatigue.` },
              h('i', { style: `width:${Math.min(100, (sn.stamina / maxStamina(c)) * 100)}%` })),
            h('span', { class: 'num sta-num', title: 'Stamina' }, `💨 ${sn.stamina}/${maxStamina(c)}`)] : [])));
    };
    const say = (t: string, tone?: string) => { logLine.textContent = t; logLine.className = `battle-log ${tone ?? ''}`; };
    // Normal battles slow down and explain every roll; Fast battles (Settings) keep the quick pace
    const slow = () => !settings().fastBattle;
    const pace = (ms: number) => (slow() ? Math.round(ms * 1.6) : ms);
    const whoOn = (side: 0 | 1) => nameOf(b.sides[side].team.find((x) => x.uid === disp[side].uid) ?? activeOf(b.sides[side]));

    // ── Battle Log: every line of the fight, with the full rolls and maths, to look back on ──
    const blog: BattleLogEntry[] = [];
    this.lastBattleLog = { title: ctx.intro, entries: blog };
    const note = (text: string, opts: { tone?: string; detail?: string; side?: 0 | 1 } = {}) => blog.push({ round: b.round, text, ...opts });
    note(ctx.intro, { tone: 'info' });
    // a Chanko Nabe kicks in: say so, and keep a chip in the header for the whole battle
    const nabe = !ctx.watch && s.hotpot && b.sides[0].buff && Object.keys(b.sides[0].buff).length ? `${CITIES[s.hotpot.city]?.hotpot.name ?? 'Chanko Nabe'}: ${W.buffText(b.sides[0].buff)} this battle` : null;
    if (nabe) { note(`🍲 ${nabe}.`, { tone: 'good' }); toast(`🍲 ${nabe}!`, 'good', 3000); }
    const KIND_TEXT: Record<string, string> = { physical: 'Physical · Power vs Armor', elemental: 'Elemental · Focus vs Ward', support: 'Support', swap: 'Swap Move' };
    const logEvent = (e: BEvent) => {
      switch (e.t) {
        case 'say': note(e.text, { tone: e.tone }); break;
        case 'arena': note(e.text, { tone: 'bad' }); break;
        case 'ring': note(`Plateau: ${e.left} of ${e.total} rounds left.`, { tone: e.left <= 2 ? 'bad' : undefined }); break;
        case 'use': note(e.kind === 'swap' ? `${whoOn(e.side)} swaps in with ${e.name}!` : `${whoOn(e.side)} used ${e.name}.`, { side: e.side, detail: [e.type ? TYPE_LABEL[e.type] : null, KIND_TEXT[e.kind]].filter(Boolean).join(' · ') }); break;
        case 'roll': {
          const rolled = e.natural ?? e.value;
          if (e.die === 20) { note(`${e.label}: rolled ${rolled}. ${e.hit ? 'It stays to fight.' : 'It loses interest…'}`, { side: e.side }); break; }
          const mods = e.mods?.length ? ` ${partsText(e.mods)} = ${e.value}` : '';
          const verdict = e.crit ? 'Critical hit! (double damage)' : e.hit ? 'Hit!' : 'Miss.';
          note(`${whoOn(e.side)} · ${e.label}: ${verdict}`, { side: e.side, tone: e.hit ? undefined : 'bad', detail: `d${e.die} rolled ${rolled}${mods}, needed ${e.need}+${e.label === 'Accuracy' ? ` (Evasion ${e.need})` : ''}.` });
          break;
        }
        case 'clash':
          note(`Clash! Speeds tied: you rolled ${e.rolls[0]} (d${e.dice[0]}), the foe rolled ${e.rolls[1]} (d${e.dice[1]}).`, { detail: e.loser === null ? 'Even clash: no damage, and a coin flip decided turn order.' : `${e.loser === 0 ? 'You' : 'The foe'} rolled lower: ${e.dmg} damage (the difference) and acted second.` });
          if (e.coin && e.first !== undefined) note(`💰 Coin flip: ${whoOn(e.first)} won and acts first.`, { side: e.first, tone: e.first === 0 ? 'good' : 'bad' });
          break;
        case 'tired': note(`${whoOn(e.side)} · Fatigue check: ${e.fail ? 'catching breath!' : 'kept going.'}`, { side: e.side, tone: e.fail ? 'bad' : undefined, detail: `d10 rolled ${e.value} vs Fatigue ${e.fatigue} (${e.fail ? 'at or under' : 'over'} it).` }); break;
        case 'damage': {
          const target = b.sides[e.side].team.find((x) => x.uid === e.snap.uid);
          const eff = e.eff >= 2 ? ' Super effective!' : e.eff > 0 && e.eff < 1 ? ' Not very effective.' : '';
          const k = e.calc;
          const chainText = (i: number) => { const ch = k?.cascade?.[i]; return ch ? ` (cascade d${ch.die}: ${ch.rolls.join(' + ')})` : ''; };
          const math = k ? `${k.dice.length ? `${k.dice.map((d, i) => `d${d} rolled ${k.rolls[i]}${chainText(i)}`).join(' + ')} ` : ''}${partsText(k.parts)}`.trim().replace(/^\+ /, '') + ` = ${k.raw}${k.mult !== 1 ? ` × ${k.mult} type` : ''}${k.crit ? ' × 2 crit' : ''} → ${k.total} damage.` : '';
          const left = target ? ` ${nameOf(target)}: Health ${e.snap.ko ? 'KO' : `${e.snap.health}/${maxHealth(target)}`}, Vitality ${e.snap.vitality}/${maxVitality(target)}.` : '';
          note(`${whoOn(e.side)} took ${e.amount} damage${e.crit ? ' (critical)' : ''}.${eff}`, { side: e.side, tone: e.side === 0 ? 'bad' : 'good', detail: `${math}${left}`.trim() || undefined });
          break;
        }
        case 'heal': if (e.amount > 0) note(`${whoOn(e.side)} recovered ${e.amount} Health.`, { side: e.side, tone: 'good' }); break;
        case 'status': note(`${whoOn(e.side)} is afflicted with ${STATUS_INFO[e.status].icon} ${STATUS_INFO[e.status].name}.`, { side: e.side, tone: e.side === 0 ? 'bad' : 'good', detail: STATUS_INFO[e.status].text }); break;
        case 'buff': note(`${whoOn(e.side)}: ${e.text}.`, { side: e.side }); break;
        case 'zero': if (e.bonus > 0) note(`⌖ ${whoOn(e.side)} is zeroing in: +${e.bonus} to its next accuracy roll.`, { side: e.side, detail: `A miss adds Zeroing In (up to +${ZERO_IN_MAX} over several misses). The next accuracy roll uses it up, and it's lost if the creature leaves the field.` }); break;
        case 'send': { const c = b.sides[e.side].team.find((x) => x.uid === e.snap.uid); if (c) note(`${e.side === 0 ? 'You send' : `${b.sides[1].name} sends`} in ${nameOf(c)} (Lv ${c.level}).`, { side: e.side }); break; }
        case 'xp': { const c = b.sides[0].team.find((x) => x.uid === e.uid); if (c) note(e.reason === 'ko' ? `${nameOf(c)} gained ${e.amount} XP for knocking out ${e.foe ?? 'its foe'}.` : `${nameOf(c)} gained ${e.amount} XP for battling${e.bonus ? ` (incl. +${e.bonus} trainer battle bonus)` : ''}.`, { tone: 'good', detail: e.levels ? `Reached Lv ${c.level}!` : undefined }); break; }
        case 'end': note(e.result === 'win' ? 'Victory!' : e.result === 'lose' ? 'Your team is out of creatures.' : e.result === 'escaped' ? 'Got away safely.' : 'The foe fled.', { tone: e.result === 'win' || e.result === 'escaped' ? 'good' : 'bad' }); break;
        default: break; // 'ko' is already announced by a 'say'
      }
    };

    bv.trainerHop(0); bv.trainerHop(1);
    await Promise.all([bv.setCreature(0, activeOf(b.sides[0]).species), bv.setCreature(1, activeOf(b.sides[1]).species)]);
    renderPlate(0); renderPlate(1);

    let watchedEnd: Battle['over'] = null;
    const play = async (events: BEvent[]) => {
      if (!ctx.watch) this.feed({ kind: 'battle-events', events });
      for (const e of events) {
        if (e.t === 'end') watchedEnd = e.result;
        try { logEvent(e); } catch (err) { console.error('battle log error', err); }
        try { await playOne(e); } catch (err) { console.error('battle fx error', err); }
      }
      renderPlate(0); renderPlate(1);
    };
    const playOne = async (e: BEvent) => {
      {
        switch (e.t) {
          case 'say': say(e.text, e.tone); await wait(pace(650)); break;
          case 'arena': say(e.text, 'bad'); await bv.arenaFlash(arenaType ? TYPE_COLOR[arenaType] : '#ffffff'); break;
          case 'ring': showRing(e.left, e.total); await bv.shrinkRing(1 - e.left / e.total); break;
          case 'use': {
            const who = nameOf(b.sides[e.side].team.find((x) => x.uid === disp[e.side].uid)!);
            say(e.kind === 'swap' ? `${who} swaps in with ${e.name}!` : `${who} used ${e.name}!`);
            if (e.kind === 'elemental' || e.kind === 'swap') sfx.zap(); else if (e.kind === 'support') sfx.heal();
            if (e.kind === 'physical') await bv.lunge(e.side);
            else if (e.kind === 'elemental' && e.type) await bv.projectile(e.side, e.type);
            else if (e.kind === 'swap') { const hit = SWAP_MOVE_BY_ID[e.move]?.hit; await (!hit ? bv.support(e.side, e.type) : hit.kind === 'elemental' && e.type ? bv.projectile(e.side, e.type) : bv.lunge(e.side)); }
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
          case 'clash': {
            await rollDice('Clash! Speeds tied', [{ sides: e.dice[0], value: e.rolls[0], label: 'You', tone: e.loser === 0 ? 'bad' : 'good' }, { sides: e.dice[1], value: e.rolls[1], label: 'Foe', tone: e.loser === 1 ? 'bad' : 'good' }], e.loser === null ? 'Even clash! A coin flip decides who goes first…' : `${e.loser === 0 ? 'You' : 'Foe'} rolled lower: ${e.dmg} damage (the difference) and acts second.`, slow() ? 1300 : 500);
            // a tie on the dice too: flip a coin, with each creature's name on a face, and show who won before anyone acts
            const first = e.first ?? 0;
            if (e.coin) await coinFlip('Coin flip!', [whoOn(0), whoOn(1)], first, `${whoOn(first)} goes first!`, slow() ? 1100 : 600);
            say(`${whoOn(first)} acts first this round.`, first === 0 ? 'good' : 'bad');
            break;
          }
          case 'tired':
            await rollDice('Fatigue check', [{ sides: 10, value: e.value, tone: e.fail ? 'bad' : 'good' }], e.fail ? `Rolled ≤ ${e.fatigue}: catching breath!` : `Beat Fatigue ${e.fatigue}.`, slow() ? 1000 : 300);
            disp[e.side] = e.snap; renderPlate(e.side);
            break;
          case 'damage': {
            if (slow() && e.calc) {
              const k = e.calc;
              const attacker = whoOn(e.side === 0 ? 1 : 0);
              const steps = `${k.rolls.join(' + ')} ${partsText(k.parts)}`.trim().replace(/^\+ /, '');
              const math = `${steps} = ${k.raw}${k.mult !== 1 ? ` × ${k.mult} type` : ''}${k.crit ? ' × 2 crit' : ''}`;
              const caption = `${math} → ${k.total} damage`;
              if (k.dice.length) await rollDice(`${attacker} · Damage ${k.dice.map((d) => `d${d}`).join(' + ')}`, k.dice.map((d, i) => ({ sides: d, value: k.rolls[i], tone: k.mult > 1 || k.crit ? 'good' as const : k.mult < 1 ? 'bad' as const : undefined })), caption, 1300);
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
          case 'status': case 'stamina': disp[e.side] = e.snap; renderPlate(e.side); break;
          case 'zero': {
            disp[e.side] = e.snap; renderPlate(e.side);
            if (e.bonus > 0) { const p = bv.screenOf(e.side); floatText(p.x, p.y + 30, `⌖ Zeroing in +${e.bonus}`, 'buff'); await wait(slow() ? 650 : 300); }
            break;
          }
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
            if (c) { say(e.reason === 'ko' ? `${nameOf(c)} gained ${e.amount} XP for knocking out ${e.foe ?? 'its foe'}!` : `${nameOf(c)} gained ${e.amount} XP for battling${e.bonus ? ` (incl. +${e.bonus} trainer battle bonus)` : ''}.`, 'good'); if (e.levels) sfx.good(); if (e.levels) toast(`${nameOf(c)} reached Lv ${c.level}! Unlock a node on its chart.`, 'good', 3500); await wait(600); }
            break;
          }
          case 'end': break;
        }
      }
    };

    if (ctx.duelSend) b.foeChooses = true;
    say(ctx.intro);
    await wait(700);
    // round loop
    const result = await new Promise<Battle['over']>((resolve) => {
      const showControls = () => {
        $('.rnd', header).textContent = String(b.round + 1);
        if (b.over) { finish(b.over); return; }
        if (b.foeNeedSwap) { void foeReplace(); return; }
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
      // the creatures on screen (a spectator's copy of the battle only tracks them through the events)
      const shown = (si: 0 | 1) => b.sides[si].team.find((x) => x.uid === disp[si].uid) ?? activeOf(b.sides[si]);
      const showTypes = () => {
        const me = shown(0), foe = shown(1);
        const attack = [...new Set(me.playbook.map((id) => MOVE_BY_ID[id]).filter((m) => m.kind === 'elemental' && m.type).map((m) => m.type!))];
        typeChartSheet({ attack, defend: speciesOf(foe).types, foeName: nameOf(foe), attackerName: ctx.watch ? nameOf(me) : undefined });
      };
      const onKey = (ev: KeyboardEvent) => {
        if (document.querySelector('.sheet-wrap')) return;
        if (readoutFor && controls.querySelector('.readout')) {
          if (ev.key === 'Escape' || ev.key === 'Backspace') { readoutFor = null; showControls(); }
          else if (ev.key === 'Enter') { ev.preventDefault(); const id = readoutFor; readoutFor = null; act({ kind: 'move', move: id }); }
          return;
        }
        if (ev.key.toLowerCase() === 'l') { this.battleLogSheet(); return; }
        if (ctx.watch) { if (ev.key.toLowerCase() === 't') showTypes(); return; } // spectators: the type chart and log only
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
      const finish = (r: Battle['over']) => {
        removeEventListener('keydown', onKey);
        // Teamwork earned from swaps this battle
        if (!ctx.watch && b.teamworkGains?.length) toast(`🤝 Teamwork grew: ${b.teamworkGains.map(riseText).join(' · ')}.`, 'good', 6000);
        resolve(r);
      };
      const act = async (a: Parameters<typeof resolveRound>[1]) => {
        controls.replaceChildren(h('div', { class: 'waiting' }, ctx.duel ? `Waiting for ${b.sides[1].name} to choose…` : '…'));
        // two-player duel: the other trainer picks their creature's action too
        const foe = ctx.duel ? await ctx.duel(b) : undefined;
        const ev = resolveRound(b, a, foe);
        await play(ev);
        showControls();
      };
      const swapPicker = () => {
        const cur = activeOf(b.sides[0]);
        const close = openSheet('Swap — choose the incoming Alpha', h('div', null,
          h('p', { class: 'small' }, `The incoming creature is the Alpha: it uses the Swap Move set for swapping in for ${nameOf(cur)} (change it here or on its card). The swap resolves at ${nameOf(cur)}'s speed.`),
          h('p', { class: 'small muted' }, `🤝 Teamwork: every ${TEAMWORK_PER_BONUS} Teamwork the Alpha has with ${nameOf(cur)} adds +1 to its Swap Move, and stronger Swap Moves unlock at Teamwork 1 and 2. A pair earns +${TEAMWORK_PER_SWAP} Teamwork the first time one swaps in for the other in a battle, and +${TEAMWORK_PER_TURN} each turn they travel together. A pair’s Teamwork is capped at half the lower Loyalty of the two.`),
          h('div', { class: 'list' }, b.sides[0].team.map((c, i) => {
            if (c.ko || c === cur) return null;
            const pv = swapPreview(b, 0, i);
            const grows = pv.earned ? 'Already earned its Teamwork this battle.' : pv.capped ? 'Teamwork is at the pair’s cap (half the lower Loyalty of the two): raise that Loyalty to grow it.' : `This swap earns +${TEAMWORK_PER_SWAP} Teamwork (once per battle).`;
            return h('div', { class: 'swap-row' },
              miniCard(c, { onClick: () => { close(); act({ kind: 'swap', to: i }); } }),
              h('div', { class: 'small' },
                h('div', null, '🔁 ', h('b', null, pv.power), ` · 🤝 Teamwork ${fmtTeamwork(pv.teamwork)} with ${nameOf(cur)} → `, h('b', null, pv.bonus ? `+${pv.bonus} bonus` : 'no bonus yet'),
                  ctx.watch ? null : h('button', { class: 'link', onclick: () => { close(); editSwapMove(c, cur, () => swapPicker()); } }, 'Change')),
                h('div', null, alphaText(swapText(pv.move, { A: nameOf(c), P: nameOf(cur), aType: speciesOf(c).types[0], pType: speciesOf(cur).types[0] }), nameOf(c), nameOf(cur))),
                h('div', { class: 'muted' }, alphaText(pv.effect, nameOf(c), nameOf(cur))),
                h('div', { class: 'muted' }, grows)));
          }))));
      };
      // two-player duel: the defender picks who replaces their knocked-out creature
      const foeReplace = async () => {
        const many = foeReplacements(b).length > 1;
        say(`${b.sides[1].name} is choosing their next creature…`, 'info');
        controls.replaceChildren(h('div', { class: 'waiting' }, many ? `Waiting for ${b.sides[1].name} to choose…` : '…'));
        const idx = many && ctx.duelSend ? await ctx.duelSend(b) : undefined;
        await play(foeSendIn(b, idx ?? -1));
        showControls();
      };
      const forcedSwap = () => {
        say('Choose your next creature!', 'bad');
        controls.replaceChildren(h('div', { class: 'list' }, b.sides[0].team.map((c, i) => c.ko ? null : miniCard(c, { onClick: async () => { controls.replaceChildren(); await play(sendIn(b, i)); showControls(); } }))));
      };
      if (ctx.watch) {
        // watching someone else's battle: play their rounds as they arrive
        say(ctx.intro);
        controls.replaceChildren(h('div', { class: 'row gap-s center wrap' },
          h('div', { class: 'waiting' }, `👀 Watching ${s.trainer.name}’s battle`),
          h('button', { class: 'btn ghost sm', title: 'Type chart for this matchup (T)', onclick: () => showTypes() }, '🔺 Types')));
        void (async () => {
          for (;;) {
            const it = await ctx.watch!.next();
            if (it.kind === 'battle-events') await play(it.events as BEvent[]);
            if (it.kind === 'battle-end' || watchedEnd) { finish(watchedEnd ?? 'fled'); return; }
          }
        })();
      } else showControls();
    });
    if (ctx.watch) { this.engine.setView(this.world); this.busy = false; return result; }
    this.feed({ kind: 'battle-end' });

    // ── Aftermath ──────────────────────────────────────────────
    if (result === 'win') { sfx.fanfare(); say('Victory!', 'good'); await wait(600); }
    if (result === 'lose') { sfx.bad(); say('Your team is out of creatures…', 'bad'); await wait(900); }
    if (result === 'fled') await wait(500);
    const wild = b.sides[1].team[0];
    if (result === 'win' && (ctx.kind === 'wild' || ctx.kind === 'legendary')) {
      await this.recruitFlow(wild);
    }
    // a Wanderer whose team is wiped out picks which rested city to return to
    let wipeTo: string | undefined;
    if (ctx.kind !== 'rival' && s.roster.every((c) => c.ko) && W.wipeOptions(s).length > 1) wipeTo = await this.pickWipeCity();
    const summary = W.finishBattle(s, b, { kind: ctx.kind, city: ctx.city, nodeId: ctx.nodeId, gauntlet: ctx.gauntlet, wipeTo });
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

  /** Wanderer: the team is wiped out; choose a city you've rested at this game to return to. */
  pickWipeCity(): Promise<string> {
    const s = this.s;
    const last = W.wipeDefault(s);
    return new Promise((resolve) => {
      const close = openSheet('⚖️ Where do you rest up?', h('div', null,
        h('p', { class: 'small' }, 'Your team is wiped out. As a Wanderer you make your home anywhere: return to any city you’ve rested at this game. You still lose half your coins, and your turn ends.'),
        h('div', { class: 'list' }, W.wipeOptions(s).map((id) => {
          const c = CITIES[id];
          return h('button', { class: 'choice', onclick: () => { close(); resolve(id); } },
            h('b', null, h('img', { src: typeIcon(c.type), alt: '', style: 'width:18px;height:18px;vertical-align:-3px;margin-right:6px' }), c.name),
            h('small', { class: 'muted' }, [`${TYPE_LABEL[c.type]} City · Arbiter ${c.arbiter}`, id === s.trainer.home ? '🏠 Home' : '', id === last ? 'rested here last' : ''].filter(Boolean).join(' · ')));
        }))), { noClose: true });
    });
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
        const accepted = W.acceptedOffering(s, wild);
        const mods = W.totemBonus(totem, wild) + W.offeringBonus(chosen, wild) + (accepted ? W.offeringBonus([accepted], wild) : 0) + (W.ability(s) === 'luckyCharm' ? 1 : 0);
        const need = W.recruitTarget(wild);
        const chance = probAtLeast(need - mods);
        body.replaceChildren(
          h('div', { class: 'recruit-head', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
            h('img', { src: portrait(sp.id) }),
            h('div', null, h('h3', null, sp.name), h('div', { class: 'row gap-s' }, sp.types.map((t) => typeChip(t, true)), rarityBadge(sp.rarity)),
              h('p', { class: 'small' }, `Defeated, ${sp.name} watches you warily. Offer a totem — if it accepts, it will inhabit the totem and join you.`))),
          h('h4', null, 'Totem'),
          h('div', { class: 'chips' }, totems.map((t) => h('button', { class: `pick ${t === totem ? 'sel' : ''}`, onclick: () => { totem = t; render(); } }, `${itemInfo(t).icon} ${W.itemDisplayName(t)} (${fmt(W.totemBonus(t, wild))})`))),
          accepted ? h('p', { class: 'small good-text' }, `✓ Already accepted your ${itemInfo(accepted).icon} ${itemInfo(accepted).name} in the Depths (${fmt(W.offeringBonus([accepted], wild))}).`) : '',
          h('h4', null, accepted ? 'More offerings ' : 'Offerings ', h('span', { class: 'muted' }, '(up to 2)')),
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
              await rollDice('Offering', r.dice.map((v) => ({ sides: 6, value: v, tone: r.success ? 'good' : 'bad' })), `${r.dice[0]} + ${r.dice[1]} ${fmt(r.mods)} = ${r.total} vs ${r.need}`, 700, { read: true });
              if (r.success) { toast(`${sp.name} embraced your totem and joined you!`, 'good', 3500); if (s.roster.length >= 3 && !s.roster.includes(wild)) toast('Your active team is full — it rests in its totem (swap it in for free at any city or town).', 'info', 4000); }
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
    const costTag = `${cost}⚡`;
    const gate = W.arbiterGate(s, id);
    const body = h('div', { class: 'city' },
      h('div', { class: 'city-hero', style: `--tc:${TYPE_COLOR[c.type]}` },
        h('img', { src: typeIcon(c.type) }),
        h('div', null, h('h3', null, c.name), h('small', null, `Inspired by ${c.park} · ${TYPE_LABEL[c.type]} City${s.trainer.home === id ? ' · 🏠 Home' : ''}`), h('p', { class: 'small' }, c.blurb))),
      h('div', { class: 'tiles' },
        tile('🍲', 'Stable', `${c.hotpot.name}: full recovery + ${c.hotpot.text}${s.trainer.home === id ? ' (doubled — home!)' : s.trainer.style === 'balanced' ? ` (doubled — a Wanderer is at home anywhere${W.restedCities(s).includes(id) ? '' : '. Resting here also lets you return here if your team is wiped'})` : ''}`, `${W.stableCost(s)}⚡`, () => this.stable()),
        this.swapTile(),
        // free to browse: the first purchase (or carving) each turn costs the city action
        tile('🛒', 'Market', 'Restores, treats, charms and totems. Free to browse.', !cost ? costTag : W.facilityPaid(s, 'market') ? '✓ paid' : `${costTag} to buy`, () => this.market()),
        tile('🔄', 'Carving Shrine', 'Carve type totems and creature effigies. Free to look.', !cost ? costTag : W.facilityPaid(s, 'shrine') ? '✓ paid' : `${costTag} to carve`, () => this.shrine()),
        tile('🛠️', 'Workbench', 'Craft salves, teas, charms and more from offering materials. Free to look.', !cost ? costTag : W.facilityPaid(s, 'workbench') ? '✓ paid' : `${costTag} to craft`, () => this.workbench()),
        this.workTile(),
        tile('🤺', 'Trainer Hall', W.hallBlock(s) && s.flags.sparred?.includes(id) ? 'You’ve battled here this turn. Come back next turn.' : `Battle a local trainer once per turn. Trainer battles earn +${TRAINER_BATTLE_XP_BONUS} XP for every creature that fights, win or lose, plus coins if you win.`, costTag, () => this.trainerHall(), !!s.flags.sparred?.includes(id)),
        id === 'aurora' ? tile('🌀', 'Cloud Island Portal', W.portalOpen(s)
          ? `Open ${seasonForTurn(s.turn) === 'winter' ? 'all Winter' : 'tonight'}. Step through from the map (the dotted path north-west).${s.flags.salemWorthy ? '' : ` A full lap of the island earns a match with Salem (${W.cloudLapProgress(s).steps}/${W.CLOUD_LAP}).`}`
          : 'Closed by day. The portal opens at night (even turns), and stays open all Winter.', '', () => this.cloudSheet()) : null,
        id === GAUNTLET_CITY && !s.flags.stellaOpen && !s.merits.includes(id) ? (() => {
          const g = W.gauntletProgress(s);
          return tile('⚓', 'Iron Coast Gauntlet', `Beat ${g.need} local trainers in a row to earn a match with Stella: ${g.wins}/${g.need} so far. Rest at the Stable between matches as often as you like, but leaving the city resets it.`, costTag, () => this.gauntletSheet());
        })() : null,
        c.arenaNode === FOREST_FLOOR
          ? tile('🌲', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `✓ ${c.accolade} earned` : `${c.arbiter}’s arena hides on the Forest Floor below. Climb down with a Canopy Rope and follow her trail in the dark.`, '', () => this.floorSheet(), s.merits.includes(id))
          : c.arenaNode
          ? tile('⛴️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `✓ ${c.accolade} earned` : `${c.arbiter}\u2019s ${c.arena.name} is offshore, on the island. Take the ferry from the docks to Black Sand Cove (needs a Ferry Pass, sold at this market).`, '', () => {}, true)
          : tile('🏟️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `✓ ${c.accolade} earned` : `${c.arena.name}. ${gate.ok ? 'Ready to accept your challenge.' : gate.reason}`, s.merits.includes(id) ? '' : costTag, () => this.arbiter(), s.merits.includes(id))));
    openSheet(c.name, body, { wide: true });
  }

  /** Shifting Depths → Explore the Depths: choose an offering material; a creature that craves it answers. */
  depthsSheet() {
    const s = this.s;
    const mats = Object.keys(s.inventory).filter((id) => s.inventory[id] > 0 && W.depthsCalls(id).length);
    const close = openSheet('🕳️ Explore the Depths', h('div', null,
      h('p', null, `Choose an offering to leave at the edge of the dark. A wild creature of a type that craves it climbs up to meet you (the stronger the craving, the likelier that type), as rare as those on the Sinkhole Stair. It has already accepted the offering, so it counts toward recruiting it if you win. Costs ${W.DEPTHS_COST} Initiative and the material.`),
      mats.length ? h('div', { class: 'list' }, mats.map((id) => {
        const it = itemInfo(id);
        const why = W.depthsBlock(s, id);
        return h('button', { class: 'choice depths-offer', disabled: !!why, title: why ?? '', onclick: async () => { close(); await this.exploreDepths(id); } },
          h('div', { class: 'row gap-s' }, h('span', { class: 'bi-ico' }, it.icon), h('b', null, `${it.name} ×${s.inventory[id]}`)),
          h('div', { class: 'row gap-s wrap' }, h('small', { class: 'muted' }, 'Calls: '), W.depthsCalls(id).map((c) => h('span', { class: 'row gap-xs' }, typeChip(c.type, true), h('small', null, c.w >= 2 ? 'strongly' : 'sometimes')))),
          why ? h('small', { class: 'bad-text' }, why) : null);
      })) : h('p', { class: 'small muted' }, 'You have no offering materials. Find them by exploring (each biome has its own), or buy Canyon Ochre and Ember Charcoal at the market here.')), { wide: true });
  }

  async exploreDepths(material: string) {
    const s = this.s;
    if (this.busy) return;
    const out = W.exploreDepths(s, material);
    if (!out) { toast(W.depthsBlock(s, material) ?? 'Nothing stirs below.', 'info'); return; }
    this.busy = true;
    closeAllSheets();
    save(s); this.renderHud();
    try {
      await rollDice('Rarity Stars', out.stars.map((x) => ({ sides: 6, value: x.face, face: STAR_FACE[x.star], tone: x.star === 'full' ? 'good' : 'info', label: x.star })), `${out.rarity[0].toUpperCase() + out.rarity.slice(1)} creature! (+★ the Depths)`, 900, { read: true });
    } finally { this.busy = false; }
    await this.runBattle(out.battle, { kind: 'wild', intro: `Drawn by your ${itemInfo(material).name}, a wild ${nameOf(out.battle.sides[1].team[0])} climbs out of the Depths!` });
  }

  /** City Trainer Hall: battle a local trainer (once per city per turn). */
  async trainerHall() {
    const s = this.s;
    const why = W.hallBlock(s);
    if (why) { toast(why, 'info'); return; }
    const r = W.hallBattle(s);
    if (!r) return;
    closeAllSheets();
    this.renderHud();
    await this.runBattle(r.battle, { kind: 'trainer', intro: `${r.name} accepts your challenge in the ${NODE_BY_ID[s.location].name} Trainer Hall!` });
  }

  spend(cost?: number): boolean {
    if (cost !== undefined) {
      if (this.s.initiative < cost) { toast('Not enough Initiative for that.', 'bad'); return false; }
      this.s.initiative -= cost;
      return true;
    }
    if (!W.spendCityAction(this.s)) { toast('Not enough Initiative for that.', 'bad'); return false; }
    return true;
  }

  stable() {
    if (!this.spend(W.stableCost(this.s))) return;
    const r = W.rest(this.s, this.s.location);
    const city = CITIES[this.s.location];
    closeAllSheets();
    toast(city ? `Your team devours the ${city.hotpot.name}${r.advanced ? ' (home special!)' : ''}. Fully restored!` : 'Your team rests up at the town stable. Fully restored!', 'good', 3500);
    save(this.s);
    this.renderHud();
  }

  /** City / town menu tile: swap creatures in and out of totems. Free, any time you're in a city or town. */
  swapTile(): HTMLElement {
    const s = this.s;
    const none = !s.reserve.length && s.roster.length <= 1;
    return tile('🔄', 'Swap Team', s.reserve.length
      ? `Swap creatures between your active team and your totems (${s.reserve.length} resting). Free, any time you’re in a city or town.`
      : 'No creatures resting in totems yet. You can still send active ones to rest here.', '0⚡', () => this.rosterManager(), none);
  }

  /** Swap creatures between the active team and totems. Free in any city or town (no Stable visit needed). */
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
    openSheet('🔄 Swap Team', body, { wide: true });
    render();
  }

  /**
   * Browse a market. City markets are free to look at; the first purchase each turn costs the city action
   * (`W.payFacility`), and later ones that turn are free. Town markets (`free`) never cost Initiative.
   */
  market(free = false) {
    const s = this.s;
    const stock = [...W.marketStock(s.location)];
    const town = TOWNS[s.location];
    if (town) for (const k of W.townKeyItems(s, s.location).reverse()) if (!stock.includes(k)) stock.unshift(k);
    const body = h('div');
    const render = () => {
      const cost = W.cityActionCost(s);
      const owed = !free && cost > 0 && !W.facilityPaid(s, 'market'); // the first purchase here this turn still costs Initiative
      body.replaceChildren(
        h('div', { class: 'row between' }, h('span', { class: 'chip' }, '💰 ', h('b', null, s.coins), ' coins'), W.ability(s) === 'babyEyes' ? h('span', { class: 'chip good' }, 'Baby-Doll Eyes: −25%') : null),
        ...(free || cost === 0 ? [] : [h('p', { class: `small facility-note ${owed ? '' : 'paid'}` }, owed
          ? `Browsing is free. Your first purchase here this turn costs ${cost}⚡ (you have ${s.initiative}); after that, buy as much as you like.`
          : '✓ Paid for this turn: buy as much as you like.')]),
        h('p', { class: 'small muted' }, 'Items are never used in battle — use them from your Bag between fights.'),
        h('div', { class: 'shop' }, stock.map((id) => {
          const it = itemInfo(id);
          const owned = s.inventory[id] ?? 0;
          const p = W.priceOf(s, id);
          const isKey = isUnique(it);
          return h('div', { class: `shop-row ${isKey ? 'key' : ''}` },
            h('span', { class: 'shop-ico' }, it.icon),
            h('div', null, h('b', null, it.name), h('small', null, it.text), owned ? h('small', { class: 'muted' }, ` · owned ${isKey ? '✓' : owned}`) : null),
            h('button', { class: 'btn sm primary', disabled: s.coins < p || (isKey && owned > 0) || (owed && s.initiative < cost), onclick: () => {
              const paid = free ? 'already' : W.payFacility(s, 'market');
              if (!paid) { toast('Not enough Initiative for that.', 'bad'); return; }
              if (!W.buy(s, id)) { if (paid === 'paid') W.refundFacility(s, 'market'); return; }
              toast(`Bought ${it.name}${paid === 'paid' ? ` (−${cost}⚡)` : ''}`, 'good', 1500); save(s); this.renderHud(); render();
            } }, `💰 ${p}`, owed ? ` · ${cost}⚡` : ''));
        })));
    };
    openSheet(town ? `${NODE_BY_ID[s.location].name} · Market` : 'Market', body, { wide: true });
    render();
  }

  /** Odd jobs (cities and towns): spend all remaining Initiative for a d4 of coins each (`W.doWork`). */
  workTile() {
    const s = this.s;
    return tile('🧰', 'Odd Jobs', `Haul crates, mind stalls, run errands: uses all the Initiative you have left, and each point earns a d${W.WORK_DIE} of coins.`, s.initiative ? `${s.initiative}⚡ (all)` : '', () => this.work(), !!W.workBlock(s));
  }
  async work() {
    const s = this.s;
    const why = W.workBlock(s);
    if (why) { toast(why, 'info', 3000); return; }
    const n = s.initiative;
    const ok = await confirmSheet('Take odd jobs?', `This uses all ${n} Initiative you have left: ${n} d${W.WORK_DIE} of coins (${n}–${n * W.WORK_DIE}).${s.trainer.style === 'haggler' ? ' As a Merchant you earn 25% more (at least +1).' : ''} You can still do anything free afterwards, then end your turn.`, `Work · ${n}⚡`);
    if (!ok) return;
    const r = W.doWork(s);
    if (!r) return;
    closeAllSheets();
    this.renderHud();
    await rollDice('Odd Jobs', r.rolls.map((v) => ({ sides: W.WORK_DIE, value: v, tone: v >= 3 ? 'good' : 'info' as const })), `Earned 💰 ${r.coins} coins.`, 800, { read: true });
    sfx.good();
    toast(`🧰 A hard day’s work: +💰 ${r.coins}`, 'good', 2600);
    save(s);
    this.renderHud();
  }

  /**
   * The Workbench: turn offering materials into consumables (`RECIPES`; `W.craft`). Each slot takes a
   * material with allure for its type, picked automatically (cheapest first) and changeable. In a
   * city it's free to look and the first craft each turn costs the city action; in a town it's free.
   */
  workbench(free = false) {
    const s = this.s;
    const body = h('div');
    let picks: Record<string, string[] | null> = {};
    const render = () => {
      const act = W.cityActionCost(s);
      const owed = !free && act > 0 && !W.facilityPaid(s, 'workbench');
      const hasMats = Object.keys(s.inventory).some((k) => s.inventory[k] > 0 && itemInfo(k).kind === 'material');
      body.replaceChildren(
        ...(free || act === 0 ? [] : [h('p', { class: `small facility-note ${owed ? '' : 'paid'}` }, owed
          ? `Looking is free. Your first craft here this turn costs ${act}⚡ (you have ${s.initiative}); after that, craft as much as you like.`
          : '✓ Paid for this turn: craft as much as you like.')]),
        h('p', { class: 'small' }, 'Each slot takes one offering material with some allure for that type (shown on the material in your Bag). Universal materials such as Cloud Silk fit any slot. The cheapest materials you own are picked for you; change them if you’d rather keep one.'),
        ...(hasMats ? [] : [h('p', { class: 'small muted' }, 'You have no offering materials. Find them by exploring: each biome has its own.')]),
        h('div', { class: 'shop' }, RECIPES.map((r) => {
          const it = itemInfo(r.out);
          if (!(r.id in picks)) picks[r.id] = W.autoIngredients(s, r) ?? r.slots.map((t) => W.slotOptions(s, t)[0] ?? '');
          const mats = picks[r.id]!;
          const ok = W.validIngredients(s, r, mats);
          return h('div', { class: 'shop-row craft-row' },
            h('span', { class: 'shop-ico' }, it.icon),
            h('div', null,
              h('b', null, it.name, r.n > 1 ? ` ×${r.n}` : ''), h('small', null, `${r.text} ${it.text}`),
              (s.inventory[r.out] ?? 0) ? h('small', { class: 'muted' }, ` · owned ${s.inventory[r.out]}`) : null,
              h('div', { class: 'craft-slots' }, r.slots.map((t, i) => {
                const opts = W.slotOptions(s, t);
                return h('label', { class: 'craft-slot' }, typeChip(t, true),
                  opts.length
                    ? h('select', { onchange: (e: Event) => { mats[i] = (e.target as HTMLSelectElement).value; render(); } },
                        opts.map((m) => h('option', { value: m, selected: m === mats[i] }, `${itemInfo(m).icon} ${itemInfo(m).name} ×${s.inventory[m]}`)))
                    : h('small', { class: 'muted' }, `no ${TYPE_LABEL[t]} material`));
              })),
              !ok && mats.every(Boolean) ? h('small', { class: 'bad-text' }, 'Not enough of that material for every slot.') : null),
            h('button', { class: 'btn sm primary', disabled: !ok || (owed && s.initiative < act), onclick: () => {
              const paid = free ? 'already' : W.payFacility(s, 'workbench');
              if (!paid) { toast('Not enough Initiative for that.', 'bad'); return; }
              if (!W.craft(s, r.id, mats)) { if (paid === 'paid') W.refundFacility(s, 'workbench'); return; }
              sfx.good();
              toast(`Crafted ${it.icon} ${it.name}${r.n > 1 ? ` ×${r.n}` : ''}${paid === 'paid' ? ` (−${act}⚡)` : ''}`, 'good', 1800);
              picks = {}; save(s); this.renderHud(); render();
            } }, 'Craft', owed ? ` · ${act}⚡` : ''));
        })));
    };
    openSheet(free ? `${NODE_BY_ID[s.location].name} · Workbench` : 'Workbench', body, { wide: true });
    render();
  }

  /** The Carving Shrine: free to look at; the first carving each turn costs the city action (`W.payFacility`). */
  shrine() {
    const s = this.s;
    let kind: 'type' | 'effigy' = 'type';
    let target: string = 'fire';
    let mats: string[] = [];
    const body = h('div');
    const render = () => {
      const materials = Object.keys(s.inventory).filter((k) => itemInfo(k).kind === 'material');
      const need = kind === 'type' ? 1 : 2;
      const cost = kind === 'type' ? 6 : 10;
      const act = W.cityActionCost(s);
      const owed = act > 0 && !W.facilityPaid(s, 'shrine');
      body.replaceChildren(
        ...(act === 0 ? [] : [h('p', { class: `small facility-note ${owed ? '' : 'paid'}` }, owed
          ? `Looking is free. Your first carving here this turn costs ${act}⚡ (you have ${s.initiative}); after that, carve as much as you like.`
          : '✓ Paid for this turn: carve as much as you like.')]),
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
        h('div', { class: 'row end gap' }, h('span', { class: 'chip' }, '💰 ', s.coins),
          h('button', { class: 'btn primary', disabled: mats.length < need || s.coins < cost || (owed && s.initiative < act), onclick: () => {
            const paid = W.payFacility(s, 'shrine');
            if (!paid) { toast('Not enough Initiative for that.', 'bad'); return; }
            const id = W.carveTotem(s, kind, target, mats);
            if (!id) { if (paid === 'paid') W.refundFacility(s, 'shrine'); return; }
            toast(`Carved a ${W.itemDisplayName(id)}!${paid === 'paid' ? ` (−${act}⚡)` : ''}`, 'good'); mats = []; save(s); this.renderHud(); render();
          } }, `Carve · 💰 ${cost}`, owed ? ` · ${act}⚡` : '')));
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
      if (gate.cloud) { this.cloudSheet(); return; }
      if (gate.trail) { this.floorSheet(); return; }
      if (gate.findHim) { this.findFabian(); return; }
      if (gate.gauntlet) { this.gauntletSheet(); return; }
      toast(gate.reason ?? 'Not yet.', 'bad', 3500);
      return;
    }
    const tier = tierOf(s);
    const body = h('div', { class: 'arbiter', style: `--tc:${TYPE_COLOR[c.type]}` },
      h('div', { class: 'city-hero' }, h('img', { src: typeIcon(c.type) }), h('div', null, h('h3', null, `Arbiter ${c.arbiter}`), h('small', null, `${c.arena.name} · ${TYPE_LABEL[c.type]} specialist`))),
      h('p', null, c.arena.text),
      h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, `Your Tier: ${tier}`), h('span', { class: 'chip' }, `${tier === 1 ? 2 : 3} creatures · Lv ~${1 + tier * 2}`), h('span', { class: 'chip' }, `Prize: ${c.accolade} + 💰${10 * tier}`)),
      h('p', { class: 'small muted' }, 'Arbiters scale to your Tier, so you may challenge them in any order.'),
      h('div', { class: 'row end gap' }, h('button', { class: 'btn ghost', onclick: () => closeAllSheets() }, 'Not yet'), h('button', { class: 'btn primary', onclick: async () => {
        if (!this.spend()) return;
        closeAllSheets();
        await this.runBattle(W.arbiterBattle(s, id), { kind: 'arbiter', intro: `Arbiter ${c.arbiter} accepts your challenge!`, city: id });
      } }, `Challenge · ${W.cityActionCost(s)}⚡`)));
    openSheet(`${c.name} Arena`, body);
  }

  /**
   * The Cloud Island rules, with the trainer's current status (portal, lap, step cost, satchel).
   * Shown before stepping through the portal, and from the island's HUD chip while there.
   */
  cloudRules(): HTMLElement {
    const s = this.s;
    const lap = W.cloudLapProgress(s);
    const open = W.portalOpen(s);
    const eye = NODE_BY_ID[CLOUD_EYE];
    const step = Math.min(5, 1 + W.cloudStepExtra(s));
    const loot = Object.entries(s.cloudLoot ?? {}).filter(([, n]) => n > 0);
    const winter = seasonForTurn(s.turn) === 'winter';
    const rule = (icon: string, title: string, ...body: (string | Node)[]) => h('div', { class: 'cloud-rule' }, h('span', { class: 'cloud-rule-ico' }, icon), h('div', null, h('b', null, title), h('p', null, ...body)));
    return h('div', { class: 'cloud-rules' },
      h('p', null, 'Cloud Island works unlike anywhere else in Margos. Here’s how.'),
      // where you stand right now
      h('div', { class: 'cloud-status' },
        h('div', null, h('small', null, 'Portal'), h('b', null, open ? (winter ? '🌀 Open all Winter' : '🌙 Open tonight') : '☀️ Shut until night')),
        h('div', null, h('small', null, 'Each island step'), h('b', null, `${step}⚡ (Tier ${tierOf(s)})`)),
        h('div', null, h('small', null, 'Lap for Salem'), h('b', null, s.flags.salemWorthy ? '✓ Done' : `${lap.steps} / ${lap.need} steps`)),
        h('div', null, h('small', null, 'Cloud satchel'), h('b', null, loot.length ? `${loot.reduce((a, [, n]) => a + n, 0)} item${loot.reduce((a, [, n]) => a + n, 0) === 1 ? '' : 's'} unsecured` : 'Empty'))),
      s.flags.salemWorthy ? '' : h('div', { class: 'gauntlet-pips', 'aria-label': `${lap.steps} of ${lap.need} steps` }, Array.from({ length: lap.need }, (_, k) => h('span', { class: k < lap.steps ? 'on' : k === lap.steps ? 'next' : '' }))),
      rule('🌀', 'The portal', 'Cloud Island is reached through the portal in Aurora Peak. It opens at ', h('b', null, 'night'), ' (even turns), and stays open ', h('b', null, 'all Winter'), '. By day it’s shut: if dawn finds you on the island, you’re there until nightfall. You can still walk the ring by day.'),
      rule('🔁', 'A lap for Salem', 'Salem only battles trainers who walk a full lap: ', h('b', null, '6 steps in a row around the ring, always the same way round'), '. Turning back starts the count again. A lap can take as many turns as you need.', s.flags.salemWorthy ? ' You’ve done it: Salem will see you any time.' : ''),
      rule('🐌', 'The slog', `Every step onto an island node costs +1 Initiative per Tier (+${W.cloudStepExtra(s)} for you now), up to a whole turn’s 5. Stepping back off the island costs the normal 1. Salem makes stronger trainers work for it.`),
      rule('👜', 'The Cloud satchel', 'Items you find on the island go into a Cloud satchel, ', h('b', null, 'not your bag'), '. They’re only yours once you ', h('b', null, 'escape'), ': back through the portal. ', h('b', null, 'Get wiped out and sent home, and the satchel is lost.'), loot.length ? ` In it now: ${loot.map(([id, n]) => `${itemInfo(id).icon} ${W.itemDisplayName(id)} ×${n}`).join(', ')}.` : ''),
      rule('🚪', 'Leaving', 'Leaving the island ends a lap in progress. Leaving through the portal secures your satchel; being sent home after a wipe doesn’t.'),
      rule('✨', 'What’s here', 'The ring’s six wilds are a rare area: Astral, Electric, Water and Charm creatures (who’s out depends on day or night), and universal offerings that work on any creature: Cloud Silk (+1), Stardust (+2) and the rare Moonbow Prism (+3). While you’re here, only Cloud Island events happen.'),
      rule('👁️', eye.name, s.merits.includes('aurora')
        ? (W.legendaryHere(s, eye) ? 'You’ve beaten Salem, so the bridges from the ring to the middle are open. A Legendary waits there.' : 'The middle of the ring is quiet now.')
        : 'In the middle of the ring. Its bridges only open for trainers who have beaten Salem.'));
  }

  /** The Cloud Island rules, any time (from Aurora Peak's portal tile, Salem's arena, or the island's HUD chip). */
  cloudSheet() {
    openSheet(isCloudNode(this.s.location) ? '☁️ Cloud Island rules' : '🌀 Cloud Island', this.cloudRules(), { wide: true });
  }

  /** Before stepping through the portal: the rules, and a last chance to turn back. */
  cloudPrompt(cost: number): Promise<boolean> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (go: boolean) => { if (done) return; done = true; close(); resolve(go); };
      const close = openSheet('🌀 Step through to Cloud Island?', h('div', null,
        this.cloudRules(),
        h('p', { class: 'small muted' }, 'You can read these rules again any time on the island: tap the ☁️ Cloud Island chip at the top left.'),
        h('div', { class: 'row end gap sticky-foot' },
          h('button', { class: 'btn ghost', onclick: () => finish(false) }, 'Not now'),
          h('button', { class: 'btn primary', onclick: () => finish(true) }, `Step through · ${cost}⚡`))), { wide: true, onClose: () => { if (!done) { done = true; resolve(false); } } });
    });
  }

  /** The Forest Floor rules, with the trainer's current trail. Before climbing down, and from the HUD chip there. */
  floorRules(): HTMLElement {
    const s = this.s;
    const t = W.trailProgress(s);
    const beaten = s.merits.includes('gloom');
    const rule = (icon: string, title: string, ...body: (string | Node)[]) => h('div', { class: 'cloud-rule' }, h('span', { class: 'cloud-rule-ico' }, icon), h('div', null, h('b', null, title), h('p', null, ...body)));
    return h('div', { class: 'cloud-rules' },
      h('p', null, 'The Forest Floor is a single, lightless place below Gloomshade. Here’s how it works.'),
      h('div', { class: 'cloud-status' },
        h('div', null, h('small', null, 'Dahlia’s Trail'), h('b', null, beaten ? '✓ Dahlia beaten' : t.found ? '🏮 Arena found' : `${t.steps} / ${t.need} signs`)),
        h('div', null, h('small', null, 'Signs needed'), h('b', null, `${t.need} (3 + Tier ${tierOf(s)})`)),
        h('div', null, h('small', null, 'Explore die'), h('b', null, `🎲 d${W.floorDie(s)}`))),
      beaten ? '' : h('div', { class: 'gauntlet-pips', 'aria-label': `${t.steps} of ${t.need} signs` }, Array.from({ length: t.need }, (_, k) => h('span', { class: k < t.steps ? 'on' : k === t.steps ? 'next' : '' }))),
      rule('➰', 'Getting down', 'Climb down from Gloomshade with a ', h('b', null, 'Canopy Rope'), ` (sold in ${W.keyTownName(s, 'canopy-rope')} this season). The Forest Floor is one node: you explore it again and again (🔍 Explore, the usual Initiative).`),
      rule('🎲', beaten ? 'Exploring the dark (d6, now Dahlia is beaten)' : 'Exploring the dark (d8)', h('b', null, '1–2'), ' nothing, and your active team loses 1 Morale: they fear the dark. ', h('b', null, '3–4'), ' a wild creature (night creatures, it’s always dark). ', h('b', null, '5–6'), ' an exotic find. ', h('b', null, '7–8'), ' a sign of ', h('b', null, 'Dahlia’s Trail'), '.', beaten ? ' With Dahlia beaten, the die is a d6: the same table without the trail, so no explore is wasted on it.' : ''),
      rule('🏮', 'Dahlia’s Trail', `Find ${t.need} signs (3, +1 per Tier) and her arena appears. Challenge her right there with 🏟️ Dahlia.`),
      rule('🚪', 'Leaving loses the trail', h('b', null, 'Leaving the Forest Floor, by choice or by being sent home after a defeat, loses every sign.'), ' You’ll have to start over.'),
      rule('🏃', 'No easy escape', 'Wild creatures are hard to run from down here (you need a 7+, not 4+), unless your follower has Quick Step.'),
      rule('🍄', 'Exotic finds', 'Slightly better than usual: Duskberries (+2 Morale, +1 Loyalty), Root Salve (+2 Vitality and clears Fatigue), Heartwood Resin and Glowcaps (stronger offerings).'),
      rule('⚠️', 'Hostile events', 'While you’re down here, only the Forest Floor’s events happen, and they’re all dangerous: stalkers, grasping roots, spore clouds, whispers and thieves.'));
  }

  floorSheet() { openSheet('🌲 The Forest Floor', this.floorRules(), { wide: true }); }

  /** Before climbing down: the rules, and a last chance to turn back. */
  floorPrompt(cost: number): Promise<boolean> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (go: boolean) => { if (done) return; done = true; close(); resolve(go); };
      const close = openSheet('➰ Climb down to the Forest Floor?', h('div', null,
        this.floorRules(),
        h('p', { class: 'small muted' }, 'You can read these rules again any time down there: tap the 🌲 Forest Floor chip at the top left.'),
        h('div', { class: 'row end gap sticky-foot' },
          h('button', { class: 'btn ghost', onclick: () => finish(false) }, 'Not now'),
          h('button', { class: 'btn primary', onclick: () => finish(true) }, `Climb down · ${cost}⚡`))), { wide: true, onClose: () => { if (!done) { done = true; resolve(false); } } });
    });
  }

  /** Iron Coast Gauntlet: progress, the next opponent, and the button to face them. */
  gauntletSheet() {
    const s = this.s;
    const g = W.gauntletProgress(s);
    const why = W.gauntletBlock(s);
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
          const r = W.gauntletBattle(s);
          if (!r) { toast(W.gauntletBlock(s) ?? 'Not now.', 'info'); return; }
          closeAllSheets();
          this.renderHud();
          await this.runBattle(r.battle, { kind: 'trainer', gauntlet: true, intro: `Gauntlet match ${r.match} of ${r.of}: ${r.name} steps up!` });
          if (s.flags.stellaOpen && !s.merits.includes(GAUNTLET_CITY)) toast('⚓ The Gauntlet is cleared. Stella’s fortress rises from the waves!', 'good', 4500);
        } }, `Battle the next trainer · ${W.cityActionCost(s)}⚡`)),
      why ? h('p', { class: 'small muted' }, why) : null));
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
        tile('🐴', 'Stable', 'Full recovery for your team, KOs included. No Chanko Nabe buff: that’s a city specialty.', `${W.stableCost(s)}⚡`, () => this.stable()),
        this.swapTile(),
        (() => { const keys = W.townKeyItems(s, s.location); return tile('🛒', 'Market', keys.length ? `Sells the ${keys.map((k) => itemInfo(k).name).join(' and the ')}. ${keys.map((k) => itemInfo(k).text).join(' ')}` : 'Local goods.', '0⚡', () => this.market(true)); })(),
        tile('🛠️', 'Workbench', 'Craft salves, teas, charms and more from offering materials.', '0⚡', () => this.workbench(true)),
        this.workTile(),
        t.special === 'school' ? tile('🥋', 'Battle School', 'Pay coins and leave a creature with the drill masters: it earns 1 XP per coin, at 2 XP a turn. Or have it retrained overnight with a new Nature, Ability or Instinct.', '', () => this.schoolSheet()) : null,
        t.special === 'depths' ? tile('🕳️', 'Explore the Depths', 'Leave an offering material at the edge of the dark: a wild creature that craves it climbs up to battle you. Win, and it has already accepted your offering toward joining you.', `${W.DEPTHS_COST}⚡ + 1 material`, () => this.depthsSheet()) : null,
        t.special === 'research' ? tile('🔬', 'Research Facility', 'Release a recruited creature into the researchers’ care for coins: its level × 2 (Common), 3 (Prime), 4 (Apex) or 5 (Legendary).', '0⚡', () => this.researchSheet()) : null,
        tile('🗺️', 'Notice Board', 'Local rumors and tips.', '', () => this.rumors())),
      h('p', { class: 'small muted' }, 'Towns are safe from the wilds. Town markets cost no Initiative; the stable costs the same as a city action.'));
    openSheet(n.name, body, { wide: true });
  }

  /** Valor Ridge's Battle School: enrol a creature (coins → XP over turns) and pick creatures up. */
  schoolSheet() {
    const s = this.s;
    const body = h('div', { class: 'school' });
    let pickUid: string | null = null;
    let coins = Math.min(20, s.coins - (s.coins % 2));
    // retraining: the creature and what to change ('' = keep)
    let rUid: string | null = null;
    const pickR: Record<W.RetrainPart, string> = { nature: '', ability: '', instinct: '' };
    const render = () => {
      const here = (s.training ?? []).filter((t) => t.school === s.location);
      const away = (s.training ?? []).filter((t) => t.school !== s.location);
      const all = [...s.roster, ...s.reserve];
      if (pickUid && !all.some((c) => c.uid === pickUid)) pickUid = null;
      coins = Math.max(0, Math.min(coins, s.coins));
      const turns = W.trainingTurns(coins);
      const target = all.find((c) => c.uid === pickUid);
      const why = target ? W.enrollBlock(s, target.uid, coins) : 'Choose a creature to enrol.';
      // levels it would gain: walk the XP bar from where it is now
      const levelsFor = (c: CreatureInst | undefined) => (c ? Math.floor((c.xp + coins + (c.morale >= 7 ? 1 : 0)) / 10) : 0);
      const step = (d: number) => () => { coins = Math.max(0, Math.min(s.coins, coins + d)); render(); };
      body.replaceChildren(
        h('p', { class: 'small' }, 'The drill masters train a creature while you travel. It earns 1 XP for every coin you pay, at 2 XP per turn, so 20 coins buys 20 XP over 10 turns. Pick it up early and it keeps the XP earned so far. When you collect it, spend its new level-up points on its chart.'),
        h('h4', null, `🥋 In training here (${here.length})`),
        here.length ? h('div', { class: 'list' }, here.map((t) => {
          const p = W.trainingProgress(s, t);
          if (t.retrain) return h('div', { class: 'school-row' },
            miniCard(t.creature, { badge: p.done ? '✓ Ready' : '🌅 Morning' }),
            h('div', { class: 'school-info' },
              h('small', null, `Retraining: ${W.retrainSummary(t.creature, t.retrain)}.`),
              h('small', { class: 'muted' }, p.done ? 'Done. It loses Loyalty when you pick it up (the drills are harsh).' : `Come back in the morning to pick up ${nameOf(t.creature)}!`),
              h('button', { class: `btn ${p.done ? 'primary' : 'ghost'} sm`, disabled: !p.done, onclick: () => {
                const r = W.pickUpTraining(s, t.creature.uid);
                if (!r) return;
                sfx.good(); save(s); this.renderHud();
                toast(r.text, r.legendLeft ? 'bad' : 'good', 7000);
                render();
              } }, p.done ? 'Pick up' : 'Ready in the morning')));
          return h('div', { class: 'school-row' },
            miniCard(t.creature, { badge: p.done ? '✓ Done' : `${p.elapsed}/${t.turns}` }),
            h('div', { class: 'school-info' },
              h('div', { class: 'bar xp' }, h('i', { style: `width:${(p.xp / t.xp) * 100}%` })),
              h('small', null, p.done ? `Finished: ${p.xp} XP earned.` : `${p.xp}/${t.xp} XP · ${t.turns - p.elapsed} turn${t.turns - p.elapsed === 1 ? '' : 's'} to go`),
              h('button', { class: `btn ${p.done ? 'primary' : 'ghost'} sm`, onclick: async () => {
                if (!p.done && !(await confirmSheet(`Pick up ${nameOf(t.creature)} early?`, `It has earned ${p.xp} of ${t.xp} XP so far. The rest of the course is forfeited (no refund).`, 'Pick up now'))) return;
                const r = W.pickUpTraining(s, t.creature.uid);
                if (!r) return;
                await rollDice(`How was school? · ${r.name}`, [{ sides: 6, value: r.roll, tone: r.mood === 'great' ? 'good' : r.mood === 'rough' ? 'bad' : undefined }],
                  r.mood === 'great' ? 'Loved it: +2 Morale, +1 Loyalty' : r.mood === 'rough' ? 'Rough time: −2 Morale, −1 Loyalty' : 'Got through it fine', 900, { read: true });
                save(s); this.renderHud();
                toast(r.text, r.mood === 'rough' ? 'info' : 'good', 6000);
                render();
                const c = [...s.roster, ...s.reserve].find((x) => x.uid === t.creature.uid);
                if (c && c.points > 0) this.showCreature(c);
              } }, p.done ? 'Pick up' : 'Pick up early')));
        })) : h('p', { class: 'small muted' }, 'No one is training here.'),
        away.length ? h('p', { class: 'small muted' }, `Training elsewhere: ${away.map((t) => `${nameOf(t.creature)} (${NODE_BY_ID[t.school].name})`).join(', ')}.`) : '',
        h('h4', null, '📝 Enrol a creature'),
        h('div', { class: 'list' }, all.map((c) => miniCard(c, { selected: c.uid === pickUid, onClick: () => { pickUid = c.uid; render(); } }))),
        h('div', { class: 'school-pay' },
          h('span', null, 'Pay'),
          h('button', { class: 'btn ghost sm', onclick: step(-10) }, '−10'), h('button', { class: 'btn ghost sm', onclick: step(-2) }, '−2'),
          h('b', { class: 'school-coins' }, `💰 ${coins}`),
          h('button', { class: 'btn ghost sm', onclick: step(2) }, '+2'), h('button', { class: 'btn ghost sm', onclick: step(10) }, '+10'),
          h('small', { class: 'muted' }, `You have 💰 ${s.coins}`)),
        h('p', { class: 'small' }, `→ ${coins} XP over ${turns} turn${turns === 1 ? '' : 's'}`, target ? ` · ${nameOf(target)} would gain about ${levelsFor(target)} level${levelsFor(target) === 1 ? '' : 's'}` : '', '. It’s away from your team until you pick it up, and its mood about the stay is rolled when you do.'),
        h('div', { class: 'row end' },
          h('button', { class: 'btn primary', disabled: !!why, title: why ?? '', onclick: () => {
            if (!target) return;
            const t = W.enrollTraining(s, target.uid, coins);
            if (!t) return;
            sfx.good(); save(s); this.renderHud();
            toast(`${nameOf(target)} starts training: ${t.xp} XP over ${t.turns} turns. You’ll be told when it’s done.`, 'good', 4500);
            pickUid = null;
            render();
          } }, why && target ? why : `Enrol for 💰 ${coins}`)),
        retrainSection());
    };
    /** Pick a creature, then a new Nature, Ability and/or Instinct: each has its own price and costs 1 Loyalty. */
    const retrainSection = () => {
      const all = [...s.roster, ...s.reserve];
      if (rUid && !all.some((c) => c.uid === rUid)) rUid = null;
      const c = all.find((x) => x.uid === rUid);
      const order: Retrain = Object.fromEntries(W.RETRAIN_PARTS.filter((k) => pickR[k]).map((k) => [k, pickR[k]]));
      const cost = W.retrainCost(order), parts = W.retrainParts(order);
      const why = c ? W.retrainBlock(s, c.uid, order) : 'Choose a creature to retrain.';
      const label: Record<W.RetrainPart, string> = { nature: 'Nature', ability: 'Ability', instinct: 'Instinct' };
      const current: Record<W.RetrainPart, string> = c ? { nature: c.nature, ability: abilityOf(c), instinct: instinctIdOf(c) } : { nature: '', ability: '', instinct: '' };
      const options: Record<W.RetrainPart, { id: string; name: string; group?: string; text: string }[]> = {
        nature: NATURES.map((n) => ({ id: n.id, name: n.name, text: `+${n.up} / −${n.down}` })),
        ability: Object.values(ABILITIES).map((a) => ({ id: a.id, name: a.name, text: a.text })),
        instinct: INSTINCTS.map((i) => ({ id: i.id, name: i.name, group: TYPE_LABEL[i.type], text: i.text })),
      };
      const picker = (k: W.RetrainPart) => {
        const opts = options[k];
        const opt = (o: { id: string; name: string; text: string }) => h('option', { value: o.id, selected: pickR[k] === o.id, disabled: o.id === current[k] }, `${o.name}${o.id === current[k] ? ' (current)' : ''}`);
        const groups = [...new Set(opts.map((o) => o.group).filter(Boolean))] as string[];
        const chosen = opts.find((o) => o.id === pickR[k]);
        return h('div', { class: 'retrain-pick' },
          h('label', null, h('b', null, `${label[k]} `), h('small', { class: 'muted' }, `💰 ${W.RETRAIN_COST[k]} · −${W.RETRAIN_LOYALTY} Loyalty`)),
          h('select', { disabled: !c, onchange: (e: Event) => { pickR[k] = (e.target as HTMLSelectElement).value; render(); } },
            h('option', { value: '', selected: !pickR[k] }, c ? `Keep ${opts.find((o) => o.id === current[k])?.name ?? '—'}` : '—'),
            groups.length ? groups.map((g) => h('optgroup', { label: g }, opts.filter((o) => o.group === g).map(opt))) : opts.map(opt)),
          chosen ? h('small', null, chosen.text) : null);
      };
      const loyalty = W.RETRAIN_LOYALTY * parts.length;
      return h('div', { class: 'retrain' },
        h('h4', null, '🌅 Retraining'),
        h('p', { class: 'small' }, `The drill masters can rework a creature from the ground up: a new Nature (it keeps the number of perks it has unlocked), a new overworld Ability, or a new battle Instinct. Each change has its own price and costs ${W.RETRAIN_LOYALTY} Loyalty, as the drills are harsh. The creature stays overnight: it’s ready the next morning.`),
        h('div', { class: 'list' }, all.map((x) => miniCard(x, { selected: x.uid === rUid, onClick: () => { rUid = x.uid; pickR.nature = pickR.ability = pickR.instinct = ''; render(); } }))),
        h('div', { class: 'retrain-picks' }, W.RETRAIN_PARTS.map(picker)),
        c && parts.length ? h('p', { class: 'small' }, `→ ${W.retrainSummary(c, order)}. 💰 ${cost}, Loyalty −${loyalty}${c.loyalty < loyalty ? ` (it has ${c.loyalty})` : ''}. Ready on turn ${W.nextMorning(s.turn)} (the next morning).`) : null,
        h('div', { class: 'row end' },
          h('button', { class: 'btn primary', disabled: !!why, title: why ?? '', onclick: () => {
            if (!c) return;
            const t = W.enrollRetraining(s, c.uid, order);
            if (!t) return;
            sfx.good(); save(s); this.renderHud();
            toast(`Come back in the morning to pick up ${nameOf(c)}!`, 'good', 5000);
            rUid = null;
            pickR.nature = pickR.ability = pickR.instinct = '';
            render();
          } }, why && c ? why : `Retrain for 💰 ${cost}`)));
    };
    render();
    openSheet('Battle School', body, { wide: true });
  }

  /** Quillhaven's Research Facility: release a creature for coins (level × rarity rate). */
  researchSheet() {
    const s = this.s;
    const body = h('div');
    const render = () => {
      const all = [...s.roster, ...s.reserve];
      body.replaceChildren(
        h('p', { class: 'small' }, 'The researchers pay for every creature released into their care: its level × 2 for Common, × 3 Prime, × 4 Apex, × 5 Legendary. A released Legendary returns to its home on the map, where it can be challenged again.'),
        h('p', { class: 'small muted' }, 'Releasing is permanent. Your Codex keeps the record.'),
        h('div', { class: 'list' }, all.map((c) => {
          const why = W.releaseBlock(s, c.uid);
          const sp = speciesOf(c);
          const pay = W.researchPayout(c);
          const card = miniCard(c, { badge: `💰 ${pay}`, onClick: async () => {
            if (why) { toast(why, 'info'); return; }
            const ok = await confirmSheet(`Release ${nameOf(c)}?`,
              `${nameOf(c)} (Lv ${c.level}, ${sp.rarity}) goes to the Research Facility for good. You receive 💰 ${pay} (Lv ${c.level} × ${W.RESEARCH_RATE[sp.rarity]}).${sp.rarity === 'legendary' ? ' It returns to its legendary grounds on the map.' : ''}`,
              `Release for 💰 ${pay}`);
            if (!ok) return;
            const r = W.releaseToResearch(s, c.uid);
            if (!r) return;
            sfx.good();
            save(s);
            this.renderHud();
            toast(r.text, 'good', 4500);
            render();
          } });
          if (why) { card.classList.add('unpickable'); card.title = why; }
          return h('div', { class: 'swap-row' }, card,
            h('small', null, s.reserve.includes(c) ? 'In a totem · ' : 'Active · ', `${sp.rarity} × ${W.RESEARCH_RATE[sp.rarity]}`, why ? h('span', { class: 'muted' }, ` · ${why}`) : null));
        })));
    };
    render();
    openSheet('Research Facility', body, { wide: true });
  }

  /**
   * Notice Board tips. Some always point to where this season's roaming key items are sold (the
   * Canopy Rope and the Root Whistle change towns every game), so trainers can find them.
   */
  rumors() {
    const s = this.s;
    const rope = W.keyTownName(s, 'canopy-rope'), whistle = W.keyTownName(s, 'root-whistle');
    const keyTips = [
      `Dahlia waits on the Gloomshade forest floor. This season, ${rope} sells the Canopy Rope to get down.`,
      `The mangrove roots hide Katy. A Root Whistle opens the way, and ${whistle} has them this season.`,
    ];
    const tips = [
      'Amber\u2019s Fire Pit is on Kilauea island. Ferries run from Mangrove Port and Kilauea Forge; buy a Ferry Pass at Saltmarsh Landing or the Forge.',
      'Stella only surfaces her fortress for trainers who clear the Iron Coast Gauntlet: a run of local trainers, without leaving the city.',
      'They say Fabian always hides as a villager. Look closely.',
      'Salem only battles trainers who have walked a full lap of Cloud Island. Its portal in Aurora Peak opens at night, and all Winter.',
      'Sunspire Summit holds a legend. Tier 3 climbers with a Summit Pick only.',
      'Down the Sinkhole Stair below Houndmouth Canyon lies Shifting Depths. Leave an offering at the edge of the dark and something that craves it climbs up.',
      'The Research Facility at Quillhaven pays well for released creatures, and best of all for rare ones.',
      'The Battle School at Valor Ridge trains creatures while you travel: a coin per XP.',
      'Be at Circuit Stadium when Turn 100 ends — with all 8 Merits — or the season is over.',
    ];
    // one key-item hint is always posted (the rope or the whistle, whichever you still lack), plus three others
    const need = keyTips.filter((_, i) => !hasItem(s, ['canopy-rope', 'root-whistle'][i]));
    const pinned = (need.length ? need : keyTips)[Math.floor(Math.random() * (need.length || keyTips.length))];
    const rest = [...tips, ...keyTips.filter((t) => t !== pinned)].sort(() => Math.random() - 0.5).slice(0, 3);
    openSheet('Notice Board', h('ul', { class: 'tips' }, [pinned, ...rest].map((t) => h('li', null, '📌 ', t))));
  }

  // ── Getting around: Bike, Taxi Ticket, Homing Feather, Trail Mix ──
  /** Move the trainer's mini along `path` (first entry = where they start), one hop per node, and follow on the map. */
  async glide(path: string[]) {
    this.busy = true;
    this.selected = null;
    $('.node-preview')?.remove();
    this.world.setReach({});
    for (let i = 1; i < path.length; i++) {
      sfx.hop();
      this.feed({ kind: 'hop', from: path[i - 1], to: path[i] });
      await this.world.hop(path[i - 1], path[i]);
    }
    this.busy = false;
    this.syncWatchers();
  }

  travelItemFlow(id: string) {
    const s = this.s;
    if (id === 'bike') { void this.bikeFlow(); return; }
    if (id === 'taxi-ticket') { if (W.taxiTargets(s).length) this.taxiFlow(); else toast('Taxis only pick up in cities.', 'info'); return; }
    if (id === 'trail-mix') {
      const why = W.trailMixBlock(s);
      if (why) { toast(why, 'info'); return; }
      W.eatTrailMix(s); save(s); this.renderHud();
      toast('🥜 A handful of Trail Mix: +1 Initiative.', 'good');
      return;
    }
    if (id === 'homing-feather') {
      const why = W.travelBlock(s);
      const targets = W.featherTargets(s);
      if (why || !targets.length) { toast(why ?? 'You’re already home.', 'info'); return; }
      this.cityPicker('🕊️ Homing Feather', `It carries you to ${s.trainer.style === 'balanced' ? 'any city you’ve rested at' : 'your home city'}. This uses up the rest of your Initiative this turn.`, targets, async (to) => {
        const from = s.location;
        if (!W.useFeather(s, to)) return;
        save(s); await this.glide([from, to]); this.renderHud();
        toast(`🕊️ The feather sets you down in ${CITIES[to].name}.`, 'good');
      });
    }
  }

  /** A list of cities to pick from (for rides). */
  cityPicker(title: string, text: string, ids: string[], go: (id: string) => void) {
    const s = this.s;
    const close = openSheet(title, h('div', null,
      h('p', { class: 'small' }, text),
      h('div', { class: 'list' }, ids.map((id) => h('button', { class: 'choice city', style: `--tc:${TYPE_COLOR[CITIES[id].type]}`, onclick: () => { close(); go(id); } },
        h('div', { class: 'row gap-s' }, typeIconImg(CITIES[id].type, 22), h('b', null, CITIES[id].name)),
        h('small', { class: 'muted' }, [`Arbiter ${CITIES[id].arbiter}`, s.merits.includes(id) ? '✓ Merit earned' : '', id === s.trainer.home ? '🏠 Home' : '', s.visited.includes(id) ? '' : 'not visited yet'].filter(Boolean).join(' · ')))))));
  }

  taxiFlow() {
    const s = this.s;
    this.cityPicker('🚕 Taxi', 'Ride to any other city. This uses your Taxi Ticket and the rest of your Initiative this turn.', W.taxiTargets(s), async (to) => {
      const from = s.location;
      if (!W.rideTaxi(s, to)) return;
      save(s); await this.glide([from, to]); this.renderHud();
      toast(`🚕 The taxi drops you in ${CITIES[to].name}. You’re done travelling for today.`, 'good', 3500);
    });
  }

  /** Bike: roll a d6 (once a turn), then pick a node within that many steps. No Initiative, no exploring. */
  async bikeFlow() {
    const s = this.s;
    const why = W.bikeBlock(s);
    if (why) { toast(why, 'info'); return; }
    const fresh = !s.flags.bikeRoll;
    const n = W.rollBike(s)!;
    save(s);
    if (fresh) await rollDice('Bike ride', [{ sides: 6, value: n, tone: 'good', label: 'Steps' }], `Ride up to ${n} step${n === 1 ? '' : 's'} for free!`, 700, { read: true });
    this.renderHud();
    const reach = W.bikeReach(s, n);
    const ids = Object.keys(reach).sort((a, b) => reach[a].length - reach[b].length || NODE_BY_ID[a].name.localeCompare(NODE_BY_ID[b].name));
    const KIND_ICON: Record<string, string> = { city: '🏙️', town: '🏘️', stadium: '🏟️', arena: '🏟️' };
    const byDist = new Map<number, string[]>();
    for (const id of ids) { const d = reach[id].length; if (!byDist.has(d)) byDist.set(d, []); byDist.get(d)!.push(id); }
    const close = openSheet(`🚲 Ride up to ${n} step${n === 1 ? '' : 's'}`, h('div', null,
      h('p', { class: 'small' }, 'Pick where to stop. The ride costs no Initiative, and you won’t explore anywhere along the way, or where you stop (you can still Explore there after). Rides stay on land and keep to the usual gates.'),
      ids.length ? [...byDist.entries()].map(([d, list]) => h('section', null, h('h4', null, `${d} step${d === 1 ? '' : 's'}`),
        h('div', { class: 'list' }, list.map((id) => {
          const node = NODE_BY_ID[id];
          return h('button', { class: 'choice', onclick: async () => {
            close();
            const from = s.location;
            const path = W.rideBike(s, id);
            if (!path) return;
            save(s); await this.glide([from, ...path]); this.renderHud();
            toast(`🚲 You coast into ${node.name}.`, 'good');
          } }, h('b', null, `${KIND_ICON[node.kind] ?? BIOME_INFO[node.biome].icon} ${node.name}`), h('small', { class: 'muted' }, this.nodeSubtitle(id)));
        })))) : h('p', { class: 'muted' }, 'Nowhere to ride from here.'),
      h('p', { class: 'small muted' }, 'Close this to decide later: your roll waits on the 🚲 button until the turn ends.')),
      { wide: true });
  }

  /** Everything waiting to kick in: the Nabe's battle buff, an extra rarity die, Lure Incense, a wisp. */
  effectsSheet() {
    const list = W.activeEffects(this.s);
    openSheet('Active effects', h('div', null,
      list.length ? h('div', { class: 'list' }, list.map((e) => h('div', { class: 'effect-row' }, h('span', { class: 'effect-ico' }, e.icon), h('div', null, h('b', null, e.name), h('small', null, e.text)))))
        : h('p', { class: 'muted' }, 'Nothing active right now.'),
      h('p', { class: 'small muted' }, 'A Chanko Nabe lasts until your next battle. Lucky stars are used up by your next encounter; Lure Incense and Hush Smoke by your next explore.')));
  }

  /** Check the Fog Lantern: a wisp held in it, or where the next one waits (marked on the map from now on). */
  lanternSheet() {
    const s = this.s;
    if (!hasItem(s, 'fog-lantern')) return;
    if (!wispLit(s) && !s.flags.wispAt) rollWisp(s);
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
    this.renderHud();
    // steps by road from here (ignoring Initiative and gates)
    const dist: Record<string, number> = { [s.location]: 0 };
    const q = [s.location];
    while (q.length && dist[at] === undefined) { const id = q.shift()!; for (const nb of neighbors(id)) if (dist[nb.node.id] === undefined) { dist[nb.node.id] = dist[id] + 1; q.push(nb.node.id); } }
    const n = NODE_BY_ID[at];
    const close = openSheet('🏮 Fog Lantern', h('div', null,
      h('p', null, 'The lantern is empty, but its flame leans one way: a wisp waits at ', h('b', null, n.name), ` (${this.nodeSubtitle(at).split(' · ')[0]}), ${dist[at] ?? '?'} step${dist[at] === 1 ? '' : 's'} away.`),
      h('p', { class: 'small' }, 'Go there to catch it. A wisp in your lantern lights the misty way from Fogbank Path to Lantern Glade and the Rainbow Plains. It drifts home when you leave them, so every visit takes a new one.'),
      h('p', { class: 'small muted' }, 'The wisp is marked on the map with a little light.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { close(); this.world.focus(at); } }, 'Show on map'))));
  }

  stadiumSheet() {
    const s = this.s;
    openSheet('Circuit Stadium', h('div', null,
      h('p', null, 'The grand tournament of Margos convenes here when the year ends. Be standing in this stadium as Turn 100 ends with all 8 Merits to enter the bracket.'),
      h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, `Merits: ${s.merits.length}/8`), h('span', { class: 'chip' }, `Turn ${s.turn}/100`)),
      h('p', { class: 'small muted' }, 'Bracket: 8 trainers, 3v3 elimination. Your team is fully restored between matches.')));
  }

  // ════════════════════════════════════════════════════════════
  // Team, bag, follower
  // ════════════════════════════════════════════════════════════
  teamSheet() {
    const s = this.s;
    const body = h('div', null,
      h('div', { class: 'list' }, s.roster.map((c) => miniCard(c, { badge: c.uid === s.following ? 'Following' : undefined, onClick: () => this.showCreature(c) }))),
      s.reserve.length ? [h('h4', null, `Resting in totems (${s.reserve.length})`), h('div', { class: 'list' }, s.reserve.map((c) => miniCard(c, { onClick: () => this.showCreature(c) }))), h('p', { class: 'small muted' }, 'Swap your active team for free in any city or town (🔄 Swap Team).')] : null);
    if (s.training?.length) body.append(h('h4', null, `🥋 At Battle School (${s.training.length})`),
      h('p', { class: 'small muted' }, s.training.map((t) => { const p = W.trainingProgress(s, t); if (t.retrain) return `${nameOf(t.creature)} at ${NODE_BY_ID[t.school].name}: retraining, ${p.done ? 'ready to pick up' : 'ready in the morning'}`; return `${nameOf(t.creature)} at ${NODE_BY_ID[t.school].name}: ${p.done ? 'finished, ready to pick up' : `${p.xp}/${t.xp} XP, ${t.turns - p.elapsed} turns to go`}`; }).join(' · ')));
    openSheet('Your Team', body, { wide: true });
  }

  showCreature(c: CreatureInst, readOnly = false) {
    if (this.watching) readOnly = true;
    const close = openSheet(nameOf(c), creatureCard(c, { editable: !readOnly, teammates: this.teammatesOf(c), onChange: () => { save(this.s); if (!readOnly) this.renderHud(); } }), { wide: true, cls: 'card-sheet' });
    void close;
  }

  pickFollower() { if (!this.watching) void this.followerSheet(false); }

  /**
   * Choose who follows you. Shown at the start of every turn (Settings → "Choose a follower each turn")
   * and from the HUD's Following chip. Shows the current follower's Ability, Instinct, Morale and
   * Loyalty, and every other creature that could follow. Closing keeps the current follower.
   */
  followerSheet(turnStart: boolean): Promise<void> {
    const s = this.s;
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (done) return; done = true; close(); save(s); this.renderHud(); resolve(); };
      const cur = follower(s);
      const social = (c: CreatureInst) => h('span', { class: 'row gap-s' },
        h('button', { class: `chip social ${c.morale <= MORALE_LOW ? 'bad' : c.morale >= 7 ? 'good' : ''}`, title: 'How Morale works', onclick: () => socialHelp(c) }, c.morale <= MORALE_LOW ? '⚠️ ' : '💖 ', 'Morale ', h('b', null, c.morale), '/10'),
        h('button', { class: `chip social ${speciesOf(c).rarity === 'legendary' && c.loyalty <= 3 ? 'bad' : ''}`, title: 'How Loyalty works', onclick: () => socialHelp(c) }, speciesOf(c).rarity === 'legendary' ? '⏳ ' : '🤝 ', 'Loyalty ', h('b', null, c.loyalty), '/10'));
      const abilityLine = (c: CreatureInst) => {
        const ab = ABILITIES[abilityOf(c)];
        return h('small', null, '🌿 ', h('b', null, ab.name), ' · ', ab.text);
      };
      const current = cur
        ? h('div', { class: 'follow-current', style: `--tc:${TYPE_COLOR[speciesOf(cur).types[0]]}` },
          h('img', { src: portrait(cur.species), alt: '' }),
          h('div', { class: 'follow-info' },
            h('small', { class: 'muted' }, 'Following you now'),
            h('h3', null, nameOf(cur), h('small', null, ` · Lv ${cur.level}`)),
            h('p', { class: 'small' }, '🌿 ', h('b', null, `Ability · ${ABILITIES[abilityOf(cur)].name}`), ': ', ABILITIES[abilityOf(cur)].text, h('span', { class: 'muted' }, ' (active while it follows)')),
            INSTINCT_BY_ID[instinctIdOf(cur)] ? h('p', { class: 'small' }, `${INSTINCT_ICON} `, h('b', null, `Instinct · ${INSTINCT_BY_ID[instinctIdOf(cur)].name}`), ': ', INSTINCT_BY_ID[instinctIdOf(cur)].text, h('span', { class: 'muted' }, ' (in battle)')) : null,
            social(cur)))
        : h('div', { class: 'follow-current none' }, h('p', null, 'Nobody is following you. You’ll choose who leads each battle, and no overworld Ability is active.'));
      const others = s.roster.filter((c) => c.uid !== cur?.uid);
      const close = openSheet(turnStart ? `Turn ${s.turn} · Who follows you?` : 'Who follows you?', h('div', { class: 'follow' },
        current,
        h('p', { class: 'small muted' }, 'Your Following creature leads every battle, uses its Ability on the map, and gains +1 Morale every other turn (high Morale builds Loyalty).'),
        others.length ? h('h4', null, 'Or choose another') : null,
        h('div', { class: 'list' }, others.map((c) => h('div', { class: 'swap-row' },
          miniCard(c, { onClick: () => { if (c.ko) { toast('KO\'d creatures can\'t follow.', 'bad'); return; } s.following = c.uid; finish(); } }),
          h('div', { class: 'follow-meta' }, abilityLine(c), social(c))))),
        h('div', { class: 'row gap end sticky-foot' },
          h('button', { class: 'btn ghost', onclick: () => { s.following = null; finish(); } }, 'Nobody follows'),
          h('button', { class: 'btn primary', onclick: () => finish() }, cur ? `Keep ${nameOf(cur)}` : 'Continue'))),
        { wide: true, onClose: () => finish() });
    });
  }

  /** The bag. `readOnly` (online, while someone else plays): look but don't use. */
  bagSheet(s: GameState = this.s, readOnly = false) {
    const body = h('div');
    const render = () => {
      const groups: Record<string, string[]> = { restore: [], treat: [], charm: [], travel: [], totem: [], material: [], key: [] };
      for (const id of Object.keys(s.inventory)) groups[itemInfo(id).kind]?.push(id);
      const labels: Record<string, string> = { restore: 'Restoratives', treat: 'Treats', charm: 'Charms', travel: 'Travel', totem: 'Totems', material: 'Offering & Carving Materials', key: 'Key Items' };
      body.replaceChildren(
        h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, '💰 ', h('b', null, s.coins)), s.flags.lure ? h('span', { class: 'chip good' }, '🕯️ Lure active') : null, s.flags.repel ? h('span', { class: 'chip good' }, '💨 Hush Smoke active') : null, s.flags.starCharm ? h('span', { class: 'chip good' }, '⭐ Star Charm active') : null),
        ...Object.entries(groups).filter(([, v]) => v.length).map(([k, ids]) => h('section', null, h('h4', null, labels[k]),
          h('div', { class: 'bag-grid' }, ids.map((id) => {
            const it = itemInfo(id);
            const usable = ['restore', 'treat', 'charm', 'travel'].includes(it.kind);
            return h('div', { class: 'bag-item' }, h('span', { class: 'bi-ico' }, it.icon), h('div', null, h('b', null, W.itemDisplayName(id), ' ×', s.inventory[id]), h('small', null, it.text), it.kind === 'material' ? materialDetail(it) : null),
              usable && !readOnly ? h('button', { class: 'btn sm', onclick: () => this.useItemFlow(id, render) }, 'Use') : null,
              id === 'fog-lantern' && !readOnly ? h('button', { class: 'btn sm', onclick: () => this.lanternSheet() }, 'Check') : null);
          })))),
        Object.keys(s.inventory).length === 0 ? h('p', { class: 'muted' }, 'Your bag is empty.') : '',
        Object.keys(s.cloudLoot ?? {}).length ? h('section', { class: 'cloud-satchel' }, h('h4', null, '☁️ Cloud satchel (not yet secured)'),
          h('p', { class: 'small' }, 'Items found on Cloud Island stay in this satchel until you escape the island through the portal. If your team is wiped out and you’re sent home, they’re lost.'),
          h('div', { class: 'bag-grid' }, Object.entries(s.cloudLoot!).map(([id, n]) => h('div', { class: 'bag-item' }, h('span', { class: 'bi-ico' }, itemInfo(id).icon), h('div', null, h('b', null, W.itemDisplayName(id), ' ×', n), h('small', null, itemInfo(id).text)))))) : '',
        readOnly ? h('p', { class: 'small muted' }, 'Items can be used on your turn.') : '');
    };
    openSheet('Bag', body, { wide: true });
    render();
  }

  useItemFlow(id: string, after: () => void) {
    const s = this.s;
    const it = itemInfo(id);
    if (it.kind === 'charm') { const m = W.useItem(s, id, s.roster[0].uid); if (m) toast(m, 'good'); save(s); after(); return; }
    if (it.kind === 'travel') { closeAllSheets(); this.travelItemFlow(id); return; }
    const close = openSheet(`Use ${it.name} on…`, h('div', { class: 'list' }, [...s.roster, ...s.reserve].map((c) => miniCard(c, { onClick: () => {
      const m = W.useItem(s, id, c.uid);
      if (m) toast(m, m.includes('must') || m.includes('can\'t') ? 'bad' : 'good', 2800);
      save(s); close(); after(); this.renderHud();
    } }))));
  }

  // ════════════════════════════════════════════════════════════
  // Turn flow
  // ════════════════════════════════════════════════════════════
  /** True (and the event reopens) if an start-of-turn event is still waiting for an answer. */
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
    const per = W.campPerInitiative(s);
    const limit = s.initiative * per;
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
      h('p', { class: 'small' }, `Camping ends your turn and uses all ${s.initiative} Initiative you have left. Each point tends ${per === 1 ? 'one creature' : `${per} creatures (Caretaker)`}: it recovers all its Vitality and shakes off Fatigue.`),
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
    const match = activeMatchOf();
    // hotseat: no weather roll here; the first trainer to start the next turn rolls it for everyone
    const r = W.endTurn(s, camping, match ? match.rolls[s.turn + 1] ?? null : undefined);
    // Morale: warnings for creatures that just became unhappy, then any d10 checks for those already warned
    for (const td of r.trainingDone) toast(td.retrain ? `🌅 ${td.name}’s retraining at ${td.school} is done. Pick it up there.` : `🥋 ${td.name} has finished training at ${td.school}. Pick it up there.`, 'good', 6000);
    for (const lg of r.legendsReturned) toast(`✨ ${lg.name} has left your side and returned to ${lg.home}. Another trainer may find it there.`, 'info', 6000);
    for (const c of [...s.roster, ...s.reserve]) {
      if (speciesOf(c).rarity === 'legendary' && c.loyalty <= 3) toast(`✨ ${nameOf(c)}’s Loyalty is fading: it leaves in ${c.loyalty} turn${c.loyalty === 1 ? '' : 's'} unless you give it treats, or release it at Quillhaven’s Research Facility first.`, 'bad', 5000);
    }
    for (const n of r.warned) toast(`⚠️ ${n} is unhappy and might leave. Raise its Morale (win battles, let it Follow you, give it treats) before the turn ends again.`, 'bad', 6000);
    for (const ch of r.checks) {
      await rollDice(`Morale check · ${ch.name}`, [{ sides: 10, value: ch.roll, tone: ch.left ? 'bad' : 'good' }],
        ch.left ? `Rolled ${ch.roll}, above Loyalty ${ch.loyalty}: ${ch.name} leaves.` : `Rolled ${ch.roll}, not above Loyalty ${ch.loyalty}: ${ch.name} stays, but loses 1 Loyalty.`, 900, { read: true });
    }
    for (const n of r.left) toast(`${n} lost faith in you and returned to the wild…`, 'bad', 4000);
    if (r.ended === 'endgame') { this.busy = false; save(s); this.renderHud(); this.endgameSheet(); return; }
    if (r.ended === 'over') { this.busy = false; save(s); this.gameOver(); return; }
    if (match) {
      // hotseat: pass the device to the next trainer (the weather is rolled at the start of the round)
      this.busy = false;
      save(s);
      await this.handoff();
      return;
    }
    const se = season(s);
    if (r.seasonChanged) await this.banner(`${SEASON_INFO[se].icon} ${SEASON_INFO[se].label}`, `Turn ${s.turn} — the season turns in Margos.`);
    const w = WEATHER[s.weather];
    await rollDice(`Weather · ${SEASON_INFO[se].label}`, [{ sides: 6, value: r.weatherRoll, face: w.icon, label: w.name }], `${w.name}: ${w.text}`, 650, { read: true });
    this.busy = false;
    save(s);
    this.renderHud();
    await this.startOfTurn();
  }

  /**
   * Show the pending start-of-turn event and resolve the player's answer. Closing the window does NOT
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
          ch.preview ? h('p', { class: 'small muted' }, 'Tap a creature to compare before and after, then confirm.') : null,
          h('div', { class: 'list' }, all.map((c) => {
            const why = ch.canPick?.(c) ?? null;
            const commit = () => { closePick(); done({ choice: ch.id, uid: c.uid }); };
            // with a preview, show the before/after first and only commit on Confirm
            const compare = () => {
              const { after, note } = ch.preview!(c);
              const closeCmp = openSheet(`${view.title} · ${ch.label}`, h('div', null,
                statCompare(c, after, view.id === 'trader' ? ['You give', 'You get'] : ['Now', 'After']),
                note ? h('p', { class: 'small' }, note) : null,
                h('div', { class: 'row gap end' },
                  h('button', { class: 'btn ghost', onclick: () => closeCmp() }, '← Back'),
                  h('button', { class: 'btn primary', onclick: () => { closeCmp(); commit(); } }, 'Confirm'))), { wide: true });
            };
            const card = miniCard(c, { badge: why ? '✕' : undefined, onClick: () => { if (why) { toast(why, 'info'); return; } if (ch.preview) compare(); else commit(); } });
            if (why) { card.classList.add('unpickable'); card.title = why; }
            return card;
          }))), { wide: true });
      };
      const body = h('div', { class: 'event' },
        h('div', { class: 'event-head' }, h('span', { class: 'event-ico' }, view.icon), h('p', null, view.text)),
        // a creature on offer: tap to inspect its full card before deciding
        view.showcase ? h('div', { class: 'event-offer' },
          h('small', null, 'On offer (shown at this area’s level; it matches the level of whoever you trade)'),
          miniCard(view.showcase, { onClick: () => openSheet(nameOf(view.showcase!), creatureCard(view.showcase!, { editable: false }), { wide: true }) })) : null,
        h('div', { class: 'event-choices' }, view.choices.map((ch) =>
          h('button', { class: `event-choice ${ch.id === 'decline' ? 'ghost' : ''}`, disabled: !!ch.disabled, onclick: () => choose(ch) },
            h('b', null, ch.label),
            ch.disabled ? h('small', { class: 'bad-text' }, ch.disabled) : ch.detail ? h('small', null, ch.detail) : null))));
      const close = openSheet(`${view.title}`, h('div', null, body,
        h('p', { class: 'small muted center' }, 'Close this to check your team first. The event waits at the bottom of the screen.')),
        { cls: 'event-sheet', onClose: () => { if (!settled) { settled = true; resolve(null); } } });
    });
    if (!answer) { this.renderHud(); return; }
    const before = s.location;
    const r = E.resolveEvent(s, answer.choice, answer.uid);
    if (!r) { this.renderHud(); return; }
    save(s);
    if (s.location !== before) await this.glide([before, s.location]); // a ride (balloon, coach): carry the mini there
    this.renderHud();
    toast(r.text, r.tone, 3500);
    if (r.battle) {
      await wait(400);
      await this.runBattle(r.battle, { kind: r.battle.sides[1].kind === 'wild' ? 'wild' : 'trainer', intro: r.text });
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
      this.afterFinishButton())));
  }

  /** At a trainer's Champion / Season Over screen: in hotseat, carry on with the others; solo, start over. */
  afterFinishButton() {
    const m = activeMatchOf();
    if (m && m.players.includes(this.s)) {
      save(this.s);
      return nextSeat(m) >= 0
        ? h('button', { class: 'btn primary big', onclick: () => this.handoff() }, 'Continue the season →')
        : h('button', { class: 'btn primary big', onclick: () => this.matchSummary() }, 'Final standings →');
    }
    return h('button', { class: 'btn primary big', onclick: () => { clearSave(); this.title(); } }, 'New Journey');
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
      this.afterFinishButton())));
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
  /** Change the trainer's appearance mid-journey: the map token and battle mini update at once. */
  trainerLookSheet() {
    const s = this.s;
    const body = h('div');
    const render = () => body.replaceChildren(trainerLookEditor(() => ({ name: s.trainer.name, color: s.trainer.color, look: s.trainer.look ?? {} }), (c, l) => {
      s.trainer.color = c; s.trainer.look = l;
      save(s);
      this.world.setTrainerLook(playerLook(s.trainer.name, c, l));
      render();
    }, takenColors(activeMatchOf(), s)));
    render();
    openSheet('Trainer Look', body, { wide: true });
  }

  /**
   * The Trainer ID: who you are (home town, trainer style and its rules, Tier, Merits) and how the journey
   * has gone (records per kind of battle, creatures met, favourite move types). Stats live in
   * `s.stats` (state.ts → TrainerStats) and are counted in world.ts → recordBattle, claimFind, moveTo
   * and state.ts → earnCoins.
   */
  trainerId() {
    const s = this.s, st = s.stats;
    const style = TRAINER_STYLES.find((x) => x.id === s.trainer.style)!;
    const tier = tierOf(s);
    // a stable, made-up ID number from who the trainer is
    let hsh = 7; for (const ch of `${s.trainer.name}|${s.trainer.home}|${s.trainer.style}`) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const idNo = String(hsh % 100000).padStart(5, '0');
    const home = NODE_BY_ID[s.trainer.home];
    const homeCity = CITIES[s.trainer.home];
    const styleNow = s.trainer.style === 'nature' ? `This turn: ${W.rangerRefundsLeft(s)} of ${tier} Initiative refunds left.`
      : s.trainer.style === 'pathfinder' ? `This turn: free first move ${s.flags.firstMoveUsed ? 'used' : 'ready'}.`
      : s.trainer.style === 'balanced' ? `If your team is wiped out, you can return to: ${W.restedCities(s).map((id) => CITIES[id].name).join(', ')}. Rest at a city’s stable to add it.`
      : null;
    const fact = (label: string, value: string | number) => h('div', { class: 'tid-fact' }, h('b', null, String(value)), h('small', null, label));
    const rec = st.record ?? {};
    const RECORD_ROWS: [BattleKind, string][] = [['wild', 'Wild creatures'], ['trainer', 'Trainers'], ['arbiter', 'Arbiters'], ['legendary', 'Legendaries'], ['rival', 'Rival duels'], ['endgame', 'Circuit Finals']];
    const rows = RECORD_ROWS.filter(([k]) => k === 'wild' || k === 'trainer' || k === 'arbiter' || rec[k]);
    const types = Object.entries(st.moveTypes ?? {}).filter(([t, n]) => (n ?? 0) > 0 && t in TYPE_LABEL).sort((a, b) => b[1]! - a[1]!) as [ElementType, number][];
    const used = types.reduce((a, [, n]) => a + n, 0);
    const body = h('div', { class: 'tid' },
      h('div', { class: 'tid-card', style: `--tc:${s.trainer.color}` },
        h('img', { class: 'tid-portrait', src: trainerPortrait(playerLook(s.trainer.name, s.trainer.color, s.trainer.look ?? {})), alt: '' }),
        h('div', { class: 'tid-who' },
          h('small', { class: 'tid-no' }, `TRAINER ID · No. ${idNo}`),
          h('h3', null, s.trainer.name),
          h('div', null, h('small', { class: 'muted' }, 'Home town '), h('b', null, home?.name ?? '—'), homeCity ? h('small', { class: 'muted' }, ` · ${TYPE_LABEL[homeCity.type]} City, Arbiter ${homeCity.arbiter}`) : null),
          h('div', null, h('small', { class: 'muted' }, 'Tier '), h('b', null, `${tier}`), h('small', { class: 'muted' }, ` · ${s.merits.length}/8 Merits · Turn ${s.turn}/100`)))),
      h('h4', null, `${style.icon} ${style.name}`),
      h('div', { class: 'tid-style' },
        h('p', null, h('b', null, '⬆ '), style.perk),
        h('p', null, h('b', null, '⬇ '), style.drawback),
        styleNow ? h('p', { class: 'small muted' }, styleNow) : null),
      h('h4', null, '🏅 Merits'),
      s.merits.length ? h('div', { class: 'row gap-s wrap' }, s.merits.map((id) => CITIES[id]).filter(Boolean).map((c) => h('span', { class: 'chip', style: `border-color:${TYPE_COLOR[c.type]}` }, h('img', { src: typeIcon(c.type), alt: '', style: 'width:16px;height:16px' }), `${c.accolade} · ${c.arbiter}`)))
        : h('p', { class: 'small muted' }, 'None yet. Beat a city’s Arbiter to earn its Merit.'),
      h('h4', null, '📊 Journey'),
      h('div', { class: 'tid-facts' },
        fact('creatures encountered', st.encountered ?? 0), fact('recruited', st.recruited), fact('Codex seen / recruited', `${s.dex.seen.length} / ${s.dex.caught.length}`),
        fact('foes knocked out', st.foesKO ?? 0), fact('times explored', st.explored), fact('items found', st.itemsFound ?? 0), fact('items crafted', st.crafted ?? 0), fact('Initiative spent on odd jobs', st.worked ?? 0),
        fact('places visited', s.visited.length), fact('steps travelled', st.steps ?? 0), fact('coins earned', st.coinsEarned ?? 0)),
      h('h4', null, '⚔️ Battle record'),
      h('table', { class: 'tid-record' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Won'), h('th', null, 'Lost'), h('th', null, 'Ran'))),
        h('tbody', null, rows.map(([k, label]) => { const r = rec[k] ?? { won: 0, lost: 0, ran: 0 }; return h('tr', null, h('td', null, label), h('td', null, r.won), h('td', null, r.lost), h('td', null, k === 'wild' || k === 'legendary' ? r.ran : '—')); }))),
      h('h4', null, '✨ Favoured move types'),
      used ? h('div', { class: 'tid-types' }, types.slice(0, 5).map(([t, n]) => h('div', { class: 'tid-type' },
        h('span', { class: 'tid-type-name' }, h('img', { src: typeIcon(t), alt: '' }), TYPE_LABEL[t] ?? t),
        h('span', { class: 'tid-bar' }, h('i', { style: `width:${Math.round((n / types[0][1]) * 100)}%;background:${TYPE_COLOR[t] ?? 'var(--ink-2)'}` })),
        h('small', null, `${n} · ${Math.round((n / used) * 100)}%`))))
        : h('p', { class: 'small muted' }, 'No moves used in battle yet.'),
      st.trackedFrom ? h('p', { class: 'small muted' }, `Detailed stats have been kept since Turn ${st.trackedFrom}, when this journey was first loaded with the Trainer ID.`) : null);
    openSheet('Trainer ID', body, { wide: true });
  }

  /** The 📜 Battle Log: every move, roll, hit and status of the current (or last) battle, grouped by round. */
  battleLogSheet() {
    const lg = this.lastBattleLog;
    if (!lg) { toast('No battle yet this session.', 'info'); return; }
    const rounds = new Map<number, BattleLogEntry[]>();
    for (const e of lg.entries) { if (!rounds.has(e.round)) rounds.set(e.round, []); rounds.get(e.round)!.push(e); }
    const body = h('div', { class: 'blog' },
      h('p', { class: 'small muted' }, 'Every move, roll and hit, with the numbers behind them. ', h('span', { class: 'blog-you' }, 'Your side'), ' · ', h('span', { class: 'blog-foe' }, 'the foe'), '.'),
      [...rounds.entries()].map(([r, list]) => h('section', { class: 'blog-round' },
        h('h4', null, r === 0 ? 'Start' : `Round ${r}`),
        h('ol', null, list.map((e) => h('li', { class: `blog-line ${e.tone ?? ''} ${e.side === 0 ? 'you' : e.side === 1 ? 'foe' : ''}` },
          h('span', null, e.text), e.detail ? h('small', null, e.detail) : null))))));
    openSheet(`📜 Battle Log`, body, { wide: true });
    // open at the latest line
    requestAnimationFrame(() => { const sc = body.closest('.sheet-body') as HTMLElement | null; if (sc) sc.scrollTop = sc.scrollHeight; });
  }

  /** Abandon the journey being played: the hotseat match (all trainers) or the solo save, never the other one. */
  async abandon() {
    const m = activeMatchOf();
    const hotseat = !!m && m.players.includes(this.s);
    const ok = await confirmSheet(hotseat ? 'Abandon this hotseat game?' : 'Abandon journey?',
      hotseat ? `This permanently deletes the hotseat save for all ${m!.players.length} trainers (${m!.players.map((p) => p.trainer.name).join(', ')}). Your solo journey, if you have one, is kept.` : 'This permanently deletes your solo save. A hotseat game, if you have one, is kept.',
      'Delete');
    if (!ok) return;
    if (hotseat) clearMatch(); else clearSave();
    this.title();
  }

  menu() {
    const close = openSheet('Menu', h('div', { class: 'tiles' },
      tile('📇', 'Trainer ID', `${this.s.trainer.name} of ${NODE_BY_ID[this.s.trainer.home]?.name ?? 'nowhere'}: style, Merits and battle records.`, '', () => { close(); this.trainerId(); }),
      tile('📖', 'Creature Codex', `${this.s.dex.caught.length} recruited · ${this.s.dex.seen.length} seen`, '', () => { close(); this.codex(); }),
      tile('🌀', 'Status Effects', 'What Burn, Sunder, Daze and the rest do.', '', () => { close(); openSheet('Status Effects', statusGuide()); }),
      tile('🔺', 'Type Chart', 'Strengths and weaknesses.', '', () => { close(); typeChartSheet(); }),
      tile('📜', 'Journal', 'Recent events.', '', () => { close(); this.journal(); }),
      this.lastBattleLog ? tile('⚔️', 'Last Battle Log', 'Every move, roll and hit from your last battle.', '', () => { close(); this.battleLogSheet(); }) : null,
      this.watching ? null : tile('🧢', 'Trainer Look', 'Skin, hair, hat, jacket and colours for your mini.', '', () => { close(); this.trainerLookSheet(); }),
      tile('❓', 'How to Play', 'The full guide, by topic: basics, creatures, battles, places, multiplayer.', '', () => { close(); this.howToPlay(); }),
      tile('⚙️', 'Settings', 'Sound, dice speed, motion, double-tap travel.', '', () => { close(); this.settingsSheet(); }),
      tile('📌', 'Save a copy', 'Keep a named snapshot of this game to load later (💾 Saves on the title screen).', '', () => { close(); void this.saveCopyNow(); }),
      tile('🏠', 'Title Screen', 'Your game is autosaved.', '', () => { close(); this.title(); }),
      this.online ? tile('🚪', 'Leave online game', 'Go back to the title screen. You can rejoin with the room code.', '', () => { close(); this.leaveOnline(); })
        : tile('🗑️', 'Abandon Journey', activeMatchOf()?.players.includes(this.s) ? 'Delete this hotseat game (every trainer’s progress).' : 'Delete this save.', '', async () => { close(); await this.abandon(); })));
  }

  settingsSheet() {
    const body = h('div');
    const render = () => {
      const st = settings();
      const toggle = (k: 'sound' | 'fastDice' | 'reduceMotion' | 'doubleTapTravel' | 'fastBattle' | 'followerPrompt' | 'turnPing', label: string, text: string) =>
        h('label', { class: 'toggle' }, h('div', null, h('b', null, label), h('small', null, text)),
          h('input', { type: 'checkbox', role: 'switch', checked: st[k], onchange: (e: Event) => { setSetting(k, (e.target as HTMLInputElement).checked); if (k === 'sound' && st[k] === false) sfx.tap(); render(); } }));
      body.replaceChildren(
        toggle('sound', 'Sound effects', 'Dice, hits and fanfares (synthesized, no downloads).'),
        toggle('fastDice', 'Fast dice', 'Shorter dice-roll animations for quicker turns.'),
        toggle('fastBattle', 'Fast battles', 'Pick a move and it resolves at once, with no move readout, no damage dice and short pauses. Off: each move shows what it will roll first, and every roll is explained as it happens.'),
        toggle('reduceMotion', 'Reduce motion', 'Tones down UI animations.'),
        toggle('doubleTapTravel', 'Double-tap shortcuts', 'Double-tap (or double-click) an adjacent node to travel there without the Travel button, or the city or town you’re in to open its menu.'),
        toggle('turnPing', 'Turn ping (online)', 'Play a ping and flag the browser tab when it becomes your turn while you’re in another tab.'),
        toggle('followerPrompt', 'Choose a follower each turn', 'At the start of every turn, show who is following you (Ability, Morale, Loyalty) and offer to switch.'),
        h('p', { class: 'small muted' }, 'Keyboard: 1–4 pick a move (Enter to confirm its readout, Esc to go back), B catch breath, S swap, R run, T type chart, Esc closes panels.'));
    };
    render();
    openSheet('Settings', body);
  }

  /** Codex filters, kept while the game is open. */
  private codexView: { q: string; type: ElementType | 'all'; biome: Biome | 'all'; rarity: Rarity | 'all'; status: 'all' | 'seen' | 'caught' | 'unseen'; time: 'all' | 'day' | 'night'; sort: 'codex' | 'name' | 'rarity' | 'type' } =
    { q: '', type: 'all', biome: 'all', rarity: 'all', status: 'all', time: 'all', sort: 'codex' };

  /**
   * The Creature Codex: every species, filterable by name, type (either half of a dual type), biome
   * (where it or an earlier stage turns up), rarity and whether you've seen or recruited it.
   */
  codex() {
    const s = this.s;
    const v = this.codexView;
    const RARITIES: Rarity[] = ['common', 'prime', 'apex', 'legendary'];
    const rank = (r: Rarity) => RARITIES.indexOf(r);
    const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
    const biomes = Object.keys(BIOME_INFO) as Biome[];
    const status = (id: string) => (s.dex.caught.includes(id) ? 'caught' : s.dex.seen.includes(id) ? 'seen' : 'unseen');
    const seenCount = SPECIES.filter((sp) => s.dex.seen.includes(sp.id)).length;
    const caughtCount = SPECIES.filter((sp) => s.dex.caught.includes(sp.id)).length;

    const matches = (sp: Species) => {
      const st = status(sp.id);
      if (v.status !== 'all' && (v.status === 'seen' ? st === 'unseen' : st !== v.status)) return false;
      if (v.type !== 'all' && !sp.types.includes(v.type)) return false;
      if (v.rarity !== 'all' && sp.rarity !== v.rarity) return false;
      if (v.biome !== 'all' && !W.speciesBiomes(sp.id).includes(v.biome)) return false;
      if (v.time !== 'all' && !isActive(sp, v.time)) return false;
      const q = v.q.trim().toLowerCase();
      if (q && (st === 'unseen' || !sp.name.toLowerCase().includes(q))) return false; // unseen names stay secret
      return true;
    };
    const sorted = (list: Species[]) => {
      if (v.sort === 'codex') return list;
      const name = (sp: Species) => (status(sp.id) === 'unseen' ? '\uffff' : sp.name); // unknowns last
      return [...list].sort((a, b) =>
        v.sort === 'name' ? name(a).localeCompare(name(b))
          : v.sort === 'rarity' ? rank(a.rarity) - rank(b.rarity) || name(a).localeCompare(name(b))
            : TYPES.indexOf(a.types[0]) - TYPES.indexOf(b.types[0]) || a.stage - b.stage);
    };

    const grid = h('div', { class: 'dex-grid' });
    const count = h('small', { class: 'muted' });
    const toolbar = h('div', { class: 'dex-tools' });
    const renderGrid = () => {
      const list = sorted(SPECIES.filter(matches));
      count.textContent = `Showing ${list.length} of ${SPECIES.length}`;
      grid.replaceChildren(...(list.length ? list.map((sp) => {
        const st = status(sp.id);
        const known = st !== 'unseen';
        return h(known ? 'button' : 'div', { class: `dex-entry ${st === 'caught' ? 'caught' : known ? 'seen' : 'unknown'}`, style: `--tc:${TYPE_COLOR[sp.types[0]]}`, title: known ? `${sp.name} · ${cap(sp.rarity)} · Stage ${sp.stage}` : 'Not seen yet', onclick: known ? () => this.codexEntry(sp.id) : undefined },
          known ? h('img', { src: portrait(sp.id), alt: '' }) : h('div', { class: 'qm' }, '?'),
          h('b', null, known ? sp.name : '???'),
          h('div', { class: 'row gap-xs center' }, known ? sp.types.map((t) => typeIconImg(t, 14)) : null, h('span', { class: `dex-rarity r-${sp.rarity}`, title: cap(sp.rarity) }, '★'.repeat(rank(sp.rarity) + 1)), st === 'caught' ? h('span', { title: 'Recruited' }, '🗿') : null));
      }) : [h('p', { class: 'muted dex-empty' }, 'No creatures match these filters.')]));
    };
    const select = <T extends string>(label: string, value: T, options: [T, string][], set: (x: T) => void) =>
      h('label', { class: 'dex-select' }, h('small', null, label),
        h('select', { onchange: (e: Event) => { set((e.target as HTMLSelectElement).value as T); renderToolbar(); renderGrid(); } },
          options.map(([val, text]) => h('option', { value: val, selected: val === value }, text))));
    const search = h('input', { type: 'search', placeholder: '🔎 Search by name…', value: v.q, class: 'dex-search', oninput: (e: Event) => { v.q = (e.target as HTMLInputElement).value; renderGrid(); } }) as HTMLInputElement;
    const renderToolbar = () => {
      const filtered = v.q || v.type !== 'all' || v.biome !== 'all' || v.rarity !== 'all' || v.status !== 'all' || v.time !== 'all';
      toolbar.replaceChildren(
        h('div', { class: 'row gap-s wrap' }, search,
          filtered ? h('button', { class: 'link', onclick: () => { Object.assign(v, { q: '', type: 'all', biome: 'all', rarity: 'all', status: 'all', time: 'all' }); search.value = ''; renderToolbar(); renderGrid(); } }, 'Clear filters') : null),
        h('div', { class: 'dex-types', role: 'group', 'aria-label': 'Filter by type' },
          h('button', { class: `pick ${v.type === 'all' ? 'sel' : ''}`, onclick: () => { v.type = 'all'; renderToolbar(); renderGrid(); } }, 'All types'),
          TYPES.map((t) => h('button', { class: `pick type-pick ${v.type === t ? 'sel' : ''}`, style: `--tc:${TYPE_COLOR[t]}`, title: TYPE_LABEL[t], onclick: () => { v.type = v.type === t ? 'all' : t; renderToolbar(); renderGrid(); } }, typeIconImg(t, 18), h('span', { class: 'hide-xs' }, TYPE_LABEL[t])))),
        h('div', { class: 'row gap-s wrap' },
          select('Biome', v.biome, [['all', 'Any biome'], ...biomes.map((b) => [b, `${BIOME_INFO[b].icon} ${BIOME_INFO[b].label}`] as [Biome, string])], (x) => { v.biome = x; }),
          select('Rarity', v.rarity, [['all', 'Any rarity'], ...RARITIES.map((r) => [r, `${'★'.repeat(rank(r) + 1)} ${cap(r)}`] as [Rarity, string])], (x) => { v.rarity = x; }),
          select('Out by', v.time, [['all', 'Day or night'], ['day', '☀️ Day'], ['night', '🌙 Night']], (x) => { v.time = x; }),
          select('Status', v.status, [['all', 'Everything'], ['seen', 'Seen'], ['caught', 'Recruited'], ['unseen', 'Not seen yet']], (x) => { v.status = x; }),
          select('Sort', v.sort, [['codex', 'Codex order'], ['name', 'Name'], ['rarity', 'Rarity'], ['type', 'Type']], (x) => { v.sort = x; })));
    };
    renderToolbar();
    renderGrid();
    openSheet('Creature Codex', h('div', { class: 'codex' },
      h('div', { class: 'dex-progress' },
        h('div', null, h('b', null, `${seenCount}`), h('small', null, ` / ${SPECIES.length} seen`)),
        h('div', null, h('b', null, `${caughtCount}`), h('small', null, ' recruited')),
        h('div', { class: 'progress' }, h('i', { style: `width:${Math.round((seenCount / SPECIES.length) * 100)}%` }))),
      toolbar, count, grid,
      h('p', { class: 'small muted' }, 'Creatures you meet in the wild or in a trainer’s team are recorded here. Tap one to see where to find it and what it likes. Biome shows where it (or an earlier stage) turns up. You can carve an Effigy of any creature in the Codex at a Carving Shrine.')), { wide: true });
    setTimeout(() => search.focus({ preventScroll: true }), 50);
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
          h('div', { class: 'row gap-s wrap' }, sp.types.map((t) => typeChip(t, true)), rarityBadge(sp.rarity), h('span', { class: 'chip' }, `Stage ${sp.stage}`), h('span', { class: 'chip' }, `RT ${sp.rt}`),
            sp.activity ? h('span', { class: 'chip', title: ACTIVITY_INFO[sp.activity].text }, `${ACTIVITY_INFO[sp.activity].icon} ${ACTIVITY_INFO[sp.activity].label}`) : null),
          h('p', { class: 'small' }, sp.dex))),
      h('h4', null, '🗺️ Where to look'),
      h('p', { class: 'small muted' }, `Explore these wild nodes${sp.activity && sp.activity !== 'crepuscular' ? ` ${sp.activity === 'nocturnal' ? 'at night (even turns)' : 'by day (odd turns)'}` : ''}. Faded ones are places you haven’t visited yet. Rarer creatures need good star rolls, and weather can bring out other types too.`),
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
    const tod = timeOfDay(s.turn);
    openSheet('Season, Weather & Time', h('div', null,
      h('div', { class: `tod-banner ${tod}` }, h('span', null, TIME_INFO[tod].icon), h('div', null,
        h('b', null, `${TIME_INFO[tod].label} · Turn ${s.turn}`),
        h('small', null, `Odd turns are day, even turns are night. ${tod === 'day' ? 'Diurnal' : 'Nocturnal'} and Day & night creatures are out in the wild now, and ${tod} events can happen. Next turn is ${tod === 'day' ? 'night' : 'day'}.`))),
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

  /** Last How to Play tab (category, topic), kept while the game is open. */
  private guideAt = { cat: GUIDE[0].id, topic: GUIDE[0].topics[0].id };

  /**
   * How to Play: the full guide, by category (tabs) and topic (sub-tabs). `welcome` shows the short
   * welcome tour instead (when a journey starts).
   */
  howToPlay(welcome = false, at?: { cat: string; topic?: string }) {
    if (welcome) { this.welcomeTour(); return; }
    if (at) this.guideAt = { cat: at.cat, topic: at.topic ?? GUIDE.find((c) => c.id === at.cat)?.topics[0].id ?? '' };
    const body = h('div', { class: 'guide' });
    const render = () => {
      const cat = GUIDE.find((c) => c.id === this.guideAt.cat) ?? GUIDE[0];
      const topic = cat.topics.find((t) => t.id === this.guideAt.topic) ?? cat.topics[0];
      const lines: HTMLElement[] = [];
      let list: HTMLElement | null = null;
      for (const line of topic.body) {
        if (line.startsWith('- ')) { if (!list) { list = h('ul'); lines.push(list); } list.append(h('li', null, line.slice(2))); }
        else { list = null; lines.push(h('p', null, line)); }
      }
      const ti = cat.topics.indexOf(topic), ci = GUIDE.indexOf(cat);
      const prev = ti > 0 ? { cat, t: cat.topics[ti - 1] } : ci > 0 ? { cat: GUIDE[ci - 1], t: GUIDE[ci - 1].topics[GUIDE[ci - 1].topics.length - 1] } : null;
      const next = ti < cat.topics.length - 1 ? { cat, t: cat.topics[ti + 1] } : ci < GUIDE.length - 1 ? { cat: GUIDE[ci + 1], t: GUIDE[ci + 1].topics[0] } : null;
      const go = (c: string, t: string) => { this.guideAt = { cat: c, topic: t }; render(); };
      body.replaceChildren(
        h('div', { class: 'guide-cats', role: 'tablist' }, GUIDE.map((c) => h('button', { class: `guide-cat ${c === cat ? 'sel' : ''}`, role: 'tab', 'aria-selected': String(c === cat), onclick: () => go(c.id, c.topics[0].id) }, h('span', null, c.icon), h('b', null, c.label)))),
        h('div', { class: 'guide-main' },
          h('div', { class: 'guide-topics', role: 'tablist' }, cat.topics.map((t) => h('button', { class: `guide-topic ${t === topic ? 'sel' : ''}`, role: 'tab', 'aria-selected': String(t === topic), onclick: () => go(cat.id, t.id) }, t.title))),
          h('article', { class: 'guide-body' }, h('h3', null, topic.title), ...lines,
            h('div', { class: 'row between guide-nav' },
              prev ? h('button', { class: 'btn ghost sm', onclick: () => go(prev.cat.id, prev.t.id) }, `← ${prev.t.title}`) : h('span'),
              next ? h('button', { class: 'btn ghost sm', onclick: () => go(next.cat.id, next.t.id) }, `${next.t.title} →`) : h('span')))));
    };
    render();
    openSheet('❓ How to Play', body, { wide: true });
  }

  /** The short welcome tour: the goal and the basics, a card at a time. */
  welcomeTour() {
    const s = this.s;
    const steps = welcomeTour({ name: s.trainer.name, home: CITIES[s.trainer.home]?.name ?? 'home', starter: s.roster[0] ? nameOf(s.roster[0]) : 'your starter' });
    let i = 0;
    const body = h('div', { class: 'tour' });
    const render = () => {
      const st = steps[i];
      body.replaceChildren(
        h('div', { class: 'tour-ico' }, st.icon),
        h('h3', null, st.title),
        ...st.lines.map((l) => h('p', null, l)),
        h('div', { class: 'tour-dots' }, steps.map((_, k) => h('button', { class: k === i ? 'on' : '', 'aria-label': `Step ${k + 1}`, onclick: () => { i = k; render(); } }))),
        h('div', { class: 'row between' },
          i > 0 ? h('button', { class: 'btn ghost', onclick: () => { i--; render(); } }, '← Back') : h('button', { class: 'btn ghost', onclick: () => close() }, 'Skip'),
          i < steps.length - 1 ? h('button', { class: 'btn primary', onclick: () => { i++; render(); } }, 'Next →')
            : h('div', { class: 'row gap-s' },
              h('button', { class: 'btn ghost', onclick: () => { close(); this.howToPlay(); } }, '📖 Full guide'),
              h('button', { class: 'btn primary', onclick: () => close() }, 'Let’s go! ✦'))));
      (body.querySelector('.btn.primary') as HTMLElement | null)?.focus({ preventScroll: true });
    };
    const close = openSheet(`Welcome, ${s.trainer.name}!`, body);
    render();
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
    h('small', { class: 'muted' }, `Recruiting bonus for creatures of those types (the best match counts). Found in: ${materialBiomes(it.id).map((b) => `${BIOME_INFO[b].icon} ${BIOME_INFO[b].label}`).join(', ')}. Also used to carve totems and to craft at a Workbench (it fits ${allure.map(([t]) => TYPE_LABEL[t]).join(' or ')} slots).`));
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
