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
| `energy` | Energy generated per type, plus optional `prisma`, which counts as any type. This is a playbook requirement, not a resource spent each turn. |
| `rt` | Recruitment Threshold. The offering roll is 2d6 + totem + offerings, against `rt + floor(level / 3)`. |
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

`kind` is one of `wild`, `town`, `city`, `stadium` or `legendary`. A requirement on an **edge** is met by the listed item **or** the listed movement. A requirement on a **node** needs everything it lists.

## Item

```json
{ "id": "pine-resin", "name": "Pine Resin", "kind": "material", "price": 3,
  "icon": "🌲", "allure": { "grass": 2, "charm": 1 }, "text": "Sticky, fragrant." }
```

`kind` is one of `restore`, `treat`, `material`, `totem`, `key` or `charm`. Typed totems (`totem:fire`) and effigies (`effigy:<speciesId>`) are carved at Shrines.
