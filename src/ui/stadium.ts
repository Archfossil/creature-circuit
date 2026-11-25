// Stadium Mode's screens (rules in engine/stadium.ts): build teams, pick an opponent, battle. Teams are kept in
// this browser, apart from saves; a Stadium battle never touches a journey.
import { activeRegion } from '../regions/active';
import type { App } from './app';
import { closeAllSheets, confirmSheet, h, openSheet, toast } from './dom';
import { tcOf, creatureCard, miniCard, typeChip } from './cards';
import { portrait, trainerPortrait } from '../render/engine';
import { npcLook } from '../render/npcLooks';
import { arbiterLook, playerLook } from '../render/trainerModel';
import * as S from '../engine/stadium';
import { instinctIdOf, nameOf, type CreatureInst } from '../engine/creature';
import type { Battle } from '../engine/battle';
import { load, newMatch, saveMatch, type GameState, type Match, type TrainerLookChoice } from '../engine/state';
import { NATURES, WEATHER } from '../data/content';
import { INSTINCT_BY_ID, instinctRules } from '../data/instincts';
import { SPECIES_BY_ID } from '../data/species';
import { NPC_BY_ID } from '../data/npcs';
import { CITIES } from '../data/map';
import { TYPES, TYPE_COLOR, TYPE_LABEL } from '../data/types';
import { STAT_LABEL } from '../engine/creature';
import type { ElementType, Rarity } from '../data/schema';

const KEY = 'creature-circuit-stadium-v1';
interface Book { teams: S.StadiumTeam[]; me: { name: string; color: string; look?: TrainerLookChoice }; record: Record<string, [number, number]> }
function book(): Book {
  try { const b = JSON.parse(localStorage.getItem(KEY) ?? '') as Book; if (Array.isArray(b.teams) && b.me) return { ...b, record: b.record ?? {} }; } catch { /* none yet */ }
  const s = load();
  return { teams: [], me: { name: s?.trainer.name ?? 'Rowan', color: s?.trainer.color ?? '#ff6b3d', look: s?.trainer.look }, record: {} };
}
function keep(b: Book) { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { toast('This browser couldn’t keep your Stadium teams. Copy a team’s code to save it.', 'bad', 5000); } }
const COLORS = ['#ff6b3d', '#3d8bff', '#2fbf71', '#b05cff', '#ffcc33', '#ff4fa3'];

