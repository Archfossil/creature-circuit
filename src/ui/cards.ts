import { h, openSheet } from './dom';
import type { CreatureInst } from '../engine/creature';
import { speciesOf, nameOf, stats, maxHealth, maxVitality, maxStamina, energy, energyTotal, allocateEnergy, fits, learnable, progressionTree, availableNodes, unlockNode, STAT_KEYS, STAT_LABEL, recommendPlaybook, suggestGoal, expectedDamage, type PlaybookGoal } from '../engine/creature';
import { MOVE_BY_ID, STATUS_INFO, STATUS_FOR } from '../data/moves';
import { ABILITIES, AFFINITIES, NATURE_BY_ID } from '../data/content';
import { TYPE_COLOR, TYPE_LABEL, typeIcon, TYPES, effectiveness } from '../data/types';
import type { ElementType, EnergyKey, Move } from '../data/schema';
import { portrait } from '../render/engine';
import { typeMatchup } from '../engine/battle';

export function typeChip(t: ElementType, small = false) {
  return h('span', { class: `type-chip ${small ? 'sm' : ''}`, style: `--tc:${TYPE_COLOR[t]}` }, h('img', { src: typeIcon(t), alt: '' }), TYPE_LABEL[t]);
}
export function typeIconImg(t: ElementType, size = 18) {
  return h('img', { class: 'type-ico', src: typeIcon(t), alt: TYPE_LABEL[t], width: size, height: size });
}
export function rarityBadge(r: string) {
  const stars = r === 'common' ? 1 : r === 'prime' ? 2 : r === 'apex' ? 3 : 4;
  return h('span', { class: `rarity r-${r}` }, '★'.repeat(stars), ' ', r[0].toUpperCase() + r.slice(1));
}

/** Energy pips. Pass `spent` (from `allocateEnergy`) to dull and strike out committed energy. */
export function energyPips(e: Partial<Record<EnergyKey | 'neutral', number>>, small = false, spent: Partial<Record<EnergyKey, number>> = {}) {
  const out: HTMLElement[] = [];
  for (const [k, v] of Object.entries(e)) {
    const n = v ?? 0;
    const used = Math.min(n, spent[k as EnergyKey] ?? 0);
    for (let i = 0; i < n; i++) {
      const isSpent = i >= n - used; // free pips first, committed ones at the end of each group
      const cls = `pip ${small ? 'sm' : ''} ${isSpent ? 'spent' : ''}`;
      const tag = isSpent ? ' · committed' : '';
      if (k === 'neutral') out.push(h('span', { class: `${cls} neutral`, title: 'Neutral (any energy)' }));
      else if (k === 'prisma') out.push(h('span', { class: `${cls} prisma`, title: `Prisma (counts as any type)${tag}` }));
      else out.push(h('span', { class: cls, style: `--tc:${TYPE_COLOR[k as ElementType]}`, title: `${TYPE_LABEL[k as ElementType]}${tag}` }));
    }
  }
  return h('span', { class: 'pips' }, out);
}

export function hpBlock(c: CreatureInst, compact = false) {
  const mh = maxHealth(c), mv = maxVitality(c);
  const hearts = h('span', { class: 'hearts' }, Array.from({ length: mv }, (_, i) => h('span', { class: `heart ${i < c.vitality ? 'on' : ''}` }, '♥')));
  const pct = c.ko ? 0 : Math.max(0, Math.min(100, (c.health / mh) * 100));
  return h('div', { class: `hp ${compact ? 'compact' : ''}` },
    h('div', { class: 'hp-row' }, h('span', { class: 'lbl' }, 'HP'), h('div', { class: 'bar' }, h('i', { style: `width:${pct}%`, class: pct < 34 ? 'low' : pct < 67 ? 'mid' : '' })), h('span', { class: 'num' }, c.ko ? 'KO' : `${c.health}/${mh}`)),
    h('div', { class: 'hp-row' }, h('span', { class: 'lbl' }, 'VIT'), hearts));
}

/** How a move's typing lands on a defender: only Elemental moves use the type chart. */
export function moveMatchup(m: Move, defender: ElementType[]): { mult: number; label: string; cls: string } | null {
  const mult = typeMatchup(m, defender);
  if (mult === null) return null;
  if (mult === 0) return { mult, label: 'No effect', cls: 'x0' };
  if (mult >= 4) return { mult, label: '4× Devastating', cls: 'x4' };
  if (mult >= 2) return { mult, label: '2× Super effective', cls: 'x2' };
  if (mult < 1) return { mult, label: '½ Resisted', cls: 'x05' };
  return { mult, label: '1× Neutral', cls: 'x1' };
}

