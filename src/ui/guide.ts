// How to Play: the full rules guide, organized into categories and topics (opened from the title
// screen and ☰ Menu), plus the short welcome tour shown when a journey starts. Content only; the
// App renders it. In topic text, a line starting with "- " is a bullet.

export interface GuideTopic { id: string; title: string; body: string[] }
export interface GuideCategory { id: string; icon: string; label: string; topics: GuideTopic[] }

export const GUIDE: GuideCategory[] = [
  {
    id: 'basics', icon: '🧭', label: 'Basics',
    topics: [
      { id: 'goal', title: 'The goal', body: [
        'Earn 8 Merits by beating the Arbiters of Margos’s eight cities, then be standing in Circuit Stadium when Turn 100 ends.',
        'Everyone who makes it fights an 8-trainer bracket. Win it to be crowned Champion.',
        'The season has four seasons of 25 turns each. The Turn pill (top left) shows where you are; tap it for the calendar and weather.',
      ] },
      { id: 'turns', title: 'Turns & Initiative', body: [
        'Each turn you get 5 Initiative (the diamonds on the location card).',
        '- Moving to an adjacent node costs 1. Tap a glowing node, then Travel, or double-tap it. Double-tapping the city or town you’re in opens its menu (Settings can turn both off).',
        '- City actions such as the Stable, Market and Arbiter usually cost Initiative too. The cost is shown on each option.',
        '- Looking around a city’s Market, Carving Shrine or Workbench is free. Only your first purchase, carving or craft there each turn costs Initiative; after that, use it as much as you like that turn.',
        '- End Turn when you’re done. Unspent Initiative doesn’t carry over, so camping can turn it into rest (see Places → Camping).',
        'Planning ahead? Tap any node and choose 📍 Mark as next stop. A flag in your colour marks it on the map as a reminder. Only you see it (online you can set it while others play), and it clears when you arrive. Lost track of it? Tap “📍 Your next stop” on your location card to fly the map there.',
        'Moving the map: drag it to pan and pinch or scroll to zoom. On a keyboard, hold W A S D or the arrow keys to pan.',
      ] },
      { id: 'explore', title: 'Exploring', body: [
        'Entering a wild node explores it with a d6:',
        '- 1–2: nothing.',
        '- 3–4: a wild creature (or a roaming trainer) wants to battle.',
        '- 5–6: you find items or coins.',
        '- 🕯️ Lure Incense makes your next explore a wild encounter. 💨 Hush Smoke does the opposite: on your next explore a 3 is Nothing and a 4 is a find, so nothing can battle you. Lighting one puts the other out.',
        'For creatures, rarity star dice decide Common, Prime or Apex. Rare areas and higher Tiers roll more stars.',
      ] },
      { id: 'travel', title: 'Getting around faster', body: [
        'The map is big. Besides walking one step per Initiative:',
        '- 🚲 Bike (Lumber Hollow): once a turn, roll a d6 and ride up to that many steps for free. No exploring on the way or where you stop.',
        '- 🚕 Taxi Ticket (city markets): from a city to any other city, but it uses up the rest of your Initiative.',
        '- 🕊️ Homing Feather: fly back to your home city from anywhere (a Wanderer picks any city they’ve rested at). Also uses up your Initiative.',
        '- 🥜 Trail Mix: +1 Initiative, once a turn.',
        '- Events: a 🎈 Hot Air Balloon by day and a 🚌 Night Coach by night offer rides to faraway cities.',
        'None of these work on Cloud Island or the Forest Floor, and Bike rides keep to land and the usual gates.',
      ] },
      { id: 'events', title: 'Events', body: [
        'From the second turn on, each turn starts with something happening on the road: a trader, a caretaker, a storm, a rival…',
        'Most can be declined; a few (storms, thieves) make you choose. Close the window to check your team first: the event waits at the bottom of the screen, and you can’t end the turn until you answer it.',
        'Trades and Nature changes show a before → after stat comparison before you confirm.',
      ] },
      { id: 'daynight', title: 'Day & night', body: [
        'Day and night alternate: odd turns (1, 3, 5 …) are day, even turns (2, 4, 6 …) are night. The pill next to the turn counter shows which it is, and the map darkens at night.',
        '- Wild creatures keep their own hours. Diurnal creatures (mostly Fire, Grass and Electric) only come out by day, nocturnal ones (mostly Astral and Charm) only at night, and the rest any time.',
        '- Each creature’s Codex page says when it’s out, and the Codex can filter by day or night.',
        '- Some events only happen by day (trainers, trades, errands) and some only at night (campfires, stars, trouble after dark).',
      ] },
      { id: 'weather', title: 'Weather & seasons', body: [
        'The weather is rolled at the start of each turn. It can boost or weaken attack types, change Speed, and bring out other creature types when exploring.',
        'Tap the weather pill (top left) to see what today’s weather does.',
      ] },
    ],
  },
  {
    id: 'creatures', icon: '🐾', label: 'Creatures',
    topics: [
      { id: 'following', title: 'Following', body: [
        'One creature follows you on the map. It leads every battle, uses its Ability on the overworld, and gains Morale every other turn.',
        'At the start of each turn you’re asked who follows you. Tap the Following chip (top left) any time to switch, or turn the prompt off in Settings.',
        'With nobody following, you choose who goes first in each battle.',
      ] },
      { id: 'recruit', title: 'Recruiting', body: [
        'Defeat a wild creature, then offer a totem plus up to 2 offerings. Roll 2d6 + bonuses against its Recruitment Threshold (RT).',
        '- A Plain Totem gives +1. A typed Totem gives +3 for that type (−1 for others). An Effigy gives +5 for its species (−3 for others).',
        '- Offering materials appeal to certain types (shown in your Bag). Berries help any creature.',
        'Up to 3 creatures travel with you. The rest rest in totems; swap them for free in any city or town (🔄 Swap Team).',
      ] },
      { id: 'grow', title: 'Levels & the chart', body: [
        'Every creature that fights earns XP when the battle ends, win or lose, and knocking out a foe earns a bonus. Running away earns nothing.',
        'Every 10 XP is a level and a point to spend on the skill tree on the back of its index card. A node opens once every node linked above it is bought.',
        'Evolving needs the whole center path. Side branches are optional, but are left behind when it evolves. Once a final stage’s chart is complete, extra points train +1 to a stat of your choice.',
      ] },
      { id: 'playbook', title: 'Playbooks & energy', body: [
        'Each creature knows up to 4 moves. Energy is a requirement, not spent per use: a move fits if the creature generates enough of each type it needs.',
        '- The playbook editor crosses out the energy each move takes and counts what’s left. Its side panel shows the creature’s stats and your picks so far, with rough damage for each. The stats your picks use (Power for Physical moves, Focus for Elemental ones) light up.',
        '- On a phone, tap a move to see what it does with this creature (damage, accuracy, Effort, speed) and why it might not fit, then ➕ Add move?. Double-tap a move to add or remove it straight away. Tap a stat to see what it does.',
        '- Filter by type or by Physical / Support, sort by cost, damage or speed, and tick “Only moves that still fit”.',
        '- ✨ Recommend moves? suggests a set for physical power, elemental power, a balanced spread, or against a type.',
      ] },
      { id: 'morale', title: 'Morale & Loyalty', body: [
        'Happy creatures (Morale 7+) earn Loyalty every turn, and Loyalty unlocks their Nature perks for good.',
        'Unhappy ones (Morale 3 or less) get a ⚠️ warning. If you don’t raise their Morale, each later turn ends with a d10 roll against their Loyalty: above it, they leave; otherwise they lose 1 Loyalty.',
        '🤝 Your starter shares a special bond with you: it never leaves over low Morale, and it can’t be released or traded away, so you always have a partner.',
        'Treats, wins, rest and Following all lift Morale. Tap Morale or Loyalty on a card for details.',
        'Legendaries lose 1 Loyalty every turn no matter what, and return to their grounds on the map at 0.',
      ] },
      { id: 'codex', title: 'Creature Codex', body: [
        'Every creature you meet in the wild or in a trainer’s team is recorded (☰ Menu → Creature Codex).',
        'Search it by name, or filter by type, biome, rarity and whether you’ve seen or recruited it. Each page lists the nodes to explore for it (or its earlier stages) and its favorite offerings.',
        'You can carve an Effigy of any creature in your Codex at a Carving Shrine.',
      ] },
    ],
  },
  {
    id: 'battles', icon: '⚔️', label: 'Battles',
    topics: [
      { id: 'combat', title: 'How a round works', body: [
        'Both sides pick an action. The faster creature acts first (a tie is a Clash: both roll, and the lower roll takes the difference as damage and goes second; equal rolls flip a coin for who goes first).',
        '- Accuracy: roll the move’s die against the foe’s Evasion.',
        '- ⌖ Zeroing In: a miss gives that creature +1 on its next accuracy roll, stacking up to +3 over several misses. The next roll uses it up, and swapping out loses it. Some moves zero in harder (Pounce: +2); all-or-nothing moves (Rampage) never do.',
        '- Physical moves use Power vs Armor and crit (double damage) on a max accuracy roll. Some (Claw, Rampage) have wide crits marked ✸ on their card, e.g. ✸5+ crits on a 5 or 6.',
        '- Elemental moves use Focus vs Ward and the type chart, and inflict a status when the damage die shows a 1. Some roll an extra die (Meteor: d10+d4); then a 1 on either die inflicts it.',
        'Damage drains the Health bar, then a Vitality heart. Out of hearts means knocked out.',
      ] },
      { id: 'battlelog', title: 'Battle Log', body: [
        'Tap 📜 Log at the top of a battle (or press L) to see everything so far, round by round: each move used, every accuracy and damage roll with the numbers behind it, statuses, buffs, Clashes and coin flips.',
        'After a battle, ☰ Menu → Last Battle Log shows it again (until you reload the page).',
      ] },
      { id: 'types', title: 'Types', body: [
        'Each Elemental move shows how it lands on the current opponent: 2× Super effective, ½ Resisted, No effect…',
        'In battle, 🔺 Types (or T) opens the chart for the matchup. The full chart is in ☰ Menu → Type Chart.',
        'The small badge on each type is the status its Elemental attacks can inflict. Below the chart, a battle’s chart lists the statuses your moves can inflict and the ones the opponent’s types may inflict, before any of them happen.',
        'Physical attacks ignore the type chart.',
      ] },
      { id: 'stamina', title: 'Stamina & Fatigue', body: [
        'Each move costs Effort from Stamina. At 0 Stamina a creature gains Fatigue, and a fatigued creature rolls a d10 before acting and may lose its turn.',
        'In battle, the thin blue bar under your Health is Stamina. The diamond beside it is Fatigue: grey at 0, a red number when fatigued. The opponent’s nameplate shows its Fatigue diamond too. Hover or tap one to see the odds of losing a turn.',
        'Catch Breath (or B) restores Stamina. Status effects are explained in ☰ Menu → Status Effects, or tap a status tag in battle.',
      ] },
      { id: 'teamwork', title: 'Swap Moves & Teamwork', body: [
        'From round 2 you can swap (S). The creature coming in is the Alpha, and it uses a 🔁 Swap Move at once, often borrowing from the partner it replaces. The swap screen shows what each swap will do right now.',
        'You choose the Swap Moves. Each creature’s card has a slot for every teammate: the move it uses when it swaps in for that one. So Sproutle swapping in for Puddlit can use a different move from Sproutle swapping in for Zapup (or Puddlit swapping in for Sproutle). Unset slots use the creature’s favourite.',
        '- Neutral Swap Moves (Tag Strike, Shield Pass, Slipstream, Siphon, Rally) are open to every pair.',
        '- Each type has two more. A pair can use one if either creature has that type; the first needs Teamwork 1 with that partner, the second Teamwork 2. Typed hits inflict their type’s status on a 1–2.',
        '🤝 Teamwork is how well two of your creatures work together. Every 2 Teamwork the Alpha has with its partner adds +1 to its Swap Move (more damage, more borrowed Armor and Ward, more healing).',
        '- Travelling together: every pair on your active team gains 0.2 Teamwork each turn. You’re told at the start of a turn when a pair reaches a new point.',
        '- Swapping in battle: a pair gains +1 Teamwork the first time one swaps in for the other in a battle. Swapping them back and forth again in the same battle adds nothing more.',
        '- Cap: a creature’s Teamwork with any partner can’t go above half its level, so it keeps growing as your team levels up.',
        'Each creature’s card lists its Swap Move and Teamwork for every teammate. Tap Change there (or on the swap screen) to pick another.',
      ] },
      { id: 'readouts', title: 'Move readouts', body: [
        'Tap a move to see what it will roll, in order: turn order, Stamina, the accuracy die against the foe’s Evasion (plus any ⌖ Zeroing In, and what a miss would add), then the damage die plus Power or Focus minus Armor or Ward. Confirm to use it.',
        'Every roll is explained as it happens. Turn on Fast battles in Settings to skip all this.',
        'Keys: 1–4 pick a move (Enter confirms, Esc goes back), B catch breath, S swap, R run, T type chart.',
      ] },
      { id: 'trainers', title: 'Trainers & Arbiters', body: [
        'Every city has a Trainer Hall: battle a local trainer once per turn (a city action).',
        'Each city’s Arbiter guards a Merit. Their arenas have tricks that favour the Arbiter (ice floes, fog, lightning…), described before you challenge. A prepared trainer can use some of them: Watson’s lightning heals Electric creatures, yours included.',
        'Cliff’s Crumbling Plateau is a timer: it shrinks every round (watch the ⏳ counter), and if it’s gone before you beat him, you’re rung out and lose.',
        'Some Arbiters have conditions. Salem (Aurora Peak) only battles trainers who have walked a full lap of Cloud Island (see Places → Cloud Island). Stella (Iron Coast) only battles trainers who clear the Iron Coast Gauntlet: beat 2 local trainers per Tier without leaving the city. You can rest at the Stable between matches, but leaving resets it. Once cleared, she’ll battle you any time.',
        'Trainer, Arbiter and Champion battles give every creature that fights +3 XP, win or lose, on top of the usual XP.',
      ] },
    ],
  },
  {
    id: 'places', icon: '🏙️', label: 'Places',
    topics: [
      { id: 'cities', title: 'Cities', body: [
        '- Stable: full recovery, KOs included, plus a Chanko Nabe battle buff (doubled in your home city).',
        '- Market: restoratives, treats, charms and totems.',
        '- Carving Shrine: carve typed Totems and Effigies from materials.',
        '- 🧰 Odd Jobs (cities and towns): short on coins? Spend all the Initiative you have left on work, and roll a d4 of coins for each point. Like camping, it uses up the rest of your turn.',
        '- 🛠️ Workbench (cities and towns): craft consumables from offering materials. Each recipe slot wants a material with allure for one type: Grass + Water makes two Vigor Salves, Grass + Charm a Calm Tea, Grass + Rock Trail Mix, Charm + Fire Lure Incense, Fire + Steel Hush Smoke, Astral + Electric a Star Charm, and Water + Fire + Astral a Hot Spring Elixir. Cloud Silk and the other universal materials fit any slot.',
        '- Trainer Hall and the Arbiter’s arena.',
        '- 🔄 Swap Team (free): trade creatures between your active team and your totems.',
      ] },
      { id: 'towns', title: 'Towns', body: [
        'Town Stables also fully recover your team, but serve no Chanko Nabe buff. Town markets and Workbenches cost no Initiative, and markets often sell key items (lanterns, ropes, passes…).',
        'The Canopy Rope (for Dahlia) and the Root Whistle (for Katy) are sold in different towns every game. Check the Notice Boards: they always say where.',
        '- Valor Ridge: the Battle School.',
        '- Quillhaven: the Research Facility.',
        '- Shifting Depths: Explore the Depths.',
      ] },
      { id: 'cloud', title: 'Cloud Island', body: [
        'A portal in Aurora Peak opens at night (even turns), and any time in Winter, to Cloud Island: a ring of six cloud wilds off the north-west coast. Its rules are shown before you step through, and while you’re there the ☁️ Cloud Island chip (top left) shows your lap, your satchel and the portal, and opens the rules again.',
        '- Salem only battles trainers who have walked a full lap of it: 6 steps in a row around the ring, always the same way round. Turning back starts the count again.',
        '- Every step onto the island costs +1 Initiative per Tier (Salem makes stronger trainers slog), so a lap takes several turns. You can walk the ring by day, but the portal only opens at night. Leaving the island ends the lap.',
        '- Items you find there go into a Cloud satchel, and only reach your bag when you escape through the portal. Get wiped out and sent home, and the satchel is lost.',
        '- Its wilds turn up universal offerings that work on any creature: Cloud Silk (+1), Stardust (+2) and the rare Moonbow Prism (+3). The island has its own events too.',
        '- Beat Salem, then come back: the bridges to the Eye of the Sky, in the middle of the ring, open, and a Legendary waits there.',
      ] },
      { id: 'floor', title: 'The Forest Floor', body: [
        'Below Gloomshade lies the Forest Floor, one lightless place reached with a Canopy Rope. Dahlia’s arena hides somewhere down there. Its rules show before you climb down, and while you’re there the 🌲 Forest Floor chip (top left) shows your progress and opens them again.',
        '- Explore it again and again with a d8: 1–2 nothing (your team loses Morale: they fear the dark), 3–4 a wild creature (hard to run from unless Quick Step), 5–6 an exotic find, 7–8 a sign of Dahlia’s Trail.',
        '- Find 3 signs, +1 per Tier, and her arena appears. Leave the Forest Floor, by choice or by defeat, and the trail is lost.',
        '- Once Dahlia is beaten, exploring down there rolls a d6 instead: the same table without the trail, so you can hunt its creatures and exotic finds without wasting explores.',
        '- Its events are all hostile: stalkers, grasping roots, spore clouds, whispers and thieves.',
      ] },
      { id: 'camping', title: 'Camping', body: [
        'On a wild node, camp to end your turn. Each Initiative you have left lets you tend one creature you choose, restoring its Vitality and clearing Fatigue.',
        'Camp early to tend more of your team. Knocked-out creatures need a Stable.',
      ] },
      { id: 'school', title: 'Battle School', body: [
        'At Valor Ridge, pay coins and leave a creature to train: 1 XP per coin, earned at 2 XP a turn.',
        'You’re told when it’s done. Pick it up (early if you like) to spend its new level-up points. A d6 decides whether it enjoyed the stay (Morale and Loyalty up or down).',
      ] },
      { id: 'rainbow', title: 'Lantern Glade & the Rainbow Plains', body: [
        'Lantern Glade is a town up a misty branch off Fogbank Path (between Mistfall and Hollow Crest). Only a Fog Lantern with a wisp caught in it lights the way.',
        '- Buy a Fog Lantern in Mistfall, then open your Bag and Check it: the flame shows where a wisp waits (any town, city or wild spot on the mainland), and the map marks it with a little light.',
        '- Walk there to catch the wisp. Every visit takes a new one: when you leave the Glade and the Plains, it drifts home.',
        'Behind the Glade, the Rainbow Plains take on a new type every day (odd turns), and turn its color. Only that type turns up there, every creature is at least one rarity higher, and finds are exotic (like the Forest Floor and Cloud Island).',
      ] },
      { id: 'research', title: 'Research Facility', body: [
        'In Quillhaven, release a recruited creature for coins: its level × 2 (Common), 3 (Prime), 4 (Apex) or 5 (Legendary).',
        'Each Legendary exists once per game, and a released one returns to its grounds on the map.',
        'Your starter (🤝 special bond) stays with you and can’t be released.',
      ] },
      { id: 'depths', title: 'Explore the Depths', body: [
        'At Shifting Depths (down the Sinkhole Stair from Houndmouth Canyon), leave an offering material: a wild creature of a type that craves it climbs up to battle you (1 Initiative plus the material).',
        'It has already accepted the offering, so the material counts toward recruiting it if you win.',
      ] },
    ],
  },
  {
    id: 'multiplayer', icon: '👥', label: 'Multiplayer',
    topics: [
      { id: 'hotseat', title: 'Hotseat', body: [
        'Up to six trainers share this device (title screen → Hotseat). Each picks a unique colour; turns go in seat order with a pass-the-device screen between them.',
        'Everyone shares the map, the weather and the Legendaries, and you can see the other trainers’ minis on the map. Tap a name in the turn-order strip (top left) to find that trainer.',
      ] },
      { id: 'interactions', title: 'Gifts, trades & duels', body: [
        'Tap 👥 Trainers on the action bar:',
        '- Gifts and coin or item trades reach anyone, anywhere (a courier carries them).',
        '- Creature trades and duel challenges need you both on the same spot.',
        '- In a duel, each trainer picks their own moves every round, and who goes in after a knockout.',
        'Notes about gifts, trades and duels wait for each trainer at the start of their turn.',
      ] },
      { id: 'online', title: 'Online', body: [
        'Title screen → 🌐 Online. The host opens a room and shares the code; everyone makes a trainer and the host starts.',
        'You watch other trainers’ turns live (moves, dice and battles; 🔺 Types works while watching), and a ping tells you when it’s your turn.',
        'While you wait you can unlock chart nodes and edit playbooks (🐾 My team), look through your bag (🎒 My bag), and tap a node to 📍 mark your next stop.',
        'The host can set a turn timer, skip a turn, or play one for someone who stepped away.',
      ] },
    ],
  },
  {
    id: 'trainer', icon: '🧢', label: 'You & saves',
    topics: [
      { id: 'style', title: 'Trainer style', body: [
        'Chosen when you start: eight styles, each with a perk and a drawback (Wanderer, Ranger, Urbanite, Beast Whisperer, Merchant, Battle Master, Caretaker, Pathfinder).',
        'They change Initiative costs, stables, coins, recruiting, battle XP, camping or Morale.',
        'The Wanderer makes their home anywhere: if their team is wiped out, they choose which city to return to, from any city whose stable they’ve rested at this game (only their home city at the start).',
      ] },
      { id: 'trainerId', title: 'Trainer ID', body: [
        'Tap 📇 on the top bar (or ☰ Menu → Trainer ID) to see your home town, trainer style and its rules, Tier and Merits.',
        'It also keeps your journey stats: creatures encountered, foes knocked out, items found, steps and coins, your won / lost record against wild creatures, trainers and Arbiters, and your favoured move types.',
      ] },
      { id: 'look', title: 'Your look', body: [
        'Pick a top, hat, hair style, skin tone, hair colour and pants when you start, or later in ☰ Menu → Trainer Look.',
        'Your main colour always goes on the top, the hat and any hair tie or streak. That mini is your token on the map and stands behind you in trainer battles.',
      ] },
      { id: 'saving', title: 'Saving', body: [
        'Games autosave as you play.',
        '☰ Menu → 📌 Save a copy keeps a named snapshot (solo, hotseat or online) that you can load again from 💾 Saves on the title screen, export or rename.',
      ] },
    ],
  },
];

