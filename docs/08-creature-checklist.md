# Creature Checklist: placeholders to replace

*Generated from the game data by `npm run docs:creatures` (scripts/creature-checklist.ts). Regenerate after swapping creatures in rather than editing by hand.*

Every creature in the game, slot by slot. The roster has one **slot** for each type and dual-type combination (8 single + 28 dual = 36). Each slot holds a **Common**, **Prime** and **Apex** family of three evolution stages, plus one **Legendary**.

Generated **placeholders** (ids starting `ph-`) stand in until the real creature is designed and drawn. They have stats, moves and procedural models so the game is playable, but their names and looks are stand-ins.

## Progress

| | Count |
|---|---|
| Creatures in the game | 386 |
| Hand-made (design done, art to do) | 53 |
| Final art delivered | 0 of 386 |
| **Placeholders to replace** | **333** |
| Families (3 stages) to design | 100 of 108 |
| Legendaries to design | 33 of 36 |

## How to use this list

- **Design ☐**: the creature has a real name, concept, flavour text and stat direction. Tick ☑ when approved.
- **Art ☐**: the creature has final art (portrait and model or sprite). Tick ☑ when delivered. No creature has final art yet: every one, hand-made or placeholder, uses the procedural model.
- Hand-made creatures start with Design ☑ because they already have a real name, look and flavour text.
- **Types, biomes, Out by, Ability, Affinity, Signature and Movement** are the slot’s current game values. Designs can keep them or propose changes. **Out by** is when it roams the wild: Diurnal (day turns), Nocturnal (night turns) or Day & night. It comes from its types (Astral and Charm lean night; Fire, Grass and Electric lean day) unless set by hand (`ACTIVITY_OVERRIDE` in `src/data/species.ts`).
- **Swapping one in (developers):** add the species in `src/data/species.ts`, then point its slot in `HANDMADE_SLOTS` or `HANDMADE_LEGENDARIES` (`src/data/roster.ts`) at it. The placeholder disappears; regenerate this file.
- A new Legendary also needs a roaming node on the map (`src/data/map.ts`).

## Slot overview

