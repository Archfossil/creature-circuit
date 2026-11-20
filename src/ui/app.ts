import { h, $, toast, openSheet, closeAllSheets, confirmSheet, rollDice, floatText, wait, mirror, type DieSpec } from './dom';
import { sfx } from './sound';
import { settings, setSetting } from './settings';
import { creatureCard, miniCard, moveCard, typeChip, typeIconImg, rarityBadge, typeChartSheet, statusGuide, statCompare, socialHelp } from './cards';
import { Engine, portrait } from '../render/engine';
import { WorldView, type Reach } from '../render/world';
import { BattleView } from '../render/battle';
import { playerLook, arbiterLook, championLook, roamingLook, SKIN, HAIR, PANTS, HAT_OPTIONS, JACKET_OPTIONS, HAIR_STYLE_OPTIONS, type TrainerLook } from '../render/trainerModel';
import { trainerPortrait } from '../render/engine';
import type { TrainerLookChoice } from '../engine/state';
import type { GameState, TrainerStyle } from '../engine/state';
import { newGame, save, load, clearSave, tierOf, season, follower, log, TRAINER_STYLES, MAX_PLAYERS, newMatch, setActiveMatch, activeMatchOf, saveMatch, loadMatch, clearMatch, nextSeat, stillPlaying, takenColors, useMatchSlot, onMatchSaved, loadOnlineMatch, clearOnlineMatch, listCopies, saveCopy, restoreCopy, renameCopy, deleteCopy, describeSave, defaultCopyName, saveKindOf, LIBRARY_MAX, type Match, type SaveKind, type SavedCopy } from '../engine/state';
import { applyEdit, type CreatureEdit } from '../engine/edits';
import * as W from '../engine/world';
import * as E from '../engine/events';
import * as I from '../engine/interactions';
import { Online, lastRoom, rememberRoom, type FeedItem, type ServerMsg } from '../net/online';
import type { Battle, BEvent, Snap } from '../engine/battle';
import { resolveRound, sendIn, activeOf, movePreview, partsText, chooseLead, foeOptions, foeReplacements, foeSendIn, type Action, type FoeOptions } from '../engine/battle';
import type { CreatureInst } from '../engine/creature';
import { nameOf, speciesOf, maxHealth, maxVitality, maxStamina, MORALE_LOW, TRAINER_BATTLE_XP_BONUS } from '../engine/creature';
import { NODE_BY_ID, CITIES, TOWNS, BIOME_TYPES, neighbors, MAP_NODES } from '../data/map';
import { SPECIES, SPECIES_BY_ID, STARTERS } from '../data/species';
import { MOVE_BY_ID, CATCH_BREATH, STATUS_INFO } from '../data/moves';
import { ABILITIES, AFFINITIES, BIOME_INFO, SEASON_INFO, WEATHER, itemInfo, materialBiomes, seasonForTurn } from '../data/content';
import { TYPE_COLOR, TYPE_LABEL, TYPES, typeIcon } from '../data/types';
import type { ElementType, Item } from '../data/schema';

