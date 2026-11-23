# Data Schemas

These are the JSON templates for the game's content. The TypeScript versions, which the engine actually checks, are in [`src/data/schema.ts`](../src/data/schema.ts). The example content is in `src/data/`:

| File | Contents |
| --- | --- |
| [`species.ts`](../src/data/species.ts) | 52 example creatures (8 types × 6, the Emberfish line, 2 legendaries) |
| [`moves.ts`](../src/data/moves.ts) | Master Move List: physical, support, 4 elemental moves per type, 8 signature moves |
| [`map.ts`](../src/data/map.ts) | Margos: 8 cities, 10 towns, Circuit Stadium, 2 legendary nodes, the wild routes and the type pool for each biome |
| [`content.ts`](../src/data/content.ts) | Natures, abilities, items, offering materials, weather and the seasonal weather dice |

To add content, add an entry that follows the template below. Nothing else needs to change: the UI, the procedural 3D models, the encounter tables and the arbiter teams all read from these lists.

---

## Creature (Species)

```json
{
  "id": "emberfish",
  "name": "Emberfish",
  "types": ["fire", "water"],
  "rarity": "common",
  "stage": 1,
  "evolvesTo": "cinderkoi",
  "base": { "vigor": 3, "power": 1, "armor": 0, "focus": 3, "ward": 0, "speed": 6, "evasion": 3, "stamina": 5 },
  "energy": { "fire": 2, "water": 1 },
  "rt": 5,
  "ability": "forager",
  "instinct": "sunbather",
  "signature": "sig-caldera",
  "biomes": ["volcanic", "coast", "river"],
  "dex": "Swims where hot springs meet the sea…",
  "look": { "shape": "fish", "primary": "#ff5a1f", "secondary": "#ffd23f", "crest": "flame" }
}
```

| Field | Notes |
| --- | --- |
| `types` | One or two of `astral, charm, electric, fire, grass, rock, steel, water`. |
| `rarity` | `common`, `prime`, `apex` or `legendary`. This sets the encounter rarity tier and the base Recruitment Threshold (RT). |
| `stage` | 1–3. Stage 1 and 2 progression charts end in **Evolve**. Stage 3 charts (and creatures with no evolution) end in a **Capstone**. |
| `base` | Level 1 attributes. Health is 5 × `vigor`, in hearts of 5. In `species.ts` these are generated from rarity and stage plus a stat `bias`. |
| `energy` | Energy generated per type, plus optional `prisma`, which counts as any type. This is a playbook requirement, not a resource spent each turn. In `species.ts` it is generated from rarity and stage, then multiplied by `ENERGY_SCALE` (2). Energy and Prisma nodes on the progression chart each add `NODE_ENERGY` (2). |
| `rt` | Recruitment Threshold. The offering roll is 2d6 + totem + offerings, against `rt + floor(level / 3)`. |
| `biomes` | Biomes the species prefers. A wild node offers it when its biome's type pool (`BIOME_TYPES` in `map.ts`) includes the species' first type, and it is preferred over same-type species without that biome. The Creature Codex lists these nodes. |
| `ability` | An overworld passive (see `ABILITIES`). It is active only while the creature is **Following**. |
| `instinct` | Its battle passive (an id from `INSTINCTS` in `instincts.ts`). Every stage of a family shares one. See [14 · Instinct Checklist](./14-instinct-checklist.md). |
| `signature` | A Signature Move, unlocked through a progression-chart node. |
| `sturdy`, `bulky` (optional) | How its charts raise Vigor. A first stage has one Vigor node, last; later stages (and species that never evolve) have two, one of them early. `sturdy` species (a Vigor bias, set automatically) have one instead of two, and `bulky` ones (Sproutle) have none at that stage. |
| `look` | Drives the procedural low-poly model. `shape` is one of `blob, quad, bird, serpent, golem, sprite, fish, lizard, lion, wraith, slime, beetle, toad, hare, ape`. Optional `eyes` (`round, fierce, sleepy, glow`) and `marks` (`spots, stripes`) vary it. `crest` is one of `horns, ears, flame, leaf, crystal, fin, halo, spikes, antenna, plates`. |