| # | Slot | Common | Prime | Apex | Legendary | Biomes |
|---|---|---|---|---|---|---|
| 1 | [Astral](#astral) | ☑ | ☐ | ☐ | ☐ | Tundra, Mountain |
| 2 | [Charm](#charm) | ☑ | ☐ | ☐ | ☐ | Fey Grove, Forest, Meadow |
| 3 | [Electric](#electric) | ☑ | ☐ | ☐ | ☐ | Badlands, Road, Desert |
| 4 | [Fire](#fire) | ☑ | ☐ | ☐ | ☐ | Volcanic, Desert |
| 5 | [Grass](#grass) | ☑ | ☐ | ☐ | ☐ | Forest, Meadow, Swamp |
| 6 | [Rock](#rock) | ☑ | ☐ | ☐ | ☐ | Canyon, Mountain, Badlands |
| 7 | [Steel](#steel) | ☑ | ☐ | ☐ | ☐ | Coast, Road, Mountain |
| 8 | [Water](#water) | ☑ | ☐ | ☐ | ☐ | Lake, River, Swamp, Coast |
| 9 | [Astral / Charm](#astral--charm) | ☐ | ☐ | ☐ | ☐ | Cloud |
| 10 | [Astral / Electric](#astral--electric) | ☐ | ☐ | ☐ | ☐ | Cloud |
| 11 | [Astral / Fire](#astral--fire) | ☐ | ☐ | ☐ | ☑ | Mountain, Tundra, Cloud |
| 12 | [Astral / Grass](#astral--grass) | ☐ | ☐ | ☐ | ☐ | Mountain, Tundra, Cloud |
| 13 | [Rock / Astral](#rock--astral) | ☐ | ☐ | ☐ | ☐ | Mountain |
| 14 | [Steel / Astral](#steel--astral) | ☐ | ☐ | ☐ | ☐ | Mountain |
| 15 | [Water / Astral](#water--astral) | ☐ | ☐ | ☐ | ☑ | Tundra, Cloud |
| 16 | [Charm / Electric](#charm--electric) | ☐ | ☐ | ☐ | ☐ | Meadow, Cloud |
| 17 | [Charm / Fire](#charm--fire) | ☐ | ☐ | ☐ | ☐ | Forest, Fey Grove, Meadow, Lake, Cloud, Forest Floor |
| 18 | [Charm / Grass](#charm--grass) | ☐ | ☐ | ☐ | ☐ | Forest, Fey Grove, Meadow, Forest Floor |
| 19 | [Charm / Rock](#charm--rock) | ☐ | ☐ | ☐ | ☐ | Forest Floor |
| 20 | [Steel / Charm](#steel--charm) | ☐ | ☐ | ☐ | ☐ | Mountain, Road, Coast |
| 21 | [Water / Charm](#water--charm) | ☐ | ☐ | ☐ | ☐ | Lake, Cloud |
| 22 | [Electric / Fire](#electric--fire) | ☐ | ☐ | ☐ | ☐ | Desert |
| 23 | [Electric / Grass](#electric--grass) | ☐ | ☐ | ☐ | ☐ | Meadow |
| 24 | [Electric / Rock](#electric--rock) | ☐ | ☐ | ☐ | ☐ | Desert, Badlands |
| 25 | [Electric / Steel](#electric--steel) | ☐ | ☐ | ☐ | ☐ | Road |
| 26 | [Water / Electric](#water--electric) | ☐ | ☐ | ☐ | ☐ | Cloud |
| 27 | [Fire / Grass](#fire--grass) | ☐ | ☐ | ☐ | ☐ | Desert, Volcanic, Canyon |
| 28 | [Fire / Rock](#fire--rock) | ☐ | ☐ | ☐ | ☐ | Desert, Volcanic, Canyon |
| 29 | [Fire / Steel](#fire--steel) | ☐ | ☐ | ☐ | ☐ | Desert, Volcanic, Canyon |
| 30 | [Fire / Water](#fire--water) | ☐ | ☐ | ☐ | ☐ | Desert, Volcanic, Canyon |
| 31 | [Grass / Rock](#grass--rock) | ☐ | ☐ | ☐ | ☐ | Forest Floor |
| 32 | [Grass / Steel](#grass--steel) | ☐ | ☐ | ☐ | ☐ | Forest, Fey Grove, Meadow, River, Swamp, Forest Floor |
| 33 | [Grass / Water](#grass--water) | ☐ | ☐ | ☐ | ☐ | River, Swamp |
| 34 | [Rock / Steel](#rock--steel) | ☐ | ☐ | ☐ | ☐ | Mountain |
| 35 | [Rock / Water](#rock--water) | ☐ | ☐ | ☐ | ☐ | Mountain, Desert, Badlands, Volcanic, Canyon, Forest Floor |
| 36 | [Steel / Water](#steel--water) | ☐ | ☐ | ☐ | ☑ | Coast |

---

## Astral

Spawns in: Tundra, Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Twinkit** | `twinkit` | Astral | Nocturnal | Star Seeker | Slipstream | Sig: Borealis Lance | Hand-made | ☑ | ☐ |
| Common | 2 | **Lumenox** | `lumenox` | Astral | Nocturnal | Star Seeker | Slipstream | Sig: Borealis Lance | Hand-made | ☑ | ☐ |
| Common | 3 | **Polarion** | `polarion` | Astral / Water | Nocturnal | Star Seeker | Slipstream | Sig: Borealis Lance · Move: Fly | Hand-made | ☑ | ☐ |
| Prime | 1 | **Stelmite** | `ph-astral-mono-prime-1` | Astral | Nocturnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelling** | `ph-astral-mono-prime-2` | Astral | Nocturnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelarch** | `ph-astral-mono-prime-3` | Astral | Nocturnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelwisp** | `ph-astral-mono-apex-1` | Astral | Nocturnal | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelwyrm** | `ph-astral-mono-apex-2` | Astral | Nocturnal | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Steltitan** | `ph-astral-mono-apex-3` | Astral | Nocturnal | Quick Step | Slipstream | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Steleon** | `ph-astral-mono-legendary` | Astral | Nocturnal | Sweet Scent | Tag Strike | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Charm

Spawns in: Fey Grove, Forest, Meadow.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Mossprite** | `mossprite` | Charm | Nocturnal | Baby-Doll Eyes | Rally | Sig: Moonveil Kiss | Hand-made | ☑ | ☐ |
| Common | 2 | **Fernixie** | `fernixie` | Charm | Nocturnal | Baby-Doll Eyes | Rally | Sig: Moonveil Kiss | Hand-made | ☑ | ☐ |
| Common | 3 | **Glamorwyn** | `glamorwyn` | Charm / Astral | Nocturnal | Baby-Doll Eyes | Rally | Sig: Moonveil Kiss · Move: Wayfind | Hand-made | ☑ | ☐ |
| Prime | 1 | **Piximite** | `ph-charm-mono-prime-1` | Charm | Nocturnal | Forager | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixiling** | `ph-charm-mono-prime-2` | Charm | Nocturnal | Forager | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixiarch** | `ph-charm-mono-prime-3` | Charm | Nocturnal | Forager | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixiwisp** | `ph-charm-mono-apex-1` | Charm | Nocturnal | Sweet Scent | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixiwyrm** | `ph-charm-mono-apex-2` | Charm | Nocturnal | Sweet Scent | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixititan** | `ph-charm-mono-apex-3` | Charm | Nocturnal | Sweet Scent | Siphon | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixieon** | `ph-charm-mono-legendary` | Charm | Nocturnal | Forager | Shield Pass | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Electric

Spawns in: Badlands, Road, Desert.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapup** | `zapup` | Electric | Diurnal | Trailblazer | Slipstream | Sig: Stormcall | Hand-made | ☑ | ☐ |
| Common | 2 | **Voltusk** | `voltusk` | Electric | Diurnal | Trailblazer | Slipstream | Sig: Stormcall | Hand-made | ☑ | ☐ |
| Common | 3 | **Stormhound** | `stormhound` | Electric / Steel | Diurnal | Trailblazer | Slipstream | Sig: Stormcall · Move: Tunnel | Hand-made | ☑ | ☐ |
| Prime | 1 | **Zapmite** | `ph-electric-mono-prime-1` | Electric | Diurnal | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapling** | `ph-electric-mono-prime-2` | Electric | Diurnal | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zaparch** | `ph-electric-mono-prime-3` | Electric | Diurnal | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapwisp** | `ph-electric-mono-apex-1` | Electric | Diurnal | Keen Nose | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapwyrm** | `ph-electric-mono-apex-2` | Electric | Diurnal | Keen Nose | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zaptitan** | `ph-electric-mono-apex-3` | Electric | Diurnal | Keen Nose | Rally | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapeon** | `ph-electric-mono-legendary` | Electric | Diurnal | Keen Nose | Slipstream | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Fire

Spawns in: Volcanic, Desert.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Cindercub** | `cindercub` | Fire | Diurnal | Forager | Tag Strike | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Common | 2 | **Blazmane** | `blazmane` | Fire | Diurnal | Forager | Tag Strike | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Common | 3 | **Pyrothane** | `pyrothane` | Fire / Rock | Diurnal | Forager | Tag Strike | Sig: Caldera Roar · Move: Tunnel | Hand-made | ☑ | ☐ |
| Prime | 1 | **Pyromite** | `ph-fire-mono-prime-1` | Fire | Diurnal | Baby-Doll Eyes | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyroling** | `ph-fire-mono-prime-2` | Fire | Diurnal | Baby-Doll Eyes | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyroarch** | `ph-fire-mono-prime-3` | Fire | Diurnal | Baby-Doll Eyes | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrowisp** | `ph-fire-mono-apex-1` | Fire | Diurnal | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrowyrm** | `ph-fire-mono-apex-2` | Fire | Diurnal | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrotitan** | `ph-fire-mono-apex-3` | Fire | Diurnal | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyroeon** | `ph-fire-mono-legendary` | Fire | Diurnal | Lucky Charm | Siphon | Map: not placed | Placeholder | ☐ | ☐ |

## Grass

Spawns in: Forest, Meadow, Swamp.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Sproutle** | `sproutle` | Grass | Diurnal | Forager | Shield Pass | Sig: Overgrowth | Hand-made | ☑ | ☐ |
| Common | 2 | **Thornback** | `thornback` | Grass | Diurnal | Forager | Shield Pass | Sig: Overgrowth | Hand-made | ☑ | ☐ |
| Common | 3 | **Redwarden** | `redwarden` | Grass / Rock | Diurnal | Forager | Shield Pass | Sig: Overgrowth | Hand-made | ☑ | ☐ |
| Prime | 1 | **Sprigmite** | `ph-grass-mono-prime-1` | Grass | Diurnal | Star Seeker | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Sprigling** | `ph-grass-mono-prime-2` | Grass | Diurnal | Star Seeker | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Sprigarch** | `ph-grass-mono-prime-3` | Grass | Diurnal | Star Seeker | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Sprigwisp** | `ph-grass-mono-apex-1` | Grass | Diurnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Sprigwyrm** | `ph-grass-mono-apex-2` | Grass | Diurnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Sprigtitan** | `ph-grass-mono-apex-3` | Grass | Diurnal | Quick Step | Shield Pass | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Sprigeon** | `ph-grass-mono-legendary` | Grass | Diurnal | Trailblazer | Rally | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Rock

Spawns in: Canyon, Mountain, Badlands.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pebbark** | `pebbark` | Rock | Day & night | Keen Nose | Shield Pass | Sig: Mesa Breaker | Hand-made | ☑ | ☐ |
| Common | 2 | **Cragjaw** | `cragjaw` | Rock | Day & night | Keen Nose | Shield Pass | Sig: Mesa Breaker | Hand-made | ☑ | ☐ |
| Common | 3 | **Mesahound** | `mesahound` | Rock | Day & night | Keen Nose | Shield Pass | Sig: Mesa Breaker · Move: Tunnel | Hand-made | ☑ | ☐ |
| Prime | 1 | **Cragmite** | `ph-rock-mono-prime-1` | Rock | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Cragling** | `ph-rock-mono-prime-2` | Rock | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Cragarch** | `ph-rock-mono-prime-3` | Rock | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Cragwisp** | `ph-rock-mono-apex-1` | Rock | Day & night | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Cragwyrm** | `ph-rock-mono-apex-2` | Rock | Day & night | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Cragtitan** | `ph-rock-mono-apex-3` | Rock | Day & night | Sweet Scent | Slipstream | Move: Tunnel | Placeholder | ☐ | ☐ |
| Legendary | — | **Crageon** | `ph-rock-mono-legendary` | Rock | Day & night | Baby-Doll Eyes | Tag Strike | Move: Tunnel · Map: not placed | Placeholder | ☐ | ☐ |

## Steel

Spawns in: Coast, Road, Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Rivetail** | `rivetail` | Steel | Day & night | Baby-Doll Eyes | Shield Pass | Sig: Foundry Hammer | Hand-made | ☑ | ☐ |
| Common | 2 | **Ferrocrab** | `ferrocrab` | Steel | Day & night | Baby-Doll Eyes | Shield Pass | Sig: Foundry Hammer | Hand-made | ☑ | ☐ |
| Common | 3 | **Ironclawd** | `ironclawd` | Steel / Water | Day & night | Baby-Doll Eyes | Shield Pass | Sig: Foundry Hammer · Move: Sail | Hand-made | ☑ | ☐ |
| Prime | 1 | **Ferromite** | `ph-steel-mono-prime-1` | Steel | Day & night | Lucky Charm | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferroling** | `ph-steel-mono-prime-2` | Steel | Day & night | Lucky Charm | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferroarch** | `ph-steel-mono-prime-3` | Steel | Day & night | Lucky Charm | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferrowisp** | `ph-steel-mono-apex-1` | Steel | Day & night | Keen Nose | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrowyrm** | `ph-steel-mono-apex-2` | Steel | Day & night | Keen Nose | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrotitan** | `ph-steel-mono-apex-3` | Steel | Day & night | Keen Nose | Siphon | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Ferroeon** | `ph-steel-mono-legendary` | Steel | Day & night | Quick Step | Shield Pass | Map: not placed | Placeholder | ☐ | ☐ |

## Water

Spawns in: Lake, River, Swamp, Coast.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Puddlit** | `puddlit` | Water | Day & night | Quick Step | Siphon | Sig: Riptide | Hand-made | ☑ | ☐ |
| Common | 2 | **Marshfin** | `marshfin` | Water | Day & night | Quick Step | Siphon | Sig: Riptide · Move: Sail | Hand-made | ☑ | ☐ |
| Common | 3 | **Mangrovore** | `mangrovore` | Water / Grass | Diurnal | Quick Step | Siphon | Sig: Riptide · Move: Sail | Hand-made | ☑ | ☐ |
| Prime | 1 | **Aquamite** | `ph-water-mono-prime-1` | Water | Day & night | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aqualing** | `ph-water-mono-prime-2` | Water | Day & night | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquaarch** | `ph-water-mono-prime-3` | Water | Day & night | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquawisp** | `ph-water-mono-apex-1` | Water | Day & night | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aquawyrm** | `ph-water-mono-apex-2` | Water | Day & night | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquatitan** | `ph-water-mono-apex-3` | Water | Day & night | Trailblazer | Rally | Move: Sail | Placeholder | ☐ | ☐ |
| Legendary | — | **Aquaeon** | `ph-water-mono-legendary` | Water | Day & night | Star Seeker | Slipstream | Move: Sail · Map: not placed | Placeholder | ☐ | ☐ |

## Astral / Charm

Spawns in: Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelbloomkit** | `ph-astral-charm-common-1` | Astral / Charm | Nocturnal | Sweet Scent | Siphon | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelbloomox** | `ph-astral-charm-common-2` | Astral / Charm | Nocturnal | Sweet Scent | Siphon | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelbloomor** | `ph-astral-charm-common-3` | Astral / Charm | Nocturnal | Sweet Scent | Siphon | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelbloommite** | `ph-astral-charm-prime-1` | Astral / Charm | Nocturnal | Star Seeker | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelbloomling** | `ph-astral-charm-prime-2` | Astral / Charm | Nocturnal | Star Seeker | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelbloomarch** | `ph-astral-charm-prime-3` | Astral / Charm | Nocturnal | Star Seeker | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelbloomwisp** | `ph-astral-charm-apex-1` | Astral / Charm | Nocturnal | Quick Step | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelbloomwyrm** | `ph-astral-charm-apex-2` | Astral / Charm | Nocturnal | Quick Step | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelbloomtitan** | `ph-astral-charm-apex-3` | Astral / Charm | Nocturnal | Quick Step | Tag Strike | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Stelbloomeon** | `ph-astral-charm-legendary` | Astral / Charm | Nocturnal | Sweet Scent | Siphon | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Astral / Electric

Spawns in: Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelvoltkit** | `ph-astral-electric-common-1` | Astral / Electric | Day & night | Baby-Doll Eyes | Rally | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelvoltox** | `ph-astral-electric-common-2` | Astral / Electric | Day & night | Baby-Doll Eyes | Rally | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelvoltor** | `ph-astral-electric-common-3` | Astral / Electric | Day & night | Baby-Doll Eyes | Rally | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelvoltmite** | `ph-astral-electric-prime-1` | Astral / Electric | Day & night | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelvoltling** | `ph-astral-electric-prime-2` | Astral / Electric | Day & night | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelvoltarch** | `ph-astral-electric-prime-3` | Astral / Electric | Day & night | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelvoltwisp** | `ph-astral-electric-apex-1` | Astral / Electric | Day & night | Lucky Charm | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelvoltwyrm** | `ph-astral-electric-apex-2` | Astral / Electric | Day & night | Lucky Charm | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelvolttitan** | `ph-astral-electric-apex-3` | Astral / Electric | Day & night | Lucky Charm | Shield Pass | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Stelvolteon** | `ph-astral-electric-legendary` | Astral / Electric | Day & night | Forager | Rally | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Astral / Fire

Spawns in: Mountain, Tundra, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelflarekit** | `ph-astral-fire-common-1` | Astral / Fire | Day & night | Keen Nose | Tag Strike | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelflareox** | `ph-astral-fire-common-2` | Astral / Fire | Day & night | Keen Nose | Tag Strike | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelflareor** | `ph-astral-fire-common-3` | Astral / Fire | Day & night | Keen Nose | Tag Strike | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelflaremite** | `ph-astral-fire-prime-1` | Astral / Fire | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelflareling** | `ph-astral-fire-prime-2` | Astral / Fire | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelflarearch** | `ph-astral-fire-prime-3` | Astral / Fire | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelflarewisp** | `ph-astral-fire-apex-1` | Astral / Fire | Day & night | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelflarewyrm** | `ph-astral-fire-apex-2` | Astral / Fire | Day & night | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelflaretitan** | `ph-astral-fire-apex-3` | Astral / Fire | Day & night | Sweet Scent | Slipstream | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Solstara** | `solstara` | Astral / Fire | Day & night | Star Seeker | Tag Strike | Move: Fly · Map: Sunspire Summit | Hand-made | ☑ | ☐ |

## Astral / Grass

Spawns in: Mountain, Tundra, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelleafkit** | `ph-astral-grass-common-1` | Astral / Grass | Day & night | Star Seeker | Shield Pass | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelleafox** | `ph-astral-grass-common-2` | Astral / Grass | Day & night | Star Seeker | Shield Pass | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelleafor** | `ph-astral-grass-common-3` | Astral / Grass | Day & night | Star Seeker | Shield Pass | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelleafmite** | `ph-astral-grass-prime-1` | Astral / Grass | Day & night | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelleafling** | `ph-astral-grass-prime-2` | Astral / Grass | Day & night | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelleafarch** | `ph-astral-grass-prime-3` | Astral / Grass | Day & night | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelleafwisp** | `ph-astral-grass-apex-1` | Astral / Grass | Day & night | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelleafwyrm** | `ph-astral-grass-apex-2` | Astral / Grass | Day & night | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelleaftitan** | `ph-astral-grass-apex-3` | Astral / Grass | Day & night | Baby-Doll Eyes | Siphon | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Stelleafeon** | `ph-astral-grass-legendary` | Astral / Grass | Day & night | Lucky Charm | Shield Pass | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Rock / Astral

Spawns in: Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Cragstarkit** | `ph-rock-astral-common-1` | Rock / Astral | Nocturnal | Baby-Doll Eyes | Slipstream | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 2 | **Cragstarox** | `ph-rock-astral-common-2` | Rock / Astral | Nocturnal | Baby-Doll Eyes | Slipstream | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 3 | **Cragstaror** | `ph-rock-astral-common-3` | Rock / Astral | Nocturnal | Baby-Doll Eyes | Slipstream | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Prime | 1 | **Cragstarmite** | `ph-rock-astral-prime-1` | Rock / Astral | Nocturnal | Trailblazer | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Cragstarling** | `ph-rock-astral-prime-2` | Rock / Astral | Nocturnal | Trailblazer | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Cragstararch** | `ph-rock-astral-prime-3` | Rock / Astral | Nocturnal | Trailblazer | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Cragstarwisp** | `ph-rock-astral-apex-1` | Rock / Astral | Nocturnal | Lucky Charm | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Cragstarwyrm** | `ph-rock-astral-apex-2` | Rock / Astral | Nocturnal | Lucky Charm | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Cragstartitan** | `ph-rock-astral-apex-3` | Rock / Astral | Nocturnal | Lucky Charm | Rally | Move: Tunnel | Placeholder | ☐ | ☐ |
| Legendary | — | **Cragstareon** | `ph-rock-astral-legendary` | Rock / Astral | Nocturnal | Trailblazer | Slipstream | Move: Tunnel · Map: not placed | Placeholder | ☐ | ☐ |

## Steel / Astral

Spawns in: Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Ferrostarkit** | `ph-steel-astral-common-1` | Steel / Astral | Nocturnal | Star Seeker | Siphon | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 2 | **Ferrostarox** | `ph-steel-astral-common-2` | Steel / Astral | Nocturnal | Star Seeker | Siphon | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 3 | **Ferrostaror** | `ph-steel-astral-common-3` | Steel / Astral | Nocturnal | Star Seeker | Siphon | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Prime | 1 | **Ferrostarmite** | `ph-steel-astral-prime-1` | Steel / Astral | Nocturnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferrostarling** | `ph-steel-astral-prime-2` | Steel / Astral | Nocturnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferrostararch** | `ph-steel-astral-prime-3` | Steel / Astral | Nocturnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferrostarwisp** | `ph-steel-astral-apex-1` | Steel / Astral | Nocturnal | Baby-Doll Eyes | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrostarwyrm** | `ph-steel-astral-apex-2` | Steel / Astral | Nocturnal | Baby-Doll Eyes | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrostartitan** | `ph-steel-astral-apex-3` | Steel / Astral | Nocturnal | Baby-Doll Eyes | Tag Strike | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Ferrostareon** | `ph-steel-astral-legendary` | Steel / Astral | Nocturnal | Baby-Doll Eyes | Siphon | Map: not placed | Placeholder | ☐ | ☐ |

## Water / Astral

Spawns in: Tundra, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Aquastarkit** | `ph-water-astral-common-1` | Water / Astral | Nocturnal | Forager | Rally | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 2 | **Aquastarox** | `ph-water-astral-common-2` | Water / Astral | Nocturnal | Forager | Rally | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 3 | **Aquastaror** | `ph-water-astral-common-3` | Water / Astral | Nocturnal | Forager | Rally | Sig: Riptide | Placeholder | ☐ | ☐ |
| Prime | 1 | **Aquastarmite** | `ph-water-astral-prime-1` | Water / Astral | Nocturnal | Sweet Scent | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aquastarling** | `ph-water-astral-prime-2` | Water / Astral | Nocturnal | Sweet Scent | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquastararch** | `ph-water-astral-prime-3` | Water / Astral | Nocturnal | Sweet Scent | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquastarwisp** | `ph-water-astral-apex-1` | Water / Astral | Nocturnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aquastarwyrm** | `ph-water-astral-apex-2` | Water / Astral | Nocturnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquastartitan** | `ph-water-astral-apex-3` | Water / Astral | Nocturnal | Star Seeker | Shield Pass | Move: Sail | Placeholder | ☐ | ☐ |
| Legendary | — | **Nimbalune** | `nimbalune` | Water / Astral | Nocturnal | Sweet Scent | Rally | Move: Fly · Map: Eye of the Sky | Hand-made | ☑ | ☐ |

## Charm / Electric

Spawns in: Meadow, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixivoltkit** | `ph-charm-electric-common-1` | Charm / Electric | Day & night | Sweet Scent | Tag Strike | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixivoltox** | `ph-charm-electric-common-2` | Charm / Electric | Day & night | Sweet Scent | Tag Strike | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixivoltor** | `ph-charm-electric-common-3` | Charm / Electric | Day & night | Sweet Scent | Tag Strike | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixivoltmite** | `ph-charm-electric-prime-1` | Charm / Electric | Day & night | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixivoltling** | `ph-charm-electric-prime-2` | Charm / Electric | Day & night | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixivoltarch** | `ph-charm-electric-prime-3` | Charm / Electric | Day & night | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixivoltwisp** | `ph-charm-electric-apex-1` | Charm / Electric | Day & night | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixivoltwyrm** | `ph-charm-electric-apex-2` | Charm / Electric | Day & night | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixivolttitan** | `ph-charm-electric-apex-3` | Charm / Electric | Day & night | Quick Step | Slipstream | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixivolteon** | `ph-charm-electric-legendary` | Charm / Electric | Day & night | Star Seeker | Tag Strike | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Charm / Fire

Spawns in: Forest, Fey Grove, Meadow, Lake, Cloud, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixiflarekit** | `ph-charm-fire-common-1` | Charm / Fire | Day & night | Baby-Doll Eyes | Shield Pass | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixiflareox** | `ph-charm-fire-common-2` | Charm / Fire | Day & night | Baby-Doll Eyes | Shield Pass | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixiflareor** | `ph-charm-fire-common-3` | Charm / Fire | Day & night | Baby-Doll Eyes | Shield Pass | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixiflaremite** | `ph-charm-fire-prime-1` | Charm / Fire | Day & night | Trailblazer | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixiflareling** | `ph-charm-fire-prime-2` | Charm / Fire | Day & night | Trailblazer | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixiflarearch** | `ph-charm-fire-prime-3` | Charm / Fire | Day & night | Trailblazer | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixiflarewisp** | `ph-charm-fire-apex-1` | Charm / Fire | Day & night | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixiflarewyrm** | `ph-charm-fire-apex-2` | Charm / Fire | Day & night | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixiflaretitan** | `ph-charm-fire-apex-3` | Charm / Fire | Day & night | Lucky Charm | Siphon | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixiflareeon** | `ph-charm-fire-legendary` | Charm / Fire | Day & night | Sweet Scent | Shield Pass | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Charm / Grass

Spawns in: Forest, Fey Grove, Meadow, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixileafkit** | `ph-charm-grass-common-1` | Charm / Grass | Day & night | Keen Nose | Slipstream | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixileafox** | `ph-charm-grass-common-2` | Charm / Grass | Day & night | Keen Nose | Slipstream | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixileafor** | `ph-charm-grass-common-3` | Charm / Grass | Day & night | Keen Nose | Slipstream | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixileafmite** | `ph-charm-grass-prime-1` | Charm / Grass | Day & night | Forager | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixileafling** | `ph-charm-grass-prime-2` | Charm / Grass | Day & night | Forager | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixileafarch** | `ph-charm-grass-prime-3` | Charm / Grass | Day & night | Forager | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixileafwisp** | `ph-charm-grass-apex-1` | Charm / Grass | Day & night | Sweet Scent | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixileafwyrm** | `ph-charm-grass-apex-2` | Charm / Grass | Day & night | Sweet Scent | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixileaftitan** | `ph-charm-grass-apex-3` | Charm / Grass | Day & night | Sweet Scent | Rally | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixileafeon** | `ph-charm-grass-legendary` | Charm / Grass | Day & night | Forager | Slipstream | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Charm / Rock

Spawns in: Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixistonekit** | `ph-charm-rock-common-1` | Charm / Rock | Nocturnal | Star Seeker | Siphon | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixistoneox** | `ph-charm-rock-common-2` | Charm / Rock | Nocturnal | Star Seeker | Siphon | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixistoneor** | `ph-charm-rock-common-3` | Charm / Rock | Nocturnal | Star Seeker | Siphon | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixistonemite** | `ph-charm-rock-prime-1` | Charm / Rock | Nocturnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixistoneling** | `ph-charm-rock-prime-2` | Charm / Rock | Nocturnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixistonearch** | `ph-charm-rock-prime-3` | Charm / Rock | Nocturnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixistonewisp** | `ph-charm-rock-apex-1` | Charm / Rock | Nocturnal | Baby-Doll Eyes | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixistonewyrm** | `ph-charm-rock-apex-2` | Charm / Rock | Nocturnal | Baby-Doll Eyes | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixistonetitan** | `ph-charm-rock-apex-3` | Charm / Rock | Nocturnal | Baby-Doll Eyes | Tag Strike | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixistoneeon** | `ph-charm-rock-legendary` | Charm / Rock | Nocturnal | Keen Nose | Siphon | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Steel / Charm

Spawns in: Mountain, Road, Coast.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Ferrobloomkit** | `ph-steel-charm-common-1` | Steel / Charm | Nocturnal | Baby-Doll Eyes | Rally | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 2 | **Ferrobloomox** | `ph-steel-charm-common-2` | Steel / Charm | Nocturnal | Baby-Doll Eyes | Rally | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 3 | **Ferrobloomor** | `ph-steel-charm-common-3` | Steel / Charm | Nocturnal | Baby-Doll Eyes | Rally | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Prime | 1 | **Ferrobloommite** | `ph-steel-charm-prime-1` | Steel / Charm | Nocturnal | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferrobloomling** | `ph-steel-charm-prime-2` | Steel / Charm | Nocturnal | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferrobloomarch** | `ph-steel-charm-prime-3` | Steel / Charm | Nocturnal | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferrobloomwisp** | `ph-steel-charm-apex-1` | Steel / Charm | Nocturnal | Lucky Charm | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrobloomwyrm** | `ph-steel-charm-apex-2` | Steel / Charm | Nocturnal | Lucky Charm | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrobloomtitan** | `ph-steel-charm-apex-3` | Steel / Charm | Nocturnal | Lucky Charm | Shield Pass | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Ferrobloomeon** | `ph-steel-charm-legendary` | Steel / Charm | Nocturnal | Lucky Charm | Rally | Map: not placed | Placeholder | ☐ | ☐ |

## Water / Charm

Spawns in: Lake, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Aquabloomkit** | `ph-water-charm-common-1` | Water / Charm | Nocturnal | Star Seeker | Tag Strike | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 2 | **Aquabloomox** | `ph-water-charm-common-2` | Water / Charm | Nocturnal | Star Seeker | Tag Strike | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 3 | **Aquabloomor** | `ph-water-charm-common-3` | Water / Charm | Nocturnal | Star Seeker | Tag Strike | Sig: Riptide | Placeholder | ☐ | ☐ |
| Prime | 1 | **Aquabloommite** | `ph-water-charm-prime-1` | Water / Charm | Nocturnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aquabloomling** | `ph-water-charm-prime-2` | Water / Charm | Nocturnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquabloomarch** | `ph-water-charm-prime-3` | Water / Charm | Nocturnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquabloomwisp** | `ph-water-charm-apex-1` | Water / Charm | Nocturnal | Baby-Doll Eyes | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aquabloomwyrm** | `ph-water-charm-apex-2` | Water / Charm | Nocturnal | Baby-Doll Eyes | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquabloomtitan** | `ph-water-charm-apex-3` | Water / Charm | Nocturnal | Baby-Doll Eyes | Slipstream | Move: Sail | Placeholder | ☐ | ☐ |
| Legendary | — | **Aquabloomeon** | `ph-water-charm-legendary` | Water / Charm | Nocturnal | Trailblazer | Tag Strike | Move: Sail · Map: Boglight Hollow | Placeholder | ☐ | ☐ |

## Electric / Fire

Spawns in: Desert.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapflarekit** | `ph-electric-fire-common-1` | Electric / Fire | Diurnal | Lucky Charm | Shield Pass | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapflareox** | `ph-electric-fire-common-2` | Electric / Fire | Diurnal | Lucky Charm | Shield Pass | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapflareor** | `ph-electric-fire-common-3` | Electric / Fire | Diurnal | Lucky Charm | Shield Pass | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapflaremite** | `ph-electric-fire-prime-1` | Electric / Fire | Diurnal | Keen Nose | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapflareling** | `ph-electric-fire-prime-2` | Electric / Fire | Diurnal | Keen Nose | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapflarearch** | `ph-electric-fire-prime-3` | Electric / Fire | Diurnal | Keen Nose | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapflarewisp** | `ph-electric-fire-apex-1` | Electric / Fire | Diurnal | Forager | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapflarewyrm** | `ph-electric-fire-apex-2` | Electric / Fire | Diurnal | Forager | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapflaretitan** | `ph-electric-fire-apex-3` | Electric / Fire | Diurnal | Forager | Siphon | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapflareeon** | `ph-electric-fire-legendary` | Electric / Fire | Diurnal | Baby-Doll Eyes | Shield Pass | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Electric / Grass

Spawns in: Meadow.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapleafkit** | `ph-electric-grass-common-1` | Electric / Grass | Diurnal | Sweet Scent | Slipstream | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapleafox** | `ph-electric-grass-common-2` | Electric / Grass | Diurnal | Sweet Scent | Slipstream | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapleafor** | `ph-electric-grass-common-3` | Electric / Grass | Diurnal | Sweet Scent | Slipstream | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapleafmite** | `ph-electric-grass-prime-1` | Electric / Grass | Diurnal | Star Seeker | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapleafling** | `ph-electric-grass-prime-2` | Electric / Grass | Diurnal | Star Seeker | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapleafarch** | `ph-electric-grass-prime-3` | Electric / Grass | Diurnal | Star Seeker | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapleafwisp** | `ph-electric-grass-apex-1` | Electric / Grass | Diurnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapleafwyrm** | `ph-electric-grass-apex-2` | Electric / Grass | Diurnal | Quick Step | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapleaftitan** | `ph-electric-grass-apex-3` | Electric / Grass | Diurnal | Quick Step | Rally | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapleafeon** | `ph-electric-grass-legendary` | Electric / Grass | Diurnal | Quick Step | Slipstream | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Electric / Rock

Spawns in: Desert, Badlands.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapstonekit** | `ph-electric-rock-common-1` | Electric / Rock | Diurnal | Baby-Doll Eyes | Siphon | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapstoneox** | `ph-electric-rock-common-2` | Electric / Rock | Diurnal | Baby-Doll Eyes | Siphon | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapstoneor** | `ph-electric-rock-common-3` | Electric / Rock | Diurnal | Baby-Doll Eyes | Siphon | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapstonemite** | `ph-electric-rock-prime-1` | Electric / Rock | Diurnal | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapstoneling** | `ph-electric-rock-prime-2` | Electric / Rock | Diurnal | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapstonearch** | `ph-electric-rock-prime-3` | Electric / Rock | Diurnal | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapstonewisp** | `ph-electric-rock-apex-1` | Electric / Rock | Diurnal | Lucky Charm | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapstonewyrm** | `ph-electric-rock-apex-2` | Electric / Rock | Diurnal | Lucky Charm | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapstonetitan** | `ph-electric-rock-apex-3` | Electric / Rock | Diurnal | Lucky Charm | Tag Strike | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapstoneeon** | `ph-electric-rock-legendary` | Electric / Rock | Diurnal | Star Seeker | Siphon | Move: Fly · Map: Dunecrown Mesa | Placeholder | ☐ | ☐ |

## Electric / Steel

Spawns in: Road.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapgearkit** | `ph-electric-steel-common-1` | Electric / Steel | Diurnal | Keen Nose | Rally | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapgearox** | `ph-electric-steel-common-2` | Electric / Steel | Diurnal | Keen Nose | Rally | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapgearor** | `ph-electric-steel-common-3` | Electric / Steel | Diurnal | Keen Nose | Rally | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapgearmite** | `ph-electric-steel-prime-1` | Electric / Steel | Diurnal | Forager | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapgearling** | `ph-electric-steel-prime-2` | Electric / Steel | Diurnal | Forager | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapgeararch** | `ph-electric-steel-prime-3` | Electric / Steel | Diurnal | Forager | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapgearwisp** | `ph-electric-steel-apex-1` | Electric / Steel | Diurnal | Sweet Scent | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapgearwyrm** | `ph-electric-steel-apex-2` | Electric / Steel | Diurnal | Sweet Scent | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapgeartitan** | `ph-electric-steel-apex-3` | Electric / Steel | Diurnal | Sweet Scent | Shield Pass | Move: Fly | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapgeareon** | `ph-electric-steel-legendary` | Electric / Steel | Diurnal | Sweet Scent | Rally | Move: Fly · Map: not placed | Placeholder | ☐ | ☐ |

## Water / Electric

Spawns in: Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Aquavoltkit** | `ph-water-electric-common-1` | Water / Electric | Diurnal | Sweet Scent | Tag Strike | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 2 | **Aquavoltox** | `ph-water-electric-common-2` | Water / Electric | Diurnal | Sweet Scent | Tag Strike | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 3 | **Aquavoltor** | `ph-water-electric-common-3` | Water / Electric | Diurnal | Sweet Scent | Tag Strike | Sig: Riptide | Placeholder | ☐ | ☐ |
| Prime | 1 | **Aquavoltmite** | `ph-water-electric-prime-1` | Water / Electric | Diurnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aquavoltling** | `ph-water-electric-prime-2` | Water / Electric | Diurnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquavoltarch** | `ph-water-electric-prime-3` | Water / Electric | Diurnal | Star Seeker | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquavoltwisp** | `ph-water-electric-apex-1` | Water / Electric | Diurnal | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aquavoltwyrm** | `ph-water-electric-apex-2` | Water / Electric | Diurnal | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquavolttitan** | `ph-water-electric-apex-3` | Water / Electric | Diurnal | Quick Step | Slipstream | Move: Sail | Placeholder | ☐ | ☐ |
| Legendary | — | **Aquavolteon** | `ph-water-electric-legendary` | Water / Electric | Diurnal | Forager | Tag Strike | Move: Sail · Map: not placed | Placeholder | ☐ | ☐ |

## Fire / Grass

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyroleafkit** | `ph-fire-grass-common-1` | Fire / Grass | Diurnal | Forager | Shield Pass | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyroleafox** | `ph-fire-grass-common-2` | Fire / Grass | Diurnal | Forager | Shield Pass | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyroleafor** | `ph-fire-grass-common-3` | Fire / Grass | Diurnal | Forager | Shield Pass | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyroleafmite** | `ph-fire-grass-prime-1` | Fire / Grass | Diurnal | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyroleafling** | `ph-fire-grass-prime-2` | Fire / Grass | Diurnal | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyroleafarch** | `ph-fire-grass-prime-3` | Fire / Grass | Diurnal | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyroleafwisp** | `ph-fire-grass-apex-1` | Fire / Grass | Diurnal | Star Seeker | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyroleafwyrm** | `ph-fire-grass-apex-2` | Fire / Grass | Diurnal | Star Seeker | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyroleaftitan** | `ph-fire-grass-apex-3` | Fire / Grass | Diurnal | Star Seeker | Siphon | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyroleafeon** | `ph-fire-grass-legendary` | Fire / Grass | Diurnal | Keen Nose | Shield Pass | Map: not placed | Placeholder | ☐ | ☐ |

## Fire / Rock

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyrostonekit** | `ph-fire-rock-common-1` | Fire / Rock | Diurnal | Quick Step | Slipstream | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyrostoneox** | `ph-fire-rock-common-2` | Fire / Rock | Diurnal | Quick Step | Slipstream | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyrostoneor** | `ph-fire-rock-common-3` | Fire / Rock | Diurnal | Quick Step | Slipstream | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyrostonemite** | `ph-fire-rock-prime-1` | Fire / Rock | Diurnal | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyrostoneling** | `ph-fire-rock-prime-2` | Fire / Rock | Diurnal | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyrostonearch** | `ph-fire-rock-prime-3` | Fire / Rock | Diurnal | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrostonewisp** | `ph-fire-rock-apex-1` | Fire / Rock | Diurnal | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrostonewyrm** | `ph-fire-rock-apex-2` | Fire / Rock | Diurnal | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrostonetitan** | `ph-fire-rock-apex-3` | Fire / Rock | Diurnal | Trailblazer | Rally | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyrostoneeon** | `ph-fire-rock-legendary` | Fire / Rock | Diurnal | Lucky Charm | Slipstream | Map: not placed | Placeholder | ☐ | ☐ |

## Fire / Steel

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyrogearkit** | `ph-fire-steel-common-1` | Fire / Steel | Diurnal | Lucky Charm | Siphon | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyrogearox** | `ph-fire-steel-common-2` | Fire / Steel | Diurnal | Lucky Charm | Siphon | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyrogearor** | `ph-fire-steel-common-3` | Fire / Steel | Diurnal | Lucky Charm | Siphon | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyrogearmite** | `ph-fire-steel-prime-1` | Fire / Steel | Diurnal | Keen Nose | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyrogearling** | `ph-fire-steel-prime-2` | Fire / Steel | Diurnal | Keen Nose | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyrogeararch** | `ph-fire-steel-prime-3` | Fire / Steel | Diurnal | Keen Nose | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrogearwisp** | `ph-fire-steel-apex-1` | Fire / Steel | Diurnal | Forager | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrogearwyrm** | `ph-fire-steel-apex-2` | Fire / Steel | Diurnal | Forager | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrogeartitan** | `ph-fire-steel-apex-3` | Fire / Steel | Diurnal | Forager | Tag Strike | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyrogeareon** | `ph-fire-steel-legendary` | Fire / Steel | Diurnal | Trailblazer | Siphon | Map: Caldera Heart | Placeholder | ☐ | ☐ |

## Fire / Water

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyrotidekit** | `ph-fire-water-common-1` | Fire / Water | Diurnal | Sweet Scent | Rally | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyrotideox** | `ph-fire-water-common-2` | Fire / Water | Diurnal | Sweet Scent | Rally | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyrotideor** | `ph-fire-water-common-3` | Fire / Water | Diurnal | Sweet Scent | Rally | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyrotidemite** | `ph-fire-water-prime-1` | Fire / Water | Diurnal | Star Seeker | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyrotideling** | `ph-fire-water-prime-2` | Fire / Water | Diurnal | Star Seeker | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyrotidearch** | `ph-fire-water-prime-3` | Fire / Water | Diurnal | Star Seeker | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrotidewisp** | `ph-fire-water-apex-1` | Fire / Water | Diurnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrotidewyrm** | `ph-fire-water-apex-2` | Fire / Water | Diurnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrotidetitan** | `ph-fire-water-apex-3` | Fire / Water | Diurnal | Quick Step | Shield Pass | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyrotideeon** | `ph-fire-water-legendary` | Fire / Water | Diurnal | Baby-Doll Eyes | Rally | Map: not placed | Placeholder | ☐ | ☐ |

## Grass / Rock

Spawns in: Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Sprigstonekit** | `ph-grass-rock-common-1` | Grass / Rock | Diurnal | Keen Nose | Tag Strike | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 2 | **Sprigstoneox** | `ph-grass-rock-common-2` | Grass / Rock | Diurnal | Keen Nose | Tag Strike | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 3 | **Sprigstoneor** | `ph-grass-rock-common-3` | Grass / Rock | Diurnal | Keen Nose | Tag Strike | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Prime | 1 | **Sprigstonemite** | `ph-grass-rock-prime-1` | Grass / Rock | Diurnal | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Sprigstoneling** | `ph-grass-rock-prime-2` | Grass / Rock | Diurnal | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Sprigstonearch** | `ph-grass-rock-prime-3` | Grass / Rock | Diurnal | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Sprigstonewisp** | `ph-grass-rock-apex-1` | Grass / Rock | Diurnal | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Sprigstonewyrm** | `ph-grass-rock-apex-2` | Grass / Rock | Diurnal | Sweet Scent | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Sprigstonetitan** | `ph-grass-rock-apex-3` | Grass / Rock | Diurnal | Sweet Scent | Slipstream | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Sprigstoneeon** | `ph-grass-rock-legendary` | Grass / Rock | Diurnal | Quick Step | Tag Strike | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Grass / Steel

Spawns in: Forest, Fey Grove, Meadow, River, Swamp, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Spriggearkit** | `ph-grass-steel-common-1` | Grass / Steel | Diurnal | Star Seeker | Shield Pass | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 2 | **Spriggearox** | `ph-grass-steel-common-2` | Grass / Steel | Diurnal | Star Seeker | Shield Pass | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 3 | **Spriggearor** | `ph-grass-steel-common-3` | Grass / Steel | Diurnal | Star Seeker | Shield Pass | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Prime | 1 | **Spriggearmite** | `ph-grass-steel-prime-1` | Grass / Steel | Diurnal | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Spriggearling** | `ph-grass-steel-prime-2` | Grass / Steel | Diurnal | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Spriggeararch** | `ph-grass-steel-prime-3` | Grass / Steel | Diurnal | Quick Step | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Spriggearwisp** | `ph-grass-steel-apex-1` | Grass / Steel | Diurnal | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Spriggearwyrm** | `ph-grass-steel-apex-2` | Grass / Steel | Diurnal | Baby-Doll Eyes | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Spriggeartitan** | `ph-grass-steel-apex-3` | Grass / Steel | Diurnal | Baby-Doll Eyes | Siphon | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Spriggeareon** | `ph-grass-steel-legendary` | Grass / Steel | Diurnal | Star Seeker | Shield Pass | Move: Wayfind · Map: not placed | Placeholder | ☐ | ☐ |

## Grass / Water

Spawns in: River, Swamp.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Sprigtidekit** | `ph-grass-water-common-1` | Grass / Water | Diurnal | Trailblazer | Slipstream | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 2 | **Sprigtideox** | `ph-grass-water-common-2` | Grass / Water | Diurnal | Trailblazer | Slipstream | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 3 | **Sprigtideor** | `ph-grass-water-common-3` | Grass / Water | Diurnal | Trailblazer | Slipstream | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Prime | 1 | **Sprigtidemite** | `ph-grass-water-prime-1` | Grass / Water | Diurnal | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Sprigtideling** | `ph-grass-water-prime-2` | Grass / Water | Diurnal | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Sprigtidearch** | `ph-grass-water-prime-3` | Grass / Water | Diurnal | Lucky Charm | Siphon | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Sprigtidewisp** | `ph-grass-water-apex-1` | Grass / Water | Diurnal | Keen Nose | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Sprigtidewyrm** | `ph-grass-water-apex-2` | Grass / Water | Diurnal | Keen Nose | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Sprigtidetitan** | `ph-grass-water-apex-3` | Grass / Water | Diurnal | Keen Nose | Rally | Move: Wayfind | Placeholder | ☐ | ☐ |
| Legendary | — | **Sprigtideeon** | `ph-grass-water-legendary` | Grass / Water | Diurnal | Sweet Scent | Slipstream | Move: Wayfind · Map: Willowheart Isle | Placeholder | ☐ | ☐ |

## Rock / Steel

Spawns in: Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Craggearkit** | `ph-rock-steel-common-1` | Rock / Steel | Day & night | Quick Step | Siphon | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 2 | **Craggearox** | `ph-rock-steel-common-2` | Rock / Steel | Day & night | Quick Step | Siphon | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 3 | **Craggearor** | `ph-rock-steel-common-3` | Rock / Steel | Day & night | Quick Step | Siphon | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Prime | 1 | **Craggearmite** | `ph-rock-steel-prime-1` | Rock / Steel | Day & night | Baby-Doll Eyes | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Craggearling** | `ph-rock-steel-prime-2` | Rock / Steel | Day & night | Baby-Doll Eyes | Rally | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Craggeararch** | `ph-rock-steel-prime-3` | Rock / Steel | Day & night | Baby-Doll Eyes | Rally | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Craggearwisp** | `ph-rock-steel-apex-1` | Rock / Steel | Day & night | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Craggearwyrm** | `ph-rock-steel-apex-2` | Rock / Steel | Day & night | Trailblazer | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Craggeartitan** | `ph-rock-steel-apex-3` | Rock / Steel | Day & night | Trailblazer | Tag Strike | Move: Tunnel | Placeholder | ☐ | ☐ |
| Legendary | — | **Craggeareon** | `ph-rock-steel-legendary` | Rock / Steel | Day & night | Forager | Siphon | Move: Tunnel · Map: not placed | Placeholder | ☐ | ☐ |

## Rock / Water

Spawns in: Mountain, Desert, Badlands, Volcanic, Canyon, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Cragtidekit** | `ph-rock-water-common-1` | Rock / Water | Day & night | Lucky Charm | Rally | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 2 | **Cragtideox** | `ph-rock-water-common-2` | Rock / Water | Day & night | Lucky Charm | Rally | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 3 | **Cragtideor** | `ph-rock-water-common-3` | Rock / Water | Day & night | Lucky Charm | Rally | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Prime | 1 | **Cragtidemite** | `ph-rock-water-prime-1` | Rock / Water | Day & night | Keen Nose | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Cragtideling** | `ph-rock-water-prime-2` | Rock / Water | Day & night | Keen Nose | Tag Strike | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Cragtidearch** | `ph-rock-water-prime-3` | Rock / Water | Day & night | Keen Nose | Tag Strike | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Cragtidewisp** | `ph-rock-water-apex-1` | Rock / Water | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Cragtidewyrm** | `ph-rock-water-apex-2` | Rock / Water | Day & night | Forager | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Cragtidetitan** | `ph-rock-water-apex-3` | Rock / Water | Day & night | Forager | Shield Pass | Move: Tunnel | Placeholder | ☐ | ☐ |
| Legendary | — | **Cragtideeon** | `ph-rock-water-legendary` | Rock / Water | Day & night | Keen Nose | Rally | Move: Tunnel · Map: not placed | Placeholder | ☐ | ☐ |

## Steel / Water

Spawns in: Coast.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Ferrotidekit** | `ph-steel-water-common-1` | Steel / Water | Day & night | Baby-Doll Eyes | Tag Strike | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 2 | **Ferrotideox** | `ph-steel-water-common-2` | Steel / Water | Day & night | Baby-Doll Eyes | Tag Strike | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 3 | **Ferrotideor** | `ph-steel-water-common-3` | Steel / Water | Day & night | Baby-Doll Eyes | Tag Strike | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Prime | 1 | **Ferrotidemite** | `ph-steel-water-prime-1` | Steel / Water | Day & night | Trailblazer | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferrotideling** | `ph-steel-water-prime-2` | Steel / Water | Day & night | Trailblazer | Shield Pass | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferrotidearch** | `ph-steel-water-prime-3` | Steel / Water | Day & night | Trailblazer | Shield Pass | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferrotidewisp** | `ph-steel-water-apex-1` | Steel / Water | Day & night | Lucky Charm | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrotidewyrm** | `ph-steel-water-apex-2` | Steel / Water | Day & night | Lucky Charm | Slipstream | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrotidetitan** | `ph-steel-water-apex-3` | Steel / Water | Day & night | Lucky Charm | Slipstream | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Thalassor** | `thalassor` | Water / Steel | Day & night | Lucky Charm | Shield Pass | Move: Sail · Map: Ironwake Shoals | Hand-made | ☑ | ☐ |

---

## Hand-made creatures outside the roster table

The original hand-made Prime and Apex creatures, from before the roster table existed. They appear in the wild but don’t fill a roster slot. Design could move them into a matching slot (replacing that slot’s placeholder family) or keep them as extras. Either way they need art.

| Family | Stage | Name | ID | Types | Out by | Ability | Affinity | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Prime | 1 | **Orbuddle** | `orbuddle` | Astral | Nocturnal | Lucky Charm | Shield Pass | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Nebulith** | `nebulith` | Astral / Rock | Nocturnal | Lucky Charm | Shield Pass | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Zenithar** | `zenithar` | Astral | Nocturnal | Star Seeker | Tag Strike | Move: Fly | Hand-made | ☑ | ☐ |
| Prime | 1 | **Puffwisp** | `puffwisp` | Charm | Nocturnal | Sweet Scent | Siphon | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Velvetuft** | `velvetuft` | Charm | Nocturnal | Sweet Scent | Siphon | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Mirageon** | `mirageon` | Charm / Water | Nocturnal | Lucky Charm | Tag Strike | Move: Sail | Hand-made | ☑ | ☐ |
| Prime | 1 | **Fizzlet** | `fizzlet` | Electric | Diurnal | Keen Nose | Tag Strike | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Arcwing** | `arcwing` | Electric | Diurnal | Keen Nose | Tag Strike | Move: Fly | Hand-made | ☑ | ☐ |
| Apex | 1 | **Tempestrix** | `tempestrix` | Electric / Astral | Day & night | Star Seeker | Tag Strike | Move: Fly | Hand-made | ☑ | ☐ |
| Prime | 1 | **Emberwick** | `emberwick` | Fire | Diurnal | Sweet Scent | Siphon | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Lavalume** | `lavalume` | Fire | Diurnal | Sweet Scent | Siphon | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Calderex** | `calderex` | Fire / Rock | Diurnal | Forager | Shield Pass | Move: Tunnel | Hand-made | ☑ | ☐ |
| Common | 1 | **Emberfish** | `emberfish` | Fire / Water | Diurnal | Forager | Slipstream | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Prime | 2 | **Cinderkoi** | `cinderkoi` | Fire / Water | Diurnal | Lucky Charm | Slipstream | Sig: Caldera Roar · Move: Sail | Hand-made | ☑ | ☐ |
| Prime | 1 | **Shadeleaf** | `shadeleaf` | Grass | Nocturnal | Keen Nose | Siphon | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Gloomoth** | `gloomoth` | Grass / Charm | Nocturnal | Keen Nose | Siphon | Move: Fly | Hand-made | ☑ | ☐ |
| Apex | 1 | **Canopyre** | `canopyre` | Grass | Diurnal | Sweet Scent | Rally | — | Hand-made | ☑ | ☐ |
| Prime | 1 | **Rubblet** | `rubblet` | Rock | Day & night | Lucky Charm | Rally | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Boulderon** | `boulderon` | Rock | Day & night | Lucky Charm | Rally | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Stratagon** | `stratagon` | Rock / Steel | Day & night | Keen Nose | Shield Pass | Move: Tunnel | Hand-made | ☑ | ☐ |
| Prime | 1 | **Cogling** | `cogling` | Steel | Day & night | Trailblazer | Rally | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Anvilisk** | `anvilisk` | Steel / Fire | Diurnal | Trailblazer | Rally | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Leviathorn** | `leviathorn` | Steel | Day & night | Quick Step | Shield Pass | Move: Sail | Hand-made | ☑ | ☐ |
| Prime | 1 | **Bubbloon** | `bubbloon` | Water | Day & night | Sweet Scent | Rally | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Tidecall** | `tidecall` | Water | Day & night | Sweet Scent | Rally | Move: Fly | Hand-made | ☑ | ☐ |
| Apex | 1 | **Gatormaw** | `gatormaw` | Water | Day & night | Quick Step | Tag Strike | Move: Sail | Hand-made | ☑ | ☐ |
