# creature-circuit
A game about collecting wonderous creatures, developing their battle powers, becoming the regional champion and proving yourself as the best trainer of all time.


# Creature Circuit (Browser / App Edition)

**Creature Circuit** is a strategic monster-training game inspired by classic 90s tabletop mechanics, adapted into a digital browser/app experience. Players travel across a map inspired by American National Parks, capture and evolve creatures across 8 elemental types, challenge regional Arbiters, and compete in an endgame championship gauntlet.

---

## 🎮 Play it

```bash
npm install
npm run dev        # http://localhost:5173. Also served on your LAN, so you can open it on a phone
npm test           # engine unit tests (Vitest)
npm run build      # type-check, then a production build to dist/ (static files, host anywhere)
npm run preview    # serve the production build
npm run docs:creatures  # regenerate docs/08-creature-checklist.md from the game data
npm run docs:moves      # regenerate docs/09-move-checklist.md from the game data
```

The game runs in any modern desktop or mobile browser that supports WebGL. It saves to `localStorage` automatically. It can be installed as a PWA ("Add to Home Screen"), and the production build works offline.

### 🌐 Online play

Online multiplayer needs the small Node server in `server/`. It serves the built game and relays turns over WebSockets at `/ws`.

```bash
npm run build && npm start     # http://localhost:8787 (set PORT to change it)
# while developing: run `npm run server` alongside `npm run dev` (Vite forwards /ws to port 8787)
```

**Deploying on Render:** `render.yaml` is a Render Blueprint. In Render, choose **New → Blueprint** and pick this repository. It builds with `npm ci && npm run build`, starts with `npm start`, and health-checks `/health`. Rooms are kept in memory, so a restart (or a sleeping free instance) closes them. Every browser keeps its last copy of the match, and **🌐 Online → Reopen as host** puts it back in a new room.

