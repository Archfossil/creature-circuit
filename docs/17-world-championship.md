# The World Championship: plan

**Status: proposal, for after Margos is finished.** It builds on [16 · Region Packages](./16-region-packages.md). The one part already built is the shared regional Circuit (`engine/circuit.ts`).

## The goal

**This plan is only for World Circuit events. Casual games stay exactly as they are: turn by turn, everyone watching, solo, hotseat or online.**

Eight regions of up to six players play their own seasons. Each region's Creature Circuit produces one Champion, and the eight Champions meet in the World Championship. It's part of the game: a shared world, a feed of what's happening elsewhere, and brackets everyone can see.

### Decided

| Question | Decision |
|---|---|
| How many regions? | Build towards **8**. Margos is finished first. |
| The regional Circuit | One bracket of 8 per game: every player who qualifies, backfilled with Champions and Rivals. One winner. **Built.** |
| How is a world held together? | As a small World record linking independent regional matches. |
| What do players see of other regions? | A feed of important events, and every bracket. |
| Casual play | Unchanged: turn-based, as it is now. |
| World Circuit turns | **One game day per real day**, played whenever you like, with a cushion for busy days. Nobody waits for anyone's turn. |
| World Circuit battles between players | Moves chosen in secret, played when both are in, live or over notifications, on a chess clock. |
| Where do battles run? | Casual games: on players' devices, as now. World Circuit events: on the server. |
| Slow regions | The calendar moves by itself, so a region can't fall behind. (This replaces moving a late region's turn dial.) |
| Absent players | Bots take over, as the norm. |
| Length | Two months to a World Champion, then an off month for balance and updates. |

## Why eight

| | |
|---|---|
| Margos | 8 starters, one of each type |
| Seven more regions | 4 balanced dual-type starters each, so all 28 pairs are used exactly once |
| Starters in all | 36: every slot in the roster table, once each |
| Players | up to 48 |
| World bracket | 8 Champions: quarterfinals, semifinals, final |

**Before there are eight**, the world bracket stays at 8 places:

| Regions | Players | Who qualifies |
|---|---|---|
| 2 | 12 | The top 4 of each (the semifinalists) |
| 3 | 18 | The 2 finalists of each, and 2 wildcards from the beaten semifinalists |
| 4 | 24 | The 2 finalists of each |
| 5–7 | 30–42 | Every Champion, and the strongest runners-up |
| 8 | 48 | Champions only |

A region won by a computer trainer sends its best-placed player instead.

## The calendar

A three-month cycle, so **four World Championships a year**. Two calendar months are 59 to 62 days; the shortest pair (January and February) just fits.

| Days | What happens | Turns |
|---|---|---|
| 1–50 | **The season:** one game day each | 1–100 |
| 51–53 | **Regional Circuits:** a round a day | |
| 54 | Entries locked and checked. Worlds draw | |
| 55–56 | Worlds quarterfinals | |
| 57–58 | Worlds semifinals | |
| 59 | **World final** | |
| 60–62 | Spare, when the months allow | |
| Month 3 | **Off month:** balance, updates, new content, sign-ups | |

Each in-game season is 25 turns, so about 12 or 13 real days. If events need more slack, an 80-turn season would take 40 days, but it would have to be rebalanced. Start with 100.

## Playing a season

### One game day per real day

Odd turns are day and even turns are night, so **one real day is one game day: a Day turn and a Night turn, in one sitting.** At about 3 minutes a turn that's some **6 minutes a day**.

- A new game day opens for everyone at the same moment, with one notification: *"Day 12 has begun."* It's never *"it's your turn"*.
- Everyone plays the same day on their own, at any time, in any order. No one waits for another player.
- A game day can be played in two sittings, a turn at a time.

### The cushion

