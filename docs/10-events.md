# Start-of-Turn Events

Every event in the game, what it offers, and how to add more. Events are the little stories that happen "on the road" at the start of a turn: a trader, a storm, a rival, a lost creature…

**Code:** `src/engine/events.ts` (the `EVENTS` list). The UI only displays what the event describes, so a new event needs no UI work.

## How events work

- **When:** from the second round on, each trainer's turn starts with one event (in hotseat and online, after the first trainer's weather roll). `EVENT_CHANCE` (currently 1, every turn) can lower that.
- **Which one:** picked at random, weighted by each event's **weight**. Events whose **condition** isn't met are skipped (e.g. the Pickpocket needs 3+ coins). **The same event never comes twice in a row** for a trainer.
- **Answering:** the event card opens at the start of the turn. Most events can be declined. **Forced** events (storm, pickpocket, squabble, bad berries) need a real decision. The player can close the card to check their team first: it waits as a pill at the bottom of the screen, and the turn can't end until it's answered.
- **Picking a creature:** some choices ask the player to pick one of their creatures. Choices can rule creatures out (e.g. knocked out), and can show a **before → after** stat comparison first (trades, Nature changes).
- **Saved state:** a pending event is stored on the save with its rolled details (which species is on offer, the price…), so reloading shows the same event.

### Chance of each event

The weights add up to **55** when every event is eligible, so a weight-3 event comes up about **5.5%** of the time and a weight-2 event about **3.6%**. Conditions and the no-repeat rule shift this a little in play.

---

## Overview

| # | Event | ID | Kind | Weight | Appears when | Forced? | Cost to take part |
|---|---|---|---|---|---|---|---|
| 1 | 🧳 Roaming Trader | `trader` | Creatures | 3 | Always | No | Gives up a creature |
| 2 | 🩺 Creature Caretaker | `caretaker` | Creatures | 3 | Always | No | Free |
| 3 | 🍲 Wandering Cook | `cook` | Service | 3 | An active creature is hurt or fatigued | No | 🪙 4 |
| 4 | 🥺 A Lost Creature | `lost` | Creatures | 2 | Always | Yes (two good options) | Free |
| 5 | 🐫 Merchant Caravan | `caravan` | Service | 3 | Always | No | Half the item's price |
| 6 | ⛈️ Sudden Storm | `storm` | Hazard | 2 | Always | **Yes** | 1 Initiative or 1 Vitality each |
| 7 | 🥋 Sparring Master | `sparring` | Service | 3 | Always | No | 🪙 5 |
| 8 | 🔮 Fortune Teller | `fortune` | Service | 2 | No Star Charm effect already active | No | 🪙 3 |
| 9 | 🧺 Windfall | `windfall` | Find | 3 | Always | Yes (one option) | Free |
| 10 | 🤺 Rival Challenge | `rival` | Battle | 2 | At least one active creature can fight | No | Trainer-battle stakes |
| 11 | 📜 Wise Hermit | `hermit` | Service | 2 | Always | No | 🪙 8 |
| 12 | 🦝 Pickpocket! | `pickpocket` | Hazard | 2 | You have 🪙 3+ | **Yes** | Coins at risk |
| 13 | 🙏 Passing Pilgrim | `pilgrim` | Find | 2 | Always | Yes (one option) | Free |
| 14 | ♨️ Hidden Hot Spring | `springs` | Rest | 2 | Always | No | 1 Initiative |
| 15 | 🎲 Dice Gambler | `gambler` | Gamble | 2 | You have 🪙 5+ | No | 🪙 5 or 10 stake |
| 16 | 🪕 Traveling Bard | `bard` | Creatures | 3 | Always | Yes (two good options) | Free or 🪙 3 |
| 17 | 🧓 Old Trainer's Advice | `mentor` | Creatures | 2 | Always | No | 1 Initiative |
| 18 | 🧭 Local Guide | `guide` | Service | 2 | Always | No | 🪙 3 |
| 19 | 😾 Team Squabble | `squabble` | Creatures | 2 | 2+ creatures in the active team | **Yes** | Morale, or 1 Initiative |
| 20 | 🔍 Codex Scholar | `scholar` | Find | 2 | Always | Yes (one option) | Free |
| 21 | 🎒 Lost Satchel | `satchel` | Find | 2 | Always | Yes (moral choice) | Free |
| 22 | 🌠 Shooting Star | `star` | Find | 2 | Always | Yes (two good options) | Free |
| 23 | 🤢 Bad Berries | `berries` | Hazard | 2 | At least one active creature isn't KO'd | **Yes** | A Salve, 1 Initiative, or Vitality and Morale |
| 24 | 🧒 Eager Apprentice | `apprentice` | Creatures | 2 | At least one active creature isn't KO'd | No | Free |