const TRAINER_COLORS = ['#ff6b3d', '#3d8bff', '#2fbf71', '#b05cff', '#ffcc33', '#ff4fa3', '#a51d2d', '#1f3a93'];
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

  /** While watching: tend my own creatures. The change shows here at once and is sent to the trainer playing. */
  showMyCreature(c: CreatureInst) {
    const seat = this.mySeat();
    const net = this.online;
    if (seat < 0 || !net) { this.showCreature(c, true); return; }
    openSheet(nameOf(c), creatureCard(c, { editable: true, onEdit: (edit) => net.send({ type: 'edit', seat, edit }) }), { wide: true, cls: 'card-sheet' });
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
      await rollDice(`Weather for Turn ${s.turn} · everyone`, [{ sides: 6, value: roll, face: w.icon, label: w.name }], `${w.name}: ${w.text}`, 900);
    }
    if (s.turn === 90) toast('10 turns left! Head toward Circuit Stadium.', 'bad', 5000);
    await this.showInbox();
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
            h('small', null, `${here ? '📍 Here with you' : `At ${NODE_BY_ID[b.location].name}`} · 🪙 ${b.coins} · ${b.merits.length}/8 Merits · ${b.roster.length + b.reserve.length} creatures`),
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
      h('div', { class: 'school-pay' }, h('span', null, '🪙 Coins'),
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
    const bits = [...Object.entries(o.items).filter(([, n]) => n).map(([id, n]) => `${itemInfo(id).icon} ${W.itemDisplayName(id)} ×${n}`), ...(o.coins ? [`🪙 ${o.coins}`] : [])];
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
        const ok = await this.askTrainer(b, `⚔️ ${a.trainer.name} challenges you!`, h('p', null, `A duel at ${NODE_BY_ID[a.location].name}${w ? ` for 🪙 ${w}` : ', just for honour'}. You’ll pick your creatures’ moves each round.`), 'Accept the duel', 'Decline');
        await this.backTo(a);
        if (!ok) { toast(`${b.trainer.name} declined the challenge.`, 'info'); return; }
        const battle = I.startChallenge(a, b);
        if (!battle) { toast(I.challengeProblem(a, b) ?? 'The duel can’t start.', 'bad'); return; }
        await this.runBattle(battle, { kind: 'rival', intro: `${b.trainer.name} accepts your challenge!`, rivalLook: playerLook(b.trainer.name, b.trainer.color, b.trainer.look), duel: (bt) => this.duelPick(a, b, bt), duelSend: (bt) => this.duelSendPick(a, b, bt) });
        for (const t of I.settleChallenge(a, b, battle, w)) toast(t, 'info', 4000);
        save(a);
        this.world.setPawnAt(a.location); this.world.focus(a.location, true);
        this.showRivals(); this.renderHud();
      } }, w ? `Wager 🪙 ${w}` : 'No wager')))));
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
    const w = WEATHER[s.weather];
    const se = season(s);
    this.world.setSeason(se);
    this.world.setWeather(s.weather, se);
    // legendary nodes glow only while their Legendary is there (not beaten, not held by a trainer)
    this.world.setVisited(s.visited, MAP_NODES.filter((n) => n.kind === 'legendary' && !W.legendaryHere(s, n)).map((n) => n.id));
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
    const team = h('div', { class: 'team-strip' }, s.roster.map((c) => h('button', { class: `team-dot ${c.ko ? 'ko' : ''} ${c.points ? 'up' : ''} ${c.morale <= MORALE_LOW ? 'unhappy' : ''}`, title: c.morale <= MORALE_LOW ? `${nameOf(c)} is unhappy (Morale ${c.morale}) and may leave` : undefined, style: `--tc:${TYPE_COLOR[speciesOf(c).types[0]]}`, onclick: () => this.showCreature(c) },
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
    this.ui.replaceChildren(h('div', { class: 'hud' }, top, h('div', { class: 'hud-left' }, seats ?? '', followerBtn, team), h('div', { class: 'hud-bottom' }, eventPill, loc, actions)));
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
    if (this.watching) return this.watchButtons();
    const node = NODE_BY_ID[s.location];
    const out: HTMLElement[] = [];
    const btn = (icon: string, label: string, fn: () => void, opts: { cost?: number; disabled?: boolean; cls?: string } = {}) =>
      h('button', { class: `act ${opts.cls ?? ''}`, disabled: opts.disabled, onclick: () => { if (!this.busy) fn(); } },
        h('span', { class: 'act-ico' }, icon), h('span', { class: 'act-lbl' }, label), opts.cost !== undefined ? h('span', { class: 'cost' }, opts.cost === 0 ? '0⚡' : `${opts.cost}⚡`) : null);
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

  /** Double-tap shortcut: travel straight to an adjacent node. Blocked moves leave the preview up to explain why. */
  onNodeDoubleTap(id: string) {
    if (!settings().doubleTapTravel || this.busy || this.watching || !this.s || this.s.phase !== 'map') return;
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
      const held = [...s.roster, ...s.reserve].some((c) => c.species === n.legendary);
      extra.push(h('p', { class: 'small' }, held ? `${sp.name} travels with you. Each Legendary exists once per game.` : s.flags.beaten.includes(id) ? 'The legend has moved on.' : `Something powerful stirs here… (${sp.types.map((t) => TYPE_LABEL[t]).join('/')})`));
    }
    const card = h('div', { class: 'node-preview', style: n.cityType ? `--tc:${TYPE_COLOR[n.cityType]}` : '' },
      h('button', { class: 'icon-btn close', onclick: () => { this.selected = null; card.remove(); } }, '✕'),
      h('div', { class: 'np-head' }, h('span', { class: 'loc-ico' }, n.kind === 'city' ? h('img', { src: typeIcon(n.cityType!) }) : BIOME_INFO[n.biome].icon),
        h('div', null, h('b', null, n.name), h('small', null, this.nodeSubtitle(id)))),
      ...extra,
      isHere ? h('div', { class: 'small muted' }, 'You are here.') :
        this.watching ? '' : adj ? (chk.ok ? h('button', { class: 'btn primary block', onclick: () => this.travel(id) }, `Travel here · ${chk.cost}⚡`) : h('div', { class: 'lock' }, '🔒 ', chk.reason)) :
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
        if (out.roll) await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'info', label: '1–2 Nothing' }], 'Nothing but wind and birdsong.', 600);
      } else if (out.t === 'item') {
        await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'good', label: '5–6 Item' }, { sides: 6, value: out.itemRoll, label: 'Find' }], 'You discovered something!', 500);
        const names = out.items.map((i) => `${itemInfo(i.id).icon} ${W.itemDisplayName(i.id)}${i.n > 1 ? ' ×' + i.n : ''}`);
        if (out.coins) names.push(`🪙 ${out.coins} coins`);
        sfx.good();
        toast(`Found ${names.join(', ')}`, 'good', 3200);
        log(s, `Found ${names.join(', ')} at ${NODE_BY_ID[s.location].name}.`);
      } else if (out.t === 'itemChoice') {
        // Keen Nose: three finds to choose from
        await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'good', label: '5–6 Item' }], 'Your follower’s Keen Nose picks up three scents…', 500);
        const label = (f: W.Find) => [...f.items.map((i) => `${itemInfo(i.id).icon} ${W.itemDisplayName(i.id)}${i.n > 1 ? ' ×' + i.n : ''}`), ...(f.coins ? [`🪙 ${f.coins} coins`] : [])].join(' + ');
        const pickIt = await new Promise<W.Find>((resolve) => {
          const close = openSheet('👃 Keen Nose · pick one find', h('div', null,
            h('p', { class: 'small' }, `${follower(s) ? nameOf(follower(s)!) : 'Your follower'} sniffs out three things nearby. You can only carry one away.`),
            h('div', { class: 'list' }, out.options.map((f) => h('button', { class: 'choice', onclick: () => { close(); resolve(f); } },
              h('b', null, label(f)),
              h('small', { class: 'muted' }, f.items.map((i) => itemInfo(i.id).text).join(' ') || 'A little extra coin.'))))), { noClose: true });
        });
        const got = W.claimFind(s, pickIt);
        sfx.good();
        toast(`Found ${label(got)}`, 'good', 3200);
        log(s, `Found ${label(got)} at ${NODE_BY_ID[s.location].name}.`);
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

  async runBattle(b: Battle, ctx: { kind: 'wild' | 'trainer' | 'arbiter' | 'legendary' | 'endgame' | 'rival'; intro: string; city?: string; nodeId?: string; rivalLook?: TrainerLook; watch?: AsyncQueue<FeedItem>; duel?: (b: Battle) => Promise<Action | undefined>; duelSend?: (b: Battle) => Promise<number | undefined> }): Promise<Battle['over']> {
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

    let watchedEnd: Battle['over'] = null;
    const play = async (events: BEvent[]) => {
      if (!ctx.watch) this.feed({ kind: 'battle-events', events });
      for (const e of events) {
        if (e.t === 'end') watchedEnd = e.result;
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
        if (ctx.watch) { if (ev.key.toLowerCase() === 't') showTypes(); return; } // spectators: the type chart only
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
          h('p', { class: 'small' }, `The incoming creature is the Alpha: its Affinity Power triggers, borrowing from ${nameOf(cur)}. The swap resolves at ${nameOf(cur)}'s speed.`),
          h('div', { class: 'list' }, b.sides[0].team.map((c, i) => c.ko || c === cur ? null : h('div', { class: 'swap-row' },
            miniCard(c, { onClick: () => { close(); act({ kind: 'swap', to: i }); } }),
            h('small', null, '🔁 ', speciesOf(c).affinity && h('b', null, AFFINITY_NAME(speciesOf(c).affinity)), ` · bond ${c.affinity[cur.uid] ?? 0}`))))));
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
        tile('🍲', 'Stable', `${c.hotpot.name}: full recovery + ${c.hotpot.text}${s.trainer.home === id ? ' (doubled — home!)' : s.trainer.style === 'balanced' ? ' (doubled — a Wanderer is at home anywhere)' : ''}`, `${W.stableCost(s)}⚡`, () => this.stable()),
        this.swapTile(),
        tile('🛒', 'Market', 'Restores, treats, charms and totems.', costTag, () => this.market()),
        tile('🔄', 'Carving Shrine', 'Carve type totems and creature effigies.', costTag, () => this.shrine()),
        tile('🤺', 'Trainer Hall', W.hallBlock(s) && s.flags.sparred?.includes(id) ? 'You’ve battled here this turn. Come back next turn.' : `Battle a local trainer once per turn. Trainer battles earn +${TRAINER_BATTLE_XP_BONUS} XP for every creature that fights, win or lose, plus coins if you win.`, costTag, () => this.trainerHall(), !!s.flags.sparred?.includes(id)),
        c.arenaNode
          ? tile('⛴️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `✓ ${c.accolade} earned` : `${c.arbiter}\u2019s ${c.arena.name} is offshore, on the island. Take the ferry from the docks to Black Sand Cove (needs a Ferry Pass, sold at this market, or a creature that can Sail).`, '', () => {}, true)
          : tile('🏟️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `✓ ${c.accolade} earned` : `${c.arena.name}. ${gate.ok ? 'Ready to accept your challenge.' : gate.reason}`, s.merits.includes(id) ? '' : costTag, () => this.arbiter(), s.merits.includes(id))));
    openSheet(c.name, body, { wide: true });
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
      } }, `Challenge · ${W.cityActionCost(s)}⚡`)));
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
        tile('🐴', 'Stable', 'Full recovery for your team, KOs included. No Chanko Nabe buff: that’s a city specialty.', `${W.stableCost(s)}⚡`, () => this.stable()),
        this.swapTile(),
        tile('🛒', 'Market', t.key ? `Sells the ${itemInfo(t.key).name}. ${itemInfo(t.key).text}` : 'Local goods.', '0⚡', () => this.market(true)),
        t.special === 'school' ? tile('🥋', 'Battle School', 'Pay coins and leave a creature with the drill masters: it earns 1 XP per coin, at 2 XP a turn. Pick it up any time.', '', () => this.schoolSheet()) : null,
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
                  r.mood === 'great' ? 'Loved it: +2 Morale, +1 Loyalty' : r.mood === 'rough' ? 'Rough time: −2 Morale, −1 Loyalty' : 'Got through it fine', 900);
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
          h('b', { class: 'school-coins' }, `🪙 ${coins}`),
          h('button', { class: 'btn ghost sm', onclick: step(2) }, '+2'), h('button', { class: 'btn ghost sm', onclick: step(10) }, '+10'),
          h('small', { class: 'muted' }, `You have 🪙 ${s.coins}`)),
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
          } }, why && target ? why : `Enrol for 🪙 ${coins}`)));
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
          const card = miniCard(c, { badge: `🪙 ${pay}`, onClick: async () => {
            if (why) { toast(why, 'info'); return; }
            const ok = await confirmSheet(`Release ${nameOf(c)}?`,
              `${nameOf(c)} (Lv ${c.level}, ${sp.rarity}) goes to the Research Facility for good. You receive 🪙 ${pay} (Lv ${c.level} × ${W.RESEARCH_RATE[sp.rarity]}).${sp.rarity === 'legendary' ? ' It returns to its legendary grounds on the map.' : ''}`,
              `Release for 🪙 ${pay}`);
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
      'The Research Facility at Quillhaven pays well for released creatures, and best of all for rare ones.',
      'The Battle School at Valor Ridge trains creatures while you travel: a coin per XP.',
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
      s.reserve.length ? [h('h4', null, `Resting in totems (${s.reserve.length})`), h('div', { class: 'list' }, s.reserve.map((c) => miniCard(c, { onClick: () => this.showCreature(c) }))), h('p', { class: 'small muted' }, 'Swap your active team for free in any city or town (🔄 Swap Team).')] : null);
    if (s.training?.length) body.append(h('h4', null, `🥋 At Battle School (${s.training.length})`),
      h('p', { class: 'small muted' }, s.training.map((t) => { const p = W.trainingProgress(s, t); return `${nameOf(t.creature)} at ${NODE_BY_ID[t.school].name}: ${p.done ? 'finished, ready to pick up' : `${p.xp}/${t.xp} XP, ${t.turns - p.elapsed} turns to go`}`; }).join(' · ')));
    openSheet('Your Team', body, { wide: true });
  }

  showCreature(c: CreatureInst, readOnly = false) {
    if (this.watching) readOnly = true;
    const close = openSheet(nameOf(c), creatureCard(c, { editable: !readOnly, onChange: () => { save(this.s); if (!readOnly) this.renderHud(); } }), { wide: true, cls: 'card-sheet' });
    void close;
  }

  pickFollower() { if (!this.watching) void this.followerSheet(false); }

  /**
   * Choose who follows you. Shown at the start of every turn (Settings → "Choose a follower each turn")
   * and from the HUD's Following chip. Shows the current follower's Ability, Affinity, Morale and
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
        const ab = ABILITIES[speciesOf(c).ability];
        return h('small', null, '🌿 ', h('b', null, ab.name), ' · ', ab.text);
      };
      const current = cur
        ? h('div', { class: 'follow-current', style: `--tc:${TYPE_COLOR[speciesOf(cur).types[0]]}` },
          h('img', { src: portrait(cur.species), alt: '' }),
          h('div', { class: 'follow-info' },
            h('small', { class: 'muted' }, 'Following you now'),
            h('h3', null, nameOf(cur), h('small', null, ` · Lv ${cur.level}`)),
            h('p', { class: 'small' }, '🌿 ', h('b', null, `Ability · ${ABILITIES[speciesOf(cur).ability].name}`), ': ', ABILITIES[speciesOf(cur).ability].text, h('span', { class: 'muted' }, ' (active while it follows)')),
            h('p', { class: 'small' }, '🔁 ', h('b', null, `Affinity · ${AFFINITY_NAME(speciesOf(cur).affinity)}`), ': ', AFFINITIES[speciesOf(cur).affinity]?.text ?? '', h('span', { class: 'muted' }, ' (when swapped in as Alpha)')),
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
              usable && !readOnly ? h('button', { class: 'btn sm', onclick: () => this.useItemFlow(id, render) }, 'Use') : null);
          })))),
        Object.keys(s.inventory).length === 0 ? h('p', { class: 'muted' }, 'Your bag is empty.') : '',
        readOnly ? h('p', { class: 'small muted' }, 'Items can be used on your turn.') : '');
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
    for (const td of r.trainingDone) toast(`🥋 ${td.name} has finished training at ${td.school}. Pick it up there.`, 'good', 6000);
    for (const lg of r.legendsReturned) toast(`✨ ${lg.name} has left your side and returned to ${lg.home}. Another trainer may find it there.`, 'info', 6000);
    for (const c of [...s.roster, ...s.reserve]) {
      if (speciesOf(c).rarity === 'legendary' && c.loyalty <= 3) toast(`✨ ${nameOf(c)}’s Loyalty is fading: it leaves in ${c.loyalty} turn${c.loyalty === 1 ? '' : 's'} unless you give it treats, or release it at Quillhaven’s Research Facility first.`, 'bad', 5000);
    }
    for (const n of r.warned) toast(`⚠️ ${n} is unhappy and might leave. Raise its Morale (win battles, let it Follow you, give it treats) before the turn ends again.`, 'bad', 6000);
    for (const ch of r.checks) {
      await rollDice(`Morale check · ${ch.name}`, [{ sides: 10, value: ch.roll, tone: ch.left ? 'bad' : 'good' }],
        ch.left ? `Rolled ${ch.roll}, above Loyalty ${ch.loyalty}: ${ch.name} leaves.` : `Rolled ${ch.roll}, not above Loyalty ${ch.loyalty}: ${ch.name} stays, but loses 1 Loyalty.`, 900);
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
    await rollDice(`Weather · ${SEASON_INFO[se].label}`, [{ sides: 6, value: r.weatherRoll, face: w.icon, label: w.name }], `${w.name}: ${w.text}`, 650);
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
      tile('📖', 'Creature Codex', `${this.s.dex.caught.length} recruited · ${this.s.dex.seen.length} seen`, '', () => { close(); this.codex(); }),
      tile('🌀', 'Status Effects', 'What Burn, Sunder, Daze and the rest do.', '', () => { close(); openSheet('Status Effects', statusGuide()); }),
      tile('🔺', 'Type Chart', 'Strengths and weaknesses.', '', () => { close(); typeChartSheet(); }),
      tile('📜', 'Journal', 'Recent events.', '', () => { close(); this.journal(); }),
      this.watching ? null : tile('🧢', 'Trainer Look', 'Skin, hair, hat, jacket and colours for your mini.', '', () => { close(); this.trainerLookSheet(); }),
      tile('❓', 'How to Play', 'Rules summary.', '', () => { close(); this.howToPlay(); }),
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
        toggle('doubleTapTravel', 'Double-tap to travel', 'Double-tap (or double-click) an adjacent node to travel there without the Travel button.'),
        toggle('turnPing', 'Turn ping (online)', 'Play a ping and flag the browser tab when it becomes your turn while you’re in another tab.'),
        toggle('followerPrompt', 'Choose a follower each turn', 'At the start of every turn, show who is following you (Ability, Morale, Loyalty) and offer to switch.'),
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
        h('li', null, h('b', null, 'Saving: '), 'games autosave as you play. ☰ Menu → 📌 Save a copy keeps a named snapshot (solo, hotseat or online) that you can load again from 💾 Saves on the title screen, export or rename.'),
        h('li', null, h('b', null, 'Online: '), 'title screen → 🌐 Online. The host opens a room and shares the code; everyone makes a trainer and the host starts. You watch other trainers’ turns live (moves, dice and battles), and a ping tells you when it’s your turn. While you wait you can unlock chart nodes and edit playbooks (🐾 My team) and look through your bag (🎒 My bag). Duels: you pick your own moves and your next creature after a knockout. The host can set a turn timer, skip a turn, or play one for someone who stepped away.'),
        h('li', null, h('b', null, 'Hotseat: '), 'up to six trainers can share this device (title screen → Hotseat). Each picks a unique colour; turns go in seat order with a pass-the-device screen between them. Everyone shares the map, the weather and the Legendaries, and you can see the other trainers’ minis on the map.'),
        h('li', null, h('b', null, 'Trainers (hotseat): '), 'tap 👥 Trainers to send or trade coins and items with anyone, anywhere, or, when you share a spot, trade creatures or challenge them to a duel (they accept on the same device, and both of you pick your own moves each round, and who goes in after a knockout). Notes about gifts, trades and duels wait for each trainer at the start of their turn. Tap a name in the turn-order strip (top left) to find that trainer on the map.'),
        h('li', null, h('b', null, 'Trainer style: '), 'chosen when you start: eight styles, each with a perk and a drawback (Wanderer, Ranger, Urbanite, Beast Whisperer, Merchant, Battle Master, Caretaker, Pathfinder). They change Initiative costs, stables, coins, recruiting, battle XP, camping or Morale.'),
        h('li', null, h('b', null, '5 Initiative per turn. '), 'Moving to an adjacent node costs 1. Tap a glowing node on the map, then Travel, or just double-tap it (you can turn this off in Settings).'),
        h('li', null, h('b', null, 'Entering a wild node explores it: '), 'roll d6 — 1–2 nothing, 3–4 a wild creature (or trainer), 5–6 an item. Rarity star dice decide Common / Prime / Apex.'),
        h('li', null, h('b', null, 'Combat: '), 'faster creature acts first (ties Clash). Roll accuracy vs Evasion. Physical attacks crit on a max roll; elemental attacks use the type chart and inflict a status on a minimum damage roll (see Menu → Status Effects, or tap a status tag in battle). In battle, each Elemental move shows how it lands on the current opponent (2× Super effective, ½ Resisted, No effect…), and 🔺 Types (or T) opens the chart for the matchup. Damage drains the Health bar, then a Vitality heart; out of hearts means KO. Your Following creature leads every battle; with nobody following, you choose who goes first.'),
        h('li', null, h('b', null, 'Stamina & Fatigue: '), 'each move costs Effort. At 0 Stamina you gain Fatigue — fatigued creatures roll d10 and may lose their turn.'),
        h('li', null, h('b', null, 'Move readouts: '), 'tap a move to see what it will roll, in order: turn order, Stamina, the accuracy die vs the foe’s Evasion, then the damage die plus Power (physical) or Focus (elemental) minus the foe’s Armor or Ward. Confirm to use it. Every roll is explained as it happens. Turn on Fast battles in Settings to skip all this.'),
        h('li', null, h('b', null, 'Camping: '), 'on a wild node, camp to end your turn. Each Initiative you have left lets you tend one creature you choose, restoring its Vitality and clearing Fatigue. Camp early to tend more of your team.'),
        h('li', null, h('b', null, 'Playbook: '), 'up to 4 moves. Energy is a requirement, not spent per use: the playbook editor crosses out the energy each move takes and counts what is left. Filter moves by type (dual-type attacks show under both) or by Physical/Support, sort them by cost, damage, speed or name, and tick “Only moves that still fit”. ✨ Recommend moves? suggests a set to optimize physical power, elemental power, a balanced spread, or against a type. The ★ goal suits your creature’s stats, and Confirm playbook? sets it in one tap.'),
        h('li', null, h('b', null, 'Recruit: '), 'defeat a wild creature, then offer a totem plus up to 2 offerings. Roll 2d6 + bonuses vs its Recruitment Threshold. Each material appeals to certain types (shown in your Bag).'),
        h('li', null, h('b', null, 'Creature Codex: '), 'every creature you meet in the wild or in a trainer\u2019s team is recorded. Its page lists the nodes to explore for it (or its earlier stages) and its favorite offerings. You can carve an Effigy of any creature in your Codex.'),
        h('li', null, h('b', null, 'Grow: '), 'every creature that fights earns XP when the battle ends, win or lose, and knocking out a foe earns a bonus (running away earns nothing). Every 10 XP is a level and a point to spend on the skill tree on the back of the creature\'s index card. A node opens once every node linked above it is bought. Evolving needs the whole center path; side branches are optional but are left behind when it evolves.'),
        h('li', null, h('b', null, 'Cities: '), 'rest at the Stable (full recovery plus a Chanko Nabe battle buff), shop, carve totems and challenge the Arbiter for a Merit. 🔄 Swap Team (free, in any city or town) trades creatures between your active team and your totems.'),
        h('li', null, h('b', null, 'Events: '), 'from the second turn on, each turn starts with something happening on the road: a trader, a caretaker, a storm, a rival… Most can be declined; a few (storms, thieves) make you choose. Close the window to check your team first; the event waits at the bottom of the screen until you answer it, and you can’t end the turn before then. Tap a trader’s creature to see its card. Trades and Nature changes show a before → after stat comparison before you confirm.'),
        h('li', null, h('b', null, 'Towns: '), 'their Stable also fully recovers your team, KOs included, but serves no Chanko Nabe buff. Town markets cost no Initiative.'),
        h('li', null, h('b', null, 'Morale & Loyalty: '), 'happy creatures (Morale 7+) earn Loyalty every turn, and Loyalty unlocks their Nature perks for good. Unhappy ones (Morale 3 or less) get a ⚠️ warning. If you don’t raise their Morale, each later turn ends with a d10 roll against their Loyalty: above it, they leave; otherwise they lose 1 Loyalty. Legendaries lose 1 Loyalty every turn no matter what, and return to their grounds on the map at 0, so release them at the Research Facility before then for coins. Tap Morale or Loyalty on a card for details.'),
        h('li', null, h('b', null, 'Following: '), 'at the start of each turn you’re asked who follows you. The follower leads every battle, uses its Ability on the map, and gains Morale every other turn. Tap the Following chip any time to switch, or turn the prompt off in Settings.'),
        h('li', null, h('b', null, 'Trainer Halls: '), 'every city has one. Battle a local trainer once per turn (a city action). Trainer, Arbiter and Champion battles give every creature that fights +3 XP, win or lose, on top of the usual XP.'),
        h('li', null, h('b', null, 'Battle School: '), 'at Valor Ridge, pay coins and leave a creature to train: 1 XP per coin, earned at 2 XP a turn. You’re told when it’s done; pick it up (early if you like) to spend its new level-up points. A d6 decides whether it enjoyed the stay (Morale and Loyalty up or down).'),
        h('li', null, h('b', null, 'Research Facility: '), 'in Quillhaven, release a recruited creature for coins: its level × 2 (Common), 3 (Prime), 4 (Apex) or 5 (Legendary). Each Legendary exists once per game, and a released one returns to its grounds on the map.'),
        h('li', null, h('b', null, 'Your trainer: '), 'pick a top, hat, hair style, skin tone, hair colour and pants when you start (or later in Menu → Trainer Look). Your main colour always goes on the top, the hat and any hair tie or streak. That mini is your token on the map and stands behind you in trainer battles.'),
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
