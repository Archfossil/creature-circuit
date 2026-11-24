// Generates docs/14-instinct-checklist.md: every Instinct (a creature's battle passive), its exact
// rules, and which creatures have it, as a checklist for the design team. Run: npm run docs:instincts
import { writeFileSync } from 'node:fs';
import { INSTINCTS, INSTINCT_ICON, MOMENT_TEXT, instinctRules, type Instinct } from '../src/data/instincts';
import { SPECIES_BY_ID } from '../src/data/species';
import { TYPES, TYPE_LABEL } from '../src/data/types';
import type { Species } from '../src/data/schema';

// the whole library, whichever regions they live in
const SPECIES = Object.values(SPECIES_BY_ID);

const OUT = new URL('../docs/14-instinct-checklist.md', import.meta.url);

/**
 * Instincts flagged for a balance look: the worry, and a change to try. Add an entry here (not in the
 * generated doc) so the flag survives regenerating.
 */
const BALANCE_WATCH: Record<string, { concern: string; idea: string }> = {
  'deep-roots': {
    concern: 'With Overheal, Deep Roots no longer stops at a full heart: a creature with a full heart builds 1 Overheal every round, up to half a heart (3), so a long fight hands it a free buffer.',
    idea: 'If it proves too strong: let Deep Roots heal Health only (no Overheal), or only overheal once a battle.',
  },
  shadow: {
    concern: 'Possibly too strong. Zeroing In is the built-in answer to a foe that keeps dodging, and Shadow switches it off completely for as long as its creature is on the field. Paired with high Evasion (an Evasion bias or boosts, Glamour-style buffs, Fog), a creature that misses a lot may never catch up.',
    idea: 'Instead of cancelling Zeroing In, halve it: against Shadow each miss Zeroes In +0.5 instead of +1, so it takes two misses to earn +1 accuracy. Needs Zeroing In to hold halves (the bonus used on a roll rounds down) and the move readout to say so.',
  },
};

/** A family's first stage (follow evolutions back). */
const preOf: Record<string, string> = {};
for (const sp of SPECIES) if (sp.evolvesTo) preOf[sp.evolvesTo] = sp.id;
const rootOf = (sp: Species): Species => { let s = sp; while (preOf[s.id]) s = SPECIES_BY_ID[preOf[s.id]]; return s; };

/** "Twinkit line (hand-made), Stelmite line …": the families with this Instinct. */
function holders(i: Instinct) {
  const roots = [...new Set(SPECIES.filter((sp) => sp.instinct === i.id).map((sp) => rootOf(sp).id))].map((id) => SPECIES_BY_ID[id]);
  const made = roots.filter((r) => !r.placeholder), ph = roots.filter((r) => r.placeholder);
  const name = (r: Species) => (r.evolvesTo ? `${r.name} line` : r.name);
  const count = SPECIES.filter((sp) => sp.instinct === i.id).length;
  return { count, text: [...made.map((r) => `**${name(r)}**`), ...(ph.length ? [`${ph.length} placeholder ${ph.length === 1 ? 'family' : 'families'}`] : [])].join(', ') || '—' };
}

const kind = (i: Instinct) => (i.trigger ? `${MOMENT_TEXT[i.trigger.on]}${i.trigger.once ? ' (once)' : ''}${i.trigger.chance ? ` (1–${i.trigger.chance} on d6)` : ''}` : 'Always on');
const esc = (s: string) => s.replace(/\|/g, '\\|');

