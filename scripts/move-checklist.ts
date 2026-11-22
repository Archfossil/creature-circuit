// Generates docs/09-move-checklist.md: every move in the game with its numbers (cost, damage,
// accuracy, speed, effort, status, effects), marking generated placeholders to replace and flagging
// moves that stand out from the attack-grid baseline for a balance check. Run: npm run docs:moves
import { writeFileSync } from 'node:fs';
import { MOVES, ATTACK_SLOTS, STATUS_INFO, effectText, slotKey, CATCH_BREATH, BY_TOTAL, ZERO_IN, ZERO_IN_MAX, zeroInOf, avgRoll, diceText, statusChance, critFaces, critFrom } from '../src/data/moves';
import { SPECIES } from '../src/data/species';
import { TYPES, TYPE_LABEL } from '../src/data/types';
import type { ElementType, Move, Stats } from '../src/data/schema';
import { SWAP_MOVES, swapStatus, type SwapEffect, type SwapMove, type SwapVals } from '../src/data/swapMoves';

const OUT = new URL('../docs/09-move-checklist.md', import.meta.url);
const anchor = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');

const typedTotal = (m: Move) => TYPES.reduce((a, t) => a + (m.cost[t] ?? 0), 0);
const totalCost = (m: Move) => typedTotal(m) + (m.cost.neutral ?? 0);
const costText = (m: Move) => {
  const parts = TYPES.filter((t) => (m.cost[t] ?? 0) > 0).map((t) => `${m.cost[t]} ${TYPE_LABEL[t]}`);
  if (m.cost.neutral) parts.push(`${m.cost.neutral} Neutral`);
  return parts.join(' + ') || 'Free';
};
const avgDmg = avgRoll;
const dmgText = (m: Move) => (m.kind === 'support' ? '—' : diceText(m) || '0');
const accText = (m: Move) => (m.accuracy === 'sure' ? 'Sure-hit' : `d${m.accuracy}${critFaces(m) > 1 ? ` (✸ ${critFrom(m, m.accuracy)}+)` : ''}${zeroInOf(m) === ZERO_IN ? '' : zeroInOf(m) ? ` (⌖ +${zeroInOf(m)})` : ' (⌖ ✕)'}`);
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const fx = (m: Move) => effectText(m).replace(/ Stat changes last until.*$/, '') || '—';
const statusText = (m: Move) => (m.status ? `${STATUS_INFO[m.status].name}${m.extraDice?.length ? ` (${Math.round(statusChance(m) * 100)}%)` : ''}` : '—');

// Baseline: what a generated placeholder with the same total typed cost does (dual types get +1 flat).
const BASE: Record<number, { single: number; dual: number }> = Object.fromEntries(Object.entries(BY_TOTAL).map(([n, b]) => {
  const single = (b.dmgDie + 1) / 2 + b.dmgFlat;
  return [Number(n), { single, dual: single + 1 }];
}));
/** Balance flag for a damaging move against the placeholder baseline of its cost. */
function balanceNote(m: Move): string {
  if (m.kind === 'support' || m.placeholder) return '';
  // the whole cost counts, Neutral included (it still takes energy to slot the move)
  const base = BASE[Math.min(5, Math.max(1, totalCost(m)))];
  if (!base) return '';
  const dual = TYPES.filter((t) => (m.cost[t] ?? 0) > 0).length === 2;
  const ref = dual ? base.dual : base.single;
  let d = avgDmg(m) - ref;
  // sure-hit moves and fast moves are worth a little more, slow ones a little less
  // wider crits: each extra crit face adds a 1-in-die chance of doubling the damage
  const wideCrit = critFaces(m) > 1 && typeof m.accuracy === 'number' ? ((critFaces(m) - 1) / m.accuracy) * avgDmg(m) : 0;
  const perks = (m.accuracy === 'sure' ? 1 : 0) + Math.max(0, m.speed) * 0.25 + Math.min(0, m.speed) * 0.25 + wideCrit;
  d += perks;
  if (d >= 1.5) return `⬆ Strong for its cost (${signed(+d.toFixed(1))} vs baseline)`;
  if (d <= -1.5) return `⬇ Weak for its cost (${signed(+d.toFixed(1))} vs baseline)`;
  return '';
}

