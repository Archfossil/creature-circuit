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
```

The game runs in any modern desktop or mobile browser that supports WebGL. It saves to `localStorage` automatically. It can be installed as a PWA ("Add to Home Screen"), and the production build works offline.

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
             creature.ts (stats, energy, playbooks, progression) · battle.ts (combat) · world.ts (map, explore, cities, turns) · events.ts (end-of-turn events) · state.ts (save)
  render/    engine.ts (WebGL renderer) · world.ts (3D map) · land.ts (coastline math) · battle.ts (3D arena) · creatureModel.ts (procedural creatures) · trainerModel.ts (trainer minis)
  ui/        app.ts (screens & flows) · cards.ts (index cards) · dom.ts (sheets, dice, toasts) · sound.ts · settings.ts
docs/        design documents (rules source of truth)
tests/       engine tests
```

### How the design docs map to code
| Rule (docs) | Implementation |
| --- | --- |
| 5 Initiative, move/explore/city costs, trainer styles | `engine/world.ts` → `canMoveTo`, `reexploreCost`, `cityActionCost` |
| Explore d6 (nothing / creature / item), rarity star dice | `world.ts` → `explore`, `wildEncounter` |
| Speed order, Clash, accuracy vs Evasion, crits, type chart, status on minimum roll | `engine/battle.ts` → `resolveRound`, `useMove` |
| Move readout (what a move will roll, in order) and damage breakdowns | `engine/battle.ts` → `movePreview`, `DamageCalc` |
| Camping (one creature tended per Initiative left) | `engine/world.ts` → `campNeeds`, `campTargets` |
| Health → Vitality carry-over, victor restores Health | `battle.ts` → `applyDamage`, `handleKO` |
| Stamina, Effort, Fatigue d10 check | `battle.ts` → `spendStamina`, `fatigueCheck` |
| Affinity swaps (Alpha borrows from partner) | `battle.ts` → `doSwap` |
| Energy requirements, Neutral and Prisma, 4-move playbook | `engine/creature.ts` → `fits`, `learnable`, `allocateEnergy` (which pips the editor crosses out) |
| 10 XP per level, progression chart (skill tree), Evolve / Capstone | `creature.ts` → `progressionTree`, `availableNodes`, `unlockNode` |
| Totems, offerings, Recruitment Threshold | `world.ts` → `attemptRecruit`, `offeringBonus`, `bestOfferings` |
| Creature Codex: seen creatures, where to find them, effigies | `battle.ts` → `seenFoes`; `world.ts` → `encounterSpots`, `evolutionLine`, `speciesPool`, `carveTotem` |
| Stables (Chanko Nabe), Markets, Shrines, Arbiters, arena tricks, Tier scaling | `world.ts` + `battle.ts` → `arenaTrick` |
| 100 turns, seasons, weather dice, endgame bracket | `world.ts` → `endTurn`, `startEndgame` |
| End-of-turn events | `engine/events.ts` → `rollEvent`, `eventView`, `resolveEvent` |