### The roster table (`roster.ts`)
The roster has one **slot** for each type combination: 8 single types plus 28 dual pairs, 36 in all. Each slot holds:
- a **Common**, a **Prime** and an **Apex** family, each with three stages (stage 1 → 2 → 3), and
- one **Legendary**.

That makes 324 family creatures and 36 Legendaries. `ROSTER` lists the species ids in every slot. `TYPE_COMBOS` fixes each dual pair's leading type: it decides where the family spawns (`types[0]`), and every type leads 3–4 of its 7 pairs.

Slots already filled by hand-made creatures are mapped in `HANDMADE_SLOTS` (the eight Common starter lines) and `HANDMADE_LEGENDARIES` (Solstara, Thalassor). Every other slot gets a generated **placeholder**:
- **Ids:** `ph-<type>-<type|mono>-<rarity>-<stage>`, or `ph-…-legendary`.
- **Flag:** `placeholder: true`.
- **Names:** type syllables plus an ending for the body shape and stage (`SUFFIX`), e.g. Pyrotidegrub → Pyrotidebug → Pyrotidescarab.
- **Looks:** the body shape comes from six per leading type (`SHAPES`), so a slot's three families always differ. Eyes (`round`, `fierce`, `sleepy`, `glow`) and markings (`spots`, `stripes`) vary by family. Shapes are built in `render/creatureModel.ts`: quad, blob, bird, serpent, golem, sprite, fish, lizard, lion, wraith, slime, beetle, toad, hare and ape.
- **Stats, energy, looks, biomes and ability:** derived from the types and rarity.
- **Instinct:** dealt in turn from one of the family's types' pools (`familyInstinct`), so every Instinct goes to a similar number of families.

Placeholder families appear in the wild like any other species. Placeholder Legendaries have no map node yet, so the Codex says they aren't placed.

**Extra families** (`EXTRA_FAMILIES`) sit beside the table: five placeholder Commons, each a second single-type family out at the time of day its type was missing from the wild (Electric, Fire and Grass by night; Astral and Charm by day). Their ids are `ph-<type>-<dusk|sun>-common-<stage>`. To replace one, add the real family with its `activity` and remove the entry.

**Activity** comes from a species' types (`activityFromTypes`): all night-leaning types (Astral, Charm) make it nocturnal, all day-leaning ones (Electric, Fire, Grass) diurnal, and a mix, or any Rock, Steel or Water, leaves it out at any time. `activity` on the species or `ACTIVITY_OVERRIDE` sets it by hand.

**Replacing a placeholder:**
1. Add the real species to the hand-made list in `species.ts`.
2. Add its slot to `HANDMADE_SLOTS` / `HANDMADE_LEGENDARIES`.

The placeholder then stops being generated. The roster tests check that every slot has three chained stages of the right types and rarity.

The older Prime/Apex species and the Emberfish line, which have one or two stages, still exist. They sit outside the table as extras.

## Creature instance (save data)

Each creature the player owns is saved as an instance of a species:

```json
{
  "uid": "k3j9x0aa", "species": "emberfish", "nickname": null,
  "level": 3, "xp": 4, "points": 1,
  "nature": "timid", "morale": 6, "loyalty": 2, "perks": 0,
  "bonus": { "speed": 1, "health": 1 }, "extraEnergy": { "fire": 1 },
  "unlocked": ["a", "c"], "signature": null, "capstone": false,
  "health": 4, "vitality": 2, "stamina": 6, "fatigue": 0, "ko": false,
  "playbook": ["ember", "splash-jet", "quick-jab"],
  "teamwork": { "<other uid>": 1.4 },
  "swapMoves": { "<other uid>": "tide-relay" },
  "wins": 3, "losses": 0
}
```