/** The short welcome tour shown when a journey starts. */
export interface TourStep { icon: string; title: string; lines: string[] }
export function welcomeTour(o: { name: string; home: string; starter: string }): TourStep[] {
  return [
    { icon: '🏆', title: 'Your goal', lines: [
      `Welcome to Margos, ${o.name}! You set out from ${o.home} with ${o.starter}.`,
      'Beat the Arbiters of the 8 cities to earn 8 Merits, then reach Circuit Stadium by the end of Turn 100 to fight for the Championship.',
    ] },
    { icon: '⚡', title: 'Your turn', lines: [
      'Each turn you have 5 Initiative. Moving to a neighbouring node costs 1: tap a glowing node, then Travel.',
      'Wild nodes are explored as you enter them: you might find items, or meet a creature.',
      'Press ⏭️ End Turn when you’re done.',
    ] },
    { icon: '🐾', title: 'Creatures', lines: [
      'Beat a wild creature, then offer it a totem to recruit it. Up to 3 travel with you.',
      `Your Following creature (top left, ${o.starter} for now) leads every battle and lends you its Ability on the map.`,
    ] },
    { icon: '📈', title: 'Getting stronger', lines: [
      'Creatures earn XP in every battle. Each level gives a point to spend on the chart on the back of its card, and the chart leads to evolution.',
      'Rest at Stables in cities and towns, and shop at their Markets.',
    ] },
    { icon: '❓', title: 'Learn as you go', lines: [
      'That’s all you need to start. The full guide is in ☰ Menu → How to Play, by topic.',
      'Tip: in battle, tap a move to see exactly what it will roll before you use it.',
    ] },
  ];
}
