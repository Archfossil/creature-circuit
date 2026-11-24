import { STAR_FACE } from '../data/icons';
import { activeRegion } from '../regions/active';
import { screens } from '../regions/screens';
import { h, $, toast, openSheet, closeAllSheets, confirmSheet, rollDice, coinFlip, floatText, wait, mirror, type DieSpec, setText, textOf, tile } from './dom';
import { sfx, applyVolume } from './sound';
import { settings, setSetting } from './settings';
import { GUIDE, welcomeTour } from './guide';
import { energyPips, healthBar, creatureCard, miniCard, moraleChip, moveCard, typeChip, typeIconImg, rarityBadge, typeChartSheet, statusGuide, statCompare, socialHelp, fatigueBadge, fmtTeamwork, editSwapMove, alphaText } from './cards';
import { Engine, portrait } from '../render/engine';
import { WorldView, type Reach } from '../render/world';
import { BattleView } from '../render/battle';
import { npcLook, opponentLook } from '../render/npcLooks';
import { playerLook, arbiterLook, SKIN, HAIR, PANTS, HAT_OPTIONS, JACKET_OPTIONS, HAIR_STYLE_OPTIONS, TOP_PATTERN_OPTIONS, HAT_PATTERN_OPTIONS, HAIR_PATTERN_OPTIONS, SECONDARY, topOf, type TrainerLook } from '../render/trainerModel';
import { trainerPortrait } from '../render/engine';
import type { TrainerLookChoice } from '../engine/state';
import type { GameState, TrainerStyle, BattleKind, Retrain, StarterTraits, DeedKind } from '../engine/state';
import { onSaveStatus, retrySave, newGame, save, load, clearSave, hasItem, tierOf, season, follower, log, record, worldLog, TRAINER_STYLES, MAX_PLAYERS, newMatch, setActiveMatch, activeMatchOf, saveMatch, loadMatch, migrateMatch, clearMatch, nextSeat, stillPlaying, takenColors, useMatchSlot, onMatchSaved, loadOnlineMatch, clearOnlineMatch, listCopies, saveCopy, restoreCopy, renameCopy, deleteCopy, describeSave, defaultCopyName, saveKindOf, LIBRARY_MAX, type Circuit, type Match, type SaveKind, type SavedCopy } from '../engine/state';
import { applyEdit, setWaypoint, type CreatureEdit } from '../engine/edits';
import * as N from '../engine/npcs';
import * as T from '../engine/messenger';
import * as X from '../engine/npcTrade';
import * as D from '../engine/dares';
import { IMPRINT_MAX, imprintBlock, imprintChoices, imprinted, useImprint } from '../engine/imprints';
import type { Npc } from '../data/npcs';
import { NPC_BY_ID } from '../data/npcs';
import { VOICES } from '../data/texts';
import { alertState, askForAlerts, calm, callFor, canPush, pushSubscription, steadyInterval, testCall } from './attention';
import * as W from '../engine/world';
import * as C from '../engine/circuit';
import { bringTeam, stadiumMatch, stadiumSheet, stadiumStep } from './stadium';
import * as E from '../engine/events';
import * as I from '../engine/interactions';
import { Online, lastRoom, rememberRoom, rememberSession, sessionRoom, type FeedItem, type ServerMsg, type AskResult } from '../net/online';
import type { Battle, BEvent, Snap } from '../engine/battle';
import { addLine, logBattleEvent, type BattleLog, type BattleLogEntry } from '../engine/battleLog';
import { resolveRound, sendIn, activeOf, movePreview, swapRowInfo, type SwapRowInfo, arenaTimer, ringRounds, ringLeft, partsText, chooseLead, foeOptions, foeReplacements, foeSendIn, statusGuard, canSurrender, SURRENDER_MORALE, snap as battleSnap, type Boost, type Action, type FoeOptions } from '../engine/battle';
import type { CreatureInst } from '../engine/creature';
import { createCreature, energy, learnable, stats, STAT_KEYS, STAT_LABEL, nameOf, speciesOf, abilityOf, instinctIdOf, HEART, healthFraction, maxHearts, maxTotal, totalHealth, maxStamina, MORALE_LOW, TRAINER_BATTLE_XP_BONUS } from '../engine/creature';
import { SWAP_MOVE_BY_ID, swapText } from '../data/swapMoves';
import { INSTINCTS, INSTINCT_BY_ID, INSTINCT_ICON, INSTINCT_POOL, instinctRules } from '../data/instincts';
import { riseText, TEAMWORK_PER_BONUS, TEAMWORK_PER_SWAP, TEAMWORK_PER_TURN } from '../engine/teamwork';
import { NODE_BY_ID, isCloudNode, CLOUD_EYE, CLOUD_RING, CITIES, TOWNS, isTown, BIOME_TYPES, neighbors, MAP_NODES } from '../data/map';
import { SPECIES, SPECIES_BY_ID, isActive, STARTERS } from '../data/species';
import { MOVE_BY_ID, CATCH_BREATH, STATUS_INFO, ZERO_IN_MAX } from '../data/moves';
import { ABILITIES, NATURES, NATURE_BY_ID, BIOME_INFO, SEASON_INFO, WEATHER, RECIPES, itemInfo, isUnique, materialBiomes, seasonForTurn, timeOfDay, TIME_INFO, ACTIVITY_INFO } from '../data/content';
import { TYPE_COLOR, TYPE_LABEL, TYPES, typeIcon } from '../data/types';
import type { Biome, ElementType, Item, Rarity, Species } from '../data/schema';

const TRAINER_COLORS = ['#ff6b3d', '#3d8bff', '#2fbf71', '#b05cff', '#ffcc33', '#ff4fa3', '#a51d2d', '#1f3a93'];
const DEFAULT_NAMES = ['Rowan', 'Juno', 'Kai', 'Mira', 'Ash', 'Tess'];

/**
 * Trainer customisation: a live preview of the mini (front and back) plus swatches. Your colour always goes
 * on the top and the hat (and the token's base); everything else is free to pick. Tops, hats and hair each
 * take a detail pattern and a secondary colour.
 */
function trainerLookEditor(get: () => { name: string; color: string; look: TrainerLookChoice }, set: (color: string, look: TrainerLookChoice) => void, taken: string[] = []) {
  const { name, color, look } = get();
  const full = playerLook(name, color, look);
  const cur = {
    skin: full.skin, hair: full.hair, pants: full.pants, hat: full.hat, jacket: topOf(look), hairStyle: full.hairStyle ?? 'short',
    topPattern: full.topPattern ?? 'plain', hatPattern: full.hatPattern ?? 'plain', hairPattern: full.hairPattern ?? 'plain',
    topColor2: look.topColor2, hatColor2: look.hatColor2, hairColor2: look.hairColor2, // unset: cream, or the main colour for hair
  };
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
    h('div', { class: 'look-preview', style: `--tc:${color}` }, h('div', { class: 'look-views' }, h('img', { src: trainerPortrait(full), alt: 'Your trainer' }), h('img', { src: trainerPortrait(full, true), alt: 'Your trainer from behind' })), h('small', null, 'Your trainer, on the map and in battle')),
    h('div', { class: 'look-fields' },
      swatches(taken.length ? 'Main colour (top, hat and token; each trainer’s is unique)' : 'Main colour (top, hat and token)', TRAINER_COLORS, color, (c) => upd({}, c), taken),
      options('Top', JACKET_OPTIONS, cur.jacket, (v) => upd({ jacket: v })),
      options('Top pattern', TOP_PATTERN_OPTIONS, cur.topPattern, (v) => upd({ topPattern: v })),
      swatches('Top secondary colour (pattern, trim and backpack)', SECONDARY, full.accent, (v) => upd({ topColor2: v })),
      options('Hat', HAT_OPTIONS, cur.hat, (v) => upd({ hat: v })),
      cur.hat === 'none' ? null : options('Hat pattern', HAT_PATTERN_OPTIONS, cur.hatPattern, (v) => upd({ hatPattern: v })),
      cur.hat === 'none' ? null : swatches('Hat secondary colour (pattern and trim)', SECONDARY, full.hatAccent ?? SECONDARY[0], (v) => upd({ hatColor2: v })),
      swatches('Skin tone', SKIN, cur.skin, (v) => upd({ skin: v })),
      options('Hair style', HAIR_STYLE_OPTIONS, cur.hairStyle, (v) => upd({ hairStyle: v })),
      cur.hairStyle === 'bald' ? null : swatches('Hair colour', HAIR, cur.hair, (v) => upd({ hair: v })),
      cur.hairStyle === 'bald' ? null : options('Hair pattern', HAIR_PATTERN_OPTIONS, cur.hairPattern, (v) => upd({ hairPattern: v })),
      cur.hairStyle === 'bald' ? null : swatches('Hair secondary colour (pattern, ties and streak; your main colour until you pick one)', SECONDARY, full.hairAccent ?? color, (v) => upd({ hairColor2: v })),
      swatches('Pants', PANTS, cur.pants, (v) => upd({ pants: v }))));
}

/** A small async queue (online: battle rounds arrive over the network while a battle is being watched). */
/** Save something to the player's device as a .json file. */
function download(name: string, data: unknown) {
  const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })), download: name.replace(/[^\w.-]+/g, '-') });
  document.body.append(a); a.click(); a.remove();
}

