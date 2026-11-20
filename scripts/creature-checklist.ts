// Generates docs/08-creature-checklist.md: every creature in the game, slot by slot, marking which
// are generated placeholders still waiting for a real design and art. Run: npm run docs:creatures
import { writeFileSync } from 'node:fs';
import { ROSTER, FAMILY_RARITIES, type RosterSlot } from '../src/data/roster';
import { SPECIES, SPECIES_BY_ID } from '../src/data/species';
import { TYPE_LABEL } from '../src/data/types';
import { ABILITIES, AFFINITIES, BIOME_INFO, ACTIVITY_INFO } from '../src/data/content';
import { MOVE_BY_ID } from '../src/data/moves';
import { MAP_NODES } from '../src/data/map';
import type { Species } from '../src/data/schema';

const OUT = new URL('../docs/08-creature-checklist.md', import.meta.url);
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const typesOf = (sp: Species) => sp.types.map((t) => TYPE_LABEL[t]).join(' / ');
const slotName = (s: RosterSlot) => s.types.map((t) => TYPE_LABEL[t]).join(' / ');
const box = (done: boolean) => (done ? '☑' : '☐');
/** GitHub's heading anchor: lowercase, punctuation dropped, spaces to hyphens ("Astral / Charm" → astral--charm). */
const anchor = (heading: string) => heading.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');
const onMap = (id: string) => MAP_NODES.find((n) => n.legendary === id);

function row(sp: Species, family: string) {
  const ph = !!sp.placeholder;
  const extras = [
    sp.signature ? `Sig: ${MOVE_BY_ID[sp.signature]?.name ?? sp.signature}` : '',
    sp.rarity === 'legendary' ? (onMap(sp.id) ? `Map: ${onMap(sp.id)!.name}` : 'Map: not placed') : '',
  ].filter(Boolean).join(' · ');
  return `| ${family} | ${sp.rarity === 'legendary' ? '—' : sp.stage} | **${sp.name}** | \`${sp.id}\` | ${typesOf(sp)} | ${sp.activity ? ACTIVITY_INFO[sp.activity].label : '—'} | ${ABILITIES[sp.ability]?.name ?? sp.ability} | ${AFFINITIES[sp.affinity]?.name ?? sp.affinity} | ${extras || '—'} | ${ph ? 'Placeholder' : 'Hand-made'} | ${box(!ph)} | ☐ |`;
}

const inRoster = new Set(ROSTER.flatMap((s) => [...s.common, ...s.prime, ...s.apex, s.legendary]));
const extras = SPECIES.filter((sp) => !inRoster.has(sp.id));
const total = SPECIES.length;
const placeholders = SPECIES.filter((sp) => sp.placeholder).length;

const lines: string[] = [];
lines.push(
  '# Creature Checklist: placeholders to replace',
  '',
  '*Generated from the game data by `npm run docs:creatures` (scripts/creature-checklist.ts). Regenerate after swapping creatures in rather than editing by hand.*',
  '',
  'Every creature in the game, slot by slot. The roster has one **slot** for each type and dual-type combination (8 single + 28 dual = 36). Each slot holds a **Common**, **Prime** and **Apex** family of three evolution stages, plus one **Legendary**.',
  '',
  'Generated **placeholders** (ids starting `ph-`) stand in until the real creature is designed and drawn. They have stats, moves and procedural models so the game is playable, but their names and looks are stand-ins.',
  '',
  '## Progress',
  '',
  '| | Count |',
  '|---|---|',
  `| Creatures in the game | ${total} |`,
  `| Hand-made (design done, art to do) | ${total - placeholders} |`,
  `| Final art delivered | 0 of ${total} |`,
  `| **Placeholders to replace** | **${placeholders}** |`,
  `| Families (3 stages) to design | ${ROSTER.reduce((n, s) => n + FAMILY_RARITIES.filter((r) => SPECIES_BY_ID[s[r][0]]?.placeholder).length, 0)} of ${ROSTER.length * 3} |`,
  `| Legendaries to design | ${ROSTER.filter((s) => SPECIES_BY_ID[s.legendary]?.placeholder).length} of ${ROSTER.length} |`,
  '',
  '## How to use this list',
  '',
  '- **Design ☐**: the creature has a real name, concept, flavour text and stat direction. Tick ☑ when approved.',
  '- **Art ☐**: the creature has final art (portrait and model or sprite). Tick ☑ when delivered. No creature has final art yet: every one, hand-made or placeholder, uses the procedural model.',
  '- Hand-made creatures start with Design ☑ because they already have a real name, look and flavour text.',
  '- **Types, biomes, Out by, Ability, Affinity and Signature** are the slot’s current game values. Designs can keep them or propose changes. **Out by** is when it roams the wild: Diurnal (day turns), Nocturnal (night turns) or Day & night. It comes from its types (Astral and Charm lean night; Fire, Grass and Electric lean day) unless set by hand (`ACTIVITY_OVERRIDE` in `src/data/species.ts`).',
  '- **Swapping one in (developers):** add the species in `src/data/species.ts`, then point its slot in `HANDMADE_SLOTS` or `HANDMADE_LEGENDARIES` (`src/data/roster.ts`) at it. The placeholder disappears; regenerate this file.',
  '- A new Legendary also needs a roaming node on the map (`src/data/map.ts`).',
  '',
  '## Slot overview',
  '',
  '| # | Slot | Common | Prime | Apex | Legendary | Biomes |',
  '|---|---|---|---|---|---|---|',
);
ROSTER.forEach((s, i) => {
  const fam = (ids: string[]) => (SPECIES_BY_ID[ids[0]]?.placeholder ? '☐' : '☑');
  const leg = SPECIES_BY_ID[s.legendary];
  const biomes = SPECIES_BY_ID[s.common[0]].biomes.map((b) => BIOME_INFO[b].label).join(', ');
  lines.push(`| ${i + 1} | [${slotName(s)}](#${anchor(slotName(s))}) | ${fam(s.common)} | ${fam(s.prime)} | ${fam(s.apex)} | ${leg.placeholder ? '☐' : '☑'} | ${biomes} |`);
});
lines.push('', '---', '');

for (const s of ROSTER) {
  lines.push(`## ${slotName(s)}`, '');
  const sp0 = SPECIES_BY_ID[s.common[0]];
  lines.push(`Spawns in: ${sp0.biomes.map((b) => BIOME_INFO[b].label).join(', ')}.`, '');
  lines.push('| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of FAMILY_RARITIES) for (const id of s[r]) lines.push(row(SPECIES_BY_ID[id], cap(r)));
  lines.push(row(SPECIES_BY_ID[s.legendary], 'Legendary'), '');
}

if (extras.length) {
  lines.push('---', '', '## Hand-made creatures outside the roster table', '', 'The original hand-made Prime and Apex creatures, from before the roster table existed. They appear in the wild but don’t fill a roster slot. Design could move them into a matching slot (replacing that slot’s placeholder family) or keep them as extras. Either way they need art.', '');
  lines.push('| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const sp of extras) lines.push(row(sp, cap(sp.rarity)));
  lines.push('');
}

writeFileSync(OUT, lines.join('\n'));
console.log(`Wrote ${OUT.pathname}: ${total} creatures, ${placeholders} placeholders, ${extras.length} outside the roster.`);