- A player may be **up to 3 game days behind** the calendar, and can catch up in one sitting. A busy day or a weekend away costs nothing.
- Beyond 3, a bot plays their **oldest** day, one per real day, until they're back. They always keep the 3 newest.
- Nobody can play ahead of the calendar.
- The season closes at the end of day 50. Days still unplayed then are played by the bot ([Decision 1](#decisions-needed)).

**Reminders:** one a day at most, at a time the player picks, and a warning before a bot is due to play.

The calendar moves by itself, so a region can't fall behind, and a slow player only affects themselves. Rivals, Champions and their Merits already follow the turn number.

### What's shared, when players are on different days

| Shared thing | Rule |
|---|---|
| Weather, seasons, day and night, where things are sold | Fixed for each turn and the same for everyone, whenever they play it |
| **Legendaries** | Whoever **really** gets there first claims it. The server decides, and the others find its grounds quiet |
| Where other trainers are | Where they were when they last played, with their game day shown |
| Gifts and couriers | Arrive in the other player's next turn |
| Trades | An offer waits for an answer; nothing moves until it's accepted |
| **Duels** | Against the other trainer's team as they last left it, commanded by AI. Live, only if both are here and both want to. For practice XP either way: no wager and no harm to someone who isn't there |
| The feed | In real time, with the game day each event happened on |

A player who is behind sees the feed as it comes, so they may learn that a Legendary is taken before reaching that day. That's the cost of being late.

### Bots

| Level | What it does | When |
|---|---|---|
| 1. **Caretaker** | Rests, tends and feeds the team, trains nearby. Never spends more than basics, trades, releases or recruits over someone | A day beyond the cushion |
| 2. **Contender** | Also travels, recruits, spends chart points and challenges Arbiters | After 5 bot days in a row, or an empty seat from the start |
| 3. **Battle** | Commands the player's own team in a match, from the playbooks they set | Their clock runs out |

- The player takes over again the moment they return.
- **Morale, Loyalty and Legendaries are protected** on a bot's days: a Caretaker keeps them from falling.
- A team played by a bot for more than half its season doesn't qualify for Worlds. The next player in the standings takes the place.
- Empty seats are Contender bots under a Rival's name.
- **Built already:** in casual games, the host can send in a bot for a Circuit match.

## Battles between players

In 400 simulated 3v3 matches between AI teams, a match took **13 rounds on average**, 17 or fewer nine times in ten, and 23 at most. Choosing takes seconds. Being there together is the problem, so nobody has to be.

1. **Each player secretly submits a move.** The server plays the round when both are in and notifies both.
2. **Both here?** It plays as a live battle, in minutes.
3. **Not both?** It plays out over the day, a notification at a time. A player can also queue what to do next: who to send in after a knockout, or a move to use *"unless I change it"*.
4. **A chess clock** stops stalling: each player has **8 hours of waiting time per match**. It only runs while the match waits on them alone.
5. **Out of time?** A bot commands the rest of their match, and they can take back over for any round they reach in time.

So the two clocks hold **16 hours** between them, and **every round has a deadline**: a day in the regional Circuits and the final, two days in the other Worlds rounds.

- Players see when their opponent is usually around, and can propose a time to play live. Neither has to accept.
- **Night hours:** each player picks 8 hours when their clock doesn't run. Players with opposite nights can run up against the deadline. If a match isn't over by then, bots finish it for both sides.
- Anyone in the world can watch a match as it plays, or afterwards from its log.
- The **World final** is best played live, at a time both agree, with everyone watching. If they can't agree, it plays on the clock like any other.

## The World record

A few KB, kept on the server. Regions never wait for each other, and in a World Circuit neither do players.

```
World
  code, name, official?, rules version
  calendar: start date → every deadline above
  regions: [{ region, players (each at their own game day), status, qualifiers }]
  entries: [{ player, region, team (frozen), checked? }]
  bracket: the same shape as a regional Circuit
  feed: newest first, capped
```

- **Regional season:** each player's own save, kept on the server, plus the little they share (above). Unlike a casual match, there's no single copy passed from hand to hand.
- **Entry:** a frozen copy of a qualifier's active team, taken when their regional Circuit ends. Tens of KB at most.
- **Worlds match:** both entries restored to full, 3v3, no Nabes, no items, levels as earned. One battle a match; the final is best of three if played live.
- **Worlds bracket:** Champions are seeded by their regional record, so that the top two can only meet in the final.

### The feed

Each region reports as it plays. Everyone in the world can read it, filter it by region, and tap through to the bracket.

| Always | When it matters |
|---|---|
| A Merit won | First Merit of a region, first to 4, first to all 8 |
| A Legendary recruited or lost | A Legendary changes hands within a season |
| A new game day or season begins | A player is played by a bot, or is back |
| A player qualifies | An upset: a contender Rival, a low seed |
| Every Circuit and Worlds result | The bracket as it stands |

It's a selection from the World Log each trainer already keeps (`Deed`), so most of it exists. Shopping, crafting, messages and team changes stay private. **Teams and playbooks are never in the feed**; a Worlds opponent's are hidden until the battle.

## What has to be built

| # | Piece | Size | Notes |
|---|---|---|---|
| 1 | **Shared regional Circuit** | M | **Done** |
| 2 | Region packages | L | [16](./16-region-packages.md) |
| 3 | **A database** for rooms and worlds | M | Rooms are in memory now: a restart or an idle day loses them |
| 4 | **Player identity** | M | A name and a recovery code at first. A browser id can't be relied on for two months |
| 5 | World record, codes, linking rooms | M | |
| 6 | **The feed**, and brackets in it | M | |
| 7 | Entries: freeze, export, check | M | Legal levels, charts, energy, moves, Codex |
| 8 | **Separate days:** each player's season on the server, played at their own time; the shared rules; the calendar and cushion | **L** | The biggest new piece, and separate from casual online play, which keeps working as it does |
| 9 | **Battles on the server:** secret moves, chess clock, queued choices, notifications | **L** | The engine already takes both players' secret choices each round and has no screen code |
| 10 | **Bots** 1 and 2 | **L** | Bot 3 is most of today's battle AI |
| 11 | Worlds bracket, match screens, watching and replays | M | |
| 12 | Locked rules per world | M | A world finishes on the rules it started with |
| 13 | Hosting | S | A paid plan that stays awake, with a database and backups |

One server feature (9) answers three problems: stalling, cheating, and having to be there.

**Casual games and World Circuit events**

| | Casual | World Circuit |
|---|---|---|
| Who sets it up | Any group | The organisers |
| Turns | **One player at a time, everyone watching, as now** | One game day a day, each on their own |
| Turn timer, Skip, Play for | As now | Not used: the calendar and bots |
| Calendar | None | Fixed |
| Duels and Circuit matches | Live, picking each round, as now | Secret moves on a chess clock |
| Battles run | On players' devices | On the server |
| Absent players | The host can skip, play for them, or send in a Circuit bot | Bots |
| Linked worlds | Possible, for groups who want several regions at their own pace (stage B) | Always |

Checking an entry can show a team is *possible*, not that it was *earned*. For official play, the steps are: server-run regional Circuit battles, then logging each turn on the server so a season can be reviewed, and only if needed running whole seasons there.

## The order

| Stage | What players get | Needs |
|---|---|---|
| **0. Finish Margos** | A complete first region | Below |
| **A. By hand** | Two regions, entries exported, Worlds duels played in an ordinary room, bracket kept by the organisers | 2, 7 |
| **B. Linked worlds** | World codes, feed, brackets, entries sent automatically. Regions still play as casual games | 3–6, 11 |
| **C. Clock battles** | Player battles that don't need both there. Worth having alone: Worlds can use them while regions are still casual | 9 |
| **D. World Circuit** | Separate days, calendar, cushion, bots, checked entries, locked rules | 8, 10, 12, 13 |

Test the pace before building it: a few friends, **one game day per real day**, with what exists now, for two weeks. Then A before paying for B, and one full two-month event in D before calling any official.

**Finishing Margos** means, at least: its 348 placeholder creatures replaced (or the Codex made smaller on purpose), Swap Moves and Instincts signed off, the remaining placeholder icons, the logo and app icon, and the balance notes in docs 11–15 answered.

## Risks

| Risk | What we do about it |
|---|---|
| Players drift away over two months | Bots, short daily play, the feed, and a fresh start every quarter |
| Daily play feels like a chore | 6 minutes, a 3-day cushion, one reminder a day at most |
| Players on different days cause conflicts | Little is shared, and the server decides it; tests play six seats in random order against each other |
| It's lonely compared with a shared table | The feed, watching matches, a live final. Casual games keep the shared table |
| Slow matches drag | Clocks, a deadline for every round, and bots to finish |
| Cheating in official play | Server battles, checked entries, logged turns |
| A season can't be finished by a balance patch | Rules locked per world; patches wait for the off month |
| Cost | Nothing until stage B; then a small server and database, and more for running battles and seasons |
| Eight regions take years | Every stage works from two regions up |

## Decisions needed

| # | Question | Recommendation | Needed by |
|---|---|---|---|
| 1 | When do unplayed days run out at the end of the season? | At the end of day 50, with no cushion past it: the bot plays what's left, and Circuits draw on day 51. The last three days' reminders say so | D |
| 2 | How big is the cushion? | 3 days. Try 2 and 5 with friends | D |
| 3 | How much time on the clock? | 8 hours a match, with 8 night hours that don't count | C |
| 4 | Can a duel during the season be refused? | An AI-commanded one needs no answer and costs the absent player nothing, so no. A live one, yes | D |
| 5 | Are entries the active team of 3, or 6 to choose from? | 3 at first | B |
| 6 | Can one person play in two regions of a world? | No | B |
| 7 | What does the World Champion win? | Cosmetics and a place in the hall of records. No advantage next season | D |
| 8 | Is trading allowed in a World Circuit? | Within a region, recorded in the feed, not in Winter (so nobody gifts a rival a team) | D |
| 9 | Do beaten semifinalists play for third place? | If there are spare days | D |