/** Title screen → Stadium: your teams, and who to battle. */
export function stadiumSheet(app: App) {
  const b = book();
  const body = h('div', { class: 'stadium' });
  let team = 0, weather = 'clear';
  const render = () => {
    team = Math.min(team, Math.max(0, b.teams.length - 1));
    const t = b.teams[team];
    const problem = t ? S.teamProblem(t) : 'Make a team first.';
    const foes = S.stadiumFoes();
    const go = (f: S.StadiumFoe) => { if (problem) { toast(problem, 'info'); return; } close(); void fightAI(app, t, f, weather); };
    const foeTile = (f: S.StadiumFoe) => {
      const rec = b.record[S.foeName(f)];
      const img = f.kind === 'npc' ? trainerPortrait(npcLook(NPC_BY_ID[f.id])) : f.kind === 'arbiter' ? trainerPortrait(arbiterLook(S.foeName(f), CITIES[f.city].type)) : null;
      const color = f.kind === 'npc' ? TYPE_COLOR[NPC_BY_ID[f.id].types[0]] : f.kind === 'arbiter' ? TYPE_COLOR[CITIES[f.city].type] : '#888';
      return h('button', { class: 'stadium-foe', style: `--tc:${color}`, disabled: !!problem, title: f.kind === 'arbiter' ? CITIES[f.city].arena.text : '', onclick: () => go(f) },
        img ? h('img', { src: img, alt: '' }) : h('span', { class: 'sf-dice' }, '🎲'), h('b', null, S.foeName(f)), rec ? h('small', null, `${rec[0]}–${rec[1]}`) : h('small', { class: 'muted' }, 'not yet'));
    };
    body.replaceChildren(
      h('p', { class: 'small' }, `Bring three creatures trained as far as they go (Lv ${S.STADIUM_LEVEL}, the whole chart, every Nature perk), set their playbooks, and battle. Nothing here touches your journey.`),
      h('div', { class: 'row gap-s wrap' }, h('label', { class: 'row gap-s' }, 'Trainer ', h('input', { value: b.me.name, maxlength: 16, oninput: (e: Event) => { b.me.name = (e.target as HTMLInputElement).value.trim() || 'Rowan'; keep(b); } })),
        h('div', { class: 'swatches sm' }, COLORS.map((c) => h('button', { class: `swatch ${c === b.me.color ? 'sel' : ''}`, style: `background:${c}`, 'aria-label': `Colour ${c}`, 'aria-pressed': String(c === b.me.color), onclick: () => { b.me.color = c; keep(b); render(); } })))),
      h('h4', null, `Your teams (${b.teams.length})`),
      h('div', { class: 'list' }, b.teams.map((x, i) => h('div', { class: `stadium-team ${i === team ? 'sel' : ''}` },
        h('button', { class: 'st-pick', 'aria-pressed': String(i === team), onclick: () => { team = i; render(); } }, h('b', null, x.name), h('span', { class: 'row gap-s' }, x.picks.map((p) => h('img', { src: portrait(p.species), alt: SPECIES_BY_ID[p.species]?.name ?? '' }))), S.teamProblem(x) ? h('small', { class: 'bad-text' }, S.teamProblem(x)!) : null),
        h('div', { class: 'row gap-s wrap' },
          h('button', { class: 'btn ghost sm', onclick: () => editTeam(x, (n) => { b.teams[i] = n; keep(b); render(); }) }, '✏️ Edit'),
          h('button', { class: 'btn ghost sm', onclick: () => { void navigator.clipboard?.writeText(S.teamCode(x)); toast('Team code copied. Anyone can paste it here.', 'good'); } }, '📋 Copy code'),
          h('button', { class: 'btn ghost sm bad-text', onclick: async () => { if (await confirmSheet(`Delete “${x.name}”?`, 'This team will be deleted from this browser.', 'Delete')) { b.teams.splice(i, 1); keep(b); render(); } } }, '🗑'))))),
      h('div', { class: 'row gap-s wrap' },
        h('button', { class: `btn ${b.teams.length ? 'ghost' : 'primary'} sm`, onclick: () => editTeam({ name: `Team ${b.teams.length + 1}`, picks: [] }, (n) => { if (!n.picks.length) return; b.teams.push(n); team = b.teams.length - 1; keep(b); render(); }) }, '➕ New team'),
        h('button', { class: 'btn ghost sm', onclick: () => { b.teams.push(S.randomTeam(`Random ${b.teams.length + 1}`)); team = b.teams.length - 1; keep(b); render(); } }, '🎲 Random team'),
        h('button', { class: 'btn ghost sm', onclick: async () => { const code = await ask('Paste a team code'); if (!code) return; const n = S.readTeamCode(code); if (!n) { toast('That isn’t a team code.', 'bad'); return; } b.teams.push(n); team = b.teams.length - 1; keep(b); render(); } }, '📥 Paste code')),
      h('h4', null, 'Battle'),
      h('div', { class: 'row gap-s wrap' }, h('label', { class: 'row gap-s' }, 'Weather ', h('select', { onchange: (e: Event) => { weather = (e.target as HTMLSelectElement).value; } }, Object.values(WEATHER).map((w) => h('option', { value: w.id, selected: w.id === weather }, `${w.icon} ${w.name}`)))),
        h('button', { class: 'btn primary sm', disabled: !!problem || !b.teams.length, onclick: () => hotseatSetup(app, b, team, weather, close) }, '👥 Two players, this device'),
        h('button', { class: 'btn primary sm', disabled: !!problem, onclick: async () => { close(); await hostStadium(app, t); } }, '🌐 Host online')),
      problem ? h('p', { class: 'small muted' }, problem) : '',
      h('p', { class: 'small muted' }, 'To join someone’s Stadium room, use 🌐 Online on the title screen and enter their code.'),
      h('h4', null, 'A challenger'), h('div', { class: 'stadium-foes' }, foeTile({ kind: 'random' })),
      h('h4', null, 'Champions'), h('div', { class: 'stadium-foes' }, foes.champions.map(foeTile)),
      h('h4', null, 'Arbiters, with their arenas at full strength'), h('div', { class: 'stadium-foes' }, foes.arbiters.map(foeTile)),
      h('h4', null, 'Rivals'), h('div', { class: 'stadium-foes' }, foes.rivals.map(foeTile)));
  };
  const close = openSheet('🏟️ Stadium', body, { wide: true });
  render();
}