const header = '| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |';
const rule = '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|';
function row(m: Move) {
  const tc = Math.max(1, totalCost(m));
  const dmg = m.kind === 'support' ? '—' : avgDmg(m).toFixed(1);
  const per = m.kind === 'support' ? '—' : (avgDmg(m) / tc).toFixed(2);
  const hits = m.kind === 'physical' ? 'Physical' : m.type ? TYPE_LABEL[m.type] : '—';
  return `| **${m.name}** | \`${m.id}\` | ${costText(m)} | ${hits} | ${dmgText(m)} | ${dmg} | ${per} | ${accText(m)} | ${signed(m.speed)} | ${m.effort} | ${statusText(m)} | ${fx(m)} | ${balanceNote(m) || '—'} | ${m.placeholder ? 'Placeholder' : 'Hand-made'} | ${m.placeholder ? '☐' : '☑'} | ☐ |`;
}

const total = MOVES.length;
const ph = MOVES.filter((m) => m.placeholder);
const sigs = MOVES.filter((m) => m.id.startsWith('sig-'));
const physical = MOVES.filter((m) => m.kind === 'physical');
const support = MOVES.filter((m) => m.kind === 'support');
const elemental = MOVES.filter((m) => m.kind === 'elemental' && !m.id.startsWith('sig-'));
const flagged = MOVES.filter((m) => balanceNote(m));
const sigUsers = (id: string) => SPECIES.filter((s) => s.signature === id).map((s) => s.name);

// ── Swap Moves (data/swapMoves.ts): described with words instead of a particular pair's numbers ──
const ZERO: Stats = { vigor: 0, power: 0, armor: 0, focus: 0, ward: 0, speed: 0, evasion: 0, stamina: 0 };
const SAMPLE: SwapVals = { a: ZERO, p: ZERO, bonus: 1, A: 'Alpha', P: 'Partner', aType: 'astral', pType: 'astral' };
const STAT_WORD: Record<string, string> = { vigor: 'Vigor', power: 'Power', armor: 'Armor', focus: 'Focus', ward: 'Ward', speed: 'Speed', evasion: 'Evasion', stamina: 'Stamina' };
const swapEffectWord = (m: SwapMove, e: SwapEffect) => {
  switch (e.t) {
    case 'mod': { const up = e.n({ ...SAMPLE, bonus: 0 }) >= 0; return `${e.who === 'foe' ? 'foe ' : ''}${up ? '+' : '−'}${STAT_WORD[e.stat]}`; }
    case 'heal': return `heals ${e.who === 'alpha' ? 'Alpha' : 'Partner'}`;
    case 'refill': return 'both refill Stamina';
    case 'ease': return 'both −1 Fatigue';
    case 'status': return `${STATUS_INFO[swapStatus(m)!].name} outright`;
  }
};
const swapDamage = (m: SwapMove) => {
  if (!m.hit) return '—';
  const def = m.hit.kind === 'physical' ? 'Armor' : 'Ward';
  return `d${m.hit.die} + ${m.hit.parts(SAMPLE).map((p) => p.label).join(' + ')} − ${def}`;
};
const swapHitsAs = (m: SwapMove) => (!m.hit ? '—' : m.hit.kind === 'physical' ? 'Physical' : m.hit.chart === 'partner' ? 'Partner’s type' : m.hit.chart === 'alpha' ? 'Alpha’s type' : TYPE_LABEL[m.type!]);
const favouriteOf = (m: SwapMove) => SPECIES.filter((sp) => sp.affinity === m.id).length;
const swapRow = (m: SwapMove) => `| ${m.name} | \`${m.id}\` | ${m.type ? TYPE_LABEL[m.type] : 'Neutral'} | ${m.teamwork} | ${!m.hit ? '—' : m.hit.acc ? `d${m.hit.acc}` : 'Sure-hit'} | ${swapDamage(m)} | ${swapHitsAs(m)} | ${m.hit?.status ? `${STATUS_INFO[swapStatus(m)!].name} on 1–2` : '—'} | ${m.speed ? signed(m.speed) : '0'} | ${[...(m.before ?? []), ...(m.after ?? [])].map((e) => swapEffectWord(m, e)).join(', ') || '—'} | ${m.type ? '—' : favouriteOf(m)} | ${m.type ? '☐' : '☑'} | ☐ |`;
const typedSwaps = SWAP_MOVES.filter((m) => m.type);

