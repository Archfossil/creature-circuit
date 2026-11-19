# Data Schemas

These are the JSON templates for the game's content. The TypeScript versions, which the engine actually checks, are in [`src/data/schema.ts`](../src/data/schema.ts). The example content is in `src/data/`:

| File | Contents |
| --- | --- |
| [`species.ts`](../src/data/species.ts) | 52 example creatures (8 types × 6, the Emberfish line, 2 legendaries) |
| [`moves.ts`](../src/data/moves.ts) | Master Move List: physical, support, 4 elemental moves per type, 8 signature moves |
| [`map.ts`](../src/data/map.ts) | Margos: 8 cities, 6 towns, Circuit Stadium, 2 legendary nodes, the wild routes and the type pool for each biome |
| [`content.ts`](../src/data/content.ts) | Natures, abilities, affinity powers, items, offering materials, weather and the seasonal weather dice |

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
  "affinity": "slipstream",
  "signature": "sig-caldera",
  "movement": null,
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
| `base` | Level 1 attributes. Health = Vitality = `vigor` by default. In `species.ts` these are generated from rarity and stage plus a stat `bias`. |
| `energy` | Energy generated per type, plus optional `prisma`, which counts as any type. This is a playbook requirement, not a resource spent each turn. In `species.ts` it is generated from rarity and stage, then multiplied by `ENERGY_SCALE` (2). Energy and Prisma nodes on the progression chart each add `NODE_ENERGY` (2). |
| `rt` | Recruitment Threshold. The offering roll is 2d6 + totem + offerings, against `rt + floor(level / 3)`. |
| `biomes` | Biomes the species prefers. A wild node offers it when its biome's type pool (`BIOME_TYPES` in `map.ts`) includes the species' first type, and it is preferred over same-type species without that biome. The Creature Codex lists these nodes. |
| `ability` | An overworld passive (see `ABILITIES`). It is active only while the creature is **Following**. |
| `affinity` | The swap-in team-up power (see `AFFINITIES`). It triggers when this creature is swapped in as the **Alpha**. |
| `signature` / `movement` | Unlocked through progression-chart nodes. Movement abilities are `fly`, `sail`, `tunnel`, `portal` and `wayfind`. |
| `look` | Drives the procedural low-poly model. `shape` is one of `blob, quad, bird, serpent, golem, sprite, fish`. `crest` is one of `horns, ears, flame, leaf, crystal, fin, halo, spikes, antenna, plates`. |

## Creature instance (save data)

Each creature the player owns is saved as an instance of a species:

```json
{
  "uid": "k3j9x0aa", "species": "emberfish", "nickname": null,
  "level": 3, "xp": 4, "points": 1,
  "nature": "timid", "morale": 6, "loyalty": 2, "perks": 0,
  "bonus": { "speed": 1, "health": 1 }, "extraEnergy": { "fire": 1 },
  "unlocked": ["a", "c"], "signature": null, "movement": null, "capstone": false,
  "health": 4, "vitality": 3, "stamina": 6, "fatigue": 0, "ko": false,
  "playbook": ["ember", "splash-jet", "quick-jab"],
  "affinity": { "<other uid>": 2 },
  "wins": 3, "losses": 0
}
```

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
| `effect` | `{ "self": {stat: n}, "foe": {stat: n}, "heal": n, "staminaGain": n }` |

## Map node and edge

```json
{ "id": "w12", "name": "Static Badlands", "kind": "wild", "biome": "badlands",
  "x": 8.4, "z": -16.2, "rarity": 0, "level": 3,
  "requires": { "tier": 3, "item": "summit-pick" } }

{ "a": "mangrove", "b": "blackSand", "via": "sail",
  "requires": { "item": "ferry-pass", "movement": "sail" } }
```

`kind` is one of `wild`, `town`, `city`, `stadium`, `legendary` or `arena`. A requirement on an **edge** is met by the listed item **or** the listed movement. A requirement on a **node** needs everything it lists.

An `arena` node is an Arbiter's arena that sits away from its city. It names its city in `arenaOf`, and that city's entry in `CITIES` sets `arenaNode` to the arena's id. Amber's Fire Pit on Kilauea island, reached by ferry from Kilauea Forge, works this way. Edges with `"via": "sail"` are sea routes: the 3D map leaves them as open water, so islands stay islands.

Wild nodes are generated from the `routes` list in `map.ts` and numbered in order (`w1`, `w2`, …). Saves store node ids, so **add new routes at the end of the list**. Keep nodes at least 5 units apart and routes from crossing: `tests/engine.test.ts` checks both.

## Turn event

End-of-turn events live in [`src/engine/events.ts`](../src/engine/events.ts) as entries in `EVENTS`. Unlike the data above they are code, because each one has its own effect:

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

## Item

```json
{ "id": "pine-resin", "name": "Pine Resin", "kind": "material", "price": 3,
  "icon": "🌲", "allure": { "grass": 2, "charm": 1 }, "text": "Sticky, fragrant." }
```

`kind` is one of `restore`, `treat`, `material`, `totem`, `key` or `charm`. Typed totems (`totem:fire`) and effigies (`effigy:<speciesId>`) are carved at Shrines. An effigy can only be carved for a species in the player's Creature Codex (`dex.seen`).

`allure` (materials only) is the recruiting bonus per type. When offered, a material adds its **highest** allure value among the creature's types, so Pine Resin gives +2 to a Grass creature, +1 to a Charm creature and 0 to others. Which materials each biome yields is set by `BIOME_MATERIALS` in `content.ts`.
