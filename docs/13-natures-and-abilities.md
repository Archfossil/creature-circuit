# Natures, Abilities & Swap Moves

The traits every creature carries, shown on its index card:

- **Nature:** a personality that shifts two stats and unlocks three perks as the creature's Loyalty grows. Each *creature* has its own.
- **Ability:** an overworld power that's active while the creature is **Following** you. Set by *species*.
- **Swap Moves:** what happens when the creature is **swapped in** during battle. The trainer sets one for each teammate; until then a pair uses a neutral one picked at random.
- **Instinct:** a passive that fires on its own **in battle** (when it takes the field, loses a heart, is hit, and so on). Set by *species*, shared by its family. The 48 Instincts and their exact rules are in [14 · Instinct Checklist](./14-instinct-checklist.md), generated from the game data.

**Code:**
- `NATURES` and `ABILITIES` in `src/data/content.ts`, and `SWAP_MOVES` in `src/data/swapMoves.ts`, hold the names, numbers and in-game text.
- The rules are applied in `src/engine/creature.ts` (Natures), `src/engine/world.ts` (Abilities) and `src/engine/battle.ts` (Swap Moves, in `doSwap`; which a pair can set is in `src/engine/swaps.ts`).

---

## Natures

### How Natures work

- **Assigned at random** when a creature is created (wild, trainer or recruited). A starter's is chosen by its trainer at the start, as are its Ability (any of the eight) and Instinct (any of its type's six). A few sources set it: the Roaming Trader's creature shows its Nature up front.
- **Stats:** the Nature's **up** stat gets +1 (Volatile has two) and its **down** stat −1 (never below 0). Evasion always stays within 1–6.
- **Perks:** each Nature has three perks that unlock **permanently** when the creature's Loyalty reaches **3**, **6** and **10**. Perks never re-lock, even if Loyalty drops later. Loyalty ranges 0–10.
- **Changing it:** the Creature Caretaker event lets the player pick a new Nature for one creature (from 3 offered). The creature keeps the *number* of perks it had unlocked, now taken from the new Nature, starting with its first perk.

### Overview

| # | Nature | ID | Up | Down | Perk at 3 Loyalty | Perk at 6 | Perk at 10 | Stat points from perks |
|---|---|---|---|---|---|---|---|---|
| 1 | Adamant | `adamant` | Power | Focus | Knuckle Down: +1 Power | Thick Hide: +1 Armor | Unbreakable: +1 Vigor, +1 Power | 4 |
| 2 | Timid | `timid` | Speed | Power | Light Feet: +1 Speed | Skittish: +1 Evasion | Brave Heart: +2 Power | 4 |
| 3 | Fortified | `fortified` | Armor | Speed | Shell Up: +1 Armor | Rooted: +1 Ward | Bastion: +1 Vigor, +1 Armor | 4 |
| 4 | Resonant | `resonant` | Focus | Armor | Attuned: +1 Focus | Harmonic: +1 Ward | Crescendo: +2 Focus | 4 |
| 5 | Enduring | `enduring` | Vigor | Ward | Deep Breath: +2 Stamina | Stubborn: +1 Ward | Last Stand: +1 Vigor, +1 Armor | 5 (2 of them Stamina) |
| 6 | Volatile | `volatile` | Stamina, Power | Evasion | Hot Blooded: +1 Stamina, +1 Focus | Reckless: +1 Power, +1 Focus | Overdrive: +2 Power, +2 Focus | 8 (1 of them Stamina) |

### The Natures

