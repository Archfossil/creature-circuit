import { h, openSheet } from './dom';
import type { CreatureEdit } from '../engine/edits';
import type { CreatureInst } from '../engine/creature';
import { MORALE_HIGH, MORALE_LOW, LOYALTY_MAX, LEGENDARY_LOYALTY_DRAIN, speciesOf, nameOf, stats, maxHealth, maxVitality, maxStamina, energy, energyTotal, allocateEnergy, fits, learnable, progressionTree, availableNodes, unlockNode, chartComplete, trainStat, TRAINABLE, STAT_KEYS, STAT_LABEL, recommendPlaybook, suggestGoal, expectedDamage, type PlaybookGoal } from '../engine/creature';
import { MOVE_BY_ID, STATUS_INFO, STATUS_FOR, ZERO_IN, zeroInOf, avgRoll, diceText, statusChance, critFaces, critFrom } from '../data/moves';
import { ABILITIES, NATURE_BY_ID } from '../data/content';
import { SWAP_MOVES, describeSwap, swapText } from '../data/swapMoves';
import { defaultSwapMove, setSwapMove, swapLock, swapMoveOf, swapVals } from '../engine/swaps';
import { TYPE_COLOR, TYPE_LABEL, typeIcon, TYPES, effectiveness } from '../data/types';
import type { ElementType, EnergyKey, Move } from '../data/schema';
import { portrait } from '../render/engine';
import { typeMatchup } from '../engine/battle';
import { teamworkOf, teamworkCap, teamworkBonus, TEAMWORK_PER_BONUS, TEAMWORK_PER_SWAP, TEAMWORK_PER_TURN } from '../engine/teamwork';

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

/** A move's damage dice as text, e.g. "d6+1" (or "—" for none). */
const dmgText = (m: Move) => diceText(m) || '—';