function ask(title: string): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const end = (v: string | null) => { if (done) return; done = true; close(); resolve(v); };
    const box = h('textarea', { rows: 5, style: 'width:100%' }) as HTMLTextAreaElement;
    const close = openSheet(title, h('div', { class: 'stack gap-s' }, box, h('div', { class: 'row gap end' }, h('button', { class: 'btn ghost', onclick: () => end(null) }, 'Cancel'), h('button', { class: 'btn primary', onclick: () => end(box.value.trim() || null) }, 'OK'))), { onClose: () => end(null) });
  });
}

/** Build a team: its name, three creatures, and each one's Nature, Instinct, playbook and Swap Moves. The first leads. */
function editTeam(start: S.StadiumTeam, done: (t: S.StadiumTeam) => void) {
  const t: S.StadiumTeam = JSON.parse(JSON.stringify(start));
  const body = h('div', { class: 'stadium' });
  let built: CreatureInst[] = [];
  const render = () => {
    built = S.buildTeam(t);
    const problem = S.teamProblem(t);
    body.replaceChildren(
      h('label', { class: 'field' }, h('span', null, 'Team name'), h('input', { value: t.name, maxlength: 30, oninput: (e: Event) => { t.name = (e.target as HTMLInputElement).value || 'Team'; } })),
      ...built.map((c, i) => {
        const sp = SPECIES_BY_ID[c.species], p = t.picks[i];
        const inst = INSTINCT_BY_ID[instinctIdOf(c)];
        return h('div', { class: 'stadium-slot', style: tcOf(sp) },
          miniCard(c, { badge: i === 0 ? 'Leads' : undefined, onClick: () => openCard(i) }),
          h('div', { class: 'row gap-s wrap' },
            h('label', { class: 'row gap-s small' }, 'Nature ', h('select', { onchange: (e: Event) => { p.nature = (e.target as HTMLSelectElement).value; render(); } }, NATURES.map((n) => h('option', { value: n.id, selected: n.id === c.nature }, `${n.name} (+${STAT_LABEL[n.up]} −${STAT_LABEL[n.down]})`)))),
            h('label', { class: 'row gap-s small' }, 'Instinct ', h('select', { onchange: (e: Event) => { p.instinct = (e.target as HTMLSelectElement).value; render(); } }, S.stadiumInstincts(sp).map((x) => h('option', { value: x.id, selected: x.id === inst?.id }, x.name))))),
          inst ? h('small', { class: 'muted' }, instinctRules(inst)) : null,
          h('div', { class: 'row gap-s wrap' },
            h('button', { class: 'btn primary sm', onclick: () => openCard(i) }, '🗂 Card & playbook'),
            h('button', { class: 'btn ghost sm', onclick: () => pickSpecies(t.picks.map((x) => x.species), (id) => { t.picks[i] = fresh(id); render(); }) }, '🔁 Change'),
            i ? h('button', { class: 'btn ghost sm', onclick: () => { for (const x of t.picks) x.swaps = undefined; [t.picks[0], t.picks[i]] = [t.picks[i], t.picks[0]]; render(); } }, '⬆ Lead') : null,
            h('button', { class: 'btn ghost sm', onclick: () => { for (const x of t.picks) x.swaps = undefined; t.picks.splice(i, 1); render(); } }, '✕ Remove')));
      }),
      t.picks.length < S.STADIUM_SIZE ? h('button', { class: 'btn primary', onclick: () => pickSpecies(t.picks.map((x) => x.species), (id) => { t.picks.push(fresh(id)); render(); }) }, `➕ Add a creature (${t.picks.length}/${S.STADIUM_SIZE})`) : '',
      problem ? h('p', { class: 'small muted' }, problem) : h('p', { class: 'small muted' }, 'Playbooks and Swap Moves start as the game’s recommendations. Open a card to change them.'),
      h('div', { class: 'row gap end' }, h('button', { class: 'btn primary', onclick: () => { close(); done(t); } }, 'Save team')));
  };
  const fresh = (id: string): S.StadiumPick => ({ species: id, nature: NATURES[0].id, instinct: SPECIES_BY_ID[id].instinct });
  const openCard = (i: number) => {
    openSheet(nameOf(built[i]), creatureCard(built[i], { editable: true, teammates: built }), { wide: true, cls: 'card-sheet', onClose: () => { t.picks[i] = S.readPick(built[i], built); render(); } });
  };
  const close = openSheet('✏️ Edit team', body, { wide: true });
  render();
}

