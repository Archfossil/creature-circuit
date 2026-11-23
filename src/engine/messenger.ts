// The messenger: short texts between a trainer and the Rivals and Champions they've met (voices in
// data/texts.ts). They get in touch by themselves now and then, and some texts wait for a reply; the
// trainer can write first too. Nothing here interrupts a turn: texts wait in the Rival Trainers menu.
import { NPCS, NPC_BY_ID, type Npc } from '../data/npcs';
import { VOICES } from '../data/texts';
import { CITIES, NODE_BY_ID } from '../data/map';
import { itemInfo } from '../data/content';
import type { GameState } from './state';
import { log } from './state';
import { championAt, CHAMPIONS, inviteBlock, inviteNpc, inviteStops, npcMerits, recordWith, type NpcRecord } from './npcs';

export interface Text { turn: number; text: string; /** Written by the trainer. */ me?: boolean }
/** A text that waits for an answer. */
export type Ask = 'rematch' | 'congrats' | 'news' | 'hello';
export interface Chat { texts: Text[]; unread: number; ask?: Ask; askTurn?: number; /** The turn the trainer last wrote first. */ wrote?: number }
export interface Reply { id: string; label: string; disabled?: string }

/** Texts kept in a conversation. */
export const CHAT_MAX = 16;
/** Turns between texts they send of their own accord (from anyone), and between ones from the same person. */
export const TEXT_EVERY = 3;
const SAME_EVERY = 8;
/** How long a question waits for an answer. */
export const ASK_LASTS = 6;

const chatOf = (r: NpcRecord): Chat => (r.chat ??= { texts: [], unread: 0 });
export const chatWithNpc = (s: GameState, npc: Npc): Chat | undefined => recordWith(s, npc)?.chat;
export const unreadTexts = (s: GameState) => NPCS.reduce((a, x) => a + (chatWithNpc(s, x)?.unread ?? 0), 0);
export function readChat(s: GameState, npc: Npc) { const c = chatWithNpc(s, npc); if (c) c.unread = 0; }

const fill = (s: GameState, text: string, more: { merit?: string; place?: string } = {}) =>
  text.split('{you}').join(s.trainer.name).split('{merit}').join(more.merit ?? 'Merit').split('{place}').join(more.place ?? 'the road');
function add(s: GameState, npc: Npc, text: string, me = false) {
  const c = chatOf(recordWith(s, npc)!);
  c.texts.push({ turn: s.turn, text, ...(me ? { me } : {}) });
  if (c.texts.length > CHAT_MAX) c.texts.splice(0, c.texts.length - CHAT_MAX);
  if (!me) c.unread++;
}
const any = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
/** The nearest place to meet (a city or town), for a rematch they suggest. */
export function nearbyStop(s: GameState): string {
  const at = NODE_BY_ID[s.location];
  return [...inviteStops()].sort((a, b) => Math.hypot(NODE_BY_ID[a].x - at.x, NODE_BY_ID[a].z - at.z) - Math.hypot(NODE_BY_ID[b].x - at.x, NODE_BY_ID[b].z - at.z))[0];
}

/** They write, and (with `ask`) wait for an answer. */
function write(s: GameState, npc: Npc, text: string, ask?: Ask) {
  add(s, npc, text);
  const c = chatOf(recordWith(s, npc)!);
  c.ask = ask;
  c.askTurn = ask ? s.turn : undefined;
}

// ── They write first ────────────────────────────────────────────
/** A new turn: questions nobody answered lapse, and someone may write. Returns notes for the start of the turn. */
export function textTurn(s: GameState): string[] {
  for (const x of NPCS) {
    const c = chatWithNpc(s, x);
    if (c?.ask && s.turn - (c.askTurn ?? s.turn) >= ASK_LASTS) { c.ask = undefined; c.askTurn = undefined; }
  }
  // Merits earned since the last look: worth a word whenever one comes
  if (s.npcMerits === undefined || !Object.keys(s.npcs ?? {}).length) s.npcMerits = s.merits.length;
  const fresh = s.merits.slice(s.npcMerits);
  if (s.turn - (s.lastText ?? 0) < TEXT_EVERY || s.turn >= 100) return [];
  const known = NPCS.filter((x) => { const r = recordWith(s, x); return r && !r.invite && !r.chat?.ask; });
  const free = known.filter((x) => { const t = chatWithNpc(s, x)?.texts.filter((m) => !m.me).pop()?.turn; return t === undefined || s.turn - t >= SAME_EVERY; });
  const sent = (npc: Npc) => { s.lastText = s.turn; return [`💬 ${npc.name} sent you a message.`]; };
  if (fresh.length && known.length) {
    const npc = any(known);
    s.npcMerits = s.merits.length;
    write(s, npc, fill(s, VOICES[npc.id].congrats, { merit: CITIES[fresh[fresh.length - 1]].accolade }), 'congrats');
    return sent(npc);
  }
  if (!free.length || Math.random() > 0.6) return [];
  // whoever has the most to say: a score to settle first, then those who like you, then anyone
  const weight = (x: Npc) => { const r = recordWith(s, x)!; return 1 + Math.min(4, Math.max(0, r.rapport)) + (r.last && s.turn - r.last.turn < 15 ? 3 : 0); };
  let roll = Math.random() * free.reduce((a, x) => a + weight(x), 0);
  const npc = free.find((x) => (roll -= weight(x)) <= 0) ?? free[free.length - 1];
  const r = recordWith(s, npc)!, voice = VOICES[npc.id];
  const news = npcMerits(s, npc).length > npcMerits(s, npc, s.turn - 4).length;
  if (r.last && !inviteBlock(s, npc) && Math.random() < 0.5) write(s, npc, fill(s, r.last.won ? voice.grudge : voice.taunt), 'rematch');
  else if (news && Math.random() < 0.5) { const m = npcMerits(s, npc); write(s, npc, fill(s, voice.news, { merit: CITIES[m[m.length - 1]].accolade }), 'news'); }
  else if (r.rapport >= 4 && Math.random() < 0.4) {
    const item = r.rapport >= 8 ? 'moonberry' : npc.kind === 'champion' ? 'dewberry' : 'sunberry';
    s.inventory[item] = (s.inventory[item] ?? 0) + 1;
    write(s, npc, `${fill(s, voice.gift)} (${itemInfo(item).icon} ${itemInfo(item).name})`);
    log(s, `${npc.name} sent you a ${itemInfo(item).name}.`);
  } else write(s, npc, fill(s, voice.hello), 'hello');
  return sent(npc);
}
/** Nobody came to a rematch: they say so. */
export function textStoodUp(s: GameState, npc: Npc, at: string) { write(s, npc, fill(s, VOICES[npc.id].stoodUp, { place: NODE_BY_ID[at].name })); }

