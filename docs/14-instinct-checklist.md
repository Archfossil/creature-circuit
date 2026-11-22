# Instinct Checklist: every battle passive, for redesign

*Generated from the game data by `npm run docs:instincts` (scripts/instinct-checklist.ts). Regenerate after changing Instincts rather than editing by hand.*

Every creature has three things that shape it: its **Nature** (stats and perks), its **Ability** (works on the overworld while it Follows you) and its **Instinct** 🔆 (a passive that fires on its own in battle). This list has every Instinct with its exact rules and the creatures that have it.

## Progress

| | Count |
|---|---|
| Instincts in the game | 48 (8 types × 6) |
| Designed and signed off | 0 |
| **First drafts to review** | **48** |
| Species with an Instinct | 386 of 386 |
| Flagged for a balance look | 2 (see [Balance watch list](#balance-watch-list)) |

## How Instincts work

- **One per species**, shared by every stage of a family. Hand-made families were given one from their first type's pool; generated placeholder families draw from one of their types' pools (alternating between the two types of a dual family by rarity). A species can use any Instinct, not just its type's: the pools only decide the defaults.
- **Triggered** Instincts fire at a moment:
  - When it takes the field.
  - When it loses a Vitality heart.
  - When a physical attack hits it.
  - When it knocks out a foe.
  - When one of its attacks misses.
  - At the end of each round.
- "Takes the field" means: the leads as round 1 begins (after the trainer picks who leads), a creature swapping in (before its Swap Move), or one replacing a knocked-out teammate.
- **(once)** Instincts fire only the first time in a battle. **(1–2 on d6)** ones roll a d6 each time and fire on a 1 or 2.
- **Always-on** Instincts bend a rule while the creature is on the field (accuracy, statuses, crits, Clashes, weather, and so on).
- Stat changes from an Instinct work like every battle modifier: they last while the creature stays in, and each stat is capped at ±3.
- In battle, an Instinct firing shows as "🔆 Name’s Instinct!" in the log, followed by what it did. Wild creatures and opposing trainers have Instincts too.
- **Code:** the Instincts are data in `src/data/instincts.ts` (a `trigger` and/or `passive` rules). `src/engine/battle.ts` (the "Instincts" section: `fireInstinct`, `afflict`, `takeHit`, `afterHit`) runs them, and `instinctRules` writes the "Exact rules" column below from the same data.

## How to use this list

- **Design ☐**: every Instinct is a first draft from development (name, flavour text and numbers). Tick ☑ when its name, text and effect are approved. Rename or rewrite freely: the id stays the same so saves and species keep pointing at it.
- **Balance ☐**: tick ☑ once it's been playtested and its numbers feel right.
- **Names:** they're original to the game. Avoid names already used for Abilities, moves, Swap Moves, Natures, items or statuses.
- **Adding one (developers):** add it to `INSTINCTS` in `src/data/instincts.ts`, built from the existing moments, effects and passive rules (or add a new one to the engine), point species at it (`instinct` in `src/data/species.ts`, or the pools for placeholders), then regenerate this file and docs/08.

## By type

### Astral

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Starlit Gaze** | `starlit-gaze` | When it takes the field | Its cold stare pins the foe in place: the foe’s Evasion drops by 1 when it takes the field. | When it takes the field: the foe gets −1 Evasion. | 12 | **Twinkit line**, 3 placeholder families | — | ☐ | ☐ |
| **Fixed Star** | `fixed-star` | Always on | Its aim never wavers: nothing can lower its accuracy. | Its accuracy can’t be lowered (no Daze die shrink, no Beguile or Darkness penalty). | 8 | **Orbuddle line**, 2 placeholder families | — | ☐ | ☐ |
| **Shadow** | `shadow` | Always on | It melts into the dark: foes can’t Zero In against it. | Foes can’t Zero In against it (their bonus isn’t used, and their misses don’t build one). | 7 | **Zenithar**, 2 placeholder families | ⚠️ [Watch](#balance-watch-list) | ☐ | ☐ |
| **Comet Tail** | `comet-tail` | Always on | It streaks in ahead of everyone: +2 Speed in the first round. | +2 Speed in round 1. | 8 | **Solstara**, 3 placeholder families | — | ☐ | ☐ |
| **Lucid Mind** | `lucid-mind` | Always on | Its thoughts stay clear: it can never be Dazed. | Immune to Daze. | 9 | 3 placeholder families | — | ☐ | ☐ |
| **Supernova** | `supernova` | When it loses a Vitality heart (once) | The first time it loses a heart, it flares: the foe is Dazed and it gains +1 Focus. | When it loses a Vitality heart (first time each battle): Daze on the foe (if it has no status); +1 Focus while it stays in. | 5 | 3 placeholder families | — | ☐ | ☐ |

### Charm

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Disarming Smile** | `disarming-smile` | When it takes the field | A sweet look as it arrives takes the foe’s mind off its aim: the foe’s Focus drops by 1. | When it takes the field: the foe gets −1 Focus. | 12 | **Mossprite line**, 3 placeholder families | — | ☐ | ☐ |
| **Glamour** | `glamour` | When it takes the field | It makes an entrance that’s hard to look at directly: +1 Evasion when it takes the field. | When it takes the field: +1 Evasion while it stays in. | 7 | **Puffwisp line**, 3 placeholder families | — | ☐ | ☐ |
| **Heartmend** | `heartmend` | When it loses a Vitality heart (once) | The first time it loses a heart, it pulls itself together: it recovers 3 Health and shakes off its status. | When it loses a Vitality heart (first time each battle): it recovers 3 Health (beyond full Health: Overheal, up to half its max Health); it shakes off its status. | 7 | **Mirageon**, 2 placeholder families | — | ☐ | ☐ |
| **Captivate** | `captivate` | When a physical attack hits it (1–2 on d6) | Touching it is a mistake: a foe that hits it with a physical attack may be Beguiled (1–2 on a d6). | When a physical attack hits it, on 1–2 on a d6: Beguile on the foe (if it has no status). | 9 | 3 placeholder families | — | ☐ | ☐ |
| **Pure Heart** | `pure-heart` | Always on | Nothing clouds it: it can never be Beguiled or Dazed. | Immune to Beguile and Daze. | 9 | 3 placeholder families | — | ☐ | ☐ |
| **Curtain Call** | `curtain-call` | When it knocks out a foe | It takes a bow after every knockout: +1 Evasion. | When it knocks out a foe: +1 Evasion while it stays in. | 5 | 3 placeholder families | — | ☐ | ☐ |

### Electric

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Static Field** | `static-field` | When a physical attack hits it (1–2 on d6) | Its fur crackles: a foe that hits it with a physical attack may be Shocked (1–2 on a d6). | When a physical attack hits it, on 1–2 on a d6: Shock on the foe (if it has no status). | 12 | **Zapup line**, 3 placeholder families | — | ☐ | ☐ |
| **Overclock** | `overclock` | When it takes the field | It arrives already buzzing: +1 Speed when it takes the field. | When it takes the field: +1 Speed while it stays in. | 7 | **Fizzlet line**, 3 placeholder families | — | ☐ | ☐ |
| **Hair Trigger** | `hair-trigger` | Always on | It’s quickest off the mark: in a Clash it rolls a die one size bigger. | Clash die 1 size bigger. | 7 | **Tempestrix**, 2 placeholder families | — | ☐ | ☐ |
| **Lock-On** | `lock-on` | Always on | Every miss sharpens it: its misses Zero In 1 more than usual. | Misses Zero In +1 more (moves that Zero In). | 7 | 3 placeholder families | — | ☐ | ☐ |
| **Backup Battery** | `backup-battery` | When it loses a Vitality heart (once) | The first time it loses a heart, a reserve kicks in: its Stamina refills and it gains +1 Speed. | When it loses a Vitality heart (first time each battle): its Stamina refills; +1 Speed while it stays in. | 9 | 3 placeholder families | — | ☐ | ☐ |
| **Storm Rider** | `storm-rider` | Always on | Wild weather charges it: +1 Speed and +1 Focus in a Thunderstorm or Gusty Winds. | +1 Speed, +1 Focus in a Thunderstorm or Gusty Winds. | 7 | 3 placeholder families | — | ☐ | ☐ |

### Fire

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Eruption** | `eruption` | When it loses a Vitality heart (once) | The first time it loses a heart, it erupts: the foe is Burned. | When it loses a Vitality heart (first time each battle): Burn on the foe (if it has no status). | 12 | **Cindercub line**, 3 placeholder families | — | ☐ | ☐ |
| **Ember Hide** | `ember-hide` | When a physical attack hits it (1–2 on d6) | Its hide smoulders: a foe that hits it with a physical attack may be Burned (1–2 on a d6). | When a physical attack hits it, on 1–2 on a d6: Burn on the foe (if it has no status). | 8 | **Emberwick line**, 2 placeholder families | — | ☐ | ☐ |
| **Last Blaze** | `last-blaze` | Always on | Cornered, it burns hottest: +2 Power and +1 Focus while it’s on its last heart. | +2 Power, +1 Focus while on its last heart (Vitality 0). | 5 | **Calderex**, 2 placeholder families | — | ☐ | ☐ |
| **Sunbather** | `sunbather` | Always on | It loves the heat: +1 Power and +1 Speed in a Heat Wave or Drought. | +1 Power, +1 Speed in a Heat Wave or a Drought. | 11 | **Emberfish line**, 3 placeholder families | — | ☐ | ☐ |
| **Wildfire** | `wildfire` | Always on | Its flames spread: its elemental moves inflict their status on a 1 or 2 on a damage die. | Its elemental moves inflict their status on a 1 or 2 on any damage die. | 7 | 3 placeholder families | — | ☐ | ☐ |
| **Stoke** | `stoke` | When it knocks out a foe | Every win feeds the fire: +1 Power after each knockout. | When it knocks out a foe: +1 Power while it stays in. | 7 | 3 placeholder families | — | ☐ | ☐ |

### Grass

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Deep Roots** | `deep-roots` | At the end of each round | It draws strength from the ground: it recovers 1 Health at the end of every round. | At the end of each round: it recovers 1 Health (beyond full Health: Overheal, up to half its max Health). | 12 | **Sproutle line**, 3 placeholder families | ⚠️ [Watch](#balance-watch-list) | ☐ | ☐ |
| **Bramble Coat** | `bramble-coat` | When a physical attack hits it | Thorns line its back: a foe that hits it with a physical attack takes 1 damage. | When a physical attack hits it: the foe takes 1 damage. | 7 | **Shadeleaf line**, 3 placeholder families | — | ☐ | ☐ |
| **Creeping Vines** | `creeping-vines` | When it takes the field | Vines spread out as it arrives: the foe’s Speed drops by 1. | When it takes the field: the foe gets −1 Speed. | 7 | **Canopyre**, 2 placeholder families | — | ☐ | ☐ |
| **Spore Puff** | `spore-puff` | When a physical attack hits it (1–2 on d6) | A cloud of spores bursts when it’s struck: a foe that hits it with a physical attack may be Snared (1–2 on a d6). | When a physical attack hits it, on 1–2 on a d6: Snare on the foe (if it has no status). | 7 | 3 placeholder families | — | ☐ | ☐ |
| **Bloomrush** | `bloomrush` | Always on | Rain and blossom wake it up: +1 Speed and +1 Ward in Rain or Spring Bloom. | +1 Speed, +1 Ward in Rain or Spring Bloom. | 9 | 3 placeholder families | — | ☐ | ☐ |
| **Firm Roots** | `firm-roots` | Always on | It won’t be moved: it can never be Snared or Staggered. | Immune to Snare and Stagger. | 5 | 3 placeholder families | — | ☐ | ☐ |

### Rock

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Menace** | `menace` | When it takes the field | It looms over the foe as it arrives: the foe’s Power drops by 1. | When it takes the field: the foe gets −1 Power. | 12 | **Pebbark line**, 3 placeholder families | — | ☐ | ☐ |
| **Hold Fast** | `hold-fast` | Always on | Once a battle, the blow that would knock it out leaves it hanging on with 1 Health. | Once a battle, a blow that would knock it out leaves it at 1 Health. | 9 | **Rubblet line**, 3 placeholder families | — | ☐ | ☐ |
| **Bedrock** | `bedrock` | When it takes the field | It settles in like stone: +1 Armor when it takes the field. | When it takes the field: +1 Armor while it stays in. | 7 | **Stratagon**, 2 placeholder families | — | ☐ | ☐ |
| **Jagged Shell** | `jagged-shell` | When a physical attack hits it (1–2 on d6) | Its shell bites back: a foe that hits it with a physical attack may be Staggered (1–2 on a d6). | When a physical attack hits it, on 1–2 on a d6: Stagger on the foe (if it has no status). | 5 | 3 placeholder families | — | ☐ | ☐ |
| **Rockfall** | `rockfall` | When it loses a Vitality heart (once) | The first time it loses a heart, stones come down: the foe is Staggered and it gains +1 Armor. | When it loses a Vitality heart (first time each battle): Stagger on the foe (if it has no status); +1 Armor while it stays in. | 9 | 3 placeholder families | — | ☐ | ☐ |
| **Dust Devil** | `dust-devil` | Always on | It vanishes into flying grit: +1 Evasion and +1 Armor in a Drought or Gusty Winds. | +1 Evasion, +1 Armor in a Drought or Gusty Winds. | 5 | 3 placeholder families | — | ☐ | ☐ |

### Steel

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Steel Coat** | `steel-coat` | Always on | Its plating turns the first status of every battle aside. | The first status that would afflict it each battle is shrugged off. | 12 | **Rivetail line**, 3 placeholder families | — | ☐ | ☐ |
| **Keen Edge** | `keen-edge` | Always on | Honed to a fine edge: its attacks that can crit do so on a roll 1 lower. | Crits on a roll 1 lower (attacks that can crit). | 9 | **Cogling line**, 3 placeholder families | — | ☐ | ☐ |
| **Polished Plate** | `polished-plate` | When it takes the field | Fresh polish turns energy aside: +1 Ward when it takes the field. | When it takes the field: +1 Ward while it stays in. | 7 | **Leviathorn**, 2 placeholder families | — | ☐ | ☐ |
| **Corrode** | `corrode` | When it takes the field | A metallic tang hangs around it: the foe’s Ward drops by 1 when it takes the field. | When it takes the field: the foe gets −1 Ward. | 7 | 3 placeholder families | — | ☐ | ☐ |
| **Iron Will** | `iron-will` | Always on | It doesn’t bend or break: it can never be Staggered or Sundered. | Immune to Stagger and Sunder. | 9 | 3 placeholder families | — | ☐ | ☐ |
| **Tempered** | `tempered` | When it knocks out a foe | Each fight hardens it: +1 Armor and +1 Ward after each knockout. | When it knocks out a foe: +1 Armor while it stays in; +1 Ward while it stays in. | 3 | 3 placeholder families | — | ☐ | ☐ |

### Water

| Instinct | ID | When | In-game text | Exact rules | Species | Families | Balance note | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|
| **Rain Dancer** | `rain-dancer` | Always on | It’s in its element in a downpour: +1 Speed and +1 Evasion in Rain or a Thunderstorm. | +1 Speed, +1 Evasion in Rain or a Thunderstorm. | 12 | **Puddlit line**, 3 placeholder families | — | ☐ | ☐ |
| **Fresh Spring** | `fresh-spring` | When it takes the field | It arrives clear-headed: +1 Focus when it takes the field. | When it takes the field: +1 Focus while it stays in. | 6 | **Bubbloon line**, 2 placeholder families | — | ☐ | ☐ |
| **Slick Scales** | `slick-scales` | When a physical attack hits it (1–2 on d6) | It’s slippery to grab: a foe that hits it with a physical attack may be Soaked (1–2 on a d6). | When a physical attack hits it, on 1–2 on a d6: Soak on the foe (if it has no status). | 7 | **Gatormaw**, 2 placeholder families | — | ☐ | ☐ |
| **Second Wave** | `second-wave` | When one of its attacks misses | A miss only builds the swell: +1 Focus each time one of its attacks misses. | When one of its attacks misses: +1 Focus while it stays in. | 8 | **Nimbalune**, 3 placeholder families | — | ☐ | ☐ |
| **Wet Coat** | `wet-coat` | Always on | Always damp: it can never be Burned or Soaked. | Immune to Burn and Soak. | 10 | **Thalassor**, 3 placeholder families | — | ☐ | ☐ |
| **Undercurrent** | `undercurrent` | When it loses a Vitality heart (once) | The first time it loses a heart, the tide turns: the foe is Soaked and its own Stamina refills. | When it loses a Vitality heart (first time each battle): Soak on the foe (if it has no status); its Stamina refills. | 5 | 3 placeholder families | — | ☐ | ☐ |

## Balance watch list

Instincts flagged for a closer look in play, with a change to try. Flags live in `BALANCE_WATCH` in scripts/instinct-checklist.ts.

| Instinct | Concern | Possible change |
|---|---|---|
| **Deep Roots** (`deep-roots`, Grass) | With Overheal, Deep Roots no longer stops at full Health: a creature at full Health builds 1 Overheal every round, up to half its max Health, so a long fight hands it a free buffer. | If it proves too strong: let Deep Roots heal Health only (no Overheal), or only overheal once a battle. |
| **Shadow** (`shadow`, Astral) | Possibly too strong. Zeroing In is the built-in answer to a foe that keeps dodging, and Shadow switches it off completely for as long as its creature is on the field. Paired with high Evasion (an Evasion bias or boosts, Glamour-style buffs, Fog), a creature that misses a lot may never catch up. | Instead of cancelling Zeroing In, halve it: against Shadow each miss Zeroes In +0.5 instead of +1, so it takes two misses to earn +1 accuracy. Needs Zeroing In to hold halves (the bonus used on a roll rounds down) and the move readout to say so. |

## Design space still open

Moments and effects the engine doesn't support yet, for new Instincts. Each needs a small engine addition (a new moment in `fireInstinct`, or a new passive rule).

- **When it leaves the field** (swapped out): heal the partner, leave a status trap for the next foe, pass a stat boost on.
- **When a teammate is knocked out:** a revenge boost for the creature that comes in next.
- **When it inflicts a status:** a bonus on top (Burn also lowers Power, Snare also lowers Evasion).
- **When the foe uses a Support move:** copy the buff, or punish it.
- **First hit of the battle:** extra damage, a sure hit, or an automatic crit.
- **Type reactions:** resist one type (halve it), absorb one type as healing, or turn one type's hits into Stamina.
- **Stamina and Fatigue:** a lower Effort on its first move, immunity to Fatigue checks, or Catch Breath that also heals.
- **Teamwork links:** a bonus when it swaps in for a particular type of partner, or more Teamwork from swaps.
- **Arena and biome:** boosts in a home biome, or immunity to an arena trick (ice floes, steam vents, the Thunder Spike).
- **Legendary-only Instincts:** stronger, unique effects that make a Legendary worth its Loyalty drain.
