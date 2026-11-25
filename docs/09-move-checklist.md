# Move Checklist: every attack, its numbers, and placeholders to replace

*Generated from the game data by `npm run docs:moves` (scripts/move-checklist.ts). Regenerate after changing moves rather than editing by hand.*

Every move in the game with all its attributes. Use it to swap generated **placeholders** for designed moves and to review **balance**.

## Progress

| | Count |
|---|---|
| Moves in the game | 412 |
| Hand-made | 76 |
| **Placeholders to replace** | **336** |
| Attack-grid slots | 376 (40 hand-made, 336 placeholders) |
| Hand-made moves flagged for a balance look | 6 |
| Swap Moves | 29 (5 neutral, 24 typed; **24 awaiting design sign-off**) |

## How to read this

- **Cost** is the energy a creature must generate to slot the move into its playbook. It isn’t spent per use. Neutral can be paid by any type.
- **Hits as**: the type the attack uses on the type chart. Physical moves ignore the chart and use Power vs Armor.
- **Damage** is the damage die (plus any extra dice, e.g. d10+d4, which are added up) and a flat bonus, before stats. The attacker adds Power (physical) or Focus (elemental) and subtracts the target’s Armor or Ward. **Avg** is the average before stats. **Avg / energy** divides it by the total cost.
- **Accuracy** is the die rolled against the target’s Evasion (roll ≥ Evasion hits). Sure-hit moves never miss. Physical moves crit (double damage) on the die’s top face; **(✸ 5+)** marks a wider crit range (a roll of 5 or more crits). Elemental moves crit only if marked.
- **⌖ Zeroing In**: a miss gives the creature's next accuracy roll +1, stacking over a streak of misses up to +3. The next accuracy roll uses it up, and leaving the field loses it. Moves that differ say so after their accuracy: **(⌖ +2)** is a pursuit move that zeroes in harder, **(⌖ ✕)** is all or nothing and never zeroes in.
- **Speed** is added to the user’s Speed this round to decide who acts first. **Effort** is the Stamina it drains.
- **Status** is inflicted when a damage die rolls a 1 (elemental attacks carry their type’s status). Moves with extra dice (e.g. d10+d4) inflict it if **any** die shows a 1, so the chance is shown next to the status.
- **Keywords**: **Potency N** (elemental) inflicts the status on a damage roll of 1 to 1 + N. **Cascade** rerolls a damage die that shows its top face and adds it, chaining while it keeps rolling its top face (**Cascade d10** chains with d10s); the Avg column counts the chains. **Purge** (elemental) adds damage against a foe with any status, **Purge: Burn** (and so on) a bigger bonus against that one status; Avg doesn't count it. Rules: [03 · Combat Rules](./03-combat-rules.md#attack-resolution).
- **Status moves** are support moves with a Status: they roll accuracy and, on a hit, inflict it outright with no damage.
- **Balance note** compares a hand-made move’s average damage with a plain attack of the same total cost (Neutral included), giving sure-hit and speed a small allowance. It’s a prompt to look, not a verdict: support effects and statuses aren’t counted.
- **Design ☐**: a designed name, flavour and numbers. Hand-made moves start ticked. **Balance ☐**: tick once someone has reviewed its numbers in play.
- **Swapping a placeholder (developers):** add the move to `HANDMADE` in `src/data/moves.ts` with the same typed cost and hit type. It takes over that grid slot and the placeholder disappears. Then regenerate this file.

## The balance baseline

A plain attack of each total typed cost, with d6 accuracy (dual types get +1 flat damage for needing two). No late attack is this plain: each generated one has its type’s style (`src/data/attackStyles.ts`, docs/03) and is worth about what the plain one is.

| Total cost | Damage (single type) | Damage (dual type) | Avg (single / dual) | Speed | Effort |
|---|---|---|---|---|---|
| 1 | d4 | — | 2.5 / — | 0 | 1 |
| 2 | d6 | d6+1 | 3.5 / 4.5 | 0 | 1 |
| 3 | d6+1 | d6+2 | 4.5 / 5.5 | 0 | 2 |
| 4 | d8+1 | d8+2 | 5.5 / 6.5 | -1 | 2 |
| 5 | d10+1 | d10+2 | 6.5 / 7.5 | -2 | 3 |

## Contents