/** Choose any final stage or Legendary. */
function pickSpecies(taken: string[], done: (id: string) => void) {
  let text = '', type: ElementType | 'all' = 'all', rarity: Rarity | 'all' = 'all', show = 24;
  const grid = h('div', { class: 'stadium-dex' });
  const more = h('div', { class: 'row center' });
  const render = () => {
    const list = S.stadiumSpecies().filter((sp) => (type === 'all' || sp.types.includes(type)) && (rarity === 'all' || sp.rarity === rarity) && sp.name.toLowerCase().includes(text))
      .sort((a, b) => TYPES.indexOf(a.types[0]) - TYPES.indexOf(b.types[0]) || a.name.localeCompare(b.name));
    grid.replaceChildren(...list.slice(0, show).map((sp) => h('button', { class: 'stadium-mon', disabled: taken.includes(sp.id), style: tcOf(sp), title: taken.includes(sp.id) ? 'Already on the team' : sp.dex, onclick: () => { close(); done(sp.id); } },
      h('img', { src: portrait(sp.id), alt: '' }), h('b', null, sp.name), h('span', { class: 'row gap-s wrap center' }, sp.types.map((t) => typeChip(t, true))), h('small', { class: 'muted' }, sp.rarity))));
    more.replaceChildren(list.length > show ? h('button', { class: 'btn ghost sm', onclick: () => { show += 24; render(); } }, `Show more (${list.length - show})`) : '');
  };
  const close = openSheet('Choose a creature', h('div', { class: 'stadium' },
    h('div', { class: 'row gap-s wrap' },
      h('input', { placeholder: 'Search by name', oninput: (e: Event) => { text = (e.target as HTMLInputElement).value.toLowerCase(); show = 24; render(); } }),
      h('select', { onchange: (e: Event) => { type = (e.target as HTMLSelectElement).value as typeof type; show = 24; render(); } }, [['all', 'Any type'], ...TYPES.map((t) => [t, TYPE_LABEL[t]])].map(([v, l]) => h('option', { value: v }, l))),
      h('select', { onchange: (e: Event) => { rarity = (e.target as HTMLSelectElement).value as typeof rarity; show = 24; render(); } }, [['all', 'Any rarity'], ['common', 'Common'], ['prime', 'Prime'], ['apex', 'Apex'], ['legendary', 'Legendary']].map(([v, l]) => h('option', { value: v }, l)))),
    grid, more), { wide: true });
  render();
}

// ── Battles ─────────────────────────────────────────────────────
const me = (b: Book, t: S.StadiumTeam, side = 'a') => S.stadiumTrainer(b.me.name, b.me.color, b.me.look, S.buildTeam(t, side));

async function fightAI(app: App, t: S.StadiumTeam, f: S.StadiumFoe, weather: string) {
  const b = book(), s = me(b, t);
  const battle = S.stadiumBattle(s, f, weather);
  app.s = s;
  const res = await app.runBattle(battle, { kind: 'endgame', stadium: true, intro: `${S.foeName(f)} steps into the Stadium!`, city: f.kind === 'arbiter' ? f.city : undefined });
  const r = (b.record[S.foeName(f)] ??= [0, 0]);
  r[res === 'win' ? 0 : 1]++;
  keep(b);
  app.title();
  result(res === 'win' ? `🏆 You beat ${S.foeName(f)}!` : `${S.foeName(f)} wins.`, battle, () => void fightAI(app, t, f, weather), () => stadiumSheet(app));
}

