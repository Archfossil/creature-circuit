# Steam: direction

**Status: a long-term goal, agreed in outline in November 2026.** The browser version carries on, and stays free, until the Steam version is out. Then it's retired.

## Decided

| Question | Decision |
|---|---|
| Consoles? | Not a goal |
| Phones? | No longer the plan. The browser version still works on them |
| Budget | None to speak of |
| Creature art | Built in code by Claude, from images provided |
| The browser version | Kept and worked on for now; retired after the Steam release, with a way to bring saves across |

## Proposed: the same game, in a desktop wrapper

Keep today's code and put it on Steam with Electron, rather than rebuild it in an engine.

| Option | Why not, for now |
|---|---|
| Godot 4 + C# | The best choice if we did rebuild. But about 9,200 lines of screens and 3D would be redone before players saw anything new |
| Unity + C# | Its edge is consoles and hiring 3D artists |
| Unreal | More than this game needs |

**Reconsider if** an artist joins, the art needs something three.js can't do well, or the trial below fails. It stays affordable while the rules (`src/engine`, `src/data`, `src/regions`) know nothing of the screen: they're what would be translated, and the seeded seasons would check it.

## Creatures

- 348 of Margos's 401 are placeholders. **This is most of the work left**, whatever the game runs on.
- **Useful images:** front, side and back of the same design, in flat colours, with a note on what must be recognisable.
- **Try one family of three first,** to see how close it gets, how long each takes and whether the style holds up.
- Or make Margos's Codex smaller on purpose.

## The order

| Stage | What | Cost |
|---|---|---|
| Now | Finish Margos in the browser, with friends testing | Free |
| Soon | **A desktop trial build**, to find problems with the Steam overlay, Steam Deck and controllers early | Free for the build; Steam's own features need a developer account |
| Later | A Steam page and a demo | Steam's one-time fee for a game |
| Release | The Steam build | |
| After | Retire the browser version | |

## What the Steam version needs

| Piece | Notes |
|---|---|
| Wrapper and builds | Windows first, then Linux for the Deck |
| Saves in files | They're in browser storage now, through `engine/state.ts` alone. Files let Steam Cloud sync them |
| Controllers and the Deck | **The main risk:** the game is all touch and mouse. Every screen needs to be reachable with a pad |
| Text and layout at a desk | The layout was made for phones first |
| Steam identity | For online play and World Circuits |
| Inviting friends | Room codes work; Steam invites would be better |
| Moving saves over | Export and Import already exist in the browser |
| Online rooms | Today's server, unchanged. Its free plan sleeps and keeps rooms in memory, which is fine for casual games |

## What it changes elsewhere

- [16 · Region packages](./16-region-packages.md): step 11 (load on demand) can wait, and real-phone checks aren't needed.
- [17 · World Championship](./17-world-championship.md): weekly chapters and Circuit Nights instead of daily play.