const lines: string[] = [];
lines.push(
  '# Move Checklist: every attack, its numbers, and placeholders to replace',
  '',
  '*Generated from the game data by `npm run docs:moves` (scripts/move-checklist.ts). Regenerate after changing moves rather than editing by hand.*',
  '',
  'Every move in the game with all its attributes. Use it to swap generated **placeholders** for designed moves and to review **balance**.',
  '',
  '## Progress',
  '',
  '| | Count |',
  '|---|---|',
  `| Moves in the game | ${total} |`,
  `| Hand-made | ${total - ph.length} |`,
  `| **Placeholders to replace** | **${ph.length}** |`,
  `| Attack-grid slots | ${ATTACK_SLOTS.length} (${ATTACK_SLOTS.length - ph.length} hand-made, ${ph.length} placeholders) |`,
  `| Hand-made moves flagged for a balance look | ${flagged.length} |`,
  `| Swap Moves | ${SWAP_MOVES.length} (${SWAP_MOVES.length - typedSwaps.length} neutral, ${typedSwaps.length} typed; **${typedSwaps.length} awaiting design sign-off**) |`,
  '',
  '## How to read this',
  '',
  '- **Cost** is the energy a creature must generate to slot the move into its playbook. It isn’t spent per use. Neutral can be paid by any type.',
  '- **Hits as**: the type the attack uses on the type chart. Physical moves ignore the chart and use Power vs Armor.',
  '- **Damage** is the damage die (plus any extra dice, e.g. d10+d4, which are added up) and a flat bonus, before stats. The attacker adds Power (physical) or Focus (elemental) and subtracts the target’s Armor or Ward. **Avg** is the average before stats. **Avg / energy** divides it by the total cost.',
  '- **Accuracy** is the die rolled against the target’s Evasion (roll ≥ Evasion hits). Sure-hit moves never miss. Physical moves crit (double damage) on the die’s top face; **(✸ 5+)** marks a wider crit range (a roll of 5 or more crits).',
  `- **⌖ Zeroing In**: a miss gives the creature's next accuracy roll +${ZERO_IN}, stacking over a streak of misses up to +${ZERO_IN_MAX}. The next accuracy roll uses it up, and leaving the field loses it. Moves that differ say so after their accuracy: **(⌖ +2)** is a pursuit move that zeroes in harder, **(⌖ ✕)** is all or nothing and never zeroes in.`,
  '- **Speed** is added to the user’s Speed this round to decide who acts first. **Effort** is the Stamina it drains.',
  '- **Status** is inflicted when a damage die rolls a 1 (elemental attacks carry their type’s status). Moves with extra dice (e.g. d10+d4) inflict it if **any** die shows a 1, so the chance is shown next to the status.',
  '- **Balance note** compares a hand-made move’s average damage with a generated placeholder of the same total cost (Neutral included), giving sure-hit and speed a small allowance. It’s a prompt to look, not a verdict: support effects and statuses aren’t counted.',
  '- **Design ☐**: a designed name, flavour and numbers. Hand-made moves start ticked. **Balance ☐**: tick once someone has reviewed its numbers in play.',
  '- **Swapping a placeholder (developers):** add the move to `HANDMADE` in `src/data/moves.ts` with the same typed cost and hit type. It takes over that grid slot and the placeholder disappears. Then regenerate this file.',
  '',
  '## The placeholder formula (balance baseline)',
  '',
  'Generated attacks use these numbers by total typed cost. Dual-type attacks get +1 flat damage for needing two energy types. All placeholders have d6 accuracy.',
  '',
  '| Total cost | Damage (single type) | Damage (dual type) | Avg (single / dual) | Speed | Effort |',
  '|---|---|---|---|---|---|',
);
for (let n = 1; n <= 5; n++) {
  const b = BY_TOTAL[n];
  const die = (flat: number) => `d${b.dmgDie}${flat ? `+${flat}` : ''}`;
  lines.push(`| ${n} | ${die(b.dmgFlat)} | ${n >= 2 ? die(b.dmgFlat + 1) : '—'} | ${BASE[n].single.toFixed(1)} / ${n >= 2 ? BASE[n].dual.toFixed(1) : '—'} | ${signed(b.speed)} | ${b.effort} |`);
}
lines.push('', '## Contents', '',
  `- [Physical moves](#physical-moves) (${physical.length})`,
  `- [Support moves](#support-moves) (${support.length + 1})`,
  `- [Signature moves](#signature-moves) (${sigs.length})`,
  `- [Swap Moves](#swap-moves) (${SWAP_MOVES.length})`,
  ...TYPES.map((t) => `- [${TYPE_LABEL[t]} attacks](#${anchor(`${TYPE_LABEL[t]} attacks`)}) (${elemental.filter((m) => m.type === t).length}, ${elemental.filter((m) => m.type === t && m.placeholder).length} placeholders)`),
  flagged.length ? '- [Balance watch list](#balance-watch-list)' : '',
  '', '---', '');