const lines: string[] = [];
lines.push(
  '# Instinct Checklist: every battle passive, for redesign',
  '',
  '*Generated from the game data by `npm run docs:instincts` (scripts/instinct-checklist.ts). Regenerate after changing Instincts rather than editing by hand.*',
  '',
  `Every creature has three things that shape it: its **Nature** (stats and perks), its **Ability** (works on the overworld while it Follows you) and its **Instinct** ${INSTINCT_ICON} (a passive that fires on its own in battle). This list has every Instinct with its exact rules and the creatures that have it.`,
  '',
  '## Progress',
  '',
  '| | Count |',
  '|---|---|',
  `| Instincts in the game | ${INSTINCTS.length} (${TYPES.length} types × ${INSTINCTS.length / TYPES.length}) |`,
  `| Designed and signed off | 0 |`,
  `| **First drafts to review** | **${INSTINCTS.length}** |`,
  `| Species with an Instinct | ${SPECIES.filter((sp) => sp.instinct).length} of ${SPECIES.length} |`,
  `| Flagged for a balance look | ${Object.keys(BALANCE_WATCH).length} (see [Balance watch list](#balance-watch-list)) |`,
  '',
  '## How Instincts work',
  '',
  '- **One per species**, shared by every stage of a family. Hand-made families were given one from their first type\'s pool; generated placeholder families draw from one of their types\' pools (alternating between the two types of a dual family by rarity). A species can use any Instinct, not just its type\'s: the pools only decide the defaults.',
  '- **Triggered** Instincts fire at a moment:',
  ...Object.values(MOMENT_TEXT).map((t) => `  - ${t}.`),
  '- "Takes the field" means: the leads as round 1 begins (after the trainer picks who leads), a creature swapping in (before its Swap Move), or one replacing a knocked-out teammate.',
  '- **(once)** Instincts fire only the first time in a battle. **(1–2 on d6)** ones roll a d6 each time and fire on a 1 or 2.',
  '- **Always-on** Instincts bend a rule while the creature is on the field (accuracy, statuses, crits, Clashes, weather, and so on).',
  '- Stat changes from an Instinct work like every battle modifier: they last while the creature stays in, and each stat is capped at ±3.',
  `- In battle, an Instinct firing shows as "${INSTINCT_ICON} Name’s Instinct!" in the log, followed by what it did. Wild creatures and opposing trainers have Instincts too.`,
  '- **Code:** the Instincts are data in `src/data/instincts.ts` (a `trigger` and/or `passive` rules). `src/engine/battle.ts` (the "Instincts" section: `fireInstinct`, `afflict`, `takeHit`, `afterHit`) runs them, and `instinctRules` writes the "Exact rules" column below from the same data.',
  '',
  '## How to use this list',
  '',
  '- **Design ☐**: every Instinct is a first draft from development (name, flavour text and numbers). Tick ☑ when its name, text and effect are approved. Rename or rewrite freely: the id stays the same so saves and species keep pointing at it.',
  '- **Balance ☐**: tick ☑ once it\'s been playtested and its numbers feel right.',
  '- **Names:** they\'re original to the game. Avoid names already used for Abilities, moves, Swap Moves, Natures, items or statuses.',
  '- **Adding one (developers):** add it to `INSTINCTS` in `src/data/instincts.ts`, built from the existing moments, effects and passive rules (or add a new one to the engine), point species at it (`instinct` in `src/data/species.ts`, or the pools for placeholders), then regenerate this file and docs/08.',
  '',
  '## By type',
  '',
);

for (const t of TYPES) {
  const list = INSTINCTS.filter((i) => i.type === t);
  lines.push(`### ${TYPE_LABEL[t]}`, '',
    '| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |',
    '|---|---|---|---|---|---|---|---|---|---|');
  for (const i of list) {
    const hd = holders(i);
    const flag = BALANCE_WATCH[i.id] ? '⚠️ [Watch](#balance-watch-list)' : '—';
    lines.push(`| **${i.name}** | \`${i.id}\` | ${kind(i)} | ${esc(i.text)} | ${esc(instinctRules(i))} | ${hd.count} | ${hd.text} | ${flag} | ☐ | ☐ |`);
  }
  lines.push('');
}

lines.push(
  '## Balance watch list',
  '',
  'Instincts flagged for a closer look in play, with a change to try. Flags live in `BALANCE_WATCH` in scripts/instinct-checklist.ts.',
  '',
  '| Instinct | Concern | Possible change |',
  '|---|---|---|',
  ...Object.entries(BALANCE_WATCH).map(([id, w]) => {
    const i = INSTINCTS.find((x) => x.id === id)!;
    return `| **${i.name}** (\`${id}\`, ${TYPE_LABEL[i.type]}) | ${esc(w.concern)} | ${esc(w.idea)} |`;
  }),
  '',
  '## Design space still open',
  '',
  'Moments and effects the engine doesn\'t support yet, for new Instincts. Each needs a small engine addition (a new moment in `fireInstinct`, or a new passive rule).',
  '',
  '- **When it leaves the field** (swapped out): heal the partner, leave a status trap for the next foe, pass a stat boost on.',
  '- **When a teammate is knocked out:** a revenge boost for the creature that comes in next.',
  '- **When it inflicts a status:** a bonus on top (Burn also lowers Power, Snare also lowers Evasion).',
  '- **When the foe uses a Support move:** copy the buff, or punish it.',
  '- **First hit of the battle:** extra damage, a sure hit, or an automatic crit.',
  '- **Type reactions:** resist one type (halve it), absorb one type as healing, or turn one type\'s hits into Stamina.',
  '- **Stamina and Fatigue:** a lower Effort on its first move, immunity to Fatigue checks, or Catch Breath that also heals.',
  '- **Teamwork links:** a bonus when it swaps in for a particular type of partner, or more Teamwork from swaps.',
  '- **Arena and biome:** boosts in a home biome, or immunity to an arena trick (ice floes, steam vents, the Thunder Spike).',
  '- **Legendary-only Instincts:** stronger, unique effects that make a Legendary worth its Loyalty drain.',
  '',
);

writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${OUT.pathname}: ${INSTINCTS.length} Instincts, ${SPECIES.filter((sp) => sp.instinct).length} species.`);