**Kinds:** *Creatures* change or add to your team. *Service* means paying for a benefit. *Find* is a free gift. *Hazard* forces a choice between two costs. *Battle* starts a fight. *Gamble* is a dice bet. *Rest* recovers the team.

"Forced: Yes (… options)" means there is no plain "No thanks", but every option is good or harmless.

---

## The events

Each event card uses the same layout. Copy the [template](#template-for-a-new-event) to add one.

### 1. 🧳 Roaming Trader · `trader`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures | 3 | Always | No |

A trader offers a wild creature from the area (30% Prime, otherwise Common) with a fixed Nature. The creature is shown on the card and can be inspected.

**Choices**
- **Trade for (species):** pick a creature to give away. It can't be KO'd or the same species as the offer. The new creature matches the level of the one you give and arrives with its chart points unspent. A before → after comparison is shown first. It keeps at least Morale 5, and takes over as follower if you gave away your follower.
- **No thanks:** nothing happens.

**Notes:** a good way to swap a weak creature for a new species, or to get a fresh chart to spend points on.

### 2. 🩺 Creature Caretaker · `caretaker`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures | 3 | Always | No |

A caretaker offers to change one creature's Nature. Three random Natures are offered.

**Choices**
- **Become (Nature)** ×3: pick a creature (not one that already has that Nature). It keeps the *number* of Nature perks it has unlocked, now from the new Nature. A before → after comparison is shown first.
- **No thanks:** nothing happens.

### 3. 🍲 Wandering Cook · `cook`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Service | 3 | An active creature (not KO'd) is missing Vitality or has Fatigue | No |

**Choices**
- **Share a meal · 🪙 4:** every active creature that isn't KO'd gets full Vitality and Health, and its Fatigue is cleared. KO'd creatures still need a stable.
- **No thanks:** nothing happens.

### 4. 🥺 A Lost Creature · `lost`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures | 2 | Always | Yes (two good options) |

A young Common creature from the area, one level below your Tier's usual level (minimum 1), has been following you.

**Choices**
- **Take it in:** it joins your team with Morale 6 (or rests in a totem if the active team is full). Added to your Codex as recruited.
- **Guide it home:** every active creature gets +1 Morale.

### 5. 🐫 Merchant Caravan · `caravan`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Service | 3 | Always | No |

A caravan sells one item at **half price** (rounded down, at least 🪙 1): a Hot Spring Elixir, Moonberry, Star Charm or Lure Incense.

**Choices**
- **Buy (item):** pay and get the item.
- **No thanks:** nothing happens.

### 6. ⛈️ Sudden Storm · `storm`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Hazard | 2 | Always | **Yes** |

**Choices**
- **Take shelter:** −1 Initiative this turn.
- **Push on:** each active creature that isn't KO'd loses 1 Vitality.

### 7. 🥋 Sparring Master · `sparring`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Service | 3 | Always | No |

**Choices**
- **Train · 🪙 5:** pick a creature (not KO'd). It gains +10 XP, which is one level.
- **No thanks:** nothing happens.

### 8. 🔮 Fortune Teller · `fortune`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Service | 2 | No Star Charm effect is already active | No |

**Choices**
- **Hear your fortune · 🪙 3:** your next wild encounter rolls +1 rarity die (the same effect as a Star Charm).
- **No thanks:** nothing happens.

### 9. 🧺 Windfall · `windfall`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Find | 3 | Always | Yes (one option) |

**Choices**
- **Gather them:** get two offering materials from the current biome (they can be the same one).

### 10. 🤺 Rival Challenge · `rival`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Battle | 2 | At least one active creature can fight | No |

A named rival (Juniper, Ozzie, Marisol, Dex or Calla) challenges you.

**Choices**
- **Accept the challenge:** a trainer battle. The rival's team is one level above the local wilds, has as many creatures as you have fit to fight (up to 3), and each is 40% Prime. Normal trainer-battle stakes and XP: win coins, or pay them if you lose.
- **Walk away:** no penalty.

### 11. 📜 Wise Hermit · `hermit`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Service | 2 | Always | No |

**Choices**
- **Study the scroll · 🪙 8:** pick a creature. It gains 1 free progression point to spend on its chart.
- **No thanks:** nothing happens.

### 12. 🦝 Pickpocket! · `pickpocket`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Hazard | 2 | You have 🪙 3 or more | **Yes** |

**Choices**
- **Send (follower) after it** (or chase it yourself with no follower): roll d6 + the follower's Speed. On **7 or more**, you catch it and gain d6 coins. Otherwise you lose d6 coins.
- **Let it go:** lose 🪙 3.

### 13. 🙏 Passing Pilgrim · `pilgrim`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Find | 2 | Always | Yes (one option) |

**Choices**
- **Accept with thanks:** get a typed Totem (+3 to recruit that type) for one of the types already on your team.

### 14. ♨️ Hidden Hot Spring · `springs`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Rest | 2 | Always | No |

**Choices**
- **Soak · 1 Initiative:** every creature you own that isn't KO'd clears Fatigue, refills Stamina and gets +1 Morale.
- **No thanks:** nothing happens.

### 15. 🎲 Dice Gambler · `gambler`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Gamble | 2 | You have 🪙 5 or more | No |

Your d6 against the gambler's d6.

**Choices**
- **Bet 🪙 5** / **Bet 🪙 10:** a higher roll wins the stake (Merchants earn their usual bonus on it). A lower roll loses it. A tie keeps it.
- **Not tonight:** nothing happens.

### 16. 🪕 Traveling Bard · `bard`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures | 3 | Always | Yes (two good options) |

**Choices**
- **Listen:** every active creature gets +1 Morale.
- **Request a ballad · 🪙 3:** every creature you own (totems too) gets +1 Morale, and your follower gets +1 Loyalty.

### 17. 🧓 Old Trainer's Advice · `mentor`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures | 2 | Always | No |

**Choices**
- **Spend the morning · 1 Initiative:** pick a creature (not KO'd). It gains +5 XP.
- **No thanks:** nothing happens.

### 18. 🧭 Local Guide · `guide`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Service | 2 | Always | No |

**Choices**
- **Hire them · 🪙 3:** +1 Initiative this turn.
- **No thanks:** nothing happens.

### 19. 😾 Team Squabble · `squabble`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures | 2 | 2 or more creatures in the active team | **Yes** |

Two random active creatures are fighting over the warm spot by the fire.

**Choices**
- **Side with A:** A gets +2 Morale, B −1 Morale.
- **Side with B:** B gets +2 Morale, A −1 Morale.
- **Calm them both · 1 Initiative:** both get +1 Morale.

**Notes:** if either creature has left the team before the event is answered, nothing happens.

### 20. 🔍 Codex Scholar · `scholar`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Find | 2 | Always | Yes (one option) |

**Choices**
- **Copy their notes:** up to 2 Common species from this biome that you haven't seen yet are added to your Codex, so you can carve their Effigies.
- **Sell a copy · +🪙 3:** offered instead when you've already seen everything here.

### 21. 🎒 Lost Satchel · `satchel`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Find | 2 | Always | Yes (moral choice) |

The satchel holds 2 + d6 coins.

**Choices**
- **Keep it:** gain the coins. Your follower gets −1 Morale.
- **Track down the owner:** get a Calm Tea, and every active creature gets +1 Morale.

### 22. 🌠 Shooting Star · `star`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Find | 2 | Always | Yes (two good options) |

**Choices**
- **Wish for luck:** get a Star Charm.
- **Wish for your team:** every creature you own gets +1 Morale.

### 23. 🤢 Bad Berries · `berries`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Hazard | 2 | At least one active creature isn't KO'd | **Yes** |

One random active creature (not KO'd) ate bad berries.

**Choices**
- **Give it a Salve:** uses one Vigor Salve. No other effect. Disabled if you have none.
- **Stay with it · 1 Initiative:** it gets +1 Morale.
- **Let it sleep it off:** −1 Vitality (never below 1 heart) and −1 Morale.

### 24. 🧒 Eager Apprentice · `apprentice`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures | 2 | At least one active creature isn't KO'd | No |

**Choices**
- **Show them a drill:** pick a creature (not KO'd). It gains +3 XP and +1 Morale, and you get 🪙 2.
- **Not today:** nothing happens.

---

## Adding a new event

### 1. Design it (fill in the template)

Copy this block into [The events](#the-events), numbered next in line, and add a row to the [Overview](#overview) table.

#### Template for a new event

```markdown
### N. (icon) Event Name · `event-id`

| Kind | Weight | Appears when | Forced? |
|---|---|---|---|
| Creatures / Service / Find / Hazard / Battle / Gamble / Rest | 2 | Always (or the condition) | No / Yes / Yes (… options) |

One or two sentences: what happens, and anything rolled when it appears (a species, a price…).

**Choices**
- **Choice label (· cost):** exactly what it does, with numbers. Say if it asks the player to pick a creature, and which creatures can't be picked.
- **No thanks:** nothing happens.

**Notes:** balance thoughts, edge cases (what if the creature left the team before the event was answered?).
```

**Design checklist**
- [ ] A clear choice: two or more options with different trade-offs, or a "No thanks".
- [ ] Every number is stated: coins, XP, Morale, Initiative, items.
- [ ] A condition if the event would be pointless or unfair sometimes (no coins, no healthy creatures…).
- [ ] Forced only when there's no harmless way out, and forced events should be rare (weight 2).
- [ ] An icon for the art team: add it to [docs/07-icon-checklist.md](./07-icon-checklist.md), section 10.

### 2. Build it (developers)

Add an entry to the `EVENTS` list in `src/engine/events.ts`:

```ts
{
  id: 'my-event', weight: 2,
  when: (s) => s.coins >= 5,                       // optional: only roll it when it makes sense
  create: (s) => ({ price: 5 }),                   // details rolled once and saved with the event (plain JSON)
  view: (s, d) => ({
    title: 'My Event', icon: '✨',
    text: 'What the player reads.',
    choices: [
      { id: 'buy', label: `Do the thing · 🪙 ${d.price}`, detail: 'What it does.', disabled: afford(s, d.price as number) },
      // a choice that needs a creature: pick: true, canPick: notKO, preview: (c) => ({ after: … })
      DECLINE,
    ],
    // forced: true,  // no "No thanks": the player must pick
  }),
  resolve: (s, d, choice, c) => {
    if (choice !== 'buy') return { text: 'You move on.', tone: 'info' };
    s.coins -= d.price as number;
    // …change the game state…
    return { text: 'What happened.', tone: 'good' };       // 'good' | 'bad' | 'info'; add battle to start a fight
  },
},
```

Helpers already in `events.ts`: `DECLINE`, `afford(s, coins)`, `notKO`, `cheer(c, n)` (Morale), `welcome(s, c)` (add a creature), `wildSpecies(s, rarity, level)`, `earnCoins` (applies the Merchant bonus), `addItem`, `gainXp`, `addLoyalty`.

Then:
- [ ] Add a test in `tests/engine.test.ts` (force it with `rollEvent(s, 'my-event')` and check each choice).
- [ ] Document it here. **A test fails if an event exists in the game but isn't listed in this file.**
- [ ] Mention it in the How to Play guide if it adds a new idea (`src/ui/guide.ts`, Basics → Events).

---

## Ideas backlog

Event ideas to design and build. Add yours here, then move them up into [The events](#the-events) once they're in the game.

| Idea | Kind | Sketch | Status |
|---|---|---|---|
| *(example)* Wild Stampede | Hazard | A herd blocks the road: wait (−1 Initiative) or lead your follower through (Speed roll for coins, or −1 Vitality). | Idea |
| | | | |
