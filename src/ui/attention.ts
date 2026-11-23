// Getting a player's attention online: a gentle ping, a flashing tab (title and icon) and, if they allow
// it, a system notification. Browsers slow a hidden tab's timers to as little as one a minute, so the
// flashing and the connection check run on a worker's clock, which they don't slow.
import { settings } from './settings';
import { sfx } from './sound';

/** Is the player looking at the game right now (the tab showing, in the window they're using)? */
export const looking = () => !document.hidden && document.hasFocus();

// ── A clock that isn't slowed in the background ─────────────────
let clock: Worker | null | undefined;
const ticks = new Map<number, () => void>();
let nextTick = 1;
function worker(): Worker | null {
  if (clock !== undefined) return clock;
  try {
    const src = 'const t={};onmessage=e=>{const[id,ms]=e.data;if(ms)t[id]=setInterval(()=>postMessage(id),ms);else{clearInterval(t[id]);delete t[id]}}';
    clock = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    clock.onmessage = (e) => ticks.get(e.data as number)?.();
  } catch { clock = null; }
  return clock;
}
/** Call `fn` every `ms`, even in a background tab where the browser allows it. Returns how to stop. */
export function steadyInterval(fn: () => void, ms: number): () => void {
  const w = worker();
  if (!w) { const id = setInterval(fn, ms); return () => clearInterval(id); }
  const id = nextTick++;
  ticks.set(id, fn);
  w.postMessage([id, ms]);
  return () => { ticks.delete(id); w.postMessage([id, 0]); };
}

// ── The tab: title and icon ─────────────────────────────────────
let stopFlash: (() => void) | null = null;
let plainTitle = '', plainIcon = '';
const iconLink = () => document.querySelector<HTMLLinkElement>('link[rel="icon"]');
/** A bright bell, for the tab's icon while it's flashing. */
function bell(): string {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (!g) return '';
  g.fillStyle = '#ff6b35';
  g.beginPath(); g.arc(32, 32, 31, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.font = '900 46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('!', 32, 35);
  return c.toDataURL('image/png');
}
function flash(label: string) {
  calm();
  plainTitle = document.title;
  const link = iconLink();
  plainIcon = link?.getAttribute('href') ?? '';
  const alertIcon = bell();
  let on = false;
  const step = () => {
    if (looking()) { calm(); return; }
    on = !on;
    document.title = on ? `🔔 ${label}` : plainTitle;
    if (link && alertIcon) link.setAttribute('href', on ? alertIcon : plainIcon);
  };
  step(); // at once: the first tick may be a while coming
  const stop = steadyInterval(step, 1000);
  stopFlash = () => { stop(); document.title = plainTitle; if (link && plainIcon) link.setAttribute('href', plainIcon); };
}
let note: Notification | null = null;
/** The player is back (or it's no longer needed): stop flashing and clear the notification. */
export function calm() {
  stopFlash?.();
  stopFlash = null;
  try { note?.close(); } catch { /* gone */ }
  note = null;
  void navigator.serviceWorker?.getRegistration?.().then((r) => r?.getNotifications?.({ tag: TAG })).then((l) => l?.forEach((n) => n.close())).catch(() => undefined);
}
if (typeof document !== 'undefined') {
  const back = () => { if (looking() && stopFlash) calm(); };
  addEventListener('focus', back);
  document.addEventListener('visibilitychange', back);
}

// ── System notifications ────────────────────────────────────────
const TAG = 'cc-turn';
export type AlertState = 'on' | 'ask' | 'blocked' | 'none';
/** Whether system notifications can be shown: allowed, not asked yet, blocked in the browser, or not supported here. */
export const alertState = (): AlertState => (!('Notification' in window) || !window.isSecureContext ? 'none' : Notification.permission === 'granted' ? 'on' : Notification.permission === 'denied' ? 'blocked' : 'ask');
/** Ask for permission. Must be called straight from a click: some browsers ignore it otherwise. */
export async function askForAlerts(): Promise<AlertState> {
  if (alertState() === 'ask') { try { await Notification.requestPermission(); } catch { /* ignore */ } }
  return alertState();
}
async function notify(text: string) {
  if (alertState() !== 'on') return;
  const opts = { body: text, tag: TAG, icon: 'assets/types/astral.png', renotify: true } as NotificationOptions;
  // phones only allow notifications through the service worker
  try { const r = await navigator.serviceWorker?.getRegistration?.(); if (r) { await r.showNotification('Creature Circuit', opts); return; } } catch { /* fall through */ }
  try { note = new Notification('Creature Circuit', opts); note.onclick = () => { window.focus(); calm(); }; } catch { /* not allowed here */ }
}

/**
 * Something online needs the player: `label` for the tab ("Your turn!"), `text` for the notification.
 * If they're looking at the game it's just the ping.
 */
export function callFor(label: string, text: string) {
  if (settings().turnPing) sfx.ping();
  if (looking()) return;
  flash(label);
  void notify(text);
}
/** Settings' test: wait a few seconds (so they can look away), then call. */
export function testCall() { setTimeout(() => callFor('Test alert!', 'This is what a turn alert looks like.'), 4000); }
