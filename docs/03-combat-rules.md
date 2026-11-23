# Attributes Detailed

Each creature has the following attributes with sub-attributes in parenthesis.

* Vigor (Health)
* Power & Armor
* Focus & Ward
* Evasion
* Speed
* Stamina (Fatigue)
* Energy

## Vigor (Health)

A creature's Health is one bar of **5 × its Vigor**, divided into **hearts of 5**: one heart for each point of Vigor. (A creature with 3 Vigor has 15 Health, in 3 hearts.) Damage empties the current heart and carries on into the next. When the bar is empty, the creature is defeated.

The bar is notched at each heart, with a badge counting the hearts left. Healing in battle refills the **current** heart only; a heart that's been lost stays lost until the creature rests (a stable, camping, a Salve, some events). Nothing else adds Health: the progression chart does it through +1 Vigor nodes.

**Overheal.** Healing from a **move**, a **Swap Move** or an **Instinct** that would go past a full heart isn't wasted: the extra becomes **Overheal**, a buffer of bonus Health that soaks up damage before Health does. A creature can hold up to **half a heart** (3) in Overheal. It lasts for the rest of the battle (also while benched) until damage uses it up. It's shown as a gold, striped stretch on the Health bar and a "+N" beside the Health number. Because of the cap, a heal repeated at full Health stops adding once the buffer is full. Typical cases: Photosynth or Second Wind used at full Health, Siphon healing a creature that swaps in at full Health, and Heartmend firing just after a lost heart has reset Health to full. (Healing from the arena only restores Health. This is under trial to make support moves more useful and may be pulled back.)

When a creature defeats another creature in combat, the winning creature immediately refills its current heart, but not any hearts it lost. The defeated creature is KO'd and must be revived in a town or city, or with Rousing Salts.

Outside of combat, creatures refill their current heart, but not lost hearts unless you skip turns "Camping" to heal wounded creatures. This will not revive KO'd creatures under normal circumstances, it merely recovers lost hearts and removes Fatigue (more on Fatigue below.)

## Power & Armor

These two attributes govern raw, type-less attacks. These attacks are often physical such as "Claw" or "Tackle." Power adds a flat bonus to these Physical attacks while Armor provides a flat damage reduction against Physical attacks. Physical attacks will never be effective against or resisted by a creatures type as they are "type-less" and work outside the type chart making them reliable. They can also land critical hits, giving the user a massive edge in a desperate situation.

## Focus & Ward

These two attributes work the same as Power and Armor, except they apply to elemental attacks which interact with the type chart. Focus is a flat bonus to Elemental attacks and Ward is a flat damage reduction against them. Elemental attacks are also capable of inflicting status conditions upon their targets, making them less predictable, but possibly more effective than their physical counterparts.

## Evasion

Most attacks are not guaranteed to hit. If they aren't, the attacking creature must roll a dice (usually a d6) and beat the Evasion of their target creature in order to deal damage with their attack. Evasion is usually kept at 4 or lower.

## Speed

This attribute determines turn priority in combat and it can fluctuate based on attacks chosen and status effects. Defensive moves often increase your Speed so that they can be deployed before an attack hits you for example. Some attacking moves might inflict speed de-buffs to make fighting the target creature easier for another example.

## Stamina (Fatigue)

Every attack has an "Effort" value which drains Stamina. When Stamina hits 0 the creature gains a point of Fatigue.

During combat if a Creature has Fatigue, before they can roll an attack they must first roll a 10-sided die. If the dice result is equal to or lower than the current Fatigue of the attacking creature, they do not resolve the attack and spend that turn to "Catch their breath" instead.

Fatigue is removed when a creature rests. At rest in Cities or by camping.

> **Prototype note: camping.** Camping ends the turn and spends all remaining Initiative. Each point tends one creature the trainer picks: it recovers all Health and clears Fatigue. KO'd and fully rested creatures can't be picked, and with 0 Initiative left camping does nothing.

## Energy

This game has a Master Move List of attacks creatures can learn. To power these attacks, a Creature generates Energy. A creature can have a playbook of up to 4 attacks at a time. To add a move to the playbook, the creature must generate the correct amount and types of energy for the move. For example if "Fire Claw" requires two fire energy and one neutral energy (neutral energy is not a type generated, but rather neutral slots can be filled by any type of energy) then the creature "spends" 2 fire and 1 of any energy to commit Fire Claw to their playbook. This energy is not spent each time the attack is used, it is only slotted to determine what attacks are in the playbook. When this creature learns another move, such as "Meteor" which costs 4 Charm energy and 1 Fire energy, they cannot use the energy committed to "Fire Claw" without first removing that attack from their playbook.