lines.push('## Physical moves', '', 'Type-free attacks: Power vs Armor, ignore the type chart, crit on the accuracy die’s top face (or a wider range, marked ✸).', '', header, rule, ...physical.map(row), '');
lines.push('## Support moves', '', 'Buffs, debuffs and heals. No damage. Catch Breath is always available and doesn’t take a playbook slot.', '', header, rule, ...[...support, CATCH_BREATH].map(row), '');
lines.push('## Signature moves', '', 'Unlocked from a creature’s progression chart (★ node). They don’t fill attack-grid slots.', '',
  '| Signature | Learned by |', '|---|---|', ...sigs.map((m) => `| ${m.name} | ${sigUsers(m.id).join(', ') || '—'} |`), '', header, rule, ...sigs.map(row), '');

lines.push('## Swap Moves', '',
  'What a creature does when it swaps in during battle (it\'s the **Alpha**; the creature it replaces is the **Partner**). Trainers set one per teammate on each creature\'s card, and each species has a neutral favourite it uses until then. Exact effects and rules: [13 · Natures, Abilities & Swap Moves](./13-natures-and-abilities.md#swap-moves).', '',
  '- **Teamwork** is what the Alpha needs with the Partner to set the move. Typed moves also need one of the pair to have that type.',
  '- **Damage** lists what\'s added to the die. **Teamwork** there means the Teamwork bonus (+1 per 2 Teamwork, up to +3 by Lv 12).',
  '- **Status on 1–2**: typed hits inflict their type\'s status on a 1 or 2 on the damage die (regular moves need a 1). **Outright** means it\'s inflicted with no roll (if the foe has no status).',
  '- **Effects** are applied before or after the hit as listed in the move\'s data. Stat boosts last while the Alpha stays in.',
  '- **Design ☐**: the 16 typed moves are first drafts from development (names, flavour and numbers) awaiting design sign-off. The 5 neutral ones are the original powers.',
  '- **Adding one (developers):** add it to `SWAP_MOVES` in `src/data/swapMoves.ts`, built from the existing effects; document it in docs/13 (a test checks), then regenerate this file.', '',
  '| Move | ID | Type | Teamwork | Accuracy | Damage | Hits as | Status | Speed | Effects | Favourite of | Design | Balance |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...SWAP_MOVES.map(swapRow), '');

for (const t of TYPES) {
  const list = elemental.filter((m) => m.type === t).sort((a, b) =>
    typedTotal(a) - typedTotal(b) || slotKey(a.cost, a.type).localeCompare(slotKey(b.cost, b.type)));
  const single = list.filter((m) => TYPES.filter((x) => (m.cost[x] ?? 0) > 0).length <= 1);
  const dual = list.filter((m) => TYPES.filter((x) => (m.cost[x] ?? 0) > 0).length === 2);
  lines.push(`## ${TYPE_LABEL[t]} attacks`, '',
    `${list.length} attacks that hit as ${TYPE_LABEL[t]} (${list.filter((m) => m.placeholder).length} placeholders). Status on a damage roll of 1: ${STATUS_INFO[(list[0]?.status ?? 'burn') as keyof typeof STATUS_INFO].name}.`, '',
    `### ${TYPE_LABEL[t]}: single-type`, '', header, rule, ...single.map(row), '',
    `### ${TYPE_LABEL[t]}: dual-type`, '', 'Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.', '', header, rule, ...dual.map(row), '');
}

if (flagged.length) {
  lines.push('---', '', '## Balance watch list', '', 'Hand-made moves whose damage stands out from the placeholder baseline for their cost. Worth a look in play.', '',
    '| Move | Cost | Damage | Accuracy | Speed | Note |', '|---|---|---|---|---|---|',
    ...flagged.map((m) => `| ${m.name} | ${costText(m)} | ${dmgText(m)} | ${accText(m)} | ${signed(m.speed)} | ${balanceNote(m)} |`), '');
}

writeFileSync(OUT, lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n'));
console.log(`Wrote ${OUT.pathname}: ${total} moves, ${ph.length} placeholders, ${flagged.length} flagged for balance.`);