- [Physical moves](#physical-moves) (10)
- [Support moves](#support-moves) (19)
- [Signature moves](#signature-moves) (8)
- [Swap Moves](#swap-moves) (29)
- [Astral attacks](#astral-attacks) (47, 42 placeholders)
- [Charm attacks](#charm-attacks) (47, 42 placeholders)
- [Electric attacks](#electric-attacks) (47, 42 placeholders)
- [Fire attacks](#fire-attacks) (47, 42 placeholders)
- [Grass attacks](#grass-attacks) (47, 42 placeholders)
- [Rock attacks](#rock-attacks) (47, 42 placeholders)
- [Steel attacks](#steel-attacks) (47, 42 placeholders)
- [Water attacks](#water-attacks) (47, 42 placeholders)
- [Balance watch list](#balance-watch-list)

---

## Physical moves

Type-free attacks: Power vs Armor, ignore the type chart, crit on the accuracy die’s top face (or a wider range, marked ✸).

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Tackle** | `tackle` | 1 Neutral | Physical | d4 | 2.5 | 2.50 | d6 | 0 | 1 | — | — | — | — | Hand-made | ☑ | ☐ |
| **Claw** | `claw` | 2 Neutral | Physical | d6 | 3.5 | 1.75 | d6 (✸ 5+) | 0 | 1 | — | — | — | — | Hand-made | ☑ | ☐ |
| **Quick Jab** | `quick-jab` | 1 Neutral | Physical | 2 | 2.0 | 2.00 | Sure-hit | +3 | 1 | — | — | — | — | Hand-made | ☑ | ☐ |
| **Headbutt** | `headbutt` | 3 Neutral | Physical | d8 | 4.5 | 1.50 | d6 | -1 | 2 | — | — | — | — | Hand-made | ☑ | ☐ |
| **Pounce** | `pounce` | 2 Neutral | Physical | d4+1 | 3.5 | 1.75 | d6 (⌖ +2) | +2 | 1 | — | — | — | — | Hand-made | ☑ | ☐ |
| **Rampage** | `rampage` | 4 Neutral | Physical | d10 | 5.5 | 1.38 | d8 (✸ 7+) (⌖ ✕) | -2 | 3 | — | — | — | — | Hand-made | ☑ | ☐ |
| **Tail Lash** | `tail-whip` | 2 Neutral | Physical | d4 | 2.5 | 1.25 | d6 | 0 | 1 | — | — | On a hit, the foe gets −1 Armor. | — | Hand-made | ☑ | ☐ |
| **Flurry** | `flurry` | 2 Neutral | Physical | d4 | 3.3 | 1.67 | d6 | 0 | 1 | — | Cascade | — | — | Hand-made | ☑ | ☐ |
| **Wild Swing** | `wild-swing` | 3 Neutral | Physical | d6+1 | 5.1 | 1.69 | d6 | 0 | 2 | — | Cascade d4 | — | — | Hand-made | ☑ | ☐ |
| **Avalanche Slam** | `avalanche-slam` | 4 Neutral | Physical | d6+1 | 5.5 | 1.38 | d6 | -2 | 3 | — | Cascade d10 | — | — | Hand-made | ☑ | ☐ |

## Support moves

Buffs, debuffs, heals and status moves. No damage. Catch Breath is always available and doesn’t take a playbook slot.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Brace** | `brace` | 1 Neutral | — | — | — | — | Sure-hit | +4 | 1 | — | — | You get +2 Armor and +2 Ward. | — | Hand-made | ☑ | ☐ |
| **Second Wind** | `second-wind` | 2 Neutral | — | — | — | — | Sure-hit | +1 | 0 | — | — | You heal 1 Health and you recover 4 Stamina. | — | Hand-made | ☑ | ☐ |
| **Dizzy Lights** | `dizzy-lights` | 1 Astral + 1 Neutral | Astral | — | — | — | d6 | +1 | 1 | Daze on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Sweet Nothings** | `sweet-nothings` | 1 Charm + 1 Neutral | Charm | — | — | — | d6 | +1 | 1 | Beguile on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Live Wire** | `live-wire` | 1 Electric + 1 Neutral | Electric | — | — | — | d6 | +1 | 1 | Shock on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Smolder** | `smolder` | 1 Fire + 1 Neutral | Fire | — | — | — | d6 | +1 | 1 | Burn on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Creeping Vines** | `creeping-vines` | 1 Grass + 1 Neutral | Grass | — | — | — | d6 | +1 | 1 | Snare on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Ground Rumble** | `ground-rumble` | 1 Rock + 1 Neutral | Rock | — | — | — | d6 | +1 | 1 | Stagger on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Corrode** | `corrode` | 1 Steel + 1 Neutral | Steel | — | — | — | d6 | +1 | 1 | Sunder on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Drench** | `drench` | 1 Water + 1 Neutral | Water | — | — | — | d6 | +1 | 1 | Soak on a hit | — | — | — | Hand-made | ☑ | ☐ |
| **Aurora Veil** | `aurora-veil` | 2 Astral | Astral | — | — | — | Sure-hit | +3 | 1 | — | — | You get +2 Ward and +1 Evasion. | — | Hand-made | ☑ | ☐ |
| **Lullaby** | `lullaby` | 2 Charm | Charm | — | — | — | d6 | 0 | 1 | — | — | If it lands, the foe gets −2 Speed and −1 Focus. | — | Hand-made | ☑ | ☐ |
| **Static Field** | `static-field` | 2 Electric | Electric | — | — | — | d6 | 0 | 1 | — | — | If it lands, you get +3 Speed and the foe gets −1 Evasion. | — | Hand-made | ☑ | ☐ |
| **Heat Haze** | `heat-haze` | 2 Fire | Fire | — | — | — | Sure-hit | 0 | 1 | — | — | You get +1 Evasion and +1 Focus. | — | Hand-made | ☑ | ☐ |
| **Photosynth** | `photosynth` | 2 Grass | Grass | — | — | — | Sure-hit | 0 | 1 | — | — | You heal 3 Health and you recover 2 Stamina. | — | Hand-made | ☑ | ☐ |
| **Stone Skin** | `stone-skin` | 2 Rock | Rock | — | — | — | Sure-hit | +3 | 1 | — | — | You get +2 Armor and +1 Ward. | — | Hand-made | ☑ | ☐ |
| **Bulwark** | `bulwark` | 2 Steel | Steel | — | — | — | Sure-hit | +4 | 1 | — | — | You get +3 Armor. | — | Hand-made | ☑ | ☐ |
| **Mist Cloak** | `mist-cloak` | 2 Water | Water | — | — | — | Sure-hit | +3 | 1 | — | — | You get +2 Evasion. | — | Hand-made | ☑ | ☐ |
| **Catch Breath** | `catch-breath` | Free | — | — | — | — | Sure-hit | 0 | 0 | — | — | Your Stamina refills. | — | Hand-made | ☑ | ☐ |

## Signature moves

Unlocked from a creature’s progression chart (★ node). They don’t fill attack-grid slots.

| Signature | Learned by |
|---|---|
| Borealis Lance | Twinkit, Lumenox, Polarion, Stelbloomboo, Stelbloomshade, Stelbloomdjinn, Stelvolthop, Stelvolthare, Stelvoltjack, Stelflarechick, Stelflarewing, Stelflaregale, Stelleafkit, Stelleafpard, Stelleafox, Dawnhop, Halohare, Sunjack |
| Moonveil Kiss | Mossprite, Fernixie, Glamorwyn, Pixivoltwisp, Pixivoltfae, Pixivoltnymph, Pixiflareworm, Pixiflarecoil, Pixiflarewyrm, Pixileafcub, Pixileafmane, Pixileafregal, Pixistonedrip, Pixistonegoo, Pixistonegloop, Ribbonchick, Trillwing, Serenadove |
| Stormcall | Zapup, Voltusk, Stormhound, Zapflarekit, Zapflarepard, Zapflareox, Zapleafcub, Zapleafmane, Zapleafregal, Zapstonehop, Zapstonehare, Zapstonejack, Zapgearnewt, Zapgearsaur, Zapgeardrake, Glimnewt, Lampskink, Beacodrake |
| Caldera Roar | Cindercub, Blazmane, Pyrothane, Emberfish, Cinderkoi, Pyroleafnewt, Pyroleafsaur, Pyroleafdrake, Pyrostoneboo, Pyrostoneshade, Pyrostonedjinn, Pyrogearnub, Pyrogearhulk, Pyrogeartitan, Pyrotidegrub, Pyrotidebug, Pyrotidescarab, Coalgrub, Cinderbug, Furnarab |
| Overgrowth | Sproutle, Thornback, Redwarden, Sprigstonetad, Sprigstonetoad, Sprigstonecroak, Spriggearchimp, Spriggeargrip, Spriggearbrute, Sprigtidenewt, Sprigtidesaur, Sprigtidedrake, Moontad, Bloomtoad, Lunacroak |
| Mesa Breaker | Pebbark, Cragjaw, Mesahound, Cragstarchimp, Cragstargrip, Cragstarbrute, Craggearnewt, Craggearsaur, Craggeardrake, Cragtidekit, Cragtidepard, Cragtideox |
| Foundry Hammer | Rivetail, Ferrocrab, Ironclawd, Ferrostarnub, Ferrostarhulk, Ferrostartitan, Ferrobloomnub, Ferrobloomhulk, Ferrobloomtitan, Ferrotidecub, Ferrotidemane, Ferrotideregal |
| Riptide | Puddlit, Marshfin, Mangrovore, Aquastartad, Aquastartoad, Aquastarcroak, Aquabloomtad, Aquabloomtoad, Aquabloomcroak, Aquavoltfry, Aquavoltfin, Aquavoltmaw |

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Borealis Lance** | `sig-borealis` | 3 Astral + 1 Neutral | Astral | d6+4 | 7.5 | 1.88 | d6 | +1 | 1 | Daze | — | — | ⬆ Strong for its cost (+2.3 vs baseline) | Hand-made | ☑ | ☐ |
| **Moonveil Kiss** | `sig-moonveil` | 3 Charm + 1 Neutral | Charm | d8 | 4.5 | 1.13 | Sure-hit | 0 | 1 | Beguile | — | — | — | Hand-made | ☑ | ☐ |
| **Stormcall** | `sig-stormcall` | 3 Electric + 1 Neutral | Electric | d8 | 4.5 | 1.13 | d6 | +2 | 1 | Shock | — | — | — | Hand-made | ☑ | ☐ |
| **Caldera Roar** | `sig-caldera` | 3 Fire + 1 Neutral | Fire | d8+2 | 6.5 | 1.63 | d6 | 0 | 2 | Burn | — | — | — | Hand-made | ☑ | ☐ |
| **Overgrowth** | `sig-overgrowth` | 3 Grass + 1 Neutral | Grass | d8 | 4.5 | 1.13 | d6 | 0 | 1 | Snare | — | On a hit, you heal 2 Health. | — | Hand-made | ☑ | ☐ |
| **Mesa Breaker** | `sig-mesa` | 3 Rock + 1 Neutral | Rock | d10+2 | 7.5 | 1.88 | d6 | -1 | 1 | Stagger | — | — | ⬆ Strong for its cost (+1.8 vs baseline) | Hand-made | ☑ | ☐ |
| **Foundry Hammer** | `sig-foundry` | 3 Steel + 1 Neutral | Steel | d8 | 4.5 | 1.13 | d6 | 0 | 1 | Sunder | — | On a hit, the foe gets −1 Armor. | — | Hand-made | ☑ | ☐ |
| **Riptide** | `sig-riptide` | 3 Water + 1 Neutral | Water | d8 | 4.5 | 1.13 | d6 (⌖ +3) | +1 | 1 | Soak | — | — | — | Hand-made | ☑ | ☐ |

## Swap Moves

What a creature does when it swaps in during battle (it's the **Alpha**; the creature it replaces is the **Partner**). Trainers set one per teammate on each creature's card; until then a pair uses a neutral move picked at random. Exact effects and rules: [13 · Natures, Abilities & Swap Moves](./13-natures-and-abilities.md#swap-moves).

- **Teamwork** is what the Alpha needs with the Partner to set the move. Typed moves also need the Partner (not the Alpha) to have that type; **Boosted** ones need both to share it.
- **Damage** lists what's added to the die. **Teamwork** there means the Teamwork bonus (+1 per 2 Teamwork, up to +2 at Teamwork 4; a pair's Teamwork is capped at half the lower Loyalty).
- **Status on 1–2**: typed hits inflict their type's status on a 1 or 2 on the damage die, or as high as the table says (regular moves need a 1). **Outright** means it's inflicted with no roll (if the foe has no status).
- **Effects** are applied before or after the hit as listed in the move's data. Stat boosts last while the Alpha stays in.
- **Design ☐**: the 24 typed moves (Boosted included) are first drafts from development (names, flavour and numbers) awaiting design sign-off. The 5 neutral ones are the original powers.
- **Adding one (developers):** add it to `SWAP_MOVES` in `src/data/swapMoves.ts`, built from the existing effects, with `text` naming the Alpha and partner (`n.A`, `n.P`; see Wording in docs/13); document it in docs/13 (a test checks), then regenerate this file.

| Move | ID | Type | Teamwork | Accuracy | Damage | Hits as | Status | Speed | Effects | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Tag Strike | `tagStrike` | Neutral | 0 | d8 | d6 + Partner’s Focus + Teamwork − Ward | Partner’s type | — | 0 | — | ☑ | ☐ |
| Shield Pass | `shieldPass` | Neutral | 0 | Sure-hit | d6 + Alpha’s Power − Armor | Physical | — | 0 | +Armor, +Ward | ☑ | ☐ |
| Slipstream | `slipstream` | Neutral | 0 | Sure-hit | d6 + Alpha’s Power + Partner’s Speed ÷ 3 + Teamwork − Armor | Physical | — | +3 | — | ☑ | ☐ |
| Siphon | `siphon` | Neutral | 0 | Sure-hit | d6 + Alpha’s Focus − Ward | Alpha’s type | — | 0 | heals Alpha | ☑ | ☐ |
| Rally | `rally` | Neutral | 0 | — | — | — | — | 0 | both refill Stamina, both −1 Fatigue, +Power, +Focus | ☑ | ☐ |
| Starfall Relay | `starfall-relay` | Astral | 1 | d8 | d6 + Partner’s Focus + Teamwork − Ward | Astral | Daze on 1–2 | 0 | — | ☐ | ☐ |
| Twin Orbit | `twin-orbit` | Astral | 2 | Sure-hit | d6 + Alpha’s Focus + Teamwork − Ward | Astral | Daze on 1–2 | 0 | +Evasion, foe −Evasion | ☐ | ☐ |
| Sweet Handoff | `sweet-handoff` | Charm | 1 | Sure-hit | d4 + Alpha’s Focus − Ward | Charm | — | 0 | Beguile outright, heals Alpha | ☐ | ☐ |
| Heartlink | `heartlink` | Charm | 2 | — | — | — | — | 0 | heals Alpha, heals Partner, foe −Power | ☐ | ☐ |
| Live Wire | `live-wire` | Electric | 1 | d8 | d6 + Alpha’s Focus + Teamwork − Ward | Electric | Shock on 1–2 | +2 | — | ☐ | ☐ |
| Arc Bridge | `arc-bridge` | Electric | 2 | Sure-hit | d6 + Alpha’s Focus + Partner’s Focus ÷ 2 + Teamwork − Ward | Electric | Shock on 1–2 | 0 | — | ☐ | ☐ |
| Kindle Swap | `kindle-swap` | Fire | 1 | — | — | — | — | 0 | Burn outright, +Power | ☐ | ☐ |
| Phoenix Handoff | `phoenix-handoff` | Fire | 2 | d8 | d8 + Alpha’s Focus + Teamwork − Ward | Fire | Burn on 1–2 | 0 | — | ☐ | ☐ |
| Root Relay | `root-relay` | Grass | 1 | Sure-hit | d4 + Alpha’s Focus − Ward | Grass | — | 0 | Snare outright, heals Alpha | ☐ | ☐ |
| Overgrowth | `overgrowth` | Grass | 2 | Sure-hit | d4 + Alpha’s Focus − Ward | Grass | — | 0 | heals Alpha, +Armor, +Ward | ☐ | ☐ |
| Landslide Tag | `landslide-tag` | Rock | 1 | d8 | d6 + Alpha’s Power + Partner’s Armor ÷ 2 + Teamwork − Armor | Physical | Stagger on 1–2 | 0 | — | ☐ | ☐ |
| Bulwark Swap | `bulwark-swap` | Rock | 2 | Sure-hit | d6 + Alpha’s Power − Armor | Physical | — | 0 | +Armor, +Ward | ☐ | ☐ |
| Iron Relay | `iron-relay` | Steel | 1 | Sure-hit | d6 + Alpha’s Power + Teamwork − Armor | Physical | Sunder on 1–2 | 0 | — | ☐ | ☐ |
| Alloy Guard | `alloy-guard` | Steel | 2 | Sure-hit | d6 + Alpha’s Power − Armor | Physical | — | 0 | +Armor, foe −Armor | ☐ | ☐ |
| Tide Relay | `tide-relay` | Water | 1 | d8 | d6 + Partner’s Focus + Teamwork − Ward | Water | Soak on 1–2 | 0 | — | ☐ | ☐ |
| Wellspring | `wellspring` | Water | 2 | — | — | — | — | 0 | heals Alpha, both refill Stamina, Soak outright | ☐ | ☐ |
| Conjunction | `conjunction` | Boosted Astral | 3 | Sure-hit | d6 + Alpha’s Focus − Ward, then d4 + Partner’s Focus ÷ 2 + Teamwork − Ward | Astral | Daze on 1–2 | 0 | — | ☐ | ☐ |
| Duet | `duet` | Boosted Charm | 3 | Sure-hit | d4 + Alpha’s Focus − Ward | Charm | — | 0 | Beguile outright, foe −Power, foe −Focus, heals Alpha, heals Partner | ☐ | ☐ |
| Closed Circuit | `closed-circuit` | Boosted Electric | 3 | Sure-hit | d6 + Alpha’s Focus + Partner’s Focus ÷ 2 + Teamwork − Ward | Electric | Shock on 1–2 | +4 | both refill Stamina | ☐ | ☐ |
| Twin Blaze | `twin-blaze` | Boosted Fire | 3 | d8 | d10 + Alpha’s Focus + Partner’s Focus ÷ 2 + Teamwork − Ward | Fire | Burn on 1–4 | 0 | — | ☐ | ☐ |
| Grove Chorus | `grove-chorus` | Boosted Grass | 3 | Sure-hit | d4 + Alpha’s Focus − Ward | Grass | — | 0 | heals Alpha, heals Partner, Snare outright, +Ward | ☐ | ☐ |
| Twin Monolith | `twin-monolith` | Boosted Rock | 3 | d8 | d8 + Alpha’s Power + Alpha’s Armor ÷ 2 + Partner’s Armor ÷ 2 + Teamwork − Armor | Physical | Stagger on 1–2 | 0 | +Armor | ☐ | ☐ |
| Interlock | `interlock` | Boosted Steel | 3 | Sure-hit | d6 + Alpha’s Power + Teamwork − Armor | Physical | Sunder on 1–2 | 0 | +Armor, +Ward, foe −Armor | ☐ | ☐ |
| Confluence | `confluence` | Boosted Water | 3 | Sure-hit | d6 + Alpha’s Focus + Partner’s Focus ÷ 2 + Teamwork − Ward | Water | Soak on 1–2 | 0 | heals Alpha, heals Partner | ☐ | ☐ |

## Astral attacks

47 attacks that hit as Astral (42 placeholders). Status on a damage roll of 1: Daze.

### Astral: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Stardust** | `stardust` | 1 Astral | Astral | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Daze | — | — | — | Hand-made | ☑ | ☐ |
| **Comet Tail** | `comet-tail` | 2 Astral + 1 Neutral | Astral | d6 | 3.5 | 1.17 | d6 | +1 | 1 | Daze | — | — | — | Hand-made | ☑ | ☐ |
| **Starglimmer** | `starglimmer` | 3 Astral | Astral | d6 | 4.1 | 1.35 | d6 | 0 | 2 | Daze (1–3, 50%) | Potency 2, Cascade d4 | — | — | Hand-made | ☑ | ☐ |
| **Meteor** | `meteor` | 4 Astral + 1 Neutral | Astral | d10+d4 | 9.2 | 1.83 | d6 | -3 | 3 | Daze (a 1, 32%) | Cascade d4 | — | ⬆ Strong for its cost (+1.9 vs baseline) | Hand-made | ☑ | ☐ |
| **Star Singularity** | `atk-astral5` | 5 Astral | Astral | d4+d4+1 | 8.1 | 1.62 | d6 | -1 | 3 | Daze (a 1, 44%) | Cascade d6 | — | — | Placeholder | ☐ | ☐ |

### Astral: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Starheart Twinkle** | `atk-astral1-charm1-astral` | 1 Astral + 1 Charm | Astral | d6 | 3.5 | 1.75 | d6 | 0 | 1 | Daze | Purge | — | — | Placeholder | ☐ | ☐ |
| **Starspark Twinkle** | `atk-astral1-electric1-astral` | 1 Astral + 1 Electric | Astral | d6 | 3.5 | 1.75 | d6 | +2 | 1 | Daze | — | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Twinkle** | `atk-astral1-fire1-astral` | 1 Astral + 1 Fire | Astral | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Daze (1–2, 33%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Twinkle** | `atk-astral1-grass1-astral` | 1 Astral + 1 Grass | Astral | d6 | 3.5 | 1.75 | d6 | 0 | 1 | Daze | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Stargrit Twinkle** | `atk-astral1-rock1-astral` | 1 Astral + 1 Rock | Astral | d8 | 4.5 | 2.25 | d6 | -1 | 1 | Daze | — | — | — | Placeholder | ☐ | ☐ |
| **Starforge Twinkle** | `atk-astral1-steel1-astral` | 1 Astral + 1 Steel | Astral | d4+2 | 4.5 | 2.25 | d6 | 0 | 1 | Daze | — | — | — | Placeholder | ☐ | ☐ |
| **Starspray Twinkle** | `atk-astral1-water1-astral` | 1 Astral + 1 Water | Astral | d6+1 | 4.5 | 2.25 | d6 (⌖ +2) | 0 | 1 | Daze | — | — | — | Placeholder | ☐ | ☐ |
| **Starstruck** | `starstruck` | 2 Astral + 1 Charm | Astral | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Daze | Purge: Beguile | — | — | Hand-made | ☑ | ☐ |
| **Starspark Gleam** | `atk-astral2-electric1` | 2 Astral + 1 Electric | Astral | d6+1 | 5.1 | 1.69 | d6 | +2 | 2 | Daze | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Gleam** | `atk-astral2-fire1` | 2 Astral + 1 Fire | Astral | d6+1 | 5.1 | 1.69 | d6 | 0 | 2 | Daze (1–2, 33%) | Potency 1, Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Gleam** | `atk-astral2-grass1` | 2 Astral + 1 Grass | Astral | d6+1 | 5.1 | 1.69 | d6 | 0 | 2 | Daze | Cascade d4 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Stargrit Gleam** | `atk-astral2-rock1` | 2 Astral + 1 Rock | Astral | d8+1 | 5.9 | 1.97 | d6 | -1 | 2 | Daze | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Starforge Gleam** | `atk-astral2-steel1` | 2 Astral + 1 Steel | Astral | d4+2 | 5.3 | 1.78 | d6 | 0 | 2 | Daze | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Starspray Gleam** | `atk-astral2-water1` | 2 Astral + 1 Water | Astral | d6+1 | 5.1 | 1.69 | d6 (⌖ +2) | 0 | 2 | Daze | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Starheart Shower** | `atk-astral2-charm2-astral` | 2 Astral + 2 Charm | Astral | d8 | 5.1 | 1.29 | d6 | 0 | 2 | Daze | Cascade, Purge: Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Shower** | `atk-astral2-electric2-astral` | 2 Astral + 2 Electric | Astral | d6 | 4.2 | 1.05 | d6 (✸ 6) | +1 | 2 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Shower** | `atk-astral2-fire2-astral` | 2 Astral + 2 Fire | Astral | d8+1 | 6.1 | 1.54 | d6 | 0 | 3 | Daze (1–3, 38%) | Potency 2, Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Shower** | `atk-astral2-grass2-astral` | 2 Astral + 2 Grass | Astral | d8 | 5.1 | 1.29 | d6 | 0 | 2 | Daze | Cascade | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Stargrit Shower** | `atk-astral2-rock2-astral` | 2 Astral + 2 Rock | Astral | d12 | 7.1 | 1.77 | d6 (⌖ ✕) | -2 | 2 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starforge Shower** | `atk-astral2-steel2-astral` | 2 Astral + 2 Steel | Astral | d4+2 | 5.3 | 1.33 | d6 | 0 | 2 | Daze | Cascade | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Starspray Shower** | `atk-astral2-water2-astral` | 2 Astral + 2 Water | Astral | d8 | 5.1 | 1.29 | d6 (⌖ +3) | 0 | 2 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starheart Starburst** | `atk-astral3-charm1` | 3 Astral + 1 Charm | Astral | d8 | 5.1 | 1.29 | d6 | 0 | 2 | Daze | Cascade, Purge | — | — | Placeholder | ☐ | ☐ |
| **Starspark Starburst** | `atk-astral3-electric1` | 3 Astral + 1 Electric | Astral | d8 | 5.1 | 1.29 | d6 | +2 | 2 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Starburst** | `atk-astral3-fire1` | 3 Astral + 1 Fire | Astral | d8+1 | 6.1 | 1.54 | d6 | 0 | 2 | Daze (1–2, 25%) | Potency 1, Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Starburst** | `atk-astral3-grass1` | 3 Astral + 1 Grass | Astral | d8+1 | 6.1 | 1.54 | d6 | 0 | 2 | Daze | Cascade | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Stargrit Starburst** | `atk-astral3-rock1` | 3 Astral + 1 Rock | Astral | d10 | 6.1 | 1.53 | d6 | -1 | 2 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starforge Starburst** | `atk-astral3-steel1` | 3 Astral + 1 Steel | Astral | d6+2 | 6.2 | 1.55 | d6 | 0 | 2 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starspray Starburst** | `atk-astral3-water1` | 3 Astral + 1 Water | Astral | d8+1 | 6.1 | 1.54 | d6 (⌖ +2) | 0 | 2 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starheart Constellation** | `atk-astral3-charm2` | 3 Astral + 2 Charm | Astral | d8+1 | 6.1 | 1.23 | d6 | 0 | 3 | Daze | Cascade, Purge: Daze | — | — | Placeholder | ☐ | ☐ |
| **Starspark Constellation** | `atk-astral3-electric2` | 3 Astral + 2 Electric | Astral | d8 | 5.1 | 1.03 | d6 (✸ 6) | +1 | 3 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Constellation** | `atk-astral3-fire2` | 3 Astral + 2 Fire | Astral | d8+3 | 8.1 | 1.63 | d6 | 0 | 4 | Daze (1–3, 38%) | Potency 2, Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Constellation** | `atk-astral3-grass2` | 3 Astral + 2 Grass | Astral | d8+2 | 7.1 | 1.43 | d6 | 0 | 3 | Daze | Cascade | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Stargrit Constellation** | `atk-astral3-rock2` | 3 Astral + 2 Rock | Astral | d12+2 | 9.1 | 1.82 | d6 (⌖ ✕) | -2 | 3 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starforge Constellation** | `atk-astral3-steel2` | 3 Astral + 2 Steel | Astral | d4+3 | 6.3 | 1.27 | d6 | 0 | 3 | Daze | Cascade | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Starspray Constellation** | `atk-astral3-water2` | 3 Astral + 2 Water | Astral | d8+2 | 7.1 | 1.43 | d6 (⌖ +3) | 0 | 3 | Daze | Cascade | — | — | Placeholder | ☐ | ☐ |
| **Starheart Supernova** | `atk-astral4-charm1` | 4 Astral + 1 Charm | Astral | d6+3 | 7.4 | 1.47 | d6 | -1 | 3 | Daze | Cascade d8, Purge | — | — | Placeholder | ☐ | ☐ |
| **Starspark Supernova** | `atk-astral4-electric1` | 4 Astral + 1 Electric | Astral | d6+3 | 7.4 | 1.47 | d6 | +1 | 3 | Daze | Cascade d8 | — | — | Placeholder | ☐ | ☐ |
| **Starblaze Supernova** | `atk-astral4-fire1` | 4 Astral + 1 Fire | Astral | d6+3 | 7.4 | 1.47 | d6 | -1 | 3 | Daze (1–2, 33%) | Potency 1, Cascade d8 | — | — | Placeholder | ☐ | ☐ |
| **Starthorn Supernova** | `atk-astral4-grass1` | 4 Astral + 1 Grass | Astral | d6+3 | 7.4 | 1.47 | d6 | -1 | 3 | Daze | Cascade d8 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Stargrit Supernova** | `atk-astral4-rock1` | 4 Astral + 1 Rock | Astral | d6+d4 | 8.1 | 1.63 | d6 | -2 | 3 | Daze (a 1, 38%) | Cascade d8 | — | — | Placeholder | ☐ | ☐ |
| **Starforge Supernova** | `atk-astral4-steel1` | 4 Astral + 1 Steel | Astral | d4+d4 | 7.6 | 1.51 | d6 | -1 | 3 | Daze (a 1, 44%) | Cascade d8 | — | — | Placeholder | ☐ | ☐ |
| **Starspray Supernova** | `atk-astral4-water1` | 4 Astral + 1 Water | Astral | d6+3 | 7.4 | 1.47 | d6 (⌖ +2) | -1 | 3 | Daze | Cascade d8 | — | — | Placeholder | ☐ | ☐ |

## Charm attacks

47 attacks that hit as Charm (42 placeholders). Status on a damage roll of 1: Beguile.

### Charm: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pixie Glint** | `pixie-glint` | 1 Charm | Charm | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Beguile | — | — | — | Hand-made | ☑ | ☐ |
| **Heartbreaker** | `heartbreaker` | 2 Charm + 1 Neutral | Charm | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Beguile | Purge | — | — | Hand-made | ☑ | ☐ |
| **Bewitching Waltz** | `bewitching-waltz` | 3 Charm | Charm | d4 | 2.5 | 0.83 | d8 | 0 | 2 | Beguile (1–2, 50%) | Potency 1 | — | ⬇ Weak for its cost (-2 vs baseline) | Hand-made | ☑ | ☐ |
| **Glamour Burst** | `glamour-burst` | 4 Charm + 1 Neutral | Charm | d8+1 | 5.5 | 1.10 | d8 | +1 | 3 | Beguile | Purge | — | — | Hand-made | ☑ | ☐ |
| **Glam Rapture** | `atk-charm5` | 5 Charm | Charm | d4 | 2.5 | 0.50 | Sure-hit | +1 | 3 | Beguile | Purge: Beguile | — | — | Placeholder | ☐ | ☐ |

### Charm: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Glamlight Wink** | `atk-astral1-charm1-charm` | 1 Astral + 1 Charm | Charm | d6 | 4.1 | 2.03 | d6 | +1 | 1 | Beguile | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Wink** | `atk-charm1-electric1-charm` | 1 Charm + 1 Electric | Charm | d6 | 3.5 | 1.75 | d6 | +3 | 1 | Beguile | — | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Wink** | `atk-charm1-fire1-charm` | 1 Charm + 1 Fire | Charm | d6 | 3.5 | 1.75 | d6 | +1 | 1 | Beguile (1–2, 33%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Wink** | `atk-charm1-grass1-charm` | 1 Charm + 1 Grass | Charm | d6 | 3.5 | 1.75 | d6 | +1 | 1 | Beguile | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Glamgrit Wink** | `atk-charm1-rock1-charm` | 1 Charm + 1 Rock | Charm | d8 | 4.5 | 2.25 | d6 | 0 | 1 | Beguile | — | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Wink** | `atk-charm1-steel1-charm` | 1 Charm + 1 Steel | Charm | d4+1 | 3.5 | 1.75 | d6 | +1 | 1 | Beguile | — | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Wink** | `atk-charm1-water1-charm` | 1 Charm + 1 Water | Charm | d6 | 3.5 | 1.75 | d6 (⌖ +2) | +1 | 1 | Beguile | — | — | — | Placeholder | ☐ | ☐ |
| **Dream Kiss** | `dream-kiss` | 1 Astral + 2 Charm | Charm | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Beguile | Purge: Daze | — | — | Hand-made | ☑ | ☐ |
| **Glamspark Whisper** | `atk-charm2-electric1` | 2 Charm + 1 Electric | Charm | d6 | 3.5 | 1.17 | d6 | +3 | 1 | Beguile | Purge | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Whisper** | `atk-charm2-fire1` | 2 Charm + 1 Fire | Charm | d6 | 3.5 | 1.17 | d6 | +1 | 1 | Beguile (1–2, 33%) | Potency 1, Purge | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Whisper** | `atk-charm2-grass1` | 2 Charm + 1 Grass | Charm | d6 | 3.5 | 1.17 | d6 | +1 | 1 | Beguile | Purge | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Glamgrit Whisper** | `atk-charm2-rock1` | 2 Charm + 1 Rock | Charm | d8 | 4.5 | 1.50 | d6 | 0 | 1 | Beguile | Purge | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Whisper** | `atk-charm2-steel1` | 2 Charm + 1 Steel | Charm | d4+1 | 3.5 | 1.17 | d6 | +1 | 1 | Beguile | Purge | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Whisper** | `atk-charm2-water1` | 2 Charm + 1 Water | Charm | d6 | 3.5 | 1.17 | d6 (⌖ +2) | +1 | 1 | Beguile | Purge | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Enchantment** | `atk-astral1-charm3` | 1 Astral + 3 Charm | Charm | d6 | 4.1 | 1.01 | d8 | 0 | 2 | Beguile | Cascade d4, Purge: Daze | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Serenade** | `atk-astral2-charm2-charm` | 2 Astral + 2 Charm | Charm | d4 | 4.0 | 1.01 | d8 | 0 | 2 | Beguile | Cascade d10, Purge: Daze | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Serenade** | `atk-charm2-electric2-charm` | 2 Charm + 2 Electric | Charm | d4 | 2.5 | 0.63 | d8 (✸ 8) | +1 | 2 | Beguile | Purge: Shock | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Serenade** | `atk-charm2-fire2-charm` | 2 Charm + 2 Fire | Charm | d6 | 3.5 | 0.88 | d8 | 0 | 3 | Beguile (1–3, 50%) | Potency 2, Purge: Burn | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Serenade** | `atk-charm2-grass2-charm` | 2 Charm + 2 Grass | Charm | d4 | 2.5 | 0.63 | d8 | 0 | 2 | Beguile | Purge: Snare | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Glamgrit Serenade** | `atk-charm2-rock2-charm` | 2 Charm + 2 Rock | Charm | d8 | 4.5 | 1.13 | d8 (⌖ ✕) | -2 | 2 | Beguile | Purge: Stagger | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Serenade** | `atk-charm2-steel2-charm` | 2 Charm + 2 Steel | Charm | d4 | 2.5 | 0.63 | d8 | 0 | 2 | Beguile | Purge: Sunder | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Glamspray Serenade** | `atk-charm2-water2-charm` | 2 Charm + 2 Water | Charm | d6 | 3.5 | 0.88 | d8 (⌖ +3) | 0 | 2 | Beguile | Purge: Soak | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Enchantment** | `atk-charm3-electric1` | 3 Charm + 1 Electric | Charm | d4 | 2.5 | 0.63 | d8 | +2 | 2 | Beguile | Purge: Shock | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Enchantment** | `atk-charm3-fire1` | 3 Charm + 1 Fire | Charm | d6 | 3.5 | 0.88 | d8 | 0 | 2 | Beguile (1–2, 33%) | Potency 1, Purge: Burn | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Enchantment** | `atk-charm3-grass1` | 3 Charm + 1 Grass | Charm | d6 | 3.5 | 0.88 | d8 | 0 | 2 | Beguile | Purge: Snare | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Glamgrit Enchantment** | `atk-charm3-rock1` | 3 Charm + 1 Rock | Charm | d6 | 3.5 | 0.88 | d8 | -1 | 2 | Beguile | Purge: Stagger | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Enchantment** | `atk-charm3-steel1` | 3 Charm + 1 Steel | Charm | d4+1 | 3.5 | 0.88 | d8 | 0 | 2 | Beguile | Purge: Sunder | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Enchantment** | `atk-charm3-water1` | 3 Charm + 1 Water | Charm | d6 | 3.5 | 0.88 | d8 (⌖ +2) | 0 | 2 | Beguile | Purge: Soak | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Heartstopper** | `atk-astral1-charm4` | 1 Astral + 4 Charm | Charm | d4 | 3.3 | 0.67 | Sure-hit | +1 | 3 | Beguile | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Glamlight Spellbind** | `atk-astral2-charm3` | 2 Astral + 3 Charm | Charm | d6 | 4.5 | 0.90 | d8 | 0 | 2 | Beguile | Cascade d10, Purge: Daze | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Spellbind** | `atk-charm3-electric2` | 3 Charm + 2 Electric | Charm | d4 | 2.5 | 0.50 | d8 (✸ 8) | +1 | 2 | Beguile | Purge: Shock | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Spellbind** | `atk-charm3-fire2` | 3 Charm + 2 Fire | Charm | d6+1 | 4.5 | 0.90 | d8 | 0 | 3 | Beguile (1–3, 50%) | Potency 2, Purge: Burn | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Spellbind** | `atk-charm3-grass2` | 3 Charm + 2 Grass | Charm | d6 | 3.5 | 0.70 | d8 | 0 | 2 | Beguile | Purge: Snare | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Glamgrit Spellbind** | `atk-charm3-rock2` | 3 Charm + 2 Rock | Charm | d10 | 5.5 | 1.10 | d8 (⌖ ✕) | -2 | 2 | Beguile | Purge: Stagger | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Spellbind** | `atk-charm3-steel2` | 3 Charm + 2 Steel | Charm | d4+1 | 3.5 | 0.70 | d8 | 0 | 2 | Beguile | Purge: Sunder | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Glamspray Spellbind** | `atk-charm3-water2` | 3 Charm + 2 Water | Charm | d6 | 3.5 | 0.70 | d8 (⌖ +3) | 0 | 2 | Beguile | Purge: Soak | — | — | Placeholder | ☐ | ☐ |
| **Glamspark Heartstopper** | `atk-charm4-electric1` | 4 Charm + 1 Electric | Charm | d4 | 2.5 | 0.50 | Sure-hit | +3 | 3 | Beguile | — | — | — | Placeholder | ☐ | ☐ |
| **Glamblaze Heartstopper** | `atk-charm4-fire1` | 4 Charm + 1 Fire | Charm | d4 | 2.5 | 0.50 | Sure-hit | +1 | 3 | Beguile (1–2, 50%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Glamthorn Heartstopper** | `atk-charm4-grass1` | 4 Charm + 1 Grass | Charm | d4 | 2.5 | 0.50 | Sure-hit | +1 | 3 | Beguile | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Glamgrit Heartstopper** | `atk-charm4-rock1` | 4 Charm + 1 Rock | Charm | d6 | 3.5 | 0.70 | Sure-hit | 0 | 3 | Beguile | — | — | — | Placeholder | ☐ | ☐ |
| **Glamforge Heartstopper** | `atk-charm4-steel1` | 4 Charm + 1 Steel | Charm | d4+1 | 3.5 | 0.70 | Sure-hit | +1 | 3 | Beguile | — | — | — | Placeholder | ☐ | ☐ |
| **Glamspray Heartstopper** | `atk-charm4-water1` | 4 Charm + 1 Water | Charm | d4 | 2.5 | 0.50 | Sure-hit | +2 | 3 | Beguile | — | — | — | Placeholder | ☐ | ☐ |

## Electric attacks

47 attacks that hit as Electric (42 placeholders). Status on a damage roll of 1: Shock.

### Electric: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Spark** | `spark` | 1 Electric | Electric | d4 | 2.5 | 2.50 | d6 | +1 | 1 | Shock | — | — | — | Hand-made | ☑ | ☐ |
| **Volt Fang** | `volt-fang` | 2 Electric + 1 Neutral | Electric | d6 | 3.5 | 1.17 | d6 | +1 | 1 | Shock | — | — | — | Hand-made | ☑ | ☐ |
| **Crackle Web** | `crackle-web` | 3 Electric | Electric | d4 | 2.5 | 0.83 | d6 | +2 | 2 | Shock (1–2, 50%) | Potency 1 | — | ⬇ Weak for its cost (-1.5 vs baseline) | Hand-made | ☑ | ☐ |
| **Thunderclap** | `thunderclap` | 4 Electric + 1 Neutral | Electric | d8+1 | 5.5 | 1.10 | d6 (✸ 6) | +1 | 3 | Shock | — | — | — | Hand-made | ☑ | ☐ |
| **Volt Judgment** | `atk-electric5` | 5 Electric | Electric | d4 | 2.5 | 0.50 | d6 (✸ 4+) | +4 | 4 | Shock | — | — | — | Placeholder | ☐ | ☐ |

### Electric: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Voltlight Zap** | `atk-astral1-electric1-electric` | 1 Astral + 1 Electric | Electric | d4 | 3.3 | 1.67 | d6 | +3 | 1 | Shock | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Zap** | `atk-charm1-electric1-electric` | 1 Charm + 1 Electric | Electric | d4 | 2.5 | 1.25 | d6 | +3 | 1 | Shock | Purge | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Zap** | `atk-electric1-fire1-electric` | 1 Electric + 1 Fire | Electric | d4 | 2.5 | 1.25 | d6 | +3 | 1 | Shock (1–2, 50%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Zap** | `atk-electric1-grass1-electric` | 1 Electric + 1 Grass | Electric | d4 | 2.5 | 1.25 | d6 | +3 | 1 | Shock | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Voltgrit Zap** | `atk-electric1-rock1-electric` | 1 Electric + 1 Rock | Electric | d6 | 3.5 | 1.75 | d6 | +2 | 1 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Zap** | `atk-electric1-steel1-electric` | 1 Electric + 1 Steel | Electric | d4+1 | 3.5 | 1.75 | d6 | +3 | 1 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Zap** | `atk-electric1-water1-electric` | 1 Electric + 1 Water | Electric | d4+1 | 3.5 | 1.75 | d6 (⌖ +2) | +3 | 1 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Jolt** | `atk-astral1-electric2` | 1 Astral + 2 Electric | Electric | d6 | 4.1 | 1.35 | d6 | +2 | 1 | Shock | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Jolt** | `atk-charm1-electric2` | 1 Charm + 2 Electric | Electric | d6 | 3.5 | 1.17 | d6 | +2 | 1 | Shock | Purge | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Jolt** | `atk-electric2-fire1` | 2 Electric + 1 Fire | Electric | d6 | 3.5 | 1.17 | d6 | +2 | 1 | Shock (1–2, 33%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Jolt** | `atk-electric2-grass1` | 2 Electric + 1 Grass | Electric | d6 | 3.5 | 1.17 | d6 | +2 | 1 | Shock | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Voltgrit Jolt** | `atk-electric2-rock1` | 2 Electric + 1 Rock | Electric | d8 | 4.5 | 1.50 | d6 | +1 | 1 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Jolt** | `atk-electric2-steel1` | 2 Electric + 1 Steel | Electric | d4+2 | 4.5 | 1.50 | d6 | +2 | 1 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Conductive Arc** | `conductive-arc` | 2 Electric + 1 Water | Electric | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Shock | Purge: Soak | — | — | Hand-made | ☑ | ☐ |
| **Voltlight Bolt** | `atk-astral1-electric3` | 1 Astral + 3 Electric | Electric | d6 | 4.1 | 1.01 | d6 (✸ 6) | +1 | 2 | Shock | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Surge** | `atk-astral2-electric2-electric` | 2 Astral + 2 Electric | Electric | d4 | 4.0 | 1.01 | d6 (✸ 6) | +1 | 2 | Shock | Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Bolt** | `atk-charm1-electric3` | 1 Charm + 3 Electric | Electric | d4 | 2.5 | 0.63 | d6 (✸ 6) | +1 | 2 | Shock | Purge | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Surge** | `atk-charm2-electric2-electric` | 2 Charm + 2 Electric | Electric | d4 | 2.5 | 0.63 | d6 (✸ 6) | +1 | 2 | Shock | Purge: Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Surge** | `atk-electric2-fire2-electric` | 2 Electric + 2 Fire | Electric | d6 | 3.5 | 0.88 | d6 (✸ 6) | +1 | 3 | Shock (1–3, 50%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Surge** | `atk-electric2-grass2-electric` | 2 Electric + 2 Grass | Electric | d4 | 2.5 | 0.63 | d6 (✸ 6) | +1 | 2 | Shock | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Voltgrit Surge** | `atk-electric2-rock2-electric` | 2 Electric + 2 Rock | Electric | d8 | 4.5 | 1.13 | d6 (✸ 6) (⌖ ✕) | -1 | 2 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Surge** | `atk-electric2-steel2-electric` | 2 Electric + 2 Steel | Electric | d4 | 2.5 | 0.63 | d6 (✸ 6) | +1 | 2 | Shock | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Voltspray Surge** | `atk-electric2-water2-electric` | 2 Electric + 2 Water | Electric | d6 | 3.5 | 0.88 | d6 (✸ 6) (⌖ +3) | +1 | 2 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Bolt** | `atk-electric3-fire1` | 3 Electric + 1 Fire | Electric | d6 | 3.5 | 0.88 | d6 (✸ 6) | +1 | 2 | Shock (1–2, 33%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Bolt** | `atk-electric3-grass1` | 3 Electric + 1 Grass | Electric | d6 | 3.5 | 0.88 | d6 (✸ 6) | +1 | 2 | Shock | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Voltgrit Bolt** | `atk-electric3-rock1` | 3 Electric + 1 Rock | Electric | d8 | 4.5 | 1.13 | d6 (✸ 6) | 0 | 2 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Bolt** | `atk-electric3-steel1` | 3 Electric + 1 Steel | Electric | d4+1 | 3.5 | 0.88 | d6 (✸ 6) | +1 | 2 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Bolt** | `atk-electric3-water1` | 3 Electric + 1 Water | Electric | d6 | 3.5 | 0.88 | d6 (✸ 6) (⌖ +2) | +1 | 2 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Thunderstroke** | `atk-astral1-electric4` | 1 Astral + 4 Electric | Electric | d4 | 3.3 | 0.67 | d6 (✸ 5+) | +3 | 3 | Shock | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Voltlight Overload** | `atk-astral2-electric3` | 2 Astral + 3 Electric | Electric | d6 | 4.5 | 0.90 | d6 (✸ 6) | +1 | 3 | Shock | Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Thunderstroke** | `atk-charm1-electric4` | 1 Charm + 4 Electric | Electric | d4 | 2.5 | 0.50 | d6 (✸ 5+) | +3 | 3 | Shock | Purge | — | — | Placeholder | ☐ | ☐ |
| **Voltheart Overload** | `atk-charm2-electric3` | 2 Charm + 3 Electric | Electric | d6 | 3.5 | 0.70 | d6 (✸ 6) | +1 | 3 | Shock | Purge: Shock | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Overload** | `atk-electric3-fire2` | 3 Electric + 2 Fire | Electric | d6+1 | 4.5 | 0.90 | d6 (✸ 6) | +1 | 4 | Shock (1–3, 50%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Overload** | `atk-electric3-grass2` | 3 Electric + 2 Grass | Electric | d6+1 | 4.5 | 0.90 | d6 (✸ 6) | +1 | 3 | Shock | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Voltgrit Overload** | `atk-electric3-rock2` | 3 Electric + 2 Rock | Electric | d10 | 5.5 | 1.10 | d6 (✸ 6) (⌖ ✕) | -1 | 3 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Overload** | `atk-electric3-steel2` | 3 Electric + 2 Steel | Electric | d4+1 | 3.5 | 0.70 | d6 (✸ 6) | +1 | 3 | Shock | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Voltspray Overload** | `atk-electric3-water2` | 3 Electric + 2 Water | Electric | d6+1 | 4.5 | 0.90 | d6 (✸ 6) (⌖ +3) | +1 | 3 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltblaze Thunderstroke** | `atk-electric4-fire1` | 4 Electric + 1 Fire | Electric | d4 | 2.5 | 0.50 | d6 (✸ 5+) | +3 | 3 | Shock (1–2, 50%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Voltthorn Thunderstroke** | `atk-electric4-grass1` | 4 Electric + 1 Grass | Electric | d4 | 2.5 | 0.50 | d6 (✸ 5+) | +3 | 3 | Shock | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Voltgrit Thunderstroke** | `atk-electric4-rock1` | 4 Electric + 1 Rock | Electric | d4 | 2.5 | 0.50 | d6 (✸ 5+) | +2 | 3 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltforge Thunderstroke** | `atk-electric4-steel1` | 4 Electric + 1 Steel | Electric | d4 | 2.5 | 0.50 | d6 (✸ 5+) | +3 | 3 | Shock | — | — | — | Placeholder | ☐ | ☐ |
| **Voltspray Thunderstroke** | `atk-electric4-water1` | 4 Electric + 1 Water | Electric | d4 | 2.5 | 0.50 | d6 (✸ 5+) (⌖ +2) | +3 | 3 | Shock | — | — | — | Placeholder | ☐ | ☐ |

## Fire attacks

47 attacks that hit as Fire (42 placeholders). Status on a damage roll of 1: Burn.

### Fire: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ember** | `ember` | 1 Fire | Fire | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Burn | — | — | — | Hand-made | ☑ | ☐ |
| **Fire Claw** | `fire-claw` | 2 Fire + 1 Neutral | Fire | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Burn | — | — | — | Hand-made | ☑ | ☐ |
| **Cinder Storm** | `cinder-storm` | 3 Fire | Fire | d6 | 3.5 | 1.17 | d6 | 0 | 2 | Burn (1–3, 50%) | Potency 2 | — | — | Hand-made | ☑ | ☐ |
| **Magma Surge** | `magma-surge` | 4 Fire + 1 Neutral | Fire | d10+2 | 7.5 | 1.50 | d6 | -2 | 3 | Burn (1–3, 30%) | Potency 2 | — | — | Hand-made | ☑ | ☐ |
| **Flame Conflagration** | `atk-fire5` | 5 Fire | Fire | d12+2 | 8.5 | 1.70 | d6 | -2 | 5 | Burn (1–6, 50%) | Potency 5 | — | — | Placeholder | ☐ | ☐ |

### Fire: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Flamelight Flicker** | `atk-astral1-fire1-fire` | 1 Astral + 1 Fire | Fire | d6+1 | 5.1 | 2.53 | d6 | -1 | 2 | Burn | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Flicker** | `atk-charm1-fire1-fire` | 1 Charm + 1 Fire | Fire | d6+1 | 4.5 | 2.25 | d6 | -1 | 2 | Burn | Purge | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Flicker** | `atk-electric1-fire1-fire` | 1 Electric + 1 Fire | Fire | d6+1 | 4.5 | 2.25 | d6 | +1 | 2 | Burn | — | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Flicker** | `atk-fire1-grass1-fire` | 1 Fire + 1 Grass | Fire | d6+1 | 4.5 | 2.25 | d6 | -1 | 2 | Burn | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Flamegrit Flicker** | `atk-fire1-rock1-fire` | 1 Fire + 1 Rock | Fire | d8+1 | 5.5 | 2.75 | d6 | -2 | 2 | Burn | — | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Flicker** | `atk-fire1-steel1-fire` | 1 Fire + 1 Steel | Fire | d4+3 | 5.5 | 2.75 | d6 | -1 | 2 | Burn | — | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Flicker** | `atk-fire1-water1-fire` | 1 Fire + 1 Water | Fire | d6+1 | 4.5 | 2.25 | d6 (⌖ +2) | -1 | 2 | Burn | — | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Scorch** | `atk-astral1-fire2` | 1 Astral + 2 Fire | Fire | d8+1 | 5.9 | 1.97 | d6 | -1 | 2 | Burn (1–2, 25%) | Potency 1, Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Scorch** | `atk-charm1-fire2` | 1 Charm + 2 Fire | Fire | d8 | 4.5 | 1.50 | d6 | -1 | 2 | Burn (1–2, 25%) | Potency 1, Purge | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Scorch** | `atk-electric1-fire2` | 1 Electric + 2 Fire | Fire | d8 | 4.5 | 1.50 | d6 | +1 | 2 | Burn (1–2, 25%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Kindling Flare** | `kindling-flare` | 2 Fire + 1 Grass | Fire | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Burn | Purge: Snare | — | — | Hand-made | ☑ | ☐ |
| **Flamegrit Scorch** | `atk-fire2-rock1` | 2 Fire + 1 Rock | Fire | d10 | 5.5 | 1.83 | d6 | -2 | 2 | Burn (1–2, 20%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Scorch** | `atk-fire2-steel1` | 2 Fire + 1 Steel | Fire | d6+2 | 5.5 | 1.83 | d6 | -1 | 2 | Burn (1–2, 33%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Scorch** | `atk-fire2-water1` | 2 Fire + 1 Water | Fire | d8+1 | 5.5 | 1.83 | d6 (⌖ +2) | -1 | 2 | Burn (1–2, 25%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Wildfire** | `atk-astral1-fire3` | 1 Astral + 3 Fire | Fire | d8+2 | 6.9 | 1.73 | d6 | -1 | 3 | Burn (1–3, 38%) | Potency 2, Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Flare** | `atk-astral2-fire2-fire` | 2 Astral + 2 Fire | Fire | d8+1 | 6.3 | 1.57 | d6 | -1 | 3 | Burn (1–3, 38%) | Potency 2, Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Wildfire** | `atk-charm1-fire3` | 1 Charm + 3 Fire | Fire | d8+1 | 5.5 | 1.38 | d6 | -1 | 3 | Burn (1–3, 38%) | Potency 2, Purge | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Flare** | `atk-charm2-fire2-fire` | 2 Charm + 2 Fire | Fire | d8 | 4.5 | 1.13 | d6 | -1 | 3 | Burn (1–3, 38%) | Potency 2, Purge: Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Wildfire** | `atk-electric1-fire3` | 1 Electric + 3 Fire | Fire | d8+1 | 5.5 | 1.38 | d6 | +1 | 3 | Burn (1–3, 38%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Flare** | `atk-electric2-fire2-fire` | 2 Electric + 2 Fire | Fire | d8 | 4.5 | 1.13 | d6 (✸ 6) | 0 | 3 | Burn (1–3, 38%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Flare** | `atk-fire2-grass2-fire` | 2 Fire + 2 Grass | Fire | d8+1 | 5.5 | 1.38 | d6 | -1 | 3 | Burn (1–3, 38%) | Potency 2 | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Flamegrit Flare** | `atk-fire2-rock2-fire` | 2 Fire + 2 Rock | Fire | d12+1 | 7.5 | 1.88 | d6 (⌖ ✕) | -3 | 3 | Burn (1–3, 25%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Flare** | `atk-fire2-steel2-fire` | 2 Fire + 2 Steel | Fire | d4+2 | 4.5 | 1.13 | d6 | -1 | 3 | Burn (1–3, 75%) | Potency 2 | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Flamespray Flare** | `atk-fire2-water2-fire` | 2 Fire + 2 Water | Fire | d8+1 | 5.5 | 1.38 | d6 (⌖ +3) | -1 | 3 | Burn (1–3, 38%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Wildfire** | `atk-fire3-grass1` | 3 Fire + 1 Grass | Fire | d8+1 | 5.5 | 1.38 | d6 | -1 | 3 | Burn (1–3, 38%) | Potency 2 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Flamegrit Wildfire** | `atk-fire3-rock1` | 3 Fire + 1 Rock | Fire | d10+1 | 6.5 | 1.63 | d6 | -2 | 3 | Burn (1–3, 30%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Wildfire** | `atk-fire3-steel1` | 3 Fire + 1 Steel | Fire | d6+3 | 6.5 | 1.63 | d6 | -1 | 3 | Burn (1–3, 50%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Wildfire** | `atk-fire3-water1` | 3 Fire + 1 Water | Fire | d8+1 | 5.5 | 1.38 | d6 (⌖ +2) | -1 | 3 | Burn (1–3, 38%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Eruption** | `atk-astral1-fire4` | 1 Astral + 4 Fire | Fire | d12+2 | 8.8 | 1.76 | d6 | -2 | 4 | Burn (1–4, 33%) | Potency 3, Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Flamelight Inferno** | `atk-astral2-fire3` | 2 Astral + 3 Fire | Fire | d8+3 | 8.3 | 1.65 | d6 | -1 | 4 | Burn (1–3, 38%) | Potency 2, Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Eruption** | `atk-charm1-fire4` | 1 Charm + 4 Fire | Fire | d12+1 | 7.5 | 1.50 | d6 | -2 | 4 | Burn (1–4, 33%) | Potency 3, Purge | — | — | Placeholder | ☐ | ☐ |
| **Flameheart Inferno** | `atk-charm2-fire3` | 2 Charm + 3 Fire | Fire | d8+2 | 6.5 | 1.30 | d6 | -1 | 4 | Burn (1–3, 38%) | Potency 2, Purge: Burn | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Eruption** | `atk-electric1-fire4` | 1 Electric + 4 Fire | Fire | d12+2 | 8.5 | 1.70 | d6 | 0 | 4 | Burn (1–4, 33%) | Potency 3 | — | — | Placeholder | ☐ | ☐ |
| **Flamespark Inferno** | `atk-electric2-fire3` | 2 Electric + 3 Fire | Fire | d8+1 | 5.5 | 1.10 | d6 (✸ 6) | 0 | 4 | Burn (1–3, 38%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Inferno** | `atk-fire3-grass2` | 3 Fire + 2 Grass | Fire | d8+3 | 7.5 | 1.50 | d6 | -1 | 4 | Burn (1–3, 38%) | Potency 2 | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Flamegrit Inferno** | `atk-fire3-rock2` | 3 Fire + 2 Rock | Fire | d12+3 | 9.5 | 1.90 | d6 (⌖ ✕) | -3 | 4 | Burn (1–3, 25%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Inferno** | `atk-fire3-steel2` | 3 Fire + 2 Steel | Fire | d4+4 | 6.5 | 1.30 | d6 | -1 | 4 | Burn (1–3, 75%) | Potency 2 | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Flamespray Inferno** | `atk-fire3-water2` | 3 Fire + 2 Water | Fire | d8+2 | 6.5 | 1.30 | d6 (⌖ +3) | -1 | 4 | Burn (1–3, 38%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Flamethorn Eruption** | `atk-fire4-grass1` | 4 Fire + 1 Grass | Fire | d12+1 | 7.5 | 1.50 | d6 | -2 | 4 | Burn (1–4, 33%) | Potency 3 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Flamegrit Eruption** | `atk-fire4-rock1` | 4 Fire + 1 Rock | Fire | d12+2 | 8.5 | 1.70 | d6 | -3 | 4 | Burn (1–4, 33%) | Potency 3 | — | — | Placeholder | ☐ | ☐ |
| **Flameforge Eruption** | `atk-fire4-steel1` | 4 Fire + 1 Steel | Fire | d10+3 | 8.5 | 1.70 | d6 | -2 | 4 | Burn (1–4, 40%) | Potency 3 | — | — | Placeholder | ☐ | ☐ |
| **Flamespray Eruption** | `atk-fire4-water1` | 4 Fire + 1 Water | Fire | d12+1 | 7.5 | 1.50 | d6 (⌖ +2) | -2 | 4 | Burn (1–4, 33%) | Potency 3 | — | — | Placeholder | ☐ | ☐ |

## Grass attacks

47 attacks that hit as Grass (42 placeholders). Status on a damage roll of 1: Snare.

### Grass: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Vine Snap** | `vine-snap` | 1 Grass | Grass | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Snare | — | — | — | Hand-made | ☑ | ☐ |
| **Thorn Volley** | `thorn-volley` | 2 Grass + 1 Neutral | Grass | d4+d4 | 5.0 | 1.67 | d6 | 0 | 1 | Snare (a 1, 44%) | — | — | — | Hand-made | ☑ | ☐ |
| **Thicket Lash** | `thicket-lash` | 3 Grass | Grass | d4+d4 | 5.0 | 1.67 | d6 | -2 | 3 | Snare (1–2, 75%) | Potency 1 | — | — | Hand-made | ☑ | ☐ |
| **Redwood Crush** | `redwood-crush` | 4 Grass + 1 Neutral | Grass | d6+d6 | 7.0 | 1.40 | d6 | -2 | 3 | Snare (a 1, 31%) | — | On a hit, you heal 2 Health. | — | Hand-made | ☑ | ☐ |
| **Bramble Worldroot** | `atk-grass5` | 5 Grass | Grass | d4+d4+1 | 6.0 | 1.20 | d6 | -2 | 4 | Snare (a 1, 44%) | — | On a hit, you heal 5 Health. | — | Placeholder | ☐ | ☐ |

### Grass: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Bramblelight Sprout** | `atk-astral1-grass1-grass` | 1 Astral + 1 Grass | Grass | d4 | 3.3 | 1.67 | d6 | 0 | 1 | Snare | Cascade d4 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleheart Sprout** | `atk-charm1-grass1-grass` | 1 Charm + 1 Grass | Grass | d4 | 2.5 | 1.25 | d6 | 0 | 1 | Snare | Purge | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespark Sprout** | `atk-electric1-grass1-grass` | 1 Electric + 1 Grass | Grass | d4+1 | 3.5 | 1.75 | d6 | +2 | 1 | Snare | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Sprout** | `atk-fire1-grass1-grass` | 1 Fire + 1 Grass | Grass | d4+1 | 3.5 | 1.75 | d6 | 0 | 1 | Snare (1–2, 50%) | Potency 1 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Sprout** | `atk-grass1-rock1-grass` | 1 Grass + 1 Rock | Grass | d6+1 | 4.5 | 2.25 | d6 | -1 | 1 | Snare | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleforge Sprout** | `atk-grass1-steel1-grass` | 1 Grass + 1 Steel | Grass | d4+1 | 3.5 | 1.75 | d6 | 0 | 1 | Snare | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespray Sprout** | `atk-grass1-water1-grass` | 1 Grass + 1 Water | Grass | d4+1 | 3.5 | 1.75 | d6 (⌖ +2) | 0 | 1 | Snare | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblelight Bloom** | `atk-astral1-grass2` | 1 Astral + 2 Grass | Grass | d6+1 | 5.1 | 1.69 | d6 | 0 | 2 | Snare | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Brambleheart Bloom** | `atk-charm1-grass2` | 1 Charm + 2 Grass | Grass | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Snare | Purge | — | — | Placeholder | ☐ | ☐ |
| **Grounding Roots** | `grounding-roots` | 1 Electric + 2 Grass | Grass | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Snare | Purge: Shock | — | — | Hand-made | ☑ | ☐ |
| **Brambleblaze Bloom** | `atk-fire1-grass2` | 1 Fire + 2 Grass | Grass | d6+2 | 5.5 | 1.83 | d6 | 0 | 2 | Snare (1–2, 33%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Bloom** | `atk-grass2-rock1` | 2 Grass + 1 Rock | Grass | d4+d4 | 5.0 | 1.67 | d6 | -1 | 2 | Snare (a 1, 44%) | — | — | — | Placeholder | ☐ | ☐ |
| **Brambleforge Bloom** | `atk-grass2-steel1` | 2 Grass + 1 Steel | Grass | d4+d4 | 5.0 | 1.67 | d6 | 0 | 2 | Snare (a 1, 44%) | — | — | — | Placeholder | ☐ | ☐ |
| **Bramblespray Bloom** | `atk-grass2-water1` | 2 Grass + 1 Water | Grass | d4+d4 | 5.0 | 1.67 | d6 (⌖ +2) | 0 | 2 | Snare (a 1, 44%) | — | — | — | Placeholder | ☐ | ☐ |
| **Bramblelight Siphon** | `atk-astral1-grass3` | 1 Astral + 3 Grass | Grass | d6+2 | 6.1 | 1.51 | d6 | -1 | 2 | Snare | Cascade d4 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblelight Tangle** | `atk-astral2-grass2-grass` | 2 Astral + 2 Grass | Grass | d6+2 | 6.2 | 1.55 | d6 | -1 | 2 | Snare | Cascade d6 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleheart Siphon** | `atk-charm1-grass3` | 1 Charm + 3 Grass | Grass | d6+1 | 4.5 | 1.13 | d6 | -1 | 2 | Snare | Purge | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleheart Tangle** | `atk-charm2-grass2-grass` | 2 Charm + 2 Grass | Grass | d6+1 | 4.5 | 1.13 | d6 | -1 | 2 | Snare | Purge: Snare | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespark Siphon** | `atk-electric1-grass3` | 1 Electric + 3 Grass | Grass | d4+d4 | 5.0 | 1.25 | d6 | +1 | 2 | Snare (a 1, 44%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespark Tangle** | `atk-electric2-grass2-grass` | 2 Electric + 2 Grass | Grass | d6 | 3.5 | 0.88 | d6 (✸ 6) | 0 | 2 | Snare | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Siphon** | `atk-fire1-grass3` | 1 Fire + 3 Grass | Grass | d4+d4 | 5.0 | 1.25 | d6 | -1 | 2 | Snare (1–2, 75%) | Potency 1 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Tangle** | `atk-fire2-grass2-grass` | 2 Fire + 2 Grass | Grass | d4+d4 | 5.0 | 1.25 | d6 | -1 | 3 | Snare (1–3, 94%) | Potency 2 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Tangle** | `atk-grass2-rock2-grass` | 2 Grass + 2 Rock | Grass | d8+d4 | 7.0 | 1.75 | d6 (⌖ ✕) | -3 | 2 | Snare (a 1, 34%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleforge Tangle** | `atk-grass2-steel2-grass` | 2 Grass + 2 Steel | Grass | d4+2 | 4.5 | 1.13 | d6 | -1 | 2 | Snare | — | On a hit, the foe gets −1 Ward and you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespray Tangle** | `atk-grass2-water2-grass` | 2 Grass + 2 Water | Grass | d6+1 | 4.5 | 1.13 | d6 (⌖ +3) | -1 | 2 | Snare | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Siphon** | `atk-grass3-rock1` | 3 Grass + 1 Rock | Grass | d6+d4 | 6.0 | 1.50 | d6 | -2 | 2 | Snare (a 1, 38%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleforge Siphon** | `atk-grass3-steel1` | 3 Grass + 1 Steel | Grass | d4+d4 | 5.0 | 1.25 | d6 | -1 | 2 | Snare (a 1, 44%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespray Siphon** | `atk-grass3-water1` | 3 Grass + 1 Water | Grass | d4+d4 | 5.0 | 1.25 | d6 (⌖ +2) | -1 | 2 | Snare (a 1, 44%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblelight Harvest** | `atk-astral1-grass4` | 1 Astral + 4 Grass | Grass | d4+d4 | 6.7 | 1.33 | d6 | -2 | 4 | Snare (a 1, 44%) | Cascade d4 | On a hit, you heal 3 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblelight Overrun** | `atk-astral2-grass3` | 2 Astral + 3 Grass | Grass | d4+d4 | 7.1 | 1.42 | d6 | -1 | 3 | Snare (a 1, 44%) | Cascade d6 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleheart Harvest** | `atk-charm1-grass4` | 1 Charm + 4 Grass | Grass | d4+d4+1 | 6.0 | 1.20 | d6 | -2 | 4 | Snare (a 1, 44%) | Purge | On a hit, you heal 3 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleheart Overrun** | `atk-charm2-grass3` | 2 Charm + 3 Grass | Grass | d4+d4 | 5.0 | 1.00 | d6 | -1 | 3 | Snare (a 1, 44%) | Purge: Snare | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespark Harvest** | `atk-electric1-grass4` | 1 Electric + 4 Grass | Grass | d4+d4+1 | 6.0 | 1.20 | d6 | 0 | 4 | Snare (a 1, 44%) | — | On a hit, you heal 3 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespark Overrun** | `atk-electric2-grass3` | 2 Electric + 3 Grass | Grass | d6+1 | 4.5 | 0.90 | d6 (✸ 6) | 0 | 3 | Snare | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Harvest** | `atk-fire1-grass4` | 1 Fire + 4 Grass | Grass | d4+d4+1 | 6.0 | 1.20 | d6 | -2 | 4 | Snare (1–2, 75%) | Potency 1 | On a hit, you heal 3 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleblaze Overrun** | `atk-fire2-grass3` | 2 Fire + 3 Grass | Grass | d4+d4+1 | 6.0 | 1.20 | d6 | -1 | 4 | Snare (1–3, 94%) | Potency 2 | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Overrun** | `atk-grass3-rock2` | 3 Grass + 2 Rock | Grass | d8+d4+1 | 8.0 | 1.60 | d6 (⌖ ✕) | -3 | 3 | Snare (a 1, 34%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleforge Overrun** | `atk-grass3-steel2` | 3 Grass + 2 Steel | Grass | d4+4 | 6.5 | 1.30 | d6 | -1 | 3 | Snare | — | On a hit, the foe gets −1 Ward and you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespray Overrun** | `atk-grass3-water2` | 3 Grass + 2 Water | Grass | d4+d4+1 | 6.0 | 1.20 | d6 (⌖ +3) | -1 | 3 | Snare (a 1, 44%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblegrit Harvest** | `atk-grass4-rock1` | 4 Grass + 1 Rock | Grass | d6+d4+1 | 7.0 | 1.40 | d6 | -3 | 4 | Snare (a 1, 38%) | — | On a hit, you heal 3 Health. | — | Placeholder | ☐ | ☐ |
| **Brambleforge Harvest** | `atk-grass4-steel1` | 4 Grass + 1 Steel | Grass | d4+d4+2 | 7.0 | 1.40 | d6 | -2 | 4 | Snare (a 1, 44%) | — | On a hit, you heal 3 Health. | — | Placeholder | ☐ | ☐ |
| **Bramblespray Harvest** | `atk-grass4-water1` | 4 Grass + 1 Water | Grass | d4+d4+1 | 6.0 | 1.20 | d6 (⌖ +2) | -2 | 4 | Snare (a 1, 44%) | — | On a hit, you heal 3 Health. | — | Placeholder | ☐ | ☐ |

## Rock attacks

47 attacks that hit as Rock (42 placeholders). Status on a damage roll of 1: Stagger.

### Rock: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pebble Shot** | `pebble-shot` | 1 Rock | Rock | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Stagger | — | — | — | Hand-made | ☑ | ☐ |
| **Rockslide** | `rockslide` | 2 Rock + 1 Neutral | Rock | d4+d4 | 5.0 | 1.67 | d6 | -1 | 1 | Stagger (a 1, 44%) | — | — | — | Hand-made | ☑ | ☐ |
| **Grit Squall** | `grit-squall` | 3 Rock | Rock | d8 | 4.5 | 1.50 | d6 | -2 | 2 | Stagger (1–4, 50%) | Potency 3 | — | — | Hand-made | ☑ | ☐ |
| **Canyon Quake** | `canyon-quake` | 4 Rock + 1 Neutral | Rock | d12+3 | 9.5 | 1.90 | d6 (⌖ ✕) | -4 | 3 | Stagger | — | — | ⬆ Strong for its cost (+2 vs baseline) | Hand-made | ☑ | ☐ |
| **Stone Worldbreaker** | `atk-rock5` | 5 Rock | Rock | d12+2 | 8.5 | 1.70 | d8 (⌖ ✕) | -6 | 3 | Stagger | — | — | — | Placeholder | ☐ | ☐ |

### Rock: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Stonelight Chip** | `atk-astral1-rock1-rock` | 1 Astral + 1 Rock | Rock | d8 | 4.9 | 2.46 | d6 | -1 | 1 | Stagger | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Chip** | `atk-charm1-rock1-rock` | 1 Charm + 1 Rock | Rock | d6 | 3.5 | 1.75 | d6 | -1 | 1 | Stagger | Purge | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Chip** | `atk-electric1-rock1-rock` | 1 Electric + 1 Rock | Rock | d8 | 4.5 | 2.25 | d6 | +1 | 1 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Chip** | `atk-fire1-rock1-rock` | 1 Fire + 1 Rock | Rock | d8 | 4.5 | 2.25 | d6 | -1 | 1 | Stagger (1–2, 25%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Chip** | `atk-grass1-rock1-rock` | 1 Grass + 1 Rock | Rock | d8 | 4.5 | 2.25 | d6 | -1 | 1 | Stagger | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Stoneforge Chip** | `atk-rock1-steel1-rock` | 1 Rock + 1 Steel | Rock | d6+1 | 4.5 | 2.25 | d6 | -1 | 1 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Chip** | `atk-rock1-water1-rock` | 1 Rock + 1 Water | Rock | d8 | 4.5 | 2.25 | d6 (⌖ +2) | -1 | 1 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Crack** | `atk-astral1-rock2` | 1 Astral + 2 Rock | Rock | d8+1 | 5.9 | 1.97 | d6 | -2 | 2 | Stagger | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Crack** | `atk-charm1-rock2` | 1 Charm + 2 Rock | Rock | d8+1 | 5.5 | 1.83 | d6 | -2 | 2 | Stagger | Purge | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Crack** | `atk-electric1-rock2` | 1 Electric + 2 Rock | Rock | d8+1 | 5.5 | 1.83 | d6 | 0 | 2 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Crack** | `atk-fire1-rock2` | 1 Fire + 2 Rock | Rock | d8+1 | 5.5 | 1.83 | d6 | -2 | 2 | Stagger (1–2, 25%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Crack** | `atk-grass1-rock2` | 1 Grass + 2 Rock | Rock | d8+1 | 5.5 | 1.83 | d6 | -2 | 2 | Stagger | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Shatterpoint** | `shatterpoint` | 2 Rock + 1 Steel | Rock | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Stagger | Purge: Sunder | — | — | Hand-made | ☑ | ☐ |
| **Stonespray Crack** | `atk-rock2-water1` | 2 Rock + 1 Water | Rock | d8+1 | 5.5 | 1.83 | d6 (⌖ +2) | -2 | 2 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Crush** | `atk-astral1-rock3` | 1 Astral + 3 Rock | Rock | d10+2 | 7.8 | 1.96 | d6 (⌖ ✕) | -3 | 2 | Stagger | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Tremor** | `atk-astral2-rock2-rock` | 2 Astral + 2 Rock | Rock | d10+1 | 7.1 | 1.78 | d6 (⌖ ✕) | -3 | 2 | Stagger | Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Crush** | `atk-charm1-rock3` | 1 Charm + 3 Rock | Rock | d10+1 | 6.5 | 1.63 | d6 (⌖ ✕) | -3 | 2 | Stagger | Purge | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Tremor** | `atk-charm2-rock2-rock` | 2 Charm + 2 Rock | Rock | d10 | 5.5 | 1.38 | d6 (⌖ ✕) | -3 | 2 | Stagger | Purge: Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Crush** | `atk-electric1-rock3` | 1 Electric + 3 Rock | Rock | d10+2 | 7.5 | 1.88 | d6 (⌖ ✕) | -1 | 2 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Tremor** | `atk-electric2-rock2-rock` | 2 Electric + 2 Rock | Rock | d8 | 4.5 | 1.13 | d6 (✸ 6) (⌖ ✕) | -2 | 2 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Crush** | `atk-fire1-rock3` | 1 Fire + 3 Rock | Rock | d10+2 | 7.5 | 1.88 | d6 (⌖ ✕) | -3 | 2 | Stagger (1–2, 20%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Tremor** | `atk-fire2-rock2-rock` | 2 Fire + 2 Rock | Rock | d10+2 | 7.5 | 1.88 | d6 (⌖ ✕) | -3 | 3 | Stagger (1–3, 30%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Crush** | `atk-grass1-rock3` | 1 Grass + 3 Rock | Rock | d10+2 | 7.5 | 1.88 | d6 (⌖ ✕) | -3 | 2 | Stagger | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Stonethorn Tremor** | `atk-grass2-rock2-rock` | 2 Grass + 2 Rock | Rock | d10+1 | 6.5 | 1.63 | d6 (⌖ ✕) | -3 | 2 | Stagger | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Stoneforge Tremor** | `atk-rock2-steel2-rock` | 2 Rock + 2 Steel | Rock | d6+3 | 6.5 | 1.63 | d6 (⌖ ✕) | -3 | 2 | Stagger | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Stonespray Tremor** | `atk-rock2-water2-rock` | 2 Rock + 2 Water | Rock | d10 | 5.5 | 1.38 | d6 (⌖ +3) | -3 | 2 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Crush** | `atk-rock3-steel1` | 3 Rock + 1 Steel | Rock | d8+3 | 7.5 | 1.88 | d6 (⌖ ✕) | -3 | 2 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Crush** | `atk-rock3-water1` | 3 Rock + 1 Water | Rock | d10+1 | 6.5 | 1.63 | d6 (⌖ +2) | -3 | 2 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Monolith** | `atk-astral1-rock4` | 1 Astral + 4 Rock | Rock | d12+1 | 7.8 | 1.56 | d8 (⌖ ✕) | -4 | 3 | Stagger | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Stonelight Landslide** | `atk-astral2-rock3` | 2 Astral + 3 Rock | Rock | d10+3 | 9.1 | 1.82 | d6 (⌖ ✕) | -3 | 3 | Stagger | Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Monolith** | `atk-charm1-rock4` | 1 Charm + 4 Rock | Rock | d12 | 6.5 | 1.30 | d8 (⌖ ✕) | -4 | 3 | Stagger | Purge | — | — | Placeholder | ☐ | ☐ |
| **Stoneheart Landslide** | `atk-charm2-rock3` | 2 Charm + 3 Rock | Rock | d10+2 | 7.5 | 1.50 | d6 (⌖ ✕) | -3 | 3 | Stagger | Purge: Stagger | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Monolith** | `atk-electric1-rock4` | 1 Electric + 4 Rock | Rock | d12+1 | 7.5 | 1.50 | d8 (⌖ ✕) | -2 | 3 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonespark Landslide** | `atk-electric2-rock3` | 2 Electric + 3 Rock | Rock | d10+1 | 6.5 | 1.30 | d6 (✸ 6) (⌖ ✕) | -2 | 3 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Monolith** | `atk-fire1-rock4` | 1 Fire + 4 Rock | Rock | d12+1 | 7.5 | 1.50 | d8 (⌖ ✕) | -4 | 3 | Stagger (1–2, 17%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Stoneblaze Landslide** | `atk-fire2-rock3` | 2 Fire + 3 Rock | Rock | d10+4 | 9.5 | 1.90 | d6 (⌖ ✕) | -3 | 4 | Stagger (1–3, 30%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Stonethorn Monolith** | `atk-grass1-rock4` | 1 Grass + 4 Rock | Rock | d12+1 | 7.5 | 1.50 | d8 (⌖ ✕) | -4 | 3 | Stagger | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Stonethorn Landslide** | `atk-grass2-rock3` | 2 Grass + 3 Rock | Rock | d10+3 | 8.5 | 1.70 | d6 (⌖ ✕) | -3 | 3 | Stagger | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Stoneforge Landslide** | `atk-rock3-steel2` | 3 Rock + 2 Steel | Rock | d6+5 | 8.5 | 1.70 | d6 (⌖ ✕) | -3 | 3 | Stagger | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Stonespray Landslide** | `atk-rock3-water2` | 3 Rock + 2 Water | Rock | d10+2 | 7.5 | 1.50 | d6 (⌖ +3) | -3 | 3 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stoneforge Monolith** | `atk-rock4-steel1` | 4 Rock + 1 Steel | Rock | d10+2 | 7.5 | 1.50 | d8 (⌖ ✕) | -4 | 3 | Stagger | — | — | — | Placeholder | ☐ | ☐ |
| **Stonespray Monolith** | `atk-rock4-water1` | 4 Rock + 1 Water | Rock | d12+1 | 7.5 | 1.50 | d8 (⌖ +2) | -4 | 3 | Stagger | — | — | — | Placeholder | ☐ | ☐ |

## Steel attacks

47 attacks that hit as Steel (42 placeholders). Status on a damage roll of 1: Sunder.

### Steel: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Rivet** | `rivet` | 1 Steel | Steel | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Sunder | — | — | — | Hand-made | ☑ | ☐ |
| **Iron Tide** | `iron-tide` | 2 Steel + 1 Neutral | Steel | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Sunder | — | — | — | Hand-made | ☑ | ☐ |
| **Rust Rain** | `rust-rain` | 3 Steel | Steel | d4+1 | 3.5 | 1.17 | d6 | -1 | 2 | Sunder (1–2, 50%) | Potency 1 | — | — | Hand-made | ☑ | ☐ |
| **Anchor Drop** | `anchor-drop` | 4 Steel + 1 Neutral | Steel | d4+4 | 6.5 | 1.30 | d6 | -2 | 3 | Sunder | — | On a hit, the foe gets −1 Ward. | — | Hand-made | ☑ | ☐ |
| **Iron Colossus** | `atk-steel5` | 5 Steel | Steel | d4+4 | 6.5 | 1.30 | d6 | -2 | 3 | Sunder | — | On a hit, the foe gets −2 Ward. | — | Placeholder | ☐ | ☐ |

### Steel: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Ironlight Nick** | `atk-astral1-steel1-steel` | 1 Astral + 1 Steel | Steel | d4+1 | 4.3 | 2.17 | d6 | -1 | 1 | Sunder | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Nick** | `atk-charm1-steel1-steel` | 1 Charm + 1 Steel | Steel | d4+1 | 3.5 | 1.75 | d6 | -1 | 1 | Sunder | Purge | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Nick** | `atk-electric1-steel1-steel` | 1 Electric + 1 Steel | Steel | d4+1 | 3.5 | 1.75 | d6 | +1 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Nick** | `atk-fire1-steel1-steel` | 1 Fire + 1 Steel | Steel | d4+1 | 3.5 | 1.75 | d6 | -1 | 1 | Sunder (1–2, 50%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Nick** | `atk-grass1-steel1-steel` | 1 Grass + 1 Steel | Steel | d4+2 | 4.5 | 2.25 | d6 | -1 | 1 | Sunder | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Irongrit Nick** | `atk-rock1-steel1-steel` | 1 Rock + 1 Steel | Steel | d6+1 | 4.5 | 2.25 | d6 | -2 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Nick** | `atk-steel1-water1-steel` | 1 Steel + 1 Water | Steel | d4+2 | 4.5 | 2.25 | d6 (⌖ +2) | -1 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Shear** | `atk-astral1-steel2` | 1 Astral + 2 Steel | Steel | d4+2 | 5.3 | 1.78 | d6 | -1 | 1 | Sunder | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Shear** | `atk-charm1-steel2` | 1 Charm + 2 Steel | Steel | d4+2 | 4.5 | 1.50 | d6 | -1 | 1 | Sunder | Purge | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Shear** | `atk-electric1-steel2` | 1 Electric + 2 Steel | Steel | d4+2 | 4.5 | 1.50 | d6 | +1 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Shear** | `atk-fire1-steel2` | 1 Fire + 2 Steel | Steel | d4+2 | 4.5 | 1.50 | d6 | -1 | 1 | Sunder (1–2, 50%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Shear** | `atk-grass1-steel2` | 1 Grass + 2 Steel | Steel | d4+2 | 4.5 | 1.50 | d6 | -1 | 1 | Sunder | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Pile Driver** | `pile-driver` | 1 Rock + 2 Steel | Steel | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Sunder | Purge: Stagger | — | — | Hand-made | ☑ | ☐ |
| **Ironspray Shear** | `atk-steel2-water1` | 2 Steel + 1 Water | Steel | d4+2 | 4.5 | 1.50 | d6 (⌖ +2) | -1 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Hammerfall** | `atk-astral1-steel3` | 1 Astral + 3 Steel | Steel | d4+2 | 5.3 | 1.33 | d6 | -1 | 1 | Sunder | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Press** | `atk-astral2-steel2-steel` | 2 Astral + 2 Steel | Steel | d4+2 | 6.0 | 1.51 | d6 | -1 | 1 | Sunder | Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Hammerfall** | `atk-charm1-steel3` | 1 Charm + 3 Steel | Steel | d4+2 | 4.5 | 1.13 | d6 | -1 | 1 | Sunder | Purge | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Press** | `atk-charm2-steel2-steel` | 2 Charm + 2 Steel | Steel | d4+2 | 4.5 | 1.13 | d6 | -1 | 1 | Sunder | Purge: Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Hammerfall** | `atk-electric1-steel3` | 1 Electric + 3 Steel | Steel | d4+3 | 5.5 | 1.38 | d6 | +1 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Press** | `atk-electric2-steel2-steel` | 2 Electric + 2 Steel | Steel | d4+1 | 3.5 | 0.88 | d6 (✸ 6) | 0 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Hammerfall** | `atk-fire1-steel3` | 1 Fire + 3 Steel | Steel | d4+3 | 5.5 | 1.38 | d6 | -1 | 1 | Sunder (1–2, 50%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Press** | `atk-fire2-steel2-steel` | 2 Fire + 2 Steel | Steel | d4+3 | 5.5 | 1.38 | d6 | -1 | 2 | Sunder (1–3, 75%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Hammerfall** | `atk-grass1-steel3` | 1 Grass + 3 Steel | Steel | d4+3 | 5.5 | 1.38 | d6 | -1 | 1 | Sunder | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Ironthorn Press** | `atk-grass2-steel2-steel` | 2 Grass + 2 Steel | Steel | d4+2 | 4.5 | 1.13 | d6 | -1 | 1 | Sunder | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Irongrit Hammerfall** | `atk-rock1-steel3` | 1 Rock + 3 Steel | Steel | d6+3 | 6.5 | 1.63 | d6 | -2 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Irongrit Press** | `atk-rock2-steel2-steel` | 2 Rock + 2 Steel | Steel | d8+2 | 6.5 | 1.63 | d6 (⌖ ✕) | -3 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Press** | `atk-steel2-water2-steel` | 2 Steel + 2 Water | Steel | d4+2 | 4.5 | 1.13 | d6 (⌖ +3) | -1 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Hammerfall** | `atk-steel3-water1` | 3 Steel + 1 Water | Steel | d4+3 | 5.5 | 1.38 | d6 (⌖ +2) | -1 | 1 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironlight Guillotine** | `atk-astral1-steel4` | 1 Astral + 4 Steel | Steel | d4+4 | 7.3 | 1.47 | d6 | -2 | 3 | Sunder | Cascade d4 | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Ironlight Dismantle** | `atk-astral2-steel3` | 2 Astral + 3 Steel | Steel | d4+3 | 7.0 | 1.41 | d6 | -1 | 2 | Sunder | Cascade d10 | — | — | Placeholder | ☐ | ☐ |
| **Ironheart Guillotine** | `atk-charm1-steel4` | 1 Charm + 4 Steel | Steel | d4+4 | 6.5 | 1.30 | d6 | -2 | 3 | Sunder | Purge | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Ironheart Dismantle** | `atk-charm2-steel3` | 2 Charm + 3 Steel | Steel | d4+3 | 5.5 | 1.10 | d6 | -1 | 2 | Sunder | Purge: Sunder | — | — | Placeholder | ☐ | ☐ |
| **Ironspark Guillotine** | `atk-electric1-steel4` | 1 Electric + 4 Steel | Steel | d4+4 | 6.5 | 1.30 | d6 | 0 | 3 | Sunder | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Ironspark Dismantle** | `atk-electric2-steel3` | 2 Electric + 3 Steel | Steel | d4+2 | 4.5 | 0.90 | d6 (✸ 6) | 0 | 2 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironblaze Guillotine** | `atk-fire1-steel4` | 1 Fire + 4 Steel | Steel | d4+4 | 6.5 | 1.30 | d6 | -2 | 3 | Sunder (1–2, 50%) | Potency 1 | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Ironblaze Dismantle** | `atk-fire2-steel3` | 2 Fire + 3 Steel | Steel | d4+4 | 6.5 | 1.30 | d6 | -1 | 3 | Sunder (1–3, 75%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Ironthorn Guillotine** | `atk-grass1-steel4` | 1 Grass + 4 Steel | Steel | d4+4 | 6.5 | 1.30 | d6 | -2 | 3 | Sunder | — | On a hit, the foe gets −1 Ward and you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Ironthorn Dismantle** | `atk-grass2-steel3` | 2 Grass + 3 Steel | Steel | d4+4 | 6.5 | 1.30 | d6 | -1 | 2 | Sunder | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Irongrit Guillotine** | `atk-rock1-steel4` | 1 Rock + 4 Steel | Steel | d6+4 | 7.5 | 1.50 | d6 | -3 | 3 | Sunder | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Irongrit Dismantle** | `atk-rock2-steel3` | 2 Rock + 3 Steel | Steel | d8+4 | 8.5 | 1.70 | d6 (⌖ ✕) | -3 | 2 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Dismantle** | `atk-steel3-water2` | 3 Steel + 2 Water | Steel | d4+4 | 6.5 | 1.30 | d6 (⌖ +3) | -1 | 2 | Sunder | — | — | — | Placeholder | ☐ | ☐ |
| **Ironspray Guillotine** | `atk-steel4-water1` | 4 Steel + 1 Water | Steel | d4+4 | 6.5 | 1.30 | d6 (⌖ +2) | -2 | 3 | Sunder | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |

## Water attacks

47 attacks that hit as Water (42 placeholders). Status on a damage roll of 1: Soak.

### Water: single-type

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Splash Jet** | `splash-jet` | 1 Water | Water | d4 | 2.5 | 2.50 | d6 | 0 | 1 | Soak | — | — | — | Hand-made | ☑ | ☐ |
| **Tide Crash** | `tide-crash` | 2 Water + 1 Neutral | Water | d6 | 3.5 | 1.17 | d6 | 0 | 1 | Soak | — | — | — | Hand-made | ☑ | ☐ |
| **Undertow** | `undertow` | 3 Water | Water | d6 | 3.5 | 1.17 | d6 (⌖ +2) | 0 | 2 | Soak (1–3, 50%) | Potency 2 | — | — | Hand-made | ☑ | ☐ |
| **Maelstrom** | `maelstrom` | 4 Water + 1 Neutral | Water | d10+d4 | 8.0 | 1.60 | d6 (⌖ +2) | -3 | 3 | Soak (a 1, 32%) | Purge | — | — | Hand-made | ☑ | ☐ |
| **Tide Leviathan** | `atk-water5` | 5 Water | Water | d4+d6 | 6.0 | 1.20 | d6 (⌖ +3) | +2 | 3 | Soak (a 1, 38%) | — | — | — | Placeholder | ☐ | ☐ |

### Water: dual-type

Sorted by total cost. An even split (e.g. 2 + 2) has one attack for each of its two types.

| Name | ID | Cost | Hits as | Damage | Avg | Avg / energy | Accuracy | Speed | Effort | Status | Keywords | Effect | Balance note | Source | Design | Balance |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Tidelight Ripple** | `atk-astral1-water1-water` | 1 Astral + 1 Water | Water | d4+1 | 4.3 | 2.17 | d6 | +1 | 1 | Soak | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Ripple** | `atk-charm1-water1-water` | 1 Charm + 1 Water | Water | d4 | 2.5 | 1.25 | d6 | +1 | 1 | Soak | Purge | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Ripple** | `atk-electric1-water1-water` | 1 Electric + 1 Water | Water | d4+1 | 3.5 | 1.75 | d6 | +3 | 1 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Ripple** | `atk-fire1-water1-water` | 1 Fire + 1 Water | Water | d4+1 | 3.5 | 1.75 | d6 | +1 | 1 | Soak (1–2, 50%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Ripple** | `atk-grass1-water1-water` | 1 Grass + 1 Water | Water | d4+1 | 3.5 | 1.75 | d6 | +1 | 1 | Soak | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Tidegrit Ripple** | `atk-rock1-water1-water` | 1 Rock + 1 Water | Water | d6+1 | 4.5 | 2.25 | d6 | 0 | 1 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Ripple** | `atk-steel1-water1-water` | 1 Steel + 1 Water | Water | d4+1 | 3.5 | 1.75 | d6 | +1 | 1 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Current** | `atk-astral1-water2` | 1 Astral + 2 Water | Water | d6+1 | 5.1 | 1.69 | d6 (⌖ +2) | 0 | 2 | Soak | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Current** | `atk-charm1-water2` | 1 Charm + 2 Water | Water | d6+1 | 4.5 | 1.50 | d6 (⌖ +2) | 0 | 2 | Soak | Purge | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Current** | `atk-electric1-water2` | 1 Electric + 2 Water | Water | d6+1 | 4.5 | 1.50 | d6 (⌖ +2) | +2 | 2 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Quench** | `quench` | 1 Fire + 2 Water | Water | d6+1 | 4.5 | 1.50 | d6 | 0 | 2 | Soak | Purge: Burn | — | — | Hand-made | ☑ | ☐ |
| **Tidethorn Current** | `atk-grass1-water2` | 1 Grass + 2 Water | Water | d6+1 | 4.5 | 1.50 | d6 (⌖ +2) | 0 | 2 | Soak | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Tidegrit Current** | `atk-rock1-water2` | 1 Rock + 2 Water | Water | d8+1 | 5.5 | 1.83 | d6 (⌖ +2) | -1 | 2 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Current** | `atk-steel1-water2` | 1 Steel + 2 Water | Water | d4+2 | 4.5 | 1.50 | d6 (⌖ +2) | 0 | 2 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Breaker** | `atk-astral1-water3` | 1 Astral + 3 Water | Water | d6+2 | 6.1 | 1.51 | d6 (⌖ +2) | 0 | 2 | Soak | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Swell** | `atk-astral2-water2-water` | 2 Astral + 2 Water | Water | d6+1 | 5.2 | 1.30 | d6 (⌖ +2) | 0 | 2 | Soak | Cascade d6 | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Breaker** | `atk-charm1-water3` | 1 Charm + 3 Water | Water | d6+1 | 4.5 | 1.13 | d6 (⌖ +2) | 0 | 2 | Soak | Purge | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Swell** | `atk-charm2-water2-water` | 2 Charm + 2 Water | Water | d6+1 | 4.5 | 1.13 | d6 (⌖ +2) | 0 | 2 | Soak | Purge: Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Breaker** | `atk-electric1-water3` | 1 Electric + 3 Water | Water | d6+2 | 5.5 | 1.38 | d6 (⌖ +2) | +2 | 2 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Swell** | `atk-electric2-water2-water` | 2 Electric + 2 Water | Water | d6 | 3.5 | 0.88 | d6 (✸ 6) (⌖ +2) | +1 | 2 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Breaker** | `atk-fire1-water3` | 1 Fire + 3 Water | Water | d4+d4 | 5.0 | 1.25 | d6 (⌖ +2) | 0 | 2 | Soak (1–2, 75%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Swell** | `atk-fire2-water2-water` | 2 Fire + 2 Water | Water | d4+d4 | 5.0 | 1.25 | d6 (⌖ +2) | 0 | 3 | Soak (1–3, 94%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Breaker** | `atk-grass1-water3` | 1 Grass + 3 Water | Water | d4+d4 | 5.0 | 1.25 | d6 (⌖ +2) | 0 | 2 | Soak (a 1, 44%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Tidethorn Swell** | `atk-grass2-water2-water` | 2 Grass + 2 Water | Water | d6+1 | 4.5 | 1.13 | d6 (⌖ +2) | 0 | 2 | Soak | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Tidegrit Breaker** | `atk-rock1-water3` | 1 Rock + 3 Water | Water | d6+d4 | 6.0 | 1.50 | d6 (⌖ +2) | -1 | 2 | Soak (a 1, 38%) | — | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Swell** | `atk-rock2-water2-water` | 2 Rock + 2 Water | Water | d8+d4 | 7.0 | 1.75 | d6 (⌖ ✕) | -2 | 2 | Soak (a 1, 34%) | — | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Breaker** | `atk-steel1-water3` | 1 Steel + 3 Water | Water | d4+d4 | 5.0 | 1.25 | d6 (⌖ +2) | 0 | 2 | Soak (a 1, 44%) | — | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Swell** | `atk-steel2-water2-water` | 2 Steel + 2 Water | Water | d4+2 | 4.5 | 1.13 | d6 (⌖ +2) | 0 | 2 | Soak | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |
| **Tidelight Abyss** | `atk-astral1-water4` | 1 Astral + 4 Water | Water | d6+3 | 7.1 | 1.41 | d6 (⌖ +3) | -1 | 3 | Soak | Cascade d4 | — | — | Placeholder | ☐ | ☐ |
| **Tidelight Deluge** | `atk-astral2-water3` | 2 Astral + 3 Water | Water | d4+d4 | 7.1 | 1.42 | d6 (⌖ +2) | 0 | 3 | Soak (a 1, 44%) | Cascade d6 | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Abyss** | `atk-charm1-water4` | 1 Charm + 4 Water | Water | d6+2 | 5.5 | 1.10 | d6 (⌖ +3) | -1 | 3 | Soak | Purge | — | — | Placeholder | ☐ | ☐ |
| **Tideheart Deluge** | `atk-charm2-water3` | 2 Charm + 3 Water | Water | d4+d4 | 5.0 | 1.00 | d6 (⌖ +2) | 0 | 3 | Soak (a 1, 44%) | Purge: Soak | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Abyss** | `atk-electric1-water4` | 1 Electric + 4 Water | Water | d4+d6 | 6.0 | 1.20 | d6 (⌖ +3) | +1 | 3 | Soak (a 1, 38%) | — | — | — | Placeholder | ☐ | ☐ |
| **Tidespark Deluge** | `atk-electric2-water3` | 2 Electric + 3 Water | Water | d6+1 | 4.5 | 0.90 | d6 (✸ 6) (⌖ +2) | +1 | 3 | Soak | — | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Abyss** | `atk-fire1-water4` | 1 Fire + 4 Water | Water | d4+d6 | 6.0 | 1.20 | d6 (⌖ +3) | -1 | 3 | Soak (1–2, 67%) | Potency 1 | — | — | Placeholder | ☐ | ☐ |
| **Tideblaze Deluge** | `atk-fire2-water3` | 2 Fire + 3 Water | Water | d6+d4 | 6.0 | 1.20 | d6 (⌖ +2) | 0 | 4 | Soak (1–3, 88%) | Potency 2 | — | — | Placeholder | ☐ | ☐ |
| **Tidethorn Abyss** | `atk-grass1-water4` | 1 Grass + 4 Water | Water | d4+d6 | 6.0 | 1.20 | d6 (⌖ +3) | -1 | 3 | Soak (a 1, 38%) | — | On a hit, you heal 1 Health. | — | Placeholder | ☐ | ☐ |
| **Tidethorn Deluge** | `atk-grass2-water3` | 2 Grass + 3 Water | Water | d6+d4 | 6.0 | 1.20 | d6 (⌖ +2) | 0 | 3 | Soak (a 1, 38%) | — | On a hit, you heal 2 Health. | — | Placeholder | ☐ | ☐ |
| **Tidegrit Abyss** | `atk-rock1-water4` | 1 Rock + 4 Water | Water | d6+d6 | 7.0 | 1.40 | d6 (⌖ +3) | -2 | 3 | Soak (a 1, 31%) | — | — | — | Placeholder | ☐ | ☐ |
| **Tidegrit Deluge** | `atk-rock2-water3` | 2 Rock + 3 Water | Water | d10+d4+1 | 9.0 | 1.80 | d6 (⌖ ✕) | -2 | 3 | Soak (a 1, 32%) | — | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Abyss** | `atk-steel1-water4` | 1 Steel + 4 Water | Water | d6+d4 | 6.0 | 1.20 | d6 (⌖ +3) | -1 | 3 | Soak (a 1, 38%) | — | — | — | Placeholder | ☐ | ☐ |
| **Tideforge Deluge** | `atk-steel2-water3` | 2 Steel + 3 Water | Water | d4+4 | 6.5 | 1.30 | d6 (⌖ +2) | 0 | 3 | Soak | — | On a hit, the foe gets −1 Ward. | — | Placeholder | ☐ | ☐ |

---

## Balance watch list

Hand-made moves whose damage stands out from the placeholder baseline for their cost. Worth a look in play.

| Move | Cost | Damage | Accuracy | Speed | Note |
|---|---|---|---|---|---|
| Meteor | 4 Astral + 1 Neutral | d10+d4 | d6 | -3 | ⬆ Strong for its cost (+1.9 vs baseline) |
| Canyon Quake | 4 Rock + 1 Neutral | d12+3 | d6 (⌖ ✕) | -4 | ⬆ Strong for its cost (+2 vs baseline) |
| Bewitching Waltz | 3 Charm | d4 | d8 | 0 | ⬇ Weak for its cost (-2 vs baseline) |
| Crackle Web | 3 Electric | d4 | d6 | +2 | ⬇ Weak for its cost (-1.5 vs baseline) |
| Borealis Lance | 3 Astral + 1 Neutral | d6+4 | d6 | +1 | ⬆ Strong for its cost (+2.3 vs baseline) |
| Mesa Breaker | 3 Rock + 1 Neutral | d10+2 | d6 | -1 | ⬆ Strong for its cost (+1.8 vs baseline) |