function hotseatSetup(app: App, b: Book, team: number, weather: string, shut: () => void) {
  let other = b.teams.findIndex((t, i) => i !== team && !S.teamProblem(t)), name = 'Player 2';
  const body = h('div', { class: 'stadium' });
  const render = () => body.replaceChildren(
    h('p', { class: 'small' }, `${b.me.name} brings ${b.teams[team].name}. Pass the device to pick moves: each choice is secret.`),
    h('label', { class: 'field' }, h('span', null, 'Opponent’s name'), h('input', { value: name, maxlength: 16, oninput: (e: Event) => { name = (e.target as HTMLInputElement).value.trim() || 'Player 2'; } })),
    h('div', { class: 'list' }, b.teams.map((t, i) => h('button', { class: `stadium-team st-pick ${i === other ? 'sel' : ''}`, disabled: !!S.teamProblem(t), onclick: () => { other = i; render(); } }, h('b', null, t.name), h('span', { class: 'row gap-s' }, t.picks.map((p) => h('img', { src: portrait(p.species), alt: '' }))))),
      h('button', { class: `stadium-team st-pick ${other < 0 ? 'sel' : ''}`, onclick: () => { other = -1; render(); } }, h('b', null, '🎲 A random team'))),
    h('div', { class: 'row end' }, h('button', { class: 'btn primary', onclick: () => { close(); shut(); void fightHere(app, b.teams[team], other < 0 ? S.randomTeam() : b.teams[other], name, weather); } }, 'Battle!')));
  const close = openSheet('👥 Two players', body, { wide: true });
  render();
}

async function fightHere(app: App, ta: S.StadiumTeam, tb: S.StadiumTeam, name: string, weather: string) {
  const b = book(), a = me(b, ta);
  const foe = S.stadiumTrainer(name, COLORS.find((c) => c !== b.me.color)!, undefined, S.buildTeam(tb, 'b'));
  const battle = S.stadiumDuel(a, foe, weather);
  app.s = a;
  const res = await app.runBattle(battle, duelContext(app, a, foe));
  app.title();
  result(`🏆 ${res === 'win' ? a.trainer.name : name} wins!`, battle, () => void fightHere(app, ta, tb, name, weather), () => stadiumSheet(app));
}
const duelContext = (app: App, a: GameState, b: GameState) => ({
  kind: 'endgame' as const, stadium: true, intro: `${b.trainer.name} takes the field against ${a.trainer.name}!`, rival: b, rivalLook: playerLook(b.trainer.name, b.trainer.color, b.trainer.look),
  duel: (bt: Battle) => app.duelPick(a, b, bt, 0, 'stadium'), duelSend: (bt: Battle) => app.duelSendPick(a, b, bt),
});

function result(title: string, battle: Battle, again: () => void, out: () => void) {
  const close = openSheet(title, h('div', null,
    h('p', null, `${battle.round} rounds.`),
    ...battle.sides.map((sd) => h('div', null, h('h4', null, sd.name), h('div', { class: 'list' }, sd.team.map((c) => miniCard(c, { badge: c.ko ? 'KO' : undefined }))))),
    h('div', { class: 'row gap end' }, h('button', { class: 'btn ghost', onclick: () => { close(); out(); } }, 'Back to the Stadium'), h('button', { class: 'btn primary', onclick: () => { close(); again(); } }, '🔁 Rematch'))), { noClose: true, wide: true });
}

