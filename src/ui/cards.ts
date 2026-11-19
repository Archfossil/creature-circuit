import { h, openSheet } from './dom';
import type { CreatureInst } from '../engine/creature';
import { speciesOf, nameOf, stats, maxHealth, maxVitality, maxStamina, energy, energyTotal, fits, learnable, progressionTree, availableNodes, unlockNode, STAT_KEYS, STAT_LABEL } from '../engine/creature';
import { MOVE_BY_ID, STATUS_INFO } from '../data/moves';
import { ABILITIES, AFFINITIES, NATURE_BY_ID } from '../data/content';
import { TYPE_COLOR, TYPE_LABEL, typeIcon, TYPES, effectiveness } from '../data/types';
import type { ElementType, EnergyKey, Move } from '../data/schema';
import { portrait } from '../render/engine';

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

export function energyPips(e: Partial<Record<EnergyKey | 'neutral', number>>, small = false) {
  const out: HTMLElement[] = [];
  for (const [k, v] of Object.entries(e)) {
    for (let i = 0; i < (v ?? 0); i++) {
      if (k === 'neutral') out.push(h('span', { class: `pip neutral ${small ? 'sm' : ''}`, title: 'Neutral (any energy)' }));
      else if (k === 'prisma') out.push(h('span', { class: `pip prisma ${small ? 'sm' : ''}`, title: 'Prisma (counts as any type)' }));
      else out.push(h('span', { class: `pip ${small ? 'sm' : ''}`, style: `--tc:${TYPE_COLOR[k as ElementType]}`, title: TYPE_LABEL[k as ElementType] }));
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

export function moveCard(m: Move, opts: { onClick?: () => void; disabled?: boolean; selected?: boolean; compact?: boolean; hotkey?: string } = {}) {
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
  const used = c.playbook.reduce((s, id) => s + Object.values(MOVE_BY_ID[id].cost).reduce((a, v) => a + (v ?? 0), 0), 0);
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
      h('h4', null, 'Energy ', h('span', { class: 'muted' }, `${used}/${energyTotal(e)} slotted`)),
      energyPips(e)),
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
  return h('article', { class: 'index-card back', style: `--tc:${TYPE_COLOR[sp.types[0]]}` },
    h('header', { class: 'ic-head' },
      h('div', null, h('h3', null, `${nameOf(c)} · Chart`), h('div', { class: 'ic-sub' }, h('span', null, `${c.points} node${c.points === 1 ? '' : 's'} to unlock · every 10 XP earns one`))),
      h('div', { class: 'lv-badge' }, h('small', null, 'LV'), c.level)),
    h('div', { class: 'chart' }, Array.from({ length: rows }, (_, r) =>
      h('div', { class: 'chart-row' }, [0, 1, 2].map((col) => {
        const n = tree.find((x) => x.row === r && x.col === col);
        if (!n) return h('div', { class: 'node empty' });
        const have = c.unlocked.includes(n.id);
        const can = av.has(n.id) && c.points > 0;
        return h('button', {
          class: `node ${n.kind} ${have ? 'have' : can ? 'can' : av.has(n.id) ? 'avail' : 'locked'}`, disabled: !can,
          onclick: () => { if (unlockNode(c, n.id)) changed(); },
        }, h('span', { class: 'node-ico' }, n.icon), h('b', null, n.label), h('small', null, n.text));
      })))),
    h('p', { class: 'small muted center' }, 'Each node requires a node in the row above. The final row holds an Evolution — or, at the final stage, a Capstone that grows with Loyalty.'),
    h('footer', { class: 'ic-foot' }, h('button', { class: 'btn ghost', onclick: flip }, '↺ Flip to front')));
}

export function editPlaybook(c: CreatureInst, changed: () => void) {
  {
    const e = energy(c);
    let sel = [...c.playbook];
    const body = h('div', { class: 'pb-edit' });
    const render = () => {
      const opts = learnable(c);
      const usage = h('div', { class: 'pb-usage' }, h('span', null, 'Energy: '), energyPips(e), h('span', { class: 'muted' }, ` · ${sel.length}/4 moves`));
      const list = h('div', { class: 'moves grid' }, opts.map((id) => {
        const on = sel.includes(id);
        const canAdd = !on && sel.length < 4 && fits(e, [...sel, id]);
        return moveCard(MOVE_BY_ID[id], { selected: on, disabled: !on && !canAdd, onClick: () => { sel = on ? sel.filter((x) => x !== id) : [...sel, id]; render(); } });
      }));
      body.replaceChildren(
        h('p', { class: 'small' }, 'Energy is a requirement, not a cost per use. A move fits if your creature generates enough of each type; Neutral slots take any energy and Prisma counts as any type.'),
        usage, list,
        h('div', { class: 'row end gap sticky-foot' },
          h('button', { class: 'btn ghost', onclick: () => { sel = []; render(); } }, 'Clear'),
          h('button', { class: 'btn primary', disabled: sel.length === 0, onclick: () => { c.playbook = sel; close(); changed(); } }, 'Save playbook')));
    };
    const close = openSheet(`${nameOf(c)} · Playbook`, body, { wide: true });
    render();
  }
}

export function typeChart() {
  return h('div', { class: 'type-chart' },
    h('table', null,
      h('thead', null, h('tr', null, h('th', null, 'ATK ↓ / DEF →'), TYPES.map((t) => h('th', null, typeIconImg(t, 22))))),
      h('tbody', null, TYPES.map((a) => h('tr', null, h('th', null, typeIconImg(a, 22)), TYPES.map((d) => {
        const m = effectiveness(a, [d]);
        return h('td', { class: m > 1 ? 'x2' : m < 1 ? 'x05' : '' }, m > 1 ? '2×' : m < 1 ? '½' : '');
      }))))));
}