export function moveCard(m: Move, opts: { onClick?: () => void; disabled?: boolean; selected?: boolean; compact?: boolean; hotkey?: string; vs?: ElementType[] } = {}) {
  const match = opts.vs ? moveMatchup(m, opts.vs) : null;
  const col = m.type ? TYPE_COLOR[m.type] : '#8a8796';
  const acc = m.accuracy === 'sure' ? 'Sure-hit' : `d${m.accuracy}`;
  const dmg = m.dmgDie || m.dmgFlat ? `${m.dmgDie ? 'd' + m.dmgDie : ''}${m.dmgDie && m.dmgFlat ? '+' : ''}${m.dmgFlat || ''}` : '—';
  return h('button', {
    class: `move-card ${m.kind} ${opts.selected ? 'sel' : ''} ${opts.compact ? 'compact' : ''}`, style: `--tc:${col}`,
    disabled: opts.disabled, onclick: opts.onClick, type: 'button', 'aria-pressed': opts.selected ? 'true' : null,
  },
    h('div', { class: 'mc-top' },
      m.type ? typeIconImg(m.type, 16) : h('span', { class: 'phys-ico' }, m.kind === 'support' ? '✦' : '✊'),
      h('b', null, m.name),
      opts.hotkey ? h('kbd', { class: 'hotkey', 'aria-hidden': 'true' }, opts.hotkey) : null,
      h('span', { class: 'mc-kind' }, m.kind === 'physical' ? 'Physical' : m.kind === 'support' ? 'Support' : 'Elemental')),
    h('div', { class: 'mc-stats' },
      h('span', { title: 'Damage' }, '⚔ ', dmg),
      h('span', { title: 'Accuracy' }, '🎯 ', acc),
      h('span', { title: 'Effort (stamina)' }, '💨 ', m.effort),
      m.speed ? h('span', { title: 'Speed modifier' }, '⚡', m.speed > 0 ? `+${m.speed}` : m.speed) : null),
    match ? h('div', { class: `mc-eff ${match.cls}`, title: `Type matchup against the opponent: ×${match.mult}` }, match.label)
      : opts.vs && m.kind === 'physical' ? h('div', { class: 'mc-eff phys', title: 'Physical attacks ignore the type chart' }, 'Ignores types') : null,
    opts.compact ? null : h('div', { class: 'mc-text' }, m.text, m.status ? h('em', null, ` Min roll: ${STATUS_INFO[m.status].name}.`) : null),
    opts.compact ? null : h('div', { class: 'mc-cost' }, energyPips(m.cost as Record<string, number>, true)));
}

