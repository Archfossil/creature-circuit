# Trainer Styles

The trainer ability picked when a game starts (in the trainer creator, under "Trainer style"). Each style has a **perk** and a **drawback**, except the Wanderer, which has a smaller perk and no drawback. The style lasts the whole season and can't be changed.

**Code:**
- **Names and descriptions:** `TRAINER_STYLES` in `src/engine/state.ts` (the text the player sees).
- **The rules themselves:** short checks on `s.trainer.style`, mostly in `src/engine/world.ts`. See [Where each rule lives](#where-each-rule-lives).

## Overview

| # | Style | ID | Perk | Drawback | Best for |
|---|---|---|---|---|---|
| 1 | ⚖️ Wanderer | `balanced` | Every city Stable serves the doubled "home" hot pot | None | New players, flexible routes |
| 2 | 🌲 Ranger | `nature` | First re-explore each turn is free | City actions cost +1 Initiative | Living in the wilds, hunting creatures |
| 3 | 🏙️ Urbanite | `urban` | City actions are free | Re-exploring costs 2 Initiative | City-hopping, shopping, Arbiters |
| 4 | 🤝 Beast Whisperer | `whisperer` | +1 to every recruitment roll | Trainer battles pay half the coins | Collecting creatures |
| 5 | 💰 Merchant | `haggler` | Markets 25% off, +25% coins earned | −1 to every recruitment roll | Coins and items |
| 6 | 🎖️ Battle Master | `drill` | +2 XP for every creature in every battle | Creatures in totems lose Morale twice as fast | Levelling a small team |
| 7 | 💞 Caretaker | `caretaker` | Camping tends 2 creatures per Initiative; Stables give +1 extra Morale | −1 XP per creature per battle | Keeping a big team happy |
| 8 | 🧭 Pathfinder | `pathfinder` | First move each turn is free | Stables cost +1 Initiative | Covering ground |

### What each style touches

| Style | Moving | Exploring | City actions | Stables | Camping | Recruiting | Coins earned | Shop prices | Battle XP | Morale |
|---|---|---|---|---|---|---|---|---|---|---|
| Wanderer | | | | ⬆ doubled hot pot everywhere | | | | | | |
| Ranger | | ⬆ 1st re-explore free | ⬇ +1 | ⬇ +1 (Stables count as a city action) | | | | | | |
| Urbanite | | ⬇ re-explore costs 2 | ⬆ free | ⬆ free | | | | | | |
| Beast Whisperer | | | | | | ⬆ +1 | ⬇ trainer battles halved | | | |
| Merchant | | | | | | ⬇ −1 | ⬆ +25% | ⬆ −25% | | |
| Battle Master | | | | | | | | | ⬆ +2 | ⬇ totems decay faster |
| Caretaker | | | | ⬆ +1 Morale | ⬆ 2 per Initiative | | | | ⬇ −1 | |
| Pathfinder | ⬆ 1st move free | | | ⬇ +1 | | | | | | |

### Costs at a glance (Initiative)

| Action | Normal | Ranger | Urbanite | Pathfinder |
|---|---|---|---|---|
| Move to an adjacent node | 1 | 1 | 1 | **0** for the first move, then 1 |
| Re-explore a wild node | 1 | **0** for the first, then 1 | **2** | 1 |
| City action (city Market, Carving Shrine, Trainer Hall, Arbiter challenge) | 1 | **2** | **0** | 1 |
| Stable (city or town) | 1 | **2** | **0** | **2** |

These don't change with any style: town Markets (free), Swap Team (free), Explore the Depths (1), Fly (3) and camping.

---

## The styles

Each card uses the same layout. Copy the [template](#template-for-a-new-style) to add one.

### 1. ⚖️ Wanderer · `balanced`

| Perk | Drawback |
|---|---|
| Every city's Stable treats you like home | None |

**In game:** "Every city's stable treats you like home: the doubled home Chanko Nabe, anywhere." / "None. You have no real home, and no special rules."

**Exact rules**
- **Perk:** resting at *any* city Stable serves the hot pot battle buff **doubled**, as if it were your home city. For example, Thunder Spike's Prairie Chili Nabe gives +2 Speed instead of +1 for your next battle. Town Stables still serve no hot pot.
- **Drawback:** none.

**Notes:**
- The Wanderer still has a home city: a full team wipe sends them back there, like everyone else.
- This is the default style in the trainer creator.

### 2. 🌲 Ranger · `nature`

| Perk | Drawback |
|---|---|
| First re-explore each turn is free | City actions cost +1 Initiative |

**In game:** "Your first re-explore each turn costs no Initiative." / "City actions cost +1 Initiative."

**Exact rules**
- **Perk:** the first re-explore of a wild node each turn costs **0** Initiative. Later ones cost 1. Re-exploring is the 🔍 Explore button on a wild node you're already standing on.
- **Drawback:** city actions cost **2** Initiative instead of 1:
  - the city Market,
  - the Carving Shrine,
  - the Trainer Hall,
  - challenging an Arbiter,
  - Stables, in both cities and towns.

**Notes:** town Markets stay free.

### 3. 🏙️ Urbanite · `urban`

| Perk | Drawback |
|---|---|
| City actions are free | Re-exploring costs 2 Initiative |

**In game:** "City actions cost no Initiative." / "Re-exploring costs 2 Initiative."

**Exact rules**
- **Perk:** city actions cost **0** Initiative: the city Market, Carving Shrine, Trainer Hall, Arbiter challenges, and Stables (city and town).
- **Drawback:** every re-explore of a wild node costs **2** Initiative.

**Notes:** entering a new wild node still explores it as normal (that's part of moving). Only re-exploring costs more.

### 4. 🤝 Beast Whisperer · `whisperer`

| Perk | Drawback |
|---|---|
| +1 to every recruitment roll | Trainer battles pay half the coins |

**In game:** "+1 to every recruitment roll." / "Trainer battles pay half the coins (Arbiters still pay in full)."

**Exact rules**
- **Perk:** +1 on every recruitment roll (2d6 + bonuses vs the creature's threshold).
- **Drawback:** coins from winning a **trainer** battle are halved, rounded down, with a minimum of 1. That covers roaming trainers, Trainer Halls and Rival Challenges. Arbiter prizes and wild-battle coins are unaffected. Coins lost when you *lose* a trainer battle are unchanged.

### 5. 💰 Merchant · `haggler`

| Perk | Drawback |
|---|---|
| Markets 25% off, and +25% on coins earned | −1 to every recruitment roll |

**In game:** "Markets sell at 25% off, and you earn 25% more coins whenever you earn coins (at least +1)." / "−1 to every recruitment roll."

**Exact rules**
- **Perk, prices:** every Market price is × 0.75, rounded up, with a minimum of 🪙 1. This stacks with the **Baby-Doll Eyes** follower Ability: both together give × 0.5625.
- **Perk, coins:** whenever coins are earned, add 25% (rounded up, at least +1). This covers:
  - battle wins (wild, trainer and Arbiter),
  - coin finds while exploring,
  - Research Facility payouts,
  - event coins: the Pickpocket chase, the Dice Gambler, the Codex Scholar, the Lost Satchel and the Eager Apprentice.
- **Drawback:** −1 on every recruitment roll.

**Notes:** coins received from other trainers (gifts, trades, duel wagers) don't get the bonus.

### 6. 🎖️ Battle Master · `drill`

| Perk | Drawback |
|---|---|
| +2 XP for every creature in every battle | Creatures in totems lose Morale twice as fast |

**In game:** "+2 XP for every creature in every battle, win or lose." / "Creatures in totems lose Morale every 5 turns (not 10)."

**Exact rules**
- **Perk:** every creature that took part in a battle gets **+2 XP** on top of its usual battle XP, win or lose. This applies to wild, trainer and Arbiter battles and the Circuit bracket. (Running away earns no battle XP at all.)
- **Drawback:** creatures resting in totems (not on the active team) lose 1 Morale every **5** turns instead of every 10.

**Notes:** in a hotseat or online duel, the bonus applies to the challenger's creatures. The challenged trainer's creatures earn the standard duel XP.

### 7. 💞 Caretaker · `caretaker`

| Perk | Drawback |
|---|---|
| Camping tends 2 creatures per Initiative; Stables give +1 extra Morale | −1 XP per creature per battle |

**In game:** "Camping tends 2 creatures per Initiative; stables give +1 extra Morale." / "−1 XP per battle for each creature (never below 1)."

**Exact rules**
- **Perk, camping:** each Initiative left when you camp tends **2** creatures instead of 1 (restoring Vitality and clearing Fatigue).
- **Perk, Stables:** resting gives the active team **+2 Morale** instead of +1.
- **Drawback:** every creature that took part in a battle gets **1 less XP**, never below 1 total.

### 8. 🧭 Pathfinder · `pathfinder`

| Perk | Drawback |
|---|---|
| First move each turn is free | Stables cost +1 Initiative |

**In game:** "Your first move each turn costs no Initiative." / "Stables cost +1 Initiative."

**Exact rules**
- **Perk:** the first move to an adjacent node each turn costs **0** Initiative.
- **Drawback:** Stables (city and town) cost **2** Initiative instead of 1.

**Notes:** the **Trailblazer** follower Ability gives the same free first move. They **don't stack**: a Pathfinder following a Trailblazer still gets only one free move per turn.

---

## Interactions & balance notes

To review when balancing. Tick them off or move them into a card's **Notes** once they're decided.

- [ ] **Pathfinder + Trailblazer don't stack.** A Pathfinder gains nothing from a Trailblazer follower. Intended?
- [ ] **Merchant + Baby-Doll Eyes stack** to about 44% off Market prices. Strong for a shopping-focused run.
- [ ] **Ranger also pays more for Stables** (2 Initiative), because Stables cost the same as a city action. The in-game drawback only says "city actions". Consider naming Stables in the text.
- [ ] **Urbanite rests for free** at every Stable, city or town, which isn't mentioned in its in-game perk.
- [ ] **The Wanderer's perk is small** next to the others (a doubled one-battle buff). It has no drawback, but may need a little more to be a real choice beyond "safe default".
- [ ] **Battle Master vs Caretaker XP:** that's +2 vs −1 per creature per battle. Over a season with roughly 40 battles and 3 creatures each, that's a gap of about 360 XP: around 12 levels for the Battle Master, and about 4 lost for the Caretaker.
- [ ] **Beast Whisperer's coin penalty** halves Trainer Hall and Rival coins, but not Arbiter prizes (the biggest source late in the season), so it softens as the season goes on.
- [ ] **Merchant's recruitment penalty** is the same size as the Whisperer's bonus, so the two are mirror images on recruiting.
- [ ] **Re-explore costs** (Ranger 0 first, Urbanite 2) matter most to players who farm one node for a specific creature.

### Where each rule lives

| Rule | Code |
|---|---|
| City action cost (Ranger 2, Urbanite 0) | `cityActionCost` in `world.ts` |
| Re-explore cost (Ranger first free, Urbanite 2) | `reexploreCost` in `world.ts` |
| Free first move (Pathfinder, Trailblazer) | `moveCost` in `world.ts` |
| Stable cost (city action + 1 for Pathfinder) | `stableCost` in `world.ts` |
| Recruitment modifier (Whisperer +1, Merchant −1) | `styleRecruitMod` in `world.ts` |
| Camping per Initiative (Caretaker 2) | `campPerInitiative` in `world.ts` |
| Battle XP bonus (Battle Master +2, Caretaker −1) | `playerSide` (`xpBonus`) in `world.ts` → `awardBattleXp` in `battle.ts` |
| Trainer battle coins halved (Whisperer) | `finishBattle` in `world.ts` |
| Stable Morale (Caretaker +2) and doubled hot pot (Wanderer) | `rest` in `world.ts` |
| Market discount (Merchant, Baby-Doll Eyes) | `priceOf` in `world.ts` |
| +25% coins earned (Merchant) | `earnCoins` in `state.ts` |
| Totem Morale decay (Battle Master every 5 turns) | end-of-turn Morale in `world.ts` |

---

## Changing or adding a style

### Template for a new style

Copy this block into [The styles](#the-styles), and add a row to each table in the [Overview](#overview).

```markdown
### N. (icon) Style Name · `style-id`

| Perk | Drawback |
|---|---|
| Short perk | Short drawback |

**In game:** "(the perk text the player sees)" / "(the drawback text)"

**Exact rules**
- **Perk:** exactly what changes, with numbers, and what it applies to (and doesn't).
- **Drawback:** the same.

**Notes:** interactions with Abilities, other styles, events…
```

### Design checklist

- [ ] The perk and drawback point the same way: they push toward a play style rather than cancelling out.
- [ ] Every number is stated, including what it applies to and what it doesn't.
- [ ] Checked against creature Abilities that do similar things (Trailblazer, Baby-Doll Eyes, Lucky Charm, Quick Step…).
- [ ] The in-game text says exactly what the rules do.
- [ ] An icon for the art team ([the icon checklist](./07-icon-checklist.md), section 11).

### Build it (developers)

1. Add the id to `TrainerStyle` and an entry to `TRAINER_STYLES` in `src/engine/state.ts` (icon, name, perk text, drawback text). The trainer creator lists it automatically.
2. Add the rule where the game decides that thing (see [Where each rule lives](#where-each-rule-lives)). Prefer a small helper in `world.ts`, like `styleRecruitMod`, over scattered checks.
3. Add a test in `tests/engine.test.ts` (the "trainer styles" tests).
4. Update this doc. **A test fails if a style in the game is missing from this file.** Also update the How to Play guide (`src/ui/guide.ts`, You & saves → Trainer style).

---

## Ideas backlog

Style ideas to design and build. Add yours here, then move them up once they're in the game.

| Idea | Perk | Drawback | Status |
|---|---|---|---|
| *(example)* Scholar | Every new species seen gives +1 XP to the follower | Markets cost +1 coin per item | Idea |
| | | | |