// ── Online ──────────────────────────────────────────────────────
/** Pick a team to bring to a Stadium room. */
export function bringTeam(done: (s: GameState) => void) {
  const b = book(), teams = [...b.teams.filter((t) => !S.teamProblem(t)), S.randomTeam('🎲 A random team')];
  const close = openSheet('🏟️ Bring a team', h('div', { class: 'stadium' },
    h('p', { class: 'small muted' }, 'Make teams in 🏟️ Stadium on the title screen. You can paste one’s code there too.'),
    h('label', { class: 'field' }, h('span', null, 'Your name'), h('input', { value: b.me.name, maxlength: 16, oninput: (e: Event) => { b.me.name = (e.target as HTMLInputElement).value.trim() || 'Rowan'; keep(b); } })),
    h('div', { class: 'list' }, teams.map((t) => h('button', { class: 'stadium-team st-pick', onclick: () => { close(); done(me(b, t)); } }, h('b', null, t.name), h('span', { class: 'row gap-s' }, t.picks.map((p) => h('img', { src: portrait(p.species), alt: '' }))))))), { wide: true });
}
async function hostStadium(app: App, t: S.StadiumTeam) {
  if (!(await app.connectOnline())) { stadiumSheet(app); return; }
  app.stadiumSeat = me(book(), t);
  app.online!.create(activeRegion().id);
}
/** Start a Stadium room's match: the two trainers, and their teams as they came. */
export function stadiumMatch(players: GameState[]): Match {
  // two people can bring the same team: keep their creatures apart
  const apart = players.map((p, i) => { const s: GameState = JSON.parse(JSON.stringify(p)); const id = (u: string) => u.replace(/^stadium-\w+-/, `stadium-${i}-`); for (const c of s.roster) { c.uid = id(c.uid); c.teamwork = Object.fromEntries(Object.entries(c.teamwork).map(([k, v]) => [id(k), v])); c.swapMoves = Object.fromEntries(Object.entries(c.swapMoves).map(([k, v]) => [id(k), v])); } s.following = s.roster[0]?.uid ?? null; return s; });
  // everyone stands in the host's region's stadium, wherever they brought their team from
  const here = activeRegion();
  for (const p of apart) { p.region = here.id; p.location = here.map.nodes.find((n) => n.kind === 'stadium')!.id; p.trainer.home = here.home; p.merits = Object.keys(here.map.cities); }
  const m = newMatch(apart);
  const { turns } = activeRegion().season;
  m.rolls[turns - 1] = m.rolls[turns] = 1;
  m.stadium = { wins: apart.map(() => 0), teams: JSON.parse(JSON.stringify(apart.map((p) => p.roster))) };
  return m;
}
/** A Stadium room's next battle, on the screen of whoever runs it (the first seat). */
export function stadiumStep(app: App, m: Match) {
  const st = m.stadium!, [a, b] = m.players;
  const score = `${a.trainer.name} ${st.wins[0]} – ${st.wins[1]} ${b.trainer.name}`;
  closeAllSheets();
  app.renderHud();
  const close = openSheet('🏟️ Stadium', h('div', { class: 'handoff' },
    h('p', null, `${a.trainer.name} against ${b.trainer.name}.`), h('h3', null, score),
    h('p', { class: 'small muted' }, 'Both trainers pick in secret each round, from their own screens.'),
    h('div', { class: 'row gap center wrap' },
      h('button', { class: 'btn ghost', onclick: () => { close(); app.leaveOnline(); } }, 'Leave'),
      h('button', { class: 'btn primary big', onclick: async () => {
        close();
        m.players.forEach((p, i) => { p.roster = JSON.parse(JSON.stringify(st.teams[i])); p.following = p.roster[0]?.uid ?? null; });
        const battle = S.stadiumDuel(a, b);
        const res = await app.runBattle(battle, duelContext(app, a, b));
        if (app.s !== a || m.stadium !== st) return;
        st.wins[res === 'win' ? 0 : 1]++;
        toast(`🏟️ ${res === 'win' ? a.trainer.name : b.trainer.name} wins! ${a.trainer.name} ${st.wins[0]} – ${st.wins[1]} ${b.trainer.name}`, 'good', 6000);
        saveMatch(m);
        app.engine.setView(app.world);
        stadiumStep(app, m);
      } }, st.wins[0] + st.wins[1] ? '🔁 Rematch' : 'Battle!'))), { noClose: true });
}