Each card uses the same layout. Copy the [template](#template-for-a-new-nature) to add one.

#### 1. Adamant · `adamant`

| Up | Down | In-game text |
|---|---|---|
| +1 Power | −1 Focus | "Favors raw physical brawling over elemental channeling." |

**Perks:** Knuckle Down (3 Loyalty): +1 Power · Thick Hide (6): +1 Armor · Unbreakable (10): +1 Vigor, +1 Power.

**Suits:** physical attackers. At full Loyalty it's +3 Power in total.

#### 2. Timid · `timid`

| Up | Down | In-game text |
|---|---|---|
| +1 Speed | −1 Power | "Prioritizes lightning-fast positioning at the cost of force." |

**Perks:** Light Feet (3): +1 Speed · Skittish (6): +1 Evasion · Brave Heart (10): +2 Power.

**Suits:** fast creatures. The last perk wins back the Power it gave up, and more (+1 Power overall at full Loyalty).

#### 3. Fortified · `fortified`

| Up | Down | In-game text |
|---|---|---|
| +1 Armor | −1 Speed | "Builds an immovable defensive wall, sacrificing mobility." |

**Perks:** Shell Up (3): +1 Armor · Rooted (6): +1 Ward · Bastion (10): +1 Vigor, +1 Armor.

**Suits:** tanks. At full Loyalty it's +3 Armor in total.

#### 4. Resonant · `resonant`

| Up | Down | In-game text |
|---|---|---|
| +1 Focus | −1 Armor | "Leans into elemental mastery and status effects; physical defenses go soft." |

**Perks:** Attuned (3): +1 Focus · Harmonic (6): +1 Ward · Crescendo (10): +2 Focus.

**Suits:** elemental attackers. At full Loyalty it's +4 Focus in total.

#### 5. Enduring · `enduring`

| Up | Down | In-game text |
|---|---|---|
| +1 Vigor | −1 Ward | "Piles on health to soak damage, but is open to elemental energy." |

**Perks:** Deep Breath (3): +2 Stamina · Stubborn (6): +1 Ward · Last Stand (10): +1 Vigor, +1 Armor.

**Suits:** creatures that need to last. Stubborn cancels the Ward it gave up.

#### 6. Volatile · `volatile`

| Up | Down | In-game text |
|---|---|---|
| +1 Stamina, +1 Power | −1 Evasion | "All power, and the stamina to keep throwing it; cavalier with its own safety." |

**Perks:** Hot Blooded (3): +1 Stamina, +1 Focus · Reckless (6): +1 Power, +1 Focus · Overdrive (10): +2 Power, +2 Focus.

**Suits:** attackers of either kind with heavy, high-Effort moves. At full Loyalty it's +4 Power, +4 Focus and +2 Stamina in total, and a foe finds it easier to hit the whole way.

### Nature balance notes

To review when balancing. Tick them off or move them into a card once decided.

- [ ] **Perk totals differ:** Adamant, Timid, Fortified and Resonant give 4 stat points. Enduring gives 5 (2 of them Stamina, which is worth less than a combat stat). Volatile gives 8, as Evasion is the dearest stat to lose: before it was raised, Volatile creatures won 41% of simulated fights where the others won 49–56%.
- [ ] **Down stats are never below 0, and Evasion stays within 1–6**, so a Volatile creature with Evasion 1 loses nothing from its down stat.
- [ ] **Enduring's first perk is Stamina,** while its theme (and up stat) is Vigor. Intended?
- [ ] **Timid's last perk (+2 Power)** fully reverses its down stat. Other Natures never recover their down stat (Enduring partly does, through Ward).
- [ ] **No Nature raises Ward as its up stat**, and none lowers Vigor or Stamina.
- [ ] **Natures are random,** so a creature can get a poor match (e.g. Resonant on a physical attacker). The Caretaker event is the only fix.

---

## Abilities

### How Abilities work

- **Only the Following creature's Ability is active.** The player picks a follower at the start of each turn, or any time from the Following chip.
- **Set by species:** every creature of a species has the same Ability.
- **On the map only:** Abilities never affect battle numbers. (Quick Step affects escaping from a battle.)

### Overview

| # | Ability | ID | In-game text | Where it applies | Creatures with it |
|---|---|---|---|---|---|
| 1 | Sweet Scent | `sweetScent` | "Explore rolls of 3–5 become wild encounters." | Exploring | 51 (7 hand-made) |
| 2 | Baby-Doll Eyes | `babyEyes` | "Market prices are 25% cheaper." | Markets | 55 (6 hand-made) |
| 3 | Keen Nose | `keenNose` | "When you discover an item, sniff out three finds and keep the one you like." | Exploring (item finds) | 42 (8 hand-made) |
| 4 | Star Seeker | `starSeeker` | "Roll one extra rarity die on encounters." | Wild encounters | 52 (6 hand-made) |
| 5 | Trailblazer | `trailblazer` | "Your first move each turn costs no Initiative." | Moving | 42 (5 hand-made) |
| 6 | Forager | `forager` | "Found berries and materials come in pairs." | Exploring (item finds) | 46 (8 hand-made) |
| 7 | Quick Step | `quickStep` | "Always escape from wild battles, and get 1 Initiative back when you do." | Running from wild battles | 51 (5 hand-made) |
| 8 | Lucky Charm | `luckyCharm` | "+1 to recruitment rolls." | Recruiting | 47 (7 hand-made) |

*Counts include placeholder species, so they'll change as the roster is filled in (see [the creature checklist](./08-creature-checklist.md)).*

### The Abilities

Each card uses the same layout. Copy the [template](#template-for-a-new-ability) to add one.

#### 1. Sweet Scent · `sweetScent`

**Exact rule:** when exploring a wild node, a d6 roll of **3–5** is a wild encounter, instead of 3–4. On a road or meadow node, 40% of encounters are a roaming trainer, as usual. Only a 6 now finds items.

**Interactions:** a Lure Incense already guarantees an encounter, so Sweet Scent adds nothing while it burns. Hush Smoke masks it: while hushed, a 5 is a find again.

#### 2. Baby-Doll Eyes · `babyEyes`

**Exact rule:** Market prices × 0.75, rounded up, minimum 💰 1.

**Interactions:** stacks with the Merchant trainer style: both together give × 0.5625 (about 44% off).

#### 3. Keen Nose · `keenNose`

**Exact rule:** when exploring finds items (a d6 roll of 5–6), three different finds are rolled and the player keeps one.

**Interactions:** with Forager on the same creature, each of the three finds is already doubled. Only one creature follows at a time, so this only matters for a species with both, which none currently have.

#### 4. Star Seeker · `starSeeker`

**Exact rule:** +1 rarity die on wild encounters (base 2, plus Tier bonus dice, plus Star Charm).

**Interactions:**
- Stacks with Star Charm and the Fortune Teller event.
- Applies to normal wild encounters and Explore the Depths, not to Legendaries.

#### 5. Trailblazer · `trailblazer`

**Exact rule:** the first move each turn costs 0 Initiative.

**Interactions:** the same perk as the Pathfinder trainer style. They **don't stack**: still one free move per turn.

#### 6. Forager · `forager`

**Exact rule:** when exploring finds **berries** (Sunberry, Dewberry, Moonberry) or an **offering material**, you get 2 instead of 1. Restoratives, charms, totems and coins aren't doubled.

#### 7. Quick Step · `quickStep`

**Exact rule:** running from a **wild** battle always succeeds (no Speed roll). That includes wild creatures from Explore the Depths, and the Forest Floor, where running otherwise needs a 7+. **After a successful escape, you get 1 Initiative back** (never above 5), so running doesn't cost the turn's progress.

**Interactions:** doesn't apply to Legendary battles: you can run from those, but it takes the normal Speed roll. You can't run from trainer battles at all.

#### 8. Lucky Charm · `luckyCharm`

**Exact rule:** +1 on every recruitment roll.

**Interactions:** stacks with the Beast Whisperer trainer style (+2 together) and cancels out the Merchant style's −1.

### Ability balance notes

- [ ] **Two Abilities copy a trainer style:** Trailblazer (Pathfinder) and Lucky Charm (Beast Whisperer). Trailblazer doesn't stack with Pathfinder, but Lucky Charm does stack with Beast Whisperer. Make these consistent?
- [ ] **Sweet Scent trades items for encounters:** it turns a 5 (an item find) into an encounter, so it's a downside for item-hunting.
- [ ] **Keen Nose and Forager overlap** (both improve item finds), and both are useless with Sweet Scent's extra encounters.
- [ ] **Quick Step** was situational (it only mattered when leaving a wild battle). It now also refunds 1 Initiative per escape, which makes it a strong pick for hunting a specific creature: run from everything else for nearly free. Watch for abuse with Sweet Scent, and with Lure Incense and the Star Charm now that they last a whole turn.
- [ ] **Most Abilities are economy or exploration;** none affects battle. Deliberate, so the follower choice is about the map, not fights.
- [ ] **Distribution is fairly even** (42–55 species each). Trailblazer and Keen Nose are the rarest.

---

## Swap Moves

### How Swap Moves work

- **When:** a creature is **swapped in** during battle (from round 2). The incoming creature is the **Alpha**; the one it replaces is the **partner**. The Alpha's Swap Move fires straight away.
- **Chosen per direction:** the trainer sets one Swap Move for each teammate on a creature's card (`CreatureInst.swapMoves`, keyed by the partner's uid). The card lists only creatures on the active team; creatures resting in totems aren't shown (a creature in a totem shows a note instead), and choices already set are kept for when they're back on the team. It's used when this creature swaps in for that partner. So Sproutle swapping in for Puddlit can differ from Sproutle swapping in for Zapup, and from Puddlit swapping in for Sproutle. It can also be changed from the battle's swap screen.
- **Default:** a slot that's unset, or whose move is no longer allowed, uses a neutral Swap Move picked at random for that pair and direction (`defaultSwapMove`). It's seeded by the two creatures' uids, so it's the same every battle and on every browser, until the trainer sets one. Opposing trainers and wild creatures use theirs the same way.
- **Which moves a pair can set** (`swapLock` in `engine/swaps.ts`):
  - **Neutral** moves: every pair, at any Teamwork.
  - **Typed** moves: the **partner** must have the move's type; the Alpha's own types don't count. So a Rock / Water creature swapping in for an Astral one can set Astral moves, and the Astral one swapping in for it can set Rock and Water moves. Two creatures sharing a type lend it to each other. A move set under older rules that's no longer allowed falls back to the default. The first of each type needs the Alpha to have **Teamwork 1** with the partner, the second **Teamwork 2**.
  - **Boosted** moves (one per type): **both** creatures must have the move's type; any shared type counts (Rock / Water with Rock / Fire can use the Rock one). All need **Teamwork 3** for now, which takes Loyalty 6 in both; each move sets its own requirement. The pair also keeps the partner's regular typed moves.
- **Typed hits** inflict their type's status on a **1 or 2** on the damage die (regular elemental moves need a 1). A few typed moves inflict it outright instead.
- **Teamwork** (`CreatureInst.teamwork`, rules in `engine/teamwork.ts`): each creature has a Teamwork score with every partner. The swap bonus is **the Alpha's Teamwork with the partner ÷ 2, rounded down**, using the value from *before* this swap. It's added wherever a move's effect says "+ bonus".
  - **Travelling together:** every pair on the active team gains **0.2** at the end of each turn. When a pair reaches a new whole point, it's announced at the start of the next turn.
  - **Swapping:** a pair gains **+1** the first time one swaps in for the other in a battle. Later swaps between the same pair in that battle add nothing, so swapping back and forth doesn't farm it. Gains are announced when the battle ends.
  - **Cap:** a pair's Teamwork is at most **half the lower Loyalty of the two** (`teamworkCap`): Loyalty 2 → 1, Loyalty 4 → 2, Loyalty 10 → 5. Level doesn't matter. A new recruit (Loyalty 0) earns no Teamwork until it starts trusting the trainer, and the typed Swap Moves need both creatures at Loyalty 2 (Teamwork 1) or 4 (Teamwork 2).
  - **Falling:** if a Loyalty drops, the pair's Teamwork drops to the new cap at the end of the turn and stays there (regaining Loyalty doesn't restore it; it has to be earned again). The trainer is told at the start of the next turn (`GameState.teamworkFell`).
  - **Legendaries** lose Loyalty every turn, so their Teamwork keeps sliding unless treats keep their Loyalty up. That makes them costly partners to keep in step, but a Legendary Alpha with Teamwork is a strong part of a championship team.
  - The bonus runs from 0 (under 2 Teamwork) to +2 (4–5 Teamwork, both at Loyalty 8+).