// ── Answering, and writing first ────────────────────────────────
/** What the trainer can say back to the text that's waiting. */
export function replies(s: GameState, npc: Npc): Reply[] {
  const ask = chatWithNpc(s, npc)?.ask;
  if (!ask) return [];
  if (ask === 'rematch') {
    const why = inviteBlock(s, npc);
    return [{ id: 'accept', label: `You’re on! Meet me at ${NODE_BY_ID[nearbyStop(s)].name}.`, disabled: why ?? undefined }, { id: 'kind', label: 'Not now, but soon. You’re good practice!' }, { id: 'cheeky', label: 'Once was enough for you, I think.' }];
  }
  if (ask === 'congrats') return [{ id: 'kind', label: 'Thank you! That means a lot.' }, { id: 'cheeky', label: 'Try to keep up!' }];
  if (ask === 'news') return [{ id: 'kind', label: 'Well done! You earned it.' }, { id: 'cheeky', label: 'Only just, I bet.' }];
  return [{ id: 'kind', label: 'Ha! Good to hear from you.' }, { id: 'cheeky', label: 'Don’t you have training to do?' }];
}
/** Answer the text that's waiting. Kind answers warm them to you; cheeky ones mostly amuse the competitive. */
export function reply(s: GameState, npc: Npc, id: string): boolean {
  const c = chatWithNpc(s, npc), opt = replies(s, npc).find((x) => x.id === id);
  if (!c || !opt || opt.disabled) return false;
  const r = recordWith(s, npc)!, voice = VOICES[npc.id];
  const stop = nearbyStop(s);
  add(s, npc, opt.label, true);
  c.ask = undefined;
  c.askTurn = undefined;
  if (id === 'accept') {
    inviteNpc(s, npc, stop);
    add(s, npc, `${NODE_BY_ID[stop].name}, from turn ${r.invite!.from}. I’ll be there.`);
    r.rapport++;
  } else if (id === 'kind') { r.rapport++; add(s, npc, fill(s, voice.warm)); }
  else { if (r.rapport > 5) r.rapport--; add(s, npc, fill(s, voice.cool)); }
  c.unread = 0;
  return true;
}

/** What the trainer can write first (once every few turns with each person). */
export const WRITE_EVERY = 4;
export function openers(s: GameState, npc: Npc): Reply[] {
  const r = recordWith(s, npc);
  if (!r || r.chat?.ask) return [];
  const wait = r.chat?.wrote !== undefined && s.turn - r.chat.wrote < WRITE_EVERY ? `You’ve just written. Give them ${WRITE_EVERY - (s.turn - r.chat.wrote)} more turns.` : undefined;
  return [
    { id: 'hi', label: '👋 Say hello', disabled: wait },
    ...(r.last ? [{ id: 'match', label: r.last.won ? '😏 Bring up your win' : '👏 Praise their win', disabled: wait }] : []),
    { id: 'champions', label: '🏅 Seen any Champions?', disabled: wait },
  ];
}
export function writeFirst(s: GameState, npc: Npc, id: string): boolean {
  const opt = openers(s, npc).find((x) => x.id === id);
  if (!opt || opt.disabled) return false;
  const r = recordWith(s, npc)!, voice = VOICES[npc.id];
  chatOf(r).wrote = s.turn;
  if (id === 'hi') { add(s, npc, 'Hi! How’s the road?', true); r.rapport++; add(s, npc, fill(s, voice.hello)); }
  else if (id === 'match') {
    const won = r.last!.won;
    add(s, npc, won ? 'Still thinking about our last match? I am!' : 'You got me last time. Well played.', true);
    r.rapport += won ? (r.rapport > 2 ? -1 : 0) : 1;
    add(s, npc, fill(s, won ? voice.cool : voice.warm));
  } else {
    add(s, npc, 'Seen any Champions about?', true);
    // the ones this trainer hasn't met first
    const pool = CHAMPIONS.filter((x) => x !== npc);
    const unmet = pool.filter((x) => !recordWith(s, x));
    const who = any(unmet.length ? unmet : pool);
    add(s, npc, `${who.name}’s at ${NODE_BY_ID[championAt(s, who)].name}, last I heard.`);
  }
  chatOf(r).unread = 0;
  return true;
}
/** Conversations, the latest first. */
export const chats = (s: GameState): Npc[] => Object.keys(s.npcs ?? {}).map((id) => NPC_BY_ID[id]).filter(Boolean)
  .sort((a, b) => { const l = (x: Npc) => chatWithNpc(s, x)?.texts.slice(-1)[0]?.turn ?? 0; return (chatWithNpc(s, b)?.unread ?? 0) - (chatWithNpc(s, a)?.unread ?? 0) || l(b) - l(a); });
