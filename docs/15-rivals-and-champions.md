# Rivals & Champions

The named trainers of Margos. **Rivals** turn up through the season and grow with it; **Champions** are the established field of the Creature Circuit and tour the towns before it. All names, lines and numbers are first drafts for the design team.

- **Who they are:** `src/regions/margos/npcs.ts` (`NPCS`). To add one, add a line there: id, name, two favourite types (best loved first), home city, rating, blurb and four lines (greet, gloat, concede, chat). A test checks homes, names and Aces. Then add them to the tables below.
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
| Champion Noor | `noor` | Fire / Water | kilauea | 75 | The newest Champion, with the most to prove and no time to rest. |

## Outfits

Each Rival and Champion has an outfit of their own (`NPC_OUTFITS` in `src/regions/margos/looks.ts`), picked from the player's tops, hats, hair and patterns and worn in battle and portraits. A Rival's base is their favourite type's colour; Champions keep a cape and a gold base. A new Rival or Champion needs an outfit (a test checks).

## Teams

- **Tiers** unlock on turns 1, 20, 40, 60 and 80. They own 2, 3, 4, 4 and 5 creatures, and bring up to 2, 2, 3, 3 and 3 (never more than the challenger has healthy).
- **The same creatures all season:** they level and evolve (stage 2 from Lv 6, stage 3 from Lv 10). Apart from the Ace, which is always theirs, each game picks them from their favourite types.
- **Rarity:** a Rival's Ace is Prime, with Commons first and Primes later. A Champion's Ace is Apex, with Primes first and Apexes later.
- **Level:** halfway between the season's pace and the challenger's Tier, +1 (Champions +2 before turn 20).
- **The Ace ★** has the starter's special bond (+1 Vigor, no attribute under 1), goes last, and isn't sent against a lone creature. In battle it's a gold star among the team's dots and has an ★ Ace tag.
- **Playbooks** are the game's balanced recommendation for each creature, varied by the trainer's own taste in moves (`tasteOf`), which never changes: trainers' sets differ from one another's, with no more than two physical moves in any. **Teamwork** grows with the season (about 1 a tier, Champions 1 more), and every pair has its best Swap Move set.
- **Imprints** (`taughtTo`): many of their creatures (about 60% of a Rival's, 85% of a Champion's) that lack one of the two favourite types are taught it, with 1–2 imprinted energy (Rivals from tier 2; Champions from the start, up to 3) and one or two moves that use it. A creature you imprinted and traded to them keeps yours.
- **In battle** Rivals play like trainers and Champions like Champions: see [03 · Combat Rules](./03-combat-rules.md) and the AI notes in the README. Both swap out of bad matchups, and send in whoever fares best after a knockout, keeping the Ace for last.

## Meeting them

- **Rivals** are about one in three of the trainers met on roads and meadows and in Trainer Halls, rising by 10% every 5 turns without one (up to 80%), and are who the Rival Challenge event brings. The three nearest home are about at first, and one more every 8 turns. They rest 3 turns between battles with the same trainer.
- **Champions** spend 5 turns at a time in a city or town. Whoever is there can be challenged (a city action) or chatted with (once a stay: friendlier for it, sometimes a treat).
- **Everyone else** is a passer-by with a made-up name: no Ace, no growth, no contact.

## Sponsorship

Each city is home to one Champion, whose first type is the city's. A Champion who is **firm friends** with a trainer (rapport 6, `SPONSOR_RAPPORT`) offers to sponsor them, and is accepted face to face.

