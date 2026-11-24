# Creature Checklist: placeholders to replace

*Generated from the game data by `npm run docs:creatures` (scripts/creature-checklist.ts). Regenerate after swapping creatures in rather than editing by hand.*

Every creature in the game, slot by slot. The roster has one **slot** for each type and dual-type combination (8 single + 28 dual = 36). Each slot holds a **Common**, **Prime** and **Apex** family of three evolution stages, plus one **Legendary**.

Generated **placeholders** (ids starting `ph-`) stand in until the real creature is designed and drawn. They have stats, moves and procedural models so the game is playable, but their names and looks are stand-ins.

## Progress

| | Count |
|---|---|
| Creatures in the game | 401 |
| Hand-made (design done, art to do) | 53 |
| Final art delivered | 0 of 401 |
| **Placeholders to replace** | **348** |
| Families (3 stages) to design | 105 of 113 |
| Legendaries to design | 33 of 36 |

## How to use this list

- **Design ☐**: the creature has a real name, concept, flavour text and stat direction. Tick ☑ when approved.
- **Art ☐**: the creature has final art (portrait and model or sprite). Tick ☑ when delivered. No creature has final art yet: every one, hand-made or placeholder, uses the procedural model.
- Hand-made creatures start with Design ☑ because they already have a real name, look and flavour text.
- **Types, biomes, Out by, Ability, Instinct and Signature** are the slot’s current game values. Designs can keep them or propose changes. **Out by** is when it roams the wild: Diurnal (day turns), Nocturnal (night turns) or Day & night. It comes from its types (Astral and Charm lean night; Fire, Grass and Electric lean day; with Rock, Steel or Water in it, or a mix, it is out at any time) unless set by hand (`ACTIVITY_OVERRIDE` in `src/data/species.ts`).
- **Instinct** is the creature's passive in battle (it fires on its own: when it takes the field, loses a heart, is hit, and so on). Every stage of a family shares one. All 48, with their exact rules and who has them: [14 · Instinct Checklist](./14-instinct-checklist.md).
- **Swapping one in (developers):** add the species in `src/data/species.ts`, then point its slot in `HANDMADE_SLOTS` or `HANDMADE_LEGENDARIES` (`src/data/roster.ts`) at it. The placeholder disappears; regenerate this file.
- A new Legendary also needs a roaming node on the map (`src/regions/margos/map.ts`).

## Slot overview

