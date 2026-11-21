# Natures, Abilities & Affinity Powers

The traits every creature carries, shown on its index card:

- **Nature:** a personality that shifts two stats and unlocks three perks as the creature's Loyalty grows. Each *creature* has its own.
- **Ability:** an overworld power that's active while the creature is **Following** you. Set by *species*.
- **Affinity Power:** what happens when the creature is **swapped in** during battle. Set by *species*.

**Code:**
- `NATURES`, `ABILITIES` and `AFFINITIES` in `src/data/content.ts` hold the names, numbers and in-game text.
- The rules are applied in `src/engine/creature.ts` (Natures), `src/engine/world.ts` (Abilities) and `src/engine/battle.ts` (Affinity Powers, in `doSwap`).

---

## Natures

### How Natures work

- **Assigned at random** when a creature is created (wild, trainer, recruited or starter). A few sources set it: the Roaming Trader's creature shows its Nature up front.
- **Stats:** the Nature's **up** stat gets +1 and its **down** stat −1 (never below 0). Evasion always stays within 1–6.
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
| 6 | Volatile | `volatile` | Stamina | Evasion | Hot Blooded: +2 Stamina | Reckless: +1 Power, +1 Focus | Overdrive: +2 Speed | 6 (2 of them Stamina) |

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
| +1 Stamina | −1 Evasion | "Pushes limits with demanding moves; cavalier with its own safety." |

**Perks:** Hot Blooded (3): +2 Stamina · Reckless (6): +1 Power, +1 Focus · Overdrive (10): +2 Speed.

**Suits:** creatures with heavy, high-Effort moves.

### Nature balance notes

To review when balancing. Tick them off or move them into a card once decided.

- [ ] **Perk totals differ:** Adamant, Timid, Fortified and Resonant give 4 stat points. Enduring gives 5 and Volatile 6, but 2 of each are Stamina, which is worth less than a combat stat.
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

**Interactions:** a Lure Incense already guarantees an encounter, so Sweet Scent adds nothing on that explore.

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
- [ ] **Quick Step** was situational (it only mattered when leaving a wild battle). It now also refunds 1 Initiative per escape, which makes it a strong pick for hunting a specific creature: run from everything else for nearly free. Watch for abuse with Lure Incense or Sweet Scent.
- [ ] **Most Abilities are economy or exploration;** none affects battle. Deliberate, so the follower choice is about the map, not fights.
- [ ] **Distribution is fairly even** (42–55 species each). Trailblazer and Keen Nose are the rarest.

---

## Affinity Powers

### How Affinity Powers work

- **When:** a creature is **swapped in** during battle (from round 2). The incoming creature is the **Alpha**, and its species' Affinity Power triggers straight away, borrowing from the **partner** (the creature being swapped out).
- **Bond:** each pair of creatures builds a bond each time one swaps in for the other: +1 for both, up to 9. The bonus is **Bond ÷ 3, rounded down** (0–3), using the bond *before* this swap. It's shown on the swap screen ("bond N").
- **The swap resolves at the outgoing creature's Speed** (Slipstream gets +3 on top).

| # | Power | ID | In-game text | Exact effect | Creatures with it |
|---|---|---|---|---|---|
| 1 | Tag Strike | `tagStrike` | "Swaps in with an attack of the benched partner's type, powered by the partner's Focus." | Accuracy d6 vs the foe's Evasion. On a hit: d6 + partner's Focus + bonus − foe's Ward, using the **partner's** main type on the type chart. | 76 |
| 2 | Shield Pass | `shieldPass` | "Borrows the partner's Armor and Ward for this round, then counters." | +(partner's Armor ÷ 2, rounded up, + bonus) Armor and the same for Ward (they last while it stays in), then a sure counter: d4 + Power − foe's Armor. | 82 |
| 3 | Slipstream | `slipstream` | "Rides the partner's Speed to strike first with a physical hit." | +3 Speed for this swap's turn order. A sure physical hit: d4 + Power + (partner's Speed ÷ 3) + bonus − foe's Armor. | 75 |
| 4 | Siphon | `siphon` | "Drains the foe, healing using the partner's Vigor." | A sure hit: d4 + Focus − foe's Ward, using the **Alpha's** type on the type chart. Then it heals (partner's Vigor ÷ 2, rounded up, + bonus) Health. | 76 |
| 5 | Rally | `rally` | "Partner cheers: restores Stamina and raises Power and Focus." | Both creatures' Stamina refills. +1 Power and +1 Focus (+2 each once the bond bonus is 1 or more). | 77 |

### Affinity balance notes

- [ ] **Only Tag Strike can miss.** The other damaging powers always hit.
- [ ] **Shield Pass's borrowed Armor and Ward last while the Alpha stays in,** not just "this round" as the in-game text says. Fix the text or the rule.
- [ ] **Rally's bond bonus is all-or-nothing** (+1 at bond 0–2, +2 at bond 3+), unlike the other powers' 0–3 scale.
- [ ] **Bond builds per pair,** so it rewards swapping the same two creatures back and forth.

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
- [ ] **Affinity Powers:** say what's borrowed from the partner, whether it can miss, and how the bond bonus scales.
- [ ] The in-game text says exactly what the rules do.

### Build it (developers)

1. **Data:** add the entry to `NATURES`, `ABILITIES` or `AFFINITIES` in `src/data/content.ts`.
2. **Rules:**
   - **A Nature** needs no code: its up, down and perks are read from the data.
   - **An Ability** needs a check where the game decides that thing, like the existing `ability(s) === '…'` checks in `src/engine/world.ts`.
   - **An Affinity Power** needs a new `mode` handled in `doSwap()` in `src/engine/battle.ts`.
3. **Give it to creatures:** set `ability` or `affinity` on species in `src/data/species.ts`. Placeholders get theirs in `src/data/roster.ts`. Natures are random, so a new one appears on new creatures automatically.
4. **Then:**
   - Add a test.
   - Update this doc. **A test fails if a Nature, Ability or Affinity Power in the game is missing from this file.**
   - Add any new icon to [the icon checklist](./07-icon-checklist.md).

---

## Ideas backlog

| Idea | Trait | Sketch | Status |
|---|---|---|---|
| *(example)* Careful | Nature | +1 Ward / −1 Power. Perks: +1 Ward, +2 Stamina, +1 Vigor and +1 Ward. Fills the missing Ward-up Nature. | Idea |
| *(example)* Night Owl | Ability | Re-exploring after dark (once your Initiative runs out) is allowed once, for free. | Idea |
| | | | |