type WatchCtx = { kind: 'wild'; intro: string; city?: string; rivalLook?: TrainerLook; rivalSeat?: number };

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
  /** The battle being fought or watched right now (null between battles). Finished ones: GameState.lastBattle. */
  liveLog: BattleLog | null = null;
  /** Online: the last battle this browser watched (this session only). */
  watchedLog: BattleLog | null = null;

  constructor(root: HTMLElement) {
    const resumeRoom = sessionRoom();
    this.engine = new Engine(root);
    this.world = new WorldView(this.engine.canvas);
    this.battleView = new BattleView();
    this.engine.setView(this.world);
    root.append(this.ui);
    onSaveStatus((ok) => this.saveStatus(ok));
    this.world.onNodeTap = (id) => this.onNodeTap(id);
    this.world.onNodeDoubleTap = (id) => this.onNodeDoubleTap(id);
    this.title();
    // invite links: ?room=CODE opens the Online sheet ready to join
    const invite = new URLSearchParams(location.search).get('room');
    if (invite) setTimeout(() => this.onlineSheet(invite.toUpperCase()), 300);
    // back from another tab or app, or the network returned
    document.addEventListener('visibilitychange', () => void this.checkOnline());
    addEventListener('pageshow', () => void this.checkOnline());
    addEventListener('online', () => void this.checkOnline());
    // the browser dropped or reloaded the tab mid-game: go straight back to the room
    if (resumeRoom) void this.connectOnline().then((ok) => { if (ok) { closeAllSheets(); this.online!.join(resumeRoom); } });
  }

  // ════════════════════════════════════════════════════════════
  // Title & new game
  // ════════════════════════════════════════════════════════════
  title() {
    rememberSession(null);
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
            h('button', { class: 'btn ghost', onclick: () => stadiumSheet(this) }, '🏟️ Stadium'),
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
    let look: TrainerLookChoice = { skin: SKIN[1], hair: HAIR[1], pants: PANTS[0], hat: 'cap', jacket: 'jacket-pack', hairStyle: 'short', topPattern: 'plain' };
    // the starter's traits: a random Nature to begin with, and its species' usual Ability and Instinct
    const defaults = (id: string): StarterTraits => ({ nature: NATURES[Math.floor(Math.random() * NATURES.length)].id, ability: SPECIES_BY_ID[id].ability, instinct: SPECIES_BY_ID[id].instinct });
    let traits = defaults(starter);
    let shown = 0;
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
      } else if (n === 2) {
        const sp = SPECIES_BY_ID[starter];
        body = h('div', { class: 'wizard' },
          h('div', { class: 'starter-grid' }, STARTERS.map((id) => {
            const x = SPECIES_BY_ID[id];
            return h('button', { class: `starter ${starter === id ? 'sel' : ''}`, style: `--tc:${TYPE_COLOR[x.types[0]]}`, onclick: () => { if (id !== starter) { starter = id; traits = defaults(id); } step(2); } },
              h('img', { src: portrait(id), alt: x.name }), h('b', null, x.name), typeChip(x.types[0], true));
          })),
          h('div', { class: 'starter-detail', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
            h('img', { src: portrait(sp.id) }),
            h('div', null, h('h3', null, sp.name), h('div', { class: 'row gap-s' }, sp.types.map((t) => typeChip(t))), h('p', { class: 'small' }, sp.dex),
              h('p', { class: 'small' }, 'Usually: 🌿 ', h('b', null, ABILITIES[sp.ability].name), ' — ', ABILITIES[sp.ability].text),
              INSTINCT_BY_ID[sp.instinct] ? h('p', { class: 'small' }, `Usually: ${INSTINCT_ICON} `, h('b', null, INSTINCT_BY_ID[sp.instinct].name), ' — ', INSTINCT_BY_ID[sp.instinct].text) : null,
              h('p', { class: 'small muted' }, 'You’ll choose its Nature, Ability and Instinct next.'),
              h('p', { class: 'small' }, '🤝 ', h('b', null, 'Special bond'), ' — +1 Vigor, and no attribute starts below 1 (before its Nature).'),
              h('p', { class: 'small muted' }, `Evolves: ${sp.name} → ${SPECIES_BY_ID[sp.evolvesTo!].name} → ${SPECIES_BY_ID[SPECIES_BY_ID[sp.evolvesTo!].evolvesTo!].name}`))),
          h('div', { class: 'row between' }, h('button', { class: 'btn ghost', onclick: () => step(1) }, '← Back'), h('button', { class: 'btn primary', onclick: () => step(3) }, 'Next: Nature →')));
      } else {
        const sp = SPECIES_BY_ID[starter];
        const type = sp.types[0];
        const pickBtn = (on: boolean, pickIt: () => void, ...kids: (Node | null)[]) => h('button', { class: `choice ${on ? 'sel' : ''}`, 'aria-pressed': String(on), onclick: () => { pickIt(); step(n); } }, ...kids);
        const usual = (on: boolean) => (on ? h('small', { class: 'good-text' }, `${sp.name}’s usual`) : null);
        // the starter as picked so far, to show what its Nature does
        const c = createCreature(starter, 1, { nature: traits.nature });
        c.bond = true;
        const st = stats(c), nat = NATURE_BY_ID[traits.nature!];
        const head = h('div', { class: 'starter-detail', style: `--tc:${TYPE_COLOR[type]}` },
          h('img', { src: portrait(sp.id), alt: '' }),
          h('div', null, h('h3', null, sp.name),
            h('div', { class: 'row gap-s wrap' }, h('span', { class: 'chip' }, nat.name), n > 3 ? h('span', { class: 'chip' }, '🌿 ', ABILITIES[traits.ability!].name) : null, n > 4 ? h('span', { class: 'chip' }, `${INSTINCT_ICON} `, INSTINCT_BY_ID[traits.instinct!].name) : null),
            h('div', { class: 'starter-stats' }, STAT_KEYS.map((k) => h('div', { class: `stat ${k === nat.up ? 'up' : k === nat.down ? 'down' : ''}` }, h('small', null, STAT_LABEL[k]), h('b', null, st[k]))))));
        const intro = n === 3 ? 'Its Nature raises one attribute and lowers another, and sets the perks it unlocks as its Loyalty grows. Vigor is its Health: a heart of 5 for each point.'
          : n === 4 ? 'Its Ability helps you on the map while it’s Following you.'
            : `Its Instinct fires on its own in battle. Here are the ${TYPE_LABEL[type]} ones.`;
        const grid = n === 3 ? NATURES.map((x) => pickBtn(traits.nature === x.id, () => { traits.nature = x.id; },
          h('b', null, x.name), h('small', null, h('span', { class: 'good-text' }, `+1 ${STAT_LABEL[x.up]}`), ' · ', h('span', { class: 'bad-text' }, `−1 ${STAT_LABEL[x.down]}`)),
          h('small', null, x.text), h('small', { class: 'muted' }, `Perks: ${x.perks.map((p) => p.text).join(' → ')}`)))
          : n === 4 ? Object.values(ABILITIES).map((x) => pickBtn(traits.ability === x.id, () => { traits.ability = x.id; }, h('b', null, `🌿 ${x.name}`), h('small', null, x.text), usual(x.id === sp.ability)))
            : INSTINCT_POOL[type].map((x) => pickBtn(traits.instinct === x.id, () => { traits.instinct = x.id; }, h('b', null, `${INSTINCT_ICON} ${x.name}`), h('small', null, x.text), h('small', { class: 'muted' }, instinctRules(x)), usual(x.id === sp.instinct)));
        body = h('div', { class: 'wizard' }, head, h('p', { class: 'small' }, intro), h('div', { class: 'choice-grid' }, grid),
          h('div', { class: 'row between' }, h('button', { class: 'btn ghost', onclick: () => step(n - 1) }, '← Back'),
            n < 5 ? h('button', { class: 'btn primary', onclick: () => step(n + 1) }, n === 3 ? 'Next: Ability →' : 'Next: Instinct →')
            : h('button', { class: 'btn primary', onclick: () => {
              finished = true;
              close();
              const s = newGame(name.trim() || 'Rowan', style, home, starter, color, look, traits);
              if (opts.onDone) opts.onDone(s); else this.start(s, true);
            } }, opts.onDone && opts.seat! + 1 < opts.total! ? 'Next trainer →' : 'Begin Journey ✦')));
      }
      sheetBody.replaceChildren(body);
      $('.sheet-head h2', sheetEl).textContent = who + ['Your Trainer', 'Home City', 'Choose a Starter', 'Its Nature', 'Its Ability', 'Its Instinct'][n];
      if (n !== shown) { const sc = sheetBody.closest('.sheet-body'); if (sc) sc.scrollTop = 0; } // a new page starts at the top
      shown = n;
    };
    const sheetBody = h('div');
    const close = openSheet('Your Trainer', sheetBody, { wide: true, onClose: () => { if (!finished) opts.onCancel?.(); } });
    const sheetEl = sheetBody.closest('.sheet') as HTMLElement;
    step(0);
  }

  start(s: GameState, fresh = false) {
    this.busy = false; // (whatever was under way is replaced)
    rememberSession(this.online?.code ?? null);
    this.liveLog = null;
    this.eventWatch = null; // (its window closes with the rest below)
    if (!activeMatchOf()?.players.includes(s)) setActiveMatch(null);
    this.s = s;
    closeAllSheets();
    this.world.setTitleMode(false);
    this.world.setTrainerLook(playerLook(s.trainer.name, s.trainer.color, s.trainer.look));
    this.world.setPawnAt(s.location);
    this.world.focus(s.location, true);
    this.engine.setView(this.world);
    this.showRivals();
    this.circuitRun++;
    if (s.phase === 'endgame') { this.renderHud(); void this.circuitStep(); return; }
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

  /** Autosaving started failing, or works again: a warning stays on screen until it does. */
  saveStatus(ok: boolean) {
    document.getElementById('save-warning')?.remove();
    if (ok) { toast('Your game is saving again.', 'good', 4000, true); return; }
    document.body.append(h('button', { id: 'save-warning', class: 'save-warning', onclick: () => this.saveFailedSheet() }, '⚠️ Not saving! Tap for help'));
    toast('Your game couldn’t be saved on this device. Tap the warning to fix it before you close the game.', 'bad', 9000, true);
  }

  /** Autosaving fails: export the game as it stands, or make room by deleting saved copies, then try again. */
  saveFailedSheet() {
    const body = h('div', { class: 'saves' });
    const render = () => {
      const copies = listCopies();
      const game = activeMatchOf() ?? (this.s as GameState | undefined) ?? null;
      body.replaceChildren(
        h('p', null, 'This browser wouldn’t store your latest progress. Its storage is probably full, or it’s private browsing. Your game carries on, but closing it now could lose what’s happened since the last save.'),
        h('div', { class: 'row gap-s wrap' },
          game ? h('button', { class: 'btn primary', onclick: () => download(`creature-circuit-${'players' in game ? `${game.players.length}p` : `${game.trainer.name}-turn${game.turn}`}.json`, game) }, '⬇ Export this game') : null,
          h('button', { class: 'btn ghost', onclick: () => { if (retrySave()) close(); else toast('Still no room to save.', 'bad', 4000, true); } }, '↻ Try saving again')),
        h('p', { class: 'small muted' }, 'An exported file can be brought back from 💾 Saves on the title screen (Import a save file).'),
        h('h4', null, `🗂 Saved copies (${copies.length}/${LIBRARY_MAX})`),
        copies.length ? h('div', { class: 'list' }, copies.map((c) => h('div', { class: 'save-card' }, h('b', null, c.name), h('small', null, c.summary), h('div', { class: 'row gap-s wrap' },
          h('button', { class: 'btn ghost sm', onclick: () => download(`creature-circuit-${c.name}.json`, c.data) }, '⬇ Export'),
          h('button', { class: 'btn ghost sm bad-text', onclick: async () => {
            if (!(await confirmSheet(`Delete “${c.name}”?`, 'This saved copy will be deleted permanently, to make room for your game.', 'Delete'))) return;
            deleteCopy(c.id);
            if (retrySave()) close(); else render();
          } }, '🗑 Delete'))))) : h('p', { class: 'small muted' }, 'No saved copies to delete. Export your game, then import it in a browser that isn’t in private mode.'));
    };
    const close = openSheet('⚠️ Your game isn’t saving', body, { wide: true });
    render();
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
  get watching() { return this.isWatching; }
  set watching(v: boolean) {
    this.isWatching = v;
    document.body.classList.toggle('spectating', v); // other trainers' dice stay under our own windows
    if (!v) { this.leaveWatch?.(); this.watchFight = null; this.watchKey = ''; }
  }
  private isWatching = false;
  /** Online: the battle the trainer playing is in, with what has happened so far, so we can look in at any point. */
  /** Online: another trainer's prompt on this screen (a duel pick, or a trade or duel offer). */
  private askOpen: { id: string; close: () => void } | null = null;
  /** Online: call off the trade or duel offer we're waiting on. */
  private cancelAsk: (() => void) | null = null;
  /** After a lost battle: settle the choice on screen the plain way (the turn is being ended for us). */
  private settleLoss: (() => void) | null = null;
  /** Viewing a battle: its events are still playing on this screen. */
  private watchPlaying = false;
  /** Online: the battle we're fighting, to send again when someone reconnects. */
  private liveFight: { battle: unknown; ctx: WatchCtx; past: BEvent[] } | null = null;
  private seatsOnline: boolean[] = [];
  private watchFight: { battle: unknown; ctx: WatchCtx; past: BEvent[] } | null = null;
  /** Stop viewing the battle on screen (set while viewing one). */
  private leaveWatch: (() => void) | null = null;
  /** The trainer and turn the map last moved to while watching. */
  private watchKey = '';
  /** Who runs the turn (a change mid-battle abandons that battle). */
  private lastController: string | null = null;
  /** Online: the seat:turn this browser is currently playing (so updates don't restart it). */
  activeKey = '';
  /** Online: the host is ending someone's turn for them. */
  skipping = false;
  private hopping = false;
  private watchQueue: AsyncQueue<FeedItem> | null = null;
  /** Hosting a Stadium room: the trainer to seat once it's open. */
  stadiumSeat: GameState | null = null;
  private lobbyBody: HTMLElement | null = null;
  private inWizard = false;
  private closeLobby: (() => void) | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;

  /** The read-only event window open while watching, and which event it shows. */
  private eventWatch: { key: string; close: () => void } | null = null;

  /** True when this browser is playing the current turn online (so its actions are mirrored to everyone). */
  /** The server's push key, and whether it can reach this browser with the tab closed. */
  private pushKey = '';
  private pushOn = false;
  /** Tell the server where to push turn alerts (or to stop). */
  async syncPush() {
    const net = this.online;
    if (!net?.code || !this.pushKey) return;
    const sub = await pushSubscription(this.pushKey);
    if (this.online !== net) return;
    this.pushOn = !!sub;
    net.send({ type: 'push-sub', sub });
  }
  private stopKeepAlive: (() => void) | null = null;
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
        h('button', { class: 'btn primary', onclick: async () => { void askForAlerts(); close(); if (await this.connectOnline()) this.online!.create(); } }, '➕ Host a new room')),
      h('h4', null, 'Join a room'),
      h('div', { class: 'row gap-s' }, input,
        h('button', { class: 'btn primary', onclick: async () => { const c = input.value.trim().toUpperCase(); if (c.length !== 5) { toast('Room codes have 5 letters.', 'info'); return; } void askForAlerts(); close(); if (await this.connectOnline()) this.online!.join(c); } }, 'Join')),
      last && !code ? h('p', { class: 'small' }, h('button', { class: 'link', onclick: async () => { void askForAlerts(); close(); if (await this.connectOnline()) this.online!.join(last); } }, `Rejoin room ${last}`)) : '',
      saved && saved.owners ? h('div', null, h('h4', null, 'Your saved online game'),
        h('p', { class: 'small muted' }, `${saved.players.map((p) => p.trainer.name).join(', ')} · Turn ${saved.players[saved.current].turn}. If its room has closed (e.g. the server restarted), open it again as host and share the new code.`),
        h('button', { class: 'btn ghost', onclick: async () => { void askForAlerts(); close(); if (await this.connectOnline()) this.online!.create({ match: saved, owners: saved.owners!, turnSeconds: saved.turnSeconds ?? 0 }); } }, '♻️ Reopen as host')) : '',
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
    // (a battle's dice are part of its events, for whoever is viewing it)
    mirror.dice = (title, dice, caption, hold) => { if (!this.liveLog) this.feed({ kind: 'dice', title, dice, caption, hold }); };
    // a connection can die without a word in the background: keep checking it's real, so a turn isn't missed
    this.stopKeepAlive?.();
    this.stopKeepAlive = steadyInterval(() => { if (this.online === net && net.code && !this.reconnecting) void net.alive(8000).then((ok) => { if (!ok && this.online === net) void this.reconnect(); }); }, 25_000);
    return true;
  }

  /** Leave online play and go back to the title screen. */
  leaveOnline() {
    this.stopKeepAlive?.();
    this.stopKeepAlive = null;
    calm();
    this.online?.send({ type: 'push-sub', sub: null });
    this.pushOn = false;
    this.online?.close();
    this.online = null;
    mirror.toast = undefined; mirror.dice = undefined;
    onMatchSaved(null);
    useMatchSlot('hotseat');
    setActiveMatch(null);
    rememberRoom(null);
    rememberSession(null);
    this.watching = false; this.activeKey = ''; this.watchedLog = null;
    this.world.setRivals([]);
    this.title();
  }

  /** After every save while playing the current turn, send the match to the server (batched). */
  pushState(m: Match) {
    if (!this.feeding()) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    const net = this.online!;
    this.pushTimer = setTimeout(() => { this.pushTimer = null; m.by = net.id; net.send({ type: 'state', match: m }); }, 80);
  }

  /** After a reconnect: the battle being fought, caught up, and the prompts still waiting (for these seats, or everyone). */
  sendAgain(seats?: number[]) {
    const f = this.liveFight;
    if (f) this.feed({ kind: 'battle-start', battle: f.battle, ctx: f.ctx, past: [...f.past] });
    this.online?.askAgain(seats);
  }

  async onServer(m: ServerMsg) {
    const net = this.online;
    if (!net) return;
    switch (m.type) {
      case 'created': toast(`Room ${m.code} is open. Share the code (or link) with your friends.`, 'good', 5000); if (this.stadiumSeat) { net.send({ type: 'seat', trainer: this.stadiumSeat }); this.stadiumSeat = null; } this.lobby(); break;
      case 'room':
        if (this.lastController !== m.controller) this.closeAsk(); // whoever asked no longer runs the turn
        if (this.watchFight && this.lastController !== m.controller) { this.watchFight = null; this.leaveWatch?.(); }
        this.lastController = m.controller;
        // a trainer came back while we play: show them the battle and any prompt waiting for them
        {
          const was = this.seatsOnline;
          this.seatsOnline = m.seats.map((x) => x.online);
          const back = m.seats.flatMap((x, i) => (x.online && was[i] === false && x.clientId !== net.id ? [i] : []));
          if (back.length && m.started && this.feeding()) this.sendAgain(back);
        }
        if (!m.started) this.lobby();
        else { this.closeLobby?.(); await this.syncRole(); }
        this.renderTimer();
        break;
      case 'state': this.applyState(m.match); break;
      case 'feed': await this.onFeed(m.item); break;
      case 'ask': await this.answerAsk(m); break;
      case 'ask-cancel': this.closeAsk(m.id); break;
      case 'push-key': this.pushKey = m.key; void this.syncPush(); break;
      case 'do-skip': await this.skipFor(m.seat, m.reason); break;
      case 'edit': this.applyRemoteEdit(m.seat, m.edit); break;
      case 'do-play': toast(`You’re playing ${activeMatchOf()?.players[m.seat]?.trainer.name ?? 'their'}’s turn for them.`, 'info', 4000); break;
      case 'error':
        if (/Disconnected/.test(m.text) && net.code) { void this.reconnect(); break; }
        toast(m.text, 'bad', 5000);
        break;
    }
  }

  /** The connection dropped: keep trying to get back into the room, carrying on with any turn we're playing. */
  async reconnect() {
    const net = this.online;
    if (!net?.code || this.reconnecting) return;
    this.reconnecting = true;
    toast('Connection lost. Reconnecting…', 'info', 3000, true);
    for (let tries = 0; this.online === net; tries++) {
      this.resync = true;
      try { await net.reopen(); toast('Reconnected.', 'good', 2600, true); break; } catch { await wait(Math.min(10000, 1000 + tries * 1500)); }
    }
    this.reconnecting = false;
    if (this.online === net && net.ws?.readyState !== 1) void this.reconnect(); // dropped again meanwhile
  }
  private reconnecting = false;
  /** Just reconnected: the next match the server sends decides whether our own copy is still the live one. */
  private resync = false;

  /** Back from another tab or app (or the network returned): make sure the connection is real. */
  async checkOnline() {
    const net = this.online;
    if (!net?.code || document.hidden || this.reconnecting) return;
    if (!(await net.alive()) && this.online === net) void this.reconnect();
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
    const stadium = room.seats.some((s) => s.trainer?.stadium); // two trainers, one battle: anyone else watches
    this.lobbyBody.replaceChildren(
      h('p', null, stadium ? '🏟️ A Stadium battle: share this code or link. Your opponent brings a team here, then the host starts.' : 'Share this code or link. Everyone creates a trainer here, then the host starts the game.'),
      this.alertRow(() => this.lobby()),
      h('div', { class: 'row gap-s wrap' }, h('b', { class: 'room-code' }, room.code),
        h('button', { class: 'btn ghost sm', onclick: () => { void navigator.clipboard?.writeText(link); toast('Invite link copied.', 'good'); } }, '🔗 Copy invite link')),
      h('h4', null, `Trainers (${room.seats.length}/${MAX_PLAYERS})`),
      h('div', { class: 'list' }, room.seats.map((s, i) => h('div', { class: 'seat-row', style: `--tc:${s.trainer?.trainer.color ?? '#bbb'}` },
        h('b', null, `${i + 1}. ${s.trainer?.trainer.name ?? s.name}`),
        h('small', null, `${s.online ? '🟢 online' : '⚪ away'}${s.clientId === room.host ? ' · host' : ''}${s.clientId === net.id ? ' · you' : ''}${s.trainer ? '' : ' · creating…'}`)))),
      h('div', { class: 'row gap-s wrap' },
        room.seats.length < (stadium ? 2 : MAX_PLAYERS) || mine ? h('button', { class: 'btn primary', onclick: () => {
          if (stadium) { bringTeam((s) => { s.trainer.color = taken.includes(s.trainer.color) ? TRAINER_COLORS.find((c) => !taken.includes(c)) ?? s.trainer.color : s.trainer.color; net.send({ type: 'seat', trainer: s }); this.lobby(); }); return; }
          this.closeLobby?.();
          this.inWizard = true;
          this.newGameWizard({ taken, onDone: (s) => { this.inWizard = false; net.send({ type: 'seat', trainer: s }); this.lobby(); }, onCancel: () => { this.inWizard = false; this.lobby(); } });
        } }, stadium ? (mine ? '✏️ Change my team' : '➕ Bring a team') : mine?.trainer ? '✏️ Remake my trainer' : '➕ Create my trainer') : h('p', { class: 'small muted' }, 'The room is full.'),
        mine ? h('button', { class: 'btn ghost', onclick: () => net.send({ type: 'leave-seat' }) }, 'Give up my seat') : ''),
      net.isHost ? h('div', { class: 'host-box' },
        h('h4', null, '👑 Host settings'),
        h('label', { class: 'row gap-s' }, 'Turn timer ',
          h('select', { onchange: (e: Event) => net.send({ type: 'settings', turnSeconds: Number((e.target as HTMLSelectElement).value) }) },
            [0, 60, 120, 180, 300, 600, 900].map((sec) => h('option', { value: sec, selected: room.turnSeconds === sec }, sec ? `${sec / 60} min` : 'Off')))),
        h('p', { class: 'small muted' }, 'When a turn’s time runs out, the turn ends automatically. During the game you can also skip a turn, or play one for a trainer who has stepped away.'),
        h('button', { class: 'btn primary big', disabled: ready < 2 || ready !== room.seats.length, onclick: () => {
          const players = room.seats.map((s) => s.trainer!);
          const m = stadium ? stadiumMatch(players) : newMatch(players);
          m.owners = room.seats.map((s) => s.clientId);
          m.code = room.code;
          m.turnSeconds = room.turnSeconds;
          net.send({ type: 'start', match: m });
        } }, ready < 2 ? 'Waiting for at least 2 trainers…' : ready !== room.seats.length ? 'Waiting for everyone’s trainer…' : `Start with ${ready} trainers`))
        : h('p', { class: 'small muted' }, `Turn timer: ${room.turnSeconds ? `${room.turnSeconds / 60} min` : 'off'}. Waiting for the host to start…`),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => { this.closeLobby?.(); this.leaveOnline(); } }, 'Leave room')));
  }

  /** A new match snapshot from the server. */
  applyState(sent: Match) {
    const match = migrateMatch(sent); // the room may have been started by an older build
    if (!match) { toast('This room’s game is from a different version. Reload the page, or start a new room.', 'bad', 6000); return; }
    if (!match.stadium) try { localStorage.setItem('creature-circuit-online-v1', JSON.stringify(match)); } catch { /* ignore */ }
    // we're the one playing: our copy is the newest (unless we just reconnected and someone else played on)
    const theirs = this.resync && !!sent.by && sent.by !== this.online?.id;
    const back = this.resync;
    this.resync = false;
    if (this.feeding() && activeMatchOf() && !theirs) { if (back) { this.pushState(activeMatchOf()!); this.sendAgain(); } return; }
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
    if (!m.players.some(stillPlaying)) return; // it's all over: the final standings are up
    const s = m.players[m.current];
    const key = `${m.current}:${s.turn}:${C.progress(m)}`;
    if (net.room.controller === net.id) {
      if (!this.watching && this.activeKey === key) return;
      this.activeKey = key;
      this.watching = false;
        calm();
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
    // we were playing until now (the turn ended, or the host took over): our open windows no longer apply
    if (!this.watching) { calm(); this.liveFight = null; this.cancelAsk?.(); closeAllSheets(); this.eventWatch = null; this.liveLog = null; this.busy = false; }
    rememberSession(this.online?.code ?? null);
    this.watching = true;
    this.s = s;
    // the event we were looking at has been answered
    if (this.eventWatch && this.eventWatch.key !== this.eventKey()) this.eventWatch.close();
    this.world.setTitleMode(false);
    this.world.setTrainerLook(playerLook(s.trainer.name, s.trainer.color, s.trainer.look));
    if (!this.hopping) this.world.setPawnAt(s.location);
    // look their way as their turn begins, then leave the map alone: we may be planning our own moves
    const key = `${s.trainer.name}:${s.turn}`;
    if (this.watchKey !== key) { this.watchKey = key; this.world.focus(s.location); }
    this.showRivals();
    if (!this.watchQueue) { this.engine.setView(this.world); this.renderHud(); }
  }

  async onFeed(item: FeedItem) {
    if (!this.watching) return;
    if (document.hidden && (item.kind === 'toast' || item.kind === 'dice')) return; // nobody's looking: don't pile them up for later
    switch (item.kind) {
      case 'toast': toast(item.text, item.tone, 3200); break;
      case 'dice': if (!this.watchQueue) void rollDice(item.title, item.dice as DieSpec[], item.caption, item.hold, { corner: true }); break;
      case 'hop':
        this.hopping = true;
        this.world.setPawnAt(item.from);
        await this.world.hop(item.from, item.to, false);
        this.hopping = false;
        break;
      case 'battle-start': {
        // viewing it is up to us (a chip on the HUD opens it), unless it's a duel against us
        const ctx = item.ctx as WatchCtx;
        if (item.past && this.watchFight) break; // sent again for someone who reconnected: we never lost it
        this.leaveWatch?.(); // still catching up on their last one
        this.watchFight = { battle: item.battle, ctx, past: (item.past ?? []) as BEvent[] };
        if (ctx.rivalSeat !== undefined && ctx.rivalSeat >= 0 && ctx.rivalSeat === this.mySeat()) await this.viewFight();
        else this.renderHud();
        break;
      }
      case 'battle-events':
        this.watchFight?.past.push(...(item.events as BEvent[]));
        this.watchQueue?.push(item);
        break;
      case 'battle-end':
        this.closeAsk();
        this.watchFight = null;
        if (this.watchQueue) this.watchQueue.push(item); else this.renderHud();
        break;
    }
  }

  /** Look in on the battle being fought: catch up on what has happened, then follow it live. */
  async viewFight() {
    const f = this.watchFight;
    if (!f || this.watchQueue || !this.watching) return;
    const q = new AsyncQueue<FeedItem>();
    this.watchQueue = q;
    this.watchPlaying = true; // until the board is set up
    await this.runBattle(JSON.parse(JSON.stringify(f.battle)) as Battle, { ...f.ctx, watch: q, past: [...f.past] });
    this.watchPlaying = false;
    if (this.watchQueue === q) this.watchQueue = null;
    if (this.watching) this.spectate();
  }

  /** My own team, to tend while someone else plays. */
  myTeamSheet() {
    const me = activeMatchOf()?.players[this.mySeat()];
    if (!me) return;
    openSheet('Your team', h('div', null,
      h('p', { class: 'small muted' }, 'While you wait you can unlock chart nodes and edit playbooks. Changes go to the shared game right away.'),
      h('div', { class: 'list' }, [...me.roster, ...me.reserve].map((c) => miniCard(c, { onClick: () => this.showMyCreature(c) })))));
  }
  myBagSheet() {
    const me = activeMatchOf()?.players[this.mySeat()];
    if (me) this.bagSheet(me, true);
  }

  /** It's this browser's turn: a ping, and if they're looking elsewhere a flashing tab and a notification. */
  notifyTurn(s: GameState) {
    toast(`🔔 ${s.trainer.name}, it’s your turn!`, 'good', 4000);
    callFor('Your turn!', `${s.trainer.name}, it’s your turn!`);
  }

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
    toast(id ? `📍 Marked ${NODE_BY_ID[id].name} as your next stop. Only you can see it.` : '📍 Marker removed.', 'info', 2500, true);
  }

  /** Next-stop chip tapped: glide the map to my flag and light it up in my colour. */
  findNextStop() {
    const me = this.markerOwner();
    if (!me?.waypoint || this.engine.view !== this.world) return;
    const pos = this.world.waypointPos();
    if (!pos) return;
    this.world.focusPos(pos);
    this.world.spotlight(pos, me.trainer.color);
    toast(`📍 Your next stop: ${NODE_BY_ID[me.waypoint]?.name ?? ''}`, 'info', 2000, true);
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
  async answerAsk(m: Extract<ServerMsg, { type: 'ask' }>) {
    const net = this.online!;
    if (this.askOpen?.id === m.id) return; // sent again after a reconnect: it's still up
    this.closeAsk(); // a newer prompt replaces one that's still up
    const mine = { id: m.id, close: () => { /* not up yet */ } };
    this.askOpen = mine;
    // a duel pick waits (a while) for the last round to finish playing here, so it doesn't cover it
    if (m.pick) for (let i = 0; i < 100 && this.watchPlaying && this.askOpen === mine; i++) await wait(200);
    if (this.askOpen !== mine) return;
    const open = (title: string, body: HTMLElement, wide: boolean) => {
      const shut = openSheet(title, body, { noClose: true, wide });
      mine.close = shut;
    };
    const answer = (msg: { yes: boolean; value?: unknown }) => {
      if (this.askOpen !== mine) return;
      this.closeAsk();
      net.send({ type: 'answer', id: m.id, ...msg });
    };
    const pick = m.pick as ({ kind: 'duel'; round: number; stake?: number; circuit?: boolean | 'stadium' } & FoeOptions) | undefined;
    const send = m.pick as { kind: 'duel-send'; down: string; vs: string; options: { i: number; c: CreatureInst }[] } | undefined;
    if (send?.kind === 'duel-send') {
      callFor('Choose your next creature!', `${m.from} is waiting for you.`);
      open(`⚔️ Your next creature against ${m.from}`, h('div', null,
        h('p', { class: 'small muted' }, 'Choose within a minute, or the next in line goes in.'),
        this.duelSendPicker(send.down, send.vs, send.options, (i) => answer({ yes: true, value: i }))), true);
      return;
    }
    const lead = m.pick as { kind: 'duel-lead'; vs: CreatureInst | null; options: { i: number; c: CreatureInst }[] } | undefined;
    if (lead?.kind === 'duel-lead') {
      callFor('Choose who leads!', `${m.from} is waiting for you.`);
      open(`⚔️ Who leads against ${m.from}?`, h('div', null,
        h('p', { class: 'small muted' }, 'Choose within a minute, or your first healthy creature leads.'),
        this.duelLeadPicker(lead.vs, lead.options, (i) => answer({ yes: true, value: i }))), true);
      return;
    }
    if (pick?.kind === 'duel') {
      callFor('Your move!', `${m.from} is waiting for you.`);
      open(`⚔️ Your move against ${m.from}`, h('div', null,
        h('p', { class: 'small muted' }, 'Choose within a minute, or your creature acts on its own instincts.'),
        this.duelPicker(pick, pick.round, (act) => answer({ yes: true, value: act }))), true);
      return;
    }
    callFor('An offer for you!', `${m.from} is waiting for you.`);
    open(m.title, h('div', null, h('p', null, m.text),
      h('div', { class: 'row gap center' },
        h('button', { class: 'btn ghost', onclick: () => answer({ yes: false }) }, m.no),
        h('button', { class: 'btn primary', onclick: () => answer({ yes: true }) }, m.yes))), false);
  }

  /** Take down another trainer's prompt (a particular one, or whichever is up). */
  closeAsk(id?: string) {
    const open = this.askOpen;
    if (!open || (id && open.id !== id)) return;
    this.askOpen = null;
    open.close();
  }

  /** End a trainer's turn on their behalf (host's Skip, or the turn timer ran out). */
  async skipFor(seat: number, reason: 'timeout' | 'host') {
    const m = activeMatchOf();
    if (!m || m.current !== seat) return;
    const s = m.players[seat];
    this.skipping = true;
    // a lost battle still waiting on a choice is finished first, or the team would be left knocked out where it stands
    if (this.settleLoss) { this.settleLoss(); await wait(50); }
    this.liveFight = null;
    this.cancelAsk?.();
    closeAllSheets();
    this.busy = false;
    this.watching = false;
    this.activeKey = `${seat}:${s.turn}:${C.progress(m)}`;
    this.s = s;
    if (s.event) { record(s, 'event', 'let an event pass by'); s.event = undefined; log(s, 'The waiting event passed by.'); }
    if (s.phase === 'endgame') {
      toast(`🤖 A bot plays ${s.trainer.name}’s match.`, 'info', 4000);
      C.sendBot(m, seat);
      this.circuitRun++;
      try { await this.circuitStep(); } finally { this.skipping = false; }
      return;
    }
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
    if (s.phase === 'endgame') { // the season is over for them: on with whoever is left, or with the Circuit
      this.showTrainer(s);
      if (m.circuit) await this.passDevice(s);
      await this.circuitStep();
      return;
    }
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
    if (i < 0 && m.players.some((p) => p.phase === 'endgame')) { await this.circuitStep(); return; }
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
    if (s.npcNotes?.length) { for (const t of s.npcNotes) toast(t, 'info', 6000); s.npcNotes = []; save(s); }
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
          const ok = await this.askTrainer(b, `🤝 ${a.trainer.name} proposes a trade`, summary, 'Accept trade', 'Decline', 'the trade');
          if (!ok) return;
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
        const ok = await this.askTrainer(b, `⚔️ ${a.trainer.name} challenges you!`, h('p', null, `A duel at ${NODE_BY_ID[a.location].name}${w ? ` for 💰 ${w}` : ', just for honour'}. You’ll pick your creatures’ moves each round.`), 'Accept the duel', 'Decline', 'the challenge');
        if (!ok) return;
        const battle = I.startChallenge(a, b);
        if (!battle) { toast(I.challengeProblem(a, b) ?? 'The duel can’t start.', 'bad'); return; }
        await this.runBattle(battle, { kind: 'rival', rival: b, wager: w, intro: `${b.trainer.name} accepts ${a.trainer.name}’s challenge!`, rivalLook: playerLook(b.trainer.name, b.trainer.color, b.trainer.look), duelLead: W.needsLeadChoice(b) ? (bt, vs) => this.duelLeadPick(a, b, bt, vs) : undefined, duel: (bt) => this.duelPick(a, b, bt, w), duelSend: (bt) => this.duelSendPick(a, b, bt) });
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
  async duelPick(a: GameState, b: GameState, battle: Battle, wager: number, circuit: boolean | 'stadium' = false): Promise<Action | undefined> {
    const opts = { ...foeOptions(battle), stake: Math.min(wager, b.coins), circuit };
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

  /**
   * Duels: nobody is Following the challenged trainer, so they choose who leads. `vs` is the challenger's
   * lead, or null when the challenger has yet to choose theirs too (neither sees the other's first).
   */
  async duelLeadPick(a: GameState, b: GameState, battle: Battle, vs: CreatureInst | null): Promise<number | undefined> {
    const options = foeReplacements(battle).map((i) => ({ i, c: JSON.parse(JSON.stringify(battle.sides[1].team[i])) as CreatureInst }));
    const m = activeMatchOf();
    if (this.online && m) {
      const key = this.activeKey;
      const close = openSheet(`Waiting for ${b.trainer.name}…`, h('p', null, `${b.trainer.name} is choosing who leads.`), { noClose: true });
      const idx = await this.online.pick<number>(m.players.indexOf(b), a.trainer.name, { kind: 'duel-lead', vs: vs && JSON.parse(JSON.stringify(vs)), options });
      close();
      // our turn ended meanwhile (skipped, or out of time): the duel never starts
      if (!this.feeding() || this.activeKey !== key || this.s !== a) return new Promise(() => { /* never */ });
      return idx;
    }
    const idx = await new Promise<number>((resolve) => {
      const close = openSheet(`⚔️ ${b.trainer.name}: who leads?`, h('div', { class: 'handoff', style: `--tc:${b.trainer.color}` },
        h('p', { class: 'small muted' }, `Pass the device to ${b.trainer.name}. ${a.trainer.name}, no peeking.`),
        this.duelLeadPicker(vs, options, (i) => { close(); resolve(i); })), { noClose: true, wide: true });
    });
    await this.backTo(a);
    return idx;
  }

  duelLeadPicker(vs: CreatureInst | null, options: { i: number; c: CreatureInst }[], done: (i: number) => void): HTMLElement {
    return h('div', { class: 'duel-picker' },
      h('p', null, 'Nobody is Following you, so choose who to send out first. ', vs ? ['They lead with ', h('b', null, nameOf(vs)), ` (Lv ${vs.level}, `, speciesOf(vs).types.map((t) => typeChip(t, true)), ').'] : 'They’re choosing too.'),
      h('div', { class: 'list' }, options.map((o) => miniCard(o.c, { onClick: () => done(o.i) }))));
  }

  /** One creature that could swap in: its card, its Swap Move with this partner and what it would do now. */
  swapRow(r: SwapRowInfo, done: () => void, change?: () => void): HTMLElement {
    const A = nameOf(r.c), P = nameOf(r.partner);
    const m = SWAP_MOVE_BY_ID[r.move];
    const grows = r.earned ? 'Already earned its Teamwork this battle.' : r.capped ? 'Teamwork is at the pair’s cap (half the lower Loyalty of the two): raise that Loyalty to grow it.' : `This swap earns +${TEAMWORK_PER_SWAP} Teamwork (once per battle).`;
    return h('div', { class: 'swap-row' },
      miniCard(r.c, { onClick: done }),
      h('div', { class: 'small' },
        h('div', null, '🔁 ', h('b', null, m.name), ` · 🤝 Teamwork ${fmtTeamwork(r.teamwork)} with ${P} → `, h('b', null, r.bonus ? `+${r.bonus} bonus` : 'no bonus yet'),
          change ? h('button', { class: 'link', onclick: change }, 'Change') : null),
        h('div', null, alphaText(swapText(m, { A, P, aType: speciesOf(r.c).types[0], pType: speciesOf(r.partner).types[0] }), A, P)),
        h('div', { class: 'muted' }, alphaText(r.effect, A, P)),
        h('div', { class: 'muted' }, grows)));
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
  duelPicker(o: FoeOptions & { stake?: number; circuit?: boolean | 'stadium' }, round: number, done: (a: Action) => void): HTMLElement {
    const body = h('div', { class: 'duel-picker' });
    const swaps = () => body.replaceChildren(
      h('p', null, 'Swap in for ', h('b', null, o.name), ': choose the incoming Alpha.'),
      h('div', { class: 'list' }, o.swaps.map((sw) => this.swapRow(sw.row, () => done({ kind: 'swap', to: sw.i })))),
      h('div', { class: 'row end' }, h('button', { class: 'btn ghost sm', onclick: () => moves() }, '← Back to moves')));
    const moves = () => body.replaceChildren(
      h('p', null, `Round ${round}: what will `, h('b', null, o.name), ' do?'),
      h('p', { class: 'small muted' }, `Health ${o.health} · 💨 Stamina ${o.stamina}${o.fatigue ? ` · Fatigue ${o.fatigue}` : ''}`),
      h('div', { class: 'move-grid' }, o.moves.map((id) => moveCard(MOVE_BY_ID[id], { compact: true, vs: o.vs, onClick: () => done({ kind: 'move', move: id }) }))),
      h('div', { class: 'row gap-s wrap center' },
        h('button', { class: 'btn ghost sm', onclick: () => done({ kind: 'move', move: CATCH_BREATH.id }) }, '😮‍💨 Catch Breath'),
        h('button', { class: 'btn ghost sm', disabled: !o.swaps.length, title: o.swaps.length ? '' : round < 2 ? 'Swapping is allowed from round 2' : 'Nobody else can fight', onclick: swaps }, '🔁 Swap'),
        h('button', { class: 'btn ghost sm', onclick: () => giveUp() }, '🏳️ Surrender')));
    // asked in place, so it goes when the prompt does (the round can time out)
    const giveUp = () => body.replaceChildren(
      this.surrenderTerms(o.lead, [o.circuit === 'stadium' ? 'You lose this battle.' : o.circuit ? 'You’re out of the Creature Circuit, and your season ends here.' : o.stake ? `You lose the 💰 ${o.stake} wager.` : 'You lose the duel (there’s no wager).'], o.circuit ? [] : ['You aren’t sent anywhere to rest: you stay where you are.']),
      h('div', { class: 'row end gap' },
        h('button', { class: 'btn ghost', onclick: () => moves() }, 'Keep fighting'),
        h('button', { class: 'btn primary', onclick: () => done({ kind: 'surrender' }) }, '🏳️ Surrender')));
    moves();
    return body;
  }

  /** What surrendering costs and what it saves. */
  surrenderTerms(c: { name: string; morale: number; bond?: boolean }, costs: string[], keeps: string[]): HTMLElement {
    const to = Math.max(0, c.morale - SURRENDER_MORALE);
    return h('div', { class: 'surrender-terms' },
      h('h4', null, '🏳️ What it costs'),
      h('ul', { class: 'small' }, costs.map((t) => h('li', null, t)),
        h('li', null, h('b', null, `${c.name}’s Morale drops from ${c.morale} to ${to}. `), 'It will feel you don’t believe in it.',
          to <= MORALE_LOW && !c.bond ? ' ⚠️ That’s low enough that it could leave you.' : '')),
      h('h4', null, '🛡️ What it saves'),
      h('ul', { class: 'small' }, h('li', null, h('b', null, `${c.name} isn’t knocked out`), ', and neither is anyone else still standing.'), keeps.map((t) => h('li', null, t))));
  }
  /** Warn about surrendering this battle, and ask. */
  confirmSurrender(b: Battle, ctx: { kind: string; wager?: number; gimmick?: string; stadium?: boolean }): Promise<boolean> {
    const s = this.s, me = activeOf(b.sides[0]);
    const at = NODE_BY_ID[s.location].name;
    const costs: string[] = [], keeps: string[] = [];
    if (ctx.kind === 'rival') {
      const stake = Math.min(ctx.wager ?? 0, s.coins);
      costs.push(stake ? `You lose the 💰 ${stake} wager.` : 'You lose the duel (there’s no wager).');
      keeps.push(`You aren’t sent anywhere to rest: you stay at ${at}.`);
    } else if (ctx.kind === 'endgame') {
      costs.push(ctx.stadium ? 'You lose this battle.' : 'You’re out of the Creature Circuit, and your season ends here.');
    } else {
      if (ctx.kind === 'trainer') costs.push(`You lose the battle: ${b.sides[1].name} takes d6 coins, as usual, and you lose half of what’s left (you have 💰 ${s.coins}).`);
      else costs.push(`You lose the battle, and half your coins (you have 💰 ${s.coins}).`);
      costs.push(`You lose the rest of your Initiative (${s.initiative} left).`);
      keeps.push(`You aren’t sent back to a city: you stay at ${at}.`);
      const note = activeRegion().gimmicks.find((g) => g.id === ctx.gimmick)?.surrenderNote;
      if (note) keeps.push(note);
      if (Object.keys(s.cloudLoot ?? {}).length) keeps.push('Your Cloud satchel is kept.');
    }
    return new Promise((resolve) => {
      let done = false;
      const end = (v: boolean) => { if (done) return; done = true; close(); resolve(v); };
      const close = openSheet('Surrender this battle?', h('div', null,
        this.surrenderTerms({ name: nameOf(me), morale: me.morale, bond: me.bond }, costs, keeps),
        arenaTimer(b) ? h('p', { class: 'small muted' }, `⏳ ${arenaTimer(b)!.surrenderNote}`) : null,
        ctx.kind === 'trainer' || ctx.kind === 'arbiter' ? h('p', { class: 'small muted' }, 'If your whole team is knocked out instead, you lose the same coins and Initiative, and everyone loses Morale and is sent back to a city, where they’re fully rested.') : null,
        h('div', { class: 'row end gap' },
          h('button', { class: 'btn ghost', onclick: () => end(false) }, 'Keep fighting'),
          h('button', { class: 'btn primary', onclick: () => end(true) }, '🏳️ Surrender'))), { onClose: () => { if (!done) { done = true; resolve(false); } } });
    });
  }

  /** Ask another trainer about `what` (a trade or a challenge): hand them the device, or ask in their own browser. */
  async askTrainer(b: GameState, title: string, content: HTMLElement, yes: string, no: string, what: string): Promise<boolean> {
    const a = this.s;
    const r = await this.askAnswer(b, title, content, yes, no);
    if (r === 'cancelled') return false;
    await this.backTo(a);
    if (this.s !== a) return false;
    if (r !== 'yes') toast(r === 'away' ? `${b.trainer.name} isn’t online right now.` : r === 'silent' ? `${b.trainer.name} didn’t answer.` : `${b.trainer.name} declined ${what}.`, 'info');
    return r === 'yes';
  }
  private async askAnswer(b: GameState, title: string, content: HTMLElement, yes: string, no: string): Promise<AskResult | 'cancelled'> {
    const m = activeMatchOf();
    if (this.online && m) {
      // nothing else can happen meanwhile: moving on or starting a battle would leave the offer out of date
      const q = this.online.ask(m.players.indexOf(b), this.s.trainer.name, title, textOf(content), yes, no);
      let cancelled = false;
      const cancel = () => { cancelled = true; q.cancel(); };
      this.cancelAsk = cancel;
      const close = openSheet(`Waiting for ${b.trainer.name}…`, h('div', null,
        h('p', null, `${b.trainer.name} is deciding. They have two minutes to answer.`),
        h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: cancel }, 'Call it off'))), { noClose: true });
      const r = await q.answer;
      close();
      if (this.cancelAsk === cancel) this.cancelAsk = null;
      return cancelled ? 'cancelled' : r;
    }
    return new Promise((resolve) => {
      closeAllSheets();
      const close = openSheet(title, h('div', { class: 'handoff', style: `--tc:${b.trainer.color}` },
        h('p', { class: 'small muted' }, `Pass the device to ${b.trainer.name}.`),
        h('img', { src: trainerPortrait(playerLook(b.trainer.name, b.trainer.color, b.trainer.look)), alt: '' }),
        content,
        h('div', { class: 'row gap center' },
          h('button', { class: 'btn ghost', onclick: () => { close(); resolve('no'); } }, no),
          h('button', { class: 'btn primary', onclick: () => { close(); resolve('yes'); } }, yes))), { noClose: true });
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
      m.circuit && C.championOf(m.circuit) ? h('p', null, h('b', null, C.championOf(m.circuit)!.name), ' is the Champion of the Creature Circuit.') : null,
      m.circuit ? h('button', { class: 'btn ghost sm', onclick: () => this.bracketSheet() }, '🏆 See the bracket') : null,
      h('ol', { class: 'standings' }, ranked.map((p) => h('li', { style: `--tc:${p.trainer.color}` },
        h('b', null, p.trainer.name),
        h('span', null, p.phase === 'champion' ? ' 🏆 Champion of the Circuit' : p.endgame ? ` · out in the ${C.CIRCUIT_ROUNDS[p.endgame.round] ?? 'Circuit'}` : ' · missed the Circuit'),
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
    toast(`${p.trainer.name}${p === this.s ? ' (now playing)' : ''} · ${NODE_BY_ID[p.location]?.name ?? ''}`, 'info', 2000, true);
  }

  renderHud() {
    const s = this.s;
    // a side challenge the trainer has just finished first
    if (!this.watching && s.phase === 'map') {
      const won = D.checkDares(s);
      if (won.length) { sfx.good(); for (const x of won) toast(x.text, 'good', 6000); save(s); }
    }
    const unread = T.unreadTexts(this.idOwner());
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
    this.world.setWisp(screens().light?.(s) ?? null);
    const marker = this.markerOwner();
    this.world.setWaypoint(marker?.waypoint ?? null, marker?.trainer.color);
    if (!this.watching) screens().news?.(this);
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
      this.circuitGame().circuit ? h('button', { class: 'hud-pill icon', onclick: () => this.bracketSheet(), 'aria-label': 'Circuit bracket', title: 'The Creature Circuit’s bracket' }, '🏆') : null,
      h('button', { class: 'hud-pill icon hide-xs', onclick: () => this.worldLogSheet(), 'aria-label': 'World Log', title: 'World Log: what every trainer has been doing' }, '🗞️'),
      h('button', { class: 'hud-pill icon hide-xs', onclick: () => this.trainerId(), 'aria-label': 'Trainer ID', title: 'Trainer ID: your home town, style and records' }, '📇'),
      h('button', { class: 'hud-pill icon menu', onclick: () => this.menu(), 'aria-label': unread ? `Menu (${unread} unread message${unread === 1 ? '' : 's'})` : 'Menu' }, '☰', unread ? h('i', { class: 'hud-dot' }, String(unread)) : null));
    const loc = h('div', { class: 'loc-card', style: node.cityType ? `--tc:${TYPE_COLOR[node.cityType]}` : '' },
      h('div', { class: 'loc-title' },
        h('span', { class: 'loc-ico' }, node.kind === 'city' ? h('img', { src: typeIcon(node.cityType!), alt: '' }) : BIOME_INFO[node.biome].icon),
        h('div', null, h('b', null, node.name), h('small', null, this.nodeSubtitle(node.id)))),
      h('div', { class: 'init' }, h('small', null, 'Initiative'), h('div', { class: 'pips-init' }, Array.from({ length: 5 }, (_, i) => h('span', { class: i < s.initiative ? 'on' : '' })))),
      // my private next-stop flag: tap to find it on the map
      marker?.waypoint ? h('button', { class: 'next-stop-chip', style: `--tc:${marker.trainer.color}`, title: 'Show your next-stop flag on the map', onclick: () => this.findNextStop() },
        '📍 ', h('small', null, 'Your next stop: '), h('b', null, NODE_BY_ID[marker.waypoint]?.name ?? '')) : null,
      daysLeft <= 10 && s.phase === 'map' ? h('div', { class: 'warn' }, `⏳ ${daysLeft + 1} turns left — reach Circuit Stadium with 8 Merits!`) : null);
    const actions = h('div', { class: 'action-bar' }, this.actionButtons());
    const followerBtn = h('button', { class: 'follower-chip', onclick: () => this.pickFollower() },
      f ? h('img', { src: portrait(f.species), alt: '' }) : h('span', { class: 'none' }, '—'),
      h('div', null, h('small', null, 'Following'), h('b', null, f ? nameOf(f) : 'Nobody')),
      f ? h('span', { class: 'ability-tag' }, ABILITIES[abilityOf(f)].name) : null);
    const team = h('div', { class: 'team-strip' }, s.roster.map((c) => h('button', { class: `team-dot ${c.ko ? 'ko' : ''} ${c.points ? 'up' : ''} ${c.morale <= MORALE_LOW ? 'unhappy' : ''}`, title: c.morale <= MORALE_LOW ? `${nameOf(c)} is unhappy (Morale ${c.morale})${c.bond ? '' : ' and may leave'}` : undefined, style: `--tc:${TYPE_COLOR[speciesOf(c).types[0]]}`, onclick: () => this.showCreature(c) },
      h('img', { src: portrait(c.species), alt: nameOf(c) }),
      h('i', { style: `--p:${healthFraction(c)}` }))));
    const ev = E.eventView(s);
    const eventPill = ev && this.watching ? h('button', { class: 'event-pill watch', onclick: () => this.watchEvent(), title: `See the choices (only ${s.trainer.name} can answer)` },
      h('span', { class: 'event-pill-ico' }, ev.icon), h('div', null, h('b', null, `${s.trainer.name} is resolving ${ev.title}`), h('small', null, 'Tap to see the choices')))
      : ev ? h('button', { class: 'event-pill', onclick: () => this.eventFlow(), title: 'Answer this event before ending your turn' },
      h('span', { class: 'event-pill-ico' }, ev.icon), h('div', null, h('small', null, 'Event waiting'), h('b', null, ev.title))) : null;
    const fightPill = this.watching && this.watchFight ? h('button', { class: 'event-pill watch', title: 'Look in on the battle. You can come back to the map at any time.', onclick: () => void this.viewFight() },
      h('span', { class: 'event-pill-ico' }, '⚔️'), h('div', null, h('b', null, `${s.trainer.name} is in a battle`), h('small', null, 'Tap to watch'))) : null;
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
    this.ui.replaceChildren(h('div', { class: 'hud' }, top, h('div', { class: 'hud-left' }, seats ?? '', followerBtn, team, cloudChip, ...(screens().chips?.(this) ?? [])), h('div', { class: 'hud-bottom' }, eventPill, fightPill, loc, actions)));
    if (this.selected) this.showNodePreview(this.selected);
    this.worldLogLive?.();
  }

  nodeSubtitle(id: string) {
    const n = NODE_BY_ID[id];
    if (n.kind === 'city') return `${TYPE_LABEL[n.cityType!]} City · Arbiter ${CITIES[id].arbiter}${this.s.merits.includes(id) ? ' ✓' : ''}`;
    if (n.kind === 'town') return 'Town · Safe haven';
    if (n.kind === 'stadium') return 'Town · Be here at the end of Turn 100';
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
    for (const a of screens().actions?.(this) ?? []) out.push(btn(a.icon, a.label, a.go, { cls: 'hl' }));
    if (node.kind === 'wild') {
      const c = W.reexploreCost(s);
      out.push(btn('🔍', 'Explore', () => this.doExplore(), { cost: c, disabled: s.initiative < c }));
      out.push(btn('⛺', 'Camp', () => this.camp(), { disabled: s.initiative < 1 || !W.campNeeds(s).length }));
    }
    if (node.kind === 'city') out.push(btn('🏙️', 'City', () => this.citySheet(), { cls: 'hl' }));
    if (node.kind === 'arena') out.push(btn('🏟️', 'Arena', () => this.arbiter(), { cls: 'hl' }));
    if (node.kind === 'town') out.push(btn('🏘️', 'Town', () => this.townSheet(), { cls: 'hl' }));
    if (node.kind === 'stadium') out.push(btn('🏟️', 'Stadium', () => this.townSheet(), { cls: 'hl' }));
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
    const out: HTMLElement[] = [h('div', { class: 'watch-label', style: `--tc:${cur?.trainer.color ?? '#999'}` }, h('span', null, '👀 ', h('b', null, cur?.trainer.name ?? '…'), cur?.phase === 'endgame' ? '’s Circuit match' : '’s turn'))];
    if (me) out.push(h('button', { class: 'act', title: 'Unlock chart nodes and edit playbooks while you wait', onclick: () => this.myTeamSheet() },
      h('span', { class: 'act-ico' }, '🐾'), h('span', { class: 'act-lbl' }, 'My team')));
    if (me) out.push(h('button', { class: 'act', title: 'Look through your bag (items can be used on your turn)', onclick: () => this.myBagSheet() },
      h('span', { class: 'act-ico' }, '🎒'), h('span', { class: 'act-lbl' }, 'My bag')));
    if (net.isHost && cur) {
      out.push(h('button', { class: 'act', title: `End ${cur.trainer.name}’s turn now`, onclick: async () => { if (cur.phase === 'endgame' ? await confirmSheet('Send in a bot?', `A bot plays ${cur.trainer.name}’s next Circuit match. If they’re up against another trainer here, that trainer plays on.`, 'Send in a bot') : await confirmSheet('Skip this turn?', `${cur.trainer.name}’s turn ends now, as if they pressed End Turn.`, 'Skip turn')) net.send({ type: 'host-skip' }); } },
        h('span', { class: 'act-ico' }, '⏭️'), h('span', { class: 'act-lbl' }, cur.phase === 'endgame' ? 'Send a bot' : 'Skip turn')));
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
   *  why), or open the City / Town menu of the place you're standing in. Arenas are left to
   *  their button, since it starts battles. */
  onNodeDoubleTap(id: string) {
    if (!settings().doubleTapTravel || this.busy || this.watching || !this.s || this.s.phase !== 'map') return;
    if (id === this.s.location) {
      const kind = NODE_BY_ID[id].kind;
      if (kind !== 'city' && !isTown(id)) return;
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
    } else if (isTown(id)) { const keys = W.townKeyItems(this.s, id); extra.push(h('p', { class: 'small' }, TOWNS[id].blurb, keys.length ? h('b', null, ` Sells: ${keys.map((k) => itemInfo(k).name).join(', ')}.`) : null)); }
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
    const chk = W.canMoveTo(s, id);
    const ask = chk.ok ? screens().beforeMove?.(this, id, chk.cost) : null;
    if (ask) {
      if (!(await ask)) return;
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
    const apart = W.apartAt(s.location);
    this.busy = true;
    try {
      if (out.t === 'arrive') {
        const n = out.node;
        toast(`Arrived at ${n.name}`, 'info');
        if (n.kind === 'city' || isTown(n.id)) save(s);
      } else if (out.t === 'nothing') {
        if (out.roll) await rollDice('Explore', [{ sides: out.die ?? 6, value: out.roll, tone: out.dark ? 'bad' : 'info', label: out.hushed ? '💨 3 Hushed: Nothing' : '1–2 Nothing' }], out.dark ? 'Nothing but the dark. Your team shivers. (−1 Morale)' : out.hushed ? 'Something stirs, then slinks off from the Hush Smoke.' : 'Nothing but wind and birdsong.', 600, { read: true });
        if (out.refund) { toast(`🌲 Ranger’s instinct: +1 Initiative back (${W.rangerRefundsLeft(s)} more this turn).`, 'good', 2600); this.renderHud(); }
        if (out.dark) this.renderHud();
      } else if (out.t === 'trail') {
        await screens().trail?.(this, out);
      } else if (out.t === 'item') {
        // two beats: the explore roll reveals that something's here, then the find roll reveals what
        await rollDice('Explore', [{ sides: out.die ?? 6, value: out.roll, tone: 'good', label: out.hushed ? '💨 4 Hushed: Item' : '5–6 Item' }], apart?.found ? apart.found : out.hushed ? 'With nothing around to bother you, you poke about and find something!' : 'You discovered something!', 700, { read: true });
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
        record(s, 'explore', `kept ${label(got)}`);
        log(s, `Found ${label(got)} at ${NODE_BY_ID[s.location].name}.`);
      } else if (out.t === 'encounter') {
        await rollDice('Explore', [{ sides: out.die ?? 6, value: out.roll, tone: 'bad', label: '3–4 Encounter' }], apart?.met ?? 'Something rustles nearby…', 700, { read: true });
        await rollDice('Rarity Stars', out.stars.map((x) => ({ sides: 6, value: x.face, face: STAR_FACE[x.star], tone: x.star === 'full' ? 'good' : 'info', label: x.star })), `${out.rarity[0].toUpperCase() + out.rarity.slice(1)} creature! ${NODE_BY_ID[s.location].biome === 'prism' ? '(+1 rarity: the Rainbow Plains)' : NODE_BY_ID[s.location].rarity ? '(+★ rare area)' : ''}`, 900, { read: true });
        this.busy = false;
        await this.runBattle(out.battle, { kind: 'wild', intro: `A wild ${nameOf(out.battle.sides[1].team[0])} appeared!` });
        return;
      } else if (out.t === 'trainer') {
        await rollDice('Explore', [{ sides: 6, value: out.roll, tone: 'bad', label: '3–4 Encounter' }], `${out.name} challenges you!`, 700, { read: true });
        this.busy = false;
        await this.runBattle(out.battle, { kind: 'trainer', intro: out.line ? `${out.name}: “${out.line}”` : `${out.name} wants to battle!` });
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
  pickLead(b: Battle, intro: string, hideFoe = false): Promise<void> {
    const foe = activeOf(b.sides[1]);
    return new Promise((resolve) => {
      const close = openSheet('Who leads?', h('div', null,
        h('p', null, intro, ' ', hideFoe ? 'Both leads are chosen in secret.' : [h('b', null, `${nameOf(foe)}`), ` (Lv ${foe.level}, `, speciesOf(foe).types.map((t) => typeChip(t, true)), ').']),
        h('p', { class: 'small muted' }, 'Nobody is Following you, so choose who to send out first. Set a Following creature in Team to lead automatically.'),
        h('div', { class: 'list' }, b.sides[0].team.map((c, i) => c.ko ? null : miniCard(c, { onClick: () => { chooseLead(b, i); close(); resolve(); } })))),
        { noClose: true });
    });
  }

  async runBattle(b: Battle, ctx: { /** Stadium Mode. */ stadium?: boolean; kind: 'wild' | 'trainer' | 'arbiter' | 'legendary' | 'endgame' | 'rival'; intro: string; city?: string; nodeId?: string; gimmick?: string; rivalLook?: TrainerLook; /** Duels: the challenged trainer, who keeps their own log of it. */ rival?: GameState; /** Duels: the coins at stake. */ wager?: number; /** Viewing a duel: the challenged trainer's seat. */ rivalSeat?: number; watch?: AsyncQueue<FeedItem>; /** Viewing: what happened before we looked in. */ past?: BEvent[]; duelLead?: (b: Battle, vs: CreatureInst | null) => Promise<number | undefined>; duel?: (b: Battle) => Promise<Action | undefined>; duelSend?: (b: Battle) => Promise<number | undefined> }): Promise<Battle['over']> {
    const s = this.s;
    closeAllSheets();
    $('.node-preview')?.remove();
    this.busy = true;
    const bv = this.battleView;
    bv.fxPace = settings().reduceMotion ? 0.5 : settings().fastBattle ? 0.7 : 1;
    const arenaType = ctx.city ? CITIES[ctx.city].type : undefined;
    // an arena with a timer (Cliff's crumbling plateau): a countdown chip, updated by 'ring' events
    const timer = arenaTimer(b);
    const ringTimer = timer ? h('span', { class: 'chip ring-timer', title: timer.hint }) : null;
    const showRing = (left: number, total: number) => {
      if (!timer || !ringTimer) return;
      ringTimer.textContent = left > 0 ? `⏳ ${timer.name}: ${left} round${left === 1 ? '' : 's'} left` : `⏳ ${timer.overShort}`;
      ringTimer.classList.toggle('urgent', left <= 2);
      ringTimer.title = `${left} of ${total} rounds left ${timer.leftHint}`;
    };
    if (timer) showRing(ringLeft(b)!, ringRounds(b)!);
    bv.setup(b.biome as never, arenaType, W.weather(s).id === 'aurora' || ctx.city === 'aurora' || timeOfDay(s.turn) === 'night');
    // trainer minis: only when the opponent is a trainer of some kind
    const foeSide = b.sides[1];
    const foeLook: TrainerLook | null =
      foeSide.kind === 'arbiter' ? arbiterLook(foeSide.name, arenaType ?? CITIES[b.arena?.city ?? '']?.type ?? 'fire')
        : foeSide.kind === 'champion' ? opponentLook(foeSide.name, true)
          : ctx.rivalLook ? ctx.rivalLook : foeSide.kind === 'trainer' ? opponentLook(foeSide.name) : null;
    bv.setTrainers(foeLook ? playerLook(s.trainer.name, s.trainer.color, s.trainer.look) : null, foeLook);
    this.engine.setView(bv);
    // Nobody (healthy) is Following: the trainer picks who leads before the fight starts
    const choosing = !ctx.watch && W.needsLeadChoice(s) && b.round === 0;
    // a duel: so does the challenged trainer, without either seeing the other's choice first
    if (ctx.duelLead && b.round === 0) {
      const idx = await ctx.duelLead(b, choosing ? null : activeOf(b.sides[0]));
      if (idx !== undefined) chooseLead(b, idx, 1);
    }
    if (choosing) await this.pickLead(b, ctx.intro, !!ctx.duelLead);
    // online: everyone else watches this battle live
    const live = { battle: JSON.parse(JSON.stringify(b)) as unknown, ctx: { kind: ctx.kind, intro: ctx.intro, city: ctx.city, rivalLook: ctx.rivalLook, rivalSeat: ctx.rival ? activeMatchOf()?.players.indexOf(ctx.rival) : undefined } as WatchCtx, past: [] as BEvent[] };
    if (!ctx.watch && this.online) this.liveFight = live;
    this.feed({ kind: 'battle-start', battle: live.battle, ctx: live.ctx });
    const disp: [Snap, Snap] = [battleSnap(b, activeOf(b.sides[0])), battleSnap(b, activeOf(b.sides[1]))];
    const panel = h('div', { class: 'battle-ui' });
    const logLine = h('div', { class: 'battle-log' }, ctx.intro);
    const plates = [h('div', { class: 'plate me' }), h('div', { class: 'plate foe' })];
    const controls = h('div', { class: 'battle-controls' });
    const header = h('div', { class: 'battle-head' },
      h('span', { class: 'chip' }, WEATHER[s.weather].icon, ' ', WEATHER[s.weather].name),
      b.arena ? h('span', { class: 'chip arena', style: `--tc:${TYPE_COLOR[arenaType!]}` }, '🏟 ', CITIES[ctx.city!].arena.name, ` · Tier ${b.arena.tier}`) : null,
      ringTimer,
      h('span', { class: 'chip' }, `Round `, h('b', { class: 'rnd' }, '1')),
      h('button', { class: 'chip log-btn', title: 'Battle Log: every move, roll and hit so far (L)', onclick: () => this.battleLogSheet(blog) }, '📜 Log'),
      b.sides[0].buff && Object.keys(b.sides[0].buff).length ? h('span', { class: 'chip good', title: `Chanko Nabe: ${W.buffText(b.sides[0].buff)} for your team this battle` }, '🍲 ', W.buffText(b.sides[0].buff)) : null);
    panel.append(header, plates[1], h('div', { class: 'battle-stack' }, plates[0], h('div', { class: 'battle-bottom' }, logLine, controls)));
    this.ui.replaceChildren(panel);

    const renderPlate = (side: 0 | 1) => {
      const sd = b.sides[side];
      const c = sd.team.find((x) => x.uid === disp[side].uid)!;
      const sn = disp[side];
      const sp = speciesOf(c);
      const recruited = sd.kind === 'wild' && s.dex.caught.includes(c.species);
      const guard = statusGuard(b, c); // an Instinct that keeps statuses off: say so up front
      plates[side].replaceChildren(
        h('div', { class: 'pl-top' },
          h('b', null, nameOf(c)), h('span', { class: 'lv' }, `Lv ${c.level}`),
          h('span', { class: 'pl-types' }, sp.types.map((t) => typeIconImg(t, 16))),
          c.ace ? h('span', { class: 'ace-tag', title: 'Their Ace: like your starter, it has a special bond (+1 Vigor, no attribute under 1)' }, '★ Ace') : null,
          recruited ? h('span', { class: 'caught-mark', title: 'Already recruited', 'aria-label': 'Already recruited' }, '🗿') : null,
          sn.zero ? h('span', { class: 'zero-tag', title: `Zeroing In: +${sn.zero} to its next accuracy roll, from missing. Misses stack it up to +${ZERO_IN_MAX}; leaving the field loses it.` }, h('i', { class: 'zi' }, '⌖'), ` +${sn.zero}`) : null,
          guard && !sn.ko ? h('span', { class: 'guard-tag', title: `${guard.text} Its Instinct protects it from status effects.`, 'aria-label': `Status protection: ${guard.text}` }, '🛡', guard.label === '🛡' ? '' : ` ${guard.label}`) : null,
          sn.status ? h('button', { class: 'status-tag', title: `${STATUS_INFO[sn.status].text} (tap for all statuses)`, onclick: () => openSheet('Status Effects', statusGuide()) }, STATUS_INFO[sn.status].icon, ' ', STATUS_INFO[sn.status].name) : null),
        h('div', { class: 'pl-vit' },
          h('span', { class: 'team-balls' }, sd.team.map((x) => h('i', { class: `${x.ko ? 'ko' : ''} ${x.ace ? 'ace' : ''}`, title: x.ace ? 'Their Ace: a tougher creature with a special bond' : '' })))),
        // the Health bar (notched into hearts) and the Fatigue warning diamond on both sides; your side also gets a thin Stamina bar under Health
        h('div', { class: `pl-bars ${side === 0 ? 'mine' : 'foe'}` },
          healthBar(maxHearts(c), sn, { over: sn.over }),
          h('span', { class: 'num' }, sn.ko ? 'KO' : `${totalHealth(sn)}/${maxTotal(c)}`, sn.over && !sn.ko ? h('span', { class: 'over-num', title: 'Overheal: extra Health that soaks up damage first' }, ` +${sn.over}`) : null),
          fatigueBadge(sn.fatigue),
          ...(side === 0 ? [
            h('div', { class: 'bar sta-bar', title: `Stamina ${sn.stamina}/${maxStamina(c)}: each move's 💨 Effort comes out of it. Running out adds Fatigue.` },
              h('i', { style: `width:${Math.min(100, (sn.stamina / maxStamina(c)) * 100)}%` })),
            h('span', { class: 'num sta-num', title: 'Stamina' }, `💨 ${sn.stamina}/${maxStamina(c)}`)] : [])),
        // attributes above or below normal right now; tap for where each comes from
        ...(sn.boosts?.length && !sn.ko ? [h('button', { class: 'pl-boosts', 'aria-label': `${nameOf(c)}’s attribute changes`, onclick: () => boostSheet(nameOf(c), disp[side].boosts ?? []) },
          sn.boosts.map((x) => h('span', { class: `boost ${x.n > 0 ? 'up' : 'down'}`, title: boostWhy(x) }, `${x.n > 0 ? '▲' : '▼'} ${STAT_LABEL[x.stat]} ${signedN(x.n)}`)))] : []));
    };
    const say = (t: string, tone?: string) => { setText(logLine, t); logLine.className = `battle-log ${tone ?? ''}`; };
    // Normal battles slow down and explain every roll; Fast battles (Settings) keep the quick pace
    const slow = () => !settings().fastBattle;
    const pace = (ms: number) => (slow() ? Math.round(ms * 1.6) : ms);
    const whoOn = (side: 0 | 1) => nameOf(b.sides[side].team.find((x) => x.uid === disp[side].uid) ?? activeOf(b.sides[side]));

    // ── Battle Log: every line of the fight, with the full rolls and maths, to look back on ──
    // Once the fight is under way it becomes each trainer's last battle, kept in their save (a duel: both
    // trainers, each from their own side). Spectators only keep it for this session.
    // (the challenged trainer, viewing their own duel, reads it from their side)
    const view: 0 | 1 = ctx.watch && ctx.rivalSeat !== undefined && ctx.rivalSeat >= 0 && ctx.rivalSeat === this.mySeat() ? 1 : 0;
    const blog: BattleLog = { title: ctx.intro, turn: s.turn, entries: [] };
    const rivalLog: BattleLog | null = ctx.rival && !ctx.watch ? { title: ctx.kind === 'endgame' ? ctx.intro : `${s.trainer.name} challenged you to a duel!`, turn: ctx.rival.turn, entries: [] } : null;
    this.liveLog = blog;
    const note = (text: string, opts: { tone?: string } = {}) => addLine(blog, { round: b.round, text, ...opts });
    note(ctx.intro, { tone: 'info' });
    if (rivalLog) addLine(rivalLog, { round: b.round, text: rivalLog.title, tone: 'info' });
    const keepLogs = () => {
      if (ctx.watch) { this.watchedLog = blog; return; }
      s.lastBattle = blog;
      if (ctx.rival && rivalLog) ctx.rival.lastBattle = rivalLog;
    };
    const logEvent = (e: BEvent) => {
      logBattleEvent(blog, b, e, whoOn, view);
      if (rivalLog) logBattleEvent(rivalLog, b, e, whoOn, 1);
    };
    // a Chanko Nabe kicks in: say so, and keep a chip in the header for the whole battle
    const nabe = !ctx.watch && s.hotpot && b.sides[0].buff && Object.keys(b.sides[0].buff).length ? `${CITIES[s.hotpot.city]?.hotpot.name ?? 'Chanko Nabe'}: ${W.buffText(b.sides[0].buff)} this battle` : null;
    if (nabe) { note(`🍲 ${nabe}.`, { tone: 'good' }); toast(`🍲 ${nabe}!`, 'good', 3000); }

    let watchedEnd: Battle['over'] = null;
    // a viewer's copy of the battle doesn't play the rounds itself: each event says which one it's from
    const atRound = (e: BEvent & { round?: number }) => { if (ctx.watch && e.round) { b.round = e.round; $('.rnd', header).textContent = String(e.round); } };
    // looking in on a battle under way: bring the board and the log up to date without replaying it
    for (const e of ctx.past ?? []) {
      atRound(e);
      logBattleEvent(blog, b, e, whoOn, view);
      if ('snap' in e && e.snap) disp[e.side] = e.snap;
      if (e.t === 'ring') { showRing(e.left, e.total); void bv.shrinkRing(1 - e.left / e.total); }
      if (e.t === 'end') watchedEnd = e.result;
    }
    const left = { now: false };
    if (ctx.watch) this.leaveWatch = () => {
      this.leaveWatch = null;
      left.now = true;
      this.watchPlaying = false;
      this.watchQueue = null;
      ctx.watch!.push({ kind: 'battle-end' });
      this.liveLog = null;
      this.engine.setView(this.world);
      this.busy = false;
      this.renderHud();
    };

    // viewing: our own team and bag, and the way back, from the first moment
    const watchTools = () => [
      this.mySeat() >= 0 ? h('button', { class: 'btn ghost sm', onclick: () => this.myTeamSheet() }, '🐾 My team') : null,
      this.mySeat() >= 0 ? h('button', { class: 'btn ghost sm', onclick: () => this.myBagSheet() }, '🎒 My bag') : null,
      h('button', { class: 'btn primary sm', title: 'Stop viewing (Esc). You can look in again while the battle lasts.', onclick: () => this.leaveWatch?.() }, '🗺️ Back to map')];
    if (ctx.watch) controls.replaceChildren(h('div', { class: 'row gap-s center wrap' }, ...watchTools()));

    bv.trainerHop(0); bv.trainerHop(1);
    await Promise.all(([0, 1] as const).map((i) => bv.setCreature(i, disp[i].ko ? null : (b.sides[i].team.find((x) => x.uid === disp[i].uid) ?? activeOf(b.sides[i])).species)));
    if (left.now) return null;
    renderPlate(0); renderPlate(1);

    const play = async (events: BEvent[]) => {
      keepLogs();
      if (!ctx.watch) { const sent = events.map((e) => ({ ...e, round: b.round })); live.past.push(...sent); this.feed({ kind: 'battle-events', events: sent }); }
      for (const e of events) {
        if (left.now) return;
        if (e.t === 'end') watchedEnd = e.result;
        atRound(e);
        try { logEvent(e); } catch (err) { console.error('battle log error', err); }
        try { await playOne(e); } catch (err) { console.error('battle fx error', err); }
      }
      renderPlate(0); renderPlate(1);
    };
    // two people's battle, or someone else's: name the sides instead of "You" and "Foe"
    const sideName = (side: 0 | 1) => (ctx.rival || ctx.watch ? (side === 0 ? s.trainer.name : b.sides[1].kind === 'wild' ? 'Foe' : b.sides[1].name) : side === 0 ? 'You' : 'Foe');
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
            await rollDice('Clash! Speeds tied', [{ sides: e.dice[0], value: e.rolls[0], label: sideName(0), tone: e.loser === 0 ? 'bad' : 'good' }, { sides: e.dice[1], value: e.rolls[1], label: sideName(1), tone: e.loser === 1 ? 'bad' : 'good' }], e.loser === null ? 'Even clash! A coin flip decides who goes first…' : `${sideName(e.loser)} rolled lower: ${e.dmg} damage (the difference) and acts second.`, slow() ? 1300 : 500);
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
          case 'buff': { if (e.snap) { disp[e.side] = e.snap; renderPlate(e.side); } const p = bv.screenOf(e.side); floatText(p.x, p.y + 30, e.text, 'buff'); await wait(450); break; }
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
            canSurrender(b) ? h('button', { class: 'btn ghost sm', title: 'Give up this battle (you’re asked first)', onclick: async () => { if (await this.confirmSurrender(b, ctx) && panel.isConnected && controls.querySelector('.move-grid')) void act({ kind: 'surrender' }); } }, '🏳️ Surrender') : null,
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
        if (document.querySelector('.sheet-wrap') || !panel.isConnected) return;
        if (readoutFor && controls.querySelector('.readout')) {
          if (ev.key === 'Escape' || ev.key === 'Backspace') { readoutFor = null; showControls(); }
          else if (ev.key === 'Enter') { ev.preventDefault(); const id = readoutFor; readoutFor = null; act({ kind: 'move', move: id }); }
          return;
        }
        if (ev.key.toLowerCase() === 'l') { this.battleLogSheet(blog); return; }
        if (ctx.watch && ev.key === 'Escape') { this.leaveWatch?.(); return; }
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
        if (left.now) { resolve(r); return; }
        this.liveLog = null;
        // Teamwork earned from swaps this battle
        if (!ctx.watch && b.teamworkGains?.length) toast(`🤝 Teamwork grew: ${b.teamworkGains.map(riseText).join(' · ')}.`, 'good', 6000);
        resolve(r);
      };
      const act = async (a: Parameters<typeof resolveRound>[1]) => {
        controls.replaceChildren(h('div', { class: 'waiting' }, ctx.duel ? `Waiting for ${b.sides[1].name} to choose…` : '…'));
        // two-player duel: the other trainer picks their creature's action too
        const foe = ctx.duel && a.kind !== 'surrender' ? await ctx.duel(b) : undefined;
        const ev = resolveRound(b, a, foe);
        await play(ev);
        showControls();
      };
      const swapPicker = () => {
        const cur = activeOf(b.sides[0]);
        const close = openSheet('Swap — choose the incoming Alpha', h('div', null,
          h('p', { class: 'small' }, `The incoming creature is the Alpha: it uses the Swap Move set for swapping in for ${nameOf(cur)} (change it here or on its card). The swap resolves at ${nameOf(cur)}'s speed.`),
          h('p', { class: 'small muted' }, `🤝 Teamwork: every ${TEAMWORK_PER_BONUS} Teamwork the Alpha has with ${nameOf(cur)} adds +1 to its Swap Move, and stronger Swap Moves unlock at Teamwork 1 and 2 (3 for Boosted ones, if the two share a type). A pair earns +${TEAMWORK_PER_SWAP} Teamwork the first time one swaps in for the other in a battle, and +${TEAMWORK_PER_TURN} each turn they travel together. A pair’s Teamwork is capped at half the lower Loyalty of the two.`),
          h('div', { class: 'list' }, b.sides[0].team.map((c, i) => {
            if (c.ko || c === cur) return null;
            return this.swapRow(swapRowInfo(b, 0, i), () => { close(); act({ kind: 'swap', to: i }); }, () => { close(); editSwapMove(c, cur, () => swapPicker()); });
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
          h('button', { class: 'btn ghost sm', title: 'Type chart for this matchup (T)', onclick: () => showTypes() }, '🔺 Types'),
          ...watchTools()));
        this.watchPlaying = false;
        void (async () => {
          for (;;) {
            if (watchedEnd) { finish(watchedEnd); return; }
            const it = await ctx.watch!.next();
            if (it.kind === 'battle-events') { this.watchPlaying = true; try { await play(it.events as BEvent[]); } finally { this.watchPlaying = false; } }
            if (it.kind === 'battle-end' || watchedEnd) { finish(watchedEnd ?? 'fled'); return; }
          }
        })();
      } else showControls();
    });
    if (ctx.watch) {
      if (!left.now) { this.leaveWatch = null; this.engine.setView(this.world); this.busy = false; }
      return result;
    }
    if (this.liveFight === live) this.liveFight = null;
    this.feed({ kind: 'battle-end' });

    // ── Aftermath ──────────────────────────────────────────────
    if (result === 'win') { sfx.fanfare(); say('Victory!', 'good'); await wait(600); }
    if (result === 'lose') { sfx.bad(); say(b.surrendered === 0 ? 'You surrendered.' : 'Your team is out of creatures…', 'bad'); await wait(900); }
    if (result === 'fled') await wait(500);
    const wild = b.sides[1].team[0];
    W.recordResult(s, b, ctx.kind, ctx.city);
    if (result === 'win' && (ctx.kind === 'wild' || ctx.kind === 'legendary')) {
      await this.recruitFlow(wild);
    }
    // a Wanderer whose team is wiped out picks which rested city to return to
    let wipeTo: string | undefined;
    // a Rival or Champion who beat the whole team may help one creature up
    const helper = ctx.kind === 'trainer' ? N.mercyOffer(s, b) : null;
    const mercy = helper ? await this.mercySheet(helper) : undefined;
    if (!mercy && ctx.kind !== 'rival' && ctx.kind !== 'endgame' && s.roster.every((c) => c.ko) && W.wipeOptions(s).length > 1) wipeTo = await this.pickWipeCity();
    const rematch = ctx.kind === 'arbiter' && s.merits.includes(ctx.city!);
    const summary = W.finishBattle(s, b, { kind: ctx.kind, city: ctx.city, nodeId: ctx.nodeId, gimmick: ctx.gimmick, wipeTo, mercy });
    for (const t of summary.text) toast(t, summary.wiped || b.surrendered === 0 ? 'bad' : 'good', 3500);
    this.busy = false;
    if (ctx.kind !== 'endgame') {
      this.engine.setView(this.world);
      if (summary.wiped) { this.world.setPawnAt(s.location); this.world.focus(s.location, true); }
      save(s);
      this.renderHud();
      if (ctx.kind === 'arbiter' && result === 'win') { if (rematch) { sfx.fanfare(); this.imprintSheet(CITIES[ctx.city!].type); } else this.meritCelebration(ctx.city!); }
    }
    return result;
  }

  /** A Rival or Champion offers to help one creature up: which one, or undefined to go home instead. */
  mercySheet(npc: Npc): Promise<string | undefined> {
    const s = this.s;
    return new Promise((resolve) => {
      const done = (uid?: string) => { this.settleLoss = null; close(); resolve(uid); };
      this.settleLoss = () => done();
      const close = openSheet(`🧂 ${npc.name} offers a hand`, h('div', null,
        h('div', { class: 'npc-head' }, h('img', { src: this.npcPortrait(npc), alt: '' }), h('div', null, h('p', null, `“${VOICES[npc.id].mercy}”`),
          h('p', { class: 'small muted' }, 'Choose a creature to revive with half its hearts and carry on from here, instead of being sent back to rest (which costs half your coins and the rest of your turn, but restores everyone).'))),
        h('div', { class: 'list' }, s.roster.map((c) => miniCard(c, { onClick: () => done(c.uid) }))),
        h('div', { class: 'row end' }, h('button', { class: 'btn ghost', onclick: () => done() }, 'No thanks, go and rest'))), { noClose: true });
    });
  }

  /** The team is wiped out, and there's more than one home to return to (a Wanderer's rested cities, a sponsor's): choose. */
  pickWipeCity(): Promise<string> {
    const s = this.s;
    const last = W.wipeDefault(s);
    return new Promise((resolve) => {
      this.settleLoss = () => { this.settleLoss = null; close(); resolve(last); };
      const close = openSheet('🏠 Where do you rest up?', h('div', null,
        h('p', { class: 'small' }, `Your team is wiped out. ${s.trainer.style === 'balanced' ? 'As a Wanderer you make your home anywhere: return to any city you’ve rested at this game' : 'Your sponsor’s city is your home too: choose where to return'}. You still lose half your coins, and your turn ends.`),
        h('div', { class: 'list' }, W.wipeOptions(s).map((id) => {
          const c = CITIES[id];
          return h('button', { class: 'choice', onclick: () => { this.settleLoss = null; close(); resolve(id); } },
            h('b', null, h('img', { src: typeIcon(c.type), alt: '', style: 'width:18px;height:18px;vertical-align:-3px;margin-right:6px' }), c.name),
            h('small', { class: 'muted' }, [`${TYPE_LABEL[c.type]} City · Arbiter ${c.arbiter}`, id === s.trainer.home ? '🏠 Home' : '', id === s.sponsor?.city ? '💛 Sponsor’s home' : '', s.trainer.style === 'balanced' && id === last ? 'rested here last' : ''].filter(Boolean).join(' · ')));
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
    const won = `✓ ${c.accolade} earned. A rematch wins an Imprint of ${TYPE_LABEL[c.type]} energy.`;
    const body = h('div', { class: 'city' },
      h('div', { class: 'city-hero', style: `--tc:${TYPE_COLOR[c.type]}` },
        h('img', { src: typeIcon(c.type) }),
        h('div', null, h('h3', null, c.name), h('small', null, `Inspired by ${c.park} · ${TYPE_LABEL[c.type]} City${s.trainer.home === id ? ' · 🏠 Home' : ''}${s.sponsor?.city === id ? ` · 💛 Sponsored by ${NPC_BY_ID[s.sponsor.npc]?.name ?? 'a Champion'}` : ''}`), h('p', { class: 'small' }, c.blurb))),
      h('div', { class: 'tiles' },
        tile('🍲', 'Stable', `${c.hotpot.name}: full recovery + ${c.hotpot.text}${s.trainer.home === id ? ' (doubled — home!)' : s.sponsor?.city === id && s.trainer.style !== 'balanced' ? ' (doubled — your sponsor’s home is yours)' : s.trainer.style === 'balanced' ? ` (doubled — a Wanderer is at home anywhere${W.restedCities(s).includes(id) ? '' : '. Resting here also lets you return here if your team is wiped'})` : ''}`, `${W.stableCost(s)}⚡`, () => this.stable()),
        this.swapTile(),
        // free to browse: the first purchase (or carving) each turn costs the city action
        tile('🛒', 'Market', 'Restores, treats, charms and totems. Free to browse.', !cost ? costTag : W.facilityPaid(s, 'market') ? '✓ paid' : `${costTag} to buy`, () => this.market()),
        tile('🔄', 'Carving Shrine', 'Carve type totems and creature effigies. Free to look.', !cost ? costTag : W.facilityPaid(s, 'shrine') ? '✓ paid' : `${costTag} to carve`, () => this.shrine()),
        tile('🛠️', 'Workbench', 'Craft salves, teas, charms and more from offering materials. Free to look.', !cost ? costTag : W.facilityPaid(s, 'workbench') ? '✓ paid' : `${costTag} to craft`, () => this.workbench()),
        this.workTile(),
        ...this.npcTiles(),
        tile('🤺', 'Trainer Hall', W.hallBlock(s) && s.flags.sparred?.includes(id) ? 'You’ve battled here this turn. Come back next turn.' : `Battle a local trainer once per turn. Trainer battles earn +${TRAINER_BATTLE_XP_BONUS} XP for every creature that fights, win or lose, plus coins if you win.`, costTag, () => this.trainerHall(), !!s.flags.sparred?.includes(id)),
        id === 'aurora' ? tile('🌀', 'Cloud Island Portal', W.portalOpen(s)
          ? `Open ${seasonForTurn(s.turn) === 'winter' ? 'all Winter' : 'tonight'}. Step through from the map (the dotted path north-west).${s.flags.salemWorthy ? '' : ` A full lap of the island earns a match with Salem (${W.cloudLapProgress(s).steps}/${W.CLOUD_LAP}).`}`
          : 'Closed by day. The portal opens at night (even turns), and stays open all Winter.', '', () => this.cloudSheet()) : null,
        ...(screens().tiles?.(this, id, costTag) ?? []),
        screens().arbiterTile?.(this, id, won) ?? tile('🏟️', `Arbiter ${c.arbiter}`, s.merits.includes(id) ? `${won}${gate.ok ? ' Ready.' : ` ${gate.reason}`}` : `${c.arena.name}. ${gate.ok ? 'Ready to accept your challenge.' : gate.reason}`, costTag, () => this.arbiter())));
    openSheet(c.name, body, { wide: true });
  }

  // ════════════════════════════════════════════════════════════
  // Rivals and Champions
  // ════════════════════════════════════════════════════════════
  private npcPortrait(npc: Npc) { return trainerPortrait(npcLook(npc)); }

  /** City and town tiles for the Rivals and Champions who are here. */
  private npcTiles() {
    const s = this.s;
    return N.npcsHere(s).map((npc) => {
      const r = N.recordWith(s, npc);
      return tile(npc.kind === 'champion' ? '🏅' : '🤺', npc.name, r?.invite ? 'Here to meet you!' : `${npc.blurb}`, r ? `${r.won}–${r.lost}` : 'new', () => this.npcSheet(npc));
    });
  }

  /** Someone who's here: pass the time, or challenge them. */
  npcSheet(npc: Npc) {
    const s = this.s;
    const body = h('div');
    const render = (said = npc.lines.greet) => {
      const r = N.recordWith(s, npc);
      const why = N.challengeNpcBlock(s, npc);
      const rev = N.revengeBonus(r?.owed ?? 0);
      const chatted = r?.chatted === N.npcStay(s.turn);
      body.replaceChildren(
        h('div', { class: 'npc-head' }, h('img', { src: this.npcPortrait(npc), alt: '' }), h('div', null,
          h('div', { class: 'row gap-s wrap' }, npc.types.map((t) => typeChip(t, true)), r ? h('small', { class: 'muted' }, `You ${r.won}, them ${r.lost} · ${N.npcMood(r)}`) : h('small', { class: 'muted' }, 'You haven’t met.')),
          h('p', { class: 'small' }, npc.blurb), h('p', null, `“${said}”`))),
        rev ? h('p', { class: 'small good-text' }, `🔥 Revenge: beating them now pays ${rev.coins + 1}× coins, +${rev.xp} XP for everyone who fights, and ${itemInfo(rev.item).icon} ${itemInfo(rev.item).name}.`) : '',
        h('p', { class: 'small muted' }, `Their team is about Lv ${N.npcLevel(s, npc)}. Normal trainer stakes: win coins, or pay them if you lose.`),
        h('div', { class: 'row end gap wrap' },
          h('button', { class: 'btn ghost', disabled: chatted, title: chatted ? 'You’ve caught up already.' : '', onclick: () => {
            const c = N.chatWith(s, npc);
            if (!c) return;
            if (c.gift) toast(`${npc.name} shares a ${itemInfo(c.gift).icon} ${itemInfo(c.gift).name}.`, 'good');
            save(s); this.renderHud(); render(c.line);
          } }, '💬 Chat'),
          h('button', { class: 'btn ghost', onclick: () => { N.meet(s, npc); this.npcTradeSheet(npc, true, () => render()); } }, '🔄 Trade'),
          h('button', { class: 'btn primary', disabled: !!why, title: why ?? '', onclick: async () => {
            const b = N.challengeNpc(s, npc);
            if (!b) return;
            closeAllSheets(); save(s); this.renderHud();
            await this.runBattle(b, { kind: 'trainer', intro: `${npc.name}: “${npc.lines.greet}”` });
          } }, `⚔️ Challenge · ${W.cityActionCost(s)}⚡`)),
        why ? h('small', { class: 'muted' }, why) : '',
        this.sponsorRow(s, npc, () => render()));
    };
    render();
    openSheet(npc.name, body, { wide: true });
  }

  /** A Champion's sponsorship, on their sheet: how close you are, their offer, or that they're your sponsor. */
  private sponsorRow(s: GameState, npc: Npc, changed: () => void): HTMLElement | string {
    if (npc.kind !== 'champion') return '';
    const city = CITIES[npc.home].name;
    const perk = N.sponsorPerk(s, npc) === 'free' ? `You’re already at home in ${city}, so its Nabe would cost you no Initiative.` : `${city} would be your home too: its Nabe doubled, and somewhere to return after a wipe or by Homing Feather.`;
    if (s.sponsor?.npc === npc.id) return h('p', { class: 'small good-text' }, `💛 ${npc.name} sponsors you. ${N.sponsorPerk(s, npc) === 'free' ? `${city}’s Nabe costs you no Initiative.` : `${city} is your home too.`}`);
    const r = N.recordWith(s, npc);
    if (!N.wouldSponsor(s, npc)) return h('p', { class: 'small muted' }, `💛 Sponsorship: Champions sponsor trainers they’re firm friends with (${Math.max(0, Math.min(N.SPONSOR_RAPPORT, r?.rapport ?? 0))}/${N.SPONSOR_RAPPORT}). ${perk}`);
    const now = s.sponsor ? NPC_BY_ID[s.sponsor.npc] : null;
    return h('div', { class: 'sponsor-offer' }, h('p', { class: 'small' }, h('b', null, `💛 ${npc.name} offers to sponsor you. `), perk),
      now ? h('p', { class: 'small muted' }, `You can have one sponsor: this would take ${now.name}’s place.`) : null,
      h('button', { class: 'btn primary sm', onclick: async () => {
        if (now && !(await confirmSheet(`Switch to ${npc.name}?`, `${now.name} would no longer sponsor you in ${CITIES[now.home].name}. You can switch back if you’re still firm friends, by meeting them again.`, 'Switch'))) return;
        if (!N.sponsor(s, npc)) return;
        sfx.fanfare(); toast(`💛 ${npc.name} is your sponsor!`, 'good', 4000); save(s); this.renderHud(); changed();
      } }, 'Accept sponsorship'));
  }

  /** Menu → Rival Trainers: everyone met, with records, the creatures they've shown and rematches; and the Circuit Standings. */
  rivalsSheet() {
    const s = this.idOwner();
    const mine = s === this.s && !this.watching && s.phase === 'map';
    const body = h('div');
    let tab: 'rivals' | 'chats' | 'dares' | 'standings' = mine && T.unreadTexts(s) ? 'chats' : 'rivals';
    const render = () => {
      const met = [...N.RIVALS, ...N.CHAMPIONS].filter((x) => N.recordWith(s, x)).sort((a, b) => (N.recordWith(s, b)!.last?.turn ?? 0) - (N.recordWith(s, a)!.last?.turn ?? 0));
      body.replaceChildren(
        h('div', { class: 'row gap-s wrap npc-tabs', role: 'group', 'aria-label': 'View' }, (['rivals', 'chats', 'dares', 'standings'] as const).map((t) => h('button', { class: `pick ${t === tab ? 'sel' : ''}`, 'aria-pressed': String(t === tab), onclick: () => { tab = t; render(); } }, t === 'rivals' ? '🤺 Rivals & Champions' : t === 'chats' ? `💬 Messages${T.unreadTexts(s) ? ` (${T.unreadTexts(s)})` : ''}` : t === 'dares' ? `🎯 Challenges${D.activeDares(s).length ? ` (${D.activeDares(s).length})` : ''}` : '🏆 Circuit Standings'))),
        tab === 'standings' ? this.standingsBody(s) : tab === 'chats' ? this.chatsBody(s, mine, render) : tab === 'dares' ? this.daresBody(s, mine, render) : met.length ? h('div', { class: 'list' }, met.map((npc) => this.npcCard(s, npc, mine, render)))
          : h('p', { class: 'muted' }, 'You haven’t met anyone yet. Rivals turn up on roads and meadows, in Trainer Halls and in the morning; Champions tour the cities and towns.'),
        tab === 'rivals' ? h('p', { class: 'small muted' }, `Met ${met.filter((x) => x.kind === 'rival').length} of ${N.RIVALS.length} Rivals and ${met.filter((x) => x.kind === 'champion').length} of ${N.CHAMPIONS.length} Champions.`) : '');
    };
    render();
    openSheet('🥇 Rival Trainers', body, { wide: true });
  }

  private npcCard(s: GameState, npc: Npc, mine: boolean, changed: () => void) {
    const r = N.recordWith(s, npc)!;
    const rev = N.revengeBonus(r.owed);
    const why = N.inviteBlock(s, npc);
    const at = (id: string) => NODE_BY_ID[id]?.name ?? id;
    const where = npc.kind === 'champion' && !r.invite ? N.championAt(s, npc) : null;
    return h('div', { class: 'npc-card', style: `--tc:${TYPE_COLOR[npc.types[0]]}` },
      h('div', { class: 'npc-head' }, h('img', { src: this.npcPortrait(npc), alt: '' }), h('div', null,
        h('div', { class: 'row gap-s wrap' }, h('b', null, npc.name), npc.types.map((t) => typeChip(t, true)), h('span', { class: 'chip' }, N.npcMood(r)), s.sponsor?.npc === npc.id ? h('span', { class: 'chip good', title: `${CITIES[npc.home].name} is their home city` }, '💛 Your sponsor') : N.wouldSponsor(s, npc) ? h('span', { class: 'chip good', title: 'Find them to accept' }, '💛 Offers to sponsor you') : null, N.isContender(s, npc) ? h('span', { class: 'chip good', title: 'Your battles have made a Circuit contender of them' }, '📈 Contender') : null),
        h('p', { class: 'small' }, npc.blurb),
        h('p', { class: 'small' }, h('b', null, `You ${r.won} · Them ${r.lost}`), r.revenges ? ` · 🔥 ${r.revenges} avenged` : '', r.daresWon || r.daresLost ? ` · 🎯 ${r.daresWon ?? 0}–${r.daresLost ?? 0}` : '', h('span', { class: 'muted' }, ` · Met turn ${r.met}${r.last ? ` · Last: you ${r.last.won ? 'won' : 'lost'} at ${at(r.last.at)}, turn ${r.last.turn}` : ''} · From ${at(npc.home)} · ${N.npcMerits(s, npc).length}/8 Merits`)),
        rev ? h('p', { class: 'small good-text' }, `🔥 Revenge is waiting: ${rev.coins + 1}× coins, +${rev.xp} XP and ${itemInfo(rev.item).icon} ${itemInfo(rev.item).name}.`) : null)),
      h('div', { class: 'npc-team', 'aria-label': 'Their creatures' }, N.npcLineup(s, npc).map((sp, i) => {
        const seen = r.seen.includes(i), ace = i === 0;
        return h('span', { class: `npc-mon ${seen ? '' : 'unseen'} ${ace ? 'ace' : ''}`, title: seen ? `${sp.name} · about Lv ${N.npcLevel(s, npc)}${ace ? ' · their Ace' : ''}` : ace ? 'Their Ace (not seen yet)' : 'Not seen yet' },
          h('img', { src: portrait(sp.id), alt: seen ? sp.name : 'Unknown creature' }), ace ? h('i', null, '★') : null, h('small', null, seen ? sp.name : '???'));
      })),
      r.invite ? h('div', { class: 'row gap-s wrap' }, h('button', { class: 'btn ghost sm', onclick: () => this.chatSheet(s, npc, mine, changed) }, '💬 Message'), h('span', { class: 'small' }, `🤝 Meeting at ${at(r.invite.at)}, turns ${r.invite.from}–${r.invite.until}.`),
        mine ? h('button', { class: 'btn ghost sm', onclick: () => { this.markNextStop(r.invite!.at); } }, '📍 Mark it') : null,
        mine ? h('button', { class: 'btn ghost sm', onclick: () => { N.cancelInvite(s, npc); save(s); changed(); } }, 'Call it off') : null)
        : h('div', { class: 'row gap-s wrap' },
          h('button', { class: 'btn ghost sm', onclick: () => this.chatSheet(s, npc, mine, changed) }, '💬 Message'),
          where ? h('span', { class: 'small muted' }, `🏅 Now at ${at(where)}.`) : null,
          mine ? h('button', { class: 'btn ghost sm', disabled: !!why, title: why ?? '', onclick: () => this.inviteSheet(npc, changed) }, '🤝 Arrange to meet') : null,
          mine && why ? h('small', { class: 'muted' }, why) : null));
  }

  /** Conversations, the latest first. */
  private chatsBody(s: GameState, mine: boolean, changed: () => void) {
    const list = T.chats(s);
    if (!list.length) return h('p', { class: 'muted' }, 'Once you’ve met a Rival or Champion you can text each other here.');
    return h('div', { class: 'list' }, list.map((npc) => {
      const c = T.chatWithNpc(s, npc), last = c?.texts[c.texts.length - 1];
      return h('button', { class: `chat-row ${c?.unread ? 'unread' : ''}`, style: `--tc:${TYPE_COLOR[npc.types[0]]}`, onclick: () => this.chatSheet(s, npc, mine, changed) },
        h('img', { src: this.npcPortrait(npc), alt: '' }),
        h('span', null, h('b', null, npc.name), h('small', { class: 'muted' }, last ? `${last.me ? 'You: ' : ''}${last.text}` : 'No messages yet')),
        c?.unread ? h('span', { class: 'chip good' }, String(c.unread)) : c?.ask ? h('span', { class: 'chip', title: 'Waiting for your reply' }, '↩') : null);
    }));
  }

  /** A conversation: the texts, and what you can say. */
  chatSheet(s: GameState, npc: Npc, mine: boolean, changed: () => void) {
    const body = h('div');
    const did = (ok: boolean) => { if (!ok) return; sfx.tap(); save(s); this.renderHud(); render(); changed(); };
    const render = () => {
      if (mine) T.readChat(s, npc);
      const c = T.chatWithNpc(s, npc);
      const answers = T.replies(s, npc);
      const say = (list: T.Reply[], go: (id: string) => boolean) => list.map((o) => h('button', { class: 'btn ghost sm', disabled: !!o.disabled, title: o.disabled ?? '', onclick: () => did(go(o.id)) }, o.label));
      const why = N.inviteBlock(s, npc);
      let turn = -1;
      const log = h('div', { class: 'chat-log', role: 'log', 'aria-label': `Messages with ${npc.name}` }, (c?.texts ?? []).flatMap((m) => {
        const bits: HTMLElement[] = [h('p', { class: `bubble ${m.me ? 'me' : ''}` }, m.text)];
        if (m.turn !== turn) { turn = m.turn; bits.unshift(h('small', { class: 'chat-turn muted' }, `Turn ${m.turn}`)); }
        return bits;
      }), c?.texts.length ? null : h('p', { class: 'muted center' }, 'No messages yet. Say something!'));
      body.replaceChildren(log, mine ? h('div', { class: 'chat-say' },
        ...(answers.length ? say(answers, (id) => T.reply(s, npc, id)) : [...say(T.openers(s, npc), (id) => T.writeFirst(s, npc, id)),
          h('button', { class: 'btn ghost sm', onclick: () => this.npcTradeSheet(npc, N.npcsHere(s).includes(npc), () => { render(); changed(); }) }, '🔄 Trade'),
          (() => { const no = D.dareBlock(s, npc); return h('button', { class: 'btn ghost sm', disabled: !!no, title: no ?? '', onclick: () => this.dareSheet(npc, () => { render(); changed(); }) }, '🎯 Challenge'); })(),
          h('button', { class: 'btn ghost sm', disabled: !!why, title: why ?? '', onclick: () => this.inviteSheet(npc, () => { render(); changed(); }) }, '🤝 Arrange to meet')]),
        N.recordWith(s, npc)?.invite ? h('small', { class: 'muted' }, `Meeting at ${NODE_BY_ID[N.recordWith(s, npc)!.invite!.at].name}, turns ${N.recordWith(s, npc)!.invite!.from}–${N.recordWith(s, npc)!.invite!.until}.`) : '') : h('p', { class: 'small muted' }, 'You can answer on your own turn.'));
      requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    };
    render();
    if (mine) { save(s); this.renderHud(); changed(); }
    openSheet(`💬 ${npc.name}`, body, { wide: true });
  }

  /** Side challenges under way: both sides' progress. */
  private daresBody(s: GameState, mine: boolean, changed: () => void) {
    const list = D.activeDares(s);
    const bar = (who: string, at: number, of: number, color: string, text: string) => h('div', { class: 'dare-row' }, h('small', null, who), h('div', { class: 'dare-bar' }, h('i', { style: `width:${Math.round((100 * at) / Math.max(1, of))}%;background:${color}` })), h('small', { class: 'muted' }, text));
    return h('div', null, list.length ? h('div', { class: 'list' }, list.map(({ npc, dare: d }) => {
      const me = D.myProgress(s, d), they = D.theirProgress(s, d), p = D.darePrize(s, d);
      const steps = d.kind === 'race' ? D.walkSteps(s.location).get(d.target!) : undefined;
      const left = d.due - s.turn + 1;
      return h('div', { class: 'npc-card', style: `--tc:${TYPE_COLOR[npc.types[0]]}` },
        h('div', { class: 'npc-head' }, h('img', { src: this.npcPortrait(npc), alt: '' }), h('div', null,
          h('b', null, `${D.DARE_ICON[d.kind]} ${D.dareText(d)}`),
          h('p', { class: 'small muted' }, `Against ${npc.name}. Prize: 💰 ${p.coins}${d.wager ? ` + 💰 ${d.wager} wager` : ''} and ${itemInfo(p.item).icon} ${itemInfo(p.item).name}. They’ll finish by the end of turn ${d.due} (${left === 1 ? 'this turn' : `${left} turns`}).`),
          bar('You', d.kind === 'race' ? (me ? 1 : 0) : me, d.n, 'var(--good)', d.kind === 'race' ? (steps !== undefined ? `${steps} steps to go` : 'off the paths') : d.n > 1 ? `${me}/${d.n}` : me ? 'done' : 'not yet'),
          bar(npc.name.split(' ').pop()!, they.at, they.of, 'var(--accent)', d.kind === 'race' ? `${they.of - they.at} steps to go` : d.n > 1 ? `${they.at}/${they.of}` : 'on the way'),
          mine ? h('div', { class: 'row gap-s wrap' }, d.target && NODE_BY_ID[d.target] ? h('button', { class: 'btn ghost sm', onclick: () => this.markNextStop(d.target!) }, '📍 Mark it') : null,
            h('button', { class: 'btn ghost sm', onclick: async () => { if (!(await confirmSheet('Give up the challenge?', `${npc.name} wins${d.wager ? ` the 💰 ${d.wager} wager` : ''}.`, 'Give up'))) return; const x = D.giveUp(s, npc); if (x) toast(x.text, 'info', 4000); save(s); this.renderHud(); changed(); } }, 'Give up')) : null)));
    })) : h('p', { class: 'muted' }, 'No challenges under way. Set one from a conversation (💬 Messages), or wait for someone to dare you.'),
    h('p', { class: 'small muted' }, `Up to ${D.DARES_MAX} at once, one with each person. First to finish wins.`));
  }

  /** Set a side challenge: what, and for how much. */
  dareSheet(npc: Npc, changed: () => void) {
    const s = this.s;
    let wager = 0;
    const body = h('div');
    const render = () => {
      const max = D.maxDareWager(s, npc);
      body.replaceChildren(
        h('p', null, `What shall it be? Whoever finishes first wins. ${npc.name} will take up any of these.`),
        h('div', { class: 'row gap-s wrap' }, h('small', { class: 'muted' }, 'Wager:'), D.WAGERS.map((w) => h('button', { class: `pick ${w === wager ? 'sel' : ''}`, disabled: w > max, 'aria-pressed': String(w === wager), onclick: () => { wager = w; render(); } }, w ? `💰 ${w}` : 'Just for fun'))),
        h('div', { class: 'list' }, D.ideas(s, npc).map((d) => { const p = D.darePrize(s, d); return h('button', { class: 'choice', onclick: () => {
          if (!D.startDare(s, npc, d, wager)) return;
          close(); save(s); this.renderHud(); changed();
          toast(`🎯 Challenge on with ${npc.name}: ${D.dareText(d)}!`, 'good', 4000);
        } }, h('b', null, `${D.DARE_ICON[d.kind]} ${D.dareText(d)}`), h('small', { class: 'muted' }, `Prize: 💰 ${p.coins}${wager ? ` + 💰 ${wager} wager` : ''} and ${itemInfo(p.item).icon} ${itemInfo(p.item).name}${d.kind === 'race' ? ` · ${D.walkSteps(s.location).get(d.target!)} steps away` : ` · they’ll need about ${d.turns} turns`}`)); })));
    };
    const close = openSheet(`🎯 Challenge ${npc.name}`, body);
    render();
  }

  /** Trade with a Rival or Champion: face to face (creatures too) or by courier (coins and items). */
  npcTradeSheet(npc: Npc, here: boolean, changed: () => void) {
    const s = this.s;
    const mine = X.emptyMine(), theirs = X.emptyTheirs();
    const body = h('div', { class: 'trade' });
    const render = () => {
      const r = N.recordWith(s, npc);
      const v = X.verdict(s, npc, mine, theirs);
      const stock = X.npcStock(s, npc), purse = X.npcPurse(s, npc);
      const bag = Object.keys(s.inventory).filter((id) => s.inventory[id] > 0 && I.giftable(id));
      const coins = (o: { coins: number }, max: number, owner: string) => h('div', { class: 'offer-item' }, h('span', null, `💰 ${owner} coins (${max})`), ...[-5, -1].map((d) => h('button', { class: 'btn ghost sm', disabled: o.coins <= 0, onclick: () => { o.coins = Math.max(0, o.coins + d); render(); } }, String(d).replace('-', '−'))), h('b', null, o.coins), h('span', null, ...[1, 5].map((d) => h('button', { class: 'btn ghost sm', disabled: o.coins >= max, onclick: () => { o.coins = Math.min(max, o.coins + d); render(); } }, `+${d}`))));
      const creatures = X.npcOffers(s, npc);
      const mood = v.why ?? (v.ok ? (v.short <= -6 ? '😄 “That’s more than fair!”' : '🤝 “Deal!”') : v.short <= 6 ? `🤔 “Nearly. Another ${v.short} coins’ worth?”` : `🙅 “I’d need about ${v.short} coins’ worth more.”`);
      body.replaceChildren(
        h('p', { class: 'small muted' }, `${npc.name} loves ${npc.types.map((t) => TYPE_LABEL[t]).join(' and ')}. They judge creatures by their level, attributes and how they’ll grow, and won’t take one that would weaken their team. ${here ? 'Creatures are traded one for one.' : 'By courier: coins and items only. Meet up to trade creatures.'}`),
        r?.keen && here && [...s.roster, ...s.reserve].some((c) => c.uid === r.keen) ? h('p', { class: 'small good-text' }, `💡 They came about ${nameOf([...s.roster, ...s.reserve].find((c) => c.uid === r.keen)!)}, and will give more for it.`) : '',
        h('div', { class: 'trade-cols' },
          h('div', { class: 'offer' }, h('h4', null, 'You give'), coins(mine, s.coins, 'Your'),
            here ? h('div', { class: 'list' }, [...s.roster, ...s.reserve].map((c) => { const why = X.mineBlock(s, c); const m = miniCard(c, { selected: mine.creature === c.uid, onClick: () => { if (why) { toast(why, 'info'); return; } mine.creature = mine.creature === c.uid ? undefined : c.uid; render(); }, badge: why ? '🔒' : r?.keen === c.uid ? '💡' : undefined }); return m; })) : null,
            h('div', { class: 'offer-items' }, bag.map((id) => h('div', { class: 'offer-item' }, h('span', null, `${itemInfo(id).icon} ${W.itemDisplayName(id)} (${s.inventory[id]})`), h('span'), h('button', { class: 'btn ghost sm', disabled: !mine.items[id], onclick: () => { mine.items[id]--; render(); } }, '−'), h('b', null, mine.items[id] ?? 0), h('button', { class: 'btn ghost sm', disabled: (mine.items[id] ?? 0) >= s.inventory[id], onclick: () => { mine.items[id] = (mine.items[id] ?? 0) + 1; render(); } }, '+'))))),
          h('div', { class: 'offer' }, h('h4', null, `${npc.name} gives`), coins(theirs, purse, 'Their'),
            here ? (creatures.length ? h('div', { class: 'list' }, creatures.map(({ slot, c }) => miniCard(c, { selected: theirs.slot === slot, onClick: () => { theirs.slot = theirs.slot === slot ? undefined : slot; render(); } }))) : h('p', { class: 'small muted' }, 'They won’t part with any of their creatures now.')) : null,
            h('div', { class: 'offer-items' }, stock.map((id, i) => { const sold = X.stockSold(s, npc, i), on = theirs.stock.includes(i); return h('button', { class: `pick ${on ? 'sel' : ''}`, disabled: sold, 'aria-pressed': String(on), title: itemInfo(id).text, onclick: () => { theirs.stock = on ? theirs.stock.filter((x) => x !== i) : [...theirs.stock, i]; render(); } }, `${itemInfo(id).icon} ${W.itemDisplayName(id)}${sold ? ' · traded' : ''}`); })))),
        h('div', { class: 'row end gap sticky-foot wrap' }, h('span', { class: v.ok ? 'good-text' : 'muted' }, mood),
          h('button', { class: 'btn primary', disabled: !v.ok, onclick: () => {
            const e = X.trade(s, npc, mine, theirs);
            if (e) { toast(e, 'bad'); return; }
            close(); sfx.good(); save(s); this.renderHud(); changed();
            toast(`🔄 Trade complete with ${npc.name}!`, 'good');
          } }, 'Trade')));
    };
    const close = openSheet(`🔄 Trade with ${npc.name}`, body, { wide: true });
    render();
  }

  /** Choose where a rematch happens: they travel there and wait a few turns. */
  inviteSheet(npc: Npc, changed: () => void) {
    const s = this.s;
    const from = NODE_BY_ID[s.location];
    const stops = [...N.inviteStops()].sort((a, b) => Math.hypot(NODE_BY_ID[a].x - from.x, NODE_BY_ID[a].z - from.z) - Math.hypot(NODE_BY_ID[b].x - from.x, NODE_BY_ID[b].z - from.z));
    const close = openSheet(`🤝 Meet ${npc.name}`, h('div', null,
      h('p', null, `Where? ${npc.name} will be there in ${N.INVITE_TRAVEL} turns and wait ${N.INVITE_WAIT} turns for you, to battle or trade.`),
      h('div', { class: 'list' }, stops.map((id) => h('button', { class: 'choice', onclick: () => {
        if (!N.inviteNpc(s, npc, id)) return;
        close(); save(s); changed();
        toast(`🤝 ${npc.name} will meet you at ${NODE_BY_ID[id].name} from turn ${N.recordWith(s, npc)!.invite!.from}.`, 'good', 4000);
      } }, h('b', null, NODE_BY_ID[id].name), h('small', { class: 'muted' }, `${NODE_BY_ID[id].kind === 'city' ? 'City' : 'Town'}${id === s.location ? ' · you’re here' : ''}`))))));
  }

  private standingsBody(s: GameState) {
    const rows = N.standings(s);
    return h('div', null,
      h('p', { class: 'small muted' }, `Who’s on course for the Circuit. On Turn 100 the strongest of them fill whatever places trainers leave in the bracket of eight${activeMatchOf() ? '' : ` (the top ${N.FIELD})`}. A Rival you battle often, or who keeps beating you, climbs fast.`),
      h('table', { class: 'tid-record standings' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, 'Trainer'), h('th', null, 'Merits'), h('th', null, 'You · Them'))),
        h('tbody', null, rows.map((x, i) => {
          const r = N.recordWith(s, x.npc);
          return h('tr', { class: `${x.seeded ? 'in' : ''} ${i === N.FIELD - 1 ? 'cut' : ''}` },
            h('td', null, String(i + 1)),
            h('td', null, x.npc.kind === 'champion' ? '🏅 ' : '🤺 ', x.npc.name, ' ', x.npc.types.map((t) => typeIconImg(t, 14)), x.contender ? ' 📈' : ''),
            h('td', null, `${x.merits}/8`), h('td', null, r ? `${r.won} · ${r.lost}` : '—'));
        }))),
      s.circuitNews?.length ? h('div', null, h('h4', null, '📰 Circuit news'), s.circuitNews.slice(0, 8).map((x) => h('p', { class: 'small' }, h('span', { class: 'muted' }, `Turn ${x.turn} · `), x.text))) : '');
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
    await this.runBattle(r.battle, { kind: 'trainer', intro: r.line ? `${r.name} is at the ${NODE_BY_ID[s.location].name} Trainer Hall: “${r.line}”` : `${r.name} accepts your challenge in the ${NODE_BY_ID[s.location].name} Trainer Hall!` });
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
    return tile('🔄', 'Swap Team', (s.reserve.length
      ? `Swap creatures between your active team and your totems (${s.reserve.length} resting). Free, any time you’re in a city or town.`
      : 'No creatures resting in totems yet. You can still send active ones to rest here.') + ` See everyone’s Morale, or check on a creature to raise it (${W.CHECK_COST}⚡).`, '0⚡', () => this.rosterManager());
  }

  /**
   * Swap creatures between the active team and totems. Free in any city or town (no Stable visit needed).
   * Each creature's Morale is shown, with a button to check on it (Initiative for Morale).
   */
  rosterManager() {
    const s = this.s;
    let pick: string | null = null;
    const body = h('div');
    const entry = (c: CreatureInst, card: HTMLElement) => {
      const why = W.checkOnBlock(s, c.uid);
      return h('div', { class: 'swap-entry' }, card, h('div', { class: 'row gap-s' },
        moraleChip(c),
        h('button', { class: 'btn ghost sm', disabled: !!why, title: why ?? `+${W.CHECK_MORALE} Morale for ${nameOf(c)}`, onclick: () => {
          if (!W.checkOn(s, c.uid)) { toast(W.checkOnBlock(s, c.uid) ?? 'You can’t do that now.', 'info'); return; }
          sfx.good();
          toast(`You spend some time with ${nameOf(c)}. (+${W.CHECK_MORALE} Morale)`, 'good');
          save(s); this.renderHud(); render();
        } }, `Check on Creature · ${W.CHECK_COST}⚡`)));
    };
    const render = () => {
      body.replaceChildren(
        h('p', { class: 'small' }, 'Tap an active creature, then a resting one to swap them. Resting creatures lose Morale if neglected too long.'),
        h('p', { class: 'small' }, `Check on any creature for ${W.CHECK_COST} Initiative: +${W.CHECK_MORALE} Morale. You have `, h('b', null, `${s.initiative}⚡`), '.'),
        h('h4', null, 'Active team (max 3)'),
        h('div', { class: 'list' }, s.roster.map((c) => entry(c, miniCard(c, { selected: pick === c.uid, onClick: () => { pick = pick === c.uid ? null : c.uid; render(); } })))),
        h('h4', null, `Resting in totems (${s.reserve.length})`),
        h('div', { class: 'list' }, s.reserve.map((c) => entry(c, miniCard(c, { onClick: () => {
          if (s.roster.length < 3) { s.reserve = s.reserve.filter((x) => x !== c); s.roster.push(c); }
          else if (pick) { const i = s.roster.findIndex((x) => x.uid === pick); const out = s.roster[i]; s.roster[i] = c; s.reserve = s.reserve.filter((x) => x !== c); s.reserve.push(out); if (s.following === out.uid) s.following = c.uid; pick = null; }
          else { toast('Select an active creature first.', 'info'); return; }
          save(s); this.renderHud(); render();
        } })))),
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
    if (!gate.ok) {
      if (gate.cloud) { this.cloudSheet(); return; }
      const screen = gate.show ? screens().show[gate.show] : undefined;
      if (screen) { screen(this); return; }
      toast(gate.reason ?? 'Not yet.', 'bad', 3500);
      return;
    }
    const tier = tierOf(s);
    const again = s.merits.includes(id);
    const body = h('div', { class: 'arbiter', style: `--tc:${TYPE_COLOR[c.type]}` },
      h('div', { class: 'city-hero' }, h('img', { src: typeIcon(c.type) }), h('div', null, h('h3', null, `Arbiter ${c.arbiter}`), h('small', null, `${c.arena.name} · ${TYPE_LABEL[c.type]} specialist`))),
      h('p', null, c.arena.text),
      h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, `Your Tier: ${tier}`), h('span', { class: 'chip' }, `${tier === 1 ? 2 : 3} creatures · Lv ~${1 + tier * 2}`), h('span', { class: 'chip' }, again ? `Prize: ${TYPE_LABEL[c.type]} Imprint + 💰${W.REMATCH_COINS * tier}` : `Prize: ${c.accolade} + 💰${10 * tier}`)),
      again ? h('p', { class: 'small' }, `A rematch, at your Tier now. Win, and you can imprint ${TYPE_LABEL[c.type]} energy on one of your creatures: it replaces 1 of the energy it generates, opening ${TYPE_LABEL[c.type]} moves to it. ${c.arbiter}’s team rests ${W.ARBITER_REST} turns after a loss.`)
        : h('p', { class: 'small muted' }, 'Arbiters scale to your Tier, so you may challenge them in any order.'),
      h('div', { class: 'row end gap' }, h('button', { class: 'btn ghost', onclick: () => closeAllSheets() }, 'Not yet'), h('button', { class: 'btn primary', onclick: async () => {
        if (!this.spend()) return;
        closeAllSheets();
        await this.runBattle(W.arbiterBattle(s, id), { kind: 'arbiter', intro: again ? `Arbiter ${c.arbiter} is ready for a rematch!` : `Arbiter ${c.arbiter} accepts your challenge!`, city: id });
      } }, `${again ? 'Rematch' : 'Challenge'} · ${W.cityActionCost(s)}⚡`)));
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
        ...this.npcTiles(),
        t.special === 'stadium' ? tile('🏆', 'Grand Tournament', 'Be here with all 8 Merits as Turn 100 ends to enter the bracket.', '', () => this.stadiumSheet()) : null,
        t.special === 'school' ? tile('🥋', 'Battle School', 'Pay coins and leave a creature with the drill masters: it earns 1 XP per coin, at 2 XP a turn. Or have it retrained overnight with a new Nature, Ability or Instinct.', '', () => this.schoolSheet()) : null,
        ...(screens().tiles?.(this, s.location, '') ?? []),
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
      this.cityPicker('🕊️ Homing Feather', `It carries you to ${s.trainer.style === 'balanced' ? 'any city you’ve rested at' : s.sponsor && s.sponsor.city !== s.trainer.home ? 'your home city or your sponsor’s' : 'your home city'}. This uses up the rest of your Initiative this turn.`, targets, async (to) => {
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

  stadiumSheet() {
    const s = this.s;
    openSheet('🏆 Grand Tournament', h('div', null,
      h('p', null, 'The grand tournament of Margos convenes here when the year ends. Be standing in this stadium as Turn 100 ends with all 8 Merits to enter the bracket.'),
      h('div', { class: 'row gap-s' }, h('span', { class: 'chip' }, `Merits: ${s.merits.length}/8`), h('span', { class: 'chip' }, `Turn ${s.turn}/100`)),
      h('p', { class: 'small muted' }, 'Bracket: 8 trainers, 3v3 elimination, one Champion. Everyone here who qualifies is in the same bracket, and the strongest Champions and Rivals fill the rest. Your team is fully restored between matches.')));
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
        s.imprints?.length ? h('section', null, h('h4', null, 'Energy Imprints'), h('div', { class: 'bag-grid' }, TYPES.filter((t) => s.imprints!.includes(t)).map((t) =>
          h('div', { class: 'bag-item' }, h('span', { class: 'bi-ico' }, typeIconImg(t, 24)), h('div', null, h('b', null, `${TYPE_LABEL[t]} Imprint ×${s.imprints!.filter((x) => x === t).length}`), h('small', null, `Replaces 1 energy a creature generates with 1 ${TYPE_LABEL[t]}.`)),
            readOnly ? null : h('button', { class: 'btn sm', onclick: () => this.imprintSheet(t, render) }, 'Use'))))) : '',
        ...Object.entries(groups).filter(([, v]) => v.length).map(([k, ids]) => h('section', null, h('h4', null, labels[k]),
          h('div', { class: 'bag-grid' }, ids.map((id) => {
            const it = itemInfo(id);
            const usable = ['restore', 'treat', 'charm', 'travel'].includes(it.kind);
            return h('div', { class: 'bag-item' }, h('span', { class: 'bi-ico' }, it.icon), h('div', null, h('b', null, W.itemDisplayName(id), ' ×', s.inventory[id]), h('small', null, it.text), it.kind === 'material' ? materialDetail(it) : null),
              usable && !readOnly ? h('button', { class: 'btn sm', onclick: () => this.useItemFlow(id, render) }, 'Use') : null,
              !readOnly ? (() => { const a = screens().itemAction?.(this, id); return a ? h('button', { class: 'btn sm', onclick: a.go }, a.label) : null; })() : null);
          })))),
        Object.keys(s.inventory).length === 0 && !s.imprints?.length ? h('p', { class: 'muted' }, 'Your bag is empty.') : '',
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
        const lost = maxHearts(c) - 1 - c.vitality, canTend = needs.includes(c), on = picked.has(c.uid);
        const full = picked.size >= limit && !on;
        const why = c.ko ? 'KO’d: needs a stable' : !canTend ? 'Fully rested' : full ? 'Out of Initiative' : null;
        return h('button', {
          class: `camp-mon ${on ? 'on' : ''} ${canTend ? '' : 'na'}`, disabled: !canTend || full, 'aria-pressed': String(on),
          onclick: () => { if (on) picked.delete(c.uid); else picked.add(c.uid); render(); },
        },
          h('span', { class: 'camp-check' }, on ? '✓' : ''),
          h('img', { src: portrait(c.species), alt: '' }),
          h('div', { class: 'camp-info' },
            h('div', { class: 'row gap-s' }, h('b', null, nameOf(c)), h('small', { class: 'muted' }, `Lv ${c.level}`)),
            healthBar(maxHearts(c), c, { gain: on }),
            h('div', { class: 'row gap-s' },
              h('small', { class: on ? 'gain-txt' : 'muted' }, c.ko ? '' : `${totalHealth(c)}/${maxTotal(c)} Health${on && lost > 0 ? ` · +${lost} ♥ (+${lost * HEART} Health)` : ''}`),
              c.fatigue ? h('span', { class: `chip ${on ? 'good' : 'bad'}` }, on ? `😮‍💨 Fatigue ${c.fatigue} → 0` : `😮‍💨 Fatigue ${c.fatigue}`) : null),
            why ? h('small', { class: 'muted' }, why) : null));
      }));
    };
    render();
    const close = openSheet('Make camp', h('div', null,
      h('p', { class: 'small' }, `Camping ends your turn and uses all ${s.initiative} Initiative you have left. Each point tends ${per === 1 ? 'one creature' : `${per} creatures (Caretaker)`}: it recovers all its Health and shakes off Fatigue.`),
      h('p', { class: 'small muted' }, 'The highlighted part of a bar is what tending restores. KO’d creatures need a stable.'),
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
    if (r.ended === 'endgame') {
      this.busy = false; save(s); this.renderHud();
      toast(`🏆 ${s.trainer.name} has qualified for the Creature Circuit!${match?.players.some((p) => p.phase === 'map') ? ' It begins when everyone’s season has ended.' : ''}`, 'good', 5000);
      if (match) await this.handoff(); else await this.circuitStep();
      return;
    }
    if (r.ended === 'over') { this.busy = false; save(s); if (match && this.skipping) await this.handoff(); else this.gameOver(); return; }
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
    if (this.watching) { this.watchEvent(); return; }
    const s = this.s;
    const view = E.eventView(s);
    if (!view || this.watching || document.querySelector('.sheet-wrap.event-sheet:not(.closing)')) return;
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
    if (this.watching || this.s !== s) return; // the turn passed to another trainer or browser meanwhile
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

  /** Online, while watching: the event the trainer playing is resolving, with its choices shown but not answerable. */
  watchEvent() {
    const s = this.s;
    const view = E.eventView(s);
    if (!view || this.eventWatch) return;
    const close = openSheet(`${s.trainer.name} is resolving ${view.title}`, h('div', { class: 'event' },
      h('div', { class: 'event-head' }, h('span', { class: 'event-ico' }, view.icon), h('p', null, view.text)),
      view.showcase ? h('div', { class: 'event-offer' },
        h('small', null, 'On offer'),
        miniCard(view.showcase, { onClick: () => openSheet(nameOf(view.showcase!), creatureCard(view.showcase!, { editable: false }), { wide: true }) })) : null,
      h('div', { class: 'event-choices' }, view.choices.map((ch) => h('div', { class: `event-choice watch ${ch.id === 'decline' ? 'ghost' : ''}` },
        h('b', null, ch.label),
        ch.disabled ? h('small', { class: 'bad-text' }, ch.disabled) : ch.detail ? h('small', null, ch.detail) : null))),
      h('p', { class: 'small muted center' }, `Only ${s.trainer.name} can choose. This closes once they have.`)),
    { onClose: () => { this.eventWatch = null; } });
    this.eventWatch = { key: this.eventKey(), close };
  }
  /** Which pending event is on screen (trainer, turn and event), or '' if none. */
  private eventKey() { const s = this.s; return s.event ? `${s.trainer.name}:${s.turn}:${s.event.id}` : ''; }

  async banner(title: string, sub: string) {
    const b = h('div', { class: 'banner' }, h('h2', null, title), h('p', null, sub));
    document.body.append(b);
    requestAnimationFrame(() => b.classList.add('in'));
    await wait(1600);
    b.classList.remove('in');
    setTimeout(() => b.remove(), 400);
  }

  /** Use an Imprint: choose a creature, then which energy it gives up. Put off, it waits in the Bag. */
  imprintSheet(type: ElementType, then?: () => void) {
    const s = this.s;
    const label = TYPE_LABEL[type];
    const body = h('div', { class: 'imprint', style: `--tc:${TYPE_COLOR[type]}` });
    const choose = () => body.replaceChildren(
      h('div', { class: 'row gap-s' }, typeIconImg(type, 32), h('p', null, `Choose a creature. It swaps 1 energy it generates for 1 ${label} energy, for good, and can learn the ${label} moves that fit. Its types don’t change. Up to ${IMPRINT_MAX} of a creature’s energy can be imprinted.`)),
      h('div', { class: 'list' }, [...s.roster, ...s.reserve].map((c) => {
        const ok = imprintChoices(c, type).length > 0;
        const el = miniCard(c, { onClick: () => pickFrom(c), badge: c.imprints?.length ? `✦ ${c.imprints.length}/${IMPRINT_MAX}` : undefined });
        if (!ok) { el.setAttribute('disabled', ''); el.title = 'None of its energy can be replaced.'; }
        return el;
      })),
      h('div', { class: 'row end gap sticky-foot' }, h('button', { class: 'btn ghost', onclick: () => close() }, 'Later (keep it in your Bag)')));
    const pickFrom = (c: CreatureInst) => {
      const e = energy(c);
      const can = learnable(c);
      body.replaceChildren(
        h('h4', null, `${nameOf(c)}: which energy does it give up?`),
        h('div', { class: 'row gap-s wrap' }, h('small', { class: 'muted' }, 'Now'), energyPips(e)),
        h('div', { class: 'list' }, TYPES.filter((t) => (e[t] ?? 0) > 0 && t !== type).map((from) => {
          const why = imprintBlock(c, from, type);
          const next = imprinted(c, from, type);
          const learn = learnable(next);
          const gained = learn.filter((id) => !can.includes(id)).length, lost = can.filter((id) => !learn.includes(id)).length;
          const dropped = c.playbook.filter((id) => !next.playbook.includes(id)).map((id) => MOVE_BY_ID[id].name);
          return h('button', { class: 'choice', disabled: !!why, onclick: () => {
            if (!useImprint(s, c.uid, from, type)) return;
            close(); sfx.fanfare();
            toast(`${nameOf(c)} now generates ${energy(c)[type]} ${label} energy. Check its playbook for new moves.`, 'good', 4000);
            save(s); this.renderHud();
            then?.();
          } },
            h('div', { class: 'row gap-s wrap' }, h('b', null, `1 ${TYPE_LABEL[from]} → 1 ${label}`), why ? null : energyPips(energy(next))),
            why ? h('small', { class: 'bad-text' }, why)
              : h('small', null, `Opens ${gained} new move${gained === 1 ? '' : 's'}${lost ? `, closes ${lost}` : ''}.`),
            !why && dropped.length ? h('small', { class: 'bad-text' }, ` Leaves its playbook: ${dropped.join(', ')}.`) : null);
        })),
        h('div', { class: 'row end gap sticky-foot' }, h('button', { class: 'btn ghost', onclick: choose }, '← Another creature')));
    };
    const close = openSheet(`✦ ${label} Imprint`, body, { wide: true });
    choose();
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
  /** This game's Circuit: the match's, or the solo save's. */
  private circuitGame(): C.CircuitGame { const m = activeMatchOf(); return m && m.players.includes(this.s) ? m : C.soloGame(this.s); }
  /** Counts up whenever the Circuit moves on or is replaced, so a match left behind can't report a result. */
  private circuitRun = 0;

  /**
   * The Creature Circuit's next step: draw the bracket, play the matches nobody here is in, then bring up the
   * next trainer's match (or the end). In a match it starts once everyone's season is over.
   */
  async circuitStep() {
    const m = activeMatchOf();
    if (m?.stadium) { stadiumStep(this, m); return; }
    const g = this.circuitGame();
    const shared = !!m && g === m;
    if (shared && m.players.some((p) => p.phase === 'map')) { await this.handoff(); return; }
    const run = ++this.circuitRun;
    const before = C.progress(g), seat = shared ? m.current : 0;
    const c = C.openCircuit(g);
    const next = c ? C.advance(g) : null;
    if (c) for (let k = Math.max(0, before); k < C.progress(g); k++) this.tellResult(c, k);
    if (!c || !next) { // nobody qualified, or it's over
      if (shared) saveMatch(m); else save(this.s);
      const champ = c ? C.championOf(c) : null;
      if (champ?.seat !== undefined && (!shared || !this.online)) { this.s = g.players[champ.seat]; this.champion(); }
      else if (shared) this.matchSummary();
      else this.gameOver();
      return;
    }
    if (!shared) { save(this.s); this.renderHud(); this.endgameSheet(next); return; }
    const moved = next.seat !== seat || C.progress(g) !== before;
    m.current = next.seat;
    saveMatch(m);
    if (this.online) {
      // the server gives each match to the trainer it belongs to: watch until it's ours
      if (moved) { this.activeKey = ''; this.spectate(); return; }
      this.renderHud();
      this.endgameSheet(next);
      return;
    }
    if (this.s !== m.players[next.seat]) {
      this.showTrainer(m.players[next.seat]);
      await this.passDevice(this.s);
      if (run !== this.circuitRun) return;
    }
    this.renderHud();
    this.endgameSheet(next);
  }

  /** Put a trainer's token and HUD on screen (hotseat), without starting a turn. */
  private showTrainer(s: GameState) {
    this.s = s;
    closeAllSheets();
    this.world.setTitleMode(false);
    this.world.setTrainerLook(playerLook(s.trainer.name, s.trainer.color, s.trainer.look));
    this.world.setPawnAt(s.location);
    this.world.focus(s.location, true);
    this.engine.setView(this.world);
    this.showRivals();
  }

  private tellResult(c: Circuit, k: number) {
    const w = c.winners[k], sides = C.sidesOf(c, k);
    if (w === null || !sides) return;
    toast(`🏆 ${C.CIRCUIT_ROUNDS[C.roundOf(k)]}: ${c.entrants[w].name} beat ${c.entrants[sides.find((i) => i !== w)!].name}.`, 'info', 4500);
  }

  /** The bracket, round by round. */
  bracketView(c: Circuit): HTMLElement {
    const now = C.nextMatch(c);
    const g = this.circuitGame();
    const who = (i: number | null, k: number) => {
      const e = i === null ? null : c.entrants[i];
      const p = e?.seat !== undefined ? g.players[e.seat] : undefined;
      return h('div', { class: `br ${p ? 'me' : ''} ${i !== null && c.winners[k] !== null && c.winners[k] !== i ? 'out' : ''} ${i !== null && c.winners[k] === i ? 'won' : ''}`, style: p ? `--tc:${p.trainer.color}` : '' }, e ? `${p ? '⭐ ' : ''}${e.name}` : '…');
    };
    return h('div', { class: 'bracket-wrap' }, C.CIRCUIT_ROUNDS.map((name, r) => h('div', null, h('h4', null, name),
      h('div', { class: 'bracket' }, c.winners.map((_, k) => k).filter((k) => C.roundOf(k) === r).map((k) => {
        const sides = C.sidesOf(c, k);
        const feeds = k < 4 ? [k * 2, k * 2 + 1] : k === 6 ? [c.winners[4], c.winners[5]] : [c.winners[(k - 4) * 2], c.winners[(k - 4) * 2 + 1]];
        return h('div', { class: `br-match ${k === now ? 'next' : ''}` }, who((sides ?? feeds)[0], k), h('small', { class: 'muted' }, 'vs'), who((sides ?? feeds)[1], k));
      })))));
  }
  /** Look at the bracket (anyone, any time it's under way). */
  bracketSheet() {
    const c = this.circuitGame().circuit;
    if (c) openSheet('🏆 The Creature Circuit', this.bracketView(c), { wide: true });
  }

  /** The bracket, with the match this trainer is about to play. */
  endgameSheet(next: C.CircuitMatch) {
    const g = this.circuitGame(), c = g.circuit!;
    const foe = c.entrants[next.foe].name;
    const rival = next.foeSeat !== undefined ? g.players[next.foeSeat] : null;
    closeAllSheets();
    const body = h('div', { class: 'bracket-wrap' },
      h('p', null, 'Eight trainers, 3v3 elimination, one Champion. Every team is fully restored before each match.'),
      rival ? h('p', { class: 'small' }, h('b', null, `${this.s.trainer.name} meets ${rival.trainer.name}!`), next.foeBot ? ` ${rival.trainer.name} is away, so a bot commands their team.` : ' You each command your own creatures. Nobody brings a Nabe.') : null,
      this.bracketView(c),
      h('div', { class: 'row end' }, h('button', { class: 'btn primary big', onclick: () => { close(); void this.playCircuitMatch(next); } }, `Fight: ${C.CIRCUIT_ROUNDS[next.round]} vs ${foe}`)));
    const close = openSheet('🏆 The Creature Circuit', body, { noClose: true, wide: true });
  }

  async playCircuitMatch(next: C.CircuitMatch) {
    const run = ++this.circuitRun;
    const g = this.circuitGame(), a = this.s;
    const b = C.matchBattle(g, next);
    const rival = next.foeSeat !== undefined ? g.players[next.foeSeat] : undefined;
    const intro = `${C.CIRCUIT_ROUNDS[next.round]}! ${b.sides[1].name} takes the field${rival ? ` against ${a.trainer.name}` : ''}.`;
    const here = rival && !next.foeBot ? {
      duelLead: W.needsLeadChoice(rival) ? (bt: Battle, vs: CreatureInst | null) => this.duelLeadPick(a, rival, bt, vs) : undefined,
      duel: (bt: Battle) => this.duelPick(a, rival, bt, 0, true), duelSend: (bt: Battle) => this.duelSendPick(a, rival, bt),
    } : {};
    const res = await this.runBattle(b, { kind: 'endgame', intro, ...(rival ? { rival, rivalLook: playerLook(rival.trainer.name, rival.trainer.color, rival.trainer.look) } : {}), ...here });
    if (run !== this.circuitRun || this.s !== a || this.circuitGame().circuit !== g.circuit) return; // the host stepped in, or a newer state arrived
    C.settle(g, next.k, res === 'win' ? next.me : next.foe, b);
    this.tellResult(g.circuit!, next.k);
    if (!this.online && a.phase === 'over' && activeMatchOf()) await confirmSheet(`${a.trainer.name} is out`, `Beaten in the ${C.CIRCUIT_ROUNDS[next.round]} by ${b.sides[1].name}. The Circuit goes on.`, 'Continue', 'OK');
    const m = activeMatchOf();
    this.engine.setView(this.world);
    if (this.online && m) {
      // a decided match always goes through the server, which brings in whoever is up next
      const from = C.progress(m);
      const then = C.advance(m);
      for (let k = from; k < C.progress(m); k++) this.tellResult(m.circuit!, k);
      if (then) { m.current = then.seat; saveMatch(m); this.activeKey = ''; this.spectate(); return; }
    }
    await this.circuitStep();
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
      return nextSeat(m) >= 0 || m.players.some((p) => p.phase === 'endgame')
        ? h('button', { class: 'btn primary big', onclick: () => this.handoff() }, 'Continue the season →')
        : h('button', { class: 'btn primary big', onclick: () => this.matchSummary() }, 'Final standings →');
    }
    return h('button', { class: 'btn primary big', onclick: () => { clearSave(); this.title(); } }, 'New Journey');
  }

  gameOver() {
    this.engine.setView(this.world);
    this.world.setTitleMode(true);
    const s = this.s;
    const c = this.circuitGame().circuit, champ = c ? C.championOf(c) : null;
    const why = s.endgame?.eliminated ? `Eliminated in the ${['Quarterfinal', 'Semifinal', 'Grand Final'][s.endgame.round]}.` : s.merits.length < 8 ? `The year ended with ${s.merits.length}/8 Merits.` : 'You weren\'t at Circuit Stadium when Turn 100 ended.';
    this.ui.replaceChildren(h('div', { class: 'title-screen' }, h('div', { class: 'title-card' },
      h('h1', null, 'Season Over'),
      h('p', null, why, champ ? ` ${champ.name} won the Circuit.` : ''),
      c ? h('button', { class: 'btn ghost sm', onclick: () => this.bracketSheet() }, '🏆 See the bracket') : null,
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
    const me = this.idOwner();
    const m = activeMatchOf();
    const players = m?.players.includes(me) ? m.players : [me];
    const body = h('div');
    const show = (p: GameState) => body.replaceChildren(
      ...(players.length > 1 ? [h('div', { class: 'seats tid-tabs', role: 'group', 'aria-label': 'Whose Trainer ID to show' }, players.map((x) => h('button', {
        class: `seat ${x === p ? 'now' : ''}`, style: `--tc:${x.trainer.color}`, 'aria-pressed': String(x === p), onclick: () => show(x),
      }, x.trainer.name, x === me ? ' (you)' : '')))] : []),
      this.trainerIdBody(p, p === me));
    show(me);
    openSheet('Trainer ID', body, { wide: true });
  }
  /** Whose Trainer ID, Creature Codex and Journal the buttons open: online, always this browser's own trainer; otherwise whoever is playing. */
  private idOwner(): GameState { return (this.online ? activeMatchOf()?.players[this.mySeat()] : null) ?? this.s; }

  private trainerIdBody(s: GameState, own: boolean) {
    const st = s.stats;
    const style = TRAINER_STYLES.find((x) => x.id === s.trainer.style)!;
    const tier = tierOf(s);
    // a stable, made-up ID number from who the trainer is
    let hsh = 7; for (const ch of `${s.trainer.name}|${s.trainer.home}|${s.trainer.style}`) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0;
    const idNo = String(hsh % 100000).padStart(5, '0');
    const home = NODE_BY_ID[s.trainer.home];
    const homeCity = CITIES[s.trainer.home];
    const sponsored = s.sponsor ? `💛 Sponsored by ${NPC_BY_ID[s.sponsor.npc]?.name ?? 'a Champion'}: ${CITIES[s.sponsor.city]?.name}${W.sponsorFree(s, s.sponsor.city) ? '’s Nabe costs no Initiative.' : ' is home too.'}` : null;
    const styleNow = !own ? null : s.trainer.style === 'nature' ? `This turn: ${W.rangerRefundsLeft(s)} of ${tier} Initiative refunds left.`
      : s.trainer.style === 'pathfinder' ? `This turn: free first move ${s.flags.firstMoveUsed ? 'used' : 'ready'}.`
      : s.trainer.style === 'balanced' ? `If your team is wiped out, you can return to: ${W.restedCities(s).map((id) => CITIES[id].name).join(', ')}. Rest at a city’s stable to add it.`
      : null;
    const fact = (label: string, value: string | number) => h('div', { class: 'tid-fact' }, h('b', null, String(value)), h('small', null, label));
    const rec = st.record ?? {};
    const RECORD_ROWS: [BattleKind, string][] = [['wild', 'Wild creatures'], ['trainer', 'Trainers'], ['arbiter', 'Arbiters'], ['legendary', 'Legendaries'], ['rival', 'Duels'], ['endgame', 'Circuit Finals']];
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
      sponsored ? h('p', { class: 'small good-text' }, sponsored) : null,
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
    return body;
  }

  /** Whose saved log this screen shows: the trainer taking their turn, or (watching online) this browser's own. */
  logOwner(): GameState | null { return this.watching ? activeMatchOf()?.players[this.mySeat()] ?? null : this.s; }

  /** The 📜 Battle Log: every move, roll, hit and status of a battle, grouped by round. */
  battleLogSheet(lg: BattleLog) {
    const live = lg === this.liveLog;
    const outcome = lg.result === 'win' ? 'Won' : lg.result === 'lose' ? 'Lost' : lg.result === 'escaped' ? 'Ran away' : lg.result === 'fled' ? 'The foe fled' : 'Unfinished';
    const rounds = new Map<number, BattleLogEntry[]>();
    for (const e of lg.entries) { if (!rounds.has(e.round)) rounds.set(e.round, []); rounds.get(e.round)!.push(e); }
    const body = h('div', { class: 'blog' },
      live ? null : h('p', null, h('b', null, `Turn ${lg.turn} · ${outcome}`), ` · ${lg.title}`),
      h('p', { class: 'small muted' }, 'Every move, roll and hit, with the numbers behind them. ', h('span', { class: 'blog-you' }, 'Your side'), ' · ', h('span', { class: 'blog-foe' }, 'the foe'), '.'),
      [...rounds.entries()].map(([r, list]) => h('section', { class: 'blog-round' },
        h('h4', null, r === 0 ? 'Start' : `Round ${r}`),
        h('ol', null, list.map((e) => h('li', { class: `blog-line ${e.tone ?? ''} ${e.side === 0 ? 'you' : e.side === 1 ? 'foe' : ''}` },
          h('span', null, e.text), e.detail ? h('small', null, e.detail) : null))))));
    openSheet(`📜 Battle Log`, body, { wide: true });
    // during a battle, open at the latest line; afterwards, read it from the start
    if (!live) return;
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

  /** Mute button + volume slider, used at the top of the Menu and in Settings. */
  soundControls(onChange?: () => void) {
    const row = h('div', { class: 'sound-row' });
    const render = () => {
      const st = settings();
      const muted = !st.sound || st.volume <= 0;
      const mute = h('button', { class: `btn sm sound-mute ${muted ? 'muted' : ''}`, 'aria-pressed': muted ? 'true' : 'false', 'aria-label': muted ? 'Unmute sound' : 'Mute sound', title: muted ? 'Unmute' : 'Mute',
        onclick: () => {
          if (muted) { setSetting('sound', true); if (settings().volume <= 0) setSetting('volume', 50); }
          else setSetting('sound', false);
          applyVolume(); if (muted) sfx.tap(); // a tap confirms unmuting
          render(); onChange?.();
        } }, muted ? '🔇' : st.volume < 40 ? '🔈' : st.volume < 75 ? '🔉' : '🔊');
      const slider = h('input', { type: 'range', min: '0', max: '100', step: '5', value: String(st.sound ? st.volume : 0), 'aria-label': 'Volume',
        oninput: (e: Event) => {
          const v = Number((e.target as HTMLInputElement).value);
          setSetting('volume', v);
          if (v > 0 && !settings().sound) setSetting('sound', true);
          applyVolume();
          label.textContent = v > 0 ? `${v}%` : 'Muted';
          mute.textContent = v <= 0 ? '🔇' : v < 40 ? '🔈' : v < 75 ? '🔉' : '🔊';
        },
        onchange: () => { sfx.tap(); render(); onChange?.(); } }) as HTMLInputElement;
      slider.value = String(st.sound ? st.volume : 0);
      const label = h('span', { class: 'sound-pct' }, muted ? 'Muted' : `${st.volume}%`);
      row.replaceChildren(mute, h('b', null, 'Volume'), slider, label);
    };
    render();
    return row;
  }

  menu() {
    const mine = this.logOwner();
    const close = openSheet('Menu', h('div', null, this.soundControls(), h('div', { class: 'tiles' },
      tile('📇', 'Trainer ID', `${this.idOwner().trainer.name} of ${NODE_BY_ID[this.idOwner().trainer.home]?.name ?? 'nowhere'}: style, Merits and battle records.`, '', () => { close(); this.trainerId(); }),
      tile('🥇', 'Rival Trainers', (() => { const n = N.RIVALS.concat(N.CHAMPIONS).filter((x) => N.recordWith(this.idOwner(), x)).length; return `${n} met. Records, rematches, messages and the Circuit Standings.`; })(), T.unreadTexts(this.idOwner()) ? `💬 ${T.unreadTexts(this.idOwner())}` : '', () => { close(); this.rivalsSheet(); }),
      tile('📖', 'Creature Codex', `${this.idOwner().dex.caught.length} recruited · ${this.idOwner().dex.seen.length} seen`, '', () => { close(); this.codex(); }),
      tile('🌀', 'Status Effects', 'What Burn, Sunder, Daze and the rest do.', '', () => { close(); openSheet('Status Effects', statusGuide()); }),
      tile('🔺', 'Type Chart', 'Strengths and weaknesses.', '', () => { close(); typeChartSheet(); }),
      tile('🗞️', 'World Log', activeMatchOf() ? 'Where every trainer has been, and what happened there.' : 'Where you’ve been, and what happened there.', '', () => { close(); this.worldLogSheet(); }),
      tile('📜', 'Journal', 'Your own notes.', '', () => { close(); this.journal(); }),
      mine?.lastBattle ? tile('⚔️', 'Last Battle Log', `Turn ${mine.lastBattle.turn}: every move, roll and hit from ${mine.trainer.name}’s last battle.`, '', () => { close(); this.battleLogSheet(mine.lastBattle!); }) : null,
      this.watchedLog ? tile('👀', 'Last Watched Battle', 'The log of the last battle you watched (until you reload the page).', '', () => { close(); this.battleLogSheet(this.watchedLog!); }) : null,
      this.watching ? null : tile('🧢', 'Trainer Look', 'Skin, hair, hat, top, patterns and colours for your mini.', '', () => { close(); this.trainerLookSheet(); }),
      tile('❓', 'How to Play', 'The full guide, by topic: basics, creatures, battles, places, multiplayer.', '', () => { close(); this.howToPlay(); }),
      tile('⚙️', 'Settings', 'Sound and volume, dice speed, motion, double-tap travel.', '', () => { close(); this.settingsSheet(); }),
      tile('📌', 'Save a copy', 'Keep a named snapshot of this game to load later (💾 Saves on the title screen).', '', () => { close(); void this.saveCopyNow(); }),
      tile('🏠', 'Title Screen', 'Your game is autosaved.', '', () => { close(); this.title(); }),
      this.online ? tile('🚪', 'Leave online game', 'Go back to the title screen. You can rejoin with the room code.', '', () => { close(); this.leaveOnline(); })
        : tile('🗑️', 'Abandon Journey', activeMatchOf()?.players.includes(this.s) ? 'Delete this hotseat game (every trainer’s progress).' : 'Delete this save.', '', async () => { close(); await this.abandon(); }))));
  }

  /** Turn alerts: whether the browser may show notifications, a button to allow them, and a test. */
  private alertRow(changed: () => void, test = false) {
    const st = alertState();
    const quiet = !settings().sound || settings().volume <= 0 ? 'Sound is muted, so there’ll be no ping.' : !settings().turnPing ? 'The turn ping is off.' : '';
    return h('div', { class: 'alert-row' }, h('div', null, h('b', null, '🔔 Turn notifications'),
      h('small', null, st === 'on' ? (this.pushOn ? 'On: you’ll be told when it’s your turn, even with the game closed.' : this.online && this.pushKey && !canPush() ? 'On while the game is open. (On an iPhone or iPad, add the game to your home screen to be told when it’s closed.)' : 'On: your browser will tell you when it’s your turn.') : st === 'off' ? 'Off. The tab still flashes and pings.' : st === 'ask' ? 'Your browser can tell you when it’s your turn, even in another window.' : st === 'blocked' ? 'Blocked by your browser. Allow notifications for this site in its address-bar or site settings, then reload. The tab still flashes and pings.' : 'Not supported in this browser (or the page isn’t on https). The tab still flashes and pings.', quiet ? ` ${quiet}` : '')),
      st === 'ask' || st === 'off' ? h('button', { class: 'btn primary sm', onclick: async () => { await askForAlerts(); await this.syncPush(); changed(); } }, 'Turn on') : null,
      st === 'on' && test ? h('button', { class: 'btn ghost sm', onclick: async () => { setSetting('alerts', false); await this.syncPush(); changed(); } }, 'Turn off') : null,
      test ? h('button', { class: 'btn ghost sm', onclick: () => { testCall(); toast('Look at another tab or window now: the alert comes in 4 seconds.', 'info', 4000); } }, 'Test') : null);
  }

  settingsSheet() {
    const body = h('div');
    const render = () => {
      const st = settings();
      const toggle = (k: 'sound' | 'fastDice' | 'reduceMotion' | 'doubleTapTravel' | 'fastBattle' | 'followerPrompt' | 'turnPing', label: string, text: string) =>
        h('label', { class: 'toggle' }, h('div', null, h('b', null, label), h('small', null, text)),
          h('input', { type: 'checkbox', role: 'switch', checked: st[k], onchange: (e: Event) => { setSetting(k, (e.target as HTMLInputElement).checked); if (k === 'sound') { if (settings().sound && settings().volume <= 0) setSetting('volume', 50); applyVolume(); if (settings().sound) sfx.tap(); } render(); } }));
      body.replaceChildren(
        toggle('sound', 'Sound effects', 'Dice, hits and fanfares (synthesized, no downloads).'),
        this.soundControls(render),
        toggle('fastDice', 'Fast dice', 'Shorter dice-roll animations for quicker turns.'),
        toggle('fastBattle', 'Fast battles', 'Pick a move and it resolves at once, with no move readout, no damage dice and short pauses. Off: each move shows what it will roll first, and every roll is explained as it happens.'),
        toggle('reduceMotion', 'Reduce motion', 'Tones down UI animations.'),
        toggle('doubleTapTravel', 'Double-tap shortcuts', 'Double-tap (or double-click) an adjacent node to travel there without the Travel button, or the city or town you’re in to open its menu.'),
        toggle('turnPing', 'Turn ping (online)', 'A gentle ping when it’s your turn, or someone needs an answer. If you’re looking elsewhere the tab flashes too.'),
        this.alertRow(render, true),
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
    const s = this.idOwner();
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
    const s = this.idOwner();
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

  /** Redraws the World Log while it's open. */
  private worldLogLive: (() => void) | null = null;
  /** Everything every trainer has done out in the world, newest first; it keeps up while it's open. */
  worldLogSheet() {
    const KINDS: [DeedKind, string, string][] = [['move', '👣', 'Travel'], ['explore', '🔍', 'Exploring'], ['battle', '⚔️', 'Battles'], ['event', '❓', 'Events'], ['place', '🏕️', 'Other']];
    const icon = Object.fromEntries(KINDS.map(([k, i]) => [k, i]));
    let who = '', kind: DeedKind | '' = '', top = -1;
    const filters = h('div', { class: 'wl-filters' }), list = h('ul', { class: 'journal world-log' });
    const body = h('div', null, h('p', { class: 'small muted' }, 'Newest first. Tap an entry to see where it happened.'), filters, list);
    const chip = (label: string, on: boolean, go: () => void, color?: string) => h('button', { class: `chip wl-chip ${on ? 'on' : ''}`, 'aria-pressed': String(on), style: color ? `--tc:${color}` : '', onclick: () => { go(); draw(true); } }, label);
    const draw = (force = false) => {
      const all = worldLog(this.s);
      const newest = all[0]?.deed.n ?? 0;
      if (!force && newest === top) return;
      top = newest;
      const players = activeMatchOf()?.players ?? [this.s];
      filters.replaceChildren(
        ...(players.length > 1 ? [h('div', { class: 'row gap-s wrap' }, chip('Everyone', !who, () => { who = ''; }), players.map((p) => chip(p.trainer.name, who === p.trainer.name, () => { who = p.trainer.name; }, p.trainer.color)))] : []),
        h('div', { class: 'row gap-s wrap' }, chip('All', !kind, () => { kind = ''; }), KINDS.map(([k, i, label]) => chip(`${i} ${label}`, kind === k, () => { kind = k; }))));
      const shown = all.filter(({ who: p, deed: d }) => (!who || p.trainer.name === who || d.other === who) && (!kind || d.kind === kind));
      let turn = 0;
      list.replaceChildren(...shown.flatMap(({ who: p, deed: d }) => [
        ...(d.turn !== turn ? [h('li', { class: 'wl-turn' }, `${TIME_INFO[timeOfDay(d.turn)].icon} Turn ${turn = d.turn}`)] : []),
        h('li', null, h('button', { class: 'wl-entry', style: `--tc:${p.trainer.color}`, onclick: () => { close(); this.showPlace(d.at); } },
          h('span', null, icon[d.kind]), h('div', null, h('div', null, h('b', null, p.trainer.name), ` ${d.text}`, d.kind === 'move' ? '' : h('small', null, ` · ${NODE_BY_ID[d.at]?.name ?? d.at}`)), d.more ? h('p', { class: 'small muted' }, d.more) : null)))]));
      if (!shown.length) list.append(h('li', null, 'Nothing yet.'));
    };
    draw(true);
    const live = () => { if (body.isConnected) draw(); else if (this.worldLogLive === live) this.worldLogLive = null; };
    const close = openSheet('🗞️ World Log', body, { wide: true });
    this.worldLogLive = live;
  }
  /** Look at a place on the map (if the map is what's showing). */
  private showPlace(id: string) {
    if (document.querySelector('.battle-ui') || !NODE_BY_ID[id]) return;
    this.world.focus(id);
    if (!this.busy) { this.selected = id; this.showNodePreview(id); }
  }

  journal() {
    openSheet('Journal', h('ul', { class: 'journal' }, this.idOwner().log.map((l) => h('li', null, h('small', null, `T${l.turn}`), ' ', l.text))));
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
      h('p', { class: 'small' }, 'Every 2 Merits raises your Trainer Tier; Arbiters scale their teams and arena tricks to your Tier. 8 Merits = Tier 5 and an invitation to the Circuit. Beat an Arbiter again, at your Tier then, to win an Imprint of their type.'),
      h('div', { class: 'merit-list' }, Object.values(CITIES).map((c) => h('div', { class: `merit-row ${s.merits.includes(c.nodeId) ? 'on' : ''}`, style: `--tc:${TYPE_COLOR[c.type]}` },
        h('img', { src: typeIcon(c.type) }), h('div', null, h('b', null, c.accolade), h('small', null, `${c.arbiter} · ${c.name}${s.merits.includes(c.nodeId) ? ` · ${W.arbiterResting(s, c.nodeId) ? `rematch in ${W.arbiterResting(s, c.nodeId)} turn${W.arbiterResting(s, c.nodeId) === 1 ? '' : 's'}` : 'rematch ready'}` : ''}`)), s.merits.includes(c.nodeId) ? '✓' : '')))));
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
const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
function probAtLeast(target: number) {
  let ok = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= target) ok++;
  return ok / 36;
}
const signedN = (n: number) => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;
const boostWhy = (x: Boost) => x.parts.map((p) => `${p.label} ${signedN(p.value)}`).join(', ');
/** Where a creature's attribute changes come from. */
function boostSheet(name: string, list: Boost[]) {
  openSheet(`${name}’s attributes now`, h('div', null,
    h('div', { class: 'list' }, list.map((x) => h('div', { class: 'boost-row' }, h('span', { class: `boost ${x.n > 0 ? 'up' : 'down'}` }, `${x.n > 0 ? '▲' : '▼'} ${STAT_LABEL[x.stat]} ${signedN(x.n)}`), h('small', null, boostWhy(x))))),
    h('p', { class: 'small muted' }, 'Changes from moves and Instincts add up to ±3 per attribute and go when the creature leaves the field. Evasion stays between 1 and 6, and the rest never fall below 0.')));
}
