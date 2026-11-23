// Browser side of online play: one WebSocket to the game server (same origin, /ws). The App drives
// game logic; this just sends and receives messages and remembers who we are.
import type { GameState, Match } from '../engine/state';
import type { CreatureEdit } from '../engine/edits';

export interface SeatInfo { clientId: string; name: string; trainer: GameState | null; online: boolean }
export interface RoomInfo { code: string; host: string; started: boolean; controller: string | null; turnSeconds: number; deadline: number | null; seats: SeatInfo[] }

/** Things the controlling browser mirrors to everyone watching. */
export type FeedItem =
  | { kind: 'toast'; text: string; tone: 'info' | 'good' | 'bad' }
  | { kind: 'dice'; title: string; dice: unknown[]; caption?: string; hold?: number }
  | { kind: 'hop'; from: string; to: string }
  | { kind: 'battle-start'; battle: unknown; ctx: { kind: string; intro: string; city?: string; rivalSeat?: number } }
  | { kind: 'battle-events'; events: unknown[] }
  | { kind: 'battle-end' };

export type ServerMsg =
  | ({ type: 'room' } & RoomInfo)
  | { type: 'created'; code: string }
  | { type: 'state'; match: Match }
  | { type: 'feed'; item: FeedItem }
  | { type: 'ask'; id: string; from: string; title: string; text: string; yes: string; no: string; pick?: unknown }
  | { type: 'answer'; id: string; yes: boolean; offline?: boolean; value?: unknown }
  | { type: 'do-skip'; seat: number; reason: 'timeout' | 'host' }
  | { type: 'do-play'; seat: number; reason: 'host' }
  | { type: 'edit'; seat: number; edit: CreatureEdit }
  | { type: 'error'; text: string };

const ID_KEY = 'creature-circuit-client-id';
/** This browser's stable id (it owns its seats across reloads). */
export function clientId(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(ID_KEY, id); }
    return id;
  } catch { return 'guest-' + Math.random().toString(36).slice(2); }
}

const ROOM_KEY = 'creature-circuit-online-room';
/** The last online room this browser was in (to offer "Rejoin"). */
export function lastRoom(): string | null { try { return localStorage.getItem(ROOM_KEY); } catch { return null; } }
export function rememberRoom(code: string | null) { try { if (code) localStorage.setItem(ROOM_KEY, code); else localStorage.removeItem(ROOM_KEY); } catch { /* ignore */ } }

const SESSION_KEY = 'creature-circuit-session-room';
/** The room this tab is playing in, so a tab the browser reloads goes straight back (cleared by leaving or the title screen). */
export function sessionRoom(): string | null { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } }
export function rememberSession(code: string | null) { try { if (code) sessionStorage.setItem(SESSION_KEY, code); else sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } }

export class Online {
  ws: WebSocket | null = null;
  readonly id = clientId();
  room: RoomInfo | null = null;
  code: string | null = null;
  private handlers = new Set<(m: ServerMsg) => void>();
  private pending = new Map<string, (yes: boolean, value?: unknown) => void>();
  private queue: string[] = [];
  private awaiting: (() => void)[] = [];

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const proto = location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${proto}://${location.host}/ws?id=${encodeURIComponent(this.id)}`);
      this.ws = ws;
      ws.onopen = () => {
        if (this.code) ws.send(JSON.stringify({ type: 'join', code: this.code })); // coming back after a dropped connection
        for (const q of this.queue.splice(0)) ws.send(q);
        resolve();
      };
      ws.onerror = () => reject(new Error('Couldn’t reach the game server.'));
      ws.onclose = () => { if (this.ws !== ws) return; for (const h of this.handlers) h({ type: 'error', text: 'Disconnected from the game server.' }); };
      ws.onmessage = (e) => {
        if (this.ws !== ws) return;
        for (const a of this.awaiting.splice(0)) a();
        let msg: ServerMsg | { type: 'pong' };
        try { msg = JSON.parse(String(e.data)); } catch { return; }
        if (msg.type === 'pong') return;
        if (msg.type === 'room') this.room = msg;
        if (msg.type === 'created') { this.code = msg.code; rememberRoom(msg.code); }
        if (msg.type === 'answer') { this.pending.get(msg.id)?.(msg.yes, msg.value); this.pending.delete(msg.id); return; }
        for (const h of this.handlers) h(msg);
      };
    });
  }
  on(h: (m: ServerMsg) => void) { this.handlers.add(h); return () => this.handlers.delete(h); }
  send(msg: Record<string, unknown>) {
    const text = JSON.stringify({ ...msg, code: this.code });
    if (this.ws?.readyState === 1) this.ws.send(text);
    // while disconnected, the match and what watchers see are sent afresh on return; the rest waits
    else if (msg.type !== 'state' && msg.type !== 'feed' && msg.type !== 'ping') this.queue.push(text);
  }

  /** Is the connection really there? A phone's can look open long after it died in the background. */
  alive(ms = 3000): Promise<boolean> {
    if (this.ws?.readyState !== 1) return Promise.resolve(false);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), ms);
      this.awaiting.push(() => { clearTimeout(timer); resolve(true); });
      this.send({ type: 'ping' });
    });
  }
  /** Open a fresh connection to the same room, keeping everything else. */
  reopen(): Promise<void> {
    const old = this.ws;
    this.ws = null;
    old?.close();
    return this.connect();
  }
  close() { const ws = this.ws; this.ws = null; ws?.close(); }

  create(resume?: { match: Match; owners: string[]; turnSeconds: number }) { this.send({ type: 'create', ...(resume ?? {}) }); }
  join(code: string) { this.code = code.toUpperCase(); rememberRoom(this.code); this.send({ type: 'join' }); }

  get isHost() { return !!this.room && this.room.host === this.id; }
  get isController() { return !!this.room && this.room.controller === this.id; }
  /** Seat indexes this browser owns. */
  get mySeats(): number[] { return (this.room?.seats ?? []).map((s, i) => (s.clientId === this.id ? i : -1)).filter((i) => i >= 0); }

  /** Ask another seat's owner to pick something (a duel move). Resolves undefined if they're offline or take longer than `ms`. */
  pick<T>(seat: number, from: string, pick: unknown, ms = 60_000): Promise<T | undefined> {
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve) => {
      this.pending.set(id, (_yes, value) => resolve(value as T | undefined));
      this.send({ type: 'ask', id, seat, from, title: '', text: '', yes: '', no: '', pick });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); resolve(undefined); } }, ms);
    });
  }

  /** Ask another seat's owner a yes/no question (trade or duel). Resolves false if they're offline or don't answer in 2 minutes. */
  ask(seat: number, from: string, title: string, text: string, yes: string, no: string): Promise<boolean> {
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.send({ type: 'ask', id, seat, from, title, text, yes, no });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); resolve(false); } }, 120_000);
    });
  }
}
