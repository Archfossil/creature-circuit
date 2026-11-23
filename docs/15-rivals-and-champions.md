# Rivals & Champions

The named trainers of Margos. **Rivals** turn up through the season and grow with it; **Champions** are the established field of the Creature Circuit and tour the towns before it. All names, lines and numbers are first drafts for the design team.

- **Who they are:** `src/data/npcs.ts` (`NPCS`). To add one, add a line there: id, name, two favourite types (best loved first), home city, rating, blurb and four lines (greet, gloat, concede, chat). A test checks homes, names and Aces. Then add them to the tables below.
- **The rules:** `src/engine/npcs.ts`. Teams, tours and standings are worked out from the game's seed and the turn, so everyone in a match sees the same ones. Each trainer's save keeps only their own history (`GameState.npcs`).
- **On screen:** Menu → 🥇 Rival Trainers (`app.ts` → `rivalsSheet`), tiles in cities and towns (`npcTiles`, `npcSheet`).

## Rivals

| Name | ID | Favourite types | Home (city id) | Rating | Who they are |
|---|---|---|---|---|---|
| Juniper Vale | `juniper` | Grass / Charm | gloom | 42 | Presses a flower from everywhere they battle, and is sure the next page is yours. |
| Ozzie Crank | `ozzie` | Electric / Steel | thunder | 45 | Builds gadgets that almost work. Their creatures are fond of the sparks. |
| Dex Marlowe | `dex` | Fire / Rock | kilauea | 50 | All confidence, no map. Has been lost in most of Margos. |
| Calla Reed | `calla` | Water / Grass | mangrove | 40 | A patient angler who treats every battle like a long afternoon. |
| Tavi Stormer | `tavi` | Astral / Electric | aurora | 48 | Reads the stars, the clouds and your face, in that order. |
| Bex Ferro | `bex` | Steel / Fire | iron | 52 | A shipyard welder who drills their team at dawn and means it. |
| Lune Okafor | `lune` | Charm / Astral | hollow | 38 | A travelling performer who insists on a curtain call after every match. |
| Corrin Slate | `corrin` | Rock / Steel | canyon | 44 | Says about nine words a day and spends most of them on stones. |
| Pim Quillby | `pim` | Charm / Electric | hollow | 33 | The youngest challenger in Margos, with a notebook of everyone’s moves. |
| Wes Harbor | `wes` | Water / Electric | iron | 46 | A ferry pilot racing everyone, including people who don’t know it. |
| Nadia Ember | `nadia` | Fire / Astral | kilauea | 54 | Cool-headed, fire-hearted, and counting every match toward the Circuit. |
| Sol Fairweather | `sol` | Grass / Rock | canyon | 36 | Cheerful in any weather, win or lose. Unbearably so. |

## Champions

| Name | ID | Favourite types | Home (city id) | Rating | Who they are |
|---|---|---|---|---|---|
| Champion Ivo | `ivo` | Steel / Rock | iron | 95 | The sitting favourite. Immovable, courteous, and undefeated at home. |
| Champion Selene | `selene` | Astral / Charm | aurora | 92 | A quiet strategist who is rarely seen before dusk. |
| Champion Marisol | `marisol` | Water / Grass | mangrove | 88 | Half the coast calls them family. The other half owes them a fish. |
| Champion Dez | `dez` | Electric / Fire | thunder | 86 | A showstopper who has never once entered a room quietly. |
| Champion Okon | `okon` | Rock / Fire | canyon | 84 | A former Arbiter’s apprentice who still bows before every match. |
| Champion Hale | `hale` | Grass / Astral | gloom | 80 | An old forester on one last season, or so they say every year. |
| Champion Bram | `bram` | Charm / Steel | hollow | 78 | A jeweller whose team shines as brightly as the display case. |
| Champion Noor | `noor` | Water / Electric | mangrove | 75 | The newest Champion, with the most to prove and no time to rest. |

## Teams

- **Tiers** unlock on turns 1, 20, 40, 60 and 80. They own 2, 3, 4, 4 and 5 creatures, and bring up to 2, 2, 3, 3 and 3 (never more than the challenger has healthy).
- **The same creatures all season:** they level and evolve (stage 2 from Lv 6, stage 3 from Lv 10). Apart from the Ace, which is always theirs, each game picks them from their favourite types.
- **Rarity:** a Rival's Ace is Prime, with Commons first and Primes later. A Champion's Ace is Apex, with Primes first and Apexes later.
- **Level:** halfway between the season's pace and the challenger's Tier, +1 for Rivals and +2 for Champions.
- **The Ace ★** has the starter's special bond (+1 Vigor, no attribute under 1), goes last, and isn't sent against a lone creature. In battle it's a gold star among the team's dots and has an ★ Ace tag.
- **AI:** Rivals play like trainers, Champions like Champions.

## Meeting them

- **Rivals** are about one in three of the trainers met on roads and meadows and in Trainer Halls, rising by 10% every 5 turns without one (up to 80%), and are who the Rival Challenge event brings. The three nearest home are about at first, and one more every 8 turns. They rest 3 turns between battles with the same trainer.
- **Champions** spend 5 turns at a time in a city or town. Whoever is there can be challenged (a city action) or chatted with (once a stay: friendlier for it, sometimes a treat).
- **Everyone else** is a passer-by with a made-up name: no Ace, no growth, no contact.

## Rematches

Invite anyone you've met from their card, to any city or town but Circuit Stadium and Lantern Glade. They arrive in 2 turns and wait 5. Up to 2 can be arranged at once. Not turning up costs a little goodwill.

## Revenge

Beating someone you've lost to since you last beat them, outside the Finals, on top of the usual prize:

| Losses to avenge | Coins in all | XP, each fighter | Item |
|---|---|---|---|
| 1 | 2× | +4 | Moonberry |
| 2 | 3× | +6 | Hot Spring Elixir |
| 3 or more | 4× | +8 | Energy Tonic |

## Circuit Standings

- **Merits** are simulated, for show: they never take one from a player. Champions finish around the end of the season; most Rivals don't.
- **The top 7** fill the bracket on Turn 100. Left alone, they're all Champions.
- **Contenders 📈:** a Rival who is ahead of you with at least 2 wins, or whom you've battled 5 times, climbs into the top 7, below the very best Champions.
- **The bracket:** you meet the lowest of the seven first and the favourite last. If any contender qualifies, one of your three opponents is a contender: the one who has beaten you most.

## Balance notes

- [ ] **Win rates** (AI playing both sides, levels on pace): Rivals are beaten about 60–85% of the time, Champions 35–70%, Trainer Hall opponents 75–99%.
- [ ] **Losing on purpose for Revenge:** each loss costs coins, Morale and a 3-turn rest, but an Energy Tonic (💰 30) after three is worth watching.
- [ ] **Contenders** who lost to you 5 times still qualify (they're who you've met most). Check that feels earned.

## Still to come

- **Messenger:** texts with replies, and Rivals getting in touch first.
- **Trades** that favour their types.
- **Side challenges:** races to a place, first to beat an Arbiter, Codex races and sillier ones.