- **Their city becomes a second home** (`atHome`): its Nabe is doubled, and a wiped-out team or a Homing Feather can go there. It's the Wanderer's perk, for one city.
- **Already at home there** (it's the trainer's home city, or they're a Wanderer): its Stable costs **no Initiative** (`sponsorFree`), whatever the style.
- **One sponsor at a time.** Another Champion's offer replaces the last. A sponsorship is kept even if they fall out later.

## A helping hand

A Rival or Champion who knocks out your whole team offers to help one creature up (`mercyOffer`): it revives with half its hearts (without the Fatigue of Rousing Salts), follows you, and you stay where you are with your Initiative and coins (bar the usual stake). Or you can decline and be sent to rest as usual, which restores everyone. They don't offer in the Finals, or if you're on bad terms (rapport −2 or lower). Passers-by never do. Each has their own line (`mercy` in `texts.ts`).

## Trades

`src/engine/npcTrade.ts`. Face to face (🔄 Trade when they're where you are) a trade can include creatures, one for one. By courier (🔄 Trade in a conversation) it's coins and items.

- **They judge a creature by what it can do.** Its price is about 10 coins a level (what training costs), adjusted by how strong its real attributes make it for its level (growth, Nature, training and events included), how strong its family and Nature will be at Lv 12, and a little for rarity. They pay 10% over for their own types and 15% under for others, and ask 25% over for their own types and 10% for the rest, so nothing they own is a bargain.
- **They protect their team** (`teamBlock`). Whatever the price, they refuse a creature that would end the season weaker than the one it replaces (below 97%), be weaker on their team now (below 95%), is badly weak for its species and level, or would be a second creature outside their types.
- **Materials** that tempt their types (2 or more) count at full price and other items at 80%. They ask 110% for their items.
- **Friends** ask 4% less (rapport 3) or 8% less (rapport 6). Someone miffed asks 25% more.
- **What they have:** four everyday items (no Rainbow Plains materials or universal offerings), and 8 + 4 × tier coins to spend, fresh every 5 turns. Coins you pay them top that up.
- **Their creatures** come at their level, with their Nature, and have to learn to trust you (no Loyalty, perks or Teamwork). The Ace is never for trade, nor your starter or a Legendary. Yours takes the slot on their team (keeping its nickname and Nature) and can't be traded back, so you may well battle it.
- **They text offers:** a small swap by courier, worth a little more to you, or a request to meet about one of your creatures of their types, which they then value at 10% more.

## Rematches and meetings

Arrange to meet anyone you've met from their card or a conversation, to battle or trade, to any city or town but Circuit Stadium and Lantern Glade. They arrive in 2 turns and wait 5. Up to 2 can be arranged at once. Not turning up costs a little goodwill (a chat or a trade there counts as turning up).

## Revenge

Beating someone you've lost to since you last beat them, outside the Finals, on top of the usual prize:

| Losses to avenge | Coins in all | XP, each fighter | Item |
|---|---|---|---|
| 1 | 2× | +4 | Moonberry |
| 2 | 3× | +6 | Hot Spring Elixir |
| 3 or more | 4× | +8 | Energy Tonic |

## Circuit Standings

- **Merits** are simulated, for show: they never take one from a player. Champions finish around the end of the season; most Rivals don't.
- **The bracket has eight places.** Players who qualify take theirs, and the strongest of the standings fill the rest (the top 7 in a solo game). Left alone, they're all Champions. With several players, each Rival and Champion counts at the strongest any of them has made it.
- **Contenders 📈:** a Rival who is ahead of you with at least 2 wins, or whom you've battled 5 times, climbs into the top 7, below the very best Champions.
- **Seeding:** you meet the weakest of the field first, unless a contender has earned a place against you: then you meet them first. Their other matches are decided by strength, so an upset can change who's waiting in the final.

## Messenger

The 💬 button at the top right of the map, by ☰, shows how many are unread and opens every conversation. (Each trainer's card in Menu → 🥇 Rival Trainers opens theirs.) Voices are in `src/regions/margos/voices.ts` (fifteen lines each; `{you}`, `{merit}`, `{place}`, `{thing}` and `{creature}` are filled in) and the rules in `src/engine/messenger.ts`.

- **They write first:** only people you've met, at most one text every 3 turns from anyone, and every 8 from the same person. It's a rematch offer after a battle, congratulations on a Merit (as soon as there's a free moment), news of their own, a hello, or a treat by courier from someone friendly. Being stood up always gets a text.
- **Answers:** a kind reply warms them to you. A cheeky one only costs goodwill with a firm friend. Accepting a rematch sets it at the nearest city or town. A question lapses after 6 turns.
- **You write first:** say hello, bring up the last match, ask where a Champion is (one you haven't met, if there is one), or invite them to a rematch. Once every 4 turns with each person (invitations aside).
- The last 16 texts with each person are kept.

## Side challenges

Menu → 🥇 Rival Trainers → 🎯 Challenges (`src/engine/dares.ts`). Set one from a conversation, or take up one they text. Whoever finishes first wins.

| Kind | What |
|---|---|
| 🏁 Race | Reach a place 10–18 steps off. They set out from about as far away and cover 3 steps a turn (4 if their rating is 50 or more) |
| 🏟️ Arbiter | Beat an Arbiter neither of you has beaten (about 9–12 turns) |
| 📖 Codex | See 5 new Codex creatures (7–9 turns) |
| 🗿 Recruit | Recruit 2 of a type (8) |
| 🥇 Solo | Knock out 3 creatures with a single creature, over any number of battles (6) |
| 🌙 Night | Win 4 battles at night (8) |
| 🍲 Chanko | Eat a Chanko Nabe in 3 different cities (10) |
| 🌊 Coasts | Visit Iron Coast and Black Sand Cove (10) |
| 👣 Walk | Walk 25 steps (6) |
| 🧺 Finds | Find 8 items while exploring (7) |
| 🛠️ Craft | Craft 3 items (7) |
| 🍓 Treats | Feed 8 treats (6) |

- **Nothing that hangs on the weather:** a trainer can't choose it. (Night is fine: every even turn is one.)
- **Ideas:** each person has three every 5 turns: one of the first three kinds and two sillier ones.
- **Pace:** they finish at the end of a set turn (Champions a turn sooner), shown to the trainer, with a note when they're halfway. A trainer who finishes the same turn wins.
- **Limits:** one with each person, two at once, and 4 turns between challenges with the same person. Not with someone miffed.
- **Prize:** 6 + 3 × Tier coins and a Dewberry (a Moonberry for the first three kinds). An optional wager of 5 or 10 coins, if both can cover it, goes to the winner. Losing costs only the wager.
- Giving up, or a place reached by being sent home, doesn't win it.

## Balance notes

- [ ] **Win rates** with smart playbooks and swaps (the challenger: an AI with a random team that knows recommended playbooks but never swaps). Rivals are beaten about 85% of the time to turn 25 and 45% after, Champions 50–75% to turn 25 and 20–35% after. A person who swaps and builds a team should do better; watch the late Champions.
- [ ] **Losing on purpose for Revenge:** each loss costs coins, Morale and a 3-turn rest, but an Energy Tonic (💰 30) after three is worth watching.
- [ ] **Contenders** who lost to you 5 times still qualify (they're who you've met most). Check that feels earned.
