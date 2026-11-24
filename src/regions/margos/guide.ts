// How to Play: what's only true of Margos. Where it goes is in ui/guide.ts.
import type { Region } from '../types';

export const GUIDE: Region['guide'] = {
  topics: [
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
    { id: 'rainbow', title: 'Lantern Glade & the Rainbow Plains', body: [
      'Lantern Glade is a town up a misty branch off Fogbank Path (between Mistfall and Hollow Crest). Only a Fog Lantern with a wisp caught in it lights the way.',
      '- Buy a Fog Lantern in Mistfall, then open your Bag and Check it: the flame shows where a wisp waits (any town, city or wild spot on the mainland), and the map marks it with a little light.',
      '- Walk there to catch the wisp. Every visit takes a new one: when you leave the Glade and the Plains, it drifts home.',
      'Behind the Glade, the Rainbow Plains take on a new type every day (odd turns), and turn its color. Only that type turns up there, every creature is at least one rarity higher, and finds are exotic (like the Forest Floor and Cloud Island).',
    ] },
    { id: 'depths', title: 'Explore the Depths', body: [
      'At Shifting Depths (down the Sinkhole Stair from Houndmouth Canyon), leave an offering material: a wild creature of a type that craves it climbs up to battle you (1 Initiative plus the material).',
      'It has already accepted the offering, so the material counts toward recruiting it if you win.',
    ] },
    { id: 'school', title: 'Battle School', body: [
      'At Valor Ridge, pay coins and leave a creature to train: 1 XP per coin, earned at 2 XP a turn.',
      'You’re told when it’s done. Pick it up (early if you like) to spend its new level-up points. A d6 decides whether it enjoyed the stay (Morale and Loyalty up or down).',
      '🌅 Retraining: the drill masters can also give a creature any new Nature (💰 6), Ability (💰 8) or Instinct (💰 10). It stays overnight and is ready the next morning. The drills are harsh: it loses 1 Loyalty for each change when you pick it up.',
      'A new Nature keeps the number of perks it has unlocked. The Creature Caretaker, Trail Tutor and Drum Circle events can change a Nature, Ability or Instinct for free, but only to one of three random options.',
    ] },
    { id: 'research', title: 'Research Facility', body: [
      'In Quillhaven, release a recruited creature for coins: its level × 2 (Common), 3 (Prime), 4 (Apex) or 5 (Legendary).',
      'Each Legendary exists once per game, and a released one returns to its grounds on the map.',
      'Your starter (🤝 special bond) stays with you and can’t be released.',
    ] },
  ],
  lines: {
    bike: [
      '- 🚲 Bike (Lumber Hollow): once a turn, roll a d6 and ride up to that many steps for free. No exploring on the way or where you stop.',
    ],
    noRides: [
      'None of these work on Cloud Island or the Forest Floor, and Bike rides keep to land and the usual gates.',
    ],
    arenas: [
      'Each city’s Arbiter guards a Merit. Their arenas have tricks that favour the Arbiter (ice floes, fog, lightning…), described before you challenge. A prepared trainer can use some of them: Watson’s lightning heals Electric creatures, yours included.',
    ],
    arenaTimer: [
      'Cliff’s Crumbling Plateau is a timer: it shrinks every round (watch the ⏳ counter), and if it’s gone before you beat him, you’re rung out and lose.',
    ],
    conditions: [
      'Some Arbiters have conditions. Salem (Aurora Peak) only battles trainers who have walked a full lap of Cloud Island (see Places → Cloud Island). Stella (Iron Coast) only battles trainers who clear the Iron Coast Gauntlet: beat 2 local trainers per Tier without leaving the city. You can rest at the Stable between matches, but leaving resets it. Once cleared, she’ll battle you any time.',
    ],
    towns: [
      'The Canopy Rope (for Dahlia) and the Root Whistle (for Katy) are sold in different towns every game. Check the Notice Boards: they always say where.',
      '- Valor Ridge: the Battle School.',
      '- Quillhaven: the Research Facility.',
      '- Shifting Depths: Explore the Depths.',
    ],
  },
};