/** `dim` looks like `disabled` but can still be tapped (the phone playbook editor explains why it doesn't fit). */
export function moveCard(m: Move, opts: { onClick?: () => void; disabled?: boolean; dim?: boolean; open?: boolean; selected?: boolean; compact?: boolean; hotkey?: string; vs?: ElementType[] } = {}) {
  const match = opts.vs ? moveMatchup(m, opts.vs) : null;
  const col = m.type ? TYPE_COLOR[m.type] : '#8a8796';
  const acc = m.accuracy === 'sure' ? 'Sure-hit' : `d${m.accuracy}`;
  const dmg = dmgText(m);
  return h('button', {
    class: `move-card ${m.kind} ${opts.selected ? 'sel' : ''} ${opts.compact ? 'compact' : ''} ${opts.dim ? 'dim' : ''} ${opts.open ? 'open' : ''}`, style: `--tc:${col}`,
    'aria-expanded': opts.open === undefined ? null : String(opts.open),
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
      critFaces(m) > 1 && typeof m.accuracy === 'number' ? h('span', { class: 'mc-crit', title: `Wide crits: an accuracy roll of ${critFrom(m, m.accuracy)}–${m.accuracy} is a critical hit (double damage). Most physical moves crit only on a ${m.accuracy}.` }, '✸', `${critFrom(m, m.accuracy)}+`) : null,
      h('span', { title: 'Effort (stamina)' }, '💨 ', m.effort),
      m.speed ? h('span', { title: 'Speed modifier' }, '⚡', m.speed > 0 ? `+${m.speed}` : m.speed) : null,
      // Zeroing In, only when it isn't the usual +1 on a miss
      m.accuracy !== 'sure' && zeroInOf(m) !== ZERO_IN
        ? h('span', { class: `mc-zero ${zeroInOf(m) ? 'pursuit' : 'none'}`, title: zeroInOf(m) ? `Pursuit: a miss zeroes in +${zeroInOf(m)} for the next accuracy roll (usually +${ZERO_IN}).` : 'All or nothing: a miss never zeroes in.' }, h('i', { class: 'zi' }, '⌖'), zeroInOf(m) ? `+${zeroInOf(m)}` : '✕')
        : null),
    match ? h('div', { class: `mc-eff ${match.cls}`, title: `Type matchup against the opponent: ×${match.mult}` }, match.label)
      : opts.vs && m.kind === 'physical' ? h('div', { class: 'mc-eff phys', title: 'Physical attacks ignore the type chart' }, 'Ignores types') : null,
    opts.compact ? null : h('div', { class: 'mc-text' }, m.text, m.status ? h('em', null, ` ${m.extraDice?.length ? 'A 1 on any die' : 'Min roll'}: ${STATUS_INFO[m.status].name} (${Math.round(statusChance(m) * 100)}%).`) : null),
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

/** What Fatigue does, for the diamond badge's hover text and tap sheet. */
export function fatigueHelp(n: number): string {
  const odds = n > 0 ? `Fatigue ${n}: before acting, it rolls a d10. On ${n === 1 ? 'a 1' : `1–${Math.min(n, 10)}`} it loses the turn catching its breath (${Math.min(100, n * 10)}% chance), then its Stamina refills.` : 'No Fatigue: it acts without a Fatigue check.';
  return `${odds}
Running out of Stamina adds +1 Fatigue (and Stamina refills).
Fatigue lasts after the battle. Camping, resting at a stable, Calm Tea, Root Salve or an Elixir clears it.`;
}

/** Fatigue as a red number in a warning diamond (greyed at 0). Hover explains it; tap opens the same text. */
export function fatigueBadge(n: number) {
  return h('button', {
    class: `fat-badge ${n > 0 ? 'on' : ''}`, title: fatigueHelp(n), 'aria-label': `Fatigue ${n}`,
    onclick: (e: Event) => { e.stopPropagation(); openSheet(`😮‍💨 Fatigue ${n}`, h('div', { class: 'fat-help' }, fatigueHelp(n).split('\n').map((t) => h('p', null, t)))); },
  }, h('span', null, n));
}

/** Stamina meter with the Fatigue diamond beside it. */
function staminaMeter(c: CreatureInst) {
  const m = meter('STA', c.stamina, maxStamina(c), 'sta');
  m.append(fatigueBadge(c.fatigue));
  return m;
}

const MORALE_HELP = `Morale (0–10): how happy this creature is with you.
Gain: winning battles it fights in (+1), Following you (+1 every other turn), treats and berries, stables, some events.
Lose: being knocked out (−1), a team wipe (−1 each), waiting in a totem (−1 every 10 turns).
High (${MORALE_HIGH}+): +1 Loyalty at the end of every turn, and +1 XP per battle.
Low (${MORALE_LOW} or less): you get a warning. After that, every turn that ends without its Morale rising rolls a d10. Above its Loyalty, it leaves your team; otherwise it loses 1 Loyalty. Your starter (🤝 special bond) never leaves.`;
const LOYALTY_HELP = `Loyalty (0–${LOYALTY_MAX}): trust built over time.
Gain: +1 at the end of each turn while Morale is ${MORALE_HIGH}+; treats add Loyalty too.
Use: reaching each Nature perk's threshold unlocks it for good. Perks never re-lock. At the Capstone, attacks deal +1 damage per 5 Loyalty.
Lose: −1 each time it survives a low-Morale check. At 0 Loyalty, a low-Morale check always means it leaves.`;

/** A sheet explaining Morale and Loyalty, with this creature's current standing. */
export function socialHelp(c: CreatureInst) {
  const nat = NATURE_BY_ID[c.nature];
  const status = c.bond && c.morale <= MORALE_LOW
    ? `${nameOf(c)} is unhappy, but you share a special bond: it will never leave you. Cheer it up to earn Loyalty again.`
    : c.morale <= MORALE_LOW
    ? (c.moraleWarned ? `⚠️ ${nameOf(c)} is unhappy and has been warned. If a turn ends without its Morale rising, it rolls a d10: above ${c.loyalty} it leaves, otherwise it loses 1 Loyalty.` : `⚠️ ${nameOf(c)} is unhappy. At the end of this turn you'll get a warning.`)
    : c.morale >= MORALE_HIGH ? `💖 ${nameOf(c)} is happy: +1 Loyalty at the end of each turn.` : `${nameOf(c)} is content. Raise its Morale to ${MORALE_HIGH} to start earning Loyalty.`;
  const next = nat?.perks[c.perks];
  const legendary = speciesOf(c).rarity === 'legendary';
  openSheet('Morale & Loyalty', h('div', { class: 'social-help' },
    c.bond ? h('p', { class: 'social-status good' }, `🤝 Special bond: ${nameOf(c)} was your first partner. It never leaves over low Morale, and it can’t be released or traded away.`) : null,
    legendary ? h('p', { class: 'social-status bad' }, `✨ Legendaries never fully settle. ${nameOf(c)} loses ${LEGENDARY_LOYALTY_DRAIN} Loyalty every turn, whatever its Morale, and gains none from Morale (treats still add some). At 0 Loyalty it returns to its grounds on the map: about ${c.loyalty} turn${c.loyalty === 1 ? '' : 's'} from now. Releasing it at Quillhaven’s Research Facility pays × 5 its level.`) : null,
    h('p', { class: `social-status ${c.morale <= MORALE_LOW ? 'bad' : c.morale >= MORALE_HIGH ? 'good' : ''}` }, status),
    h('h4', null, `💖 Morale · ${c.morale}/10`), ...MORALE_HELP.split('\n').slice(1).map((l) => h('p', { class: 'small' }, l)),
    h('h4', null, `🤝 Loyalty · ${c.loyalty}/${LOYALTY_MAX}`), ...LOYALTY_HELP.split('\n').slice(1).map((l) => h('p', { class: 'small' }, l)),
    nat ? h('p', { class: 'small' }, h('b', null, `${nat.name} perks: `), nat.perks.map((p, i) => `${i < c.perks ? '✓' : '○'} ${p.name} (${p.cost})`).join(' · '), next ? ` · next at ${next.cost} Loyalty` : ' · all unlocked') : null));
}

/** Teamwork with one decimal (its fraction is progress towards the next whole point). */
export const fmtTeamwork = (v: number) => (Math.round(v * 10) / 10).toString();

export const TEAMWORK_HELP = `Teamwork is how well two of your creatures work together. When one swaps in for the other in battle, its Swap Move gets +1 for every ${TEAMWORK_PER_BONUS} Teamwork it has with that partner, and stronger Swap Moves unlock at Teamwork 1 and 2.
It grows by ${TEAMWORK_PER_TURN} each turn both travel on your active team, and by ${TEAMWORK_PER_SWAP} the first time one swaps in for the other in a battle (once per battle).
A creature's Teamwork with any partner is capped at half its level.`;

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Swap Move text with the Alpha (the incoming creature: the word "Alpha" and its name) highlighted,
 * and the partner's name marked more quietly, so it's clear who does what. Names are only marked
 * when the two differ (two creatures can share a name).
 */
export function alphaText(text: string, alpha: string, partner: string): (string | HTMLElement)[] {
  const names = alpha !== partner ? [alpha, partner] : [];
  const terms = ['Alpha', ...names].sort((a, b) => b.length - a.length).map(escapeRe);
  const re = new RegExp(`(?<!\\p{L})(${terms.join('|')})(?!\\p{L})`, 'gu');
  const out: (string | HTMLElement)[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > at) out.push(text.slice(at, m.index));
    const who = names.length && m[0] === partner ? 'partner' : 'alpha';
    out.push(h('span', { class: `swap-${who}`, title: who === 'alpha' ? 'The Alpha: the creature swapping in' : 'The partner: the creature swapping out' }, m[0]));
    at = m.index! + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/**
 * The pair in a swap, side by side: the Alpha (swapping in, highlighted) and the partner it replaces
 * (swapping out), with every stat each brings, so the Swap Move numbers can be read against them.
 */
export function swapPair(alpha: CreatureInst, partner: CreatureInst) {
  const sa = stats(alpha), sp = stats(partner);
  const who = (c: CreatureInst, role: 'alpha' | 'partner') => {
    const s = speciesOf(c);
    return h('div', { class: `swap-who ${role}`, style: `--tc:${TYPE_COLOR[s.types[0]]}` },
      h('small', null, role === 'alpha' ? '⭐ Alpha · swapping in' : 'Partner · swapping out'),
      h('img', { src: portrait(s.id), alt: '' }),
      h('b', null, nameOf(c)),
      h('span', { class: 'row gap-s center' }, s.types.map((t) => typeIconImg(t, 14)), h('small', null, `Lv ${c.level}`)));
  };
  const of = (v: number, max: number) => `${Math.max(0, v)}/${max}`;
  const rows: [string, string | number, string | number][] = [
    ['Health', of(alpha.health, maxHealth(alpha)), of(partner.health, maxHealth(partner))],
    ['Vitality', of(alpha.vitality, maxVitality(alpha)), of(partner.vitality, maxVitality(partner))],
    ['Stamina', of(alpha.stamina, maxStamina(alpha)), of(partner.stamina, maxStamina(partner))],
    ...STAT_KEYS.filter((k) => k !== 'vigor' && k !== 'stamina').map((k): [string, number, number] => [STAT_LABEL[k], sa[k], sp[k]]),
  ];
  return h('div', { class: 'swap-pair' },
    h('div', { class: 'swap-pair-heads' }, who(alpha, 'alpha'), h('span', { class: 'swap-pair-arrow', 'aria-hidden': 'true' }, '⇄'), who(partner, 'partner')),
    h('table', { class: 'swap-pair-table' },
      h('thead', null, h('tr', null, h('th', { class: 'alpha' }, nameOf(alpha)), h('th', null, ''), h('th', null, nameOf(partner)))),
      h('tbody', null, rows.map(([label, a, b]) => h('tr', null,
        h('td', { class: 'alpha' }, h('b', null, a)), h('th', null, label), h('td', null, b))))));
}

/**
 * Swap Moves: one row per teammate, with the move this creature uses when it swaps in for that
 * teammate, their Teamwork and its bonus. `edit` opens the picker (when the card is editable).
 */
function swapSection(c: CreatureInst, mates: CreatureInst[], edit?: (partner: CreatureInst) => void) {
  const fav = defaultSwapMove(c);
  const others = mates.filter((m) => m.uid !== c.uid);
  const cap = teamworkCap(c);
  return h('section', { class: 'ic-sec swap-sec' },
    h('h4', { title: TEAMWORK_HELP }, '🔁 Swap Moves ', h('span', { class: 'muted' }, `🤝 Teamwork max ${fmtTeamwork(cap)} (half its level)`)),
    h('p', { class: 'small muted' }, `When ${nameOf(c)} swaps in (as the Alpha) for a teammate, it uses the Swap Move set for that teammate. Favourite: `, h('b', null, fav.name), ' (', ...alphaText(swapText(fav, { A: nameOf(c), aType: speciesOf(c).types[0] }), nameOf(c), 'the partner'), ')'),
    others.length ? h('div', { class: 'swap-list' }, others.map((m) => {
      const mv = swapMoveOf(c, m);
      const t = teamworkOf(c, m), bonus = teamworkBonus(c, m);
      return h('div', { class: 'swap-slot' },
        h('div', { class: 'swap-slot-head' },
          h('span', null, '↪ for ', h('b', null, nameOf(m))),
          h('span', { class: `chip ${bonus ? 'good' : ''}`, title: `${nameOf(c)}’s Teamwork with ${nameOf(m)}: ${bonus ? `+${bonus} to its Swap Move` : `no bonus yet (+1 at ${TEAMWORK_PER_BONUS})`}${t >= cap ? '. At its cap: level up to grow it.' : ''}` },
            '🤝 ', fmtTeamwork(t), bonus ? ` · +${bonus}` : ''),
          edit ? h('button', { class: 'link', onclick: () => edit(m) }, 'Change') : null),
        h('div', null, mv.type ? typeIconImg(mv.type, 14) : null, ' ', h('b', null, mv.name), mv.id === fav.id ? h('span', { class: 'muted' }, ' · favourite') : null),
        h('small', null, alphaText(swapText(mv, swapVals(c, m)), nameOf(c), nameOf(m))),
        h('small', { class: 'muted' }, alphaText(describeSwap(mv, swapVals(c, m)), nameOf(c), nameOf(m))));
    })) : h('p', { class: 'small muted' }, 'Recruit another creature to set Swap Moves.'),
    h('p', { class: 'small muted' }, `🤝 Teamwork grows +${TEAMWORK_PER_TURN} a turn while both are on your active team, and +${TEAMWORK_PER_SWAP} the first time one swaps in for the other in a battle. Every ${TEAMWORK_PER_BONUS} Teamwork adds +1 to the Swap Move.`));
}

/** Pick the Swap Move `c` uses when it swaps in for `partner`: every move, with why the locked ones are locked. */
export function editSwapMove(c: CreatureInst, partner: CreatureInst, changed: () => void, onEdit?: (e: CreatureEdit) => void) {
  const cur = swapMoveOf(c, partner);
  const v = swapVals(c, partner);
  const rows = SWAP_MOVES.map((m) => ({ m, lock: swapLock(c, partner, m) }))
    .sort((a, b) => Number(!!a.lock) - Number(!!b.lock));
  const A = nameOf(c), P = nameOf(partner);
  const close = openSheet(`${A} swapping in for ${P}`, h('div', null,
    swapPair(c, partner),
    h('p', { class: 'small muted' }, `Typed Swap Moves need a creature of that type in the pair (${[...new Set([...speciesOf(c).types, ...speciesOf(partner).types])].map((t) => TYPE_LABEL[t]).join(', ')} here). Stronger ones need Teamwork: ${nameOf(c)} has ${fmtTeamwork(teamworkOf(c, partner))} with ${nameOf(partner)}. Typed hits inflict their type’s status on a 1–2.`),
    h('div', { class: 'list swap-pick' }, rows.map(({ m, lock }) =>
      h('button', {
        class: `swap-opt ${m.id === cur.id ? 'on' : ''} ${lock ? 'locked' : ''}`, disabled: !!lock,
        onclick: () => {
          if (!setSwapMove(c, partner, m.id)) return;
          onEdit?.({ uid: c.uid, op: 'swapMove', partner: partner.uid, move: m.id });
          close(); changed();
        },
      },
        h('div', { class: 'swap-opt-head' }, m.type ? typeIconImg(m.type, 16) : null, h('b', null, m.name),
          h('span', { class: 'muted' }, m.type ? ` · ${TYPE_LABEL[m.type]}` : ' · Neutral', m.teamwork ? ` · Teamwork ${m.teamwork}` : ''),
          m.id === cur.id ? h('span', { class: 'chip good' }, 'Set') : null),
        h('small', null, alphaText(swapText(m, v), A, P)),
        h('small', { class: 'muted' }, lock ?? alphaText(describeSwap(m, v), A, P)))))), { wide: true });
}

/**
 * A creature's index card (front: stats, playbook, nature; back: progression chart). `editable` allows
 * playbook edits and chart unlocks; `onEdit` hears about each change (online: sent to the server).
 */
export function creatureCard(c: CreatureInst, opts: { onChange?: () => void; editable?: boolean; extra?: Node; onEdit?: (e: CreatureEdit) => void; /** The trainer's other creatures, to show Teamwork with each. */ teammates?: CreatureInst[] } = {}) {
  const wrap = h('div', { class: 'card-flip' });
  let back = false;
  const render = () => {
    wrap.replaceChildren(back ? cardBack(c, () => { back = false; render(); }, () => { render(); opts.onChange?.(); }, opts.editable !== false, opts.onEdit) : cardFront(c, () => { back = true; render(); }, opts, () => { render(); opts.onChange?.(); }));
  };
  render();
  return wrap;
}

function cardFront(c: CreatureInst, flip: () => void, opts: { editable?: boolean; extra?: Node; onEdit?: (e: CreatureEdit) => void; teammates?: CreatureInst[] }, changed: () => void) {
  const sp = speciesOf(c);
  const st = stats(c);
  const e = energy(c);
  const nat = NATURE_BY_ID[c.nature];
  const ab = ABILITIES[sp.ability];
  const fav = defaultSwapMove(c);
  const spent = allocateEnergy(e, c.playbook);
  const free = energyTotal(e) - energyTotal(spent);
  return h('article', { class: 'index-card', style: `--tc:${TYPE_COLOR[sp.types[0]]};--tc2:${TYPE_COLOR[sp.types[1] ?? sp.types[0]]}` },
    h('header', { class: 'ic-head' },
      h('div', null,
        h('h3', null, nameOf(c)),
        h('div', { class: 'ic-sub' }, sp.types.map((t) => typeChip(t, true)), rarityBadge(sp.rarity), h('span', { class: 'stage' }, `Stage ${sp.stage}`), c.bond ? h('span', { class: 'stage', title: 'Special bond: your starter never leaves, and can’t be released or traded.' }, '🤝 Bond') : null)),
      h('div', { class: 'lv-badge' }, h('small', null, 'LV'), c.level)),
    h('div', { class: 'ic-art' },
      h('img', { src: portrait(sp.id), alt: sp.name }),
      h('div', { class: 'ic-art-tags' }, h('span', null, `RT ${sp.rt}`), h('span', null, nat.name))),
    h('div', { class: 'ic-bars' },
      hpBlock(c),
      staminaMeter(c),
      meter('XP', c.xp, 10, 'xp'),
      h('div', { class: 'row gap-s small' },
        h('button', { class: `chip social ${c.morale <= MORALE_LOW ? 'bad' : c.morale >= MORALE_HIGH ? 'good' : ''}`, title: MORALE_HELP, onclick: () => socialHelp(c) },
          c.morale <= MORALE_LOW ? '⚠️ ' : '💖 ', 'Morale ', h('b', null, c.morale), '/10'),
        h('button', { class: `chip social ${sp.rarity === 'legendary' && c.loyalty <= 3 ? 'bad' : ''}`, title: sp.rarity === 'legendary' ? `${LOYALTY_HELP}
Legendary: loses ${LEGENDARY_LOYALTY_DRAIN} Loyalty every turn and returns to its grounds at 0.` : LOYALTY_HELP, onclick: () => socialHelp(c) },
          sp.rarity === 'legendary' ? '⏳ ' : '🤝 ', 'Loyalty ', h('b', null, c.loyalty), `/${LOYALTY_MAX}`),)),
    h('div', { class: 'ic-stats' }, STAT_KEYS.map((k) => h('div', { class: 'stat' }, h('small', null, STAT_LABEL[k]), h('b', null, st[k])))),
    h('section', { class: 'ic-sec' },
      h('h4', null, 'Energy ', h('span', { class: 'muted' }, `${free}/${energyTotal(e)} free · ${4 - c.playbook.length}/4 slots open`)),
      energyPips(e, false, spent)),
    h('section', { class: 'ic-sec' },
      h('h4', null, 'Playbook', opts.editable ? h('button', { class: 'link', onclick: () => editPlaybook(c, changed, opts.onEdit) }, 'Edit moves') : null),
      h('div', { class: 'moves' }, c.playbook.map((id) => moveCard(MOVE_BY_ID[id])))),
    h('section', { class: 'ic-sec two' },
      h('div', { class: 'mini-panel' }, h('h5', null, '🌿 Ability · ', ab.name), h('p', null, ab.text), h('small', { class: 'muted' }, 'Active while Following.')),
      h('div', { class: 'mini-panel' }, h('h5', null, '🔁 Favourite Swap Move · ', fav.name), h('p', null, alphaText(swapText(fav, { A: nameOf(c), aType: sp.types[0] }), nameOf(c), 'the partner')), h('small', { class: 'muted' }, 'Used when it swaps in, until you set another for that partner below.'))),
    swapSection(c, opts.teammates ?? [], opts.editable ? (m) => editSwapMove(c, m, changed, opts.onEdit) : undefined),
    h('section', { class: 'ic-sec' },
      h('h4', null, `Nature · ${nat.name}`, h('span', { class: 'muted' }, ` +${nat.up} / −${nat.down}`)),
      h('p', { class: 'small' }, nat.text),
      h('div', { class: 'perks' }, nat.perks.map((p, i) => {
        const have = i < c.perks;
        return h('div', { class: `perk ${have ? 'have' : ''}`, title: have ? 'Unlocked for good.' : `Unlocks automatically at ${p.cost} Loyalty.` },
          h('b', null, p.name), h('small', null, have ? '✓ ' + p.text : `At ${p.cost} Loyalty · ${p.text}`));
      })),
      h('p', { class: 'small muted' }, 'Perks unlock as Loyalty reaches each threshold and are never lost. ', h('button', { class: 'link', onclick: () => socialHelp(c) }, 'How Morale & Loyalty work'))),
    h('p', { class: 'dex' }, sp.dex),
    opts.extra ?? null,
    h('footer', { class: 'ic-foot' },
      h('button', { class: `btn ${c.points > 0 ? 'primary pulse' : 'ghost'}`, onclick: flip }, c.points > 0 ? `▲ Level-up chart (${c.points})` : 'Progression chart ↺')));
}

function cardBack(c: CreatureInst, flip: () => void, changed: () => void, editable = true, onEdit?: (e: CreatureEdit) => void) {
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
      const can = editable && av.has(n.id) && c.points > 0;
      const missing = n.requires.filter((id) => !c.unlocked.includes(id));
      return h('button', {
        class: `node ${n.kind} ${have ? 'have' : can ? 'can' : av.has(n.id) ? 'avail' : 'locked'}`, disabled: !can, 'data-node': n.id,
        title: n.requires.length ? `Needs: ${n.requires.map(label).join(' + ')}` : 'Starting node',
        onclick: () => { if (unlockNode(c, n.id)) { onEdit?.({ uid: c.uid, op: 'unlock', node: n.id }); changed(); } },
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
      h('div', null, h('h3', null, `${nameOf(c)} · Chart`), h('div', { class: 'ic-sub' }, h('span', null, chartComplete(c)
        ? `Chart complete · ${c.points} point${c.points === 1 ? '' : 's'} to train · every 10 XP earns one`
        : `${c.points} node${c.points === 1 ? '' : 's'} to unlock · every 10 XP earns one`))),
      h('div', { class: 'lv-badge' }, h('small', null, 'LV'), c.level)),
    chart,
    // a finished chart: further level-ups each train +1 to a stat of your choice
    chartComplete(c) ? h('div', { class: 'mastery' },
      h('p', { class: 'small' }, h('b', null, '❖ Chart complete. '), c.points > 0
        ? `Each further level-up trains +1 to a stat of your choice (${c.points} to spend).`
        : 'Each further level-up trains +1 to a stat of your choice.'),
      h('div', { class: 'row gap-s wrap center' }, TRAINABLE.map((k) => h('button', {
        class: `btn ${c.points > 0 && editable ? 'primary' : 'ghost'} sm`, disabled: c.points <= 0 || !editable,
        title: `${STAT_LABEL[k]} ${stats(c)[k]} → ${stats(c)[k] + 1}`,
        onclick: () => { if (trainStat(c, k)) { onEdit?.({ uid: c.uid, op: 'train', stat: k }); changed(); } },
      }, `+1 ${STAT_LABEL[k]}`)))) : null,
    // what the Signature Move node would teach, so it can be judged before spending a point on it
    sp.signature && c.signature !== sp.signature ? h('div', { class: 'sig-preview' },
      h('small', null, '★ Signature Move preview (unlocked by its node on this chart)'),
      moveCard(MOVE_BY_ID[sp.signature])) : null,
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

/** What each stat does for the moves you pick (hints in the playbook editor's sidebar). */
const STAT_HINT: Record<string, string> = {
  vigor: 'Sets Health and Vitality.',
  power: 'Added to Physical move damage (minus the target’s Armor).',
  armor: 'Blocks Physical damage.',
  focus: 'Added to Elemental move damage (minus the target’s Ward).',
  ward: 'Blocks Elemental damage.',
  speed: 'Who acts first. Moves add their own ⚡ modifier.',
  evasion: 'Makes the opponent’s moves miss more often.',
  stamina: 'Pays each move’s 💨 Effort. Running out adds Fatigue.',
};

/**
 * The playbook editor's sidebar: who you're building for (portrait, level, stats with what each does),
 * the energy and slots left, and the picks so far with their expected damage. The stats the picks lean
 * on (Power for Physical moves, Focus for Elemental ones, Speed and Stamina) are highlighted.
 */
function playbookSidebar(c: CreatureInst, sel: string[], usage: Node, remove: (id: string) => void) {
  const sp = speciesOf(c);
  const st = stats(c);
  const picks = sel.map((id) => MOVE_BY_ID[id]);
  const uses = new Set<string>();
  for (const m of picks) {
    if (m.kind === 'physical') uses.add('power');
    if (m.kind === 'elemental') uses.add('focus');
    if (m.speed) uses.add('speed');
    if (m.effort) uses.add('stamina');
  }
  const effort = picks.reduce((a, m) => a + m.effort, 0);
  const hint = h('p', { class: 'pb-hint small muted', 'aria-live': 'polite' }, 'Power boosts Physical moves, Focus boosts Elemental ones. Hover or tap a stat for more.');
  return h('aside', { class: 'pb-side', style: `--tc:${TYPE_COLOR[sp.types[0]]}`, 'aria-label': `${nameOf(c)}’s stats` },
    h('div', { class: 'pb-who' },
      h('img', { src: portrait(sp.id), alt: '' }),
      h('div', null,
        h('b', null, nameOf(c)),
        h('div', { class: 'row gap-s small' }, sp.types.map((t) => typeIconImg(t, 16)), h('span', null, `Lv ${c.level}`), h('span', { class: 'muted' }, NATURE_BY_ID[c.nature]?.name ?? '')),
        h('small', { class: 'muted' }, `❤️ ${maxHealth(c)} HP · 💨 ${maxStamina(c)} Stamina`))),
    // tapping a stat explains it (phones have no hover for the title)
    h('div', { class: 'pb-stats' }, STAT_KEYS.map((k) => h('button', {
      class: `stat ${uses.has(k) ? 'used' : ''}`, type: 'button', title: `${STAT_LABEL[k]}: ${STAT_HINT[k]}`,
      onclick: () => { hint.replaceChildren(h('b', null, `${STAT_LABEL[k]} ${st[k]}: `), STAT_HINT[k]); hint.classList.add('show'); },
    }, h('small', null, STAT_LABEL[k]), h('b', null, st[k])))),
    hint,
    usage,
    h('div', { class: 'pb-picks' },
      h('h5', null, 'Your playbook', effort ? h('small', { class: 'muted' }, ` · ${effort} 💨 Effort in all`) : null),
      Array.from({ length: 4 }, (_, i) => {
        const m = picks[i];
        if (!m) return h('div', { class: 'pb-pick empty' }, h('small', null, `Slot ${i + 1} · pick a move`));
        const dmg = expectedDamage(c, m);
        return h('div', { class: `pb-pick ${m.kind}`, style: `--tc:${m.type ? TYPE_COLOR[m.type] : '#8a8796'}` },
          m.type ? typeIconImg(m.type, 16) : h('span', { class: 'phys-ico' }, m.kind === 'support' ? '✦' : '✊'),
          h('b', null, m.name),
          h('small', { class: 'muted', title: m.kind === 'support' ? 'Support move' : `About ${dmg.toFixed(1)} damage a use against a typical target, with this creature’s ${m.kind === 'physical' ? 'Power' : 'Focus'}` },
            m.kind === 'support' ? 'Support' : `≈${Math.round(dmg)} dmg`),
          h('button', { class: 'icon-btn tiny', type: 'button', 'aria-label': `Remove ${m.name}`, onclick: () => remove(m.id) }, '✕'));
      })));
}

/**
 * Phone playbook editor: what a tapped move does with this creature (damage with its Power or Focus,
 * accuracy, Effort against its Stamina, speed, status, energy), and a button to add or remove it.
 * `why` says why it can't be added (no slot or not enough energy), or is null.
 */
function moveDetail(c: CreatureInst, m: Move, on: boolean, why: string | null, toggle: () => void) {
  const st = stats(c);
  const stat = m.kind === 'physical' ? 'Power' : 'Focus';
  const statVal = m.kind === 'physical' ? st.power : st.focus;
  const lines: (Node | string)[][] = [];
  if (m.kind === 'support') lines.push(['✦ ', 'Support move: no damage.']);
  else lines.push(['⚔ ', h('b', null, `About ${Math.round(expectedDamage(c, m))} damage`), ` a use: ${dmgText(m)} + ${stat} ${statVal}, minus the target’s ${m.kind === 'physical' ? 'Armor' : 'Ward'}. `,
    m.kind === 'physical' ? 'Ignores the type chart.' : 'The type chart applies.']);
  lines.push(['🎯 ', m.accuracy === 'sure' ? 'Always hits.' : `Rolls a d${m.accuracy} against the target’s Evasion.${critFaces(m) ? ` Crits (double damage) on ${critFaces(m) > 1 ? `${critFrom(m, m.accuracy)}–${m.accuracy}` : `a ${m.accuracy}`}.` : ''}`]);
  if (m.accuracy !== 'sure') lines.push(['⌖ ', zeroInOf(m) ? `A miss zeroes in: +${zeroInOf(m)} to ${nameOf(c)}’s next accuracy roll${zeroInOf(m) !== ZERO_IN ? ` (most moves give +${ZERO_IN})` : ''}.` : 'All or nothing: a miss never zeroes in.']);
  lines.push(['💨 ', m.effort ? `Effort ${m.effort}: uses ${m.effort} of ${nameOf(c)}’s ${maxStamina(c)} Stamina each time.` : 'No Stamina cost.']);
  if (m.speed) lines.push(['⚡ ', `Speed ${m.speed > 0 ? '+' : ''}${m.speed}: acts at Speed ${st.speed + m.speed} that round.`]);
  if (m.status) lines.push([STATUS_INFO[m.status].icon + ' ', `${m.extraDice?.length ? 'A 1 on any damage die' : 'A 1 on the damage die'} (${Math.round(statusChance(m) * 100)}%): ${STATUS_INFO[m.status].name}. ${STATUS_INFO[m.status].text}`]);
  return h('div', { class: 'pb-detail', style: `--tc:${m.type ? TYPE_COLOR[m.type] : '#8a8796'}` },
    h('ul', null, lines.map((l) => h('li', null, ...l))),
    h('div', { class: 'row gap-s small' }, 'Needs ', energyPips(m.cost as Record<string, number>, true)),
    why && !on ? h('div', { class: 'lock small' }, '🔒 ', why) : null,
    h('div', { class: 'row gap-s' },
      h('button', { class: `btn ${on ? 'ghost' : 'primary'} block`, type: 'button', disabled: !on && !!why, onclick: toggle }, on ? '➖ Remove move' : '➕ Add move?')),
    h('small', { class: 'muted' }, 'Tip: double-tap a move to add or remove it.'));
}

export function editPlaybook(c: CreatureInst, changed: () => void, onEdit?: (e: CreatureEdit) => void) {
  const setPlaybook = (ids: string[]) => { c.playbook = ids; onEdit?.({ uid: c.uid, op: 'playbook', moves: [...ids] }); };
  {
    const e = energy(c);
    let sel = [...c.playbook];
    // list controls: a type (or Physical / Support) filter, a sort order, and "only what still fits"
    type Filter = 'all' | 'physical' | 'support' | ElementType;
    type Sort = 'cost' | 'cost-desc' | 'damage' | 'speed' | 'type' | 'name';
    let filter: Filter = 'all', sort: Sort = 'cost', fitsOnly = false;
    // phones: the move whose details are open, and the last tap (for double-tap to add)
    let inspect: string | null = null;
    let lastTap = { id: '', t: 0 };
    const touchMode = () => matchMedia('(max-width: 759px), (hover: none)').matches;
    const typesOf = (m: Move) => TYPES.filter((t) => (m.cost[t] ?? 0) > 0);
    const costSum = (m: Move) => Object.values(m.cost).reduce<number>((a, v) => a + (v ?? 0), 0);
    const avgDmg = avgRoll;
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
    const sigId = speciesOf(c).signature;
    const lockedSig = sigId && c.signature !== sigId ? sigId : null;
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
      // Desktop: a click adds or removes the move. Phones: the first tap opens what the move does (with an
      // Add button, or why it doesn't fit); a quick second tap adds or removes it straight away.
      const touch = touchMode();
      const list = h('div', { class: 'moves grid' }, opts.length ? opts.map((id) => {
        const on = sel.includes(id);
        const canAdd = !on && sel.length < 4 && fits(e, [...sel, id]);
        const toggle = () => { if (!on && !canAdd) return; sel = on ? sel.filter((x) => x !== id) : [...sel, id]; inspect = null; render(); };
        if (!touch) return moveCard(MOVE_BY_ID[id], { selected: on, disabled: !on && !canAdd, onClick: toggle });
        const open = inspect === id;
        const tap = () => {
          const now = performance.now();
          const double = lastTap.id === id && now - lastTap.t < 350;
          lastTap = double ? { id: '', t: 0 } : { id, t: now };
          if (double && (on || canAdd)) { toggle(); return; }
          inspect = open && !double ? null : id;
          render();
        };
        const card = moveCard(MOVE_BY_ID[id], { selected: on, dim: !on && !canAdd, open, onClick: tap });
        if (!open) return card;
        const why = sel.length >= 4 ? 'All 4 move slots are full. Remove a move first.'
          : `Not enough energy left: ${free} free, and this needs ${costSum(MOVE_BY_ID[id])} of the right types.`;
        return h('div', { class: 'pb-item' }, card, moveDetail(c, MOVE_BY_ID[id], on, canAdd ? null : why, toggle));
      }) : [h('p', { class: 'small muted' }, 'No moves match this filter.')],
        // the species' Signature Move, shown locked until its chart node is bought
        lockedSig && matches(MOVE_BY_ID[lockedSig], filter) && !fitsOnly ? h('div', { class: 'sig-locked' },
          moveCard(MOVE_BY_ID[lockedSig], { disabled: true }),
          h('small', null, '🔒 Signature Move: unlock it from the ★ node on the progression chart.')) : null);
      body.replaceChildren(
        h('div', { class: 'pb-layout' },
          playbookSidebar(c, sel, usage, (id) => { sel = sel.filter((x) => x !== id); render(); }),
          h('div', { class: 'pb-main' },
            h('p', { class: 'small' }, 'Energy is a requirement, not a cost per use. A move fits if your creature generates enough of each type; Neutral slots take any energy and Prisma counts as any type.'),
            controls, list)),
        h('div', { class: 'row end gap sticky-foot' },
          h('button', { class: 'btn ghost', onclick: () => recommendSheet(c, (ids) => { setPlaybook(ids); close(); changed(); }) }, '✨ Recommend moves?'),
          h('button', { class: 'btn ghost', onclick: () => { sel = []; render(); } }, 'Clear'),
          h('button', { class: 'btn primary', disabled: sel.length === 0, onclick: () => { setPlaybook(sel); close(); changed(); } }, 'Save playbook')));
      // keep an opened move's details on screen (they can open below the fold)
      if (inspect) requestAnimationFrame(() => body.querySelector('.pb-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    };
    const close = openSheet(`${nameOf(c)} · Playbook`, body, { wide: true, cls: 'pb-sheet' });
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

/** How statuses work (shared by the Status Effects guide and the Type Chart). */
function statusRules() {
  return h('ul', { class: 'small status-rules' },
    h('li', null, h('b', null, 'How they land: '), 'when an elemental attack rolls a 1 on its damage die (or on any of them, for moves with extra dice like d10+d4), the target gains that attack type’s status.'),
    h('li', null, h('b', null, 'One at a time: '), 'a creature that already has a status can’t gain another until it wears off.'),
    h('li', null, h('b', null, 'Duration: '), '3 rounds, counted only while the creature is in battle (not while swapped out). Ends early on a KO, and always ends with the battle.'));
}

/** One status: its icon, name, the type whose elemental attacks inflict it, and what it does. */
function statusRow(t: ElementType) {
  const st = STATUS_INFO[STATUS_FOR[t]];
  return h('div', { class: 'status-row', style: `--tc:${TYPE_COLOR[t]}` },
    h('span', { class: 'status-ico' }, st.icon),
    h('div', null,
      h('div', { class: 'row gap-s' }, h('b', null, st.name), h('span', { class: 'muted small' }, 'from'), typeChip(t, true)),
      h('p', { class: 'small' }, st.text)));
}

/** Reference sheet: every status, what inflicts it, and exactly what it does. */
export function statusGuide() {
  return h('div', { class: 'status-guide' }, statusRules(), h('div', { class: 'status-list' }, TYPES.map(statusRow)));
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
export function typeChart(hl: { attack?: ElementType[]; defend?: ElementType[]; attackerName?: string } = {}) {
  const atk = new Set(hl.attack ?? []), def = new Set(hl.defend ?? []);
  const weakTo = (t: ElementType) => TYPES.filter((x) => effectiveness(x, [t]) > 1);
  const strongVs = (t: ElementType) => TYPES.filter((x) => effectiveness(t, [x]) > 1);
  const icon = (t: ElementType, ring: boolean) =>
    h('span', { class: `tc-ico ${ring ? 'ring' : ''}`, title: TYPE_LABEL[t], style: `--tc:${TYPE_COLOR[t]}` }, typeIconImg(t, 26));
  return h('div', { class: 'type-stack' },
    h('div', { class: 'tc-legend' },
      h('span', { class: 'tc-side left' }, h('b', null, '⚔️ Strong against'), h('small', null, 'deals 2× · and resists them')),
      h('span', { class: 'tc-side mid' }, h('small', null, 'type · status')),
      h('span', { class: 'tc-side right' }, h('b', null, '🛡️ Weak to'), h('small', null, 'takes 2× · and is resisted by'))),
    TYPES.map((t) => {
      const row = atk.has(t) ? 'hl-atk' : def.has(t) ? 'hl-def' : '';
      return h('div', { class: `tc-row ${row}` },
        // left: when this type attacks, the foe types it hits hard are ringed in battle
        h('div', { class: 'tc-list left' }, strongVs(t).map((x) => icon(x, atk.has(t) && def.has(x)))),
        h('div', { class: 'tc-pill', style: `--tc:${TYPE_COLOR[t]};--pill-ink:${inkOn(TYPE_COLOR[t])}` },
          h('b', null, TYPE_LABEL[t].toUpperCase()), typeIconImg(t, 22),
          // the status this type's elemental attacks can inflict
          h('span', { class: 'tc-status', title: `${TYPE_LABEL[t]} attacks can inflict ${STATUS_INFO[STATUS_FOR[t]].name}: ${STATUS_INFO[STATUS_FOR[t]].text}` }, STATUS_INFO[STATUS_FOR[t]].icon),
          atk.has(t) ? h('small', { class: 'tc-tag' }, hl.attackerName ? 'their move' : 'your move') : def.has(t) ? h('small', { class: 'tc-tag' }, 'foe') : null),
        h('div', { class: 'tc-list right' }, weakTo(t).map((x) => icon(x, def.has(t) && atk.has(x)))));
    }));
}

/**
 * Type chart sheet. In battle, pass your moves' types and the opponent's types to highlight the matchup.
 * `attackerName` (spectators): whose moves the gold rows are, instead of "your".
 */
export function typeChartSheet(hl: { attack?: ElementType[]; defend?: ElementType[]; foeName?: string; attackerName?: string } = {}) {
  const inBattle = !!hl.defend?.length;
  return openSheet('Type Chart', h('div', null,
    inBattle ? h('p', { class: 'small' }, 'Gold rows are ', hl.attackerName ? h('b', null, hl.attackerName) : 'your', hl.attackerName ? '\u2019s moves\u2019 types; blue rows are ' : ' moves\u2019 types; blue rows are ', h('b', null, hl.foeName ?? 'the opponent'), '\u2019s types (', hl.defend!.map((t) => typeChip(t, true)), '). Ringed icons are the matchups in this fight.') : null,
    typeChart(hl),
    h('p', { class: 'small' }, 'Matchups mirror: a type resists (takes ½ from) everything it is strong against. Dual types multiply: 4× when both types are weak, immune when both resist. Only Elemental attacks use the chart; Physical attacks ignore it.'),
    typeChartStatuses(hl)), { wide: true });
}

/**
 * The Type Chart's status section. In battle: the statuses the attacker's elemental moves can inflict and
 * the ones the foe's types may inflict, with every status folded away below. Otherwise the full guide.
 */
function typeChartStatuses(hl: { attack?: ElementType[]; defend?: ElementType[]; foeName?: string; attackerName?: string }) {
  const head = h('h4', null, '🌀 Status effects');
  if (!hl.defend?.length) return h('section', { class: 'tc-statuses' }, head, statusGuide());
  const mine = hl.attack ?? [];
  const theirs = hl.defend.filter((t, i, a) => a.indexOf(t) === i);
  const group = (title: Node | string, types: ElementType[], empty: string) => h('div', { class: 'tc-status-group' },
    h('h5', null, title), types.length ? h('div', { class: 'status-list' }, types.map(statusRow)) : h('p', { class: 'small muted' }, empty));
  return h('section', { class: 'tc-statuses' }, head, statusRules(),
    group(hl.attackerName ? h('span', null, h('b', null, hl.attackerName), '’s moves can inflict') : 'Your moves can inflict', mine,
      'No elemental moves in this playbook, so no statuses (Physical and Support moves never inflict one).'),
    group(h('span', null, h('b', null, hl.foeName ?? 'The opponent'), ' may inflict (from its types)'), theirs, ''),
    h('details', { class: 'tc-all-statuses' }, h('summary', null, 'All 8 status effects'), h('div', { class: 'status-list' }, TYPES.map(statusRow))));
}