### Interpretations & additions (open to change)
The docs leave a few points open. The prototype makes these calls:
- **Wild-at-heart (nature) trainers** get their *first* re-explore each turn free, so re-exploring can't be repeated endlessly.
- **Encounter scaling** follows Trainer Tier. Wild and roaming-trainer levels sit around 2 × Tier (just under that Tier's Arbiter), and a node's level shifts them by −1 to +2. Tier 1 can't roll Apex wilds. Tiers 3–4 roll one extra rarity die and Tier 5 rolls two. Roaming trainers bring more Prime/Apex creatures and bigger teams at higher Tiers (`world.ts` → `baseWildLevel`, `tierRarityDice`).
- **Energy** is generated at 2× the base formula (stage-1 Commons make 6), and energy/Prisma nodes on the progression chart grant +2. This leaves room for real playbook trade-offs against move costs of 1–5 (`species.ts` → `ENERGY_SCALE`, `creature.ts` → `NODE_ENERGY`).
- **Camping** (on wild nodes) ends the turn and spends all remaining Initiative. Each point tends one creature of your choice: it recovers all Vitality and clears Fatigue. KO'd and fully rested creatures can't be picked. The picker highlights the hearts each creature will get back. With 0 Initiative left, camping does nothing, so it's never free end-of-turn healing (`world.ts` → `campTargets`).
- **Type chart** (Menu → Type Chart, or 🔺 Types / T in battle): a stacked list with one coloured pill per type, what it's strong against on the left and what it's weak to on the right. Matchups mirror (a type resists exactly what it's strong against), so each side is a single row. In battle, your move types are highlighted gold and the foe's blue, and the live matchups are ringed (`cards.ts` → `typeChart`).
- **Move readouts**: in battle, tapping a move first shows what it will do, step by step in resolution order:
  - turn order (your Speed with the move's modifier vs the foe's)
  - Fatigue and Shock checks
  - the Stamina cost
  - accuracy (die, the Evasion it must beat, hit chance, crit rule)
  - damage (e.g. `d6 + Power 3 − foe Armor 1`, the type multiplier and the resulting range)
  - the status chance and other effects

  You then confirm (Enter) or go back (Esc). As the round plays out, each roll is captioned: the accuracy roll against Evasion, and the damage die with its full sum. The **Fast battles** setting skips the readout and the damage dice and keeps the old quick pace (`battle.ts` → `movePreview`, `DamageCalc`).
- **Running** from wild battles: d6 + (your Speed − foe Speed) ≥ 4. Followers with Quick Step always escape.
- **Trainer encounters**: on road and meadow nodes, a 3–4 explore roll may be a wandering trainer instead of a wild creature (prize: d6 coins).
- **Statuses**, one per type: Burn, Soak, Shock, Snare, Stagger, Sunder, Beguile, Daze. A creature holds one status at a time. It lasts 3 rounds, counted only while that creature is in battle, and ends on a KO or when the battle ends. The in-game Menu → Status Effects lists exactly what each does (`moves.ts` → `STATUS_INFO`, `STATUS_FOR`).
- **Creature Codex** (the docs' creature catalogue): a species is "seen" once it takes the field against you, whether wild, trainer, Arbiter or legendary. Bench creatures that never come out stay unseen. Effigies can only be carved for seen species. Each Codex page lists the wild nodes whose biome pool can produce the species or its earlier stages (weather boosts aside), and its best offering materials.
- **Offerings**: a material's bonus is its highest `allure` value among the creature's types. Berries give +1 (Moonberry +2) to anyone. Up to 2 offerings go with each totem.
- **Roster table** (`roster.ts`): one slot per type and dual-type combination (36). Each slot has Common, Prime and Apex three-stage families plus a Legendary. The eight starter lines, Solstara and Thalassor fill their slots. The other 334 are generated **placeholders** (`ph-…` ids, `placeholder: true`), to be swapped for real designs one slot at a time (see docs/05). Placeholder Legendaries aren't on the map yet.
- **Battle plates** lead with Vitality hearts (what actually decides a KO), with the Health bar below. A 🗿 badge marks wild species you've already recruited.
- **End-of-turn events** (an addition, not in the design docs): after each turn's weather roll, one event is rolled (`EVENT_CHANCE` = 1 for playtesting; never the same one twice in a row). The pending event is saved, so it survives a reload. Closing its window never declines it: a pulsing pill at the bottom of the map reopens it, and the turn can't end until the player picks a choice (including an explicit decline). There are 14 to start:

  | Event | What it offers |
  | --- | --- |
  | 🧳 Roaming Trader | Swap one of your creatures for theirs, made at the same level |
  | 🩺 Creature Caretaker | Change a creature's Nature to one of 3 offered (keeps its unlocked perk count) |
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

  Each event is one entry in `EVENTS` with `create` (random params), `view` (text and choices) and `resolve` (the effect), so new ones are easy to add.
- **Kilauea Forge** (Fire) is a mainland city on the southwest volcanic coast, linked to Houndmouth Canyon and Dustmere by new volcanic routes, so Fire is a valid home city. Only Amber's arena, **Amber's Fire Pit**, is on Kilauea island, reached by ferry from the Forge or Mangrove Port (Ferry Pass, sold at Saltmarsh Landing and the Forge, or Sail). A city can now keep its arena on a separate `arena` map node (`City.arenaNode`, `world.ts` → `arbiterHere`). New wild nodes were appended to the route list so existing saves keep their node ids.
- **Trainer minis**: in battles against trainers, Arbiters and Champions, both trainers stand as tabletop minis on the far edge of the arena and hop when they send out a creature. The player's mini wears their chosen color. Arbiters wear their type's color, a gold circlet and cape, with their type emblem floating above. Roaming trainers are dressed by title (Hikers get wide hats and packs, Drifters hoods…), with colors seeded from their name so each always looks the same. Wild battles show no minis (`render/trainerModel.ts`).
- **Battle XP**: every creature that took part earns participation XP when the battle ends, **win or lose** (KO'd ones too): `3 + (toughest foe level − its level)`, clamped to 1–5. The creature that knocks out an opponent also gets a KO bonus right away: `5 + 2 × (foe level − its level)`, clamped to 2–10. Running away earns nothing (`creature.ts` → `participationXp`, `xpForWin`; `battle.ts` → `awardBattleXp`).
- **Town stables** fully recover the team (KOs, Vitality, Fatigue) and give +1 Morale for the same Initiative as a city action, but serve no Chanko Nabe buff. That stays a city specialty (`world.ts` → `rest`).
- **Progression charts are skill trees.** Each node lists the nodes linked above it (`requires`), and all of them must be bought first. Evolving takes the center path: best stat → +2 energy **and** +1 Health → second stat → +1 Vitality → Evolve (6 points). The side branches (Signature → Movement, Speed → Stamina) are optional, and any you skip are left behind when the creature evolves. At the final stage, the Capstone needs both the Vitality and Stamina branches (8 points), and a +2 Prisma node hangs off the Movement branch.
- **Saves** carry a `version` (currently 3). Older saves are migrated on load (`state.ts` → `migrate`): v1 → v2 doubles energy earned from chart nodes; v2 → v3 renames bought chart nodes to their skill-tree ids and keeps every earned bonus.
- **Arbiter gates** follow the city lore: Salem needs the aurora, Fabian must be found in disguise, Dahlia needs a Canopy Rope, Stella needs 2 Merits, and Katy needs a Root Whistle or a creature that can Sail.

## 📂 Documentation Guide for Developers
To build out this game, please review the core design documents located in the `/docs` directory:
1. **[Core Architecture (`/docs/01-core-architecture.md`)](./docs/01-core-architecture.md):** Action economy (5 actions per turn), map traversal, explore mechanics, trainer abilities, weather effects, city actions, starter creatures, creature natures and abilities.
2. **[Board & Map (`/docs/02-board-and-map.md`)](./docs/02-board-and-map.md):** The 8-region National Park map layout, city hubs, and type associations. Special traversal mechanics (dig, fly, sail, teleport). Actual map in progress.
3. **[Combat Rules (`/docs/03-combat-rules.md`)](./docs/03-combat-rules.md):** Combat rules and structure outlined. The 8-type matrix, effectiveness and resistances. Creature attributes and stat formulas (Vigor, Stamina, Power, Focus, Speed, Armor, Ward, Morale).
4. **[Trainer Progression (`/docs/04-trainer-progression.md`)](./docs/04-trainer-progression.md):** Seasonal 100-turn cycle, weather changing with seasons. Creature experience points and node-based leveling, Arbiter tiers, Accolades, and the Turns 101+ Endgame Gauntlet.
5. **[Data Schemas (`/docs/05-data-schemas.md`)](./docs/05-data-schemas.md):** JSON templates for creatures, creature instances, moves, map nodes and items, matching `src/data/schema.ts`. The example content lives in `src/data/`.
6. **[Assets (`/docs/06-assets.md`)](./docs/06-assets.md):** Dumping art assets for future use. Maps, creatures, etc.
---

## 🚀 Development Roadmap & Scope
- **Phase 1:** ✅ Core game loop, map movement UI, and state management.
- **Phase 2:** ✅ Combat engine, energy pool generation, and modular custom move execution.
- **Phase 3:** ✅ Arbiter challenge system, seasonal weather mechanics, and progression tracking.
- **Phase 4:** 🟡 Content integration. Example creatures, moves and the map are in place; replace them with the final creature database and Master Move List (see `docs/05-data-schemas.md`).
- **Phase 5:** 🟡 Systems depth. Done: end-of-turn events, the full 36-slot roster table (placeholders), move readouts with explained rolls, Initiative-based camping, the stacked type chart, skill-tree progression charts, the Creature Codex, tier-scaled encounters, participation XP, town stables, in-battle type matchups and trainer minis. Next: balance passes from playtesting (event prices, XP rates, evolution costs).
- **Next:** creature art to replace the procedural models, multiplayer (local pass-and-play or online), dual battles, and a map editor.