`morale` and `loyalty` both run 0–10. Loyalty is never spent: `perks` counts the Nature perks unlocked as Loyalty reached each threshold, and they never re-lock. `moraleWarned` / `moraleMark` (optional) track the low-Morale warning and whether Morale rose since the last turn (see `moraleAndLoyalty` in `world.ts`). `swapMoves` holds the Swap Move the trainer set for each partner (by uid): the one this creature uses when it swaps in for that partner; unset means a neutral move picked at random for that pair (see `engine/swaps.ts` → `defaultSwapMove`). `ability` and `instinct` (optional) are the creature's own Ability and Instinct when it has been retrained away from its species' (the Battle School, the Trail Tutor, the Drum Circle); read them through `abilityOf` / `instinctIdOf` in `creature.ts`, which fall back to the species'. `teamwork` is the creature's Teamwork with each partner, by uid: it grows 0.2 a turn on the active team and +1 per battle from swapping, capped at half the lower Loyalty of the pair, applied whenever it's read and stored at the end of each turn (see `engine/teamwork.ts`; older saves called it `affinity` and are migrated on load). `bond` (optional) marks the starter: it has +1 Vigor and no attribute under 1 (applied in `stats`, before its Nature), never leaves from low Morale and can't be released or given away.

The save also holds:
- **`npcs`:** history with each Rival and Champion met, by id: `{ met, won, lost, owed, rapport, seen, revenges, last?, chatted?, invite?, chat? }` (`engine/npcs.ts` → `NpcRecord`). `circuitNews` and `npcNotes` are Circuit news and start-of-turn notes.
- **`training`:** creatures away at a Battle School, as `{ creature, school, xp, turns, started }`. A retraining course adds `retrain: { nature?, ability?, instinct? }` (the ids it changes to), earns no XP, and lasts until the next morning.
- **`lastBattle`** (optional): the log of this trainer's latest battle, as `{ title, turn, result?, entries }` (see `engine/battleLog.ts`). Saved copies leave it out.
- **`trainer.look`:** the trainer's customisation: skin, hair, hair style, hat, jacket and pants.

A **hotseat match** is saved under its own key as `{ version, players: GameState[], current, rolls }`:
- **`players`:** one full save per trainer, in seat order.
- **`current`:** whose turn it is.
- **`rolls`:** the weather roll for each turn number. It's made once by the first trainer to start that turn (`rollRoundWeather`), so every trainer gets the same weather.

Shared rules (Legendaries, released Legendaries returning) look across all players through `allTrainers`.

**Online matches** use the same shape, plus a few extra fields:
- **`owners`:** which browser (client id) owns each seat.
- **`code`:** the room code.
- **`turnSeconds`:** the host's turn timer.

The match is kept in a separate local slot (`creature-circuit-online-v1`), so it never overwrites a hotseat game. The server (`server/index.mjs`) stores each room's latest match and relays these messages:
- **`state`:** match snapshots, accepted only from the current controller.
- **`feed`:** what watchers mirror: toasts, dice, hops and battle rounds.
- **`ask` / `answer` / `ask-cancel`:** trade and duel prompts, and taking one down again. A prompt still waiting is re-sent, with the same id, after a reconnect.
- **`feed` battles:** `battle-start` carries the battle (and, when re-sent after a reconnect, the `past` events); each event in `battle-events` says which `round` it's from.
- **`host-skip` / `host-play`:** the host's controls.
- **`do-skip`:** sent when the turn timer runs out.

`points` are unspent level-ups. `unlocked` lists the progression-chart nodes already bought. The chart is a skill tree generated per species by `progressionTree` in `creature.ts`: each node has a `requires` list, and every node in it must be unlocked before that node can be bought. Evolving resets `unlocked` for the new stage's chart.

## Move

