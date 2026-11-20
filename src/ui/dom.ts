import { settings } from './settings';
import { sfx } from './sound';

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k === 'html') el.innerHTML = String(v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}
function append(el: HTMLElement, c: Child) {
  if (c === null || c === undefined || c === false) return;
  if (Array.isArray(c)) { for (const x of c) append(el, x); return; }
  el.append(c instanceof Node ? c : document.createTextNode(String(c)));
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Toasts ────────────────────────────────────────────────────
/** Online play: the controlling browser mirrors its toasts and dice rolls to everyone watching. */
export const mirror: { toast?: (text: string, tone: 'info' | 'good' | 'bad') => void; dice?: (title: string, dice: DieSpec[], caption?: string, hold?: number) => void } = {};

export function toast(text: string, tone: 'info' | 'good' | 'bad' = 'info', ms = 2600) {
  mirror.toast?.(text, tone);
  let host = $('#toasts');
  if (!host) { host = h('div', { id: 'toasts' }); document.body.append(host); }
  const t = h('div', { class: `toast ${tone}`, role: 'status' }, text);
  host.append(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, ms);
}

// ── Sheets (bottom sheet on phones, centered panel on desktop) ─
let sheetStack: HTMLElement[] = [];
export function openSheet(title: string, body: Node, opts: { wide?: boolean; onClose?: () => void; noClose?: boolean; cls?: string } = {}): () => void {
  const close = () => {
    sheet.classList.remove('in');
    sheetStack = sheetStack.filter((s) => s !== sheet);
    setTimeout(() => sheet.remove(), 220);
    opts.onClose?.();
  };
  const prevFocus = document.activeElement as HTMLElement | null;
  const sheet = h('div', { class: `sheet-wrap ${opts.cls ?? ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-backdrop', onclick: opts.noClose ? null : close }),
    h('div', { class: `sheet ${opts.wide ? 'wide' : ''}` },
      h('div', { class: 'sheet-grip' }),
      h('header', { class: 'sheet-head' },
        h('h2', null, title),
        opts.noClose ? null : h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, '✕')),
      h('div', { class: 'sheet-body' }, body)));
  (sheet as HTMLElement & { _close?: () => void })._close = opts.noClose ? undefined : close;
  document.body.append(sheet);
  sheetStack.push(sheet);
  requestAnimationFrame(() => {
    sheet.classList.add('in');
    // move focus into the dialog for keyboard / screen-reader users
    (sheet.querySelector('.sheet-body button:not(:disabled), .sheet-body input') as HTMLElement | null)?.focus({ preventScroll: true });
  });
  const origClose = close;
  return () => { origClose(); prevFocus?.focus?.({ preventScroll: true }); };
}
// Esc closes the top-most dismissable sheet
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const top = sheetStack[sheetStack.length - 1] as (HTMLElement & { _close?: () => void }) | undefined;
  top?._close?.();
});

export function closeAllSheets() {
  for (const s of sheetStack) { s.classList.remove('in'); const el = s; setTimeout(() => el.remove(), 220); }
  sheetStack = [];
}

export function confirmSheet(title: string, text: string, yes = 'Confirm', no = 'Cancel'): Promise<boolean> {
  return new Promise((res) => {
    let done = false;
    const finish = (v: boolean) => { if (done) return; done = true; close(); res(v); };
    const close = openSheet(title, h('div', null,
      h('p', { class: 'lead' }, text),
      h('div', { class: 'row gap end' },
        h('button', { class: 'btn ghost', onclick: () => finish(false) }, no),
        h('button', { class: 'btn primary', onclick: () => finish(true) }, yes))), { onClose: () => { if (!done) { done = true; res(false); } } });
  });
}

// ── Dice ──────────────────────────────────────────────────────
export interface DieSpec { sides: number; value: number; label?: string; tone?: 'good' | 'bad' | 'info'; face?: string }

/** Show a tabletop dice roll overlay. Resolves when the animation ends. */
export async function rollDice(title: string, dice: DieSpec[], caption?: string, hold = 900): Promise<void> {
  mirror.dice?.(title, dice, caption, hold);
  const fast = settings().fastDice || settings().reduceMotion;
  const spin = fast ? 260 : 650;
  if (fast) hold = Math.round(hold * 0.45);
  sfx.dice();
  const tray = h('div', { class: 'dice-tray' });
  const wrap = h('div', { class: 'dice-overlay', role: 'status', 'aria-live': 'polite', 'aria-label': `${title}: ${dice.map((d) => d.face ?? d.value).join(', ')}${caption ? '. ' + caption : ''}` }, h('div', { class: 'dice-card' }, h('div', { class: 'dice-title' }, title), tray, caption ? h('div', { class: 'dice-caption' }, caption) : null));
  const els = dice.map((d) => {
    const face = h('div', { class: `die d${d.sides}` }, h('span', null, '?'));
    const box = h('div', { class: 'die-box' }, face, h('small', null, d.label ?? `d${d.sides}`));
    tray.append(box);
    return { d, face };
  });
  document.body.append(wrap);
  requestAnimationFrame(() => wrap.classList.add('in'));
  const t0 = performance.now();
  await new Promise<void>((res) => {
    const tick = () => {
      const el = performance.now() - t0;
      for (const { d, face } of els) {
        if (el < spin) { face.firstElementChild!.textContent = String(1 + Math.floor(Math.random() * d.sides)); face.classList.add('rolling'); }
        else { face.classList.remove('rolling'); face.firstElementChild!.textContent = d.face ?? String(d.value); if (d.tone) face.classList.add(d.tone); }
      }
      if (el < spin) requestAnimationFrame(tick); else { sfx.land(); res(); }
    };
    tick();
  });
  await wait(hold);
  wrap.classList.remove('in');
  setTimeout(() => wrap.remove(), 250);
}

export function floatText(x: number, y: number, text: string, cls = '') {
  const el = h('div', { class: `float-text ${cls}`, style: `left:${x}px;top:${y}px` }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 1300);
}
