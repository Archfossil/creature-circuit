# Region Packages: plan

**Status: steps 1 to 10 are built ([the safety net](#the-safety-net), [Margos's data in its own package](#margoss-package-so-far), [the active region](#the-active-region), [the Codex](#the-codex), [arenas](#arenas), [gimmicks](#gimmicks-in-packages), [the 3D map](#the-3d-map), [saves and online](#saves-and-online-as-built), [the season flow](#the-season-flow-as-built) and [balanced starters](#balanced-starters-as-built)).** Step 11 can wait ([18 · Steam](./18-steam.md)). It covers turning Margos into the first *region package*, so that later regions can be added beside it without changing the engine each time.

## The goal

- A **region** is a self-contained season: its own map, cities, Arbiters, Rivals, Champions, Codex, Legendaries and gimmicks.
- Margos plays **exactly as it does now** when this is finished, and existing saves still load.
- A new region is then mostly content. Engine code is only needed for new *kinds* of gimmick.

### Decided

| Question | Decision |
|---|---|
| What carries over between seasons? | Nothing. Every trainer picks a new starter and starts from nothing. |
| Why, in the story? | Creatures caught in an earlier year can't compete again. Trainers commit them to care or research facilities. |
| Legendaries | Nobody keeps them. They return to the wild between seasons and can be caught again in any year. |
| Codex | Mixed. Roughly half of each region's creatures are its own; the rest are shared with other regions. |
| Are regions unlocked? | No. Every region is open, and it's chosen at the start of a game. |
| Starters | Each region can have its own. Margos keeps its 8 (one per type), and for now is the only region with 8. |
| Second region | **The Juudlands.** 4 dual-type starters that cover all 8 types between them. |
| Third region | Named later. 4 dual-type starters again, in different pairings. |
| How many regions? | Build towards **8**, for the [World Championship](./17-world-championship.md). Margos is finished first. |
| Dual-type starters | **Balanced:** both types' energy is gained equally, with no primary and secondary. Only these starters work this way. |

## Where we are now

Counted in the code in November 2026.

| | Margos |
|---|---|
| Map | 140 nodes, 152 edges, 17 biomes |
| Places | 8 cities, 11 towns and special stops |
| Creatures | 401: 53 hand-made, **348 generated placeholders** |
| Legendaries | 36 in the roster, **7 on the map** |
| Rivals and Champions | 12 and 8 |
| Moves | 412 |

How much of the code assumes there's only one region:

| Assumption | Where | Size of the change |
|---|---|---|
| One map, read as global lists (`NODE_BY_ID`, `CITIES`, `TOWNS`, `MAP_NODES`) | About 175 uses in 10 files | Small per use if the names stay (see [The approach](#the-approach)) |
| Lists worked out once when the game loads (`RIVALS`, `CHAMPIONS`, `STOPS`, `SEGS`, `WISP_SPOTS`, `KEY_ITEM_TOWNS`, `DEPTHS_STAIR`) | `npcs.ts`, `land.ts`, `map.ts` | Small, but easy to miss: each would silently keep Margos's answer |
| Every creature in the game is in the Codex and can turn up anywhere (`SPECIES`) | About 20 uses: wild encounters, Arbiter teams, trades, events, Codex | Medium |
| A city's own rules, by its id (`'aurora'`, `'gloom'`, `'iron'`…) | 37 places outside the data files | **The hard part** |
| Arena effects, by name | 7 places in `battle.ts`, 3 in `app.ts` | Medium |
| The 3D map is built once, before a save is chosen | `render/world.ts`, `App` constructor | Medium |
| 100 turns, 8 Merits, "Margos" | About 35 places, mostly wording | Small |

Moves, Natures, Abilities, Instincts, Swap Moves, statuses, types, trainer styles and battle rules don't know about regions at all. They stay shared.

## What's in a package

```
src/regions/
  index.ts            the list of regions (id, name, blurb, how to load it)
  types.ts            the Region shape
  margos/
    index.ts          puts the package together
    map.ts            nodes, edges, cities, towns, scale
    codex.ts          which species live here, starters, Legendary nodes
    npcs.ts           Rivals and Champions
    voices.ts         what they say (today's texts.ts)
    looks.ts          what they wear (today's npcLooks.ts)
    gimmicks/         Cloud Island, Forest Floor, Gauntlet, Root Whistle…
    arenas.ts         arena effects
    events.ts         events that only happen here
```

| Shared by every region | Belongs to a region |
|---|---|
| Moves, types, statuses, battle rules | Map, biome placement, weather tables |
| Natures, Abilities, Instincts, Swap Moves | Cities, towns, markets, Nabes |
| The **library** of all species and their models | The **Codex**: which of them live here |
| Items, recipes, materials | Which items are sold where; its key items |
| Trainer styles, wardrobe, icons | Arbiters, arenas, Merits |
| Most events | Events tied to its places |
| Rival and Champion *systems* (Revenge, trades, dares, messages) | The people themselves |

### The shape, roughly

```ts
interface Region {
  id: string;                 // 'margos'. Never changes: it's in saves
  name: string;
  map: { nodes; edges; cities; towns; scale; portalRules };
  codex: { species: string[]; starters: string[] };
  people: { npcs; voices; looks };
  season: { turns: number; merits: number; finalsAt: string };   // 100, 8, 'stadium'
  weather: Record<Season, string[]>;
  events: EventDef[];         // added to the shared ones
  arenas: Record<string, ArenaEffect>;
  gimmicks: Gimmick[];
}
```

## The approach

### One active region

The game sets the active region when a journey starts or loads. The existing names (`NODE_BY_ID`, `CITIES`, `SPECIES`…) stay and point at that region's data, so most of those uses don't change. Every list worked out at load time becomes one worked out when the region is set.

The alternative is passing the region through every function. It's purer, but it rewrites hundreds of lines for no gain to players, and only one region is ever being played at a time.

**Where that shortcut isn't safe:** anything that handles several saves at once. The Saves screen, saved copies, import, the online lobby and save upgrades must use `regionOf(save)` instead.

### Gimmicks as plug-ins

Today, Salem's lap, Dahlia's trail and Stella's Gauntlet are `if` statements on city ids spread through `world.ts`, `state.ts` and `app.ts`. Each becomes a gimmick that answers the engine's questions:

| Hook | Margos example |
|---|---|
| `gate(s, city)`: may this Arbiter be challenged? | Salem's lap, Dahlia's trail, Stella's Gauntlet, Katy's whistle, Fabian's disguise |
| `arbiterAt(s, node)` | Dahlia on the Forest Floor |
| `canEnter` / `moveCost` | Portal at night, rope, ferry, Cloud Island costs |
| `onMove(s, from, to)` | The Gauntlet resets on leaving; a lap in progress ends |
| `explore(s)` | Forest Floor finds |
| `weather(s)` | Aurora Night over Aurora Peak in Winter |
| `onTurnEnd(s)` | The wisp drifts home |
| `loot(s)` | The Cloud satchel |
| `tiles(s)` / `hud(s)` | City tiles, HUD chips and rule sheets |
| `render` | Auroras, the portal, the Rainbow Plains' colours |

Margos's gimmicks keep their existing save fields (`flags.salemWorthy` and so on), so no save has to change. New gimmicks store theirs under `s.gimmicks[id]`.

### Codexes

- **One library, many Codexes.** A species is defined once, with a permanent id. A region lists the ids that live there, and can override *where* a species lives, *when* it's out and how rare it is. Its stats, moves and chart stay the same everywhere.
- **Families move together.** If a first stage is in a Codex, so are its evolutions. A test checks.
- **Every encounter needs an answer.** A test checks that each biome, rarity and time of day in a region turns something up, and that each Arbiter's type has enough creatures for a full team at every Tier.
- **Legendaries** are picked per region. The roster already has 36 and Margos uses 7, so there's material for later regions.

### Saves and online

- A match also records its **rules version**, so a world can finish on the rules it started with.
- A save gains `region`. A save without one is Margos. No other field changes.
- A match has one region for everyone, chosen by the host.
- A browser that doesn't have a match's region yet (an old cached version) is told to reload instead of breaking.
- Each region keeps its **own autosave slot per mode**, or they share today's three. See [Decisions needed](#decisions-needed).
- A small **hall of records** is kept outside the save: past seasons' region, team names and result. It's what makes the farewell and the story possible without carrying anything into play.

### Between seasons

1. A season ends (champion, eliminated or out of time).
2. **Farewell:** the team is committed to the Research Facility, one card each. Legendaries return to the wild.
3. The result goes into the hall of records.
4. **New season:** straight into a new game.

### Starting a game

Choosing a region is the first page of the new-journey wizard, before the trainer, home city and starter, which all come from that region. In hotseat and online games the host chooses once for everyone. Saves, copies and lobbies show the region's name. With only Margos available, the page is skipped.

## Starters by region

| Region | Starters | Types |
|---|---|---|
| Margos | 8 | One each. Single-type until their final stage. |
| The Juudlands | 4 | Dual from the first stage, every type used once |
| Third region | 4 | Dual, every type used once, none of the Juudlands' pairs |

The pairings and creatures are the design team's to choose. There's room for the idea to continue: the 28 possible pairs can be arranged into 7 sets of four with no pair ever repeated, so 7 regions can do this: with Margos, the 8 we're building towards, whose 36 starters fill every slot of the roster table once. All 28 pairs also exist as ordinary dual types, so a balanced starter needs to feel different from those, not just share their types.

### What "balanced" means

Ordinary dual types get a 60/40 split of energy, in favour of their first type. Balanced starters split it evenly. Totals stay the same as any Common's, so they're no stronger overall:

| Stage | Margos starter (example: Sproutle) | Ordinary dual Common | Balanced starter |
|---|---|---|---|
| 1 | 6 Grass | 4 + 2 | **3 + 3** |
| 2 | 10 Grass | 6 + 4 | **5 + 5** |
| 3 | 9 Grass, 5 Rock, 2 Prisma | 9 + 5, 2 Prisma | **7 + 7, 2 Prisma** |

Each place that treats the first type as the main one, and the proposal for a balanced creature:

| Rule | Today | Balanced |
|---|---|---|
| Base energy | 60/40 | 50/50 |
| Chart energy nodes (two of +2) | First is the main type, second the other | **+1 of each** at both, so it's equal whichever is bought and whenever it evolves |
| Energy Tonic (+1 permanent) | Goes to the main type | The trainer picks, or whichever it has less of. [Decision 6](#decisions-needed) |
| Energy Imprints | Swap any energy it has | No change: an Imprint is the trainer's choice to tip the balance |
| Instinct choice at the start | Its type's 6 | **Both types' pools: 12** |
| Swap Moves that use "its type" (Tag Strike and others) | The first type | The partner's or Alpha's **better type against that foe**. [Decision 7](#decisions-needed) |
| Recommended and automatic playbooks | Lean to the main type | No lean, with moves that cost both types evenly favoured |
| Where its family lives in the wild | Biomes of its first type | Biomes of either |
| Card, starter tile and 3D model colour | First type | Both, split |
| Codex sorting | By first type | Listed under both types' filters, as dual types already are, and sorted by the first |

Energy is worked out once per species, so the split is a small change marked by `balanced: true`. The list above is what makes it feel right.

**Balance to watch:**
- **Narrower early on.** With 3 + 3, a balanced starter can't use moves that cost 4 or more of one type until its energy grows, where a Margos starter can. It gets two types of move and even two-type moves instead.
- **Two types means two sets of weaknesses.** Some pairs have a ×4 weakness or a type they're immune to, so the four pairings should be compared on the type chart before they're final.
- **They should be fair against each other**, not against Margos's, since a game has one region.
- **Fewer choices in multiplayer.** With up to 6 trainers and 4 starters, some will share a species. That already works.

## The steps

Each step is finished, tested and pushed on its own, and the game is playable after every one. Sizes are relative to each other.

| # | Step | Size | Players see |
|---|---|---|---|
| 1 | **Safety net** ✅ built | S | Nothing |
| 2 | **Move Margos's data** into `src/regions/margos` behind the same names ✅ built | M | Nothing |
| 3 | **Active region**, plus a tiny test-only second region ✅ built | M | Nothing |
| 4 | **Codex** separated from the species library ✅ built | M | Nothing |
| 5 | **Arenas** as a per-region table ✅ built | S–M | Nothing |
| 6 | **Gimmicks** as plug-ins, one at a time ✅ | **L** | Nothing |
| 7 | **3D map** built for the active region, and rebuilt on a change ✅ built | M | A short load when changing region |
| 8 | **Saves and online** record the region; wording stops assuming Margos, 8 and 100 ✅ built | M | Region name on saves |
| 9 | **Season flow:** region choice at the start, farewell, hall of records ✅ built | M | Farewell and records; the region page once there are two |
| 10 | **Balanced starters:** the rules above ✅ built | S–M | Nothing until the Juudlands |
| 11 | **Load on demand:** a region's data and art only when it's played. Can wait: an installed game doesn't need it ([18](./18-steam.md)) | S–M | Faster first load later on |

**What each step needs to be called done**

1. **Safety net.** Before anything moves: a snapshot of all Margos's data, and a bot that plays whole seasons from fixed dice seeds and records what happens. Both must match exactly after every later step. The game rolls with `Math.random` (about 55 calls), so the bot swaps in a seeded version of it for the run and no game code has to change. A step that rolls dice in a different order would show up as a difference, so steps keep the order.
2. **Move the data.** Files move, imports stay the same, and the snapshot matches.
3. **Active region.** Switch to the test region and back, and prove nothing of the other is left behind. This is the test that catches stale load-time lists.
4. **Codex.** Margos's Codex is all 401, so nothing changes. The test region uses a handful, and no creature from outside it ever appears in the wild, on a team, in a trade or in an event.
5. **Arenas.** All 8 arena effects behave the same, on the existing tests and in the seeded seasons.
6. **Gimmicks.** One gimmick per commit, simplest first: Katy, Fabian, Stella, Dahlia, the Depths, wisps and the Rainbow Plains, then Salem and Cloud Island. At the end, **no city id appears in `src/engine`, `src/ui` or `src/render`**, and a test keeps it that way.
7. **3D map.** Memory returns to where it was after ten switches, and phones are tested as well as desktop. Coastline exceptions (Ironwake's island) and map bounds move into the region's data.
8. **Saves and online.** Old saves, copies, exports and rooms all load as Margos.
9. **Season flow.** Choose a region, finish a season, say farewell, start another: solo, hotseat and online.
10. **Balanced starters.** Tested with a made-up species in the test region: equal energy at every stage and after every chart path, and no ordinary creature changes.
11. **Load on demand.** Margos's code is no bigger than today, and the installed game still works offline for regions already played.

### The safety net

`tests/baseline.test.ts` runs with the other tests (about 30 seconds) and compares the game with a saved copy in `tests/baseline`:

| Saved | What's in it |
|---|---|
| `data/` (14 files) | Everything in the data files, one line per item, and what the rules work out from it: neighbours, who lives where, markets, Champions' travels, the coastline |
| `seasons/` (20 files) | 8 wandering trainers (one per style, home city and starter), 5 tours, a three-player hotseat game, Stadium Mode, and 5 drills: every event and answer, every Arbiter at every Tier, every route and gate, every gimmick, and a six-player Circuit |

- **Each line of a season** is one turn: what happened, where it left the trainer, how many dice were rolled, and a mark for the rules and one for the wording. If only the wording mark changes, the test says so.
- **When it fails** it shows the first turn that differs. A step of this plan must not make it fail. New content or a new rule will, and that's fine: run `npm run baseline`, look over what changed in `tests/baseline`, and commit it with the change.
- **It checks its own reach.** A test fails if no season visits a biome, fights an Arbiter, or meets an event, gimmick or system on its list.
- **It was tested by breaking the game:** 12 deliberate changes to rules, dice order, lists and wording (the Gauntlet, Salem's lap, the satchel, the Forest Floor, gates and others) were all caught.
- **What it doesn't cover:** screens and the 3D map (`src/ui`, and all of `src/render` but the coastline and outfits), online play, loading old saves, and rules that live in a screen, like the guessing game that finds Fabian. Those have the ordinary tests or need checking by hand; step 8 covers saves and online.

### Margos's package so far

`src/regions/margos` holds the map, cities and towns (`map.ts`), Rivals and Champions (`npcs.ts`), what they say (`voices.ts`) and wear (`looks.ts`), the starters (`codex.ts`) and the weather dice (`weather.ts`). The old names in `src/data` and `render/npcLooks.ts` read from it, so nothing else in the game changed.

- **Finding what's left:** apart from `active.ts`, only `data/map.ts` still reads `regions/margos`, for the places that become gimmicks in step 6.
- **Packages only import types** from the rest of the game. The data files read the packages while the game loads, so anything more could go round in a circle.
- **Left for their own steps:** gimmicks and Margos-only events (6), and the turn and Merit numbers (8).
- **Shared, not Margos's:** which types belong to each biome (`BIOME_TYPES`). The species library uses it to place the placeholders. A region decides where its biomes are.

### The active region

`setRegion` in `src/regions/active.ts` changes region, and everything kept from a region's data is made inside `onRegion`, which runs at once and again on every change. The names the game uses (`NODE_BY_ID`, `CITIES`, `RIVALS`…) are the same, and always the active region's.

- **Nothing in the game calls `setRegion` yet.** There's one region to play, and a save doesn't record its region until step 8.
- **A new list or cache made from a region's data goes in `onRegion`.** `tests/regions.test.ts` fails if a switch to the test region (`tests/regions/testRegion.ts`) isn't the same as having started there: its data, teams, coastline and three whole seasons. It also checks that its saves mention nothing of Margos, and that Margos is the saved baseline again afterwards.
- **It was tested by breaking it:** 26 rebuilds were stopped one at a time, and 25 are caught (two of them since step 4). The other, `built`, is a cache keyed by Rival and Champion, who have different ids in each region, so it can't be wrong yet. It would matter if one visits another region.
- **Places the rules ask for** (wisp spots, key item towns, the Depths' stair, the two coasts of a challenge) are now in the package, as `map.places`.
- **The default home** (wizard and Stadium Mode) is the region's `home`, and the stadium is found by its kind (step 6).

### The Codex

`SPECIES` is now the species that live in the active region, and `SPECIES_BY_ID` is still every species there is. **To choose a creature, use `SPECIES`; to look one up, use `SPECIES_BY_ID`.** A region's `codex` lists its species (`'all'` for Margos) and its starters.

- **`codex.local`** changes where a species lives, when it's out or how rare it is. Its stats, energy and recruiting number stay the same. How rare it is here also decides its Research Facility payout, its trade value and, for an Apex, its size. A species still only turns up where its types belong (`BIOME_TYPES`).
- **Nobody from outside turns up.** `tests/regions.test.ts` plays the test region, which has 28 species, and looks for outsiders in the wild, on Rivals', Champions', Arbiters', Hall and Circuit teams, in the Depths, in trades, in every event, and in whole seasons' saves.
- **`tests/regions/codexGaps.ts` lists what a Codex is missing:** split families, starters or Legendaries that don't live there, wild encounters with nobody for a biome, rarity, stage and time of day, Arbiters without a full team, and so on. Margos has none, and a new region has to have none.
- **If there's a gap anyway,** the game picks the nearest rarity among the area's types rather than getting stuck.
- **Stadium Mode** can use every species from any region, as it isn't part of a season.
- **It was tested by breaking it:** each place that chooses a creature was made to choose from the whole library. All were caught but the three that walk back up a family, where it makes no difference.
- **When the Juudlands' creatures arrive,** Margos's `'all'` must become a list first.

### Arenas

A region's `arenas` say what each arena does, and a city names one as its `arena.trick`. An effect can change attributes (`stat`) or accuracy rolls (`accuracy`), do something at the end of a round (`roundEnd`) or give the challenger a number of rounds to win in (`countdown`, with its own wording). It can do several at once. `battle.ts` and the screens no longer know any of Margos's by name, and a test keeps it that way.

- **Dice:** an effect may only roll the dice it's handed, so seeded seasons stay the same.
- **Same name, different effect:** two regions can both have a `flames`. The active region's is used.
- **It was tested by breaking it:** 14 changes to Margos's numbers and 6 to the engine. All but two were caught at first; those two now have tests.

### Gimmicks in packages

| Gimmick | State |
|---|---|
| Katy’s whistle, Fabian’s disguise, Stella’s Gauntlet, Dahlia’s Forest Floor, the Depths, wisps, the Rainbow Plains, Salem’s lap and Cloud Island | ✅ moved |
| The default home, Stadium Mode, the map's walls and offshore roads, Notice Board tips, the guide | ✅ in the package |

- **Rules** are in `src/regions/margos/gimmicks`, as answers to the engine's questions (`Gimmick` in `src/regions/gimmick.ts`). They can gate an Arbiter, close or cost a step, hear of moves and purchases, keep what's found, set the weather, work exploring their own way, rule a biome (`lands`), keep somewhere apart with its own `events`, and have battles. The first gimmick with an answer to `gate` gives it.
- **They can't import the engine,** which loads the packages first. The functions they use are handed to them (`Tools`, filled in by `src/engine/tools.ts`).
- **Screens** are in `src/regions/margos/screens.ts`, which only the app loads, so they can import anything. A gate names the one to open (`show`), and a city's extra tiles come from `tiles`.
- **Margos's gimmicks keep their old save fields.** A new region's keep theirs in `s.gimmicks`.
- **No place of Margos's is named in `src/engine`, `src/ui` or `src/render`,** and `tests/regions.test.ts` keeps it that way. `data/map.ts` still passes some on, for the baseline and the tests.
- **The guide:** a topic or line named in `src/ui/guide.ts` comes from the region's `guide`, and any other topic of its own goes under Places.
- **Still shared:** the biomes, with their looks and names (`prism` is the Rainbow Plains' ground), and items made for one gimmick (the Fog Lantern).

### The 3D map

`App.changeRegion(r)` puts the old map away, changes region and builds the new one behind the loading screen. Opening a game from another region calls it (step 8); choosing one is step 9.

- **`WorldView.rebuild()`** frees everything in the region's own group (land, sea, decor, paths, nodes, clouds, aurora) and clears the trainers, follower, markers and lights. The sky, lights, weather particles and controls stay. **Anything new that's built for a region goes in `this.land`,** and anything taken off the map is passed to `free`.
- **In the region's data:** `map.bounds` (what's drawn, how far the camera pans, the middle of the shallows, the shadows and the title view) and `map.offshore` (Ironwake).
- **Checked** by a fingerprint of every mesh, light and colour, desktop and phone-sized: Margos is as it was before, and a rebuilt map is the same as a fresh one. Over 40 switches, shapes and textures level off. With the freeing taken out, they climb at every switch.
- **Not checked on a real phone,** only Chrome's phone emulation.

### Saves and online, as built

- **`region`** is on every save and match. One without it is Margos's, and no other field of a save changed. A match also has `rules` (`RULES_VERSION`), which goes up only when a match can't be finished on older rules.
- **Opening a game goes to its region:** solo, hotseat, saved copies, and joining or watching online (`App.goToRegionOf`). Each save is mended by its own region's gimmicks, whichever is being played.
- **A region (or rules) this version doesn't have:** the save isn't changed or taken for an empty slot. The title screen and Saves say to reload, and starting a new game over it asks first.
- **Online:** a room is in its host's region. The server turns away a browser that doesn't have it, and a trainer from another. Browsers from before this can only have Margos, and needn't say.
- **Length and Merits** are the region's `season`. Seasons of the year are still 25 turns each, a bracket is still 8, and Tiers still go up every 2 Merits.
- **One autosave per mode** ([decision 1](#decisions-needed)).
- **The baseline** leaves `region` out, so it didn't have to change.

### The season flow, as built

- **Choosing a region** comes before a new solo journey, hotseat game or online room (the host chooses). It's skipped while there's only one, so players see no difference yet.
- **The farewell:** one card for each creature on the active team, the starter and any Legendary, then one for everyone else. A region's `farewell` says where they go; a Legendary returns to its grounds. Nothing is changed by it: the save is only cleared once it's over, as before.
- **Records** (`engine/hall.ts`) are kept on the device, outside every save: the last 60 seasons' region, trainers, results and active teams. A game is recorded once, when everyone in it has finished. Online, each player's own device records it.
- **A finished game** waits on the title screen as "Season's end" until its farewell.
- **Nothing in the rules reads the hall,** and a test keeps it that way.

### Balanced starters, as built

- **`balanced: true`** on a species' definition (`Def`) does it all, in every stage of its family. `leadTypes(species)` is both its types; for any other creature it's the first. New code that treats a creature's first type as the main one should use it.
- **Nobody in the game is balanced yet.** The tests make a family up (`addSpecies`), which is also how a region's own creatures can join the library.
- **Swap Moves of "its type"** (Tag Strike and Siphon) use the better type against the foe in front of it, or the first if they're equal. Away from a battle, the words say "Fire or Water, whichever is better".
- **Energy Tonic:** the screen asks. If nobody's asked, it goes to the type it has less of. The item's own text says "primary type", and is to be reworded with the Juudlands.
- **Not done here:** choosing the pairs, and comparing them on the type chart (decision 8).

### Legacy (maybe, later)

A past season leaves no mark on play (decision 2). This is a note that it could one day, not a plan.

- **What's kept makes it possible:** each record has the region, who played, how far they got and their active team. Seasons from before any Legacy would count, though only what's listed above is kept.
- **It would need an answer to:** equal terms in a match (off in online and hotseat games? the host's choice? never in a World Circuit?), where it lives (records are on one device and can be edited, so nothing that matters can rest on them alone), and what happens to a season that's forgotten.
- **Safest first:** things that change nothing in play, such as titles, outfits, a past partner's statue or letter, or a retired creature seen living at the facility. Then solo-only choices at the start of a season. Anything stronger only where everyone has agreed to it.

**If we stop early:** steps 1–6 are worth having alone, since they make Margos's own gimmicks easier to add to. Nothing is half-finished at any step boundary.

## After that: what a new region takes

| Piece | Rough amount, going by Margos |
|---|---|
| Map | About 120–140 nodes, 8 cities, 8–11 towns, routes of 3–5 nodes between them |
| Arbiters | 8, each with an arena effect; most with a way to earn the challenge |
| People | 12 Rivals and 8 Champions with dialogue, types, homes and outfits |
| Codex | About 200 of its own creatures (65 or so families) and 200 shared |
| Starters | 4 balanced families (12 creatures), counted in its own half |
| Legendaries | 7, with how to reach each |
| Gimmicks | 3–5 map gimmicks of its own |
| Moves | Optional: the 412 already cover every typed cost |
| Key items, events, icons | A handful, 5–10, and 20–50 |

**Creatures are by far the most work,** and the placeholders matter here: 348 of Margos's 401 are still generated. Every hand-made creature that replaces one can be *shared*, so finishing Margos's roster also fills about half of the next region's.

## Risks

| Risk | What we do about it |
|---|---|
| A load-time list keeps Margos's data after a switch | The test region (step 3); one place where region lists are rebuilt |
| A gimmick changes behaviour as it moves | Seeded seasons must match exactly (step 1); one gimmick per commit |
| Saves break | `region` is the only new field; tests load older saves and exports |
| Online players on different versions | The match names its region; an older browser is told to reload |
| Switching region leaks memory on phones | A measured target in step 7 |
| Shared creatures are unbalanced in a new region | Region overrides for rarity and place; never for stats |
| New Arbiters in a region nobody has tested | The win-rate simulations used for Rivals, run for each region |
| It takes long enough to hold up other work | Every step ships alone, so other features can go in between |

## Decisions needed

None of these hold up steps 1–7.

| # | Question | Recommendation | Needed by |
|---|---|---|---|
| 1 | One autosave per mode, or one per region and mode? | One per mode, as now. Saved copies already hold the rest, and it keeps storage small. | Step 8 |
| 2 | Does a past season leave any mark on play? | **Decided: no.** Records, farewells and perhaps cosmetics only, so new players in a match are on equal terms. Left open for later: [Legacy](#legacy-maybe-later) | Step 9 |
| 3 | Can a Margos Rival or Champion visit another region? | Yes, as a guest or two, with their records starting fresh. | The Juudlands |
| 4 | Do Margos's Legendaries appear elsewhere? | One or two as rare guests; the rest are the region's own. | The Juudlands |
| 5 | Always 100 turns and 8 Merits? | Keep both at first. The package allows others. | The Juudlands |
| 6 | Energy Tonic on a balanced creature | **Decided.** The trainer picks the type. It's the one time they choose to break the balance, along with Imprints. | Step 10 |
| 7 | Swap Moves on a balanced creature | **Decided.** Use its better type against that foe: it has no main type, so this is its edge. | Step 10 |
| 8 | The Juudlands' four pairs | The design team's call, checked against the type chart. | The Juudlands |
| 9 | Can a region's starters be met in the wild there, and in other regions? | In their own region, like Margos's. Elsewhere only if its Codex shares them. They stay balanced everywhere. | The Juudlands |
