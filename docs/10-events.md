# Start-of-Turn Events

Every event in the game, what it offers, and how to add more. Events are the little stories that happen "on the road" at the start of a turn: a trader, a storm, a rival, a lost creature…

**Code:** `src/engine/events.ts` (the `EVENTS` list). The UI only displays what the event describes, so a new event needs no UI work.

## How events work

- **When:** from the second round on, each trainer's turn starts with one event (in hotseat and online, after the first trainer's weather roll). `EVENT_CHANCE` (currently 1, every turn) can lower that.
- **Which one:** picked at random, weighted by each event's **weight**. Events whose **condition** isn't met are skipped (e.g. the Pickpocket needs 3+ coins). **The same event never comes twice in a row** for a trainer.
- **Cloud Island and the Forest Floor:** while a trainer is on Cloud Island, only the [Cloud Island events](#cloud-island-events) can happen. On the Forest Floor, only the [Forest Floor events](#forest-floor-events) can happen. Neither set happens anywhere else.
- **Day & night:** odd turns are day and even turns are night. Day events only happen on day turns, night events only on night turns, and "Any" events at either. Each event's story matches: campfires, stars and overnight trouble at night; trainers, trades and errands by day.
- **Answering:** the event card opens at the start of the turn. Most events can be declined. **Forced** events (storm, pickpocket, squabble, bad berries) need a real decision. The player can close the card to check their team first: it waits as a pill at the bottom of the screen, and the turn can't end until it's answered.
- **Picking a creature:** some choices ask the player to pick one of their creatures. Choices can rule creatures out (e.g. knocked out), and can show a **before → after** stat comparison first (trades, Nature changes).
- **Changing a creature's traits:** the Caretaker (Nature), the Trail Tutor (Ability) and the Drum Circle (Instinct) each offer three random options for free. Valor Ridge's Battle School can change any of the three on demand, for coins and Loyalty (see [Towns with special services](./02-board-and-map.md#towns-with-special-services)).
- **Saved state:** a pending event is stored on the save with its rolled details (which species is on offer, the price…), so reloading shows the same event.

### Chance of each event

Day and night each have **39** weight of eligible events: 24 of time-specific events plus 15 of "Any" events. A weight-3 event therefore comes up about **7.7%** of the turns at its time of day, and a weight-2 event about **5.1%**. Conditions and the no-repeat rule shift this a little in play.

| Time | Events | Total weight |
|---|---|---|
| Day only | Trader, Trail Tutor, Sparring Master, Rival, Pilgrim, Old Trainer, Local Guide, Codex Scholar, Lost Satchel, Apprentice, Hot Air Balloon | 24 |
| Night only | Caretaker, Drum Circle, Lost Creature, Caravan, Windfall, Bard, Team Squabble, Shooting Star, Bad Berries, Night Coach | 24 |
| Any time | Cook, Storm, Fortune Teller, Hermit, Pickpocket, Hot Spring, Dice Gambler | 15 |

---

## Overview

| # | Event | ID | Kind | Weight | Time | Appears when | Forced? | Cost to take part |
|---|---|---|---|---|---|---|---|---|
| 1 | 🧳 Roaming Trader | `trader` | Creatures | 3 | Day | Always | No | Gives up a creature |
| 2 | 🩺 Creature Caretaker | `caretaker` | Creatures | 3 | Night | Always | No | Free |
| 3 | 🍲 Wandering Cook | `cook` | Service | 3 | Any | An active creature is hurt or fatigued | No | 💰 4 |
| 4 | 🥺 A Lost Creature | `lost` | Creatures | 2 | Night | Always | Yes (two good options) | Free |
| 5 | 🐫 Merchant Caravan | `caravan` | Service | 3 | Night | Always | No | Half the item's price |
| 6 | ⛈️ Sudden Storm | `storm` | Hazard | 2 | Any | Always | **Yes** | 1 Initiative or 1 heart each |
| 7 | 🥋 Sparring Master | `sparring` | Service | 3 | Day | Always | No | 💰 5 |
| 8 | 🔮 Fortune Teller | `fortune` | Service | 2 | Any | No Star Charm effect already active | No | 💰 3 |
| 9 | 🧺 Windfall | `windfall` | Find | 3 | Night | Always | Yes (one option) | Free |
| 10 | 🤺 Rival Challenge | `rival` | Battle | 2 | Day | At least one active creature can fight, and a Rival is free | No | Trainer-battle stakes |
| 11 | 📜 Wise Hermit | `hermit` | Service | 2 | Any | Always | No | 💰 8 |
| 12 | 🦝 Pickpocket! | `pickpocket` | Hazard | 2 | Any | You have 💰 3+ | **Yes** | Coins at risk |
| 13 | 🙏 Passing Pilgrim | `pilgrim` | Find | 2 | Day | Always | Yes (one option) | Free |
| 14 | ♨️ Hidden Hot Spring | `springs` | Rest | 2 | Any | Always | No | 1 Initiative |
| 15 | 🎲 Dice Gambler | `gambler` | Gamble | 2 | Any | You have 💰 5+ | No | 💰 5 or 10 stake |
| 16 | 🪕 Traveling Bard | `bard` | Creatures | 3 | Night | Always | Yes (two good options) | Free or 💰 3 |
| 17 | 🧓 Old Trainer's Advice | `mentor` | Creatures | 2 | Day | Always | No | 1 Initiative |
| 18 | 🧭 Local Guide | `guide` | Service | 2 | Day | Always | No | 💰 3 |
| 19 | 😾 Team Squabble | `squabble` | Creatures | 2 | Night | 2+ creatures in the active team | **Yes** | Morale, or 1 Initiative |
| 20 | 🔍 Codex Scholar | `scholar` | Find | 2 | Day | Always | Yes (one option) | Free |
| 21 | 🎒 Lost Satchel | `satchel` | Find | 2 | Day | Always | Yes (moral choice) | Free |
| 22 | 🌠 Shooting Star | `star` | Find | 2 | Night | Always | Yes (two good options) | Free |
| 23 | 🤢 Bad Berries | `berries` | Hazard | 2 | Night | At least one active creature isn't KO'd | **Yes** | A Salve, 1 Initiative, or a heart and Morale |
| 24 | 🧒 Eager Apprentice | `apprentice` | Creatures | 2 | Day | At least one active creature isn't KO'd | No | Free |
| 25 | 🎈 Hot Air Balloon | `balloon` | Travel | 2 | Day | On the mainland | No | Free |
| 26 | 🚌 Night Coach | `coach` | Travel | 2 | Night | On the mainland | No | 💰 4 |
| 27 | 🧑‍🏫 Trail Tutor | `tutor` | Creatures | 2 | Day | Always | No | Free |
| 28 | 🥁 Drum Circle | `drums` | Creatures | 2 | Night | Always | No | Free |
| 29 | 🌟 Star Shepherd | `shepherd` | Cloud Island | 3 | Night | On Cloud Island | No | Free, or 1 Initiative |
| 30 | 🌈 Moonbow | `moonbow` | Cloud Island | 2 | Night | On Cloud Island | Yes (two good options) | Free |
| 31 | 🐋 Sky Whale | `skywhale` | Cloud Island | 2 | Any | On Cloud Island, with a follower | Yes (two good options) | Free, or 1 Initiative |
| 32 | 🌫️ Cloud Bank | `cloudbank` | Cloud Island | 2 | Any | On Cloud Island | **Yes** | 1 Initiative, or Morale at risk |
| 33 | ☀️ Sunlit Clouds | `sunlit` | Cloud Island | 3 | Day | On Cloud Island | Yes (two good options) | Free |
| 34 | 👁️ Something in the Dark | `stalker` | Forest Floor | 3 | Any | On the Forest Floor, a creature able to fight | **Yes** | A hard battle, an item, or a trail sign |
| 35 | 🌱 Grasping Roots | `roots` | Forest Floor | 3 | Any | On the Forest Floor, a creature not KO'd | **Yes** | 1 Initiative, or a heart and Morale |
| 36 | 🍄 Spore Cloud | `spores` | Forest Floor | 2 | Any | On the Forest Floor | **Yes** | A Calm Tea, or Fatigue and Morale |
| 37 | 🌫️ Whispers in the Dark | `whispers` | Forest Floor | 2 | Any | On the Forest Floor | **Yes** | 2 Initiative, or a trail sign |
| 38 | 🦇 Shade Thieves | `shadethieves` | Forest Floor | 2 | Any | On the Forest Floor, with a non-key item | **Yes** | An item (and maybe a heart) |

**Kinds:** *Cloud Island* and *Forest Floor* events only happen there. *Travel* moves the trainer somewhere far away (see [Getting around](#getting-around)). *Creatures* change or add to your team. *Service* means paying for a benefit. *Find* is a free gift. *Hazard* forces a choice between two costs. *Battle* starts a fight. *Gamble* is a dice bet. *Rest* recovers the team.

"Forced: Yes (… options)" means there is no plain "No thanks", but every option is good or harmless.

---

## The events

Each event card uses the same layout. Copy the [template](#template-for-a-new-event) to add one.

### 1. 🧳 Roaming Trader · `trader`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 3 | Day | Always | No |

A trader offers a wild creature from the area (30% Prime, otherwise Common) with a fixed Nature. The creature is shown on the card and can be inspected.

**Choices**
- **Trade for (species):** pick a creature to give away. It can't be KO'd or the same species as the offer. The new creature matches the level of the one you give and arrives with its chart points unspent. A before → after comparison is shown first. It keeps at least Morale 5, and takes over as follower if you gave away your follower.
- **No thanks:** nothing happens.

**Notes:** a good way to swap a weak creature for a new species, or to get a fresh chart to spend points on.

### 2. 🩺 Creature Caretaker · `caretaker`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 3 | Night | Always | No |

A caretaker offers to change one creature's Nature. Three random Natures are offered.

**Choices**
- **Become (Nature)** ×3: pick a creature (not one that already has that Nature). It keeps the *number* of Nature perks it has unlocked, now from the new Nature. A before → after comparison is shown first.
- **No thanks:** nothing happens.

### 3. 🍲 Wandering Cook · `cook`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Service | 3 | Any | An active creature (not KO'd) is missing hearts or has Fatigue | No |

**Choices**
- **Share a meal · 💰 4:** every active creature that isn't KO'd gets full Health, and its Fatigue is cleared. KO'd creatures still need a stable.
- **No thanks:** nothing happens.

### 4. 🥺 A Lost Creature · `lost`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 2 | Night | Always | Yes (two good options) |

A young Common creature from the area, one level below your Tier's usual level (minimum 1), has been following you since sundown. It's always a creature that's out at night (nocturnal, or out by day and night).

**Choices**
- **Take it in:** it joins your team with Morale 6 (or rests in a totem if the active team is full). Added to your Codex as recruited.
- **Guide it home:** every active creature gets +1 Morale.

### 5. 🐫 Merchant Caravan · `caravan`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Service | 3 | Night | Always | No |

A caravan sells one item at **half price** (rounded down, at least 💰 1): a Hot Spring Elixir, Moonberry, Star Charm, Lure Incense or Hush Smoke.

**Choices**
- **Buy (item):** pay and get the item.
- **No thanks:** nothing happens.

### 6. ⛈️ Sudden Storm · `storm`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Hazard | 2 | Any | Always | **Yes** |

**Choices**
- **Take shelter:** −1 Initiative this turn.
- **Push on:** each active creature that isn't KO'd loses 1 heart.

### 7. 🥋 Sparring Master · `sparring`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Service | 3 | Day | Always | No |

**Choices**
- **Train · 💰 5:** pick a creature (not KO'd). It gains +10 XP, which is one level.
- **No thanks:** nothing happens.

### 8. 🔮 Fortune Teller · `fortune`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Service | 2 | Any | No Star Charm effect is already active | No |

**Choices**
- **Hear your fortune · 💰 3:** your next wild encounter rolls +1 rarity die (the same effect as a Star Charm).
- **No thanks:** nothing happens.

### 9. 🧺 Windfall · `windfall`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Find | 3 | Night | Always | Yes (one option) |

**Choices**
- **Gather them:** get two offering materials from the current biome (they can be the same one).

### 10. 🤺 Rival Challenge · `rival`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Battle | 2 | Day | At least one active creature can fight | No |

One of the Rivals about challenges you (see [15 · Rivals & Champions](./15-rivals-and-champions.md)).

**Choices**
- **Accept the challenge:** a battle against that Rival's own team. Normal trainer-battle stakes and XP: win coins, or pay them if you lose.
- **Walk away:** no penalty.

### 11. 📜 Wise Hermit · `hermit`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Service | 2 | Any | Always | No |

**Choices**
- **Study the scroll · 💰 8:** pick a creature. It gains 1 free progression point to spend on its chart.
- **No thanks:** nothing happens.

### 12. 🦝 Pickpocket! · `pickpocket`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Hazard | 2 | Any | You have 💰 3 or more | **Yes** |

**Choices**
- **Send (follower) after it** (or chase it yourself with no follower): roll d6 + the follower's Speed. On **7 or more**, you catch it and gain d6 coins. Otherwise you lose d6 coins.
- **Let it go:** lose 💰 3.

### 13. 🙏 Passing Pilgrim · `pilgrim`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Find | 2 | Day | Always | Yes (one option) |

**Choices**
- **Accept with thanks:** get a typed Totem (+3 to recruit that type) for one of the types already on your team.

### 14. ♨️ Hidden Hot Spring · `springs`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Rest | 2 | Any | Always | No |

**Choices**
- **Soak · 1 Initiative:** all your partner creatures (in totems too) that aren't KO'd clear Fatigue, refill Stamina and get +1 Morale.
- **No thanks:** nothing happens.

### 15. 🎲 Dice Gambler · `gambler`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Gamble | 2 | Any | You have 💰 5 or more | No |

Your d6 against the gambler's d6.

**Choices**
- **Bet 💰 5** / **Bet 💰 10:** a higher roll wins the stake (Merchants earn their usual bonus on it). A lower roll loses it. A tie keeps it.
- **Not tonight:** nothing happens.

### 16. 🪕 Traveling Bard · `bard`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 3 | Night | Always | Yes (two good options) |

**Choices**
- **Listen:** every active creature gets +1 Morale.
- **Request a ballad · 💰 3:** all your partner creatures (in totems too) get +1 Morale, and your follower gets +1 Loyalty.

### 17. 🧓 Old Trainer's Advice · `mentor`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 2 | Day | Always | No |

**Choices**
- **Spend the morning · 1 Initiative:** pick a creature (not KO'd). It gains +5 XP.
- **No thanks:** nothing happens.

### 18. 🧭 Local Guide · `guide`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Service | 2 | Day | Always | No |

**Choices**
- **Hire them · 💰 3:** +1 Initiative this turn.
- **No thanks:** nothing happens.

### 19. 😾 Team Squabble · `squabble`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 2 | Night | 2 or more creatures in the active team | **Yes** |

Two random active creatures are fighting over the warm spot by the fire.

**Choices**
- **Side with A:** A gets +2 Morale, B −1 Morale.
- **Side with B:** B gets +2 Morale, A −1 Morale.
- **Calm them both · 1 Initiative:** both get +1 Morale.

**Notes:** if either creature has left the team before the event is answered, nothing happens.

### 20. 🔍 Codex Scholar · `scholar`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Find | 2 | Day | Always | Yes (one option) |

**Choices**
- **Copy their notes:** up to 2 Common species from this biome that you haven't seen yet are added to your Codex, so you can carve their Effigies.
- **Sell a copy · +💰 3:** offered instead when you've already seen everything here.

### 21. 🎒 Lost Satchel · `satchel`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Find | 2 | Day | Always | Yes (moral choice) |

The satchel holds 2 + d6 coins.

**Choices**
- **Keep it:** gain the coins. Your follower gets −1 Morale.
- **Track down the owner:** get a Calm Tea, and every active creature gets +1 Morale.

### 22. 🌠 Shooting Star · `star`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Find | 2 | Night | Always | Yes (two good options) |

**Choices**
- **Wish for luck:** get a Star Charm.
- **Wish for your team:** all your partner creatures (in totems too) get +1 Morale.

### 23. 🤢 Bad Berries · `berries`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Hazard | 2 | Night | At least one active creature isn't KO'd | **Yes** |

One random active creature (not KO'd) ate bad berries.

**Choices**
- **Give it a Salve:** uses one Vigor Salve. No other effect. Disabled if you have none.
- **Stay with it · 1 Initiative:** it gets +1 Morale.
- **Let it sleep it off:** −1 heart (never its last) and −1 Morale.

### 24. 🧒 Eager Apprentice · `apprentice`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 2 | Day | At least one active creature isn't KO'd | No |

**Choices**
- **Show them a drill:** pick a creature (not KO'd). It gains +3 XP and +1 Morale, and you get 💰 2.
- **Not today:** nothing happens.

### 25. 🎈 Hot Air Balloon · `balloon`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Travel | 2 | Day | On the mainland (not Cloud Island or the Forest Floor) | No |

A balloon pilot offers a ride on the morning winds. Three cities are picked at random (never the one you're in).

**Choices**
- **Float to (city) ×3:** you're set down in that city, for free. Your Initiative is untouched. Each choice says whether you've been there.
- **Stay on the ground:** nothing happens.

### 26. 🚌 Night Coach · `coach`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Travel | 2 | Night | On the mainland (not Cloud Island or the Forest Floor) | No |

An overnight coach bound for one random city (never the one you're in) offers a seat.

**Choices**
- **Ride to (city) · 💰 4:** you wake up in that city. Your Initiative is untouched.
- **No thanks:** nothing happens.

#### Getting around

The map is big, so besides these two events a few items move a trainer further than one step at a time (`world.ts` → travel items & rides). Rides never explore on the way or where you land, and moving away still resets what leaving resets (the Iron Coast Gauntlet, Dahlia's Trail).

| Item | Where | Price | What it does |
|---|---|---|---|
| 🚲 Bike | Lumber Hollow | 💰 25 (kept; own one) | Once a turn, roll a d6 and ride up to that many steps for free. Stays on land (no ferries, portal or rope), keeps every gate, and never stops at a Legendary's grounds. A roll you don't ride right away waits until the turn ends. |
| 🚕 Taxi Ticket | City markets | 💰 10 | In a city: ride to any other city. Your remaining Initiative drops to 0. |
| 🕊️ Homing Feather | Dustmere, Quillhaven | 💰 8 | From anywhere on the mainland: back to your home city (a Wanderer picks any city they've rested at). Your remaining Initiative drops to 0. |
| 🥜 Trail Mix | City markets, Mistfall, Ridgeway; sometimes found while exploring | 💰 6 | +1 Initiative (up to 5), once a turn. |

### 27. 🧑‍🏫 Trail Tutor · `tutor`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 2 | Day | Always | No |

A trail tutor offers to teach one creature a new overworld Ability. Three random Abilities are offered.

**Choices**
- **Learn (Ability)** ×3: pick a creature (not one that already has it). Its Ability becomes the new one for good (`CreatureInst.ability`); it no longer has its species' usual one. It works while that creature is Following, like any Ability.
- **No thanks:** nothing happens.

**Notes:** the free, random version of the Battle School's Ability retraining (no Loyalty cost, no overnight stay).

### 28. 🥁 Drum Circle · `drums`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures | 2 | Night | Always | No |

Drummers by a ring of fires invite one creature to dance until dawn, waking a different battle Instinct. Three random Instincts are offered, from any type.

**Choices**
- **Wake (Instinct)** ×3: pick a creature (not one that already has it). Its Instinct becomes the new one for good (`CreatureInst.instinct`). The choice shows the Instinct's type pool and its in-game text.
- **No thanks:** nothing happens.

**Notes:** the free, random version of the Battle School's Instinct retraining. Any creature can take any Instinct, not just one from its own types.

### Cloud Island events

These only happen while the trainer is on Cloud Island (see [Arbiters & Arenas](./11-arbiters-and-arenas.md), Salem). While there, nothing else happens. By day, a trainer on the island is stranded until the portal opens at night. **Items they give go into the Cloud satchel** and are only secured when the trainer escapes the island; a team wipe loses them.

| Time | Events | Total weight |
|---|---|---|
| Night | Star Shepherd, Moonbow, Sky Whale, Cloud Bank | 9 |
| Day | Sunlit Clouds, Sky Whale, Cloud Bank | 7 |

### 29. 🌟 Star Shepherd · `shepherd`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Cloud Island | 3 | Night | On Cloud Island | No |

A glowing figure with a crook herds drifting stardust across the clouds.

**Choices**
- **Help gather · 1 Initiative:** get 2 Stardust (universal offering, +2 to recruit any creature).
- **Ask for a blessing:** your follower gets +1 Loyalty and +1 Morale.
- **No thanks:** nothing happens.

### 30. 🌈 Moonbow · `moonbow`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Cloud Island | 2 | Night | On Cloud Island | Yes (two good options) |

A rainbow arcs across the clouds in moonlight, its end right beside you.

**Choices**
- **Reach for its end:** roll d6. On 5–6, get a **Moonbow Prism** (+3 to recruit any creature, the rarest offering). Otherwise, get a Cloud Silk.
- **Watch it with your team:** all your partner creatures (in totems too) get +1 Morale.

### 31. 🐋 Sky Whale · `skywhale`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Cloud Island | 2 | Any | On Cloud Island, with a follower | Yes (two good options) |

An enormous whale of cloud glides past.

**Choices**
- **Let your follower ride along · 1 Initiative:** the follower gains +6 XP and +1 Morale.
- **Wave hello:** get 2 Cloud Silk.

### 32. 🌫️ Cloud Bank · `cloudbank`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Cloud Island | 2 | Any | On Cloud Island | **Yes** |

A thick bank of cloud swallows the path.

**Choices**
- **Wait for it to lift · 1 Initiative.**
- **Let (follower) lead the way:** roll d6 + the follower's Speed. On **7 or more**, find a Stardust. Otherwise, every active creature gets −1 Morale.

### 33. ☀️ Sunlit Clouds · `sunlit`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Cloud Island | 3 | Day | On Cloud Island | Yes (two good options) |

Daylight burns the portal shut until night (the trainer is stranded on the island for the day).

**Choices**
- **Bask in the sun:** the active team (not KO'd) gets full Health, and Fatigue cleared.
- **Comb the clouds:** get 1 Cloud Silk and 1 Stardust.

### Forest Floor events

These only happen while the trainer is on the Forest Floor below Gloomshade (see [Arbiters & Arenas](./11-arbiters-and-arenas.md), Dahlia). While there, nothing else happens. **They're all hostile and forced:** there's no "No thanks", only a choice of how to suffer. Total weight 12, any time of day (it's always dark down there).

### 34. 👁️ Something in the Dark · `stalker`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Forest Floor | 3 | Any | On the Forest Floor, a creature able to fight | **Yes** |

Something big has been stalking you through the roots.

**Choices**
- **Turn and fight:** a wild battle against a Prime night creature, 2 levels above the usual. Running needs a 7+ (unless Quick Step), as everywhere on the Forest Floor. It can be recruited if beaten.
- **Throw it some food:** lose a random treat or offering material. Disabled if you have none.
- **Flee into the dark:** −1 sign of Dahlia's Trail.

### 35. 🌱 Grasping Roots · `roots`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Forest Floor | 3 | Any | On the Forest Floor, a creature not KO'd | **Yes** |

Roots seize one random active creature.

**Choices**
- **Cut it free · 1 Initiative.**
- **Tear it free:** it loses 1 heart (never its last) and 1 Morale.

### 36. 🍄 Spore Cloud · `spores`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Forest Floor | 2 | Any | On the Forest Floor | **Yes** |

A fungus bursts into a choking spore cloud.

**Choices**
- **Brew a Calm Tea:** uses one Calm Tea, no harm done. Disabled if you have none.
- **Follow (follower) out of the cloud:** roll d6 + the follower's Speed. On **7 or more**, you escape. Otherwise, the active team gains 1 Fatigue and −1 Morale.

### 37. 🌫️ Whispers in the Dark · `whispers`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Forest Floor | 2 | Any | On the Forest Floor | **Yes** |

Voices mimicking Dahlia's blur the trail.

**Choices**
- **Retrace your steps · 2 Initiative:** keep the trail.
- **Follow the voices:** −1 sign of Dahlia's Trail.

### 38. 🦇 Shade Thieves · `shadethieves`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Forest Floor | 2 | Any | On the Forest Floor, with a non-key item | **Yes** |

Shadows make off with your things.

**Choices**
- **Let them go:** lose one random item (never a key item).
- **Send (follower) after them:** roll d6 + the follower's Speed. On **7 or more**, you lose nothing. Otherwise, you lose the item and the follower loses 1 heart.

---

## Adding a new event

### 1. Design it (fill in the template)

Copy this block into [The events](#the-events), numbered next in line, and add a row to the [Overview](#overview) table.

#### Template for a new event

```markdown
### N. (icon) Event Name · `event-id`

| Kind | Weight | Time | Appears when | Forced? |
|---|---|---|---|---|
| Creatures / Service / Find / Hazard / Battle / Gamble / Rest | 2 | Day / Night / Any | Always (or the condition) | No / Yes / Yes (… options) |

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
- [ ] A time of day if the story needs one (day, night, or any). Keep day and night roughly balanced in total weight.
- [ ] Forced only when there's no harmless way out, and forced events should be rare (weight 2).
- [ ] An icon for the art team: add it to [docs/07-icon-checklist.md](./07-icon-checklist.md), section 10.

### 2. Build it (developers)

Add an entry to the `EVENTS` list in `src/engine/events.ts`:

```ts
{
  id: 'my-event', weight: 2,
  time: 'night',                                   // optional: 'day' or 'night' only (unset = any time)
  // place: 'cloud',                               // optional: 'cloud' or 'floor': Cloud Island / Forest Floor only (and only those happen there)
  when: (s) => s.coins >= 5,                       // optional: only roll it when it makes sense
  create: (s) => ({ price: 5 }),                   // details rolled once and saved with the event (plain JSON)
  view: (s, d) => ({
    title: 'My Event', icon: '✨',
    text: 'What the player reads.',
    choices: [
      { id: 'buy', label: `Do the thing · 💰 ${d.price}`, detail: 'What it does.', disabled: afford(s, d.price as number) },
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
| *(example)* Wild Stampede | Hazard | A herd blocks the road: wait (−1 Initiative) or lead your follower through (Speed roll for coins, or −1 heart). | Idea |
| | | | |