| # | Slot | Common | Prime | Apex | Legendary | Biomes |
|---|---|---|---|---|---|---|
| 1 | [Astral](#astral) | ☑ | ☐ | ☐ | ☐ | Tundra, Mountain |
| 2 | [Charm](#charm) | ☑ | ☐ | ☐ | ☐ | Fey Grove, Forest, Meadow |
| 3 | [Electric](#electric) | ☑ | ☐ | ☐ | ☐ | Badlands, Road, Desert |
| 4 | [Fire](#fire) | ☑ | ☐ | ☐ | ☐ | Volcanic, Desert |
| 5 | [Grass](#grass) | ☑ | ☐ | ☐ | ☐ | Forest, Meadow, Swamp, Fey Grove |
| 6 | [Rock](#rock) | ☑ | ☐ | ☐ | ☐ | Canyon, Mountain, Badlands, Volcanic |
| 7 | [Steel](#steel) | ☑ | ☐ | ☐ | ☐ | Coast, Road, Mountain |
| 8 | [Water](#water) | ☑ | ☐ | ☐ | ☐ | Lake, River, Swamp, Coast, Tundra |
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

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Twinkit** | `twinkit` | Astral | Nocturnal | Star Seeker | Starlit Gaze | Sig: Borealis Lance | Hand-made | ☑ | ☐ |
| Common | 2 | **Lumenox** | `lumenox` | Astral | Nocturnal | Star Seeker | Starlit Gaze | Sig: Borealis Lance | Hand-made | ☑ | ☐ |
| Common | 3 | **Polarion** | `polarion` | Astral / Water | Day & night | Star Seeker | Starlit Gaze | Sig: Borealis Lance | Hand-made | ☑ | ☐ |
| Prime | 1 | **Stelboo** | `ph-astral-mono-prime-1` | Astral | Nocturnal | Star Seeker | Comet Tail | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelshade** | `ph-astral-mono-prime-2` | Astral | Nocturnal | Star Seeker | Comet Tail | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Steldjinn** | `ph-astral-mono-prime-3` | Astral | Nocturnal | Star Seeker | Comet Tail | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelchick** | `ph-astral-mono-apex-1` | Astral | Nocturnal | Quick Step | Lucid Mind | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelwing** | `ph-astral-mono-apex-2` | Astral | Nocturnal | Quick Step | Lucid Mind | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelgale** | `ph-astral-mono-apex-3` | Astral | Nocturnal | Quick Step | Lucid Mind | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Steleon** | `ph-astral-mono-legendary` | Astral | Nocturnal | Sweet Scent | Supernova | Map: not placed | Placeholder | ☐ | ☐ |

## Charm

Spawns in: Fey Grove, Forest, Meadow.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Mossprite** | `mossprite` | Charm | Nocturnal | Baby-Doll Eyes | Disarming Smile | Sig: Moonveil Kiss | Hand-made | ☑ | ☐ |
| Common | 2 | **Fernixie** | `fernixie` | Charm | Nocturnal | Baby-Doll Eyes | Disarming Smile | Sig: Moonveil Kiss | Hand-made | ☑ | ☐ |
| Common | 3 | **Glamorwyn** | `glamorwyn` | Charm / Astral | Nocturnal | Baby-Doll Eyes | Disarming Smile | Sig: Moonveil Kiss | Hand-made | ☑ | ☐ |
| Prime | 1 | **Pixiwisp** | `ph-charm-mono-prime-1` | Charm | Nocturnal | Forager | Captivate | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixifae** | `ph-charm-mono-prime-2` | Charm | Nocturnal | Forager | Captivate | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixinymph** | `ph-charm-mono-prime-3` | Charm | Nocturnal | Forager | Captivate | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixicub** | `ph-charm-mono-apex-1` | Charm | Nocturnal | Sweet Scent | Pure Heart | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Piximane** | `ph-charm-mono-apex-2` | Charm | Nocturnal | Sweet Scent | Pure Heart | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixiregal** | `ph-charm-mono-apex-3` | Charm | Nocturnal | Sweet Scent | Pure Heart | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixieon** | `ph-charm-mono-legendary` | Charm | Nocturnal | Forager | Curtain Call | Map: not placed | Placeholder | ☐ | ☐ |

## Electric

Spawns in: Badlands, Road, Desert.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapup** | `zapup` | Electric | Diurnal | Trailblazer | Static Field | Sig: Stormcall | Hand-made | ☑ | ☐ |
| Common | 2 | **Voltusk** | `voltusk` | Electric | Diurnal | Trailblazer | Static Field | Sig: Stormcall | Hand-made | ☑ | ☐ |
| Common | 3 | **Stormhound** | `stormhound` | Electric / Steel | Day & night | Trailblazer | Static Field | Sig: Stormcall | Hand-made | ☑ | ☐ |
| Prime | 1 | **Zapcub** | `ph-electric-mono-prime-1` | Electric | Diurnal | Lucky Charm | Lock-On | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapmane** | `ph-electric-mono-prime-2` | Electric | Diurnal | Lucky Charm | Lock-On | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapregal** | `ph-electric-mono-prime-3` | Electric | Diurnal | Lucky Charm | Lock-On | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapnewt** | `ph-electric-mono-apex-1` | Electric | Diurnal | Keen Nose | Backup Battery | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapsaur** | `ph-electric-mono-apex-2` | Electric | Diurnal | Keen Nose | Backup Battery | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapdrake** | `ph-electric-mono-apex-3` | Electric | Diurnal | Keen Nose | Backup Battery | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapeon** | `ph-electric-mono-legendary` | Electric | Diurnal | Keen Nose | Storm Rider | Map: not placed | Placeholder | ☐ | ☐ |

## Fire

Spawns in: Volcanic, Desert.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Cindercub** | `cindercub` | Fire | Diurnal | Forager | Eruption | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Common | 2 | **Blazmane** | `blazmane` | Fire | Diurnal | Forager | Eruption | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Common | 3 | **Pyrothane** | `pyrothane` | Fire / Rock | Day & night | Forager | Eruption | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Prime | 1 | **Pyrogrub** | `ph-fire-mono-prime-1` | Fire | Diurnal | Baby-Doll Eyes | Sunbather | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyrobug** | `ph-fire-mono-prime-2` | Fire | Diurnal | Baby-Doll Eyes | Sunbather | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyroscarab** | `ph-fire-mono-prime-3` | Fire | Diurnal | Baby-Doll Eyes | Sunbather | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrodrip** | `ph-fire-mono-apex-1` | Fire | Diurnal | Trailblazer | Wildfire | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrogoo** | `ph-fire-mono-apex-2` | Fire | Diurnal | Trailblazer | Wildfire | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrogloop** | `ph-fire-mono-apex-3` | Fire | Diurnal | Trailblazer | Wildfire | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyroeon** | `ph-fire-mono-legendary` | Fire | Diurnal | Lucky Charm | Stoke | Map: not placed | Placeholder | ☐ | ☐ |

## Grass

Spawns in: Forest, Meadow, Swamp, Fey Grove.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Sproutle** | `sproutle` | Grass | Diurnal | Forager | Deep Roots | Sig: Overgrowth | Hand-made | ☑ | ☐ |
| Common | 2 | **Thornback** | `thornback` | Grass | Diurnal | Forager | Deep Roots | Sig: Overgrowth | Hand-made | ☑ | ☐ |
| Common | 3 | **Redwarden** | `redwarden` | Grass / Rock | Day & night | Forager | Deep Roots | Sig: Overgrowth | Hand-made | ☑ | ☐ |
| Prime | 1 | **Sprigtad** | `ph-grass-mono-prime-1` | Grass | Diurnal | Star Seeker | Spore Puff | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Sprigtoad** | `ph-grass-mono-prime-2` | Grass | Diurnal | Star Seeker | Spore Puff | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Sprigcroak** | `ph-grass-mono-prime-3` | Grass | Diurnal | Star Seeker | Spore Puff | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Sprignewt** | `ph-grass-mono-apex-1` | Grass | Diurnal | Quick Step | Bloomrush | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Sprigsaur** | `ph-grass-mono-apex-2` | Grass | Diurnal | Quick Step | Bloomrush | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Sprigdrake** | `ph-grass-mono-apex-3` | Grass | Diurnal | Quick Step | Bloomrush | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Sprigeon** | `ph-grass-mono-legendary` | Grass | Diurnal | Trailblazer | Firm Roots | Map: not placed | Placeholder | ☐ | ☐ |

## Rock

Spawns in: Canyon, Mountain, Badlands, Volcanic.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pebbark** | `pebbark` | Rock | Day & night | Keen Nose | Menace | Sig: Mesa Breaker | Hand-made | ☑ | ☐ |
| Common | 2 | **Cragjaw** | `cragjaw` | Rock | Day & night | Keen Nose | Menace | Sig: Mesa Breaker | Hand-made | ☑ | ☐ |
| Common | 3 | **Mesahound** | `mesahound` | Rock | Day & night | Keen Nose | Menace | Sig: Mesa Breaker | Hand-made | ☑ | ☐ |
| Prime | 1 | **Craggrub** | `ph-rock-mono-prime-1` | Rock | Day & night | Forager | Jagged Shell | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Cragbug** | `ph-rock-mono-prime-2` | Rock | Day & night | Forager | Jagged Shell | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Cragscarab** | `ph-rock-mono-prime-3` | Rock | Day & night | Forager | Jagged Shell | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Cragnewt** | `ph-rock-mono-apex-1` | Rock | Day & night | Sweet Scent | Rockfall | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Cragsaur** | `ph-rock-mono-apex-2` | Rock | Day & night | Sweet Scent | Rockfall | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Cragdrake** | `ph-rock-mono-apex-3` | Rock | Day & night | Sweet Scent | Rockfall | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Crageon** | `ph-rock-mono-legendary` | Rock | Day & night | Baby-Doll Eyes | Dust Devil | Map: not placed | Placeholder | ☐ | ☐ |

## Steel

Spawns in: Coast, Road, Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Rivetail** | `rivetail` | Steel | Day & night | Baby-Doll Eyes | Steel Coat | Sig: Foundry Hammer | Hand-made | ☑ | ☐ |
| Common | 2 | **Ferrocrab** | `ferrocrab` | Steel | Day & night | Baby-Doll Eyes | Steel Coat | Sig: Foundry Hammer | Hand-made | ☑ | ☐ |
| Common | 3 | **Ironclawd** | `ironclawd` | Steel / Water | Day & night | Baby-Doll Eyes | Steel Coat | Sig: Foundry Hammer | Hand-made | ☑ | ☐ |
| Prime | 1 | **Ferrochimp** | `ph-steel-mono-prime-1` | Steel | Day & night | Lucky Charm | Corrode | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferrogrip** | `ph-steel-mono-prime-2` | Steel | Day & night | Lucky Charm | Corrode | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferrobrute** | `ph-steel-mono-prime-3` | Steel | Day & night | Lucky Charm | Corrode | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferronewt** | `ph-steel-mono-apex-1` | Steel | Day & night | Keen Nose | Iron Will | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrosaur** | `ph-steel-mono-apex-2` | Steel | Day & night | Keen Nose | Iron Will | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrodrake** | `ph-steel-mono-apex-3` | Steel | Day & night | Keen Nose | Iron Will | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Ferroeon** | `ph-steel-mono-legendary` | Steel | Day & night | Quick Step | Tempered | Map: not placed | Placeholder | ☐ | ☐ |

## Water

Spawns in: Lake, River, Swamp, Coast, Tundra.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Puddlit** | `puddlit` | Water | Day & night | Quick Step | Rain Dancer | Sig: Riptide | Hand-made | ☑ | ☐ |
| Common | 2 | **Marshfin** | `marshfin` | Water | Day & night | Quick Step | Rain Dancer | Sig: Riptide | Hand-made | ☑ | ☐ |
| Common | 3 | **Mangrovore** | `mangrovore` | Water / Grass | Day & night | Quick Step | Rain Dancer | Sig: Riptide | Hand-made | ☑ | ☐ |
| Prime | 1 | **Aquanewt** | `ph-water-mono-prime-1` | Water | Day & night | Baby-Doll Eyes | Second Wave | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aquasaur** | `ph-water-mono-prime-2` | Water | Day & night | Baby-Doll Eyes | Second Wave | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquadrake** | `ph-water-mono-prime-3` | Water | Day & night | Baby-Doll Eyes | Second Wave | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquapip** | `ph-water-mono-apex-1` | Water | Day & night | Trailblazer | Wet Coat | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aqualing** | `ph-water-mono-apex-2` | Water | Day & night | Trailblazer | Wet Coat | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquaarch** | `ph-water-mono-apex-3` | Water | Day & night | Trailblazer | Wet Coat | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Aquaeon** | `ph-water-mono-legendary` | Water | Day & night | Star Seeker | Undercurrent | Map: not placed | Placeholder | ☐ | ☐ |

## Astral / Charm

Spawns in: Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelbloomboo** | `ph-astral-charm-common-1` | Astral / Charm | Nocturnal | Sweet Scent | Starlit Gaze | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelbloomshade** | `ph-astral-charm-common-2` | Astral / Charm | Nocturnal | Sweet Scent | Starlit Gaze | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelbloomdjinn** | `ph-astral-charm-common-3` | Astral / Charm | Nocturnal | Sweet Scent | Starlit Gaze | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelbloomchick** | `ph-astral-charm-prime-1` | Astral / Charm | Nocturnal | Star Seeker | Disarming Smile | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelbloomwing** | `ph-astral-charm-prime-2` | Astral / Charm | Nocturnal | Star Seeker | Disarming Smile | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelbloomgale** | `ph-astral-charm-prime-3` | Astral / Charm | Nocturnal | Star Seeker | Disarming Smile | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelbloomcub** | `ph-astral-charm-apex-1` | Astral / Charm | Nocturnal | Quick Step | Fixed Star | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelbloommane** | `ph-astral-charm-apex-2` | Astral / Charm | Nocturnal | Quick Step | Fixed Star | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelbloomregal** | `ph-astral-charm-apex-3` | Astral / Charm | Nocturnal | Quick Step | Fixed Star | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Stelbloomeon** | `ph-astral-charm-legendary` | Astral / Charm | Nocturnal | Sweet Scent | Glamour | Map: not placed | Placeholder | ☐ | ☐ |

## Astral / Electric

Spawns in: Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelvolthop** | `ph-astral-electric-common-1` | Astral / Electric | Day & night | Baby-Doll Eyes | Shadow | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelvolthare** | `ph-astral-electric-common-2` | Astral / Electric | Day & night | Baby-Doll Eyes | Shadow | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelvoltjack** | `ph-astral-electric-common-3` | Astral / Electric | Day & night | Baby-Doll Eyes | Shadow | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelvoltkit** | `ph-astral-electric-prime-1` | Astral / Electric | Day & night | Trailblazer | Static Field | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelvoltpard** | `ph-astral-electric-prime-2` | Astral / Electric | Day & night | Trailblazer | Static Field | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelvoltox** | `ph-astral-electric-prime-3` | Astral / Electric | Day & night | Trailblazer | Static Field | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelvoltwisp** | `ph-astral-electric-apex-1` | Astral / Electric | Day & night | Lucky Charm | Comet Tail | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelvoltfae** | `ph-astral-electric-apex-2` | Astral / Electric | Day & night | Lucky Charm | Comet Tail | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelvoltnymph** | `ph-astral-electric-apex-3` | Astral / Electric | Day & night | Lucky Charm | Comet Tail | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Stelvolteon** | `ph-astral-electric-legendary` | Astral / Electric | Day & night | Forager | Overclock | Map: not placed | Placeholder | ☐ | ☐ |

## Astral / Fire

Spawns in: Mountain, Tundra, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelflarechick** | `ph-astral-fire-common-1` | Astral / Fire | Day & night | Keen Nose | Lucid Mind | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelflarewing** | `ph-astral-fire-common-2` | Astral / Fire | Day & night | Keen Nose | Lucid Mind | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelflaregale** | `ph-astral-fire-common-3` | Astral / Fire | Day & night | Keen Nose | Lucid Mind | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelflarecub** | `ph-astral-fire-prime-1` | Astral / Fire | Day & night | Forager | Eruption | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelflaremane** | `ph-astral-fire-prime-2` | Astral / Fire | Day & night | Forager | Eruption | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelflareregal** | `ph-astral-fire-prime-3` | Astral / Fire | Day & night | Forager | Eruption | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelflareboo** | `ph-astral-fire-apex-1` | Astral / Fire | Day & night | Sweet Scent | Supernova | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelflareshade** | `ph-astral-fire-apex-2` | Astral / Fire | Day & night | Sweet Scent | Supernova | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelflaredjinn** | `ph-astral-fire-apex-3` | Astral / Fire | Day & night | Sweet Scent | Supernova | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Solstara** | `solstara` | Astral / Fire | Day & night | Star Seeker | Comet Tail | Map: Sunspire Summit | Hand-made | ☑ | ☐ |

## Astral / Grass

Spawns in: Mountain, Tundra, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Stelleafkit** | `ph-astral-grass-common-1` | Astral / Grass | Day & night | Star Seeker | Starlit Gaze | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Stelleafpard** | `ph-astral-grass-common-2` | Astral / Grass | Day & night | Star Seeker | Starlit Gaze | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Stelleafox** | `ph-astral-grass-common-3` | Astral / Grass | Day & night | Star Seeker | Starlit Gaze | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Prime | 1 | **Stelleafwisp** | `ph-astral-grass-prime-1` | Astral / Grass | Day & night | Quick Step | Deep Roots | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Stelleaffae** | `ph-astral-grass-prime-2` | Astral / Grass | Day & night | Quick Step | Deep Roots | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Stelleafnymph** | `ph-astral-grass-prime-3` | Astral / Grass | Day & night | Quick Step | Deep Roots | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Stelleafhop** | `ph-astral-grass-apex-1` | Astral / Grass | Day & night | Baby-Doll Eyes | Fixed Star | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Stelleafhare** | `ph-astral-grass-apex-2` | Astral / Grass | Day & night | Baby-Doll Eyes | Fixed Star | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Stelleafjack** | `ph-astral-grass-apex-3` | Astral / Grass | Day & night | Baby-Doll Eyes | Fixed Star | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Stelleafeon** | `ph-astral-grass-legendary` | Astral / Grass | Day & night | Lucky Charm | Bramble Coat | Map: not placed | Placeholder | ☐ | ☐ |

## Rock / Astral

Spawns in: Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Cragstarchimp** | `ph-rock-astral-common-1` | Rock / Astral | Day & night | Baby-Doll Eyes | Menace | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 2 | **Cragstargrip** | `ph-rock-astral-common-2` | Rock / Astral | Day & night | Baby-Doll Eyes | Menace | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 3 | **Cragstarbrute** | `ph-rock-astral-common-3` | Rock / Astral | Day & night | Baby-Doll Eyes | Menace | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Prime | 1 | **Cragstarnub** | `ph-rock-astral-prime-1` | Rock / Astral | Day & night | Trailblazer | Shadow | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Cragstarhulk** | `ph-rock-astral-prime-2` | Rock / Astral | Day & night | Trailblazer | Shadow | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Cragstartitan** | `ph-rock-astral-prime-3` | Rock / Astral | Day & night | Trailblazer | Shadow | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Cragstarkit** | `ph-rock-astral-apex-1` | Rock / Astral | Day & night | Lucky Charm | Hold Fast | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Cragstarpard** | `ph-rock-astral-apex-2` | Rock / Astral | Day & night | Lucky Charm | Hold Fast | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Cragstarox** | `ph-rock-astral-apex-3` | Rock / Astral | Day & night | Lucky Charm | Hold Fast | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Cragstareon** | `ph-rock-astral-legendary` | Rock / Astral | Day & night | Trailblazer | Comet Tail | Map: not placed | Placeholder | ☐ | ☐ |

## Steel / Astral

Spawns in: Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Ferrostarnub** | `ph-steel-astral-common-1` | Steel / Astral | Day & night | Star Seeker | Steel Coat | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 2 | **Ferrostarhulk** | `ph-steel-astral-common-2` | Steel / Astral | Day & night | Star Seeker | Steel Coat | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 3 | **Ferrostartitan** | `ph-steel-astral-common-3` | Steel / Astral | Day & night | Star Seeker | Steel Coat | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Prime | 1 | **Ferrostarworm** | `ph-steel-astral-prime-1` | Steel / Astral | Day & night | Quick Step | Lucid Mind | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferrostarcoil** | `ph-steel-astral-prime-2` | Steel / Astral | Day & night | Quick Step | Lucid Mind | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferrostarwyrm** | `ph-steel-astral-prime-3` | Steel / Astral | Day & night | Quick Step | Lucid Mind | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferrostarcub** | `ph-steel-astral-apex-1` | Steel / Astral | Day & night | Baby-Doll Eyes | Keen Edge | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrostarmane** | `ph-steel-astral-apex-2` | Steel / Astral | Day & night | Baby-Doll Eyes | Keen Edge | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrostarregal** | `ph-steel-astral-apex-3` | Steel / Astral | Day & night | Baby-Doll Eyes | Keen Edge | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Ferrostareon** | `ph-steel-astral-legendary` | Steel / Astral | Day & night | Baby-Doll Eyes | Supernova | Map: not placed | Placeholder | ☐ | ☐ |

## Water / Astral

Spawns in: Tundra, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Aquastartad** | `ph-water-astral-common-1` | Water / Astral | Day & night | Forager | Rain Dancer | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 2 | **Aquastartoad** | `ph-water-astral-common-2` | Water / Astral | Day & night | Forager | Rain Dancer | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 3 | **Aquastarcroak** | `ph-water-astral-common-3` | Water / Astral | Day & night | Forager | Rain Dancer | Sig: Riptide | Placeholder | ☐ | ☐ |
| Prime | 1 | **Aquastarworm** | `ph-water-astral-prime-1` | Water / Astral | Day & night | Sweet Scent | Starlit Gaze | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aquastarcoil** | `ph-water-astral-prime-2` | Water / Astral | Day & night | Sweet Scent | Starlit Gaze | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquastarwyrm** | `ph-water-astral-prime-3` | Water / Astral | Day & night | Sweet Scent | Starlit Gaze | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquastardrip** | `ph-water-astral-apex-1` | Water / Astral | Day & night | Star Seeker | Fresh Spring | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aquastargoo** | `ph-water-astral-apex-2` | Water / Astral | Day & night | Star Seeker | Fresh Spring | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquastargloop** | `ph-water-astral-apex-3` | Water / Astral | Day & night | Star Seeker | Fresh Spring | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Nimbalune** | `nimbalune` | Water / Astral | Day & night | Sweet Scent | Second Wave | Map: Eye of the Sky | Hand-made | ☑ | ☐ |

## Charm / Electric

Spawns in: Meadow, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixivoltwisp** | `ph-charm-electric-common-1` | Charm / Electric | Day & night | Sweet Scent | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixivoltfae** | `ph-charm-electric-common-2` | Charm / Electric | Day & night | Sweet Scent | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixivoltnymph** | `ph-charm-electric-common-3` | Charm / Electric | Day & night | Sweet Scent | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixivoltcub** | `ph-charm-electric-prime-1` | Charm / Electric | Day & night | Star Seeker | Hair Trigger | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixivoltmane** | `ph-charm-electric-prime-2` | Charm / Electric | Day & night | Star Seeker | Hair Trigger | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixivoltregal** | `ph-charm-electric-prime-3` | Charm / Electric | Day & night | Star Seeker | Hair Trigger | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixivolthop** | `ph-charm-electric-apex-1` | Charm / Electric | Day & night | Quick Step | Captivate | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixivolthare** | `ph-charm-electric-apex-2` | Charm / Electric | Day & night | Quick Step | Captivate | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixivoltjack** | `ph-charm-electric-apex-3` | Charm / Electric | Day & night | Quick Step | Captivate | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixivolteon** | `ph-charm-electric-legendary` | Charm / Electric | Day & night | Star Seeker | Lock-On | Map: not placed | Placeholder | ☐ | ☐ |

## Charm / Fire

Spawns in: Forest, Fey Grove, Meadow, Lake, Cloud, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixiflareworm** | `ph-charm-fire-common-1` | Charm / Fire | Day & night | Baby-Doll Eyes | Pure Heart | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixiflarecoil** | `ph-charm-fire-common-2` | Charm / Fire | Day & night | Baby-Doll Eyes | Pure Heart | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixiflarewyrm** | `ph-charm-fire-common-3` | Charm / Fire | Day & night | Baby-Doll Eyes | Pure Heart | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixiflaredrip** | `ph-charm-fire-prime-1` | Charm / Fire | Day & night | Trailblazer | Ember Hide | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixiflaregoo** | `ph-charm-fire-prime-2` | Charm / Fire | Day & night | Trailblazer | Ember Hide | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixiflaregloop** | `ph-charm-fire-prime-3` | Charm / Fire | Day & night | Trailblazer | Ember Hide | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixiflareboo** | `ph-charm-fire-apex-1` | Charm / Fire | Day & night | Lucky Charm | Curtain Call | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixiflareshade** | `ph-charm-fire-apex-2` | Charm / Fire | Day & night | Lucky Charm | Curtain Call | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixiflaredjinn** | `ph-charm-fire-apex-3` | Charm / Fire | Day & night | Lucky Charm | Curtain Call | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixiflareeon** | `ph-charm-fire-legendary` | Charm / Fire | Day & night | Sweet Scent | Last Blaze | Map: not placed | Placeholder | ☐ | ☐ |

## Charm / Grass

Spawns in: Forest, Fey Grove, Meadow, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixileafcub** | `ph-charm-grass-common-1` | Charm / Grass | Day & night | Keen Nose | Disarming Smile | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixileafmane** | `ph-charm-grass-common-2` | Charm / Grass | Day & night | Keen Nose | Disarming Smile | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixileafregal** | `ph-charm-grass-common-3` | Charm / Grass | Day & night | Keen Nose | Disarming Smile | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixileafhop** | `ph-charm-grass-prime-1` | Charm / Grass | Day & night | Forager | Creeping Vines | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixileafhare** | `ph-charm-grass-prime-2` | Charm / Grass | Day & night | Forager | Creeping Vines | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixileafjack** | `ph-charm-grass-prime-3` | Charm / Grass | Day & night | Forager | Creeping Vines | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixileafwisp** | `ph-charm-grass-apex-1` | Charm / Grass | Day & night | Sweet Scent | Glamour | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixileaffae** | `ph-charm-grass-apex-2` | Charm / Grass | Day & night | Sweet Scent | Glamour | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixileafnymph** | `ph-charm-grass-apex-3` | Charm / Grass | Day & night | Sweet Scent | Glamour | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixileafeon** | `ph-charm-grass-legendary` | Charm / Grass | Day & night | Forager | Spore Puff | Map: not placed | Placeholder | ☐ | ☐ |

## Charm / Rock

Spawns in: Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pixistonedrip** | `ph-charm-rock-common-1` | Charm / Rock | Day & night | Star Seeker | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Pixistonegoo** | `ph-charm-rock-common-2` | Charm / Rock | Day & night | Star Seeker | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Pixistonegloop** | `ph-charm-rock-common-3` | Charm / Rock | Day & night | Star Seeker | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pixistoneboo** | `ph-charm-rock-prime-1` | Charm / Rock | Day & night | Quick Step | Bedrock | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pixistoneshade** | `ph-charm-rock-prime-2` | Charm / Rock | Day & night | Quick Step | Bedrock | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pixistonedjinn** | `ph-charm-rock-prime-3` | Charm / Rock | Day & night | Quick Step | Bedrock | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pixistoneworm** | `ph-charm-rock-apex-1` | Charm / Rock | Day & night | Baby-Doll Eyes | Captivate | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pixistonecoil** | `ph-charm-rock-apex-2` | Charm / Rock | Day & night | Baby-Doll Eyes | Captivate | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pixistonewyrm** | `ph-charm-rock-apex-3` | Charm / Rock | Day & night | Baby-Doll Eyes | Captivate | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pixistoneeon** | `ph-charm-rock-legendary` | Charm / Rock | Day & night | Keen Nose | Jagged Shell | Map: not placed | Placeholder | ☐ | ☐ |

## Steel / Charm

Spawns in: Mountain, Road, Coast.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Ferrobloomnub** | `ph-steel-charm-common-1` | Steel / Charm | Day & night | Baby-Doll Eyes | Polished Plate | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 2 | **Ferrobloomhulk** | `ph-steel-charm-common-2` | Steel / Charm | Day & night | Baby-Doll Eyes | Polished Plate | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 3 | **Ferrobloomtitan** | `ph-steel-charm-common-3` | Steel / Charm | Day & night | Baby-Doll Eyes | Polished Plate | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Prime | 1 | **Ferrobloomworm** | `ph-steel-charm-prime-1` | Steel / Charm | Day & night | Trailblazer | Pure Heart | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferrobloomcoil** | `ph-steel-charm-prime-2` | Steel / Charm | Day & night | Trailblazer | Pure Heart | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferrobloomwyrm** | `ph-steel-charm-prime-3` | Steel / Charm | Day & night | Trailblazer | Pure Heart | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferrobloomcub** | `ph-steel-charm-apex-1` | Steel / Charm | Day & night | Lucky Charm | Corrode | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrobloommane** | `ph-steel-charm-apex-2` | Steel / Charm | Day & night | Lucky Charm | Corrode | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrobloomregal** | `ph-steel-charm-apex-3` | Steel / Charm | Day & night | Lucky Charm | Corrode | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Ferrobloomeon** | `ph-steel-charm-legendary` | Steel / Charm | Day & night | Lucky Charm | Curtain Call | Map: not placed | Placeholder | ☐ | ☐ |

## Water / Charm

Spawns in: Lake, Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Aquabloomtad** | `ph-water-charm-common-1` | Water / Charm | Day & night | Star Seeker | Slick Scales | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 2 | **Aquabloomtoad** | `ph-water-charm-common-2` | Water / Charm | Day & night | Star Seeker | Slick Scales | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 3 | **Aquabloomcroak** | `ph-water-charm-common-3` | Water / Charm | Day & night | Star Seeker | Slick Scales | Sig: Riptide | Placeholder | ☐ | ☐ |
| Prime | 1 | **Aquabloomworm** | `ph-water-charm-prime-1` | Water / Charm | Day & night | Quick Step | Disarming Smile | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aquabloomcoil** | `ph-water-charm-prime-2` | Water / Charm | Day & night | Quick Step | Disarming Smile | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquabloomwyrm** | `ph-water-charm-prime-3` | Water / Charm | Day & night | Quick Step | Disarming Smile | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquabloomdrip** | `ph-water-charm-apex-1` | Water / Charm | Day & night | Baby-Doll Eyes | Second Wave | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aquabloomgoo** | `ph-water-charm-apex-2` | Water / Charm | Day & night | Baby-Doll Eyes | Second Wave | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquabloomgloop** | `ph-water-charm-apex-3` | Water / Charm | Day & night | Baby-Doll Eyes | Second Wave | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Aquabloomeon** | `ph-water-charm-legendary` | Water / Charm | Day & night | Trailblazer | Glamour | Map: Boglight Hollow | Placeholder | ☐ | ☐ |

## Electric / Fire

Spawns in: Desert.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapflarekit** | `ph-electric-fire-common-1` | Electric / Fire | Diurnal | Lucky Charm | Backup Battery | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapflarepard** | `ph-electric-fire-common-2` | Electric / Fire | Diurnal | Lucky Charm | Backup Battery | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapflareox** | `ph-electric-fire-common-3` | Electric / Fire | Diurnal | Lucky Charm | Backup Battery | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapflarehop** | `ph-electric-fire-prime-1` | Electric / Fire | Diurnal | Keen Nose | Sunbather | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapflarehare** | `ph-electric-fire-prime-2` | Electric / Fire | Diurnal | Keen Nose | Sunbather | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapflarejack** | `ph-electric-fire-prime-3` | Electric / Fire | Diurnal | Keen Nose | Sunbather | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapflarechick** | `ph-electric-fire-apex-1` | Electric / Fire | Diurnal | Forager | Storm Rider | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapflarewing** | `ph-electric-fire-apex-2` | Electric / Fire | Diurnal | Forager | Storm Rider | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapflaregale** | `ph-electric-fire-apex-3` | Electric / Fire | Diurnal | Forager | Storm Rider | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapflareeon** | `ph-electric-fire-legendary` | Electric / Fire | Diurnal | Baby-Doll Eyes | Wildfire | Map: not placed | Placeholder | ☐ | ☐ |

## Electric / Grass

Spawns in: Meadow.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapleafcub** | `ph-electric-grass-common-1` | Electric / Grass | Diurnal | Sweet Scent | Static Field | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapleafmane** | `ph-electric-grass-common-2` | Electric / Grass | Diurnal | Sweet Scent | Static Field | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapleafregal** | `ph-electric-grass-common-3` | Electric / Grass | Diurnal | Sweet Scent | Static Field | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapleafnewt** | `ph-electric-grass-prime-1` | Electric / Grass | Diurnal | Star Seeker | Bloomrush | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapleafsaur** | `ph-electric-grass-prime-2` | Electric / Grass | Diurnal | Star Seeker | Bloomrush | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapleafdrake** | `ph-electric-grass-prime-3` | Electric / Grass | Diurnal | Star Seeker | Bloomrush | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapleafgrub** | `ph-electric-grass-apex-1` | Electric / Grass | Diurnal | Quick Step | Overclock | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapleafbug** | `ph-electric-grass-apex-2` | Electric / Grass | Diurnal | Quick Step | Overclock | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapleafscarab** | `ph-electric-grass-apex-3` | Electric / Grass | Diurnal | Quick Step | Overclock | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapleafeon** | `ph-electric-grass-legendary` | Electric / Grass | Diurnal | Quick Step | Firm Roots | Map: not placed | Placeholder | ☐ | ☐ |

## Electric / Rock

Spawns in: Desert, Badlands.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapstonehop** | `ph-electric-rock-common-1` | Electric / Rock | Day & night | Baby-Doll Eyes | Hair Trigger | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapstonehare** | `ph-electric-rock-common-2` | Electric / Rock | Day & night | Baby-Doll Eyes | Hair Trigger | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapstonejack** | `ph-electric-rock-common-3` | Electric / Rock | Day & night | Baby-Doll Eyes | Hair Trigger | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapstonechick** | `ph-electric-rock-prime-1` | Electric / Rock | Day & night | Trailblazer | Rockfall | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapstonewing** | `ph-electric-rock-prime-2` | Electric / Rock | Day & night | Trailblazer | Rockfall | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapstonegale** | `ph-electric-rock-prime-3` | Electric / Rock | Day & night | Trailblazer | Rockfall | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapstonekit** | `ph-electric-rock-apex-1` | Electric / Rock | Day & night | Lucky Charm | Lock-On | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapstonepard** | `ph-electric-rock-apex-2` | Electric / Rock | Day & night | Lucky Charm | Lock-On | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapstoneox** | `ph-electric-rock-apex-3` | Electric / Rock | Day & night | Lucky Charm | Lock-On | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapstoneeon** | `ph-electric-rock-legendary` | Electric / Rock | Day & night | Star Seeker | Dust Devil | Map: Dunecrown Mesa | Placeholder | ☐ | ☐ |

## Electric / Steel

Spawns in: Road.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Zapgearnewt** | `ph-electric-steel-common-1` | Electric / Steel | Day & night | Keen Nose | Backup Battery | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Zapgearsaur** | `ph-electric-steel-common-2` | Electric / Steel | Day & night | Keen Nose | Backup Battery | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Zapgeardrake** | `ph-electric-steel-common-3` | Electric / Steel | Day & night | Keen Nose | Backup Battery | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Prime | 1 | **Zapgeargrub** | `ph-electric-steel-prime-1` | Electric / Steel | Day & night | Forager | Iron Will | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Zapgearbug** | `ph-electric-steel-prime-2` | Electric / Steel | Day & night | Forager | Iron Will | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Zapgearscarab** | `ph-electric-steel-prime-3` | Electric / Steel | Day & night | Forager | Iron Will | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Zapgearcub** | `ph-electric-steel-apex-1` | Electric / Steel | Day & night | Sweet Scent | Storm Rider | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Zapgearmane** | `ph-electric-steel-apex-2` | Electric / Steel | Day & night | Sweet Scent | Storm Rider | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Zapgearregal** | `ph-electric-steel-apex-3` | Electric / Steel | Day & night | Sweet Scent | Storm Rider | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Zapgeareon** | `ph-electric-steel-legendary` | Electric / Steel | Day & night | Sweet Scent | Tempered | Map: not placed | Placeholder | ☐ | ☐ |

## Water / Electric

Spawns in: Cloud.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Aquavoltfry** | `ph-water-electric-common-1` | Water / Electric | Day & night | Sweet Scent | Wet Coat | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 2 | **Aquavoltfin** | `ph-water-electric-common-2` | Water / Electric | Day & night | Sweet Scent | Wet Coat | Sig: Riptide | Placeholder | ☐ | ☐ |
| Common | 3 | **Aquavoltmaw** | `ph-water-electric-common-3` | Water / Electric | Day & night | Sweet Scent | Wet Coat | Sig: Riptide | Placeholder | ☐ | ☐ |
| Prime | 1 | **Aquavoltnewt** | `ph-water-electric-prime-1` | Water / Electric | Day & night | Star Seeker | Static Field | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Aquavoltsaur** | `ph-water-electric-prime-2` | Water / Electric | Day & night | Star Seeker | Static Field | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Aquavoltdrake** | `ph-water-electric-prime-3` | Water / Electric | Day & night | Star Seeker | Static Field | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Aquavoltpip** | `ph-water-electric-apex-1` | Water / Electric | Day & night | Quick Step | Undercurrent | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Aquavoltling** | `ph-water-electric-apex-2` | Water / Electric | Day & night | Quick Step | Undercurrent | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Aquavoltarch** | `ph-water-electric-apex-3` | Water / Electric | Day & night | Quick Step | Undercurrent | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Aquavolteon** | `ph-water-electric-legendary` | Water / Electric | Day & night | Forager | Overclock | Map: not placed | Placeholder | ☐ | ☐ |

## Fire / Grass

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyroleafnewt** | `ph-fire-grass-common-1` | Fire / Grass | Diurnal | Forager | Stoke | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyroleafsaur** | `ph-fire-grass-common-2` | Fire / Grass | Diurnal | Forager | Stoke | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyroleafdrake** | `ph-fire-grass-common-3` | Fire / Grass | Diurnal | Forager | Stoke | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyroleafnub** | `ph-fire-grass-prime-1` | Fire / Grass | Diurnal | Sweet Scent | Deep Roots | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyroleafhulk** | `ph-fire-grass-prime-2` | Fire / Grass | Diurnal | Sweet Scent | Deep Roots | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyroleaftitan** | `ph-fire-grass-prime-3` | Fire / Grass | Diurnal | Sweet Scent | Deep Roots | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyroleafcub** | `ph-fire-grass-apex-1` | Fire / Grass | Diurnal | Star Seeker | Eruption | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyroleafmane** | `ph-fire-grass-apex-2` | Fire / Grass | Diurnal | Star Seeker | Eruption | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyroleafregal** | `ph-fire-grass-apex-3` | Fire / Grass | Diurnal | Star Seeker | Eruption | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyroleafeon** | `ph-fire-grass-legendary` | Fire / Grass | Diurnal | Keen Nose | Bramble Coat | Map: not placed | Placeholder | ☐ | ☐ |

## Fire / Rock

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyrostoneboo** | `ph-fire-rock-common-1` | Fire / Rock | Day & night | Quick Step | Ember Hide | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyrostoneshade** | `ph-fire-rock-common-2` | Fire / Rock | Day & night | Quick Step | Ember Hide | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyrostonedjinn** | `ph-fire-rock-common-3` | Fire / Rock | Day & night | Quick Step | Ember Hide | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyrostonegrub** | `ph-fire-rock-prime-1` | Fire / Rock | Day & night | Baby-Doll Eyes | Menace | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyrostonebug** | `ph-fire-rock-prime-2` | Fire / Rock | Day & night | Baby-Doll Eyes | Menace | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyrostonescarab** | `ph-fire-rock-prime-3` | Fire / Rock | Day & night | Baby-Doll Eyes | Menace | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrostonedrip** | `ph-fire-rock-apex-1` | Fire / Rock | Day & night | Trailblazer | Last Blaze | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrostonegoo** | `ph-fire-rock-apex-2` | Fire / Rock | Day & night | Trailblazer | Last Blaze | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrostonegloop** | `ph-fire-rock-apex-3` | Fire / Rock | Day & night | Trailblazer | Last Blaze | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyrostoneeon** | `ph-fire-rock-legendary` | Fire / Rock | Day & night | Lucky Charm | Hold Fast | Map: not placed | Placeholder | ☐ | ☐ |

## Fire / Steel

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyrogearnub** | `ph-fire-steel-common-1` | Fire / Steel | Day & night | Lucky Charm | Sunbather | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyrogearhulk** | `ph-fire-steel-common-2` | Fire / Steel | Day & night | Lucky Charm | Sunbather | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyrogeartitan** | `ph-fire-steel-common-3` | Fire / Steel | Day & night | Lucky Charm | Sunbather | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyrogearcub** | `ph-fire-steel-prime-1` | Fire / Steel | Day & night | Keen Nose | Steel Coat | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyrogearmane** | `ph-fire-steel-prime-2` | Fire / Steel | Day & night | Keen Nose | Steel Coat | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyrogearregal** | `ph-fire-steel-prime-3` | Fire / Steel | Day & night | Keen Nose | Steel Coat | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrogearnewt** | `ph-fire-steel-apex-1` | Fire / Steel | Day & night | Forager | Wildfire | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrogearsaur** | `ph-fire-steel-apex-2` | Fire / Steel | Day & night | Forager | Wildfire | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrogeardrake** | `ph-fire-steel-apex-3` | Fire / Steel | Day & night | Forager | Wildfire | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyrogeareon** | `ph-fire-steel-legendary` | Fire / Steel | Day & night | Trailblazer | Keen Edge | Map: Caldera Heart | Placeholder | ☐ | ☐ |

## Fire / Water

Spawns in: Desert, Volcanic, Canyon.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Pyrotidegrub** | `ph-fire-water-common-1` | Fire / Water | Day & night | Sweet Scent | Stoke | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Pyrotidebug** | `ph-fire-water-common-2` | Fire / Water | Day & night | Sweet Scent | Stoke | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Pyrotidescarab** | `ph-fire-water-common-3` | Fire / Water | Day & night | Sweet Scent | Stoke | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Prime | 1 | **Pyrotidedrip** | `ph-fire-water-prime-1` | Fire / Water | Day & night | Star Seeker | Rain Dancer | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Pyrotidegoo** | `ph-fire-water-prime-2` | Fire / Water | Day & night | Star Seeker | Rain Dancer | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Pyrotidegloop** | `ph-fire-water-prime-3` | Fire / Water | Day & night | Star Seeker | Rain Dancer | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Pyrotideboo** | `ph-fire-water-apex-1` | Fire / Water | Day & night | Quick Step | Eruption | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Pyrotideshade** | `ph-fire-water-apex-2` | Fire / Water | Day & night | Quick Step | Eruption | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Pyrotidedjinn** | `ph-fire-water-apex-3` | Fire / Water | Day & night | Quick Step | Eruption | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Pyrotideeon** | `ph-fire-water-legendary` | Fire / Water | Day & night | Baby-Doll Eyes | Fresh Spring | Map: not placed | Placeholder | ☐ | ☐ |

## Grass / Rock

Spawns in: Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Sprigstonetad** | `ph-grass-rock-common-1` | Grass / Rock | Day & night | Keen Nose | Creeping Vines | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 2 | **Sprigstonetoad** | `ph-grass-rock-common-2` | Grass / Rock | Day & night | Keen Nose | Creeping Vines | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 3 | **Sprigstonecroak** | `ph-grass-rock-common-3` | Grass / Rock | Day & night | Keen Nose | Creeping Vines | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Prime | 1 | **Sprigstonenewt** | `ph-grass-rock-prime-1` | Grass / Rock | Day & night | Forager | Bedrock | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Sprigstonesaur** | `ph-grass-rock-prime-2` | Grass / Rock | Day & night | Forager | Bedrock | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Sprigstonedrake** | `ph-grass-rock-prime-3` | Grass / Rock | Day & night | Forager | Bedrock | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Sprigstonegrub** | `ph-grass-rock-apex-1` | Grass / Rock | Day & night | Sweet Scent | Spore Puff | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Sprigstonebug** | `ph-grass-rock-apex-2` | Grass / Rock | Day & night | Sweet Scent | Spore Puff | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Sprigstonescarab** | `ph-grass-rock-apex-3` | Grass / Rock | Day & night | Sweet Scent | Spore Puff | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Sprigstoneeon** | `ph-grass-rock-legendary` | Grass / Rock | Day & night | Quick Step | Jagged Shell | Map: not placed | Placeholder | ☐ | ☐ |

## Grass / Steel

Spawns in: Forest, Fey Grove, Meadow, River, Swamp, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Spriggearchimp** | `ph-grass-steel-common-1` | Grass / Steel | Day & night | Star Seeker | Bloomrush | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 2 | **Spriggeargrip** | `ph-grass-steel-common-2` | Grass / Steel | Day & night | Star Seeker | Bloomrush | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 3 | **Spriggearbrute** | `ph-grass-steel-common-3` | Grass / Steel | Day & night | Star Seeker | Bloomrush | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Prime | 1 | **Spriggearwisp** | `ph-grass-steel-prime-1` | Grass / Steel | Day & night | Quick Step | Polished Plate | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Spriggearfae** | `ph-grass-steel-prime-2` | Grass / Steel | Day & night | Quick Step | Polished Plate | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Spriggearnymph** | `ph-grass-steel-prime-3` | Grass / Steel | Day & night | Quick Step | Polished Plate | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Spriggearworm** | `ph-grass-steel-apex-1` | Grass / Steel | Day & night | Baby-Doll Eyes | Firm Roots | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Spriggearcoil** | `ph-grass-steel-apex-2` | Grass / Steel | Day & night | Baby-Doll Eyes | Firm Roots | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Spriggearwyrm** | `ph-grass-steel-apex-3` | Grass / Steel | Day & night | Baby-Doll Eyes | Firm Roots | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Spriggeareon** | `ph-grass-steel-legendary` | Grass / Steel | Day & night | Star Seeker | Corrode | Map: not placed | Placeholder | ☐ | ☐ |

## Grass / Water

Spawns in: River, Swamp.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Sprigtidenewt** | `ph-grass-water-common-1` | Grass / Water | Day & night | Trailblazer | Deep Roots | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 2 | **Sprigtidesaur** | `ph-grass-water-common-2` | Grass / Water | Day & night | Trailblazer | Deep Roots | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 3 | **Sprigtidedrake** | `ph-grass-water-common-3` | Grass / Water | Day & night | Trailblazer | Deep Roots | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Prime | 1 | **Sprigtidegrub** | `ph-grass-water-prime-1` | Grass / Water | Day & night | Lucky Charm | Slick Scales | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Sprigtidebug** | `ph-grass-water-prime-2` | Grass / Water | Day & night | Lucky Charm | Slick Scales | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Sprigtidescarab** | `ph-grass-water-prime-3` | Grass / Water | Day & night | Lucky Charm | Slick Scales | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Sprigtidetad** | `ph-grass-water-apex-1` | Grass / Water | Day & night | Keen Nose | Bramble Coat | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Sprigtidetoad** | `ph-grass-water-apex-2` | Grass / Water | Day & night | Keen Nose | Bramble Coat | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Sprigtidecroak** | `ph-grass-water-apex-3` | Grass / Water | Day & night | Keen Nose | Bramble Coat | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Sprigtideeon** | `ph-grass-water-legendary` | Grass / Water | Day & night | Sweet Scent | Second Wave | Map: Willowheart Isle | Placeholder | ☐ | ☐ |

## Rock / Steel

Spawns in: Mountain.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Craggearnewt** | `ph-rock-steel-common-1` | Rock / Steel | Day & night | Quick Step | Rockfall | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 2 | **Craggearsaur** | `ph-rock-steel-common-2` | Rock / Steel | Day & night | Quick Step | Rockfall | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 3 | **Craggeardrake** | `ph-rock-steel-common-3` | Rock / Steel | Day & night | Quick Step | Rockfall | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Prime | 1 | **Craggeartad** | `ph-rock-steel-prime-1` | Rock / Steel | Day & night | Baby-Doll Eyes | Iron Will | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Craggeartoad** | `ph-rock-steel-prime-2` | Rock / Steel | Day & night | Baby-Doll Eyes | Iron Will | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Craggearcroak** | `ph-rock-steel-prime-3` | Rock / Steel | Day & night | Baby-Doll Eyes | Iron Will | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Craggeargrub** | `ph-rock-steel-apex-1` | Rock / Steel | Day & night | Trailblazer | Dust Devil | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Craggearbug** | `ph-rock-steel-apex-2` | Rock / Steel | Day & night | Trailblazer | Dust Devil | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Craggearscarab** | `ph-rock-steel-apex-3` | Rock / Steel | Day & night | Trailblazer | Dust Devil | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Craggeareon** | `ph-rock-steel-legendary` | Rock / Steel | Day & night | Forager | Tempered | Map: not placed | Placeholder | ☐ | ☐ |

## Rock / Water

Spawns in: Mountain, Desert, Badlands, Volcanic, Canyon, Forest Floor.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Cragtidekit** | `ph-rock-water-common-1` | Rock / Water | Day & night | Lucky Charm | Menace | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 2 | **Cragtidepard** | `ph-rock-water-common-2` | Rock / Water | Day & night | Lucky Charm | Menace | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Common | 3 | **Cragtideox** | `ph-rock-water-common-3` | Rock / Water | Day & night | Lucky Charm | Menace | Sig: Mesa Breaker | Placeholder | ☐ | ☐ |
| Prime | 1 | **Cragtidechimp** | `ph-rock-water-prime-1` | Rock / Water | Day & night | Keen Nose | Wet Coat | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Cragtidegrip** | `ph-rock-water-prime-2` | Rock / Water | Day & night | Keen Nose | Wet Coat | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Cragtidebrute** | `ph-rock-water-prime-3` | Rock / Water | Day & night | Keen Nose | Wet Coat | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Cragtidenub** | `ph-rock-water-apex-1` | Rock / Water | Day & night | Forager | Hold Fast | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Cragtidehulk** | `ph-rock-water-apex-2` | Rock / Water | Day & night | Forager | Hold Fast | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Cragtidetitan** | `ph-rock-water-apex-3` | Rock / Water | Day & night | Forager | Hold Fast | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Cragtideeon** | `ph-rock-water-legendary` | Rock / Water | Day & night | Keen Nose | Undercurrent | Map: not placed | Placeholder | ☐ | ☐ |

## Steel / Water

Spawns in: Coast.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Ferrotidecub** | `ph-steel-water-common-1` | Steel / Water | Day & night | Baby-Doll Eyes | Steel Coat | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 2 | **Ferrotidemane** | `ph-steel-water-common-2` | Steel / Water | Day & night | Baby-Doll Eyes | Steel Coat | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Common | 3 | **Ferrotideregal** | `ph-steel-water-common-3` | Steel / Water | Day & night | Baby-Doll Eyes | Steel Coat | Sig: Foundry Hammer | Placeholder | ☐ | ☐ |
| Prime | 1 | **Ferrotidenub** | `ph-steel-water-prime-1` | Steel / Water | Day & night | Trailblazer | Rain Dancer | — | Placeholder | ☐ | ☐ |
| Prime | 2 | **Ferrotidehulk** | `ph-steel-water-prime-2` | Steel / Water | Day & night | Trailblazer | Rain Dancer | — | Placeholder | ☐ | ☐ |
| Prime | 3 | **Ferrotidetitan** | `ph-steel-water-prime-3` | Steel / Water | Day & night | Trailblazer | Rain Dancer | — | Placeholder | ☐ | ☐ |
| Apex | 1 | **Ferrotideworm** | `ph-steel-water-apex-1` | Steel / Water | Day & night | Lucky Charm | Keen Edge | — | Placeholder | ☐ | ☐ |
| Apex | 2 | **Ferrotidecoil** | `ph-steel-water-apex-2` | Steel / Water | Day & night | Lucky Charm | Keen Edge | — | Placeholder | ☐ | ☐ |
| Apex | 3 | **Ferrotidewyrm** | `ph-steel-water-apex-3` | Steel / Water | Day & night | Lucky Charm | Keen Edge | — | Placeholder | ☐ | ☐ |
| Legendary | — | **Thalassor** | `thalassor` | Water / Steel | Day & night | Lucky Charm | Wet Coat | Map: Ironwake Shoals | Hand-made | ☑ | ☐ |

---

## Extra families

Placeholder families beside the roster table (`EXTRA_FAMILIES` in `src/data/roster.ts`): a second single-type Common, out at the time of day its type was missing from the wild. To swap one in, add the real family in `src/data/species.ts` (with its `activity`) and remove its entry.

**Electric** · spawns in Badlands, Road, Desert · concept: a lantern-tailed gecko that hunts by its own sparks

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Glimnewt** | `ph-electric-dusk-common-1` | Electric | Nocturnal | Lucky Charm | Hair Trigger | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 2 | **Lampskink** | `ph-electric-dusk-common-2` | Electric | Nocturnal | Lucky Charm | Hair Trigger | Sig: Stormcall | Placeholder | ☐ | ☐ |
| Common | 3 | **Beacodrake** | `ph-electric-dusk-common-3` | Electric | Nocturnal | Lucky Charm | Hair Trigger | Sig: Stormcall | Placeholder | ☐ | ☐ |

**Fire** · spawns in Volcanic, Canyon, Desert · concept: a coal-shelled beetle that glows after sundown

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Coalgrub** | `ph-fire-dusk-common-1` | Fire | Nocturnal | Sweet Scent | Ember Hide | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 2 | **Cinderbug** | `ph-fire-dusk-common-2` | Fire | Nocturnal | Sweet Scent | Ember Hide | Sig: Caldera Roar | Placeholder | ☐ | ☐ |
| Common | 3 | **Furnarab** | `ph-fire-dusk-common-3` | Fire | Nocturnal | Sweet Scent | Ember Hide | Sig: Caldera Roar | Placeholder | ☐ | ☐ |

**Grass** · spawns in River, Swamp, Forest · concept: a moonflower toad that blooms in the dark

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Moontad** | `ph-grass-dusk-common-1` | Grass | Nocturnal | Baby-Doll Eyes | Creeping Vines | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 2 | **Bloomtoad** | `ph-grass-dusk-common-2` | Grass | Nocturnal | Baby-Doll Eyes | Creeping Vines | Sig: Overgrowth | Placeholder | ☐ | ☐ |
| Common | 3 | **Lunacroak** | `ph-grass-dusk-common-3` | Grass | Nocturnal | Baby-Doll Eyes | Creeping Vines | Sig: Overgrowth | Placeholder | ☐ | ☐ |

**Astral** · spawns in Tundra, Mountain · concept: a sundog hare that bends daylight into halos

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Dawnhop** | `ph-astral-sun-common-1` | Astral | Diurnal | Forager | Fixed Star | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 2 | **Halohare** | `ph-astral-sun-common-2` | Astral | Diurnal | Forager | Fixed Star | Sig: Borealis Lance | Placeholder | ☐ | ☐ |
| Common | 3 | **Sunjack** | `ph-astral-sun-common-3` | Astral | Diurnal | Forager | Fixed Star | Sig: Borealis Lance | Placeholder | ☐ | ☐ |

**Charm** · spawns in Lake, Fey Grove, Meadow · concept: a ribbon-finned songbird that duets with its reflection

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Common | 1 | **Ribbonchick** | `ph-charm-sun-common-1` | Charm | Diurnal | Quick Step | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 2 | **Trillwing** | `ph-charm-sun-common-2` | Charm | Diurnal | Quick Step | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |
| Common | 3 | **Serenadove** | `ph-charm-sun-common-3` | Charm | Diurnal | Quick Step | Heartmend | Sig: Moonveil Kiss | Placeholder | ☐ | ☐ |

---

## Hand-made creatures outside the roster table

The original hand-made Prime and Apex creatures, from before the roster table existed. They appear in the wild but don’t fill a roster slot. Design could move them into a matching slot (replacing that slot’s placeholder family) or keep them as extras. Either way they need art.

| Family | Stage | Name | ID | Types | Out by | Ability | Instinct | Notes | Status | Design | Art |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Prime | 1 | **Orbuddle** | `orbuddle` | Astral | Nocturnal | Lucky Charm | Fixed Star | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Nebulith** | `nebulith` | Astral / Rock | Day & night | Lucky Charm | Fixed Star | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Zenithar** | `zenithar` | Astral | Nocturnal | Star Seeker | Shadow | — | Hand-made | ☑ | ☐ |
| Prime | 1 | **Puffwisp** | `puffwisp` | Charm | Nocturnal | Sweet Scent | Glamour | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Velvetuft** | `velvetuft` | Charm | Nocturnal | Sweet Scent | Glamour | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Mirageon** | `mirageon` | Charm / Water | Day & night | Lucky Charm | Heartmend | — | Hand-made | ☑ | ☐ |
| Prime | 1 | **Fizzlet** | `fizzlet` | Electric | Diurnal | Keen Nose | Overclock | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Arcwing** | `arcwing` | Electric | Diurnal | Keen Nose | Overclock | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Tempestrix** | `tempestrix` | Electric / Astral | Day & night | Star Seeker | Hair Trigger | — | Hand-made | ☑ | ☐ |
| Prime | 1 | **Emberwick** | `emberwick` | Fire | Day & night | Sweet Scent | Ember Hide | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Lavalume** | `lavalume` | Fire | Day & night | Sweet Scent | Ember Hide | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Calderex** | `calderex` | Fire / Rock | Day & night | Forager | Last Blaze | — | Hand-made | ☑ | ☐ |
| Common | 1 | **Emberfish** | `emberfish` | Fire / Water | Day & night | Forager | Sunbather | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Prime | 2 | **Cinderkoi** | `cinderkoi` | Fire / Water | Day & night | Lucky Charm | Sunbather | Sig: Caldera Roar | Hand-made | ☑ | ☐ |
| Prime | 1 | **Shadeleaf** | `shadeleaf` | Grass | Nocturnal | Keen Nose | Bramble Coat | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Gloomoth** | `gloomoth` | Grass / Charm | Nocturnal | Keen Nose | Bramble Coat | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Canopyre** | `canopyre` | Grass | Diurnal | Sweet Scent | Creeping Vines | — | Hand-made | ☑ | ☐ |
| Prime | 1 | **Rubblet** | `rubblet` | Rock | Day & night | Lucky Charm | Hold Fast | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Boulderon** | `boulderon` | Rock | Day & night | Lucky Charm | Hold Fast | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Stratagon** | `stratagon` | Rock / Steel | Day & night | Keen Nose | Bedrock | — | Hand-made | ☑ | ☐ |
| Prime | 1 | **Cogling** | `cogling` | Steel | Day & night | Trailblazer | Keen Edge | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Anvilisk** | `anvilisk` | Steel / Fire | Day & night | Trailblazer | Keen Edge | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Leviathorn** | `leviathorn` | Steel | Day & night | Quick Step | Polished Plate | — | Hand-made | ☑ | ☐ |
| Prime | 1 | **Bubbloon** | `bubbloon` | Water | Day & night | Sweet Scent | Fresh Spring | — | Hand-made | ☑ | ☐ |
| Prime | 2 | **Tidecall** | `tidecall` | Water | Day & night | Sweet Scent | Fresh Spring | — | Hand-made | ☑ | ☐ |
| Apex | 1 | **Gatormaw** | `gatormaw` | Water | Day & night | Quick Step | Slick Scales | — | Hand-made | ☑ | ☐ |
