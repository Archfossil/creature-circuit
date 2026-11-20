# Move Checklist: every attack, its numbers, and placeholders to replace

*Generated from the game data by `npm run docs:moves` (scripts/move-checklist.ts). Regenerate after changing moves rather than editing by hand.*

Every move in the game with all its attributes. Use it to swap generated **placeholders** for designed moves and to review **balance**.

## Progress

| | Count |
|---|---|
| Moves in the game | 401 |
| Hand-made | 49 |
| **Placeholders to replace** | **352** |
| Attack-grid slots | 376 (24 hand-made, 352 placeholders) |
| Hand-made moves flagged for a balance look | 2 |

## How to read this

- **Cost** is the energy a creature must generate to slot the move into its playbook. It isn’t spent per use. Neutral can be paid by any type.
- **Hits as**: the type the attack uses on the type chart. Physical moves ignore the chart and use Power vs Armor.
- **Damage** is the damage die plus a flat bonus, before stats. The attacker adds Power (physical) or Focus (elemental) and subtracts the target’s Armor or Ward. **Avg** is the average before stats. **Avg / energy** divides it by the total cost.
- **Accuracy** is the die rolled against the target’s Evasion (roll ≥ Evasion hits). Sure-hit moves never miss. Physical moves crit (double damage) on the die’s top face.
- **Speed** is added to the user’s Speed this round to decide who acts first. **Effort** is the Stamina it drains.
- **Status** is inflicted when the damage die rolls a 1 (elemental attacks carry their type’s status).
- **Balance note** compares a hand-made move’s average damage with a generated placeholder of the same total cost (Neutral included), giving sure-hit and speed a small allowance. It’s a prompt to look, not a verdict: support effects and statuses aren’t counted.
- **Design ☐**: a designed name, flavour and numbers. Hand-made moves start ticked. **Balance ☐**: tick once someone has reviewed its numbers in play.
- **Swapping a placeholder (developers):** add the move to `HANDMADE` in `src/data/moves.ts` with the same typed cost and hit type. It takes over that grid slot and the placeholder disappears. Then regenerate this file.

## The placeholder formula (balance baseline)

Generated attacks use these numbers by total typed cost. Dual-type attacks get +1 flat damage for needing two energy types. All placeholders have d6 accuracy.

| Total cost | Damage (single type) | Damage (dual type) | Avg (single / dual) | Speed | Effort |
|---|---|---|---|---|---|
| 1 | d4 | — | 2.5 / — | 0 | 1 |
| 2 | d6 | d6+1 | 3.5 / 4.5 | 0 | 1 |
| 3 | d6+1 | d6+2 | 4.5 / 5.5 | 0 | 2 |
| 4 | d8+1 | d8+2 | 5.5 / 6.5 | -1 | 2 |
| 5 | d10+1 | d10+2 | 6.5 / 7.5 | -2 | 3 |

## Contents

