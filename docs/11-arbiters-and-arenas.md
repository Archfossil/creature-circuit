# Arbiters & Arena Effects

Every Arbiter in the game, their arena's special effect (the "arena trick"), how they scale, and how to change or add them.

**Code:**
- **City and Arbiter data** (name, type, arena text, Merit, hot pot): `CITIES` in `src/data/map.ts`.
- **Teams, challenge rules and rewards:** `src/engine/world.ts` (`arbiterTeam`, `arbiterBattle`, `arbiterGate`, `finishBattle`).
- **Arena effects:** `src/engine/battle.ts` (stat tricks in `eff()`, accuracy in `accuracyMods()`, hazards in `arenaTrick()`).
- **Challenge screen and special flows** (Cloud Island, finding Fabian, the Gauntlet): `src/ui/app.ts` (`arbiter`, `cloudSheet`, `findFabian`, `gauntletSheet`).

## How Arbiters work

- **Goal:** each of the 8 cities has an Arbiter. Beating one earns their **Merit**. A trainer needs all 8 Merits and must be standing in Circuit Stadium when Turn 100 ends.
- **Any order:** Arbiters scale to the challenger's **Tier**, not to a fixed level, so they can be fought in any order.
- **Tier:** 1 + (Merits ÷ 2, rounded down), up to 5. 0–1 Merits is Tier 1, 2–3 is Tier 2, 4–5 is Tier 3, 6–7 is Tier 4, and 8 is Tier 5.
- **Challenging:** a city action from the arena (in the city itself, except Amber's, which is on Kilauea island). It costs **1 Initiative** (Ranger 2, Urbanite 0). The team needs at least one creature that isn't KO'd. Some Arbiters have an extra **access condition** (see each card).
- **The battle:** a trainer battle against 2–3 creatures of the Arbiter's type, with the arena effect active all battle. The Arbiter's AI is sharper than wild creatures' and trainers' (only the Champions are sharper), so it rarely picks a poor move.
- **Winning:** the Merit, **🪙 10 × Tier** (Merchant style adds its 25%), and trainer-battle XP (+3 for every creature that fought, on top of the usual XP).
- **Losing:** no coins lost and no penalty beyond the battle itself (unlike roaming trainers). If the whole team is knocked out, the usual wipe applies: back home, half your coins, Initiative gone. You can try again on a later turn.
- **Already beaten:** an Arbiter whose Merit you hold won't battle again.

### Tier scaling (every Arbiter)

| Tier | Merits held | Team size | Levels | Highest stage | Apex creatures | Prize |
|---|---|---|---|---|---|---|
| 1 | 0–1 | 2 | Lv 3, last Lv 4 | Stage 1 | No | 🪙 10 |
| 2 | 2–3 | 3 | Lv 5, last Lv 6 | Stage 2 | No | 🪙 20 |
| 3 | 4–5 | 3 | Lv 7, last Lv 8 | Stage 2 | Last creature only | 🪙 30 |
| 4 | 6–7 | 3 | Lv 9, last Lv 10 | Stage 3 | Yes | 🪙 40 |
| 5 | 8 | 3 | Lv 11, last Lv 12 | Stage 3 | Yes | 🪙 50 |

**Team building:**
- **Pool:** every species with the Arbiter's type, either half of a dual type, excluding Legendaries.
- **Order of preference:** the highest stage allowed first, then Apex creatures, with some randomness. No species appears twice.
- **Last creature:** always one level higher (the "ace").
- **Chart points:** spent automatically.
- **Moves:** each creature gets a varied playbook.
- **Note:** placeholder species are in the pool too, until they're replaced.

Wild creatures at a Tier sit just under the Arbiter's level (wild level band centre: Lv 1, 3, 5, 7, 9).

---

## Overview

| # | Arbiter | City | Type | Arena | Arena effect | Kind | Merit | Access condition |
|---|---|---|---|---|---|---|---|---|
| 1 | Salem | Aurora Peak | Astral | Ice Floe Arena | `iceFloes`: creatures may slip into the water | Hazard (both sides) | Polaris Merit | A full lap of Cloud Island |
| 2 | Fabian | Hollow Crest | Charm | Glamour Grove | `illusion`: Arbiter's creatures +Evasion | Stat (Arbiter) | Glamour Merit | Find him in disguise |
| 3 | Watson | Thunder Spike | Electric | Under the Spike | `volts`: lightning heals Electric creatures, shocks the rest | Hazard / heal (both sides) | Bolt Merit | None |
| 4 | Amber | Kilauea Forge | Fire | Fire Pit | `flames`: steam vents scald | Hazard (both sides) | Caldera Merit | Arena is on Kilauea island |
| 5 | Dahlia | Gloomshade | Grass | Forest Floor Arena | `darkness`: challenger's accuracy down | Accuracy (challenger) | Lily Merit | Follow her trail on the Forest Floor (Canopy Rope to get down) |
| 6 | Cliff | Houndmouth Canyon | Rock | Crumbling Plateau | `crumble`: the plateau shrinks each round; challenger rung out when it's gone | Timer (challenger) | Plateau Merit | None |
| 7 | Stella | Iron Coast | Steel | Floating Fortress | `fortress`: Arbiter's creatures +Armor and +Ward | Stat (Arbiter) | Anchor Merit | Clear the Iron Coast Gauntlet |
| 8 | Katy | Mangrove Port | Water | Root Maze | `roots`: challenger's Speed down | Stat (challenger) | Tidal Merit | Root Whistle or a creature that can Sail |

**Effect kinds:** arena effects are meant to **favour the Arbiter**. A prepared challenger can sometimes turn them around (for example by bringing creatures of the Arbiter's type).
- **Hazards** deal damage at the end of a round. Creatures of the Arbiter's own type are immune (to the volts, Electric creatures are healed instead).
- **The timer** (Cliff) doesn't deal damage: it limits how many rounds the challenger has to win.
- **Stat** effects add or subtract a stat for one side all battle.
- **Accuracy** effects change accuracy rolls.

Every effect gets stronger at higher Tiers.

### Arena effects by Tier (exact numbers)

| Effect | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|---|---|---|---|---|---|
| **Ice floes**: chance per non-Astral creature, each round | 1 in 6, 1 dmg | 1 in 6, 2 dmg | 2 in 6, 2 dmg | 2 in 6, 3 dmg | 2 in 6, 3 dmg |
| **Illusion**: Arbiter's Evasion | +1 | +1 | +1 | +2 | +2 |
| **Volts**: chance each round; Electric creatures heal, others take damage (both sides) | 2 in 6, 1 | 3 in 6, 2 | 3 in 6, 2 | 4 in 6, 3 | 4 in 6, 3 |
| **Flames**: every 2nd round, each non-Fire creature | 1 dmg | 1 dmg | 2 dmg | 2 dmg | 2 dmg |
| **Darkness**: challenger's accuracy rolls | −1 | −1 | −1 | −2 | −2 |
| **Crumble**: rounds before the challenger is rung out | 10 rounds | 10 rounds | 9 rounds | 9 rounds | 8 rounds |
| **Fortress**: Arbiter's Armor and Ward | +1 | +1 | +1 | +2 | +2 |
| **Roots**: challenger's Speed | −1 | −1 | −1 | −2 | −2 |

**Crumble** counts down at the end of every round. When it reaches 0 and Cliff still has a creature standing, the challenger loses (rung out). Winning before then is a normal win.

---

## The Arbiters

Each card uses the same layout. Copy the [template](#template-for-a-new-or-changed-arbiter) to add one.

### 1. Salem · Aurora Peak · `aurora`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Astral | Ice Floe Arena | `iceFloes` (Hazard) | Polaris Merit | A full lap of Cloud Island |

**Setting:** low houses half-sunk into the earth for warmth, beneath the aurora. Inspired by Denali.

**Access: a lap of Cloud Island.** Salem only battles trainers who have walked a full lap of **Cloud Island**, a ring of six cloud nodes floating off the north-west coast.

- **The portal** in Aurora Peak (a dotted path to the island) opens at **night** (even turns), and **any time in Winter**.
- **The island:**
  - **Gatecloud Landing** (where the portal arrives)
  - **Nimbus Steps**
  - **Starfall Drift**
  - **Moonbow Arch**
  - **Thunderhead Rise**
  - **Stillwind Hollow**

  These are wild nodes (a rare area: +1 rarity) in a ring, with the **Eye of the Sky** in the middle.
- **A lap** is 6 steps in a row around the ring, always the same way round. Turning back starts the count again. A lap can span several turns: the ring can be walked by day too, but the portal is shut, so a trainer caught there at dawn stays until nightfall. **Leaving the island ends the lap** (the portal, Flying away, or being sent home after a team wipe).
- **The slog:** every step **onto** an island node (the portal step included) costs **+1 Initiative per Tier**: 2 at Tier 1, up to 6 at Tier 5. A step never costs more than a whole turn (5). Stepping back off the island costs the normal amount. Salem makes stronger trainers work harder, which also makes late-season farming a chore.

  | Tier | Initiative per island step | A full trip (portal + 6-step lap) |
  |---|---|---|
  | 1 | 2 | 14 (about 3 turns) |
  | 2 | 3 | 21 (about 5 turns) |
  | 3 | 4 | 28 (about 6 turns) |
  | 4 | 5 | 35 (7 turns) |
  | 5 | 5 (capped) | 35 (7 turns) |

- **Loot is only secured on escape.** Items found on the island go into a **Cloud satchel**, not the bag. They move to the bag when the trainer **escapes**: back through the portal, or by Flying away. A team wipe that sends the trainer home **loses the satchel**, so you can't grab the loot, lose a fight and keep it. Coins aren't held back. Items spent on the island (offerings, Salves…) come out of the real bag.
- **Once a lap is done,** Salem accepts the challenge any time, for the rest of the game.
- **On the island:** its wilds turn up Astral, Electric, Water and Charm creatures (by the time of day), plus **universal offerings**: Cloud Silk (+1), Stardust (+2) and the rare Moonbow Prism (+3) work on any creature. Only the [Cloud Island events](./10-events.md#cloud-island-events) happen there.
- **After beating Salem,** bridges open from the ring to the **Eye of the Sky**, where the Legendary **Nimbalune** (Water/Astral, Lv 10 + 1 per 25 turns) waits.
- **Code:** `portalOpen`, `stepCloudLap`, `cloudLapProgress` and `cloudStepExtra` (with `moveCost`) in `world.ts`; the Cloud satchel in `addItem` and `moveTrainer` (`state.ts`); the island in `src/data/map.ts` (`CLOUD_RING`, `CLOUD_EYE`).
- **Rules on screen:** before stepping through the portal, a prompt shows every rule and the trainer's status (portal, step cost, lap, satchel), with Step through / Not now. On the island, a ☁️ Cloud Island chip on the HUD shows the lap, the satchel and the portal at a glance, and opens the same rules. It disappears once the trainer leaves (`cloudRules`, `cloudPrompt`, `cloudSheet` in `app.ts`).
- **Look:** cotton candy pinks and purples veined with a sinister dark purple, candy-floss puffs and dark spires, under a dusky violet sky (deep purple at night). Paths and node tiles are midnight plum (`#2a0f3a`, tiles with a white rim) so they stand out from the pastel ground.

**Winter:** Aurora Peak is always under **Aurora Night** all Winter (turns 76–100), whatever the rolled weather.

**Arena effect: Ice floes.** The floes tip under unprepared creatures. At the end of each round, each active creature that isn't Astral may slip into the water (chance and damage by Tier in the table above). Salem's Astral creatures never slip.

**City Stable hot pot:** Geothermal Miso Nabe, +1 Ward in your next battle.

**Notes:** Aurora Night boosts Astral attacks (+2). In Winter, every battle at Aurora Peak (Salem's included) is under Aurora Night, so his Astral attacks hit harder then.

### 2. Fabian · Hollow Crest · `hollow`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Charm | Glamour Grove | `illusion` (Stat, Arbiter) | Glamour Merit | Find him in disguise |

**Setting:** cozy log cabins in a moss-draped rainforest. Inspired by Olympic.

**Access:** Fabian hides among the townsfolk. The challenger picks one of 3 villagers. A wrong guess costs 1 Initiative ("a bucket of glitter falls on you"). Once found, he stays found for the rest of the game.

**Arena effect: Illusion.** Fog and glamorous lighting: Fabian's creatures get +1 Evasion (+2 at Tier 4+), so they're harder to hit. Sure-hit moves ignore it.

**City Stable hot pot:** Mushroom Moss Nabe, +1 Evasion in your next battle.

### 3. Watson · Thunder Spike · `thunder`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Electric | Under the Spike | `volts` (Hazard / heal, both sides) | Bolt Merit | None |

**Setting:** a town on rugged badlands, shielded from the roving storm by a colossal lightning rod. Inspired by Badlands.

**Arena effect: Volts.** At the end of each round there's a chance (by Tier, above) that the great rod discharges across the arena, hitting **both** active creatures:
- **Electric creatures, dual types included, are healed** by the current (Health within their current heart). Watson's team is all Electric, so his creatures always heal.
- **Everyone else is shocked.** The damage uses the Electric type chart: double against Steel and Water, half against Astral and Rock.

**Counter:** bring your own Electric creatures, and the lightning heals them too.

**City Stable hot pot:** Prairie Chili Nabe, +1 Speed in your next battle.

### 4. Amber · Kilauea Forge · `kilauea`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Fire | Fire Pit | `flames` (Hazard) | Caldera Merit | Arena is on Kilauea island |

**Setting:** a forge town on the black-rock coast. Amber's Fire Pit is offshore on Kilauea island. Inspired by Hawai'i Volcanoes.

**Access:** the arena is a separate node on Kilauea island. Reach it by ferry from Kilauea Forge or Mangrove Port to Black Sand Cove (Ferry Pass, or a creature that can Sail), then on through the island's wilds.

**Arena effect: Flames.** Every second round, steam vents scald every active creature that isn't Fire. Amber's Fire creatures are immune.

**City Stable hot pot:** Volcanic Shoyu Nabe, +1 Power in your next battle.

### 5. Dahlia · Gloomshade · `gloom`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Grass | Forest Floor Arena | `darkness` (Accuracy, challenger) | Lily Merit | Dahlia's Trail on the Forest Floor |

**Setting:** boardwalks and ring platforms built into towering redwoods. Inspired by Redwood.

**Access: the Forest Floor and Dahlia's Trail.** Dahlia's arena hides on the **Forest Floor**, a single dark node below Gloomshade. It's no longer reached from the city menu.

- **Getting down:** climb down from Gloomshade with a **Canopy Rope**, a roaming key item sold in a different town each game (see [Roaming key items](#roaming-key-items)).
- **Exploring:** the Forest Floor is explored again and again (🔍 Explore, the usual Initiative), with a **d8**:

  | d8 | Result |
  |---|---|
  | 1–2 | Nothing. The active team loses 1 Morale: they fear the dark. |
  | 3–4 | A wild creature. Always night creatures, since it's dark. Running needs **7+** instead of 4+, unless the follower has Quick Step. Sweet Scent makes 3–5 encounters. |
  | 5–6 | An exotic find: Duskberry (+2 Morale, +1 Loyalty), Root Salve (+2 Vitality and clears Fatigue), Heartwood Resin (Grass 3 / Charm 2 / Rock 1) or Glowcap (Charm 3 / Grass 2 / Astral 1). Each is a slight improvement on its usual counterpart. Forager and Keen Nose work as usual. |
  | 7–8 | A sign of **Dahlia's Trail**. |

- **After Dahlia is beaten:** the Forest Floor's explore die becomes a **d6** with the same table (1–2 nothing, 3–4 a creature, 5–6 an exotic find). Trail results can't come up any more, so no explore is wasted on them (`floorDie`).
- **The trail:** **3 + Tier** signs (4 at Tier 1, up to 8 at Tier 5) reveal her arena. A 🏟️ Dahlia button then appears on the Forest Floor.
- **Starting over:** **leaving the Forest Floor, by choice or by being sent home after a defeat, loses every sign.** Some Forest Floor events also cost a sign.
- **Hostile events:** while there, only the Forest Floor's hostile, forced events happen (see the [events doc](./10-events.md#forest-floor-events)).
- **On screen:** a rules prompt before climbing down, and a 🌲 Forest Floor HUD chip (trail progress, the rules) while there.
- **Code:** `exploreFloor`, `trailProgress`, `trailNeeded` and `floorFind` in `world.ts`; the trail reset in `moveTrainer` (`state.ts`); `FOREST_FLOOR` in `map.ts`; `hardRun` in `battle.ts`; `floorRules`, `floorPrompt` and `floorSheet` in `app.ts`.

**Arena effect: Darkness.** In the lightless forest floor, the challenger's accuracy rolls are 1 lower (2 lower at Tier 4+). Sure-hit moves ignore it.

**City Stable hot pot:** Canopy Herb Nabe, +1 Vigor in your next battle.

### 6. Cliff · Houndmouth Canyon · `canyon`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Rock | Crumbling Plateau | `crumble` (Timer, challenger) | Plateau Merit | None |

**Setting:** an unfathomable canyon whose walls shift as Rock creatures carve new tunnels. Inspired by Grand Canyon.

**Arena effect: Crumble (a ring-out timer).** The plateau shrinks at the end of every round. The challenger has **10 rounds** (Tier 1–2), **9** (Tier 3–4) or **8** (Tier 5) to beat Cliff. If the plateau is gone while Cliff still has a creature standing, the challenger is **rung out** and loses. It deals no damage.

- **On screen:** a "⏳ Plateau: N rounds left" chip in the battle header, red and pulsing for the last 2 rounds. The arena floor visibly shrinks toward the creatures as rounds pass, with chunks breaking off the edge.
- **Losing by ring-out** is a normal Arbiter loss: no coins lost, and creatures still earn their battle XP.
- **Code:** `ringRounds`, `ringLeft` and the `crumble` case of `arenaTrick()` in `battle.ts`; the `ring` battle event; `shrinkRing` in `render/battle.ts`.

**City Stable hot pot:** Red Clay Nabe, +1 Armor in your next battle.

**Notes:** this effect rewards hitting hard and fast. Stalling tactics (healing, Catch Breath, swapping a lot) run the clock down.

### 7. Stella · Iron Coast · `iron`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Steel | Floating Fortress | `fortress` (Stat, Arbiter) | Anchor Merit | Clear the Iron Coast Gauntlet |

**Setting:** foggy pebble beaches and colorful houses, where strange ore washes ashore. Inspired by Acadia.

**Access: the Iron Coast Gauntlet.** Stella's fortress stays beneath the waves until the challenger beats a run of local trainers:

| Tier | Trainers to beat | Their level | The last one |
|---|---|---|---|
| 1 | 2 | Lv 3 | Lv 4 |
| 2 | 4 | Lv 5 | Lv 6 |
| 3 | 6 | Lv 7 | Lv 8 |
| 4 | 8 | Lv 9 | Lv 10 |
| 5 | 10 | Lv 11 | Lv 12 |

- **The trainers:** Steel-leaning teams, one level above that Tier's Trainer Hall opponents. They bring 2 creatures (3 from Tier 3), or fewer if the challenger has fewer healthy creatures. Normal trainer-battle stakes and XP apply.
- **Cost and pacing:** each match is a city action (1 Initiative; Ranger 2, Urbanite 0). There's no limit per turn. Matches can be spread across turns, and the challenger can rest at the Stable between them.
- **Resets:** **leaving Iron Coast resets the count**: travelling, Flying, or being sent home after a team wipe. Losing a match doesn't reset it; that trainer can be fought again.
- **Once cleared,** Stella can be challenged at any time, now or on a later visit. The Gauntlet never needs repeating.
- **Code:** `gauntletBattle`, `gauntletWin` and `gauntletProgress` in `world.ts`; the reset is in `moveTrainer` (`state.ts`).

**Arena effect: Fortress.** Stella's fortress plating gives her creatures +1 Armor and +1 Ward (+2 each at Tier 4+), reducing all damage they take.

**City Stable hot pot:** Lobster Bisque Nabe, +1 Armor and +1 Ward in your next battle.

### 8. Katy · Mangrove Port · `mangrove`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| Water | Root Maze | `roots` (Stat, challenger) | Tidal Merit | Root Whistle or a creature that can Sail |

**Setting:** a city on stilts above marsh waters, linked by boardwalks and swaying bridges. Inspired by Everglades.

**Access:** the mangrove roots hide Katy. The challenger needs a **Root Whistle**, a **roaming key item** sold in a different town each game (see [Roaming key items](#roaming-key-items)), or a creature on the active team that can Sail.

**Arena effect: Roots.** Shifting roots slow the challenger's creatures: −1 Speed (−2 at Tier 4+), so Katy's creatures tend to act first.

**City Stable hot pot:** Swamp Gumbo Nabe, +1 Focus in your next battle.

---

## Roaming key items

Two Arbiter keys move each game, so every run sends trainers somewhere new:

| Key item | Opens | Sold in |
|---|---|---|
| Canopy Rope | The Forest Floor below Gloomshade (Dahlia) | A random eligible town, rolled each game |
| Root Whistle | Katy (Mangrove Port) | A different random eligible town, rolled each game |

- **Eligible towns:** every town without a special facility: Mistfall, Lumber Hollow, Dustmere Trading Post, Ridgeway and Saltmarsh Landing. Valor Ridge (Battle School), Quillhaven (Research Facility), Shifting Depths, and any future facility town are left out. So is Black Sand Cove, because it's only reachable by ferry, which would lock a key item behind another one.
- **The two items always land in different towns.** A town can still sell its own fixed key item as well, e.g. Mistfall's Fog Lantern alongside a rolled Root Whistle.
- **Fixed key items stay put:** the Fog Lantern (Mistfall), the Summit Pick (Ridgeway) and the Ferry Pass (Saltmarsh Landing and Kilauea Forge, two spots, since the island is a long way).
- **Finding them:**
  - the town's Market tile and map preview list what it sells;
  - Dahlia's and Katy's arena hints name the town ("sold in Ridgeway this season");
  - every Notice Board pins a hint for whichever of the two you still lack.
- **Hotseat and online:** everyone in a match shares the same placement.
- **Saves:** older saves keep the classic towns (Lumber Hollow, Saltmarsh Landing).
- **Code:** `ROAMING_KEY_ITEMS`, `KEY_ITEM_TOWNS` (`map.ts`); `rollKeyTowns`, `keyTownOf` (`state.ts`); `townKeyItems`, `keyTownName` (`world.ts`).

---

## Balance notes

Observations from the current code, to review when balancing. Tick them off or move them into a card's **Notes** once they're decided.

- [ ] **In-game arena text understates the effects.** The challenge screen's arena descriptions (`CITIES[…].arena.text`) give Tier 1 numbers only. They don't mention that stat effects double at Tier 4+, or that hazard chance and damage grow with Tier.
- [ ] **Cliff's ring-out timer** (10 / 10 / 9 / 9 / 8 rounds) against 2–3 Rock creatures: tight enough to force aggression, loose enough for a fair team?
- [ ] **Ice floes at Tier 1–2** (1-in-6 chance) rarely matter.
- [ ] **Access conditions vary a lot in cost:**
  - Salem needs a lap of Cloud Island: 7 island steps at +1 Initiative per Tier (14–35 Initiative), only reachable at night or in Winter, with an explore at every step.
  - Fabian can cost Initiative on wrong guesses.
  - Dahlia and Katy need a 12–14 coin key item.
  - Amber needs a Ferry Pass and a trip.
  - Stella needs the Iron Coast Gauntlet: 2 to 10 trainer battles, by Tier, without leaving the city.
  - Watson and Cliff are free.
- [ ] **A Cloud Island trip takes 14–35 Initiative** (7 island steps at +1 per Tier), so 3–7 turns. A trainer must survive several nights and stranded days on the island. Fine as a pilgrimage, or too long at Tier 3+?
- [ ] **The Cloud satchel** makes the island all-or-nothing for items. Universal offerings found there can't be used to recruit on the island itself.
- [ ] **Dahlia's Trail at Tier 5** needs 8 signs at 1 in 4 per explore: about 32 explores (Initiative), plus hostile events that can cost signs. Long enough?
- [ ] **The Gauntlet grows to 10 trainers at Tier 5,** which costs at least 10 Initiative (2 turns or more), plus Stable rests. Leaving Stella for last makes her by far the most expensive Arbiter to reach.
- [ ] **Losing costs nothing** against Arbiters (except a full wipe). Repeated attempts are cheap apart from the Initiative.
- [ ] **The prize scales with Tier** (🪙 10–50), so later Merits pay more.
- [ ] **Placeholder species** are in Arbiter pools until the roster is filled, so Arbiter teams will change as creatures are swapped in (see [the creature checklist](./08-creature-checklist.md)).

---

## Changing or adding an Arbiter or arena effect

### Template for a new or changed Arbiter

Copy this block into [The Arbiters](#the-arbiters) and add a row to the [Overview](#overview).

```markdown
### N. (Name) · (City) · `city-id`

| Type | Arena | Effect | Merit | Access condition |
|---|---|---|---|---|
| (Type) | (Arena name) | `trickId` (Hazard / Stat / Accuracy, which side) | (Merit name) | (None, or the condition) |

**Setting:** one or two sentences about the city. Inspired by (park).

**Access:** how the challenger gets in (or "None").

**Arena effect: (Name).** What happens, when it happens, who it affects, and who is immune. Exact numbers per Tier go in the Tier table above.

**City Stable hot pot:** (name), (buff) in your next battle.

**Notes:** balance thoughts and counters.
```

### Design checklist for an arena effect

- [ ] Says **who** it affects: the challenger, the Arbiter, or both.
- [ ] Says **when**: all battle, every round, every Nth round, or from round N.
- [ ] Gives **numbers for each Tier**. Add a row to the [Tier table](#arena-effects-by-tier-exact-numbers).
- [ ] Has a **counter** the player can plan for (a type that's immune, sure-hit moves, a hot pot buff, a key item…).
- [ ] Fits the Arbiter's type and city theme.
- [ ] The in-game arena text says the same thing (`CITIES[…].arena.text`).

### Build it (developers)

1. **A new effect:** add its id to `ArenaTrick` in `src/data/schema.ts`, then implement it in `src/engine/battle.ts`:
   - a stat change for one side goes in `eff()`, next to `illusion` and `fortress`;
   - an accuracy change goes in `accuracyMods()`, next to `darkness`;
   - an end-of-round hazard goes in `arenaTrick()`, using its `hurt()` helper, next to `iceFloes` and `flames`.
2. **An Arbiter or city:** edit `CITIES` in `src/data/map.ts` (name, type, park, Arbiter, Merit, arena name, trick and text, hot pot, blurb). A new city also needs a map node and routes.
3. **An access condition:** add a case to `arbiterGate()` in `src/engine/world.ts`. Special flows like Cloud Island, finding Fabian or the Gauntlet are in `src/ui/app.ts` (`arbiter`).
4. **Then:**
   - Add a test in `tests/engine.test.ts`.
   - Update this doc. **A test fails if an Arbiter or arena effect in the game is missing from this file.**
   - Update the How to Play guide if needed (`src/ui/guide.ts`).
   - Add any new icon to [the icon checklist](./07-icon-checklist.md).

---

## Ideas backlog

Arbiter and arena ideas to design and build. Add yours here, then move them up once they're in the game.

| Idea | For | Sketch | Status |
|---|---|---|---|
| *(example)* Rising tide | Katy (Water) | The arena floods a little each round: non-Water creatures lose 1 Speed per 2 rounds (up to −3). | Idea |
| *(example)* Second phase | Any | At half the team KO'd, the Arbiter's ace gets +1 to every stat. | Idea |
| | | | |