# Meta-Attributes

Aside from their physical attributes, Creatures will have the following social attributes as well. These are **Loyalty,** **Morale,** and **Teamwork.**

## Loyalty

Loyalty tracks trust with the trainer and unlocks high-tier behavioral bonuses based on the creature's Nature. Loyalty acts as a currency which can be spent in the Creature's nature to unlock more passive benefits determined by their personality (their Nature.)

## Morale

Creatures who avoid being KO'd, win battles in streaks, get chosen as "followers" often, and receive active praise and care from their trainers will have high morale. Creatures who are on losing streaks in battle, are left in their totems, get neglected or ignored by their trainers, or are passed over when the trainer hands out items and treats will have low morale. Creatures with low morale can reject their trainers and return to the wild. Creatures with high Morale gain bonuses to their earned Loyalty and Experience.

> **Prototype rules: Morale & Loyalty** (tap either chip on a creature's card for the in-game summary)
> - **Morale (0–10).** It rises when the creature wins a battle it fought in (+1), Follows you (+1 every other turn), gets treats or berries, rests at a stable, or through some events. It falls when it's knocked out (−1), on a team wipe (−1 each), and while it waits in a totem (−1 every 10 turns).
> - **High Morale (7+)** earns +1 Loyalty at the end of every turn, plus +1 XP per battle.
> - **Loyalty (0–10).** Reaching each Nature perk's threshold (e.g. 3 / 6 / 10) unlocks that perk automatically and permanently. Perks never re-lock. Loyalty isn't spent. At the Capstone, attacks deal +1 damage per 5 Loyalty.
> - **Low Morale (3 or less)** first triggers a warning. After that, every turn that ends without the creature's Morale having risen rolls a d10:
>   - **Above its Loyalty:** it leaves the team.
>   - **Otherwise:** it stays but loses 1 Loyalty.
>
>   At 0 Loyalty any roll leaves, so even a creature with full Loyalty can eventually be lost, but it has to wear its Loyalty down first. A creature never leaves if it's your only one; it only loses Loyalty. If your active team empties, a creature steps out of its totem. Raising Morale above 3 clears the warning.
> - **Following.** At the start of each turn you're asked who follows you, shown with its Ability, Instinct, Morale and Loyalty. The follower leads every battle and gains +1 Morale every other turn.
> - **Legendaries never fully settle.** A recruited Legendary arrives with 10 Loyalty and loses 1 every turn, whatever its Morale. It gains no Loyalty from Morale, though treats still add some. At 0 Loyalty it leaves and returns to its grounds on the map for another trainer to find. Releasing it at the Research Facility first pays × 5 its level. Expect to hold a Legendary for about 10 turns unless your plan is built around keeping it.

## Swap Moves

Swap Moves are team-up swaps, enabling an incoming "Alpha" creature to leverage attributes fed by a benched partner. When you swap Creatures mid-battle one of the Creatures is designated as the "Alpha" in the arrangement. The Alpha's Swap Move triggers as the two creatures swap. Swap Moves all work differently, but many borrow the partner's stats or type.

The trainer sets a Swap Move for each pair and direction on the creature cards (Sproutle swapping in for Puddlit can differ from Sproutle swapping in for Zapup). Until then, a pair uses a neutral Swap Move picked at random (the same one every battle). Typed Swap Moves use the **partner's** types, not the Alpha's own (a Rock / Water creature swapping in for an Astral one can use the Astral moves; the Astral one swapping in for it can use the Rock and Water moves), and the stronger ones need Teamwork. Two creatures that **share a type** can also use that type's **Boosted** Swap Move, the strongest of all, at Teamwork 3.

Each creature has **Teamwork** with each other creature in your roster. Pairs gain 0.2 Teamwork for every turn they travel together on the active team, and +1 the first time one swaps in for the other in a battle (once per battle). A pair's Teamwork is capped at half the lower Loyalty of the two, and falls if that Loyalty does, so the trainer has to keep both creatures' trust. Every 2 Teamwork the Alpha has with its partner adds +1 to its Swap Move. The full list and exact rules are in [13 · Natures, Abilities & Swap Moves](./13-natures-and-abilities.md#swap-moves).

# Other Metadata

Other relevant creature information includes their Recruitment Threshold (RT), Level, Experience, and Personality (Nature, Ability and Instinct)

## Recruitment Threshold (RT)

This determines the difficulty of recruiting a defeated Creature. This is compared against the Totem and offerings given to the creature to allure them to your service. If they accept, they inhabit the totem. This number should fluctuate, but not massively.

## Level

Determines how many times the creature has already been upgraded. At each new level a node is unlocked in the creatures progression tree. This tree can include increases to attributes, Vigor (Health) included, adding more energy for use in the playbook, adding "Prism" energy (a rare energy type which counts as any energy), or unlocking signature attacks.

The last node in progression charts for stage 1 and 2 creatures is always to "Evolve" into the next stage. Creatures at their final stage will have a capstone node which, once unlocked, gives the creature more power based on their Loyalty with their trainer.

## Experience

Points earned by completing battles against other creatures. The exact amount is determined by comparing the two levels of the participating creatures with a bonus for the winner. When a creature earns enough experience, they gain a level, and can buy a new node from their progression track.

## Personality (Nature, Ability, Instinct)

Personality is determined by the Nature of a creature. Nature, like the progression track, has nodes to unlock through Loyalty. It may also feature bonuses for high Morale, or possibly "rebound" abilities for creatures with low morale.

An **Ability** is a passive effect which the Creature applies while in the overworld out of combat. These can be something like "Sweet Scent" which attracts wild creatures to the trainer for battle and possible recruitment, or "Baby-Doll Eyes" which can earn the trainer deals at markets. Only the "Following" creature can make use of their passive ability. At the start of each trainers turn, they determine one of their creature roster to "follow" them which improves their Loyalty, Morale, and allows them to use their Ability. This creature is also deployed first in combat if a fight breaks out. Some trainers who are expecting a challenge might not choose to have any creature following, so as to not give an incoming challenger the ability to start the battle with a type advantage!

An **Instinct** is a passive which the creature applies on its own in battle. Every species has one, shared by its whole evolution family, and wild creatures and opposing trainers' creatures have them too. Some fire at a moment: when the creature takes the field (Menace lowers the foe's Power), when it loses a heart (Eruption Burns the foe), when a physical attack hits it (Static Field may Shock the attacker), when it knocks out a foe, when it misses, or at the end of each round. Others bend a rule while it's out: Fixed Star's accuracy can't be lowered, Shadow stops the foe Zeroing In, Steel Coat shrugs off the first status of the fight, Hold Fast survives one knockout blow with 1 Health. Stat changes from an Instinct last while the creature stays in, capped at ±3 like any modifier. All of them, with exact rules: [14 · Instinct Checklist](./14-instinct-checklist.md).

**Swap Moves** are the effect which triggers when a creature swaps in for another in your roster mid-fight. The incoming creature is the "Alpha", and it uses the Swap Move the trainer set for swapping in for that partner (or, until one is set, a neutral move picked at random for that pair). The Swap Move specifies what's borrowed from the partner.

In a future iteration we may introduce "dual battles" with two or three creatures each which can expand Swap Moves to team-up attacks.

# Combat Structure

Here is the flow of combat:

* A challenge is issued as either 1v1, 2v2, or 3v3. Once both trainers accept the terms, combat begins. If either trainer has a following creature, that creature is sent into battle first. If a trainer has no following creature, they choose one from their roster to participate first instead. If the battle is against a wild creature, then the battle format is essentially "3v3" where the wild creature only has 1 creature to contribute (that being itself.) 
* After the creatures are sent in, both trainers decide on an attack. Speed values are compared between the two creatures, considering any fluctuations based on their chosen attacks. The "faster" creature (the one with higher Speed) resolves their attack first. If Speeds are tied, there is a "Clash" instead.
* If there is a Clash, the two creatures roll a dice. The exact dice rolled is determined by the Creature's level. The creature who rolls the lower value takes damage equal to the difference between their roll and the higher value roll. Then, the creature who rolled higher resolves their attack first. If both roll the same number, neither takes damage and a coin flip decides who attacks first. The coin is flipped on screen, and the winner is shown before either attack resolves.
* Attack resolution follows their own steps detailed below.
* After creatures make their attacks, if they both still have health remaining, combat continues from the "Trainers Choose an Attack" step. If the battle is against a Legendary Wild Creature they will roll for Evasion at the end of each round. This is done by making a d20 roll and adding the level of the trainer's creature to the roll. If the sum is not 20 or higher, the Legendary will lose interest in the fight and flee next turn when they would otherwise be attacking (using their base Speed to determine when.) The trainer gets a warning that the wild creature looks like they're trying to get away and fundamentally has one turn to stop them somehow. 
* Starting on the second round of a battle, a trainer can decide to swap in another creature instead (so long as the fight is either 2v2 or 3v3.) If this happens, the Alpha's Swap Move is resolved as its action instead, with all normal considerations taken into account (such as the attack speed, or damage dealt to the creature before it is swapped.)
* Opposing trainers swap too: when another of their creatures would fare clearly better against yours, counting the hit it takes on the way in and what its Swap Move does. They wait two rounds between swaps. Ordinary trainers need the most persuading, then Rivals, Arbiters and Champions. Wild creatures never swap.
* When one creature is KO'd (zero Health) the victorious creature refills its current heart (but not lost hearts!) and gains Experience based on the level of the other creature. If that was the final creature in the roster for that team, the battle is over.
* When a battle ends there is a Prize step. Trainer vs. Trainer prizes are d6 coins exchanged from the loser to the winner. Trainer battles can also be made for certain other prizes such as items, or even merits, but these require official acknowledgement by the Creature Circuit first and must be done in an arena setting (using a stadium and unique combat rules for both trainers as if they were fighting the arbiter.)

## Attack Resolution

Attack resolution is done as follows:

* Declared attacks adjust the creatures Speed. Then the creature with higher speed is the first attacker.
* If the attack is elemental, the type chart is consulted to find effectiveness or resistances. The Attack Type is compared against the Creature Type.
* Most attacks are not guaranteed to hit. To determine if an attack hits, roll it's accuracy dice (usually a d6) and compare it against the target creature's Evasion. If your roll equals or exceeds the Evasion of the target creature, the attack hits and deals damage. If it is a physical attack and you roll the maximum value on your attack roll, you deal a Critical Hit and damage is doubled.
* **Wide crits:** some physical moves crit on more than the top face of their accuracy die. Claw crits on a 5–6 (d6) and Rampage on a 6–8 (d8). A natural 1 never crits, and a Dazed (smaller) die keeps the same number of crit faces. Wide crits are a balance dial for physical moves, which can't inflict statuses.
* **Zeroing In:** a missed accuracy roll gives the attacker +1 to its next accuracy roll. Misses in a row stack the bonus, up to +3. The next accuracy roll uses it up, hit or miss (a miss then builds it again), and a creature that leaves the field loses it. Sure-hit moves never miss, so they neither use nor build it. It is also a dial for move design: **pursuit** moves zero in harder (Pounce gives +2 on a miss), and **all-or-nothing** moves never zero in (Rampage), though they still spend a bonus built by other moves.
* The attack will have either a die value, a flat value, or both, to indicate damage. Power / Focus is also added to this value for Physical / Elemental attacks respectively. If an elemental attack rolls a 1 on its damage die, it also inflicts a status condition. (Potency, below, and some Instincts widen the rolls that inflict it.)
* **Extra damage dice:** some attacks roll more than one damage die and add them up, e.g. Meteor and Maelstrom roll d10+d4, Thorn Volley and Rockslide d4+d4. A status is inflicted if **any** of the dice shows a 1, so extra dice raise the status chance (d10 alone: 10%; d10+d4: 32.5%; d4+d4: 44%) as well as the damage. This is a balance dial for elemental moves.
* **Potency N** (elemental): widens the status roll. The status lands on a damage roll of 1 to 1 + N instead of only a 1, so **Potency 1** inflicts on a 1–2 and **Potency 2** on a 1–3 (on any of the dice, for moves with extra dice). A Wildfire-like Instinct adds one more face on top. Potency moves trade a little damage for reliable statuses: the 3-energy single-type attacks (Cinder Storm, Undertow, Crackle Web, …) roll a d6 with Potency 2 (50%), and Magma Surge has Potency 1.
* **Cascade** (physical): an "exploding" damage die. When a damage die rolls its highest face, it rolls again and adds the result, and keeps going for as long as it rolls its highest face, so a lucky hit can chain into a big one. **Cascade d4** / **Cascade d10** rolls that die for the chain instead of the attack's own die (Avalanche Slam rolls a d6, and a 6 sets off a chain of d10s). A critical hit doubles the whole total. Flurry (d4, Cascade), Wild Swing (d6+1, Cascade d4) and Avalanche Slam (d6+1, Cascade d10) have it.
* **Purge** (elemental): extra damage against a foe that already has a status. Plain **Purge** (+2) works on any status (Heartbreaker, Maelstrom). **Purge: Burn**, **Purge: Soak** and so on (+4) only pay off against that one status, a bigger reward for setting it up. The status stays on. Each type has a named Purge attack costing 2 of its type and 1 of the type whose status it punishes (Quench is Water with a little Fire and has Purge: Burn), so a dual-type creature, or a team, can inflict a status with one type and cash it in with the other.
* **Status moves** (support): one per type (Smolder, Drench, Live Wire, Creeping Vines, Ground Rumble, Corrode, Sweet Nothings, Dizzy Lights). They roll accuracy like an attack (d6) and deal no damage. A hit inflicts the type's status outright. Since a creature holds one status at a time, they do nothing against a foe that already has one.
* **Status protection:** some Instincts keep statuses off (Wet Coat can't be Burned or Soaked, Steel Coat shrugs off the first status of each battle). The battle nameplate shows a 🛡 chip for these, with the statuses it's immune to (hover for details), and the move readout marks a status that won't land as blocked, with the reason (also when the foe already has a status).
* Damage reduces a creatures Health. When the current heart is empty, the next one starts. Damage carries over between hearts unless the creature has an ability or effect which says otherwise.

# Example Natures

Natures define a creature's innate behavioral bias, creating stat exchanges.

* **Adamant** :: +Power, -Focus -- Favors raw physical brawling over elemental channeling.
* **Timid** :: +Speed, -Power -- Prioritizing lightning-fast positioning at the cost of force.
* **Fortified** :: +Armor, -Speed -- Builds an immovable defensive wall, sacrificing mobility.
* **Resonant** :: +Focus, -Armor -- Leans heavily into elemental mastery and status effects, leaving physical defenses soft.
* **Enduring** :: +Vigor, -Ward -- Piles on massive health pools to soak damage, but leaves them more vulnerable to specialized elemental energy.
* **Volatile** :: +Stamina, -Evasion -- Empowers creatures to push their limits and use more demanding moves, but makes them cavalier with their own safety.

# Example Abilities

Passive abilities provide constant, automatic board or combat effects that activate without consuming active move energy or spending Stamina:

* Gem Armor: Takes reduced flat damage from physical attacks (ideal for rock/steel frontline variants).
* Thermal Aura: Radiates ambient heat, dealing minor chip damage to adjacent enemies at the end of a round.
* Reflective Coat: Grants a percentage chance to deflect a portion of incoming elemental Focus damage back at the attacker.
* Adrenaline Surge: When Vigor drops into the danger zone (below 25%), Speed is automatically boosted to help secure a desperate last-turn escape or strike.
* Pace-Keeper: Lowers the cumulative Fatigue gained when expending high amounts of Stamina during aggressive turns.
* Synchronized Pulse: Boosts the efficiency of attributes fed by a benched partner during a Swap Move.

# Type Chart

There are 8 types. Each is strong against two others and weak to two others. Neutral to anything else.

When a type is "Strong" against another it deals double (2x) damage. When a type is resisted by another, it takes only half (0.5) damage.

Because creatures can have two types, but attacks can only be one certain type, it is possible to get super effectiveness or immunity. If the attack is effective against both types of a creature, it deals 4x damage. If the attack is resisted by both of the creatures types, that creature takes no damage at all.

> **Balance watch: 4× hits ignore level.** The multiplier applies after the attacker's Focus and the defender's Ward, and damage carries over between hearts, so one 4× hit can knock out a creature many levels higher. Seen in testing: a Lv 2 Emberfish's Tideblaze Strike (Water) came to 8 damage before the multiplier against a Lv 10 Calderex (Fire / Rock), and the resulting 32 knocked it out from full in one hit. In the engine test that pits them, this happened in about 1 run in 1,000, whenever the Emberfish won a speed tie and acted first. Worth deciding whether that's an exciting upset or too swingy. Possible levers: cap 4× at 3×, apply the multiplier before Ward, or stop a single hit from taking more than one or two Vitality hearts.

| Type | Initial | Strong Against (Deals 2x) | Weak Against (Takes 2x) |
| :---: | :---: | :---: | :---: |
| Astral | A | Electric <br> Fire | Charm <br> Steel |
| Charm | C | Astral <br> Grass | Rock <br> Steel |
| Electric | E | Steel <br> Water | Astral <br> Rock |
| Fire | F | Grass <br> Steel | Astral <br> Water |
| Grass | G | Rock <br> Water | Charm <br> Fire |
| Rock | R | Charm <br> Electric | Grass <br> Water |
| Steel | S | Astral <br> Charm | Electric <br> Fire |
| Water | W | Fire <br> Rock | Electric <br> Grass |



> **Prototype rule: trainer battle XP.** Every creature that takes part in a battle against a trainer, an Arbiter or a Champion earns +3 XP on top of its participation XP, win or lose. This stacks with the XP for knocking out a foe. Every city has a Trainer Hall where you can battle a local trainer once per turn for a city action.