```json
{
  "id": "fire-claw",
  "name": "Fire Claw",
  "kind": "elemental",
  "type": "fire",
  "cost": { "fire": 2, "neutral": 1 },
  "effort": 1,
  "speed": 0,
  "accuracy": 6,
  "dmgDie": 6,
  "dmgFlat": 0,
  "status": "burn",
  "effect": null,
  "text": "Talons wreathed in flame."
}
```

| Field | Notes |
| --- | --- |
| `kind` | `physical` ignores the type chart and can crit on a maximum accuracy roll. `elemental` uses the type chart and inflicts its `status` on a minimum damage roll. `support` applies `effect`. |
| `cost` | The energy needed to slot the move into the 4-move playbook. `neutral` can be paid with any energy. |
| `effort` | Stamina drained each time the move is used. At 0 Stamina the creature gains 1 Fatigue. |
| `speed` | Added to the user's Speed for that round. |
| `accuracy` | The die rolled against the target's Evasion, or `"sure"` for a move that always hits. |
| `status` | Elemental attacks: the type's status, inflicted when a damage die rolls a 1 (filled in from `STATUS_FOR` when left out). Support moves: a **status move**, inflicting it outright on a hit (no damage). |
| `potency` | Potency N (elemental): the status lands on a damage roll of 1 to 1 + N. |
| `cascade` | Cascade (physical): `true` rerolls the damage die on its top face and adds it, chaining while it rolls its top face; a number (`10`) rolls that die for the chain instead ("Cascade d10"). |
| `purge` | Purge (elemental): `{ "n": 2 }` adds n damage against a foe with any status; `{ "n": 4, "status": "burn" }` only against that status ("Purge: Burn"). |
| `effect` | `{ "self": {stat: n}, "foe": {stat: n}, "heal": n, "staminaGain": n }`. Stat changes last until that creature leaves the field, capped at ±3 per stat. Keep `text` to flavour only: `effectText` appends the exact numbers (e.g. "You get +2 Armor and +2 Ward.") when the game loads. |
| `placeholder` | `true` on generated attacks that hold a grid slot until a real move replaces them. |

### The attack grid (`moves.ts`)
There is one elemental attack for every **typed energy cost** that totals 1–5, and for every type that could lead it. The grid is listed in `ATTACK_SLOTS`, where each slot is a cost plus the type the attack hits as.

**Single type:** 1 to 5 of one type, which is 8 × 5 = 40 slots.

**Two types:** at least 1 of each, at most 5 in total.
- **Uneven splits** hit as the type they spend more of. So 2 Fire + 1 Water is a Fire attack, and 1 Fire + 3 Water is a Water attack.
- **Even splits** (1+1 and 2+2) get one attack for **each** type, so 2 Fire + 2 Grass exists once as a Fire attack and once as a Grass attack.
- That's 8 uneven + 4 even = 12 slots per pair, × 28 pairs = 336 slots.

**Every type leads exactly 47 attacks:** 5 single-type, plus 6 in each of its 7 pairs. A test checks this. Each attack inflicts its hit type's status.

**Slots and Neutral energy:** a slot is keyed by the typed part of the cost plus the hit type (`slotKey`), so Neutral energy is ignored. Fire Claw (2 Fire + 1 Neutral) fills the "2 Fire, hits as Fire" slot. Signature moves don't fill slots.

**Hand-made and placeholder attacks:** hand-made attacks fill their own slots, and every other slot gets a generated placeholder:
- **Ids:** `atk-<type><n>[-<type><n>]`. Even splits add the hit type, e.g. `atk-fire2-grass2-grass`.
- **Names:** built from the types, e.g. Flamethorn Wave (Fire) and Brambleblaze Wave (Grass).
- **Numbers:** set by total cost: d4 at 1, up to d10 + 1 at 5, with more Effort and a slower Speed as the cost rises. Dual attacks get +1 flat damage for needing two energy types.

Dual attacks are only learnable by creatures that generate both energy types.