- **The swap resolves at the outgoing creature's Speed**, plus the move's Speed bonus (Slipstream +3, Live Wire +2, Closed Circuit +4).
- **Stat boosts** from a Swap Move last while the Alpha stays in, and are capped at ±3 like every battle modifier.
- **Heals overheal:** a Swap Move heal beyond a full heart becomes **Overheal**, bonus Health that soaks up damage first (up to half a heart, for the rest of the battle; see [03 · Combat Rules](./03-combat-rules.md#vigor-health--vitality)). So Siphon, Heartlink, Overgrowth, Wellspring and the other healing Swap Moves still help a creature that swaps in at full Health. Instinct heals (Heartmend, Deep Roots) and healing moves (Photosynth, Second Wind, Overgrowth) work the same way.
- **Code:** the moves are data in `src/data/swapMoves.ts` (`before` effects, an optional `hit` and `second` hit, `after` effects). `doSwap()` in `src/engine/battle.ts` runs them, and `describeSwap()` writes the text the card and swap screen show from the same data.
- **Wording:** each move's in-game text names who does what. In the game the creatures' names are filled in ("Cragtidekit swaps in with an attack of Sproutle's type (Grass), powered by Sproutle's Focus."). The tables below show the general form, with "the Alpha" (swapping in) and "the partner" (swapping out). Where a move says whose type it uses, the game adds the type in brackets. The grey line under it gives the numbers, naming whose stats they are ("d6 + 2 (Sproutle's Focus) − foe's Ward damage"). When writing a new move, say plainly which creature does each thing, and avoid a bare "it" where it could mean either creature.

### Neutral Swap Moves

| # | Move | ID | Teamwork | In-game text | Exact effect |
|---|---|---|---|---|---|
| 1 | Tag Strike | `tagStrike` | 0 | "The Alpha swaps in with an attack of the partner's type, powered by the partner's Focus." | d8 to hit vs the foe's Evasion. On a hit: d6 + partner's Focus + bonus − foe's Ward, using the **partner's** main type on the type chart. |
| 2 | Shield Pass | `shieldPass` | 0 | "The Alpha borrows half of the partner's Armor and Ward for as long as it stays in, then counters with a physical hit." | +(partner's Armor ÷ 2, rounded up, at least 1, + bonus) Armor and the same for Ward, then a sure counter: d6 + Power − foe's Armor. |
| 3 | Slipstream | `slipstream` | 0 | "The Alpha rides the partner's Speed to strike first with a physical hit." | +3 Speed for this swap's turn order. A sure physical hit: d6 + Power + (partner's Speed ÷ 3) + bonus − foe's Armor. |
| 4 | Siphon | `siphon` | 0 | "The Alpha drains the foe with an attack of its own type, then heals using the partner's Vigor." | A sure hit: d6 + Focus − foe's Ward, using the **Alpha's** type on the type chart. Then it heals (partner's Vigor ÷ 2, rounded up, + bonus) Health. |
| 5 | Rally | `rally` | 0 | "The partner cheers the Alpha on: both restore Stamina and shake off some Fatigue, and the Alpha gains Power and Focus." | Both creatures' Stamina refills and each loses 1 Fatigue. +1 Power and +1 Focus (+2 each with a Teamwork bonus of 1 or more). |

### Typed Swap Moves

"Status on a 1–2" means the type's status (Astral Daze, Charm Beguile, Electric Shock, Fire Burn, Grass Snare, Rock Stagger, Steel Sunder, Water Soak) when the damage die shows 1 or 2. Elemental hits use the move's own type on the type chart; physical ones ignore it.

| Type | Move | ID | Teamwork | In-game text | Exact effect |
|---|---|---|---|---|---|
| Astral | Starfall Relay | `starfall-relay` | 1 | "As the Alpha swaps in, the partner's Focus falls on the foe as starlight." | d8 to hit. d6 + partner's Focus + bonus − Ward. Status on a 1–2. |
| Astral | Twin Orbit | `twin-orbit` | 2 | "The Alpha and the partner circle each other: the Alpha slips out of reach, the foe loses track, and the Alpha strikes." | +1 Evasion; foe −1 Evasion. Then a sure hit: d6 + Focus + bonus − Ward. Status on a 1–2. |
| Charm | Sweet Handoff | `sweet-handoff` | 1 | "The partner charms the foe on its way out: the foe is beguiled, and the Alpha lands a light hit and steadies itself." | Beguile on the foe (if it has no status). A sure hit: d4 + Focus − Ward. Then the Alpha heals 1 + bonus. |
| Charm | Heartlink | `heartlink` | 2 | "The Alpha and the partner mend each other, and the foe's heart goes out of its attacks." | The Alpha heals (partner's Vigor ÷ 2, up) + bonus; the partner (benched) heals (Alpha's Vigor ÷ 2, up) + bonus; foe −1 Power. No damage. |
| Electric | Live Wire | `live-wire` | 1 | "The partner charges the Alpha up, and the Alpha jumps in crackling to strike before the foe can react." | +2 Speed for turn order. d8 to hit. d6 + Focus + bonus − Ward. Status on a 1–2. |
| Electric | Arc Bridge | `arc-bridge` | 2 | "A current arcs from the partner through the Alpha into the foe, powered by both." | A sure hit: d6 + Focus + (partner's Focus ÷ 2, down) + bonus − Ward. Status on a 1–2. |
| Fire | Kindle Swap | `kindle-swap` | 1 | "The partner leaves embers behind as it goes: the foe burns and the Alpha is fired up." | Burn on the foe (if it has no status). +1 Power (+2 with a Teamwork bonus). No damage. |
| Fire | Phoenix Handoff | `phoenix-handoff` | 2 | "The Alpha rises from the partner's flames in a blazing strike." | d8 to hit. **d8** + Focus + bonus − Ward. Status on a 1–2. |
| Grass | Root Relay | `root-relay` | 1 | "Roots pass from the partner to the Alpha: they snare the foe, the Alpha strikes, and the roots feed it." | Snare on the foe (if it has no status). A sure hit: d4 + Focus − Ward. Then the Alpha heals 1 + bonus. |
| Grass | Overgrowth | `overgrowth` | 2 | "The partner's strength grows into the Alpha as bark and leaf, healing and toughening it before it strikes." | The Alpha heals (partner's Vigor ÷ 2, up) + bonus; +1 Armor, +1 Ward. Then a sure hit: d4 + Focus − Ward. |
| Rock | Landslide Tag | `landslide-tag` | 1 | "The Alpha rides the partner's weight down onto the foe." | d8 to hit. Physical: d6 + Power + (partner's Armor ÷ 2, up) + bonus − Armor. Status on a 1–2. |
| Rock | Bulwark Swap | `bulwark-swap` | 2 | "The partner raises stone walls as it leaves, and the Alpha hits back from behind them." | +(2 + bonus) Armor, +1 Ward. Then a sure physical hit: d6 + Power − Armor. |
| Steel | Iron Relay | `iron-relay` | 1 | "The partner shoes the Alpha in steel, and the Alpha charges in to dent the foe's defences." | A sure physical hit: d6 + Power + bonus − Armor. Status on a 1–2. |
| Steel | Alloy Guard | `alloy-guard` | 2 | "The partner plates the Alpha in metal and strips the foe's, then the Alpha strikes." | +(partner's Armor ÷ 2, up, at least 1, + bonus) Armor; foe −1 Armor. Then a sure physical hit: d6 + Power − Armor. |
| Water | Tide Relay | `tide-relay` | 1 | "The Alpha swaps in on a wave of the partner's Focus." | d8 to hit. d6 + partner's Focus + bonus − Ward. Status on a 1–2. |
| Water | Wellspring | `wellspring` | 2 | "The Alpha drinks from the partner's spring: the Alpha heals, both refill Stamina, and the foe is drenched." | The Alpha heals (partner's Vigor ÷ 2, up) + bonus; both refill Stamina; Soak on the foe (if it has no status). No damage. |

### Boosted Swap Moves

For two creatures that share the type. Each draws on both of them.

| Type | Move | ID | Teamwork | In-game text | Exact effect |
|---|---|---|---|---|---|
| Astral | Conjunction | `conjunction` | 3 | "The Alpha and the partner align like two stars and strike the foe one after the other." | **Two** sure hits: d6 + Focus − Ward, then (if the foe is still standing) d4 + (partner's Focus ÷ 2, up) + bonus − Ward. Each can inflict status on a 1–2. |
| Charm | Duet | `duet` | 3 | "The Alpha and the partner sing to each other: both are mended, and the foe is too beguiled to fight its best." | Beguile on the foe (if it has no status); foe −1 Power, −1 Focus; the Alpha heals (partner's Vigor ÷ 2, up) + bonus; the partner (benched) heals (Alpha's Vigor ÷ 2, up) + bonus. Then a sure hit: d4 + Focus − Ward. |
| Electric | Closed Circuit | `closed-circuit` | 3 | "The Alpha and the partner complete a circuit: it strikes the foe in a flash and leaves both fully charged." | +4 Speed for turn order. A sure hit: d6 + Focus + (partner's Focus ÷ 2, down) + bonus − Ward. Status on a 1–2. Then both refill Stamina. |
| Fire | Twin Blaze | `twin-blaze` | 3 | "The partner's flames and the Alpha's meet in one roaring blaze that is hard to aim and harder to put out." | d8 to hit. **d10** + Focus + (partner's Focus ÷ 2, up) + bonus − Ward. Status on a **1–4**. |
| Grass | Grove Chorus | `grove-chorus` | 3 | "The Alpha and the partner call up a grove around them: both are healed, the foe is snared, and the Alpha lashes out from the leaves." | The Alpha heals (partner's Vigor ÷ 2, up) + bonus; the partner (benched) heals (Alpha's Vigor ÷ 2, up) + bonus; Snare on the foe (if it has no status); +1 Ward. Then a sure hit: d4 + Focus − Ward. |
| Rock | Twin Monolith | `twin-monolith` | 3 | "The Alpha and the partner slam together around the foe like two great stones, and the Alpha comes out tougher." | d8 to hit. Physical: **d8** + Power + (Alpha's Armor ÷ 2, up) + (partner's Armor ÷ 2, up) + bonus − Armor. Status on a 1–2. Then +1 Armor, hit or miss. |
| Steel | Interlock | `interlock` | 3 | "The partner locks its plating into the Alpha's and pries the foe's loose, then the Alpha strikes." | +2 Armor, +2 Ward; foe −1 Armor. Then a sure physical hit: d6 + Power + bonus − Armor. Status on a 1–2. |
| Water | Confluence | `confluence` | 3 | "The Alpha and the partner meet as two currents, sweep over the foe, and leave each other refreshed." | A sure hit: d6 + Focus + (partner's Focus ÷ 2, down) + bonus − Ward. Status on a 1–2. Then the Alpha and the partner (benched) each heal 1 + bonus. |

### Swap Move balance notes

- [ ] **Accuracy:** only the d8-to-hit moves can miss (Tag Strike, Starfall Relay, Live Wire, Phoenix Handoff, Landslide Tag, Tide Relay, Twin Monolith, Twin Blaze); the rest always hit.
- [ ] **Rally's Teamwork bonus is all-or-nothing** (+1 under 2 Teamwork, +2 from 2), unlike the other moves' 0–3 scale. Kindle Swap works the same way.
- [ ] **Teamwork now follows Loyalty, not level:** the bonus tops out at +2 (it was +3 at Lv 12), and typed Swap Moves unlock with Loyalty 2 and 4 in both creatures. Check that pairs reach Teamwork 1 early enough, since new recruits start at Loyalty 0, and how quickly a Legendary's Teamwork slides.
- [x] **Teamwork no longer rewards swapping back and forth:** a pair earns it from a swap once per battle; travelling together on the active team is the steady source.
- [ ] **Watch the early retune:** Slipstream (d6 + Power + Speed ÷ 3, sure hit) may out-damage a creature's own moves at Lv 1–3.
- [ ] **Status on a 1–2 is twice as likely** as a regular elemental move's 1. Watch whether typed Swap Moves become the main way to inflict statuses.
- [ ] **No-damage moves** (Rally, Heartlink, Kindle Swap, Wellspring) trade a hit for setup. Check they're picked at all once the typed hits unlock.
- [ ] **Partners set the typed choices:** a single-type partner offers two typed moves, a dual-type one four. Dual types make more flexible partners; worth watching. A shared type adds its Boosted move, which makes up for a mono-type team's narrower choice.
- [ ] **Boosted moves:** first drafts. Check Twin Monolith and Conjunction (two hits, each cut by Ward) against ordinary attacks, whether Teamwork 3 is reached soon enough, and whether each is worth more than its type's Teamwork 2 move.

---

## Changing or adding traits

### Template for a new Nature

```markdown
#### N. Name · `id`

| Up | Down | In-game text |
|---|---|---|
| +1 (stat) | −1 (stat) | "(flavour line)" |

**Perks:** (Perk name) (3 Loyalty): (bonus) · (Perk name) (6): (bonus) · (Perk name) (10): (bonus).

**Suits:** what kind of creature it fits.
```

### Template for a new Ability

```markdown
#### N. Name · `id`

**Exact rule:** what changes, with numbers, and what it doesn't apply to.

**Interactions:** trainer styles, items, events or other Abilities it stacks with or overlaps.
```

### Design checklist

- [ ] **Natures:** perks add up to about 4 combat stat points. The up and down stats pull in different directions. The theme matches the perks.
- [ ] **Abilities:** a map effect (not battle) that changes a real decision. Checked against the trainer styles and items that do similar things.
- [x] **Swap Moves:** say what's borrowed from the partner, whether it can miss, and how the Teamwork bonus scales. (The card and swap screen show each move's effect with its numbers, written from the move's data.)
- [ ] The in-game text says exactly what the rules do.

### Build it (developers)

1. **Data:** add the entry to `NATURES` or `ABILITIES` in `src/data/content.ts`, or to `SWAP_MOVES` in `src/data/swapMoves.ts`.
2. **Rules:**
   - **A Nature** needs no code: its up, down and perks are read from the data.
   - **An Ability** needs a check where the game decides that thing, like the existing `ability(s) === '…'` checks in `src/engine/world.ts`.
   - **A Swap Move** usually needs no code: build it from the existing effects (`mod`, `heal`, `refill`, `ease`, `status`) and a `hit`. A new kind of effect needs a case in `swapEffect()` in `src/engine/battle.ts` and in `describeSwap()`.
3. **Give it to creatures:** set `ability` (or `instinct`) on species in `src/data/species.ts`. Placeholders get theirs in `src/data/roster.ts`. Swap Moves aren't given to species: trainers set them per pair. Natures are random, so a new one appears on new creatures automatically.
4. **Then:**
   - Add a test.
   - Update this doc. **A test fails if a Nature, Ability or Swap Move in the game is missing from this file.**
   - Add any new icon to [the icon checklist](./07-icon-checklist.md).

---

## Ideas backlog

| Idea | Trait | Sketch | Status |
|---|---|---|---|
| *(example)* Careful | Nature | +1 Ward / −1 Power. Perks: +1 Ward, +2 Stamina, +1 Vigor and +1 Ward. Fills the missing Ward-up Nature. | Idea |
| *(example)* Night Owl | Ability | Re-exploring after dark (once your Initiative runs out) is allowed once, for free. | Idea |
| | | | |
