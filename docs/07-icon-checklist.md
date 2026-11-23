# Icon Checklist: replacing emoji with custom icons

Every emoji in the game is a placeholder. This list covers each one that needs a custom icon, grouped by where it appears, so the art team can work through it and tick items off.

**Already custom (not on this list):** the 8 type icons (`public/assets/types/`), creature portraits and trainer minis.

## How to use this list

- Tick `[x]` when the final icon is delivered. Developers swap it in afterwards.
- Each item shows the **icon name** (a suggested file name), the **current emoji** for reference, and **where it shows** in the game.
- Several emoji currently stand for more than one thing. Each meaning gets its own item here (see [Shared emoji to split](#shared-emoji-to-split)).
- **Suggested delivery** (for the art lead to confirm):
  - Match the style of the type icons: 512×512 source, transparent background.
  - Export as SVG or PNG.
  - Most icons are shown small (14–28 px) in chips, buttons and lists, so they must read clearly at 16 px.
  - Larger uses are about 44–76 px: event cards, the welcome tour, menu tiles.

**Priority:** ★★★ seen every turn · ★★ seen often · ★ occasional.

## Replace first: stand-in emoji

Windows 10's emoji font can't draw Emoji 13 or later, so these icons showed as blank boxes there. They have been swapped for older emoji that every system can show, but the stand-ins are rough fits. Replace these first, whatever their section's priority. They're marked **(stand-in)** in the sections below.

| Was | Now | Icon names | Where |
|---|---|---|---|
| 🪙 | 💰 | `coin` | HUD coin pill, every price, reward and wager (★★★, the most urgent; 💰 also means the Merchant style) |
| 🫐 | 🍒 / 🍑 | `item-dewberry` / `item-duskberry` | Treats in markets and the bag |
| 🪶 | 🕊️ | `item-homing-feather` | Travel item, its city picker and toast |
| 🪆 | 🎎 | `item-effigy` | Creature Effigy totem |
| 🪵 | ⚫ / 🍯 | `mat-ember-charcoal` / `mat-heartwood-resin` | Carving materials |
| 🪨 | ⬜ / 🌄 | `mat-river-chalk` / `biome-canyon` | Carving material, Canyon biome |
| 🪷 | 💮 | `mat-marsh-lotus` | Carving material |
| 🪢 | ➰ | `key-canopy-rope` | Key item, the Forest Floor descent prompt |
| 🪨 | 💥 | `status-stagger` | Stagger status |
| ⯪ | ☆ | `die-star-half` | Half rarity star on the dice |
| · | 🚫 | `die-star-blank` | Blank rarity die face |

Until the custom icons arrive, new placeholder emoji should come from Emoji 12 or earlier so they show on Windows 10.

---

## 0. Game logo & app icon ★★★

The game has no logo yet. The title screen spells out "Creature Circuit" in plain text over a row of the 8 type icons, and the browser tab and phone home-screen icon borrow the Astral type icon.

- [ ] `logo`: **The Creature Circuit logo.** The game's main logo or wordmark for the title screen, replacing the text and type-icon row. Deliver a full-colour version on transparent, plus a one-colour version.
- [ ] `app-icon`: **App icon** (512×512). A square mark from the logo for the phone home screen and the installed app (`public/manifest.webmanifest`, `apple-touch-icon` in `index.html`). Currently the Astral type icon.
- [ ] `favicon`: **Browser tab icon** (32×32 and 16×16). The app icon, simplified to stay readable at tiny sizes.

## 1. HUD & resources ★★★

- [ ] `coin`: 💰: Coins. HUD coin pill, every price, reward and wager. **(stand-in)**
- [ ] `initiative`: ⚡: Initiative, the action points. Costs on buttons and tiles ("1⚡").
- [ ] `menu`: ☰: Main menu button (top right).
- [ ] `merit`: 🏅: Merits earned (season results).
- [ ] `turns-left`: ⏳: "Turns left" warning near the end of the season.
- [ ] `level-up`: ▲: Badge on a creature with unspent level-up points (team strip, cards).
- [ ] `unhappy-warning`: ⚠️: Low-Morale warning on the team strip and cards.
- [ ] `here`: 📍: "Here with you" (another trainer on the same spot).
- [ ] `locked`: 🔒: Locked route, or the locked Signature Move preview.
- [ ] `rare-area`: ★: Rare-area marker on map node previews.
- [ ] `home`: 🏠: Your home city tag.

## 2. Map action bar ★★★

- [ ] `action-explore`: 🔍: Explore (re-explore a wild node).
- [ ] `action-camp`: ⛺: Camp.
- [ ] `action-city`: 🏙️: Open the City menu.
- [ ] `action-town`: 🏘️: Open the Town menu.
- [ ] `action-arena`: 🏟️: Arena (Arbiter's arena node).
- [ ] `action-stadium`: 🏟️: Circuit Stadium (needs a distinct icon from Arena).
- [ ] `action-bike`: 🚲: Bike ride (shows "Ride N" while a roll waits).
- [ ] `action-taxi`: 🚕: Taxi (in a city, with a Taxi Ticket).
- [ ] `action-trainers`: 👥: Trainers (gifts, trades, duels).
- [ ] `action-team`: 🐾: Team (also "My team" while watching online).
- [ ] `action-bag`: 🎒: Bag (also "My bag" while watching online).
- [ ] `action-end-turn`: ⏭️: End Turn.
- [ ] `next-stop`: 📍: "Mark as next stop" in the node preview, the "Your next stop" chip on the location card, and its toasts (the marker on the map itself is a 3D flag in the trainer's colour).
- [ ] `active-effects`: the yellow HUD pill listing active effects (uses each effect's own icon: 🍲 Nabe, ⭐ lucky stars, 🕯️ Lure, 💫 wisp).
- [ ] `bond`: 🤝: Special bond tag on the starter's card.

## 3. City & town services ★★

- [ ] `stable-city`: 🍲: City Stable with its Chanko Nabe hot pot.
- [ ] `stable-town`: 🐴: Town Stable (no hot pot).
- [ ] `market`: 🛒: Market.
- [ ] `carving-shrine`: 🔄: Carving Shrine (carve Totems and Effigies).
- [ ] `odd-jobs`: 🧰: Odd Jobs (spend the rest of your Initiative for d4 coins each; city and town tiles).
- [ ] `workbench`: 🛠️: Workbench (craft consumables from materials; city and town tiles).
- [ ] `swap-team`: 🔄: Swap Team (active team ↔ totems).
- [ ] `trainer-hall`: 🤺: Trainer Hall.
- [ ] `gauntlet`: ⚓: Iron Coast Gauntlet (Stella's trainer gauntlet).
- [ ] `arbiter-arena`: 🏟️: Arbiter challenge tile.
- [ ] `ferry`: ⛴️: Arbiter reached by ferry (Kilauea).
- [ ] `battle-school`: 🥋: Battle School (Valor Ridge).
- [ ] `research-facility`: 🔬: Research Facility (Quillhaven).
- [ ] `cloud-portal`: 🌀: Cloud Island Portal (Aurora Peak) and the Cloud Island screen.
- [ ] `cloud-satchel`: ☁️: Cloud satchel (island loot not yet secured, in the Bag).
- [ ] `forest-floor`: 🌲: The Forest Floor (Gloomshade's Dahlia tile, rules screen, HUD chip).
- [ ] `dahlia-trail`: 🏮: Dahlia's Trail (trail found, explore result).
- [ ] `explore-depths`: 🕳️: Explore the Depths (Shifting Depths).
- [ ] `wisp`: 💫: A wisp (map marker, lantern check sheet, catch toast, active effect).
- [ ] `notice-board`: 🗺️: Notice Board (rumors). Also the "Where to look" heading in the Codex.
- [ ] `enrol`: 📝: Battle School "Enrol a creature" heading.
- [ ] `retrain`: 🌅: Battle School "Retraining" heading, the "Morning" badge on a creature being retrained, and the "retraining is done" toast.
- [ ] Notice Board townsfolk portraits (5), shown next to rumors:
  - [ ] `npc-farmer`: 🧑‍🌾
  - [ ] `npc-elder`: 👵
  - [ ] `npc-bearded`: 🧔
  - [ ] `npc-artist`: 👩‍🎨
  - [ ] `npc-mystic`: 🧙

## 4. Biomes (14) ★★

Shown on map node previews, Codex pages and filters, and material "found in" lists.

- [ ] `biome-forest`: 🌲
- [ ] `biome-grove` (Fey Grove): 🍄
- [ ] `biome-meadow`: 🌼
- [ ] `biome-mountain`: ⛰️
- [ ] `biome-tundra`: ❄️
- [ ] `biome-lake`: 🏞️
- [ ] `biome-river`: 🌊
- [ ] `biome-road`: 🛤️
- [ ] `biome-swamp`: 🐊
- [ ] `biome-desert`: 🌵
- [ ] `biome-badlands`: 🏜️
- [ ] `biome-coast`: 🏖️
- [ ] `biome-volcanic`: 🌋
- [ ] `biome-canyon`: 🌄 **(stand-in)**
- [ ] `biome-cloud`: ☁️ (Cloud Island)
- [ ] `biome-deepwood`: 🌑 (the Forest Floor)
- [ ] `biome-prism`: 🌈 (the Rainbow Plains)

## 5. Weather (11) & seasons (4) ★★★

Shown on the weather pill (every turn), the calendar and the weather dice.

- [ ] `weather-clear`: ☀️ Clear Skies
- [ ] `weather-rain`: 🌧️ Rain
- [ ] `weather-bloom`: 🌸 Spring Bloom
- [ ] `weather-windy`: 🌬️ Gusty Winds
- [ ] `weather-heat`: 🥵 Heat Wave
- [ ] `weather-storm`: ⛈️ Thunderstorm
- [ ] `weather-drought`: 🏜️ Drought
- [ ] `weather-fog`: 🌫️ Fog
- [ ] `weather-overcast`: ☁️ Overcast
- [ ] `weather-snow`: 🌨️ Snowfall
- [ ] `weather-blizzard`: ❄️ Blizzard
- [ ] `weather-aurora`: 🌌 Aurora Night
- [ ] `season-spring`: 🌱
- [ ] `season-summer`: 🌞
- [ ] `season-autumn`: 🍂
- [ ] `season-winter`: ❄️
- [ ] `time-day`: ☀️ Day (HUD pill, calendar, Codex)
- [ ] `time-night`: 🌙 Night (HUD pill, calendar, Codex)
- [ ] `activity-crepuscular`: 🌗 Out by day and night (Codex)

## 6. Items ★★

Shown in the Bag, Markets, rewards, recruit offerings and trades.

**Restoratives**
- [ ] `item-salve`: 🩹 Vigor Salve
- [ ] `item-elixir`: 🧪 Hot Spring Elixir
- [ ] `item-calm-tea`: 🍵 Calm Tea
- [ ] `item-energy-tonic`: ⚗️ Energy Tonic

**Treats**
- [ ] `item-sunberry`: 🍓 Sunberry
- [ ] `item-dewberry`: 🍒 Dewberry **(stand-in)**
- [ ] `item-moonberry`: 🍇 Moonberry

**Charms**
- [ ] `item-lure-incense`: 🕯️ Lure Incense (also the "Lure active" chip)
- [ ] `item-hush-smoke`: 💨 Hush Smoke (also the "Hush Smoke active" chip, the Hushed dice labels and its active-effect entry)
- [ ] `item-star-charm`: ⭐ Star Charm (also the "Star Charm active" chip)

**Travel**
- [ ] `item-bike`: 🚲 Bike (also the action-bar button)
- [ ] `item-taxi-ticket`: 🚕 Taxi Ticket (also the action-bar button)
- [ ] `item-homing-feather`: 🕊️ Homing Feather **(stand-in)**
- [ ] `item-trail-mix`: 🥜 Trail Mix

**Totems**
- [ ] `item-totem`: 🗿 Plain Totem
- [ ] `item-totem-typed`: 🗿 Typed Totem. One base design; ideally 8 variants tinted or marked per type.
- [ ] `item-effigy`: 🎎 Creature Effigy **(stand-in)**
- [ ] `item-unknown`: ❔ Fallback for an unknown item

**Offering materials (13)**
- [ ] `mat-pine-resin`: 🌲 Pine Resin
- [ ] `mat-glacier-salt`: 🧂 Glacier Salt
- [ ] `mat-ember-charcoal`: ⚫ Ember Charcoal **(stand-in)**
- [ ] `mat-river-chalk`: ⬜ River Chalk **(stand-in)**
- [ ] `mat-marsh-lotus`: 💮 Marsh Lotus **(stand-in)**
- [ ] `mat-sage-bundle`: 🌾 Sage Bundle
- [ ] `mat-sea-glass`: 🔷 Sea Glass
- [ ] `mat-iron-filings`: ⚙️ Iron Filings
- [ ] `mat-moon-moss`: 🌙 Moon Moss
- [ ] `mat-thunder-quartz`: 💎 Thunder Quartz
- [ ] `mat-wildflower`: 🌼 Wildflower
- [ ] `mat-canyon-ochre`: 🟠 Canyon Ochre
- [ ] `mat-volcanic-glass`: 🖤 Volcanic Glass

**Exotic finds (the Forest Floor; Heartwood Resin and Glowcap also on the Rainbow Plains)**
- [ ] `item-root-salve`: 🌿 Root Salve
- [ ] `item-duskberry`: 🍑 Duskberry (needs a distinct icon from Dewberry) **(stand-in)**
- [ ] `mat-heartwood-resin`: 🍯 Heartwood Resin (needs a distinct icon from Ember Charcoal) **(stand-in)**
- [ ] `mat-glowcap`: 🍄 Glowcap

**Universal offerings (Cloud Island)**
- [ ] `mat-cloud-silk`: ☁️ Cloud Silk
- [ ] `mat-stardust`: ✨ Stardust
- [ ] `mat-moonbow-prism`: 🌈 Moonbow Prism

**Key items**
- [ ] `key-fog-lantern`: 🏮 Fog Lantern (with a Check button that reveals the wisp)
- [ ] `key-canopy-rope`: ➰ Canopy Rope **(stand-in)**
- [ ] `key-ferry-pass`: ⛴️ Ferry Pass
- [ ] `key-root-whistle`: 🎐 Root Whistle
- [ ] `key-summit-pick`: ⛏️ Summit Pick

## 7. Battle ★★★

**Controls**
- [ ] `battle-catch-breath`: 😮‍💨 Catch Breath
- [ ] `battle-swap`: 🔁 Swap (also in the duel picker)
- [ ] `battle-run`: 🏃 Run
- [ ] `battle-types`: 🔺 Types (matchup chart; also the Type Chart menu tile)
- [ ] `battle-card`: 📇 View the creature's card
- [ ] `battle-watching`: 👀 Watching someone else's battle (online)

**Nameplates & move cards**
- [ ] `stat-health-heart`: ♥ Heart badge on Health bars
- [ ] `stat-stamina`: 💨 Stamina
- [ ] `move-damage`: ⚔ Damage value on move cards
- [ ] `move-physical`: ✊ Physical move marker
- [ ] `move-support`: ✦ Support move marker
- [ ] `arena-chip`: 🏟 Arena trick chip in Arbiter battles

**Move readout steps**
- [ ] `readout-turn-order`: ⚡ Turn order
- [ ] `readout-stamina`: 💨 Stamina cost
- [ ] `readout-fatigue`: 🥵 Fatigue check
- Fatigue counter: drawn with CSS as a rotated-square warning diamond (`.fat-badge`) on the battle nameplate and creature cards, so it needs no icon. A custom diamond frame could replace it later.
- [ ] `readout-accuracy`: 🎯 Accuracy roll / sure hit
- [ ] `zero-in`: ⌖ Zeroing In. The nameplate tag ("⌖ +2"), its float text and log line, the readout line, and the move-card marker for pursuit (⌖+2) and all-or-nothing (⌖✕) moves.
- [ ] `readout-damage`: 💥 Damage
- [ ] `readout-effects`: ✨ Effects

**Dice faces**
- [ ] `die-star-full`: ★ Rarity star (full)
- [ ] `die-star-half`: ☆ Rarity star (half) **(stand-in)**
- [ ] `die-star-blank`: 🚫 Blank rarity die face **(stand-in)**
- Weather die faces reuse the weather icons ([section 5](#5-weather-11--seasons-4-)), so they need no separate art.

**Dice bodies** (drawn with CSS for now; the number or face sits on top)
- [ ] `die-d4`: yellow triangle. Clash die at Lv 1–3, move damage d4.
- [ ] `die-d6`: white rounded square. Exploring, rarity stars, weather, finds, accuracy, damage, Clash at Lv 4–6, offerings, school and many events.
- [ ] `die-d8`: blue diamond. Forest Floor exploring, Clash at Lv 7–9, move damage d8.
- [ ] `die-d10`: purple pentagon. Morale checks, Fatigue checks, Clash at Lv 10–12, move damage d10.
- [ ] `die-d12`: Clash die from Lv 13. It shares the d10's pentagon for now, so it needs its own shape.
- [ ] `die-d20`: pink hexagon. A wild Legendary's "Hold attention" roll.
- Each die also shows a green (good), red (bad) or yellow (info) tint when it lands. Deliver the bodies so the tint can still be applied (e.g. a light fill or separate tint layers).

**Clash coin flip**
- [ ] `clash-coin`: gold coin (CSS for now). Flipped when a Clash's dice tie, to decide who acts first. One face shows the player's creature name and the other the foe's, so deliver a blank coin face (front and back) with room for a short name.

## 8. Status effects (8) ★★

Shown as status tags in battle, in ☰ Menu → Status Effects, and as small badges on each type in the Type Chart (with a status section below it).

- [ ] `status-burn`: 🔥 Burn
- [ ] `status-soak`: 💧 Soak
- [ ] `status-shock`: ⚡ Shock
- [ ] `status-snare`: 🌿 Snare
- [ ] `status-stagger`: 💥 Stagger **(stand-in)**
- [ ] `status-sunder`: ⚙️ Sunder
- [ ] `status-beguile`: 💗 Beguile
- [ ] `status-daze`: ✨ Daze

## 9. Creatures: cards, chart & playbook ★★

**Progression chart nodes**
- [ ] `node-stat`: ▲ +1 stat
- [ ] `node-energy`: ◆ +2 energy
- [ ] `node-vigor`: ♥ +1 Vigor
- [ ] `node-signature`: ★ Signature Move
- [ ] `node-evolve`: ⇪ Evolve
- [ ] `node-prisma`: ✦ +2 Prisma energy
- [ ] `node-capstone`: ❖ Capstone (also the "Chart complete" box)

**Morale, Loyalty & traits**
- [ ] `morale-happy`: 💖 Morale chip
- [ ] `loyalty`: 🤝 Loyalty chip
- [ ] `loyalty-legendary`: ⏳ Legendary Loyalty, which drains each turn
- [ ] `ability`: 🌿 Overworld Ability line
- [ ] `teamwork`: 🤝 Teamwork. The chip on each Swap Move slot (creature card and battle swap screen), and the "Teamwork grew" toasts at the start of a turn and after a battle.
- [ ] `recruited`: 🗿 "Recruited" marker in the Codex and on cards
- [ ] `perk-unlocked`: ✓ Nature perk unlocked
- [ ] `perk-locked`: ○ Nature perk not yet unlocked

**Playbook editor & Recommend moves**
- [ ] `filter-physical`: 👊 Physical filter / "Optimize physical power"
- [ ] `goal-elemental`: 🔮 "Optimize elemental power"
- [ ] `goal-balanced`: ⚖️ "Optimize balanced spread"
- [ ] `filter-support`: 🛡️ Support filter
- [ ] `recommend`: ✨ "Recommend moves?" button
- [ ] `move-add`: ➕ "Add move?" in a move's details (phones)
- [ ] `move-remove`: ➖ "Remove move" in a move's details (phones)
- [ ] `weak-to`: 🛡️ "Weak to" column header on the type chart

**Swap Moves**
- [ ] `swap-moves`: 🔁 Swap Moves section on the creature card and the battle swap screen (shares the battle Swap button's 🔁).
- [ ] `swap-alpha`: ⭐ "Alpha · swapping in" tag on the highlighted Alpha in the Swap Move picker (shares the Star Charm's ⭐).
- [ ] `swap-pair`: ⇄ arrow between the Alpha and its partner at the top of the Swap Move picker.
- Typed Swap Moves show their type's icon in the picker and on the card, so they need no icon of their own.

**Instincts**
- [ ] `instinct`: 🔆 Instinct: the panel on the creature card, the follower sheet and starter lines, and every "Name’s Instinct!" battle log line. One shared icon for all 48 (they may each get their own later; see [14 · Instinct Checklist](./14-instinct-checklist.md)).

## 10. Start-of-turn events (28) ★★

Shown large on each event card.

- [ ] `event-roaming-trader`: 🧳
- [ ] `event-caretaker`: 🩺
- [ ] `event-trail-tutor`: 🧑‍🏫
- [ ] `event-drum-circle`: 🥁
- [ ] `event-wandering-cook`: 🍲
- [ ] `event-lost-creature`: 🥺
- [ ] `event-merchant-caravan`: 🐫
- [ ] `event-sudden-storm`: ⛈️
- [ ] `event-sparring-master`: 🥋
- [ ] `event-fortune-teller`: 🔮
- [ ] `event-windfall`: 🧺
- [ ] `event-rival-challenge`: 🤺
- [ ] `event-wise-hermit`: 📜
- [ ] `event-pickpocket`: 🦝
- [ ] `event-passing-pilgrim`: 🙏
- [ ] `event-hidden-hot-spring`: ♨️
- [ ] `event-dice-gambler`: 🎲
- [ ] `event-traveling-bard`: 🪕
- [ ] `event-old-trainer`: 🧓
- [ ] `event-local-guide`: 🧭
- [ ] `event-team-squabble`: 😾
- [ ] `event-codex-scholar`: 🔍
- [ ] `event-lost-satchel`: 🎒
- [ ] `event-shooting-star`: 🌠
- [ ] `event-bad-berries`: 🤢
- [ ] `event-eager-apprentice`: 🧒
- [ ] `event-hot-air-balloon`: 🎈
- [ ] `event-night-coach`: 🚌
- [ ] `event-star-shepherd`: 🌟 (Cloud Island)
- [ ] `event-moonbow`: 🌈 (Cloud Island)
- [ ] `event-sky-whale`: 🐋 (Cloud Island)
- [ ] `event-cloud-bank`: 🌫️ (Cloud Island)
- [ ] `event-sunlit-clouds`: ☀️ (Cloud Island)
- [ ] `event-stalker`: 👁️ (Forest Floor)
- [ ] `event-grasping-roots`: 🌱 (Forest Floor)
- [ ] `event-spore-cloud`: 🍄 (Forest Floor)
- [ ] `event-whispers`: 🌫️ (Forest Floor)
- [ ] `event-shade-thieves`: 🦇 (Forest Floor)

## 11. Trainer styles (8) ★

Shown when creating a trainer.

- [ ] `style-wanderer`: ⚖️
- [ ] `style-ranger`: 🌲
- [ ] `style-urbanite`: 🏙️
- [ ] `style-beast-whisperer`: 🤝
- [ ] `style-merchant`: 💰
- [ ] `style-battle-master`: 🎖️
- [ ] `style-caretaker`: 💞
- [ ] `style-pathfinder`: 🧭

## 12. Multiplayer (hotseat & online) ★★

- [ ] `mode-hotseat`: 👥 Hotseat (title screen, saves)
- [ ] `mode-online`: 🌐 Online (title screen, saves)
- [ ] `mode-solo`: 🧭 Solo (saves list)
- [ ] `gift`: 📦 Send a gift / gift notes
- [ ] `trade`: 🤝 Trade / trade notes
- [ ] `duel`: ⚔️ Challenge / duel screens and notes
- [ ] `inbox`: 📬 "While you were away" notes
- [ ] `host`: 👑 Host settings
- [ ] `host-new-room`: ➕ Host a new room / Create my trainer
- [ ] `reopen-room`: ♻️ Reopen a saved game as host
- [ ] `invite-link`: 🔗 Copy invite link
- [ ] `presence-online`: 🟢 Player online
- [ ] `presence-away`: ⚪ Player away
- [ ] `turn-ping`: 🔔 "Your turn!" (toast and browser-tab title)
- [ ] `turn-timer`: ⏱ Turn timer
- [ ] `host-skip`: ⏭ Skip turn (host control)
- [ ] `host-play-for`: 🎮 Play for… (host control)

## 13. Menus, saves & guide ★

**☰ Menu tiles**
- [ ] `menu-codex`: 📖 Creature Codex
- [ ] `menu-status-effects`: 🌀 Status Effects
- [ ] `menu-journal`: 📜 Journal
- [ ] `menu-trainer-look`: 🧢 Trainer Look
- [ ] `menu-how-to-play`: ❓ How to Play
- [ ] `menu-settings`: ⚙️ Settings
- [ ] `sound-muted`: 🔇 Muted (Menu and Settings volume row)
- [ ] `sound-low`: 🔈 Volume low
- [ ] `sound-mid`: 🔉 Volume medium
- [ ] `sound-high`: 🔊 Volume high
- [ ] `menu-title-screen`: 🏠 Title Screen
- [ ] `menu-leave-online`: 🚪 Leave online game
- [ ] `menu-abandon`: 🗑️ Abandon Journey

**Saves**
- [ ] `saves`: 💾 Saves
- [ ] `save-copy`: 📌 Save a copy
- [ ] `saved-copies`: 🗂 Saved copies list
- [ ] `save-export`: ⬇ Export
- [ ] `save-import`: ⬆ Import
- [ ] `save-load`: ↺ Load a copy (also "flip card" on creature cards)
- [ ] `save-rename`: ✏️ Rename / Remake my trainer
- [ ] `save-delete`: 🗑 Delete

**Codex & guide**
- [ ] `search`: 🔎 Codex search field
- [ ] `offerings`: 🎁 "Best offerings" heading
- [ ] `keen-nose`: 👃 Keen Nose "pick one find" screen
- [ ] Guide category tabs:
  - [ ] `guide-basics`: 🧭
  - [ ] `guide-creatures`: 🐾
  - [ ] `guide-battles`: ⚔️
  - [ ] `guide-places`: 🏙️
  - [ ] `guide-multiplayer`: 👥
  - [ ] `guide-you-saves`: 🧢
- [ ] Welcome tour cards (shown large, about 44 px):
  - [ ] `tour-goal`: 🏆
  - [ ] `tour-turn`: ⚡
  - [ ] `tour-creatures`: 🐾
  - [ ] `tour-growth`: 📈
  - [ ] `tour-learn`: ❓

## 14. Season results ★

- [ ] `champion`: 🏆 Champion of the Circuit
- [ ] `season-over`: 🏁 Season Over
- [ ] `begin-journey`: ✦ "Begin Journey" flourish

## 15. Small UI glyphs (lowest priority)

These are text symbols. They could stay as font characters, but are listed for a fully consistent look.

- [ ] `close`: ✕ Close buttons, taken colour swatches
- [ ] `check`: ✓ Merit earned, done states
- [ ] `arrow-back` / `arrow-next`: ← → Back/Next buttons (arrows inside sentences can stay as text)
- [ ] `swap-slot`: ↪ "for (teammate)" on each Swap Move slot of the creature card

---

## Shared emoji to split

The same emoji currently stands for different things. Each meaning should get its own icon so players can tell them apart.

| Emoji | Meanings that need separate icons |
|---|---|
| 🔄 | Carving Shrine · Swap Team |
| 🏟️ | Arena · Circuit Stadium · Arbiter challenge |
| ⚡ | Initiative · Shock status · turn-order step · tour card |
| 🌿 | Snare status · overworld Ability |
| 💰 | Coins · Merchant style |
| 💥 | Damage step · Stagger status |
| ⚙️ | Iron Filings · Sunder status · Settings |
| ⭐ | Star Charm · lucky stars · Swap Move Alpha tag |
| 🌲 | Forest biome · Pine Resin · Ranger style |
| 🌼 | Meadow biome · Wildflower |
| ❄️ | Tundra biome · Blizzard weather · Winter season |
| 🏜️ | Badlands biome · Drought weather |
| 🥵 | Heat Wave weather · Fatigue check |
| ⛈️ | Thunderstorm weather · Sudden Storm event |
| 🍲 | City Stable · Wandering Cook event |
| 🥋 | Battle School · Sparring Master event |
| 🤺 | Trainer Hall · Rival Challenge event |
| 🔍 | Explore · Codex Scholar event |
| 🎒 | Bag · Lost Satchel event |
| 📜 | Journal · Wise Hermit event |
| 🔮 | Fortune Teller event · elemental goal |
| ⚖️ | Wanderer style · balanced goal |
| 🤝 | Trade · Loyalty · Beast Whisperer style · Special bond · Teamwork |
| 🧭 | Pathfinder style · Local Guide event · Solo mode · guide Basics tab |
| 🗿 | Plain Totem · typed Totems · "Recruited" marker |
| ★ | Rarity star · Signature node · rare-area marker |
| ✦ | Prisma node · Support move marker · Begin Journey |
| ♥ | Health bar heart badge · +1 Vigor node |
| ▲ | Level-up badge · +1 stat node |
| ⏳ | Turns-left warning · Legendary Loyalty |
| 🛡️ | Support filter · "Weak to" header |
| ✨ | Daze status · effects step · Recommend moves |
| 💨 | Stamina · Stamina-cost step |
| 🎯 | Accuracy roll · sure hit |
| 🗑 | Delete save · Abandon Journey |
| 🏆 | Champion · tour goal card |
| ❓ | How to Play tile · tour "learn" card |

---

*The game's code lists each icon in one place, which makes the swap simple. Items, materials and key items are in `src/data/content.ts`, as are biomes, weather and seasons. Status effects are in `src/data/moves.ts`, chart nodes in `src/engine/creature.ts`, events in `src/engine/events.ts`, trainer styles in `src/engine/state.ts`, and guide and tour icons in `src/ui/guide.ts`. Buttons, tiles and labels are in `src/ui/app.ts` and `src/ui/cards.ts`.*
