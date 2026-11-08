# creature-circuit
A game about collecting wonderous creatures, developing their battle powers, becoming the regional champion and proving yourself as the best trainer of all time.


# Creature Circuit (Browser / App Edition)

**Creature Circuit** is a strategic monster-training game inspired by classic 90s tabletop mechanics, adapted into a digital browser/app experience. Players travel across a map inspired by American National Parks, capture and evolve creatures across 8 elemental types, challenge regional Arbiters, and compete in an endgame championship gauntlet.

---

## 🛠️ Tech Stack & Setup (Placeholder for Dev Team)
- **Target Platform:** Web Browser (React / TypeScript / Vite or similar modern web framework recommended)
- **State Management:** Client-side state handling turn economy, player inventory, active roster (3 creatures), and active weather.
- **Styling:** Modular CSS / Tailwind for a clean, responsive tabletop-inspired UI (index card aesthetics).

---

## 📂 Documentation Guide for Developers
To build out this game, please review the core design documents located in the `/docs` directory:
1. **[Core Architecture (`/docs/01-core-architecture.md`)](./docs/01-core-architecture.md):** Action economy (5 actions per turn), map traversal, explore mechanics, trainer abilities, weather effects, city actions, starter creatures, creature natures and abilities.
2. **[Board & Map (`/docs/02-board-and-map.md`)](./docs/02-board-and-map.md):** The 8-region National Park map layout, city hubs, and type associations. Special traversal mechanics (dig, fly, sail, teleport). Actual map in progress.
3. **[Combat Rules (`/docs/03-combat-rules.md`)](./docs/03-combat-rules.md):** Combat rules and structure outlined. The 8-type matrix, effectiveness and resistances. Creature attributes and stat formulas (Vigor, Stamina, Power, Focus, Speed, Armor, Ward, Morale).
4. **[Trainer Progression (`/docs/04-trainer-progression.md`)](./docs/04-trainer-progression.md):** Seasonal 100-turn cycle, weather changing with seasons. Creature experience points and node-based leveling, Arbiter tiers, Accolades, and the Turns 101+ Endgame Gauntlet.
5. **[Data Schemas (`/docs/05-data-schemas.md`)](./docs/05-data-schemas.md):** JSON structure templates for creatures, stats, and moves (awaiting future content injection).
6. **[Assets (`/docs/06-assets.md`)](./docs/06-assets.md):** Dumping art assets for future use. Maps, creatures, etc.
---

## 🚀 Development Roadmap & Scope
- **Phase 1:** Core game loop, map movement UI, and state management.
- **Phase 2:** Combat engine, energy pool generation, and modular custom move execution.
- **Phase 3:** Arbiter challenge system, seasonal weather mechanics, and progression tracking.
- **Phase 4:** Content integration (Creature database and Master Move List to be plugged in later).