**Replacing a placeholder:** add a hand-made attack with the same typed cost and hit type. Its slot is then filled and the placeholder stops being generated. Saves that already know the placeholder keep working: its old id is mapped to the new move (`RETIRED_MOVES`) and swapped in when the save loads or an online room sends its match.

## Map node and edge

```json
{ "id": "w12", "name": "Static Badlands", "kind": "wild", "biome": "badlands",
  "x": 8.4, "z": -16.2, "rarity": 0, "level": 3,
  "requires": { "tier": 3, "item": "summit-pick" } }

{ "a": "mangrove", "b": "blackSand", "via": "sea",
  "requires": { "item": "ferry-pass" } }
```

`kind` is one of `wild`, `town`, `city`, `stadium`, `legendary` or `arena`. The `stadium` (Circuit Stadium) works as a town (`isTown`), with a `TOWNS` entry for its market, but is never given a roaming key item. A requirement on an **edge** is met by carrying the listed item; `"wisp": true` also needs a wisp in the Fog Lantern (Lantern Glade), and only applies when entering that area from outside. A requirement on a **node** needs everything it lists. `via` marks special routes: `sea` (a ferry crossing, drawn over water), `portal` (Cloud Island) and `rope` (the Forest Floor).

An `arena` node is an Arbiter's arena that sits away from its city. It names its city in `arenaOf`, and that city's entry in `CITIES` sets `arenaNode` to the arena's id. Amber's Fire Pit on Kilauea island, reached by ferry from Kilauea Forge, works this way. Edges with `"via": "sea"` are ferry crossings: the 3D map leaves them as open water, so islands stay islands.

Wild nodes are generated from the `routes` list in `map.ts` and numbered in order (`w1`, `w2`, …). Saves store node ids, so **add new routes at the end of the list**. Keep nodes at least 5 units apart and routes from crossing: `tests/engine.test.ts` checks both.

## Turn event

Start-of-turn events live in [`src/engine/events.ts`](../src/engine/events.ts) as entries in `EVENTS`. Unlike the data above they are code, because each one has its own effect:

```ts
{
  id: 'caravan', weight: 3,
  when: (s) => true,                       // optional: only roll it when it makes sense
  create: (s) => ({ item: 'elixir', price: 5 }),  // random params, stored on the save (plain JSON)
  view: (s, d) => ({ title, icon, text, choices: [{ id: 'buy', label, disabled? , pick? }, DECLINE] }),
  resolve: (s, d, choice, target?) => ({ text, tone: 'good' }),  // apply the effect
}
```

Use a single-character emoji for `icon`: joined emoji such as 🧑‍⚕️ split into two glyphs on Windows. A choice with `pick: true` asks the player for a creature; `canPick` can refuse some. Every choice of every event is exercised by the tests.

To let players look before they commit:
- **`preview(c)`** on a pick choice returns `{ after, note? }`: the creature as it would be after the choice. The UI shows a before → after stat comparison with a Confirm button, as the Roaming Trader and the Caretaker do. Build `after` with the same helper `resolve` uses, so the preview is exactly what happens (the tests check this).
- **`showcase`** on the view puts a creature on offer in the event window. Tapping it opens its full card.

## Item

```json
{ "id": "pine-resin", "name": "Pine Resin", "kind": "material", "price": 3,
  "icon": "🌲", "allure": { "grass": 2, "charm": 1 }, "text": "Sticky, fragrant." }
```

`kind` is one of `restore`, `treat`, `material`, `totem`, `key` or `charm`. Typed totems (`totem:fire`) and effigies (`effigy:<speciesId>`) are carved at Shrines. An effigy can only be carved for a species in the player's Creature Codex (`dex.seen`).

`allure` (materials only) is the recruiting bonus per type. When offered, a material adds its **highest** allure value among the creature's types, so Pine Resin gives +2 to a Grass creature, +1 to a Charm creature and 0 to others. Which materials each biome yields is set by `BIOME_MATERIALS` in `content.ts`.