- [Physical moves](#physical-moves) (7)
- [Support moves](#support-moves) (11)
- [Signature moves](#signature-moves) (8)
- [Astral attacks](#astral-attacks) (47, 44 placeholders)
- [Charm attacks](#charm-attacks) (47, 44 placeholders)
- [Electric attacks](#electric-attacks) (47, 44 placeholders)
- [Fire attacks](#fire-attacks) (47, 44 placeholders)
- [Grass attacks](#grass-attacks) (47, 44 placeholders)
- [Rock attacks](#rock-attacks) (47, 44 placeholders)
- [Steel attacks](#steel-attacks) (47, 44 placeholders)
- [Water attacks](#water-attacks) (47, 44 placeholders)
- [Balance watch list](#balance-watch-list)

---

## Physical moves

Type-free attacks: Power vs Armor, ignore the type chart, crit on the accuracy die’s top face.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Tackle** | `tackle` | 1 Neutral | Physical | d4 | 2.5 | 2.50 | d6 | 0 | 1 | — | — | — | Hand-made | ☑ | ☐ |
| **Claw** | `claw` | 2 Neutral | Physical | d6 | 3.5 | 1.75 | d6 | 0 | 1 | — | — | — | Hand-made | ☑ | ☐ |
| **Quick Jab** | `quick-jab` | 1 Neutral | Physical | 2 | 2.0 | 2.00 | Sure-hit | +3 | 1 | — | — | — | Hand-made | ☑ | ☐ |
| **Headbutt** | `headbutt` | 3 Neutral | Physical | d8 | 4.5 | 1.50 | d6 | -1 | 2 | — | — | — | Hand-made | ☑ | ☐ |
| **Pounce** | `pounce` | 2 Neutral | Physical | d4+1 | 3.5 | 1.75 | d6 | +2 | 1 | — | — | — | Hand-made | ☑ | ☐ |
| **Rampage** | `rampage` | 4 Neutral | Physical | d10 | 5.5 | 1.38 | d8 | -2 | 3 | — | — | — | Hand-made | ☑ | ☐ |
| **Tail Lash** | `tail-whip` | 2 Neutral | Physical | d4 | 2.5 | 1.25 | d6 | 0 | 1 | — | On a hit, the foe gets −1 Armor. | — | Hand-made | ☑ | ☐ |

## Support moves

Buffs, debuffs and heals. No damage. Catch Breath is always available and doesn’t take a playbook slot.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Brace** | `brace` | 1 Neutral | — | — | — | — | Sure-hit | +4 | 1 | — | You get +2 Armor and +2 Ward. | — | Hand-made | ☑ | ☐ |
| **Second Wind** | `second-wind` | 2 Neutral | — | — | — | — | Sure-hit | +1 | 0 | — | You heal 1 Health and you recover 4 Stamina. | — | Hand-made | ☑ | ☐ |
| **Aurora Veil** | `aurora-veil` | 2 Astral | Astral | — | — | — | Sure-hit | +3 | 1 | — | You get +2 Ward and +1 Evasion. | — | Hand-made | ☑ | ☐ |
| **Lullaby** | `lullaby` | 2 Charm | Charm | — | — | — | d6 | 0 | 1 | — | If it lands, the foe gets −2 Speed and −1 Focus. | — | Hand-made | ☑ | ☐ |
| **Static Field** | `static-field` | 2 Electric | Electric | — | — | — | d6 | 0 | 1 | — | If it lands, you get +3 Speed and the foe gets −1 Evasion. | — | Hand-made | ☑ | ☐ |
| **Heat Haze** | `heat-haze` | 2 Fire | Fire | — | — | — | Sure-hit | 0 | 1 | — | You get +1 Evasion and +1 Focus. | — | Hand-made | ☑ | ☐ |
| **Photosynth** | `photosynth` | 2 Grass | Grass | — | — | — | Sure-hit | 0 | 1 | — | You heal 3 Health and you recover 2 Stamina. | — | Hand-made | ☑ | ☐ |
| **Stone Skin** | `stone-skin` | 2 Rock | Rock | — | — | — | Sure-hit | +3 | 1 | — | You get +2 Armor and +1 Ward. | — | Hand-made | ☑ | ☐ |
| **Bulwark** | `bulwark` | 2 Steel | Steel | — | — | — | Sure-hit | +4 | 1 | — | You get +3 Armor. | — | Hand-made | ☑ | ☐ |
| **Mist Cloak** | `mist-cloak` | 2 Water | Water | — | — | — | Sure-hit | +3 | 1 | — | You get +2 Evasion. | — | Hand-made | ☑ | ☐ |
| **Catch Breath** | `catch-breath` | Free | — | — | — | — | Sure-hit | 0 | 0 | — | Your Stamina refills. | — | Hand-made | ☑ | ☐ |

## Signature moves

Unlocked from a creature’s progression chart (★ node). They don’t fill attack-grid slots.

| Signature | Learned by |
|---|---|
| Borealis Lance | Twinkit, Lumenox, Polarion, Stelbloomkit, Stelbloomox, Stelbloomor, Stelvoltkit, Stelvoltox, Stelvoltor, Stelflarekit, Stelflareox, Stelflareor, Stelleafkit, Stelleafox, Stelleafor |
| Moonveil Kiss | Mossprite, Fernixie, Glamorwyn, Pixivoltkit, Pixivoltox, Pixivoltor, Pixiflarekit, Pixiflareox, Pixiflareor, Pixileafkit, Pixileafox, Pixileafor, Pixistonekit, Pixistoneox, Pixistoneor |
| Stormcall | Zapup, Voltusk, Stormhound, Zapflarekit, Zapflareox, Zapflareor, Zapleafkit, Zapleafox, Zapleafor, Zapstonekit, Zapstoneox, Zapstoneor, Zapgearkit, Zapgearox, Zapgearor |
| Caldera Roar | Cindercub, Blazmane, Pyrothane, Emberfish, Cinderkoi, Pyroleafkit, Pyroleafox, Pyroleafor, Pyrostonekit, Pyrostoneox, Pyrostoneor, Pyrogearkit, Pyrogearox, Pyrogearor, Pyrotidekit, Pyrotideox, Pyrotideor |
| Overgrowth | Sproutle, Thornback, Redwarden, Sprigstonekit, Sprigstoneox, Sprigstoneor, Spriggearkit, Spriggearox, Spriggearor, Sprigtidekit, Sprigtideox, Sprigtideor |
| Mesa Breaker | Pebbark, Cragjaw, Mesahound, Cragstarkit, Cragstarox, Cragstaror, Craggearkit, Craggearox, Craggearor, Cragtidekit, Cragtideox, Cragtideor |
| Foundry Hammer | Rivetail, Ferrocrab, Ironclawd, Ferrostarkit, Ferrostarox, Ferrostaror, Ferrobloomkit, Ferrobloomox, Ferrobloomor, Ferrotidekit, Ferrotideox, Ferrotideor |
| Riptide | Puddlit, Marshfin, Mangrovore, Aquastarkit, Aquastarox, Aquastaror, Aquabloomkit, Aquabloomox, Aquabloomor, Aquavoltkit, Aquavoltox, Aquavoltor |

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Borealis Lance** | `sig-borealis` | 3 Astral + 1 Neutral | Astral | d8+1 | 5.5 | 1.38 | d6 | +1 | 1 | Daze | — | — | Hand-made | ☑ | ☐ |
| **Moonveil Kiss** | `sig-moonveil` | 3 Charm + 1 Neutral | Charm | d8 | 4.5 | 1.13 | Sure-hit | 0 | 1 | Beguile | — | — | Hand-made | ☑ | ☐ |
| **Stormcall** | `sig-stormcall` | 3 Electric + 1 Neutral | Electric | d8 | 4.5 | 1.13 | d6 | +2 | 1 | Shock | — | — | Hand-made | ☑ | ☐ |
| **Caldera Roar** | `sig-caldera` | 3 Fire + 1 Neutral | Fire | d8+2 | 6.5 | 1.63 | d6 | 0 | 2 | Burn | — | — | Hand-made | ☑ | ☐ |
| **Overgrowth** | `sig-overgrowth` | 3 Grass + 1 Neutral | Grass | d8 | 4.5 | 1.13 | d6 | 0 | 1 | Snare | On a hit, you heal 2 Health. | — | Hand-made | ☑ | ☐ |
| **Mesa Breaker** | `sig-mesa` | 3 Rock + 1 Neutral | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 1 | Stagger | — | — | Hand-made | ☑ | ☐ |
| **Foundry Hammer** | `sig-foundry` | 3 Steel + 1 Neutral | Steel | d8 | 4.5 | 1.13 | d6 | 0 | 1 | Sunder | On a hit, the foe gets −1 Armor. | — | Hand-made | ☑ | ☐ |
| **Riptide** | `sig-riptide` | 3 Water + 1 Neutral | Water | d8 | 4.5 | 1.13 | d6 | +2 | 1 | Soak | — | — | Hand-made | ☑ | ☐ |

## Astral attacks

47 attacks that hit as Astral (44 placeholders). Status on a damage roll of 1: Daze.

### Astral: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Stardust** | `stardust` | 1 Astral | Astral | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Daze | — | — | Hand-made | ☑ | ☐ |
| **Comet Tail** | `comet-tail` | 2 Astral + 1 Neutral | Astral | d6 | 3.5 | 1.17 | d6 | +1 | 1 | Daze | — | — | Hand-made | ☑ | ☐ |
| **Star Lance** | `atk-astral3` | 3 Astral | Astral | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Meteor** | `meteor` | 4 Astral + 1 Neutral | Astral | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Daze | — | — | Hand-made | ☑ | ☐ |
| **Star Nova** | `atk-astral5` | 5 Astral | Astral | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |

### Astral: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Starheart Pulse** | `atk-astral1-charm1-astral` | 1 Astral + 1 Charm | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Pulse** | `atk-astral1-electric1-astral` | 1 Astral + 1 Electric | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Pulse** | `atk-astral1-fire1-astral` | 1 Astral + 1 Fire | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Pulse** | `atk-astral1-grass1-astral` | 1 Astral + 1 Grass | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Stargrit Pulse** | `atk-astral1-rock1-astral` | 1 Astral + 1 Rock | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starforge Pulse** | `atk-astral1-steel1-astral` | 1 Astral + 1 Steel | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspray Pulse** | `atk-astral1-water1-astral` | 1 Astral + 1 Water | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starheart Strike** | `atk-astral2-charm1` | 2 Astral + 1 Charm | Astral | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Strike** | `atk-astral2-electric1` | 2 Astral + 1 Electric | Astral | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Strike** | `atk-astral2-fire1` | 2 Astral + 1 Fire | Astral | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Strike** | `atk-astral2-grass1` | 2 Astral + 1 Grass | Astral | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Stargrit Strike** | `atk-astral2-rock1` | 2 Astral + 1 Rock | Astral | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starforge Strike** | `atk-astral2-steel1` | 2 Astral + 1 Steel | Astral | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspray Strike** | `atk-astral2-water1` | 2 Astral + 1 Water | Astral | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starheart Wave** | `atk-astral2-charm2-astral` | 2 Astral + 2 Charm | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Wave** | `atk-astral2-electric2-astral` | 2 Astral + 2 Electric | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Wave** | `atk-astral2-fire2-astral` | 2 Astral + 2 Fire | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Wave** | `atk-astral2-grass2-astral` | 2 Astral + 2 Grass | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Stargrit Wave** | `atk-astral2-rock2-astral` | 2 Astral + 2 Rock | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starforge Wave** | `atk-astral2-steel2-astral` | 2 Astral + 2 Steel | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspray Wave** | `atk-astral2-water2-astral` | 2 Astral + 2 Water | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starheart Crash** | `atk-astral3-charm1` | 3 Astral + 1 Charm | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Crash** | `atk-astral3-electric1` | 3 Astral + 1 Electric | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Crash** | `atk-astral3-fire1` | 3 Astral + 1 Fire | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Crash** | `atk-astral3-grass1` | 3 Astral + 1 Grass | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Stargrit Crash** | `atk-astral3-rock1` | 3 Astral + 1 Rock | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starforge Crash** | `atk-astral3-steel1` | 3 Astral + 1 Steel | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspray Crash** | `atk-astral3-water1` | 3 Astral + 1 Water | Astral | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starheart Barrage** | `atk-astral3-charm2` | 3 Astral + 2 Charm | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Barrage** | `atk-astral3-electric2` | 3 Astral + 2 Electric | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Barrage** | `atk-astral3-fire2` | 3 Astral + 2 Fire | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Barrage** | `atk-astral3-grass2` | 3 Astral + 2 Grass | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Stargrit Barrage** | `atk-astral3-rock2` | 3 Astral + 2 Rock | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starforge Barrage** | `atk-astral3-steel2` | 3 Astral + 2 Steel | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspray Barrage** | `atk-astral3-water2` | 3 Astral + 2 Water | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starheart Cataclysm** | `atk-astral4-charm1` | 4 Astral + 1 Charm | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Cataclysm** | `atk-astral4-electric1` | 4 Astral + 1 Electric | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Cataclysm** | `atk-astral4-fire1` | 4 Astral + 1 Fire | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Cataclysm** | `atk-astral4-grass1` | 4 Astral + 1 Grass | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Stargrit Cataclysm** | `atk-astral4-rock1` | 4 Astral + 1 Rock | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starforge Cataclysm** | `atk-astral4-steel1` | 4 Astral + 1 Steel | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspray Cataclysm** | `atk-astral4-water1` | 4 Astral + 1 Water | Astral | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Daze | — | — | Placeholder | ☐ | ☐ |

## Charm attacks

47 attacks that hit as Charm (44 placeholders). Status on a damage roll of 1: Beguile.

### Charm: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pixie Glint** | `pixie-glint` | 1 Charm | Charm | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Beguile | — | — | Hand-made | ☑ | ☐ |
| **Heartbreaker** | `heartbreaker` | 2 Charm + 1 Neutral | Charm | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Beguile | — | — | Hand-made | ☑ | ☐ |
| **Glam Lance** | `atk-charm3` | 3 Charm | Charm | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamour Burst** | `glamour-burst` | 4 Charm + 1 Neutral | Charm | d10 | 5.5 | 1.10 | d6 | -1 | 3 | Beguile | — | — | Hand-made | ☑ | ☐ |
| **Glam Nova** | `atk-charm5` | 5 Charm | Charm | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |

### Charm: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Glamlight Pulse** | `atk-astral1-charm1-charm` | 1 Astral + 1 Charm | Charm | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Pulse** | `atk-charm1-electric1-charm` | 1 Charm + 1 Electric | Charm | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Pulse** | `atk-charm1-fire1-charm` | 1 Charm + 1 Fire | Charm | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Pulse** | `atk-charm1-grass1-charm` | 1 Charm + 1 Grass | Charm | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamgrit Pulse** | `atk-charm1-rock1-charm` | 1 Charm + 1 Rock | Charm | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Pulse** | `atk-charm1-steel1-charm` | 1 Charm + 1 Steel | Charm | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Pulse** | `atk-charm1-water1-charm` | 1 Charm + 1 Water | Charm | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Strike** | `atk-astral1-charm2` | 1 Astral + 2 Charm | Charm | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Strike** | `atk-charm2-electric1` | 2 Charm + 1 Electric | Charm | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Strike** | `atk-charm2-fire1` | 2 Charm + 1 Fire | Charm | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Strike** | `atk-charm2-grass1` | 2 Charm + 1 Grass | Charm | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamgrit Strike** | `atk-charm2-rock1` | 2 Charm + 1 Rock | Charm | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Strike** | `atk-charm2-steel1` | 2 Charm + 1 Steel | Charm | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Strike** | `atk-charm2-water1` | 2 Charm + 1 Water | Charm | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Crash** | `atk-astral1-charm3` | 1 Astral + 3 Charm | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Wave** | `atk-astral2-charm2-charm` | 2 Astral + 2 Charm | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Wave** | `atk-charm2-electric2-charm` | 2 Charm + 2 Electric | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Wave** | `atk-charm2-fire2-charm` | 2 Charm + 2 Fire | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Wave** | `atk-charm2-grass2-charm` | 2 Charm + 2 Grass | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamgrit Wave** | `atk-charm2-rock2-charm` | 2 Charm + 2 Rock | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Wave** | `atk-charm2-steel2-charm` | 2 Charm + 2 Steel | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Wave** | `atk-charm2-water2-charm` | 2 Charm + 2 Water | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Crash** | `atk-charm3-electric1` | 3 Charm + 1 Electric | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Crash** | `atk-charm3-fire1` | 3 Charm + 1 Fire | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Crash** | `atk-charm3-grass1` | 3 Charm + 1 Grass | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamgrit Crash** | `atk-charm3-rock1` | 3 Charm + 1 Rock | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Crash** | `atk-charm3-steel1` | 3 Charm + 1 Steel | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Crash** | `atk-charm3-water1` | 3 Charm + 1 Water | Charm | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Cataclysm** | `atk-astral1-charm4` | 1 Astral + 4 Charm | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Barrage** | `atk-astral2-charm3` | 2 Astral + 3 Charm | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Barrage** | `atk-charm3-electric2` | 3 Charm + 2 Electric | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Barrage** | `atk-charm3-fire2` | 3 Charm + 2 Fire | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Barrage** | `atk-charm3-grass2` | 3 Charm + 2 Grass | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamgrit Barrage** | `atk-charm3-rock2` | 3 Charm + 2 Rock | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Barrage** | `atk-charm3-steel2` | 3 Charm + 2 Steel | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Barrage** | `atk-charm3-water2` | 3 Charm + 2 Water | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Cataclysm** | `atk-charm4-electric1` | 4 Charm + 1 Electric | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Cataclysm** | `atk-charm4-fire1` | 4 Charm + 1 Fire | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Cataclysm** | `atk-charm4-grass1` | 4 Charm + 1 Grass | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamgrit Cataclysm** | `atk-charm4-rock1` | 4 Charm + 1 Rock | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Cataclysm** | `atk-charm4-steel1` | 4 Charm + 1 Steel | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Cataclysm** | `atk-charm4-water1` | 4 Charm + 1 Water | Charm | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Beguile | — | — | Placeholder | ☐ | ☐ |

## Electric attacks

47 attacks that hit as Electric (44 placeholders). Status on a damage roll of 1: Shock.

### Electric: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Spark** | `spark` | 1 Electric | Electric | d4 | 2.5 | 2.50 | d6 | +1 | 1 | Shock | — | — | Hand-made | ☑ | ☐ |
| **Volt Fang** | `volt-fang` | 2 Electric + 1 Neutral | Electric | d6 | 3.5 | 1.17 | d6 | +1 | 1 | Shock | — | — | Hand-made | ☑ | ☐ |
| **Volt Lance** | `atk-electric3` | 3 Electric | Electric | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Thunderclap** | `thunderclap` | 4 Electric + 1 Neutral | Electric | d10 | 5.5 | 1.10 | d6 | 0 | 3 | Shock | — | — | Hand-made | ☑ | ☐ |
| **Volt Nova** | `atk-electric5` | 5 Electric | Electric | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |

### Electric: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Voltlight Pulse** | `atk-astral1-electric1-electric` | 1 Astral + 1 Electric | Electric | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Pulse** | `atk-charm1-electric1-electric` | 1 Charm + 1 Electric | Electric | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Pulse** | `atk-electric1-fire1-electric` | 1 Electric + 1 Fire | Electric | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Pulse** | `atk-electric1-grass1-electric` | 1 Electric + 1 Grass | Electric | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltgrit Pulse** | `atk-electric1-rock1-electric` | 1 Electric + 1 Rock | Electric | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Pulse** | `atk-electric1-steel1-electric` | 1 Electric + 1 Steel | Electric | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Pulse** | `atk-electric1-water1-electric` | 1 Electric + 1 Water | Electric | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Strike** | `atk-astral1-electric2` | 1 Astral + 2 Electric | Electric | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Strike** | `atk-charm1-electric2` | 1 Charm + 2 Electric | Electric | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Strike** | `atk-electric2-fire1` | 2 Electric + 1 Fire | Electric | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Strike** | `atk-electric2-grass1` | 2 Electric + 1 Grass | Electric | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltgrit Strike** | `atk-electric2-rock1` | 2 Electric + 1 Rock | Electric | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Strike** | `atk-electric2-steel1` | 2 Electric + 1 Steel | Electric | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Strike** | `atk-electric2-water1` | 2 Electric + 1 Water | Electric | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Crash** | `atk-astral1-electric3` | 1 Astral + 3 Electric | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Wave** | `atk-astral2-electric2-electric` | 2 Astral + 2 Electric | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Crash** | `atk-charm1-electric3` | 1 Charm + 3 Electric | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Wave** | `atk-charm2-electric2-electric` | 2 Charm + 2 Electric | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Wave** | `atk-electric2-fire2-electric` | 2 Electric + 2 Fire | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Wave** | `atk-electric2-grass2-electric` | 2 Electric + 2 Grass | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltgrit Wave** | `atk-electric2-rock2-electric` | 2 Electric + 2 Rock | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Wave** | `atk-electric2-steel2-electric` | 2 Electric + 2 Steel | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Wave** | `atk-electric2-water2-electric` | 2 Electric + 2 Water | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Crash** | `atk-electric3-fire1` | 3 Electric + 1 Fire | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Crash** | `atk-electric3-grass1` | 3 Electric + 1 Grass | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltgrit Crash** | `atk-electric3-rock1` | 3 Electric + 1 Rock | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Crash** | `atk-electric3-steel1` | 3 Electric + 1 Steel | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Crash** | `atk-electric3-water1` | 3 Electric + 1 Water | Electric | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Cataclysm** | `atk-astral1-electric4` | 1 Astral + 4 Electric | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Barrage** | `atk-astral2-electric3` | 2 Astral + 3 Electric | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Cataclysm** | `atk-charm1-electric4` | 1 Charm + 4 Electric | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Barrage** | `atk-charm2-electric3` | 2 Charm + 3 Electric | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Barrage** | `atk-electric3-fire2` | 3 Electric + 2 Fire | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Barrage** | `atk-electric3-grass2` | 3 Electric + 2 Grass | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltgrit Barrage** | `atk-electric3-rock2` | 3 Electric + 2 Rock | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Barrage** | `atk-electric3-steel2` | 3 Electric + 2 Steel | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Barrage** | `atk-electric3-water2` | 3 Electric + 2 Water | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Cataclysm** | `atk-electric4-fire1` | 4 Electric + 1 Fire | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Cataclysm** | `atk-electric4-grass1` | 4 Electric + 1 Grass | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltgrit Cataclysm** | `atk-electric4-rock1` | 4 Electric + 1 Rock | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Cataclysm** | `atk-electric4-steel1` | 4 Electric + 1 Steel | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Cataclysm** | `atk-electric4-water1` | 4 Electric + 1 Water | Electric | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Shock | — | — | Placeholder | ☐ | ☐ |

## Fire attacks

47 attacks that hit as Fire (44 placeholders). Status on a damage roll of 1: Burn.

### Fire: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ember** | `ember` | 1 Fire | Fire | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Burn | — | — | Hand-made | ☑ | ☐ |
| **Fire Claw** | `fire-claw` | 2 Fire + 1 Neutral | Fire | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Burn | — | — | Hand-made | ☑ | ☐ |
| **Flame Lance** | `atk-fire3` | 3 Fire | Fire | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Magma Surge** | `magma-surge` | 4 Fire + 1 Neutral | Fire | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Burn | — | — | Hand-made | ☑ | ☐ |
| **Flame Nova** | `atk-fire5` | 5 Fire | Fire | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |

### Fire: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Flamelight Pulse** | `atk-astral1-fire1-fire` | 1 Astral + 1 Fire | Fire | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Pulse** | `atk-charm1-fire1-fire` | 1 Charm + 1 Fire | Fire | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Pulse** | `atk-electric1-fire1-fire` | 1 Electric + 1 Fire | Fire | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Pulse** | `atk-fire1-grass1-fire` | 1 Fire + 1 Grass | Fire | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamegrit Pulse** | `atk-fire1-rock1-fire` | 1 Fire + 1 Rock | Fire | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Pulse** | `atk-fire1-steel1-fire` | 1 Fire + 1 Steel | Fire | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Pulse** | `atk-fire1-water1-fire` | 1 Fire + 1 Water | Fire | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Strike** | `atk-astral1-fire2` | 1 Astral + 2 Fire | Fire | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Strike** | `atk-charm1-fire2` | 1 Charm + 2 Fire | Fire | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Strike** | `atk-electric1-fire2` | 1 Electric + 2 Fire | Fire | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Strike** | `atk-fire2-grass1` | 2 Fire + 1 Grass | Fire | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamegrit Strike** | `atk-fire2-rock1` | 2 Fire + 1 Rock | Fire | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Strike** | `atk-fire2-steel1` | 2 Fire + 1 Steel | Fire | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Strike** | `atk-fire2-water1` | 2 Fire + 1 Water | Fire | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Crash** | `atk-astral1-fire3` | 1 Astral + 3 Fire | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Wave** | `atk-astral2-fire2-fire` | 2 Astral + 2 Fire | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Crash** | `atk-charm1-fire3` | 1 Charm + 3 Fire | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Wave** | `atk-charm2-fire2-fire` | 2 Charm + 2 Fire | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Crash** | `atk-electric1-fire3` | 1 Electric + 3 Fire | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Wave** | `atk-electric2-fire2-fire` | 2 Electric + 2 Fire | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Wave** | `atk-fire2-grass2-fire` | 2 Fire + 2 Grass | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamegrit Wave** | `atk-fire2-rock2-fire` | 2 Fire + 2 Rock | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Wave** | `atk-fire2-steel2-fire` | 2 Fire + 2 Steel | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Wave** | `atk-fire2-water2-fire` | 2 Fire + 2 Water | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Crash** | `atk-fire3-grass1` | 3 Fire + 1 Grass | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamegrit Crash** | `atk-fire3-rock1` | 3 Fire + 1 Rock | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Crash** | `atk-fire3-steel1` | 3 Fire + 1 Steel | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Crash** | `atk-fire3-water1` | 3 Fire + 1 Water | Fire | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Cataclysm** | `atk-astral1-fire4` | 1 Astral + 4 Fire | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Barrage** | `atk-astral2-fire3` | 2 Astral + 3 Fire | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Cataclysm** | `atk-charm1-fire4` | 1 Charm + 4 Fire | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Barrage** | `atk-charm2-fire3` | 2 Charm + 3 Fire | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Cataclysm** | `atk-electric1-fire4` | 1 Electric + 4 Fire | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Barrage** | `atk-electric2-fire3` | 2 Electric + 3 Fire | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Barrage** | `atk-fire3-grass2` | 3 Fire + 2 Grass | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamegrit Barrage** | `atk-fire3-rock2` | 3 Fire + 2 Rock | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Barrage** | `atk-fire3-steel2` | 3 Fire + 2 Steel | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Barrage** | `atk-fire3-water2` | 3 Fire + 2 Water | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Cataclysm** | `atk-fire4-grass1` | 4 Fire + 1 Grass | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamegrit Cataclysm** | `atk-fire4-rock1` | 4 Fire + 1 Rock | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Cataclysm** | `atk-fire4-steel1` | 4 Fire + 1 Steel | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Cataclysm** | `atk-fire4-water1` | 4 Fire + 1 Water | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn | — | — | Placeholder | ☐ | ☐ |

## Grass attacks

47 attacks that hit as Grass (44 placeholders). Status on a damage roll of 1: Snare.

### Grass: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Vine Snap** | `vine-snap` | 1 Grass | Grass | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Snare | — | — | Hand-made | ☑ | ☐ |
| **Thorn Volley** | `thorn-volley` | 2 Grass + 1 Neutral | Grass | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Snare | — | — | Hand-made | ☑ | ☐ |
| **Bramble Lance** | `atk-grass3` | 3 Grass | Grass | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Redwood Crush** | `redwood-crush` | 4 Grass + 1 Neutral | Grass | d10 | 5.5 | 1.10 | d6 | -2 | 3 | Snare | — | ⬇ Weak for its cost (-1.5 vs baseline) | Hand-made | ☑ | ☐ |
| **Bramble Nova** | `atk-grass5` | 5 Grass | Grass | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |

### Grass: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Bramblelight Pulse** | `atk-astral1-grass1-grass` | 1 Astral + 1 Grass | Grass | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleheart Pulse** | `atk-charm1-grass1-grass` | 1 Charm + 1 Grass | Grass | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespark Pulse** | `atk-electric1-grass1-grass` | 1 Electric + 1 Grass | Grass | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Pulse** | `atk-fire1-grass1-grass` | 1 Fire + 1 Grass | Grass | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Pulse** | `atk-grass1-rock1-grass` | 1 Grass + 1 Rock | Grass | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleforge Pulse** | `atk-grass1-steel1-grass` | 1 Grass + 1 Steel | Grass | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespray Pulse** | `atk-grass1-water1-grass` | 1 Grass + 1 Water | Grass | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblelight Strike** | `atk-astral1-grass2` | 1 Astral + 2 Grass | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleheart Strike** | `atk-charm1-grass2` | 1 Charm + 2 Grass | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespark Strike** | `atk-electric1-grass2` | 1 Electric + 2 Grass | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Strike** | `atk-fire1-grass2` | 1 Fire + 2 Grass | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Strike** | `atk-grass2-rock1` | 2 Grass + 1 Rock | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleforge Strike** | `atk-grass2-steel1` | 2 Grass + 1 Steel | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespray Strike** | `atk-grass2-water1` | 2 Grass + 1 Water | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblelight Crash** | `atk-astral1-grass3` | 1 Astral + 3 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblelight Wave** | `atk-astral2-grass2-grass` | 2 Astral + 2 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleheart Crash** | `atk-charm1-grass3` | 1 Charm + 3 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleheart Wave** | `atk-charm2-grass2-grass` | 2 Charm + 2 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespark Crash** | `atk-electric1-grass3` | 1 Electric + 3 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespark Wave** | `atk-electric2-grass2-grass` | 2 Electric + 2 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Crash** | `atk-fire1-grass3` | 1 Fire + 3 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Wave** | `atk-fire2-grass2-grass` | 2 Fire + 2 Grass | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Wave** | `atk-grass2-rock2-grass` | 2 Grass + 2 Rock | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleforge Wave** | `atk-grass2-steel2-grass` | 2 Grass + 2 Steel | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespray Wave** | `atk-grass2-water2-grass` | 2 Grass + 2 Water | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Crash** | `atk-grass3-rock1` | 3 Grass + 1 Rock | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleforge Crash** | `atk-grass3-steel1` | 3 Grass + 1 Steel | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespray Crash** | `atk-grass3-water1` | 3 Grass + 1 Water | Grass | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblelight Cataclysm** | `atk-astral1-grass4` | 1 Astral + 4 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblelight Barrage** | `atk-astral2-grass3` | 2 Astral + 3 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleheart Cataclysm** | `atk-charm1-grass4` | 1 Charm + 4 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleheart Barrage** | `atk-charm2-grass3` | 2 Charm + 3 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespark Cataclysm** | `atk-electric1-grass4` | 1 Electric + 4 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespark Barrage** | `atk-electric2-grass3` | 2 Electric + 3 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Cataclysm** | `atk-fire1-grass4` | 1 Fire + 4 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Barrage** | `atk-fire2-grass3` | 2 Fire + 3 Grass | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Barrage** | `atk-grass3-rock2` | 3 Grass + 2 Rock | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleforge Barrage** | `atk-grass3-steel2` | 3 Grass + 2 Steel | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespray Barrage** | `atk-grass3-water2` | 3 Grass + 2 Water | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Cataclysm** | `atk-grass4-rock1` | 4 Grass + 1 Rock | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Brambleforge Cataclysm** | `atk-grass4-steel1` | 4 Grass + 1 Steel | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |
| **Bramblespray Cataclysm** | `atk-grass4-water1` | 4 Grass + 1 Water | Grass | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Snare | — | — | Placeholder | ☐ | ☐ |

## Rock attacks

47 attacks that hit as Rock (44 placeholders). Status on a damage roll of 1: Stagger.

### Rock: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pebble Shot** | `pebble-shot` | 1 Rock | Rock | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Stagger | — | — | Hand-made | ☑ | ☐ |
| **Rockslide** | `rockslide` | 2 Rock + 1 Neutral | Rock | d6 | 3.5 | 1.17 | d6 | -1 | 1 | Stagger | — | — | Hand-made | ☑ | ☐ |
| **Stone Lance** | `atk-rock3` | 3 Rock | Rock | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Canyon Quake** | `canyon-quake` | 4 Rock + 1 Neutral | Rock | d10+1 | 6.5 | 1.30 | d6 | -3 | 3 | Stagger | — | — | Hand-made | ☑ | ☐ |
| **Stone Nova** | `atk-rock5` | 5 Rock | Rock | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |

### Rock: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Stonelight Pulse** | `atk-astral1-rock1-rock` | 1 Astral + 1 Rock | Rock | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Pulse** | `atk-charm1-rock1-rock` | 1 Charm + 1 Rock | Rock | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Pulse** | `atk-electric1-rock1-rock` | 1 Electric + 1 Rock | Rock | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Pulse** | `atk-fire1-rock1-rock` | 1 Fire + 1 Rock | Rock | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Pulse** | `atk-grass1-rock1-rock` | 1 Grass + 1 Rock | Rock | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Pulse** | `atk-rock1-steel1-rock` | 1 Rock + 1 Steel | Rock | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Pulse** | `atk-rock1-water1-rock` | 1 Rock + 1 Water | Rock | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Strike** | `atk-astral1-rock2` | 1 Astral + 2 Rock | Rock | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Strike** | `atk-charm1-rock2` | 1 Charm + 2 Rock | Rock | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Strike** | `atk-electric1-rock2` | 1 Electric + 2 Rock | Rock | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Strike** | `atk-fire1-rock2` | 1 Fire + 2 Rock | Rock | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Strike** | `atk-grass1-rock2` | 1 Grass + 2 Rock | Rock | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Strike** | `atk-rock2-steel1` | 2 Rock + 1 Steel | Rock | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Strike** | `atk-rock2-water1` | 2 Rock + 1 Water | Rock | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Crash** | `atk-astral1-rock3` | 1 Astral + 3 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Wave** | `atk-astral2-rock2-rock` | 2 Astral + 2 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Crash** | `atk-charm1-rock3` | 1 Charm + 3 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Wave** | `atk-charm2-rock2-rock` | 2 Charm + 2 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Crash** | `atk-electric1-rock3` | 1 Electric + 3 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Wave** | `atk-electric2-rock2-rock` | 2 Electric + 2 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Crash** | `atk-fire1-rock3` | 1 Fire + 3 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Wave** | `atk-fire2-rock2-rock` | 2 Fire + 2 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Crash** | `atk-grass1-rock3` | 1 Grass + 3 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Wave** | `atk-grass2-rock2-rock` | 2 Grass + 2 Rock | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Wave** | `atk-rock2-steel2-rock` | 2 Rock + 2 Steel | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Wave** | `atk-rock2-water2-rock` | 2 Rock + 2 Water | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Crash** | `atk-rock3-steel1` | 3 Rock + 1 Steel | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Crash** | `atk-rock3-water1` | 3 Rock + 1 Water | Rock | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Cataclysm** | `atk-astral1-rock4` | 1 Astral + 4 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Barrage** | `atk-astral2-rock3` | 2 Astral + 3 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Cataclysm** | `atk-charm1-rock4` | 1 Charm + 4 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Barrage** | `atk-charm2-rock3` | 2 Charm + 3 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Cataclysm** | `atk-electric1-rock4` | 1 Electric + 4 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Barrage** | `atk-electric2-rock3` | 2 Electric + 3 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Cataclysm** | `atk-fire1-rock4` | 1 Fire + 4 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Barrage** | `atk-fire2-rock3` | 2 Fire + 3 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Cataclysm** | `atk-grass1-rock4` | 1 Grass + 4 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Barrage** | `atk-grass2-rock3` | 2 Grass + 3 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Barrage** | `atk-rock3-steel2` | 3 Rock + 2 Steel | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Barrage** | `atk-rock3-water2` | 3 Rock + 2 Water | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Cataclysm** | `atk-rock4-steel1` | 4 Rock + 1 Steel | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Cataclysm** | `atk-rock4-water1` | 4 Rock + 1 Water | Rock | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Stagger | — | — | Placeholder | ☐ | ☐ |

## Steel attacks

47 attacks that hit as Steel (44 placeholders). Status on a damage roll of 1: Sunder.

### Steel: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Rivet** | `rivet` | 1 Steel | Steel | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Sunder | — | — | Hand-made | ☑ | ☐ |
| **Iron Tide** | `iron-tide` | 2 Steel + 1 Neutral | Steel | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Sunder | — | — | Hand-made | ☑ | ☐ |
| **Iron Lance** | `atk-steel3` | 3 Steel | Steel | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Anchor Drop** | `anchor-drop` | 4 Steel + 1 Neutral | Steel | d10 | 5.5 | 1.10 | d6 | -2 | 3 | Sunder | — | ⬇ Weak for its cost (-1.5 vs baseline) | Hand-made | ☑ | ☐ |
| **Iron Nova** | `atk-steel5` | 5 Steel | Steel | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |

### Steel: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ironlight Pulse** | `atk-astral1-steel1-steel` | 1 Astral + 1 Steel | Steel | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Pulse** | `atk-charm1-steel1-steel` | 1 Charm + 1 Steel | Steel | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Pulse** | `atk-electric1-steel1-steel` | 1 Electric + 1 Steel | Steel | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Pulse** | `atk-fire1-steel1-steel` | 1 Fire + 1 Steel | Steel | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Pulse** | `atk-grass1-steel1-steel` | 1 Grass + 1 Steel | Steel | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Irongrit Pulse** | `atk-rock1-steel1-steel` | 1 Rock + 1 Steel | Steel | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Pulse** | `atk-steel1-water1-steel` | 1 Steel + 1 Water | Steel | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Strike** | `atk-astral1-steel2` | 1 Astral + 2 Steel | Steel | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Strike** | `atk-charm1-steel2` | 1 Charm + 2 Steel | Steel | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Strike** | `atk-electric1-steel2` | 1 Electric + 2 Steel | Steel | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Strike** | `atk-fire1-steel2` | 1 Fire + 2 Steel | Steel | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Strike** | `atk-grass1-steel2` | 1 Grass + 2 Steel | Steel | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Irongrit Strike** | `atk-rock1-steel2` | 1 Rock + 2 Steel | Steel | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Strike** | `atk-steel2-water1` | 2 Steel + 1 Water | Steel | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Crash** | `atk-astral1-steel3` | 1 Astral + 3 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Wave** | `atk-astral2-steel2-steel` | 2 Astral + 2 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Crash** | `atk-charm1-steel3` | 1 Charm + 3 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Wave** | `atk-charm2-steel2-steel` | 2 Charm + 2 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Crash** | `atk-electric1-steel3` | 1 Electric + 3 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Wave** | `atk-electric2-steel2-steel` | 2 Electric + 2 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Crash** | `atk-fire1-steel3` | 1 Fire + 3 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Wave** | `atk-fire2-steel2-steel` | 2 Fire + 2 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Crash** | `atk-grass1-steel3` | 1 Grass + 3 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Wave** | `atk-grass2-steel2-steel` | 2 Grass + 2 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Irongrit Crash** | `atk-rock1-steel3` | 1 Rock + 3 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Irongrit Wave** | `atk-rock2-steel2-steel` | 2 Rock + 2 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Wave** | `atk-steel2-water2-steel` | 2 Steel + 2 Water | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Crash** | `atk-steel3-water1` | 3 Steel + 1 Water | Steel | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Cataclysm** | `atk-astral1-steel4` | 1 Astral + 4 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Barrage** | `atk-astral2-steel3` | 2 Astral + 3 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Cataclysm** | `atk-charm1-steel4` | 1 Charm + 4 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Barrage** | `atk-charm2-steel3` | 2 Charm + 3 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Cataclysm** | `atk-electric1-steel4` | 1 Electric + 4 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Barrage** | `atk-electric2-steel3` | 2 Electric + 3 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Cataclysm** | `atk-fire1-steel4` | 1 Fire + 4 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Barrage** | `atk-fire2-steel3` | 2 Fire + 3 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Cataclysm** | `atk-grass1-steel4` | 1 Grass + 4 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Barrage** | `atk-grass2-steel3` | 2 Grass + 3 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Irongrit Cataclysm** | `atk-rock1-steel4` | 1 Rock + 4 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Irongrit Barrage** | `atk-rock2-steel3` | 2 Rock + 3 Steel | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Barrage** | `atk-steel3-water2` | 3 Steel + 2 Water | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Cataclysm** | `atk-steel4-water1` | 4 Steel + 1 Water | Steel | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Sunder | — | — | Placeholder | ☐ | ☐ |

## Water attacks

47 attacks that hit as Water (44 placeholders). Status on a damage roll of 1: Soak.

### Water: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Splash Jet** | `splash-jet` | 1 Water | Water | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Soak | — | — | Hand-made | ☑ | ☐ |
| **Tide Crash** | `tide-crash` | 2 Water + 1 Neutral | Water | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Soak | — | — | Hand-made | ☑ | ☐ |
| **Tide Lance** | `atk-water3` | 3 Water | Water | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Maelstrom** | `maelstrom` | 4 Water + 1 Neutral | Water | d10 | 5.5 | 1.10 | d6 | -1 | 3 | Soak | — | — | Hand-made | ☑ | ☐ |
| **Tide Nova** | `atk-water5` | 5 Water | Water | d10+1 | 6.5 | 1.30 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |

### Water: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Tidelight Pulse** | `atk-astral1-water1-water` | 1 Astral + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Pulse** | `atk-charm1-water1-water` | 1 Charm + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Pulse** | `atk-electric1-water1-water` | 1 Electric + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Pulse** | `atk-fire1-water1-water` | 1 Fire + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Pulse** | `atk-grass1-water1-water` | 1 Grass + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Pulse** | `atk-rock1-water1-water` | 1 Rock + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Pulse** | `atk-steel1-water1-water` | 1 Steel + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Strike** | `atk-astral1-water2` | 1 Astral + 2 Water | Water | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Strike** | `atk-charm1-water2` | 1 Charm + 2 Water | Water | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Strike** | `atk-electric1-water2` | 1 Electric + 2 Water | Water | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Strike** | `atk-fire1-water2` | 1 Fire + 2 Water | Water | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Strike** | `atk-grass1-water2` | 1 Grass + 2 Water | Water | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Strike** | `atk-rock1-water2` | 1 Rock + 2 Water | Water | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Strike** | `atk-steel1-water2` | 1 Steel + 2 Water | Water | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Crash** | `atk-astral1-water3` | 1 Astral + 3 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Wave** | `atk-astral2-water2-water` | 2 Astral + 2 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Crash** | `atk-charm1-water3` | 1 Charm + 3 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Wave** | `atk-charm2-water2-water` | 2 Charm + 2 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Crash** | `atk-electric1-water3` | 1 Electric + 3 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Wave** | `atk-electric2-water2-water` | 2 Electric + 2 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Crash** | `atk-fire1-water3` | 1 Fire + 3 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Wave** | `atk-fire2-water2-water` | 2 Fire + 2 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Crash** | `atk-grass1-water3` | 1 Grass + 3 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Wave** | `atk-grass2-water2-water` | 2 Grass + 2 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Crash** | `atk-rock1-water3` | 1 Rock + 3 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Wave** | `atk-rock2-water2-water` | 2 Rock + 2 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Crash** | `atk-steel1-water3` | 1 Steel + 3 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Wave** | `atk-steel2-water2-water` | 2 Steel + 2 Water | Water | d8+2 | 6.5 | 1.63 | d6 | -1 | 2 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Cataclysm** | `atk-astral1-water4` | 1 Astral + 4 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Barrage** | `atk-astral2-water3` | 2 Astral + 3 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Cataclysm** | `atk-charm1-water4` | 1 Charm + 4 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Barrage** | `atk-charm2-water3` | 2 Charm + 3 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Cataclysm** | `atk-electric1-water4` | 1 Electric + 4 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Barrage** | `atk-electric2-water3` | 2 Electric + 3 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Cataclysm** | `atk-fire1-water4` | 1 Fire + 4 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Barrage** | `atk-fire2-water3` | 2 Fire + 3 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Cataclysm** | `atk-grass1-water4` | 1 Grass + 4 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Barrage** | `atk-grass2-water3` | 2 Grass + 3 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Cataclysm** | `atk-rock1-water4` | 1 Rock + 4 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Barrage** | `atk-rock2-water3` | 2 Rock + 3 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Cataclysm** | `atk-steel1-water4` | 1 Steel + 4 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Barrage** | `atk-steel2-water3` | 2 Steel + 3 Water | Water | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Soak | — | — | Placeholder | ☐ | ☐ |

---

## Balance watch list

Hand-made moves whose damage stands out from the placeholder baseline for their cost. Worth a look in play.

| Move | Cost | Damage | Accuracy | Speed | Note |
|---|---|---|---|---|---|
| Redwood Crush | 4 Grass + 1 Neutral | d10 | d6 | -2 | ⬇ Weak for its cost (-1.5 vs baseline) |
| Anchor Drop | 4 Steel + 1 Neutral | d10 | d6 | -2 | ⬇ Weak for its cost (-1.5 vs baseline) |