## 🛠️ Tech Stack
- **Rendering:** [Three.js](https://threejs.org) (WebGL). The low-poly Margos map, the battle arenas and every creature model are generated procedurally from the data, so no 3D art assets are needed yet.
- **Language/Build:** TypeScript (strict) + Vite. The UI is plain DOM and CSS (no framework) to keep it light on phones.
- **UI style:** a tabletop look built from index cards: chunky outlines, ruled-paper creature cards and animated dice. It is mobile-first, with bottom sheets on phones, centered panels on desktop, safe-area insets and landscape layouts.
- **Audio:** sound effects synthesized with Web Audio (no audio files).
- **Tests:** Vitest unit tests for the rules engine (`tests/`).

### Code map
```
src/
  data/      schema.ts (content types) · types.ts (type chart) · species.ts · roster.ts (type-combo roster table + placeholders) · moves.ts · map.ts · content.ts
  engine/    pure game rules, no DOM
             creature.ts (stats, energy, playbooks, progression) · battle.ts (combat) · world.ts (map, explore, cities, turns) · events.ts (start-of-turn events) · state.ts (save)
  render/    engine.ts (WebGL renderer) · world.ts (3D map) · land.ts (coastline math) · battle.ts (3D arena) · creatureModel.ts (procedural creatures) · trainerModel.ts (trainer minis)
  ui/        app.ts (screens & flows) · cards.ts (index cards) · dom.ts (sheets, dice, toasts) · guide.ts (How to Play guide & welcome tour) · sound.ts · settings.ts
docs/        design documents (rules source of truth) · checklists for design & art (icons, creatures, moves) · editable references (events, Arbiters, trainer styles, creature traits)
scripts/     doc generators (creature-checklist.ts, move-checklist.ts)
tests/       engine tests · server tests (online protocol) · guide tests (How to Play content) · docs tests (every event, Arbiter, arena effect, trainer style, Nature, Ability and Affinity Power documented)
```

### How the design docs map to code
| Rule (docs) | Implementation |
| --- | --- |
| 5 Initiative, move/explore/city costs, trainer styles | `engine/state.ts` → `TRAINER_STYLES`; `engine/world.ts` → `canMoveTo`, `moveCost`, `reexploreCost`, `cityActionCost`, `stableCost` |
| Explore d6 (nothing / creature / item), rarity star dice | `world.ts` → `explore`, `wildEncounter` |
| Speed order, Clash, accuracy vs Evasion, crits, type chart, status on minimum roll | `engine/battle.ts` → `resolveRound`, `useMove` |
| Move readout (what a move will roll, in order) and damage breakdowns | `engine/battle.ts` → `movePreview`, `DamageCalc` |
| Day & night: odd turns day, even turns night; species activity (diurnal / nocturnal / crepuscular, from types or by hand) filters wild spawns; day-only and night-only events; night lighting | `content.ts` → `timeOfDay`; `species.ts` → `activityFromTypes`, `ACTIVITY_OVERRIDE`, `isActive`; `world.ts` → `pickSpecies(…, time)`; `events.ts` → `time` |
| Opponent move choice: weighted random by score (wild playful → Arbiter sharp), repeat penalty; buffs/debuffs/heals scored by the matchup (foe faster → Speed, hard-hitting or sure-hit foe → Armor/Ward, hit-or-miss foe → Evasion, hurt → heals; less when stacked or when a KO is close); varied NPC playbooks that often carry one support move | `battle.ts` → `chooseAI`, `effectValue`, `AI_SHARPNESS`, `AI_REPEAT_PENALTY`, `SUPPORT_WEIGHT`; `creature.ts` → `autoPlaybook(c, varied)` |
| Camping (one creature tended per Initiative left) | `engine/world.ts` → `campNeeds`, `campTargets` |
| Health → Vitality carry-over, victor restores Health | `battle.ts` → `applyDamage`, `handleKO` |
| Stamina, Effort, Fatigue d10 check | `battle.ts` → `spendStamina`, `fatigueCheck` |
| Affinity swaps (Alpha borrows from partner) | `battle.ts` → `doSwap` |
| Energy requirements, Neutral and Prisma, 4-move playbook | `engine/creature.ts` → `fits`, `learnable`, `allocateEnergy` (which pips the editor crosses out) |
| 10 XP per level, progression chart (skill tree), Evolve / Capstone | `creature.ts` → `progressionTree`, `availableNodes`, `unlockNode`, `trainStat` |
| Totems, offerings, Recruitment Threshold | `world.ts` → `attemptRecruit`, `offeringBonus`, `bestOfferings` |
| Creature Codex: seen creatures, where to find them, effigies, filters (name, type, biome, rarity, seen/recruited) | `battle.ts` → `seenFoes`; `world.ts` → `encounterSpots`, `evolutionLine`, `speciesBiomes`, `speciesPool`, `carveTotem`; `ui/app.ts` → `codex` |
| Stables (Chanko Nabe), Markets, Shrines, Arbiters, arena tricks (favouring the Arbiter: Watson's lightning heals Electric creatures and shocks the rest; Cliff's plateau is a ring-out timer with an on-screen countdown), Tier scaling | `world.ts` + `battle.ts` → `arenaTrick`, `ringRounds`; `render/battle.ts` → `shrinkRing` |
| Swap Team: trade creatures between the active team (max 3) and totems, free in any city or town | `ui/app.ts` → `swapTile`, `rosterManager` |
| 100 turns, seasons, weather dice, endgame bracket | `world.ts` → `endTurn`, `startEndgame` |
| Start-of-turn events | `engine/events.ts` → `rollEvent`, `eventView`, `resolveEvent` |

### Interpretations & additions (open to change)
The docs leave a few points open. The prototype makes these calls:
- **Hotseat multiplayer** (title screen → 👥 Hotseat): 2–6 trainers share one browser.
  - **Setup:** each trainer is created in turn. Main colours lock as they're chosen, so no two trainers share one.
  - **Turns** go in seat order. When one trainer ends their turn, a "pass the device" screen hands over to the next, whose pending event and follower prompt then open.
  - **Shared world:** everyone shares the map (other trainers' minis stand at their nodes), the weather for each turn (rolled once, on screen, when the first trainer starts that turn, and applied to everyone; nobody rolls when ending a turn), and the one-of-each Legendaries. A Legendary beaten or held by anyone is gone for all; released, it returns for all.
  - **On screen:** a turn-order strip on the HUD shows whose turn it is. Tap a trainer’s name there to glide the map to them and light up their mini with a beam and ring in their colour (`spotlightTrainer`; `render/world.ts` → `spotlight`). This works online too, including while watching.
  - **Ending:** trainers who finish (Season Over or Champion) drop out of the rotation. When everyone is done, final standings rank them by result and Merits.
  - **Saving:** the match is saved separately from a solo journey (`state.ts` → `Match`, `nextSeat`, `takenColors`; `world.ts` → `allTrainers`).
- **Online multiplayer** (title screen → 🌐 Online; `server/index.mjs`, `src/net/online.ts`): hotseat rules, played turn by turn over the internet.
  - **Rooms:** the host opens a room and shares its 5-letter code or invite link (`?room=CODE`). Everyone creates a trainer in the lobby, with colours locked as they're picked, and the host starts the game.
  - **Turns:** only the trainer whose turn it is plays. Their browser runs the game and sends the match to the server after every move.
  - **Watching:** everyone else follows live: the trainer's token and moves, their dice and messages, and their battles round by round. While watching a battle, 🔺 Types (or T) opens the type chart for the matchup on screen. While waiting, watchers can tend their own team: unlock chart nodes, train stats and edit playbooks (🐾 My team), and look through their bag (🎒 My bag; items are used on their own turn). Each change is sent as a small edit (`engine/edits.ts` → `applyEdit`). The browser running the turn checks it with the usual rules and applies it to the shared match. If nobody is running the turn, the server holds edits until someone is.
  - **Turn notifications:** when it's your turn and the tab is in the background, a ping plays (Settings → "Turn ping"), the tab title flashes "🔔 Your turn!", and a browser notification appears if allowed.
  - **Trades and duels:** the other trainer is asked in their own browser. In a duel they also pick their creature's action each round from there, and their next creature after a knockout (within a minute, or the next in line goes in).
  - **Host controls:**
    - **Turn timer** (off, or 1–15 minutes): when it runs out, the turn ends automatically.
    - **⏭ Skip turn:** ends the current trainer's turn for them.
    - **🎮 Play for…:** takes over the current trainer's turn from the host's browser, for someone who has stepped away.
  - **Reconnecting:** a trainer who reloads or drops out rejoins with the same code and gets their seat back.
- **Hotseat interactions** (👥 Trainers on the action bar; `engine/interactions.ts`):
  - **Gifts:** send coins and items to anyone, anywhere (a courier carries them). Key items can't be given.
  - **Trades:** coins and items trade at any distance (by courier). Creatures only change hands when both trainers are on the same spot; away from each other, the button reads "🤝 Trade items" and creatures can't be offered or asked for. The other trainer accepts or declines on a "pass the device" screen. Nobody can give away their only creature.
  - **Challenges:** duel a trainer on the same spot (1 Initiative, once per opponent per turn), with an optional wager the winner takes. Both trainers command their own creatures: each round the challenger picks, then the challenged trainer picks in secret (hotseat: the device is passed over and back; online: in their own browser, within a minute or their creature acts on instinct). After a knockout, the challenged trainer also picks which creature goes in next. Both sides earn trainer-battle XP. A fully knocked-out team is helped home to rest, without losing coins.
  - **Notes:** each trainer finds notes about gifts, trades and duels in a "While you were away" note at the start of their turn.
- **How to Play** (title screen, or ☰ Menu; content in `ui/guide.ts`): a guide with category tabs (Basics, Creatures, Battles, Places, Multiplayer, You & saves). Each category has topic tabs and Previous/Next links. A new journey or hotseat game opens a short welcome tour instead: five cards on the goal, a turn, creatures, getting stronger, and where to find the full guide. It has Skip, Back and Next.
- **Save management** (title screen → 💾 Saves; `state.ts` → `saveCopy`, `restoreCopy`, `listCopies`):
  - **Autosaves:** the solo journey, the hotseat game and the online game (the last state this browser saw) each autosave to their own slot. Each one can be continued, exported (a .json download) or deleted separately.
  - **Saved copies:** 📌 Save a copy (on the Saves screen, or ☰ Menu while playing) keeps a named snapshot of any solo, hotseat or online game. Up to 30 are kept in this browser. Each can be loaded back into its slot (after a confirm, since it replaces the game in progress there), exported, renamed or deleted. Loading an online copy brings it back as your saved online game; reopen it as host from 🌐 Online.
  - **Import:** an imported .json file goes into the saved copies, sorted by kind (online files keep their seat owners).
  - **Safety:** starting a new solo or hotseat game warns before replacing the one in progress, and Abandon Journey only deletes the game you're playing.
- **Trainer styles** (chosen at the start; eight, each with a perk and a drawback):

  | Style | Perk | Drawback |
  | --- | --- | --- |
  | ⚖️ Wanderer | Every city's stable counts as home: the doubled home Chanko Nabe anywhere | None |
  | 🌲 Ranger | Up to Tier times a turn, an explore that finds Nothing refunds 1 Initiative (once at Tier 1, twice at Tier 2 …) | City actions cost +1 Initiative |
  | 🏙️ Urbanite | City actions cost no Initiative | Re-exploring costs 2 Initiative |
  | 🤝 Beast Whisperer | +1 to every recruitment roll | Trainer battles pay half the coins (Arbiters pay in full) |
  | 💰 Merchant | Markets 25% off (stacks with Baby Eyes), and +25% on every coin earned: prizes, finds, sales, events (at least +1) | −1 to every recruitment roll |
  | 🎖️ Battle Master | +2 XP per creature in every battle, win or lose | Totem creatures lose Morale every 5 turns, not 10 |
  | 💞 Caretaker | Camping tends 2 creatures per Initiative; stables give +1 extra Morale | −1 XP per creature per battle (min 1) |
  | 🧭 Pathfinder | First move each turn is free (doesn't stack with Trailblazer) | Stables cost +1 Initiative |
- **Encounter scaling** follows Trainer Tier. Starters begin at Lv 1 with an untouched chart. Wild and roaming-trainer levels sit around 2 × Tier − 1 (1, 3, 5, 7, 9: under that Tier's Arbiter), and a node's level shifts them by −1 to +2, so Tier 1 wilds are mostly Lv 1–2. Tier 1 can't roll Apex wilds. Tiers 3–4 roll one extra rarity die and Tier 5 rolls two. Roaming trainers bring more Prime/Apex creatures and bigger teams at higher Tiers (`world.ts` → `baseWildLevel`, `tierRarityDice`).
- **Energy** is generated at 2× the base formula (stage-1 Commons make 6), and energy/Prisma nodes on the progression chart grant +2. This leaves room for real playbook trade-offs against move costs of 1–5 (`species.ts` → `ENERGY_SCALE`, `creature.ts` → `NODE_ENERGY`).
- **Camping** (on wild nodes) ends the turn and spends all remaining Initiative. Each point tends one creature of your choice: it recovers all Vitality and clears Fatigue. KO'd and fully rested creatures can't be picked. The picker highlights the hearts each creature will get back. With 0 Initiative left, camping does nothing, so it's never free end-of-turn healing (`world.ts` → `campTargets`).
- **Attack grid** (`moves.ts`): every typed energy cost from 1 to 5 has an elemental attack. Single-type attacks run 1–5 of one type. Dual-type attacks cover any split totalling 5 or less (1 Fire + 1 Water, 2 Fire + 1 Water, …). An uneven split hits as the type it spends more of. Even splits (1+1, 2+2) get one attack per type, so 2 Fire + 2 Grass exists as both a Fire and a Grass attack. That's 376 slots, and every type leads exactly 47 attacks. Hand-made attacks fill 24 and generated placeholders (`atk-…` ids, `placeholder: true`) fill the rest (see docs/05).
- **Signature moves**: the ★ chart node names its move with a short summary (e.g. "Learn Riptide (d8 Water attack)"). The chart's back shows the full move card until it's learned. The playbook editor lists it at the end, greyed out with a 🔒 note to unlock it from the chart.
- **Playbook editor**: type filters (dual attacks appear under both types, plus Physical and Support), sorting (cost, damage, speed, type, name) and an "only moves that still fit" toggle. Your current picks stay pinned at the top. **Recommend moves?** offers four goals: optimize physical power, elemental power, a balanced spread, or against a chosen type. The goal that suits the creature's stats gets a ★: a Power or Focus lead of 2+ points one way, otherwise balanced. Each goal shows its best 4-move set, with expected damage per move, and **Confirm playbook?** applies it (`creature.ts` → `recommendPlaybook`, `suggestGoal`, `expectedDamage`).
- **Type chart** (Menu → Type Chart, or 🔺 Types / T in battle): a stacked list with one coloured pill per type, what it's strong against on the left and what it's weak to on the right. Matchups mirror (a type resists exactly what it's strong against), so each side is a single row. In battle, your move types are highlighted gold and the foe's blue, and the live matchups are ringed (`cards.ts` → `typeChart`).
- **Move readouts**: in battle, tapping a move first shows what it will do, step by step in resolution order:
  - turn order (your Speed with the move's modifier vs the foe's)
  - Fatigue and Shock checks
  - the Stamina cost
  - accuracy (die, the Evasion it must beat, hit chance, crit rule)
  - damage (e.g. `d6 + Power 3 − foe Armor 1`, the type multiplier and the resulting range)
  - the status chance and other effects

  You then confirm (Enter) or go back (Esc). As the round plays out, each roll is captioned: the accuracy roll against Evasion, and the damage die with its full sum. The **Fast battles** setting skips the readout and the damage dice and keeps the old quick pace (`battle.ts` → `movePreview`, `DamageCalc`).
- **Trainer look**: when starting a journey, and any time from Menu → Trainer Look, you choose a top (long shirt, tee, pouch jacket, long coat, vest), a hat (cap, wide brim, beanie, none), a hair style (short, ponytail, streak, spiky, long, bald), skin tone, hair colour and pants colour, with a live preview. Your main colour always goes on the top, the hat, the ponytail tie or hair streak, and the token's base. The same mini is your token on the map and stands behind you in trainer battles (`render/trainerModel.ts` → `playerLook`; saved as `trainer.look`, and older saves get a look derived from the name).
- **Trainer battles pay more XP**: every creature that fights a trainer, Arbiter or Champion gets +3 XP on top of its participation XP, win or lose. It stacks with knockout XP (`creature.ts` → `TRAINER_BATTLE_XP_BONUS`).
- **Trainer Halls**: every city has one. For a city action's Initiative you can battle a local trainer once per city per turn. City trainers are 1 level above the wild band, lean toward the city's type, and bring 2 creatures (3 from Tier 3). Normal trainer stakes apply: coins if you win, a few coins lost if you lose (`world.ts` → `hallBattle`, `hallBlock`).
- **Research Facility** (Quillhaven, a new town between Ridgeway and Saltmarsh Landing): release a recruited creature for its level × 2 (Common), 3 (Prime), 4 (Apex) or 5 (Legendary) coins. You can't release your last creature or your only active one (`world.ts` → `releaseToResearch`, `researchPayout`).
- **Battle School** (Valor Ridge, a new town between Mistfall and Thunder Spike): pay coins and leave a creature to earn 1 XP per coin, at 2 XP a turn. You're notified when it finishes; pick it up any time, early pick-ups keeping the XP so far. On pick-up, a d6 rolls its mood: 1–2 −2 Morale and −1 Loyalty, 5–6 +2 Morale and +1 Loyalty (`world.ts` → `enrollTraining`, `trainingProgress`, `pickUpTraining`; saved as `training`).
- **Explore the Depths** (Shifting Depths, a dead-end town at the bottom of Houndmouth Canyon, down the Sinkhole Stair; `world.ts` → `exploreDepths`, `depthsSpecies`): for 1 Initiative plus one offering material, a wild creature that craves it comes up to battle. It has one of the material's types (stronger allure, likelier type), with rarity rolled as at the Sinkhole Stair, a rare area, and that node's level. It has already accepted the offering, so the material's bonus counts toward recruiting it, on top of up to two more offerings. The town market sells Canyon Ochre and Ember Charcoal.
- **Legendary spots** (`map.ts`, `kind: 'legendary'`): seven across the map. In the north: Sunspire Summit (Solstara: Tier 3 and a Summit Pick), Ironwake Shoals (Thalassor: Tier 4, by Sail) and Cloud Island's Eye of the Sky (Nimbalune: after Salem). In the centre and south: Willowheart Isle (central lakes, off Willow Lake, Tier 2, Grass/Water), Dunecrown Mesa (desert past Dustmere, Tier 3, Electric/Rock), Boglight Hollow (swamps past Mangrove Port, Tier 3, Water/Charm) and Caldera Heart (southern tip of Kilauea island, Tier 4, Fire/Steel). Each is on a short branch path. The centre and south ones hold roster placeholder Legendaries until those slots are designed.
- **One of each Legendary per game**: a Legendary is at its node only while it hasn't been beaten and no trainer holds it. Releasing one at the Research Facility returns it to its node to be challenged again (`world.ts` → `legendaryHere`).
- **Morale & Loyalty** (`creature.ts` → `MORALE_HIGH`, `MORALE_LOW`, `addLoyalty`; `world.ts` → `moraleAndLoyalty`):
  - High Morale (7+) earns +1 Loyalty each turn.
  - Loyalty unlocks Nature perks at their thresholds, permanently. It's no longer spent.
  - Low Morale (≤3) gives a warning. After that, each turn ending without a Morale gain rolls a d10 against Loyalty: above it, the creature leaves; otherwise it loses 1 Loyalty.
  - A creature never leaves if it's your only one.
  - Legendaries arrive with 10 Loyalty and lose 1 every turn whatever their Morale. At 0 they return to their grounds on the map (`LEGENDARY_START_LOYALTY`, `LEGENDARY_LOYALTY_DRAIN`), so releasing them at the Research Facility first, or letting them cycle back, is routine.
  - Tapping or hovering the Morale/Loyalty chips on a card explains all of this. The team strip flags unhappy creatures with ⚠️.
- **Follower prompt**: at the start of each turn (after the weather and any event), a sheet shows who is following you, with Ability, Affinity, Morale and Loyalty. It lists the other creatures you could switch to. It appears when there's a choice: more than one healthy creature, or nobody following. Turn it off in Settings → "Choose a follower each turn". The HUD's Following chip opens the same sheet any time.
- **Battle lead**: your Following creature always leads. If nobody healthy is Following and more than one creature can fight, you choose the lead before round 1 (`world.ts` → `needsLeadChoice`, `battle.ts` → `chooseLead`).
- **Keen Nose** (overworld ability): when an explore turns up an item, the follower sniffs out three different finds and you keep one (`world.ts` → `discoverItem`, `claimFind`).
- **Running** from wild battles: d6 + (your Speed − foe Speed) ≥ 4. Followers with Quick Step always escape, and an escape with Quick Step gives back 1 Initiative (up to 5; `QUICK_STEP_REFUND`, `finishBattle`). On the Forest Floor running needs 7+ instead of 4+.
- **Trainer encounters**: on road and meadow nodes, a 3–4 explore roll may be a wandering trainer instead of a wild creature (prize: d6 coins).
- **Statuses**, one per type: Burn, Soak, Shock, Snare, Stagger, Sunder, Beguile, Daze. A creature holds one status at a time. It lasts 3 rounds, counted only while that creature is in battle, and ends on a KO or when the battle ends. The in-game Menu → Status Effects lists exactly what each does (`moves.ts` → `STATUS_INFO`, `STATUS_FOR`).
- **Creature Codex** (the docs' creature catalogue): a species is "seen" once it takes the field against you, whether wild, trainer, Arbiter or legendary. Bench creatures that never come out stay unseen. Effigies can only be carved for seen species. Each Codex page lists the wild nodes whose biome pool can produce the species or its earlier stages (weather boosts aside), and its best offering materials.
  - **Browsing:** the Codex (☰ Menu) shows seen and recruited counts with a progress bar. You can search by name (unseen names stay hidden) and filter by type (either half of a dual type), biome, rarity and status (seen, recruited, not seen yet). It sorts by Codex order, name, rarity or type. Filters are remembered while the game is open.
- **Offerings**: a material's bonus is its highest `allure` value among the creature's types. Berries give +1 (Moonberry +2) to anyone. Up to 2 offerings go with each totem.
- **Roster table** (`roster.ts`): one slot per type and dual-type combination (36). Each slot has Common, Prime and Apex three-stage families plus a Legendary. The eight starter lines, Solstara, Thalassor and Nimbalune fill their slots. The other 333 are generated **placeholders** (`ph-…` ids, `placeholder: true`), to be swapped for real designs one slot at a time (see docs/05). Placeholder Legendaries without a Legendary spot aren't on the map yet (four of them now are: see Legendary spots).
- **Battle plates** lead with Vitality hearts (what actually decides a KO), with the Health bar below. A 🗿 badge marks wild species you've already recruited.
- **Start-of-turn events** (an addition, not in the design docs): from the second round on, each trainer's turn starts with one event, rolled right after the weather (in hotseat, after the round's shared weather roll; solo and hotseat work the same way) (`EVENT_CHANCE` = 1 for playtesting; never the same one twice in a row). The pending event is saved, so it survives a reload. Closing its window never declines it: a pulsing pill at the bottom of the map reopens it, and the turn can't end until the player picks a choice (including an explicit decline). There are 24:

  | Event | What it offers |
  | --- | --- |
  | 🧳 Roaming Trader | Swap one of your creatures for theirs (fixed species and Nature, shown on the event so you can inspect its card). It arrives at the level of the one you give, with its chart points unspent. A before/after stat comparison is shown before you confirm. |
  | 🩺 Creature Caretaker | Change a creature's Nature to one of 3 offered (keeps its unlocked perk count). A before/after stat comparison is shown before you confirm. |
  | 🍲 Wandering Cook | 4 coins: active team restores Vitality and Health and clears Fatigue |
  | 🥺 A Lost Creature | Adopt a common creature (a level under the Tier band), or guide it home for +1 Morale |
  | 🐫 Merchant Caravan | An Elixir, Moonberry, Star Charm or Lure Incense at half price |
  | ⛈️ Sudden Storm | Must choose: −1 Initiative, or −1 Vitality for each active creature |
  | 🥋 Sparring Master | 5 coins: +10 XP for one creature |
  | 🔮 Fortune Teller | 3 coins: +1 rarity die on the next encounter |
  | 🧺 Windfall | Two free offering materials from the local biome |
  | 🤺 Rival Challenge | Optional trainer battle, one level above the local wilds |
  | 📜 Wise Hermit | 8 coins: one free progression point |
  | 🦝 Pickpocket | Must choose: chase (d6 + follower Speed ≥ 7 wins d6 coins, else lose d6), or lose 3 coins |
  | 🙏 Passing Pilgrim | A free Type Totem for one of your team's types |
  | ♨️ Hidden Hot Spring | 1 Initiative: everyone clears Fatigue, refills Stamina, +1 Morale |
  | 🎲 Dice Gambler | Bet 5 or 10 coins: your d6 vs theirs; higher doubles the stake, a tie keeps it |
  | 🪕 Traveling Bard | Free: active team +1 Morale. 3 coins: everyone +1 Morale and the follower +1 Loyalty |
  | 🧓 Old Trainer's Advice | 1 Initiative: one creature +5 XP |
  | 🧭 Local Guide | 3 coins: +1 Initiative this turn |
  | 😾 Team Squabble | Forced: side with one creature (+2 / −1 Morale) or spend 1 Initiative to calm both (+1 each) |
  | 🔍 Codex Scholar | Adds up to 2 unseen local species to your Codex (so their Effigies can be carved), or pays 3 coins if you've seen them all |
  | 🎒 Lost Satchel | Keep the coins (follower −1 Morale) or return it for a Calm Tea and +1 Morale |
  | 🌠 Shooting Star | Wish for a Star Charm, or +1 Morale for everyone |
  | 🤢 Bad Berries | Forced: use a Salve, spend 1 Initiative (+1 Morale), or take −1 Vitality and −1 Morale |
  | 🧒 Eager Apprentice | One creature runs a drill: +3 XP, +1 Morale, and a 2-coin tip |

  Each event is one entry in `EVENTS` with `create` (random params), `view` (text and choices) and `resolve` (the effect), so new ones are easy to add.
- **Map size** (`map.ts` → `MAP_SCALE`, currently 1.75): every route between towns, cities, the Stadium and Amber's arena has 3–5 wild nodes (126 nodes in all). Hub positions, route bends, Cloud Island, the terrain, coastline noise, camera limits, shadows, water and sky all scale with `MAP_SCALE`, so the map keeps its shape at any size. **Wild node ids stay stable for saves:** the original nodes are `w1`–`w44` in route order, and nodes added when the map grew are `n1`, `n2` …. New nodes are added with the `added(…)` helper at the end of a route or of the routes list, so no existing id shifts.
- **Kilauea Forge** (Fire) is a mainland city on the southwest volcanic coast, linked to Houndmouth Canyon and Dustmere by new volcanic routes, so Fire is a valid home city. Only Amber's arena, **Amber's Fire Pit**, is on Kilauea island, reached by ferry from the Forge or Mangrove Port (Ferry Pass, sold at Saltmarsh Landing and the Forge, or Sail). A city can now keep its arena on a separate `arena` map node (`City.arenaNode`, `world.ts` → `arbiterHere`). New wild nodes were appended to the route list so existing saves keep their node ids.
- **Trainer minis**: in battles against trainers, Arbiters and Champions, both trainers stand as tabletop minis on the far edge of the arena and hop when they send out a creature. The player's mini wears their chosen color. Arbiters wear their type's color, a gold circlet and cape, with their type emblem floating above. Roaming trainers are dressed by title (Hikers get wide hats and packs, Drifters hoods…), with colors seeded from their name so each always looks the same. Wild battles show no minis (`render/trainerModel.ts`).
- **Battle XP**: every creature that took part earns participation XP when the battle ends, **win or lose** (KO'd ones too): `3 + (toughest foe level − its level)`, clamped to 1–5. The creature that knocks out an opponent also gets a KO bonus right away: `5 + 2 × (foe level − its level)`, clamped to 2–10. Running away earns nothing (`creature.ts` → `participationXp`, `xpForWin`; `battle.ts` → `awardBattleXp`).
- **Town stables** fully recover the team (KOs, Vitality, Fatigue) and give +1 Morale for the same Initiative as a city action, but serve no Chanko Nabe buff. That stays a city specialty (`world.ts` → `rest`).
- **Progression charts are skill trees.** Each node lists the nodes linked above it (`requires`), and all of them must be bought first. Evolving takes the center path: best stat → +2 energy **and** +1 Health → second stat → +1 Vitality → Evolve (6 points). The side branches (Signature → Movement, Speed → Stamina) are optional, and any you skip are left behind when the creature evolves. At the final stage, the Capstone needs both the Vitality and Stamina branches (8 points), and a +2 Prisma node hangs off the Movement branch. Once a final-stage chart is complete, each further level-up point trains +1 to a stat of the player’s choice (`trainStat`), so a level-up badge can always be cleared.
- **Saves** carry a `version` (currently 3). Older saves are migrated on load (`state.ts` → `migrate`): v1 → v2 doubles energy earned from chart nodes; v2 → v3 renames bought chart nodes to their skill-tree ids and keeps every earned bonus.
- **Cloud Island** (`map.ts` → `CLOUD_RING`, `CLOUD_EYE`; `world.ts` → `portalOpen`, `stepCloudLap`): a portal in Aurora Peak opens at night (and all Winter) to a ring of six cloud wilds off the north-west coast. A full lap (6 steps the same way round, over any number of turns, without leaving) earns a match with Salem. Every step onto the island costs +1 Initiative per Tier (capped at 5), and items found there wait in a Cloud satchel until the trainer escapes (portal or Fly); a team wipe loses them. The island is cotton-candy pink and purple with dark purple spires, and midnight-plum paths and node tiles so the route stands out. The rules (with the trainer's live status) show in a prompt before stepping through the portal, and on the island a ☁️ HUD chip shows the lap, the satchel and the portal, and opens the rules (`cloudRules`, `cloudPrompt` in `app.ts`). The island has universal offerings (Cloud Silk +1, Stardust +2, Moonbow Prism +3 for any creature) and its own events. After Salem, bridges open to the Eye of the Sky, where the Legendary Nimbalune (Water/Astral) waits. In Winter, Aurora Peak is always under Aurora Night.
- **The Forest Floor** (`map.ts` → `FOREST_FLOOR`; `world.ts` → `exploreFloor`, `trailProgress`): Dahlia's arena hides on a single dark node below Gloomshade, reached by rope with a Canopy Rope. Exploring it rolls a d8: 1–2 nothing (−1 Morale for the active team), 3–4 a wild night creature (running needs 7+ unless Quick Step), 5–6 an exotic find (Duskberry, Root Salve, Heartwood Resin, Glowcap), 7–8 a sign of Dahlia's Trail. 3 + Tier signs reveal her arena. Leaving by choice or defeat loses the trail. Once she's beaten, the die drops to a d6 (the same table without the trail). Only its five hostile, forced events happen there. There's a rules prompt before climbing down, and a HUD chip while there.
- **Iron Coast Gauntlet** (`world.ts` → `gauntletBattle`, `gauntletWin`; `state.ts` → `moveTrainer`): before Stella will battle, a trainer must beat 2 local trainers per Tier (2, 4, 6, 8, 10). They're Steel-leaning, one level above Trainer Hall opponents, and the last one is a level higher still. Matches can be spread over turns, with Stable rests in between, as long as the trainer stays in Iron Coast. Leaving (travel, Fly, or being sent home) resets the count; a lost match doesn't. Once cleared, Stella can be challenged at any time.
- **Arbiter gates** follow the city lore: Salem needs a full lap of Cloud Island, Fabian must be found in disguise, Dahlia must be found on the Forest Floor by following her trail (the climb down needs a Canopy Rope, sold in a random town each game), Stella needs the Iron Coast Gauntlet cleared, and Katy needs a Root Whistle (also in a random town each game, different from the rope's) or a creature that can Sail. Notice Boards and the arena hints name this season's towns (`state.ts` → `rollKeyTowns`, `keyTownOf`; `map.ts` → `KEY_ITEM_TOWNS`).

## 📂 Documentation Guide for Developers
To build out this game, please review the core design documents located in the `/docs` directory:
1. **[Core Architecture (`/docs/01-core-architecture.md`)](./docs/01-core-architecture.md):** Action economy (5 actions per turn), map traversal, explore mechanics, trainer abilities, weather effects, city actions, starter creatures, creature natures and abilities.
2. **[Board & Map (`/docs/02-board-and-map.md`)](./docs/02-board-and-map.md):** The 8-region National Park map layout, city hubs, and type associations. Special traversal mechanics (dig, fly, sail, teleport). Actual map in progress.
3. **[Combat Rules (`/docs/03-combat-rules.md`)](./docs/03-combat-rules.md):** Combat rules and structure outlined. The 8-type matrix, effectiveness and resistances. Creature attributes and stat formulas (Vigor, Stamina, Power, Focus, Speed, Armor, Ward, Morale).
4. **[Trainer Progression (`/docs/04-trainer-progression.md`)](./docs/04-trainer-progression.md):** Seasonal 100-turn cycle, weather changing with seasons. Creature experience points and node-based leveling, Arbiter tiers, Accolades, and the Turns 101+ Endgame Gauntlet.
5. **[Data Schemas (`/docs/05-data-schemas.md`)](./docs/05-data-schemas.md):** JSON templates for creatures, creature instances, moves, map nodes and items, matching `src/data/schema.ts`. The example content lives in `src/data/`.
6. **[Assets (`/docs/06-assets.md`)](./docs/06-assets.md):** Dumping art assets for future use. Maps, creatures, etc.
7. **[Icon Checklist (`/docs/07-icon-checklist.md`)](./docs/07-icon-checklist.md):** The game logo and app icon still to make, then every emoji placeholder in the game, grouped by where it appears, as a checklist for the art team to replace with custom icons (271 items, plus emoji that need splitting into separate icons).
8. **[Creature Checklist (`/docs/08-creature-checklist.md`)](./docs/08-creature-checklist.md):** Every creature in the game, slot by slot (type combination → Common, Prime and Apex families plus a Legendary), marking the 333 generated placeholders still to design and draw, with Design and Art checkboxes for each. Generated from the game data: regenerate with `npm run docs:creatures`.
9. **[Move Checklist (`/docs/09-move-checklist.md`)](./docs/09-move-checklist.md):** Every move in the game (401) with its cost, damage, average damage, accuracy, speed, effort, status and effects. It marks the 352 generated attack-grid placeholders still to design, has Design and Balance checkboxes for each move, and gives the placeholder formula as a balance baseline, plus a watch list of hand-made moves that stand out from it. Generated from the game data: regenerate with `npm run docs:moves`.
10. **[Events (`/docs/10-events.md`)](./docs/10-events.md):** Every start-of-turn event: an overview table (weight, odds, conditions, forced or not, cost), a card per event with each choice and its exact outcome, step-by-step instructions and a template for adding new events, and an ideas backlog. A test fails if an event in the game is missing from this doc.
11. **[Arbiters & Arenas (`/docs/11-arbiters-and-arenas.md`)](./docs/11-arbiters-and-arenas.md):** All 8 Arbiters and their arena effects: how challenges, Tier scaling, teams and rewards work, exact numbers for every arena effect at each Tier, a card per Arbiter (type, arena, access condition, effect, hot pot), balance notes to review, templates for changing or adding Arbiters and arena effects, and an ideas backlog. A test fails if an Arbiter or arena effect is missing from this doc.
12. **[Trainer Styles (`/docs/12-trainer-styles.md`)](./docs/12-trainer-styles.md):** The 8 trainer abilities picked at the start of a game: overview tables (what each style touches, Initiative costs at a glance), a card per style with its exact rules, interactions and balance notes, where each rule lives in the code, a template for new styles, and an ideas backlog. A test fails if a style is missing from this doc.
13. **[Natures, Abilities & Affinity Powers (`/docs/13-natures-and-abilities.md`)](./docs/13-natures-and-abilities.md):** The traits on every creature card. Natures (up and down stats, perks unlocked at 3, 6 and 10 Loyalty), overworld Abilities (exact rules, interactions with trainer styles and items, how many creatures have each) and swap-in Affinity Powers (exact effects and the bond bonus). Includes balance notes, templates for new traits, build steps and an ideas backlog. A test fails if a trait is missing from this doc.
---

## 🚀 Development Roadmap & Scope
- **Phase 1:** ✅ Core game loop, map movement UI, and state management.
- **Phase 2:** ✅ Combat engine, energy pool generation, and modular custom move execution.
- **Phase 3:** ✅ Arbiter challenge system, seasonal weather mechanics, and progression tracking.
- **Phase 4:** 🟡 Content integration. Example creatures, moves and the map are in place; replace them with the final creature database and Master Move List (see `docs/05-data-schemas.md`).
- **Phase 5:** 🟡 Systems depth. Done: start-of-turn events, the full 36-slot roster table and the 376-slot attack grid (placeholders), move readouts with explained rolls, Initiative-based camping, the stacked type chart, skill-tree progression charts, the Creature Codex, tier-scaled encounters, participation XP, town stables, in-battle type matchups, trainer minis and customisation, Morale & Loyalty rules (with Legendary Loyalty drain and one-of-each Legendaries), the Research Facility (Quillhaven), the Battle School (Valor Ridge), city Trainer Halls with a trainer-battle XP bonus, the start-of-turn follower prompt, eight trainer styles, 24 start-of-turn events, Keen Nose's pick-one-of-three finds, save management (export/import, plus a library of named saved copies for solo, hotseat and online games), hotseat multiplayer for 2–6 trainers (shared weather and Legendaries, gifts, trades and duels), a bigger map (3–5 wild nodes on every route between towns, same shape) with four new Legendary spots in the centre and south, online turn-based multiplayer with live spectating, turn pings, a host turn timer and skip / play-for controls (Render-ready), two-player duel control (moves and KO replacements), tending your team and checking your bag while others play online, a find-a-trainer spotlight on the turn-order strip, free Swap Team in every city and town, stat training once a final-stage chart is complete, a livelier opponent AI (weighted move choice, repeat penalty, varied playbooks and situational buffs/debuffs), a type chart for online spectators, long-distance coin and item trades (creatures and duels still need the same spot), named saved copies for every game mode, the town of Shifting Depths with Explore the Depths (offer a material, battle a creature that craves it), a searchable, filterable Creature Codex, a day and night cycle (nocturnal and diurnal creatures, day and night events), the Forest Floor (Dahlia's trail in the dark), Cloud Island (Salem's new trial, universal offerings, island events and the Legendary Nimbalune), the Iron Coast Gauntlet for Stella, and How to Play as a tabbed guide (categories and topics) plus a short welcome tour at the start of a journey. Next: balance passes from playtesting (event prices, XP rates, evolution costs).
- **Next:** creature art to replace the procedural models, persistent online rooms, dual battles, and a map editor.
