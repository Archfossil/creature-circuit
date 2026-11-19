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
  data/      schema.ts (content types) · types.ts (type chart) · species.ts · moves.ts · map.ts · content.ts
  engine/    pure game rules, no DOM
             creature.ts (stats, energy, playbooks, progression) · battle.ts (combat) · world.ts (map, explore, cities, turns) · state.ts (save)
  render/    engine.ts (WebGL renderer) · world.ts (3D map) · battle.ts (3D arena) · creatureModel.ts (procedural creatures)
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
| Health → Vitality carry-over, victor restores Health | `battle.ts` → `applyDamage`, `handleKO` |
| Stamina, Effort, Fatigue d10 check | `battle.ts` → `spendStamina`, `fatigueCheck` |
| Affinity swaps (Alpha borrows from partner) | `battle.ts` → `doSwap` |
| Energy requirements, Neutral and Prisma, 4-move playbook | `engine/creature.ts` → `fits`, `learnable` |
| 10 XP per level, progression chart, Evolve / Capstone | `creature.ts` → `progressionTree`, `unlockNode` |
| Totems, offerings, Recruitment Threshold | `world.ts` → `attemptRecruit` |
| Stables (Chanko Nabe), Markets, Shrines, Arbiters, arena tricks, Tier scaling | `world.ts` + `battle.ts` → `arenaTrick` |
| 100 turns, seasons, weather dice, endgame bracket | `world.ts` → `endTurn`, `startEndgame` |

### Interpretations & additions (open to change)
The docs leave a few points open. The prototype makes these calls:
- **Wild-at-heart (nature) trainers** get their *first* re-explore each turn free, so re-exploring can't be repeated endlessly.
- **Encounter scaling** follows Trainer Tier. Wild and roaming-trainer levels sit around 2 × Tier (just under that Tier's Arbiter), and a node's level shifts them by −1 to +2. Tier 1 can't roll Apex wilds. Tiers 3–4 roll one extra rarity die and Tier 5 rolls two. Roaming trainers bring more Prime/Apex creatures and bigger teams at higher Tiers (`world.ts` → `baseWildLevel`, `tierRarityDice`).
- **Running** from wild battles: d6 + (your Speed − foe Speed) ≥ 4. Followers with Quick Step always escape.
- **Trainer encounters**: on road and meadow nodes, a 3–4 explore roll may be a wandering trainer instead of a wild creature (prize: d6 coins).
- **Statuses** for each type: Burn, Soak, Shock, Snare, Stagger, Sunder, Beguile, Daze. Each lasts 3 rounds.
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
- **Next:** creature art to replace the procedural models, multiplayer (local pass-and-play or online), dual battles, and a map editor.