export function miniCard(c: CreatureInst, opts: { onClick?: () => void; badge?: string; selected?: boolean } = {}) {
  const sp = speciesOf(c);
  return h('button', { class: `mini-card ${c.ko ? 'ko' : ''} ${opts.selected ? 'sel' : ''}`, onclick: opts.onClick, type: 'button', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
    h('div', { class: 'mini-portrait' }, h('img', { src: portrait(sp.id), alt: sp.name })),
    h('div', { class: 'mini-info' },
      h('div', { class: 'mini-name' }, h('b', null, nameOf(c)), h('span', { class: 'lv' }, `Lv ${c.level}`)),
      h('div', { class: 'mini-types' }, sp.types.map((t) => typeIconImg(t, 14))),
      hpBlock(c, true)),
    opts.badge ? h('span', { class: 'mini-badge' }, opts.badge) : null,
    c.points > 0 ? h('span', { class: 'mini-up', title: 'Unspent level-up' }, '▲') : null);
}

/**
 * Side-by-side "before → after" for a creature that's about to change (a trade, a new Nature …):
 * who it is, then every stat with the difference highlighted.
 */
export function statCompare(before: CreatureInst, after: CreatureInst, labels: [string, string] = ['Now', 'After']) {
  const sb = stats(before), sa = stats(after);
  const who = (c: CreatureInst, label: string) => {
    const sp = speciesOf(c);
    return h('div', { class: 'cmp-who', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
      h('small', null, label),
      h('img', { src: portrait(sp.id), alt: '' }),
      h('b', null, nameOf(c)),
      h('span', { class: 'row gap-s center' }, sp.types.map((t) => typeIconImg(t, 14)), h('small', null, `Lv ${c.level}`)),
      h('small', { class: 'muted' }, `${NATURE_BY_ID[c.nature]?.name ?? c.nature} · ${sp.rarity}`));
  };
  const rows: [string, number, number][] = [
    ['Health', maxHealth(before), maxHealth(after)],
    ['Vitality', maxVitality(before), maxVitality(after)],
    ['Stamina', maxStamina(before), maxStamina(after)],
    ...STAT_KEYS.filter((k) => k !== 'vigor' && k !== 'stamina').map((k): [string, number, number] => [STAT_LABEL[k], sb[k], sa[k]]),
    ['Energy', energyTotal(energy(before)), energyTotal(energy(after))],
  ];
  return h('div', { class: 'cmp' },
    h('div', { class: 'cmp-heads' }, who(before, labels[0]), h('span', { class: 'cmp-arrow' }, '→'), who(after, labels[1])),
    h('table', { class: 'cmp-table' }, h('tbody', null, rows.map(([label, a, b]) => {
      const d = b - a;
      return h('tr', { class: d > 0 ? 'up' : d < 0 ? 'down' : '' },
        h('th', null, label), h('td', null, a), h('td', { class: 'cmp-arrow' }, '→'), h('td', null, h('b', null, b)),
        h('td', { class: 'cmp-delta' }, d ? `${d > 0 ? '+' : '−'}${Math.abs(d)}` : '='));
    }))));
}

function meter(label: string, v: number, max: number, cls = '') {
  return h('div', { class: `meter ${cls}` }, h('span', { class: 'lbl' }, label), h('div', { class: 'bar' }, h('i', { style: `width:${(v / max) * 100}%` })), h('span', { class: 'num' }, `${v}/${max}`));
}

export function creatureCard(c: CreatureInst, opts: { onChange?: () => void; editable?: boolean; extra?: Node } = {}) {
  const wrap = h('div', { class: 'card-flip' });
  let back = false;
  const render = () => {
    wrap.replaceChildren(back ? cardBack(c, () => { back = false; render(); }, () => { render(); opts.onChange?.(); }) : cardFront(c, () => { back = true; render(); }, opts, () => { render(); opts.onChange?.(); }));
  };
  render();
  return wrap;
}

function cardFront(c: CreatureInst, flip: () => void, opts: { editable?: boolean; extra?: Node }, changed: () => void) {
  const sp = speciesOf(c);
  const st = stats(c);
  const e = energy(c);
  const nat = NATURE_BY_ID[c.nature];
  const ab = ABILITIES[sp.ability];
  const af = AFFINITIES[sp.affinity];
  const spent = allocateEnergy(e, c.playbook);
  const free = energyTotal(e) - energyTotal(spent);
  return h('article', { class: 'index-card', style: `--tc:${TYPE_COLOR[sp.types[0]]};--tc2:${TYPE_COLOR[sp.types[1] ?? sp.types[0]]}` },
    h('header', { class: 'ic-head' },
      h('div', null,
        h('h3', null, nameOf(c)),
        h('div', { class: 'ic-sub' }, sp.types.map((t) => typeChip(t, true)), rarityBadge(sp.rarity), h('span', { class: 'stage' }, `Stage ${sp.stage}`))),
      h('div', { class: 'lv-badge' }, h('small', null, 'LV'), c.level)),
    h('div', { class: 'ic-art' },
      h('img', { src: portrait(sp.id), alt: sp.name }),
      h('div', { class: 'ic-art-tags' }, h('span', null, `RT ${sp.rt}`), h('span', null, nat.name))),
    h('div', { class: 'ic-bars' },
      hpBlock(c),
      meter('STA', c.stamina, maxStamina(c)),
      meter('XP', c.xp, 10, 'xp'),
      h('div', { class: 'row gap-s small' },
        h('span', { class: 'chip' }, '💖 Morale ', h('b', null, c.morale), '/10'),
        h('span', { class: 'chip' }, '🤝 Loyalty ', h('b', null, c.loyalty)),
        c.fatigue ? h('span', { class: 'chip bad' }, '😮‍💨 Fatigue ', h('b', null, c.fatigue)) : null,
        c.movement ? h('span', { class: 'chip good' }, '➶ ', c.movement[0].toUpperCase() + c.movement.slice(1)) : null)),
    h('div', { class: 'ic-stats' }, STAT_KEYS.map((k) => h('div', { class: 'stat' }, h('small', null, STAT_LABEL[k]), h('b', null, st[k])))),
    h('section', { class: 'ic-sec' },
      h('h4', null, 'Energy ', h('span', { class: 'muted' }, `${free}/${energyTotal(e)} free · ${4 - c.playbook.length}/4 slots open`)),
      energyPips(e, false, spent)),
    h('section', { class: 'ic-sec' },
      h('h4', null, 'Playbook', opts.editable ? h('button', { class: 'link', onclick: () => editPlaybook(c, changed) }, 'Edit moves') : null),
      h('div', { class: 'moves' }, c.playbook.map((id) => moveCard(MOVE_BY_ID[id])))),
    h('section', { class: 'ic-sec two' },
      h('div', { class: 'mini-panel' }, h('h5', null, '🌿 Ability · ', ab.name), h('p', null, ab.text), h('small', { class: 'muted' }, 'Active while Following.')),
      h('div', { class: 'mini-panel' }, h('h5', null, '🔁 Affinity · ', af.name), h('p', null, af.text), h('small', { class: 'muted' }, 'Triggers when swapped in as Alpha.'))),
    h('section', { class: 'ic-sec' },
      h('h4', null, `Nature · ${nat.name}`, h('span', { class: 'muted' }, ` +${nat.up} / −${nat.down}`)),
      h('p', { class: 'small' }, nat.text),
      h('div', { class: 'perks' }, nat.perks.map((p, i) => {
        const have = i < c.perks;
        const next = i === c.perks;
        return h('button', {
          class: `perk ${have ? 'have' : ''} ${next && c.loyalty >= p.cost ? 'ready' : ''}`, disabled: !opts.editable || !next || c.loyalty < p.cost,
          onclick: () => { if (c.loyalty >= p.cost && i === c.perks) { c.loyalty -= p.cost; c.perks++; changed(); } },
        }, h('b', null, p.name), h('small', null, have ? '✓ ' + p.text : `${p.cost} Loyalty · ${p.text}`));
      }))),
    h('p', { class: 'dex' }, sp.dex),
    opts.extra ?? null,
    h('footer', { class: 'ic-foot' },
      h('button', { class: `btn ${c.points > 0 ? 'primary pulse' : 'ghost'}`, onclick: flip }, c.points > 0 ? `▲ Level-up chart (${c.points})` : 'Progression chart ↺')));
}

function cardBack(c: CreatureInst, flip: () => void, changed: () => void) {
  const tree = progressionTree(c);
  const av = new Set(availableNodes(c).map((n) => n.id));
  const rows = Math.max(...tree.map((n) => n.row)) + 1;
  const sp = speciesOf(c);
  const label = (id: string) => tree.find((x) => x.id === id)?.label ?? id;
  const links = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  links.setAttribute('class', 'chart-links');
  links.setAttribute('aria-hidden', 'true');
  const chart = h('div', { class: 'chart' }, links, Array.from({ length: rows }, (_, r) =>
    h('div', { class: 'chart-row' }, [0, 1, 2].map((col) => {
      const n = tree.find((x) => x.row === r && x.col === col);
      if (!n) return h('div', { class: 'node empty' });
      const have = c.unlocked.includes(n.id);
      const can = av.has(n.id) && c.points > 0;
      const missing = n.requires.filter((id) => !c.unlocked.includes(id));
      return h('button', {
        class: `node ${n.kind} ${have ? 'have' : can ? 'can' : av.has(n.id) ? 'avail' : 'locked'}`, disabled: !can, 'data-node': n.id,
        title: n.requires.length ? `Needs: ${n.requires.map(label).join(' + ')}` : 'Starting node',
        onclick: () => { if (unlockNode(c, n.id)) changed(); },
      }, h('span', { class: 'node-ico' }, n.icon), h('b', null, n.label), h('small', null, n.text),
        !have && missing.length ? h('small', { class: 'node-req' }, `Needs ${missing.map(label).join(' + ')}`) : null);
    }))));
  // draw connectors once laid out, and again whenever the card resizes
  const draw = () => drawChartLinks(chart, links, tree, c.unlocked);
  requestAnimationFrame(draw);
  setTimeout(draw, 400); // again once the sheet / flip animation has settled
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(draw).observe(chart);
  return h('article', { class: 'index-card back', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
    h('header', { class: 'ic-head' },
      h('div', null, h('h3', null, `${nameOf(c)} · Chart`), h('div', { class: 'ic-sub' }, h('span', null, `${c.points} node${c.points === 1 ? '' : 's'} to unlock · every 10 XP earns one`))),
      h('div', { class: 'lv-badge' }, h('small', null, 'LV'), c.level)),
    chart,
    h('p', { class: 'small muted center' }, 'A node opens once every node linked above it is unlocked. Evolving needs the whole center path; side branches are optional, but any you skip are left behind when the creature evolves. At the final stage, the Capstone needs both the Vitality and Stamina branches.'),
    h('footer', { class: 'ic-foot' }, h('button', { class: 'btn ghost', onclick: flip }, '↺ Flip to front')));
}

/**
 * Draw a connector from each prerequisite node down to the node that needs it: straight down
 * within a column, or a right-angled elbow (rounded corners) across columns, turning in the gap
 * between rows. Positions come from layout offsets, not screen rects, so the lines stay put while
 * the card is mid-flip or the sheet is still animating in.
 */
function drawChartLinks(chart: HTMLElement, svg: SVGSVGElement, tree: ReturnType<typeof progressionTree>, unlocked: string[]) {
  if (!chart.isConnected || !chart.offsetWidth) return;
  const rect = (id: string) => {
    let el = chart.querySelector<HTMLElement>(`[data-node="${id}"]`);
    if (!el) return null;
    const w = el.offsetWidth, hgt = el.offsetHeight;
    let x = 0, y = 0;
    while (el && el !== chart) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent as HTMLElement | null; }
    return { cx: x + w / 2, top: y, bottom: y + hgt };
  };
  const ns = 'http://www.w3.org/2000/svg';
  svg.setAttribute('viewBox', `0 0 ${chart.offsetWidth} ${chart.offsetHeight}`);
  const paths: SVGElement[] = [];
  for (const n of tree) for (const req of n.requires) {
    const a = rect(req), b = rect(n.id);
    if (!a || !b) continue;
    const x1 = a.cx, y1 = a.bottom, x2 = b.cx, y2 = b.top;
    const midY = Math.round((y1 + y2) / 2);
    const dx = x2 - x1, r = Math.min(10, Math.abs(dx) / 2, (y2 - y1) / 2);
    const sx = Math.sign(dx);
    const d = Math.abs(dx) < 2
      ? `M${x1},${y1} V${y2}`
      : `M${x1},${y1} V${midY - r} Q${x1},${midY} ${x1 + sx * r},${midY} H${x2 - sx * r} Q${x2},${midY} ${x2},${midY + r} V${y2}`;
    const state = unlocked.includes(n.id) ? 'have' : unlocked.includes(req) ? 'open' : 'locked';
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', `link ${state}`);
    // bought links first in the DOM so open/locked ones draw on top where elbows share a gap
    paths.push(path);
  }
  const rank = (p: SVGElement) => (p.classList.contains('have') ? 0 : p.classList.contains('open') ? 2 : 1);
  svg.replaceChildren(...paths.sort((p, q) => rank(p) - rank(q)));
}

export function editPlaybook(c: CreatureInst, changed: () => void) {
  {
    const e = energy(c);
    let sel = [...c.playbook];
    // list controls: a type (or Physical / Support) filter, a sort order, and "only what still fits"
    type Filter = 'all' | 'physical' | 'support' | ElementType;
    type Sort = 'cost' | 'cost-desc' | 'damage' | 'speed' | 'type' | 'name';
    let filter: Filter = 'all', sort: Sort = 'cost', fitsOnly = false;
    const typesOf = (m: Move) => TYPES.filter((t) => (m.cost[t] ?? 0) > 0);
    const costSum = (m: Move) => Object.values(m.cost).reduce<number>((a, v) => a + (v ?? 0), 0);
    const avgDmg = (m: Move) => (m.dmgDie ? (m.dmgDie + 1) / 2 : 0) + m.dmgFlat;
    const matches = (m: Move, f: Filter) =>
      f === 'all' ? true : f === 'physical' ? m.kind === 'physical' : f === 'support' ? m.kind === 'support' : typesOf(m).includes(f);
    const typeRank = (m: Move) => { const ts = typesOf(m); return ts.length ? TYPES.indexOf(ts[0]) * 10 + ts.length : m.kind === 'physical' ? -2 : -1; };
    const SORTS: Record<Sort, [string, (a: Move, b: Move) => number]> = {
      cost: ['Cost: low → high', (a, b) => costSum(a) - costSum(b)],
      'cost-desc': ['Cost: high → low', (a, b) => costSum(b) - costSum(a)],
      damage: ['Damage: high → low', (a, b) => avgDmg(b) - avgDmg(a)],
      speed: ['Speed: fastest first', (a, b) => b.speed - a.speed],
      type: ['Type', (a, b) => typeRank(a) - typeRank(b)],
      name: ['Name: A → Z', () => 0],
    };
    const body = h('div', { class: 'pb-edit' });
    const render = () => {
      const all = learnable(c);
      const spent = allocateEnergy(e, sel);
      const total = energyTotal(e), free = total - energyTotal(spent), slots = 4 - sel.length;
      const usage = h('div', { class: 'pb-usage' },
        h('div', { class: 'pb-counters' },
          h('span', { class: `pb-count ${free === 0 ? 'empty' : ''}` }, h('b', null, free), h('small', null, `/${total} energy left`)),
          h('span', { class: `pb-count ${slots === 0 ? 'empty' : ''}` }, h('b', null, slots), h('small', null, `/4 move slots left`))),
        energyPips(e, false, spent));
      const canAddId = (id: string) => sel.length < 4 && fits(e, [...sel, id]);
      // your current picks always stay listed (first), whatever the filter, so they can be removed
      const shown = all.filter((id) => sel.includes(id) || (matches(MOVE_BY_ID[id], filter) && (!fitsOnly || canAddId(id))));
      const opts = shown.sort((x, y) => {
        const mx = MOVE_BY_ID[x], my = MOVE_BY_ID[y];
        return Number(sel.includes(y)) - Number(sel.includes(x)) || SORTS[sort][1](mx, my) || mx.name.localeCompare(my.name);
      });
      // filter chips: only the types this creature can actually use
      const usable = TYPES.filter((t) => all.some((id) => typesOf(MOVE_BY_ID[id]).includes(t)));
      const count = (f: Filter) => all.filter((id) => matches(MOVE_BY_ID[id], f)).length;
      const chip = (f: Filter, label: Node | string) => h('button', {
        class: `pb-filter ${filter === f ? 'on' : ''}`, 'aria-pressed': String(filter === f),
        style: f !== 'all' && f !== 'physical' && f !== 'support' ? `--tc:${TYPE_COLOR[f]}` : '',
        onclick: () => { filter = f; render(); },
      }, label, h('small', null, String(count(f))));
      const controls = h('div', { class: 'pb-controls' },
        h('div', { class: 'pb-filters', role: 'group', 'aria-label': 'Filter moves by type' },
          chip('all', 'All'),
          ...usable.map((t) => chip(t, h('span', { class: 'row gap-s' }, typeIconImg(t, 16), TYPE_LABEL[t]))),
          count('physical') ? chip('physical', '👊 Physical') : null,
          count('support') ? chip('support', '🛡️ Support') : null),
        h('div', { class: 'pb-sortrow' },
          h('label', { class: 'pb-sort' }, 'Sort ',
            h('select', { onchange: (ev: Event) => { sort = (ev.target as HTMLSelectElement).value as Sort; render(); } },
              (Object.keys(SORTS) as Sort[]).map((k) => h('option', { value: k, selected: sort === k }, SORTS[k][0])))),
          h('label', { class: 'pb-fits' }, h('input', { type: 'checkbox', checked: fitsOnly, onchange: (ev: Event) => { fitsOnly = (ev.target as HTMLInputElement).checked; render(); } }), ' Only moves that still fit'),
          h('small', { class: 'muted' }, `Showing ${opts.length} of ${all.length}`)));
      const list = h('div', { class: 'moves grid' }, opts.length ? opts.map((id) => {
        const on = sel.includes(id);
        const canAdd = !on && sel.length < 4 && fits(e, [...sel, id]);
        return moveCard(MOVE_BY_ID[id], { selected: on, disabled: !on && !canAdd, onClick: () => { sel = on ? sel.filter((x) => x !== id) : [...sel, id]; render(); } });
      }) : [h('p', { class: 'small muted' }, 'No moves match this filter.')]);
      body.replaceChildren(
        h('p', { class: 'small' }, 'Energy is a requirement, not a cost per use. A move fits if your creature generates enough of each type; Neutral slots take any energy and Prisma counts as any type.'),
        usage, controls, list,
        h('div', { class: 'row end gap sticky-foot' },
          h('button', { class: 'btn ghost', onclick: () => recommendSheet(c, (ids) => { c.playbook = ids; close(); changed(); }) }, '✨ Recommend moves?'),
          h('button', { class: 'btn ghost', onclick: () => { sel = []; render(); } }, 'Clear'),
          h('button', { class: 'btn primary', disabled: sel.length === 0, onclick: () => { c.playbook = sel; close(); changed(); } }, 'Save playbook')));
    };
    const close = openSheet(`${nameOf(c)} · Playbook`, body, { wide: true });
    render();
  }
}

/**
 * "Recommend moves?" from the playbook editor: pick a goal (physical, elemental, balanced, or
 * against a type), see the moves the game would slot for it, and confirm to use them. The goal
 * that suits the creature's current stats is starred and shown first.
 */
function recommendSheet(c: CreatureInst, confirm: (ids: string[]) => void) {
  const st = stats(c);
  const e = energy(c);
  const suggested = suggestGoal(c);
  const same = (a: PlaybookGoal, b: PlaybookGoal) => a.kind === b.kind && (a.kind !== 'vs' || (b.kind === 'vs' && a.type === b.type));
  let goal: PlaybookGoal = suggested.goal;
  const GOALS: { goal: PlaybookGoal; icon: string; label: string; text: string }[] = [
    { goal: { kind: 'physical' }, icon: '👊', label: 'Optimize physical power', text: `Physical attacks add Power (${st.power}) and can crit. They ignore the type chart.` },
    { goal: { kind: 'elemental' }, icon: '🔮', label: 'Optimize elemental power', text: `Elemental attacks add Focus (${st.focus}), use the type chart and can inflict statuses.` },
    { goal: { kind: 'balanced' }, icon: '⚖️', label: 'Optimize balanced spread', text: 'A mix of physical and elemental attacks across types, plus a support move.' },
  ];
  const body = h('div', { class: 'rec' });
  const render = () => {
    const ids = recommendPlaybook(c, goal);
    const vs = goal.kind === 'vs' ? goal.type : undefined;
    const spent = allocateEnergy(e, ids);
    const goalLabel = goal.kind === 'vs' ? `Optimize against ${TYPE_LABEL[goal.type]}` : GOALS.find((g) => same(g.goal, goal))!.label;
    const option = (g: (typeof GOALS)[number]) => {
      const star = same(g.goal, suggested.goal);
      return h('button', { class: `rec-opt ${same(g.goal, goal) ? 'on' : ''}`, 'aria-pressed': String(same(g.goal, goal)), onclick: () => { goal = g.goal; render(); } },
        h('span', { class: 'rec-ico' }, g.icon),
        h('span', { class: 'rec-txt' },
          h('b', null, g.label, star ? h('span', { class: 'rec-star', title: 'Recommended for this creature' }, ' ★ Recommended') : null),
          h('small', null, star ? suggested.reason : g.text)));
    };
    body.replaceChildren(
      h('p', { class: 'small' }, `Suggestions for ${nameOf(c)} as it is now: Power ${st.power}, Focus ${st.focus}, and ${energyTotal(e)} energy to spend.`),
      h('div', { class: 'rec-opts' }, GOALS.map(option)),
      h('div', { class: 'rec-vs' },
        h('b', { class: 'small' }, '🎯 Optimize against a type:'),
        h('div', { class: 'rec-vs-row' }, TYPES.map((t) => h('button', {
          class: `pb-filter ${goal.kind === 'vs' && goal.type === t ? 'on' : ''}`, style: `--tc:${TYPE_COLOR[t]}`, title: `Best moves against ${TYPE_LABEL[t]} creatures`,
          onclick: () => { goal = { kind: 'vs', type: t }; render(); },
        }, typeIconImg(t, 16), TYPE_LABEL[t])))),
      h('h4', { class: 'rec-head' }, goalLabel),
      ids.length
        ? h('div', { class: 'moves grid' }, ids.map((id) => {
          const m = MOVE_BY_ID[id];
          const dmg = expectedDamage(c, m, vs);
          return h('div', { class: 'rec-move' },
            moveCard(m, { vs: vs ? [vs] : undefined }),
            h('small', { class: 'rec-why' }, m.kind === 'support' ? 'Utility: no damage' : `≈ ${dmg.toFixed(1)} damage per use${vs ? ` vs ${TYPE_LABEL[vs]}` : ''}`));
        }))
        : h('p', { class: 'small muted' }, 'No moves fit this goal yet.'),
      h('div', { class: 'pb-usage' }, h('small', null, `Uses ${energyTotal(spent)}/${energyTotal(e)} energy`), energyPips(e, true, spent)),
      h('p', { class: 'small muted' }, 'Damage estimates use this creature’s stats against a foe with average Evasion (3) and no Armor or Ward.'),
      h('div', { class: 'row gap end sticky-foot' },
        h('button', { class: 'btn ghost', onclick: () => close() }, '← Back to editor'),
        h('button', { class: 'btn primary', disabled: !ids.length, onclick: () => { close(); confirm(ids); } }, 'Confirm playbook?')));
  };
  const close = openSheet(`${nameOf(c)} · Recommend moves`, body, { wide: true });
  render();
}

/** Reference sheet: every status, what inflicts it, and exactly what it does. */
export function statusGuide() {
  return h('div', { class: 'status-guide' },
    h('ul', { class: 'small status-rules' },
      h('li', null, h('b', null, 'How they land: '), 'when an elemental attack rolls a 1 on its damage die, the target gains that attack type’s status.'),
      h('li', null, h('b', null, 'One at a time: '), 'a creature that already has a status can’t gain another until it wears off.'),
      h('li', null, h('b', null, 'Duration: '), '3 rounds, counted only while the creature is in battle (not while swapped out). Ends early on a KO, and always ends with the battle.')),
    h('div', { class: 'status-list' }, TYPES.map((t) => {
      const st = STATUS_INFO[STATUS_FOR[t]];
      return h('div', { class: 'status-row', style: `--tc:${TYPE_COLOR[t]}` },
        h('span', { class: 'status-ico' }, st.icon),
        h('div', null,
          h('div', { class: 'row gap-s' }, h('b', null, st.name), h('span', { class: 'muted small' }, 'from'), typeChip(t, true)),
          h('p', { class: 'small' }, st.text)));
    })));
}

/** The 8×8 type chart. `attack` rows and `defend` columns are highlighted (e.g. your moves vs the opponent). */
/** Text colour that stays readable on a type's colour (dark on yellow/pink/teal, light on the rest). */
function inkOn(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? '#2b2a33' : '#ffffff';
}

/**
 * Stacked type chart: one row per type, its colour pill in the middle. Left: what it is strong
 * against (and, since matchups mirror, resists). Right: what it is weak to (and is resisted by).
 * In battle, `attack` (your move types) and `defend` (the foe's types) are highlighted.
 */
export function typeChart(hl: { attack?: ElementType[]; defend?: ElementType[] } = {}) {
  const atk = new Set(hl.attack ?? []), def = new Set(hl.defend ?? []);
  const weakTo = (t: ElementType) => TYPES.filter((x) => effectiveness(x, [t]) > 1);
  const strongVs = (t: ElementType) => TYPES.filter((x) => effectiveness(t, [x]) > 1);
  const icon = (t: ElementType, ring: boolean) =>
    h('span', { class: `tc-ico ${ring ? 'ring' : ''}`, title: TYPE_LABEL[t], style: `--tc:${TYPE_COLOR[t]}` }, typeIconImg(t, 26));
  return h('div', { class: 'type-stack' },
    h('div', { class: 'tc-legend' },
      h('span', { class: 'tc-side left' }, h('b', null, '⚔️ Strong against'), h('small', null, 'deals 2× · and resists them')),
      h('span'),
      h('span', { class: 'tc-side right' }, h('b', null, '🛡️ Weak to'), h('small', null, 'takes 2× · and is resisted by'))),
    TYPES.map((t) => {
      const row = atk.has(t) ? 'hl-atk' : def.has(t) ? 'hl-def' : '';
      return h('div', { class: `tc-row ${row}` },
        // left: when this type attacks, the foe types it hits hard are ringed in battle
        h('div', { class: 'tc-list left' }, strongVs(t).map((x) => icon(x, atk.has(t) && def.has(x)))),
        h('div', { class: 'tc-pill', style: `--tc:${TYPE_COLOR[t]};--pill-ink:${inkOn(TYPE_COLOR[t])}` },
          h('b', null, TYPE_LABEL[t].toUpperCase()), typeIconImg(t, 22),
          atk.has(t) ? h('small', { class: 'tc-tag' }, 'your move') : def.has(t) ? h('small', { class: 'tc-tag' }, 'foe') : null),
        h('div', { class: 'tc-list right' }, weakTo(t).map((x) => icon(x, def.has(t) && atk.has(x)))));
    }));
}

/** Type chart sheet. In battle, pass your moves' types and the opponent's types to highlight the matchup. */
export function typeChartSheet(hl: { attack?: ElementType[]; defend?: ElementType[]; foeName?: string } = {}) {
  const inBattle = !!hl.defend?.length;
  return openSheet('Type Chart', h('div', null,
    inBattle ? h('p', { class: 'small' }, 'Gold rows are your moves\u2019 types; blue rows are ', h('b', null, hl.foeName ?? 'the opponent'), '\u2019s types (', hl.defend!.map((t) => typeChip(t, true)), '). Ringed icons are the matchups in this fight.') : null,
    typeChart(hl),
    h('p', { class: 'small' }, 'Matchups mirror: a type resists (takes ½ from) everything it is strong against. Dual types multiply: 4× when both types are weak, immune when both resist. Only Elemental attacks use the chart; Physical attacks ignore it.')), { wide: true });
}
