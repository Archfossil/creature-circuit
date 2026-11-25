import { readdirSync } from 'node:fs';
import { ICON_NAMES, iconFor, splitIcons } from '../src/data/icons';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { effectiveness, TYPES, STRONG } from '../src/data/types';
import { SPECIES, SPECIES_BY_ID, STARTERS, activityFromTypes, isActive } from '../src/data/species';
import { ROSTER, TYPE_COMBOS, FAMILY_RARITIES, HANDMADE_SLOTS, HANDMADE_LEGENDARIES, EXTRA_FAMILIES, extraId } from '../src/data/roster';
import { attackWorth, targetWorth } from '../src/data/attackStyles';
import { BURN_DAMAGE, BY_TOTAL, RETIRED_MOVES, attackStat, STATUS_INFO, cascadeDie, critFaces, MOVES, MOVE_BY_ID, CATCH_BREATH, ATTACK_SLOTS, costKey, slotKey, statusChance, statusFaces, avgRoll, purgeBonus, moveKeywords } from '../src/data/moves';
import { MAP_NODES, MAP_EDGES, neighbors, CITIES, NODE_BY_ID, BIOME_TYPES, TOWNS, CLOUD_RING, CLOUD_EYE, KEY_ITEM_TOWNS, MAP_SCALE, isCloudNode, FOREST_FLOOR, LANTERN_GLADE, RAINBOW_PLAINS, WISP_SPOTS, WISP_REGION } from '../src/data/map';
import type { MapNode } from '../src/data/schema';
import { MARGOS } from '../src/regions';
import { gauntletBlock, gauntletLevel, gauntletProgress, gauntletSize } from '../src/regions/margos/gimmicks/gauntlet';
import { tools } from '../src/engine/tools';
import { cloudLapProgress } from '../src/regions/margos/gimmicks/salem';
import { prismType } from '../src/regions/margos/gimmicks/plains';
import { rollWisp, wispLit } from '../src/regions/margos/gimmicks/wisps';
import { DEPTHS_COST, depthsBlock, exploreDepths } from '../src/regions/margos/gimmicks/depths';
import { trailNeeded } from '../src/regions/margos/gimmicks/dahlia';
import { landmassOf, landField } from '../src/render/land';
import { WEATHER, NATURES, ABILITIES, SEASON_INFO, seasonForTurn, ITEMS, timeOfDay, BIOME_MATERIALS, RECIPES, NATURE_BY_ID } from '../src/data/content';
import { moveTrainer, record, worldLog, DEEDS_MAX } from '../src/engine/state';
import { addLine, logBattleEvent, BATTLE_LOG_MAX, type BattleLog } from '../src/engine/battleLog';
import { moveWorth, speciesOf, abilityOf, instinctIdOf, recommendPlaybook, suggestGoal, expectedDamage, stats, maxTotal, totalHealth, maxHearts, nameOf, TRAINER_BATTLE_XP_BONUS, createCreature, allocateEnergy, fits, energy, learnable, autoPlaybook, unlockNode, availableNodes, progressionTree, gainXp, participationXp, maxHealth, maxVitality, chartComplete, trainStat } from '../src/engine/creature';
import { applyEdit, setWaypoint } from '../src/engine/edits';
import { afflict, instinctOf, overhealCap, overhealOf, statusBlock, statusGuard, createBattle, resolveRound, sendIn, chooseAI, activeOf, typeMatchup, movePreview, chooseLead, foeOptions, foeReplacements, foeSendIn, effectValue, ringRounds, ringLeft, type Side, type BEvent } from '../src/engine/battle';
import { onSaveStatus, retrySave, newGame, addItem, keyTownOf, tierOf, migrate, migrateMatch, SAVE_VERSION, TRAINER_STYLES, earnCoins, newMatch, setActiveMatch, nextSeat, takenColors, MAX_PLAYERS, save, load, saveMatch, loadMatch, clearMatch, clearSave, parseSaveFile, listCopies, saveCopy, restoreCopy, renameCopy, deleteCopy, readCopy, saveKindOf, loadOnlineMatch, LIBRARY_MAX } from '../src/engine/state';
import * as W from '../src/engine/world';
import * as E from '../src/engine/events';
import * as I from '../src/engine/interactions';
import { teamworkOf, teamworkBonus, teamworkCap, addTeamwork, travelTogether, settleTeamwork } from '../src/engine/teamwork';
import { swapPreview, boostsOf, snap } from '../src/engine/battle';
import { SWAP_MOVES, describeSwap, swapText } from '../src/data/swapMoves';
import { swapChoices, swapLock, swapMoveOf, setSwapMove, defaultSwapMove, swapVals } from '../src/engine/swaps';
import { INSTINCTS, INSTINCT_BY_ID, instinctRules } from '../src/data/instincts';
import { Box3 } from 'three';
import { npcLook, opponentLook, NPC_OUTFITS } from '../src/render/npcLooks';
import { NPCS as NPC_LIST } from '../src/data/npcs';
import { buildTrainer, playerLook, arbiterLook, championLook, roamingLook, SKIN, HAIR, PANTS, HAT_OPTIONS, JACKET_OPTIONS, HAIR_STYLE_OPTIONS, TOP_PATTERN_OPTIONS, HAT_PATTERN_OPTIONS, HAIR_PATTERN_OPTIONS, hasPattern, topOf } from '../src/render/trainerModel';

const energyTotalOf = (c: ReturnType<typeof createCreature>) => Object.values(energy(c)).reduce((a, v) => a + (v ?? 0), 0);
const side = (kind: Side['kind'], team: ReturnType<typeof createCreature>[]): Side => ({ kind, name: kind, team, active: 0, mods: {} });

describe('type chart (docs/03)', () => {
  it('every type is strong against exactly two and weak to exactly two', () => {
    for (const t of TYPES) {
      expect(STRONG[t]).toHaveLength(2);
      expect(TYPES.filter((o) => STRONG[o].includes(t))).toHaveLength(2);
    }
  });
  it('applies 2x, 0.5x, 4x and immunity', () => {
    expect(effectiveness('fire', ['grass'])).toBe(2);
    expect(effectiveness('fire', ['water'])).toBe(0.5);
    expect(effectiveness('fire', ['grass', 'steel'])).toBe(4);
    expect(effectiveness('fire', ['water', 'astral'])).toBe(0); // resisted by both types
    expect(effectiveness('fire', ['rock'])).toBe(1);
  });
});

describe('content integrity', () => {
  it('species reference valid moves, evolutions and starters', () => {
    for (const s of SPECIES) {
      if (s.evolvesTo) expect(SPECIES_BY_ID[s.evolvesTo], s.id).toBeDefined();
      if (s.signature) expect(MOVE_BY_ID[s.signature], s.id).toBeDefined();
    }
    for (const id of STARTERS) expect(SPECIES_BY_ID[id].stage).toBe(1);
  });
  it('includes the Emberfish line', () => {
    expect(SPECIES_BY_ID.emberfish.types).toEqual(['fire', 'water']);
    expect(SPECIES_BY_ID.emberfish.look.shape).toBe('fish');
    expect(SPECIES_BY_ID.emberfish.evolvesTo).toBe('cinderkoi');
  });
  it('ids are unique', () => {
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
    expect(new Set(MOVES.map((m) => m.id)).size).toBe(MOVES.length);
    expect(new Set(MAP_NODES.map((n) => n.id)).size).toBe(MAP_NODES.length);
  });
  it('every map node is reachable and every city has data', () => {
    const seen = new Set(['stadium']);
    const q = ['stadium'];
    while (q.length) for (const { node } of neighbors(q.shift()!)) if (!seen.has(node.id)) { seen.add(node.id); q.push(node.id); }
    expect(seen.size).toBe(MAP_NODES.length);
    for (const n of MAP_NODES.filter((x) => x.kind === 'city')) expect(CITIES[n.id]).toBeDefined();
  });
  it('season weather dice reference real weather', () => {
    for (const s of Object.values(SEASON_INFO)) { expect(s.dice).toHaveLength(6); for (const w of s.dice) expect(WEATHER[w]).toBeDefined(); }
  });
});

describe('energy & playbook (docs/03 Energy)', () => {
  it('neutral slots take any energy; prisma fills typed gaps', () => {
    expect(fits({ fire: 3 }, ['fire-claw'])).toBe(true);           // 2 fire + 1 neutral
    expect(fits({ fire: 2 }, ['fire-claw'])).toBe(false);
    expect(fits({ fire: 1, water: 2 }, ['fire-claw'])).toBe(false); // short 1 fire
    expect(fits({ fire: 1, water: 1, prisma: 1 }, ['fire-claw'])).toBe(true);
  });
  it('energy committed to one move cannot be reused by another', () => {
    expect(fits({ fire: 3 }, ['fire-claw', 'ember'])).toBe(false);
    expect(fits({ fire: 4 }, ['fire-claw', 'ember'])).toBe(true);
  });
  it('every species at every level gets a legal, own-type playbook', () => {
    for (const s of SPECIES) for (const lv of [1, 6, 12]) {
      const c = createCreature(s.id, lv);
      expect(c.playbook.length, s.id).toBeGreaterThan(0);
      expect(c.playbook.length).toBeLessThanOrEqual(4);
      expect(fits(energy(c), c.playbook)).toBe(true);
      for (const id of c.playbook) expect(learnable(c)).toContain(id);
    }
  });
  it('starters get a varied playbook', () => {
    for (const id of STARTERS) expect(autoPlaybook(createCreature(id, 2)).length).toBeGreaterThanOrEqual(3);
  });
});

describe('creature growth', () => {
  it('Health is 5 × Vigor, in hearts of 5', () => {
    const c = createCreature('cindercub', 1, { nature: 'timid' });
    expect(maxHealth(c)).toBe(c.health);
    expect(maxHealth(c)).toBe(5);
    expect(maxVitality(c)).toBe(stats(c).vigor - 1);
    expect([totalHealth(c), maxTotal(c)]).toEqual([5 * stats(c).vigor, 5 * stats(c).vigor]);
  });
  it('10 XP is a level and a chart node', () => {
    const c = createCreature('cindercub', 1);
    expect(gainXp(c, 10)).toBe(1);
    expect(c.points).toBe(1);
    const first = availableNodes(c)[0];
    expect(unlockNode(c, first.id)).toBe(true);
    expect(c.points).toBe(0);
  });
  it('evolving takes the whole center path of a stage-1 chart', () => {
    const c = createCreature('emberfish', 1);
    c.points = 10;
    for (const id of ['a', 'b', 'c', 'e', 'h', 'evo']) expect(unlockNode(c, id), id).toBe(true);
    expect(c.species).toBe('cinderkoi');
    expect(c.unlocked).toEqual([]);
    expect(c.points).toBe(4);
  });
});

describe('battle engine', () => {
  it('always resolves without stalling', () => {
    for (let i = 0; i < 300; i++) {
      const a = SPECIES[i % SPECIES.length].id, b = SPECIES[(i * 7) % SPECIES.length].id;
      const bt = createBattle(side('player', [createCreature(a, 4), createCreature('puddlit', 3)]), side('wild', [createCreature(b, 4)]), WEATHER.clear);
      let r = 0;
      while (!bt.over && r++ < 150) {
        resolveRound(bt, chooseAI(bt, 0));
        if (bt.needSwap) sendIn(bt, bt.sides[0].team.findIndex((c) => !c.ko));
      }
      expect(bt.over, `${a} vs ${b}`).not.toBeNull();
    }
  });
  it('a KO restores the victor\'s Health but not Vitality', () => {
    const me = createCreature('calderex', 10);
    const foe = createCreature('sproutle', 1);
    const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
    me.vitality -= 1;
    me.health = 1;
    const vit = me.vitality;
    let r = 0;
    while (!bt.over && r++ < 50) resolveRound(bt, chooseAI(bt, 0));
    if (bt.over === 'win' && !me.ko) {
      expect(me.health).toBe(maxHealth(me));
      expect(me.vitality).toBeLessThanOrEqual(vit);
    }
  });
});

describe('world & turns', () => {
  it('a new game starts in Spring with 5 Initiative at Tier 1', () => {
    const s = newGame('T', 'balanced', 'iron', 'emberfish', '#fff');
    expect(s.initiative).toBe(5);
    expect(seasonForTurn(s.turn)).toBe('spring');
    expect(tierOf(s)).toBe(1);
    expect(s.roster[0].species).toBe('emberfish');
  });
  it('seasons change every 25 turns', () => {
    expect([1, 26, 51, 76, 100].map(seasonForTurn)).toEqual(['spring', 'summer', 'autumn', 'winter', 'winter']);
  });
  it('tiers rise every 2 merits', () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.merits = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(tierOf(s)).toBe(5);
  });
  it('moving costs Initiative and edge requirements are enforced', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    expect(W.canMoveTo(s, 'blackSand').ok).toBe(false); // the ferry needs a pass
    s.inventory['ferry-pass'] = 1;
    expect(W.canMoveTo(s, 'blackSand').ok).toBe(true);
    W.moveTo(s, 'blackSand');
    expect(s.initiative).toBe(4);
  });
  it('turn 100 ending away from the stadium ends the season', () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.turn = 100;
    expect(W.endTurn(s).ended).toBe('over');
    const s2 = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s2.turn = 100; s2.location = 'stadium'; s2.merits = Object.keys(CITIES);
    expect(W.endTurn(s2).ended).toBe('endgame');
  });
  it('typed totems help their type and hurt others', () => {
    const fire = createCreature('emberfish', 1), rock = createCreature('pebbark', 1);
    expect(W.totemBonus('totem:fire', fire)).toBe(3);
    expect(W.totemBonus('totem:fire', rock)).toBe(-1);
    expect(W.totemBonus('effigy:emberfish', fire)).toBe(5);
    expect(W.totemBonus('totem', rock)).toBe(1);
    expect(ITEMS['ferry-pass'].kind).toBe('key');
  });
});

describe('encounter scaling by Trainer Tier', () => {
  const wilds = MAP_NODES.filter((n) => n.kind === 'wild');
  const easy = wilds.reduce((a, b) => (b.level < a.level ? b : a));
  const hard = wilds.reduce((a, b) => (b.level > a.level ? b : a));
  const atTier = (tier: number) => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.merits = Object.keys(CITIES).slice(0, (tier - 1) * 2);
    expect(tierOf(s)).toBe(tier);
    return s;
  };

  it('wild levels follow Tier, not the node or the calendar', () => {
    for (let tier = 1; tier <= 5; tier++) {
      const s = atTier(tier);
      for (const n of [easy, hard]) expect(Math.abs(W.baseWildLevel(s, n) - 2 * tier)).toBeLessThanOrEqual(2);
      s.turn = 90; // late in the year at a low Tier is still a low-Tier band
      expect(W.baseWildLevel(s, easy)).toBeLessThanOrEqual(2 * tier);
    }
  });
  it('the toughest route at Tier 1 is gentler than Tier 2, and the easiest at Tier 5 beats Tier 4', () => {
    expect(W.baseWildLevel(atTier(1), hard)).toBeLessThanOrEqual(W.baseWildLevel(atTier(2), easy) + 1);
    expect(W.baseWildLevel(atTier(5), easy)).toBeGreaterThanOrEqual(W.baseWildLevel(atTier(4), easy));
  });
  it('wilds never outlevel the Tier\'s Arbiter ace', () => {
    for (let tier = 1; tier <= 5; tier++) {
      const ace = Math.max(...W.arbiterTeam('water', tier).map((c) => c.level));
      for (const n of wilds) expect(W.wildLevel(atTier(tier), n)).toBeLessThanOrEqual(ace + 1);
    }
  });
  it('rarity opens up with Tier', () => {
    expect(W.tierRarityCap(1)).toBe('prime');
    expect(W.tierRarityCap(2)).toBe('apex');
    expect([1, 2, 3, 4, 5].map(W.tierRarityDice)).toEqual([0, 0, 1, 1, 2]);
  });
});

describe('energy budget', () => {
  it('stage-1 commons make 6 energy; energy nodes grant +2', () => {
    const c = createCreature('puddlit', 1);
    expect(SPECIES_BY_ID['puddlit'].stage).toBe(1);
    expect(energyTotalOf(c)).toBe(6);
    c.points = 2;
    unlockNode(c, 'a');
    unlockNode(c, 'b');
    expect(energyTotalOf(c)).toBe(8);
  });
  it('starters can afford a full-cost own-type move plus more', () => {
    for (const id of STARTERS) {
      const c = createCreature(id, 2);
      expect(c.playbook.length).toBeGreaterThanOrEqual(3);
    }
  });
  it('v1 saves double their unlocked energy on load', () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.version = 1;
    s.roster[0].extraEnergy = { water: 1, prisma: 1 };
    const m = migrate(s)!;
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.roster[0].extraEnergy).toEqual({ water: 2, prisma: 2 });
  });
});

describe('energy allocation (playbook UI)', () => {
  it('commits exactly the cost of any playbook that fits, never more than generated', () => {
    const sum = (m: Record<string, number | undefined>) => Object.values(m).reduce<number>((a, v) => a + (v ?? 0), 0);
    for (const sp of SPECIES) {
      const c = createCreature(sp.id, 5);
      const e = energy(c);
      const opts = learnable(c);
      for (let trial = 0; trial < 20; trial++) {
        const set = opts.filter(() => Math.random() < 0.4).slice(0, 4);
        if (!fits(e, set)) continue;
        const used = allocateEnergy(e, set);
        expect(sum(used)).toBe(set.reduce((a, id) => a + sum(MOVE_BY_ID[id].cost), 0));
        for (const [k, v] of Object.entries(used)) expect(v).toBeLessThanOrEqual(e[k as keyof typeof e] ?? 0);
      }
    }
  });
  it('prefers typed energy for Neutral and keeps Prisma for last', () => {
    const neutralMove = MOVES.find((m) => Object.keys(m.cost).length === 1 && m.cost.neutral === 2)!;
    expect(allocateEnergy({ water: 3, prisma: 2 }, [neutralMove.id])).toEqual({ water: 2 });
  });
});

describe('move readout', () => {
  it('lists the steps in resolution order, and the damage range covers what actually lands', () => {
    for (const id of ['cindercub', 'puddlit', 'pebbark', 'zapup']) {
      const me = createCreature(id, 6);
      autoPlaybook(me);
      for (const moveId of me.playbook) {
        const m = MOVE_BY_ID[moveId];
        const steps = movePreview(createBattle(side('player', [createCreature(id, 6)]), side('wild', [createCreature('sproutle', 6)]), WEATHER.clear), moveId);
        const titles = steps.map((x) => x.title);
        expect(titles[0]).toBe('Turn order');
        const acc = titles.findIndex((t) => t.startsWith('Accuracy')), dmg = titles.findIndex((t) => t.startsWith('Damage'));
        expect(acc).toBeGreaterThan(0);
        if (m.kind !== 'support') {
          expect(dmg).toBeGreaterThan(acc);
          const dStep = steps[dmg];
          expect(dStep.title).toContain(attackStat(m) === 'power' ? 'Power' : 'Focus');
          if (m.dmgDie) expect(dStep.title).toContain(`d${m.dmgDie}`);
          for (let i = 0; i < 40; i++) {
            // creatures roll their own stats, so preview the exact battle that then resolves
            const bt = createBattle(side('player', [createCreature(id, 6)]), side('wild', [createCreature('sproutle', 6)]), WEATHER.clear);
            const range = /Deals (\d+)(?:–(\d+))?(\+)? damage/.exec(movePreview(bt, moveId).find((x) => x.title.startsWith('Damage'))!.text)!;
            const lo = Number(range[1]), hi = Number(range[2] ?? range[1]);
            activeOf(bt.sides[1]).health = 999; activeOf(bt.sides[1]).playbook = ['tackle']; // no Brace-style buffs before we hit
            bt.sides[1].mods.speed = -20; // act first, so the foe's move can't shift stats before we hit
            const hit = resolveRound(bt, { kind: 'move', move: moveId }).find((e) => e.t === 'damage' && e.side === 1 && e.calc);
            if (hit && hit.t === 'damage' && hit.calc) {
              const chained = (hit.calc.cascade ?? []).reduce((a2, ch) => a2 + (ch ? ch.rolls.reduce((x, y) => x + y, 0) : 0), 0);
              expect(hit.calc.raw).toBe(Math.max(1, hit.calc.rolls.reduce((a2, r) => a2 + r, 0) + chained + hit.calc.parts.reduce((a2, x) => a2 + x.value, 0)));
              expect(hit.amount).toBe(hit.calc.total);
              const base = hit.calc.crit ? hit.amount / 2 : hit.amount;
              expect(base, `${id} ${moveId} ${JSON.stringify(hit.calc)}`).toBeGreaterThanOrEqual(lo);
              if (!range[3]) expect(base).toBeLessThanOrEqual(hi); // Cascade ("+") has no top end
            }
          }
        }
      }
    }
  });
  it('flags Fatigue checks and the Stamina cost before the roll', () => {
    const me = createCreature('puddlit', 5);
    autoPlaybook(me);
    me.fatigue = 2;
    const bt = createBattle(side('player', [me]), side('wild', [createCreature('zapup', 5)]), WEATHER.clear);
    const titles = movePreview(bt, me.playbook[0]).map((x) => x.title);
    expect(titles[1]).toBe('Fatigue check: d10');
  });
  it('reports every Stamina spend in an event, so the battle plate shows it even when the move hits', () => {
    const me = createCreature('puddlit', 5);
    autoPlaybook(me);
    const id = me.playbook.find((m) => MOVE_BY_ID[m].effort > 0)!;
    // (a round where the foe's Shock locks it up spends nothing: try fresh battles until it acts)
    let events: BEvent[] = [], before = 0, fatigue = 0;
    for (let i = 0; i < 20 && !events.some((e) => e.t === 'use' && e.side === 0); i++) {
      const bt = createBattle(side('player', [me]), side('wild', [createCreature('zapup', 5)]), WEATHER.clear);
      me.health = 999;
      before = me.stamina; fatigue = me.fatigue;
      events = resolveRound(bt, { kind: 'move', move: id });
    }
    const ev = events.find((e): e is Extract<BEvent, { t: 'stamina' }> => e.t === 'stamina' && e.side === 0);
    expect(ev).toBeDefined();
    const effort = MOVE_BY_ID[id].effort;
    if (before - effort > 0) expect(ev!.snap.stamina).toBe(before - effort);
    else expect(ev!.snap.fatigue).toBe(fatigue + 1);
  });
});

describe('starting levels', () => {
  it('starters begin at Lv 1 with nothing unlocked, and Tier 1 wilds can be Lv 1', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    expect(s.roster[0].level).toBe(1);
    expect(s.roster[0].unlocked).toEqual([]);
    expect(s.roster[0].points).toBe(0);
    const easy = MAP_NODES.filter((n) => n.kind === 'wild').sort((a, b) => a.level - b.level)[0];
    expect(W.baseWildLevel(s, easy)).toBe(1);
  });
});

describe('battle lead', () => {
  const game = () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 3), createCreature('pebbark', 3));
    return s;
  };
  const wildFoe = () => side('wild', [createCreature('sproutle', 2)]);
  it('the Following creature leads the battle', () => {
    const s = game();
    s.following = s.roster[2].uid;
    const b = createBattle(W.playerSide(s), wildFoe(), WEATHER.clear);
    expect(activeOf(b.sides[0]).uid).toBe(s.roster[2].uid);
    expect(b.participants).toEqual([s.roster[2].uid]);
    expect(W.needsLeadChoice(s)).toBe(false);
  });
  it('a KO’d follower falls back to the first healthy creature', () => {
    const s = game();
    s.following = s.roster[0].uid; s.roster[0].ko = true;
    const b = createBattle(W.playerSide(s), wildFoe(), WEATHER.clear);
    expect(activeOf(b.sides[0]).uid).toBe(s.roster[1].uid);
  });
  it('with nobody Following, the trainer picks the lead', () => {
    const s = game();
    s.following = null;
    expect(W.needsLeadChoice(s)).toBe(true);
    const b = createBattle(W.playerSide(s), wildFoe(), WEATHER.clear);
    chooseLead(b, 2);
    expect(activeOf(b.sides[0]).uid).toBe(s.roster[2].uid);
    expect(b.participants).toEqual([s.roster[2].uid]);
    // only one creature able to fight: no need to ask
    s.roster[1].ko = true; s.roster[2].ko = true;
    expect(W.needsLeadChoice(s)).toBe(false);
  });
});

describe('Research Facility and Legendaries', () => {
  const game = () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 4), createCreature('fizzlet', 5));
    s.reserve.push(createCreature('calderex', 6));
    return s;
  };
  it('Quillhaven is a reachable town with a Research Facility', () => {
    expect(NODE_BY_ID.quillhaven.kind).toBe('town');
    expect(TOWNS.quillhaven.special).toBe('research');
    expect(neighbors('quillhaven').length).toBeGreaterThanOrEqual(2);
    expect(landmassOf('quillhaven')).toContain('stadium');
  });
  it('pays level × 2/3/4/5 by rarity', () => {
    const s = game();
    const [, common, prime] = s.roster, apex = s.reserve[0];
    expect(W.researchPayout(common)).toBe(4 * 2);
    expect(W.researchPayout(prime)).toBe(5 * 3);
    expect(W.researchPayout(apex)).toBe(6 * 4);
    expect(W.researchPayout(createCreature('solstara', 9))).toBe(9 * 5);
    const before = s.coins;
    s.following = common.uid;
    W.releaseToResearch(s, common.uid);
    expect(s.coins).toBe(before + 8);
    expect(s.roster).not.toContain(common);
    expect(s.following).toBe(s.roster[0].uid); // a released follower is replaced
    expect(s.dex.caught).toContain('puddlit'); // the Codex keeps its records
  });
  it('never leaves the trainer without an active creature', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    expect(W.releaseBlock(s, s.roster[0].uid)).not.toBeNull();
    s.reserve.push(createCreature('zapup', 3));
    expect(W.releaseBlock(s, s.roster[0].uid)).not.toBeNull(); // only active creature
    expect(W.releaseBlock(s, s.reserve[0].uid)).toBeNull();
  });
  it('each Legendary exists once: held or beaten, its node is quiet; released, it returns', () => {
    const s = game();
    const node = NODE_BY_ID.sunspire;
    expect(W.legendaryHere(s, node)).toBe(true);
    const sol = createCreature('solstara', 9);
    s.reserve.push(sol);
    s.flags.beaten.push('sunspire');
    expect(W.legendaryHere(s, node)).toBe(false);
    const r = W.releaseToResearch(s, sol.uid)!;
    expect(r.coins).toBe(45);
    expect(r.text).toContain('Sunspire Summit');
    expect(s.flags.beaten).not.toContain('sunspire');
    expect(W.legendaryHere(s, node)).toBe(true);
    // holding it (even without a beaten flag) keeps the node quiet
    s.reserve.push(createCreature('solstara', 9));
    expect(W.legendaryHere(s, node)).toBe(false);
  });
});

describe('morale and loyalty', () => {
  const report = () => ({ weatherRoll: 0, seasonChanged: false, left: [] as string[], warned: [] as string[], checks: [] as W.MoraleCheck[], legendsReturned: [] as { name: string; home: string }[], trainingDone: [] as { name: string; school: string }[] });
  const game = () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 3));
    s.turn = 3; // odd turn: no follower bonus
    return s;
  };
  it('high morale earns Loyalty each turn and unlocks Nature perks that never re-lock', () => {
    const s = game();
    const c = s.roster[1];
    c.morale = 9; c.loyalty = 2; c.perks = 0;
    W.moraleAndLoyalty(s, report());
    expect(c.loyalty).toBe(3);
    expect(c.perks).toBe(1); // first perk threshold is 3
    c.morale = 2; c.moraleWarned = true; c.moraleMark = 2;
    for (let i = 0; i < 10 && s.roster.includes(c); i++) W.moraleAndLoyalty(s, report());
    if (s.roster.includes(c)) expect(c.loyalty).toBeLessThan(3); // (or it left on a high roll)
    expect(c.perks).toBe(1); // losing Loyalty (or leaving) never re-locks perks
  });
  it('checking on a creature in a city or town costs 1 Initiative for +1 Morale, in a totem too', () => {
    for (const style of ['balanced', 'nature', 'urban'] as const) {
      const s = newGame('T', style, 'mangrove', 'puddlit', '#fff');
      const rest = createCreature('zapup', 3);
      s.reserve.push(rest);
      rest.morale = 2; s.initiative = 2; s.location = 'stadium';
      expect(W.checkOn(s, rest.uid)).toBe(true);
      expect([rest.morale, s.initiative]).toEqual([3, 1]);
      s.location = 'iron';
      s.roster[0].morale = 9;
      expect(W.checkOn(s, s.roster[0].uid)).toBe(true);
      expect([s.roster[0].morale, s.initiative]).toEqual([10, 0]);
      expect(W.checkOn(s, rest.uid)).toBe(false); // out of Initiative
      s.initiative = 3;
      expect(W.checkOn(s, s.roster[0].uid)).toBe(false); // already at 10
      s.location = MAP_NODES.find((n) => n.kind === 'wild')!.id;
      expect(W.checkOn(s, rest.uid)).toBe(false); // not in the wilds
      expect([rest.morale, s.initiative]).toEqual([3, 3]);
    }
  });
  it('low morale warns first, with no roll that turn', () => {
    const s = game();
    const c = s.roster[1];
    c.morale = 3;
    const r = report();
    W.moraleAndLoyalty(s, r);
    expect(r.warned).toEqual([nameOf(c)]);
    expect(r.checks).toEqual([]);
    expect(c.moraleWarned).toBe(true);
  });
  it('after a warning, each turn without a morale gain rolls d10 vs Loyalty: above leaves, otherwise −1 Loyalty', () => {
    for (let trial = 0; trial < 60; trial++) {
      const s = game();
      const c = s.roster[1];
      c.morale = 2; c.moraleWarned = true; c.moraleMark = 2; c.loyalty = 5;
      const r = report();
      W.moraleAndLoyalty(s, r);
      expect(r.checks.length).toBe(1);
      const ch = r.checks[0];
      if (ch.roll > 5) { expect(ch.left).toBe(true); expect(s.roster).not.toContain(c); expect(r.left).toEqual([nameOf(c)]); }
      else { expect(ch.left).toBe(false); expect(c.loyalty).toBe(4); }
    }
  });
  it('raising morale during the turn skips the check; at 0 Loyalty the check always fails', () => {
    const s = game();
    const c = s.roster[1];
    c.morale = 3; c.moraleWarned = true; c.moraleMark = 2; c.loyalty = 0;
    const r = report();
    W.moraleAndLoyalty(s, r);
    expect(r.checks).toEqual([]); // morale rose from 2 to 3 since last turn
    const r2 = report();
    W.moraleAndLoyalty(s, r2);
    expect(r2.checks[0].left).toBe(true);
    expect(s.roster).not.toContain(c);
  });
  it('a starter’s Nature, Ability and Instinct can be chosen, and last through evolution', () => {
    const c = newGame('U', 'balanced', 'mangrove', 'twinkit', '#000', undefined, { nature: 'enduring', ability: 'forager', instinct: 'comet-tail' }).roster[0];
    expect([c.nature, abilityOf(c), instinctIdOf(c)]).toEqual(['enduring', 'forager', 'comet-tail']);
    expect([c.health, c.vitality]).toEqual([maxHealth(c), maxVitality(c)]);
    c.species = SPECIES_BY_ID[c.species].evolvesTo!;
    expect([abilityOf(c), instinctIdOf(c)]).toEqual(['forager', 'comet-tail']);
    // left out: a random Nature and the species' own
    const d = newGame('U', 'balanced', 'mangrove', 'twinkit', '#000').roster[0];
    expect(NATURE_BY_ID[d.nature]).toBeDefined();
    expect([d.ability, d.instinct]).toEqual([undefined, undefined]);
  });
  it('the starter’s bond gives +1 Vigor and no attribute under 1, before its Nature', () => {
    for (const id of STARTERS) {
      const c = newGame('U', 'balanced', 'mangrove', id, '#000').roster[0];
      const base = SPECIES_BY_ID[id].base, nat = NATURE_BY_ID[c.nature], wild = { ...c, bond: undefined };
      expect([c.health, c.vitality]).toEqual([maxHealth(c), maxVitality(c)]);
      for (const k of ['vigor', 'power', 'armor', 'focus', 'ward', 'speed', 'stamina'] as const) {
        const before = Math.max(1, base[k]) + (k === 'vigor' ? 1 : 0);
        expect(stats(c)[k]).toBe(Math.max(0, before + (nat.up === k ? 1 : 0) - (nat.down === k ? 1 : 0)));
      }
      expect(stats(wild).vigor).toBe(stats(c).vigor - 1); // others of its kind don't get it
    }
  });
  it('the starter shares a special bond: low Morale never warns, checks or drives it away', () => {
    const s = game();
    const starter = s.roster[0];
    expect(starter.bond).toBe(true);
    expect(s.roster[1].bond).toBeUndefined();
    starter.morale = 0; starter.loyalty = 0; starter.moraleWarned = true; starter.moraleMark = 0;
    for (let i = 0; i < 20; i++) {
      const r = report();
      W.moraleAndLoyalty(s, r);
      expect(r.warned).toEqual([]);
      expect(r.checks).toEqual([]);
    }
    expect(s.roster).toContain(starter);
    expect(starter.moraleWarned).toBe(false);
  });
  it('the bonded starter can’t be released to research or traded away; old saves bond their starter', () => {
    const s = game();
    const starter = s.roster[0];
    s.reserve.push(createCreature('zapup', 3));
    expect(W.releaseBlock(s, starter.uid)).toMatch(/bond/);
    expect(W.releaseToResearch(s, starter.uid)).toBeNull();
    expect(W.releaseBlock(s, s.roster[1].uid)).toBeNull();
    const b = newGame('U', 'balanced', 'mangrove', 'zapup', '#000');
    expect(I.offerProblem(s, { ...I.emptyOffer(), creature: starter.uid }, b)).toMatch(/bond/);
    // a save from before the bond: the starter (evolved since) gets it back
    const old = JSON.parse(JSON.stringify(s));
    for (const c of [...old.roster, ...old.reserve]) delete c.bond;
    old.roster[0].species = SPECIES_BY_ID.puddlit.evolvesTo;
    const m = migrate(old)!;
    expect(m.roster[0].bond).toBe(true);
    expect([...m.roster, ...m.reserve].filter((c) => c.bond)).toHaveLength(1);
  });
  it('a placeholder attack retired by a hand-made move is swapped for it in old saves', () => {
    const s = newGame('U', 'balanced', 'mangrove', 'twinkit', '#000');
    const old = JSON.parse(JSON.stringify(s));
    old.roster[0].playbook = ['atk-astral3', 'atk-astral2-charm1', 'no-such-move'];
    const m = migrate(old)!;
    expect(m.roster[0].playbook).toEqual(['starglimmer', 'starstruck']);
    for (const c of [...m.roster, ...m.reserve]) for (const id of c.playbook) expect(MOVE_BY_ID[id]).toBeDefined();
  });
  it('a match sent by an online room gets the same conversion, keeping its room fields', () => {
    const m = newMatch([newGame('U', 'balanced', 'mangrove', 'twinkit', '#000'), newGame('V', 'balanced', 'mangrove', 'zapup', '#111')]);
    m.owners = ['x', 'y']; m.code = 'ABCD';
    m.players[1].roster[0].playbook = ['atk-astral3'];
    const back = migrateMatch(JSON.parse(JSON.stringify(m)))!;
    expect(back.players[1].roster[0].playbook).toEqual(['starglimmer']);
    expect([back.owners, back.code]).toEqual([['x', 'y'], 'ABCD']);
    expect(migrateMatch({ ...back, players: [{ ...back.players[0], version: 999 }] })).toBeNull();
  });
  it('morale back above the low line clears the warning', () => {
    const s = game();
    const c = s.roster[1];
    c.morale = 6; c.moraleWarned = true;
    W.moraleAndLoyalty(s, report());
    expect(c.moraleWarned).toBe(false);
  });
  it('Legendaries lose 1 Loyalty every turn, even at high Morale, then return to their grounds', () => {
    const s = game();
    const sol = createCreature('solstara', 9);
    sol.morale = 10; sol.loyalty = 2;
    s.reserve.push(sol);
    s.flags.beaten.push('sunspire');
    const r1 = report();
    W.moraleAndLoyalty(s, r1);
    expect(sol.loyalty).toBe(1);
    expect(r1.legendsReturned).toEqual([]);
    const r2 = report();
    W.moraleAndLoyalty(s, r2);
    expect(s.reserve).not.toContain(sol);
    expect(r2.legendsReturned).toEqual([{ name: 'Solstara', home: 'Sunspire Summit' }]);
    expect(W.legendaryHere(s, NODE_BY_ID.sunspire)).toBe(true); // back on the board
  });
  it('a recruited Legendary arrives with full Loyalty', () => {
    const s = game();
    const sol = createCreature('solstara', 1); // RT 12: a double six on 2d6, so keep trying
    for (let i = 0; i < 2000 && !s.roster.concat(s.reserve).includes(sol); i++) { s.inventory.totem = 5; W.attemptRecruit(s, sol, 'totem', []); }
    expect(s.roster.concat(s.reserve)).toContain(sol);
    expect(sol.loyalty).toBe(W.LEGENDARY_START_LOYALTY);
  });
  it('when the active team empties, a creature steps out of its totem', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    const sol = createCreature('solstara', 9);
    sol.loyalty = 1;
    s.roster = [sol]; s.reserve = [createCreature('zapup', 3)]; s.following = sol.uid;
    s.turn = 3;
    W.moraleAndLoyalty(s, report());
    expect(s.roster.map((c) => c.species)).toEqual(['zapup']);
    expect(s.following).toBe(s.roster[0].uid);
  });
  it('your last active creature never leaves', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    const c = s.roster[0];
    c.bond = false; // (not the starter's bond: this is the last-creature rule)
    c.morale = 0; c.moraleWarned = true; c.moraleMark = 0; c.loyalty = 0;
    const r = report();
    W.moraleAndLoyalty(s, r);
    expect(s.roster).toContain(c);
    expect(r.checks[0].left).toBe(false);
  });
});

describe('trainer battles', () => {
  it('every participant gets the trainer battle bonus, win or lose; wild battles do not', () => {
    for (const win of [true, false]) {
      for (const kind of ['trainer', 'arbiter', 'champion', 'wild'] as const) {
        const me = createCreature('puddlit', 5), foe = createCreature('sproutle', 5);
        const bt = createBattle(side('player', [me]), { kind, name: kind, team: [foe], active: 0, mods: {} }, WEATHER.clear);
        if (win) { foe.health = 1; foe.vitality = 0; me.vitality = 9; } else { me.health = 1; me.vitality = 0; foe.vitality = 9; }
        const events = [];
        for (let i = 0; i < 60 && !bt.over; i++) events.push(...resolveRound(bt, { kind: 'move', move: win ? me.playbook.find((m) => MOVE_BY_ID[m].kind !== 'support') ?? me.playbook[0] : CATCH_BREATH.id }));
        if (bt.over !== (win ? 'win' : 'lose')) continue; // a rare upset; the next kind still checks the rule
        const xp = events.find((e) => e.t === 'xp' && e.reason === 'battle') as Extract<typeof events[number], { t: 'xp' }>;
        expect(xp, `${kind} ${win}`).toBeDefined();
        const bonus = kind === 'wild' ? 0 : TRAINER_BATTLE_XP_BONUS;
        expect(xp.amount).toBe(participationXp(5, 5) + bonus); // equal levels: 3 participation XP
        expect(xp.bonus ?? 0).toBe(bonus);
      }
    }
  });
  it('each city has a Trainer Hall: one battle per city per turn, for a city action', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 3));
    const before = s.initiative;
    const r = W.hallBattle(s)!;
    expect(r.battle.sides[1].kind).toBe('trainer');
    expect(r.battle.sides[1].team.length).toBe(2);
    expect(r.battle.sides[1].team[0].level).toBe(W.tierBandLevel(1) + 1);
    expect(s.initiative).toBe(before - W.cityActionCost(s));
    expect(W.hallBlock(s)).toMatch(/already/);
    expect(W.hallBattle(s)).toBeNull();
    W.endTurn(s);
    expect(W.hallBlock(s)).toBeNull(); // a new turn
    s.location = 'mistfall';
    expect(W.hallBlock(s)).not.toBeNull(); // towns have no hall
  });
});

describe('hotseat multiplayer', () => {
  const trio = () => {
    const ps = [newGame('A', 'balanced', 'thunder', 'puddlit', '#ff6b3d'), newGame('B', 'balanced', 'iron', 'zapup', '#3d8bff'), newGame('C', 'balanced', 'gloom', 'sproutle', '#2fbf71')];
    const m = newMatch(ps);
    setActiveMatch(m);
    return { m, ps };
  };
  afterEach(() => setActiveMatch(null));
  it('solo and hotseat saves are separate: clearing one never deletes the other', () => {
    const store = new Map<string, string>();
    const g = globalThis as unknown as { localStorage?: unknown };
    const prev = g.localStorage;
    g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    try {
      const solo = newGame('Solo', 'balanced', 'thunder', 'puddlit', '#fff');
      setActiveMatch(null);
      save(solo);
      const { m } = trio();
      saveMatch(m);
      expect(load()?.trainer.name).toBe('Solo');
      expect(loadMatch()?.players.length).toBe(3);
      save(m.players[1]); // a hotseat trainer saves into the match, not the solo slot
      expect(load()?.trainer.name).toBe('Solo');
      clearMatch();
      expect(loadMatch()).toBeNull();
      expect(load()?.trainer.name).toBe('Solo');
      saveMatch(m);
      clearSave();
      expect(load()).toBeNull();
      expect(loadMatch()).not.toBeNull();
    } finally { g.localStorage = prev; }
  });
  it('exported save files are recognised as solo or hotseat when imported', () => {
    const { m } = trio();
    const solo = newGame('Solo', 'balanced', 'thunder', 'puddlit', '#fff');
    expect(parseSaveFile(JSON.stringify(solo))).toMatchObject({ kind: 'solo', save: { trainer: { name: 'Solo' } } });
    const back = parseSaveFile(JSON.stringify(m));
    expect(back?.kind).toBe('match');
    if (back?.kind === 'match') expect(back.match.players.map((p) => p.trainer.name)).toEqual(['A', 'B', 'C']);
    expect(parseSaveFile('{"hello": 1}')).toBeNull();
    expect(parseSaveFile('not json')).toBeNull();
  });
  it('turns go round the table, skipping trainers who have finished', () => {
    const { m, ps } = trio();
    expect(nextSeat(m)).toBe(1);
    m.current = 2;
    expect(nextSeat(m)).toBe(0);
    ps[0].phase = 'over';
    expect(nextSeat(m)).toBe(1);
    ps[1].phase = 'champion'; ps[2].phase = 'over';
    expect(nextSeat(m)).toBe(-1);
  });
  it('main colours are locked to one trainer each', () => {
    const { m, ps } = trio();
    expect(takenColors(m, ps[0]).sort()).toEqual(['#2fbf71', '#3d8bff']);
    expect(MAX_PLAYERS).toBe(6);
  });
  it('Legendaries are shared: beaten or held by any trainer, they are gone for everyone', () => {
    const { ps } = trio();
    const node = NODE_BY_ID.sunspire;
    expect(W.legendaryHere(ps[0], node)).toBe(true);
    ps[1].reserve.push(createCreature('solstara', 9));
    expect(W.legendaryHere(ps[0], node)).toBe(false);
    ps[1].reserve = []; ps[2].flags.beaten.push('sunspire');
    expect(W.legendaryHere(ps[0], node)).toBe(false);
    // one trainer releasing it puts it back for everyone
    ps[2].flags.beaten = []; ps[2].roster.push(createCreature('zapup', 3));
    const sol = createCreature('solstara', 9); ps[2].reserve.push(sol); ps[0].flags.beaten.push('sunspire');
    ps[2].location = 'quillhaven';
    W.releaseToResearch(ps[2], sol.uid);
    expect(W.legendaryHere(ps[0], node)).toBe(true);
  });
  it('a turn’s weather is rolled once, at the start of the round, for every trainer', () => {
    const { m, ps } = trio();
    ps.forEach((p, i) => { p.weather = ['clear', 'rain', 'gusts'][i]; }); // newGame gives each its own
    const r = W.rollRoundWeather(m, 1);
    expect(m.rolls[1]).toBe(r);
    expect(new Set(ps.map((p) => p.weather)).size).toBe(1);
    // ending a turn in hotseat doesn't roll: the weather waits for the next round's roll
    const before = ps[0].weather;
    const rep = W.endTurn(ps[0], false, null);
    expect(rep.weatherRoll).toBe(0);
    expect(ps[0].weather).toBe(before);
    for (const p of ps.slice(1)) W.endTurn(p, false, null);
    W.rollRoundWeather(m, 2);
    expect(new Set(ps.map((p) => p.weather)).size).toBe(1);
  });
});

describe('hotseat interactions', () => {
  const pair = () => {
    const a = newGame('A', 'balanced', 'thunder', 'puddlit', '#ff6b3d'), b = newGame('B', 'balanced', 'thunder', 'zapup', '#3d8bff');
    a.coins = 30; b.coins = 20;
    a.roster.push(createCreature('pebbark', 4)); b.roster.push(createCreature('sproutle', 4));
    setActiveMatch(newMatch([a, b]));
    return { a, b };
  };
  afterEach(() => setActiveMatch(null));
  it('gifts of coins and items arrive anywhere, with a note for the receiver', () => {
    const { a, b } = pair();
    b.location = 'iron';
    expect(I.exchange(a, { coins: 10, items: { salve: 1 } }, b)).toBeNull();
    expect([a.coins, b.coins, a.inventory.salve, b.inventory.salve]).toEqual([20, 30, 1, 3]);
    expect(b.inbox?.[0]).toMatch(/A sent you/);
  });
  it('refuses what a trainer doesn’t have, key items, and creatures across the map', () => {
    const { a, b } = pair();
    expect(I.exchange(a, { coins: 999, items: {} }, b)).toMatch(/doesn’t have/);
    a.inventory['ferry-pass'] = 1;
    expect(I.exchange(a, { coins: 0, items: { 'ferry-pass': 1 } }, b)).toMatch(/can’t be given/);
    b.location = 'iron';
    expect(I.exchange(a, { coins: 0, items: {}, creature: a.roster[1].uid }, b)).toMatch(/same spot/);
  });
  it('coin and item trades work across the map; asking for a creature or challenging does not', () => {
    const { a, b } = pair();
    b.location = 'iron';
    expect(I.sameSpot(a, b)).toBe(false);
    expect(I.exchange(a, { coins: 5, items: {} }, b, { coins: 0, items: { salve: 1 } })).toBeNull(); // by courier
    expect([a.coins, b.coins]).toEqual([25, 25]);
    expect(I.exchange(a, { coins: 5, items: {} }, b, { coins: 0, items: {}, creature: b.roster[1].uid })).toMatch(/same spot/);
    expect(I.challengeProblem(a, b)).toMatch(/same spot/);
    expect(I.startChallenge(a, b)).toBeNull();
  });
  it('trades swap creatures between trainers on the same spot', () => {
    const { a, b } = pair();
    const mine = a.roster[1], theirs = b.roster[1];
    expect(I.exchange(a, { coins: 5, items: {}, creature: mine.uid }, b, { coins: 0, items: {}, creature: theirs.uid })).toBeNull();
    expect(a.roster).toContain(theirs); expect(b.roster).toContain(mine);
    expect(a.roster).not.toContain(mine);
    expect(a.dex.caught).toContain('sproutle');
    expect([a.coins, b.coins]).toEqual([25, 25]);
  });
  it('nobody can give away their only creature', () => {
    const { a, b } = pair();
    a.roster = [a.roster[0]];
    a.roster[0].bond = false; // (a bonded starter can't be traded at all; this checks the only-creature rule)
    expect(I.exchange(a, { coins: 0, items: {}, creature: a.roster[0].uid }, b)).toMatch(/only creature/);
    // …but swapping it for one of theirs is fine
    expect(I.exchange(a, { coins: 0, items: {}, creature: a.roster[0].uid }, b, { coins: 0, items: {}, creature: b.roster[1].uid })).toBeNull();
  });
  it('challenges: same spot, 1 Initiative, once per opponent per turn; the winner takes the wager', () => {
    const { a, b } = pair();
    const before = a.initiative;
    const bt = I.startChallenge(a, b)!;
    expect(bt.sides[1].team).toBe(b.roster); // b's real team fights
    expect(a.initiative).toBe(before - 1);
    expect(I.challengeProblem(a, b)).toMatch(/already/);
    bt.over = 'win';
    I.settleChallenge(a, b, bt, 10);
    expect([a.coins, b.coins]).toEqual([40, 10]);
    expect(b.inbox?.some((n) => /beat you/.test(n))).toBe(true);
    b.location = 'iron';
    a.flags.challenged = [];
    expect(I.challengeProblem(a, b)).toMatch(/same spot/);
  });
});

describe('online creature edits (tending your team while someone else plays)', () => {
  it('applies unlocks, training and playbooks with the usual rules', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    const c = s.roster[0];
    c.points = 1;
    const node = availableNodes(c)[0].id;
    expect(applyEdit(s, { uid: c.uid, op: 'unlock', node })).toBe(true);
    expect(c.unlocked).toContain(node);
    expect(applyEdit(s, { uid: c.uid, op: 'unlock', node: availableNodes(c)[0].id })).toBe(false); // no points left
    expect(applyEdit(s, { uid: c.uid, op: 'train', stat: 'power' })).toBe(false); // chart not complete
    const moves = c.playbook.slice(0, 1);
    expect(applyEdit(s, { uid: c.uid, op: 'playbook', moves })).toBe(true);
    expect(c.playbook).toEqual(moves);
    expect(applyEdit(s, { uid: c.uid, op: 'playbook', moves: ['not-a-move'] })).toBe(false);
    expect(applyEdit(s, { uid: c.uid, op: 'playbook', moves: [moves[0], moves[0]] })).toBe(false);
    expect(applyEdit(s, { uid: 'someone-else', op: 'playbook', moves })).toBe(false);
  });
});

describe('next-stop marker', () => {
  it('marks any other node, clears with null, and rejects unknown nodes or where you stand', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    const other = MAP_NODES.find((n) => n.id !== s.location)!.id;
    expect(setWaypoint(s, s.location)).toBe(false);
    expect(setWaypoint(s, 'nowhere')).toBe(false);
    expect(s.waypoint).toBeUndefined();
    expect(setWaypoint(s, other)).toBe(true);
    expect(s.waypoint).toBe(other);
    expect(setWaypoint(s, null)).toBe(true);
    expect(s.waypoint).toBeUndefined();
  });

  it('can be set online while someone else plays, as an edit', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    const other = neighbors(s.location)[0].node.id;
    expect(applyEdit(s, { op: 'waypoint', node: other })).toBe(true);
    expect(s.waypoint).toBe(other);
    expect(applyEdit(s, { op: 'waypoint', node: null })).toBe(true);
    expect(s.waypoint).toBeUndefined();
  });

  it('clears when the trainer arrives there, however they get there', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    const [a, b] = neighbors(s.location).map((x) => x.node.id);
    setWaypoint(s, b ?? a);
    if (b) { moveTrainer(s, a); expect(s.waypoint).toBe(b); }
    moveTrainer(s, b ?? a);
    expect(s.waypoint).toBeUndefined();
  });
});

describe('saved copies (save library)', () => {
  const store = new Map<string, string>();
  const g = globalThis as unknown as { localStorage?: unknown };
  let prev: unknown;
  beforeEach(() => {
    store.clear(); prev = g.localStorage;
    g.localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  });
  afterEach(() => { g.localStorage = prev; setActiveMatch(null); });

  it('keeps named snapshots of solo, hotseat and online games and loads them back into their slot', () => {
    const solo = newGame('Rowan', 'balanced', 'thunder', 'puddlit', '#fff');
    solo.turn = 12;
    const copy = saveCopy('solo', solo);
    expect(typeof copy).toBe('object');
    if (typeof copy === 'string') return;
    expect(copy.name).toBe('Rowan · Turn 12');
    solo.turn = 40; // the copy is a snapshot, not a live reference
    expect(restoreCopy(copy.id)?.kind).toBe('solo');
    expect(load()?.turn).toBe(12);

    const m = newMatch([newGame('A', 'balanced', 'thunder', 'puddlit', '#f00'), newGame('B', 'balanced', 'thunder', 'zapup', '#00f')]);
    const hot = saveCopy('hotseat', m, 'Friday night') as { id: string };
    expect(restoreCopy(hot.id)?.kind).toBe('hotseat');
    expect(loadMatch()?.players.map((p) => p.trainer.name)).toEqual(['A', 'B']);

    const on = { ...m, owners: ['x', 'y'], code: 'ABCDE', turnSeconds: 120 };
    const oc = saveCopy('online', on) as { id: string };
    expect(restoreCopy(oc.id)?.kind).toBe('online');
    expect(loadOnlineMatch()).toMatchObject({ owners: ['x', 'y'], code: 'ABCDE', turnSeconds: 120 });

    expect(listCopies().map((c) => c.name)).toEqual(['Online · Turn 1', 'Friday night', 'Rowan · Turn 12']); // newest first
    renameCopy(copy.id, 'Before the Arbiter');
    expect(listCopies().find((c) => c.id === copy.id)?.name).toBe('Before the Arbiter');
    deleteCopy(copy.id);
    expect(listCopies().length).toBe(2);
    expect(readCopy(listCopies()[0])).not.toBeNull();
  });

  it('caps the library and recognises exported files by kind', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    for (let i = 0; i < LIBRARY_MAX; i++) saveCopy('solo', s);
    expect(saveCopy('solo', s)).toMatch(/up to/);
    const m = newMatch([s, newGame('U', 'balanced', 'thunder', 'zapup', '#00f')]);
    expect(saveKindOf(JSON.stringify(s))).toBe('solo');
    expect(saveKindOf(JSON.stringify(m))).toBe('hotseat');
    expect(saveKindOf(JSON.stringify({ ...m, owners: ['a', 'b'] }))).toBe('online');
    expect(saveKindOf('{"nope":1}')).toBeNull();
  });
});

describe('Codex biome filter', () => {
  it('lists the biomes where a species or an earlier stage turns up', () => {
    for (const sp of SPECIES.filter((x) => x.rarity !== 'legendary').slice(0, 40)) {
      const fromSpots = new Set(W.evolutionLine(sp.id).flatMap((m) => W.encounterSpots(m.id).map((spot) => spot.node.biome)));
      expect(new Set(W.speciesBiomes(sp.id))).toEqual(fromSpots);
    }
    const cinder = W.speciesBiomes('cindercub');
    expect(cinder.length).toBeGreaterThan(0);
    // an evolved form inherits its line's biomes
    const evo = SPECIES.find((x) => x.id === 'cindercub')!.evolvesTo!;
    expect(W.speciesBiomes(evo)).toEqual(expect.arrayContaining(cinder));
  });
});

describe('day & night', () => {
  it('odd turns are day, even turns are night', () => {
    expect([1, 2, 3, 4, 99, 100].map(timeOfDay)).toEqual(['day', 'night', 'day', 'night', 'day', 'night']);
  });
  it('a species’ activity comes from its types, with hand-picked exceptions', () => {
    expect(activityFromTypes(['astral'])).toBe('nocturnal');
    expect(activityFromTypes(['charm', 'astral'])).toBe('nocturnal');
    expect(activityFromTypes(['charm', 'water'])).toBe('crepuscular'); // Rock, Steel and Water keep no hours
    expect(activityFromTypes(['fire'])).toBe('diurnal');
    expect(activityFromTypes(['grass', 'electric'])).toBe('diurnal');
    expect(activityFromTypes(['grass', 'rock'])).toBe('crepuscular');
    expect(SPECIES_BY_ID.emberwick.activity).toBe('crepuscular');
    expect(activityFromTypes(['fire', 'astral'])).toBe('crepuscular');
    expect(activityFromTypes(['water'])).toBe('crepuscular');
    expect(SPECIES_BY_ID.shadeleaf.activity).toBe('nocturnal');
    expect(SPECIES.every((sp) => !!sp.activity)).toBe(true);
    // every type keeps someone out at each time of day, so no type vanishes entirely
    for (const time of ['day', 'night'] as const) expect(SPECIES.filter((sp) => isActive(sp, time)).length).toBeGreaterThan(100);
  });
  it('an area’s encounters are nearly all locals, whatever the weather, and strays share their first type', () => {
    const biomes = [...new Set(MAP_NODES.filter((n) => n.kind === 'wild' && n.biome !== 'prism').map((n) => n.biome))];
    const weathers = Object.values(WEATHER).map((w) => w.encounter ?? []);
    let strays = 0, total = 0;
    for (const biome of biomes) {
      const node = MAP_NODES.find((n) => n.kind === 'wild' && n.biome === biome)!;
      const T = BIOME_TYPES[biome];
      for (const boost of weathers) for (const time of ['day', 'night'] as const) for (const rarity of ['common', 'prime', 'apex'] as const) for (let i = 0; i < 12; i++) {
        const sp = W.pickSpecies(node, rarity, 4, boost, time);
        expect(T, `${sp.name} in ${biome}`).toContain(sp.types[0]);
        expect(sp.rarity).toBe(rarity);
        total++;
        if (!sp.types.every((t) => T.includes(t))) strays++;
      }
    }
    expect(strays / total).toBeLessThan(0.17);
    expect(strays).toBeGreaterThan(0);
  });
  it('every area has at least two locals, and every one of its types, at any time (Common and Prime)', () => {
    for (const biome of Object.keys(BIOME_TYPES) as (keyof typeof BIOME_TYPES)[]) {
      if (biome === 'prism') continue;
      const T = BIOME_TYPES[biome];
      for (const rarity of ['common', 'prime'] as const) for (const time of ['day', 'night'] as const) {
        const locals = (t: (typeof T)[number]) => W.speciesPool(biome, t, rarity, 1, time).filter((x) => x.types.every((y) => T.includes(y)));
        for (const t of T) expect(locals(t).length, `${t} in ${biome}, ${rarity} ${time}`).toBeGreaterThan(0);
        expect(new Set(T.flatMap(locals)).size, `${biome} ${rarity} ${time}`).toBeGreaterThan(1);
      }
    }
  });
  it('the extra families keep their own hours in areas of their type', () => {
    for (const f of EXTRA_FAMILIES) for (const st of [1, 2, 3]) {
      const sp = SPECIES_BY_ID[extraId(f, st)];
      expect([sp.types, sp.activity, sp.evolvesTo]).toEqual([[f.type], f.activity, st < 3 ? extraId(f, st + 1) : undefined]);
      for (const b of f.biomes) expect(BIOME_TYPES[b]).toContain(f.type);
    }
  });
  it('weather makes a native type more common', () => {
    const node = MAP_NODES.find((n) => n.kind === 'wild' && n.biome === 'badlands')!;
    const rate = (boost: ('rock' | 'grass')[]) => { let n = 0; for (let i = 0; i < 3000; i++) if (W.pickSpecies(node, 'common', 1, boost, 'day').types.includes('rock')) n++; return n / 3000; };
    expect(rate(['rock'])).toBeGreaterThan(rate([]) + 0.04);
  });
  it('wild encounters only bring out creatures awake at that time', () => {
    for (const node of MAP_NODES.filter((n) => n.kind === 'wild')) {
      for (const time of ['day', 'night'] as const) {
        for (let i = 0; i < 6; i++) expect(isActive(W.pickSpecies(node, 'common', 4, [], time), time), `${node.name} ${time}`).toBe(true);
      }
    }
  });
  it('wild encounters on an odd turn are day creatures, on an even turn night creatures', () => {
    const seen = { day: new Set<string>(), night: new Set<string>() };
    for (let i = 0; i < 400; i++) {
      const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
      s.location = MAP_NODES.find((n) => n.kind === 'wild' && n.biome === 'meadow')!.id;
      s.turn = i % 2 ? 4 : 5;
      s.flags.lure = true;
      const out = W.reexplore(s);
      if (out?.t === 'encounter') seen[timeOfDay(s.turn)].add(out.battle.sides[1].team[0].species);
    }
    for (const id of seen.day) expect(isActive(SPECIES_BY_ID[id], 'day')).toBe(true);
    for (const id of seen.night) expect(isActive(SPECIES_BY_ID[id], 'night')).toBe(true);
    expect(seen.day.size + seen.night.size).toBeGreaterThan(0);
  });
  it('day events only happen by day, night events only at night', () => {
    for (const turn of [5, 6]) {
      const now = timeOfDay(turn);
      for (let i = 0; i < 200; i++) {
        const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
        s.roster.push(createCreature('zapup', 3));
        s.turn = turn; s.coins = 20;
        const ev = E.rollEvent(s);
        if (ev) expect(['any', now]).toContain(E.EVENT_TIMES[ev.id]);
      }
    }
    const night = Object.values(E.EVENT_TIMES).filter((t) => t === 'night').length, day = Object.values(E.EVENT_TIMES).filter((t) => t === 'day').length;
    expect(night).toBeGreaterThan(0); expect(day).toBeGreaterThan(0);
  });
});

describe('Ranger', () => {
  it('up to Tier times a turn, a Nothing explore refunds 1 Initiative', () => {
    for (const [merits, tier] of [[[], 1], [['aurora', 'hollow'], 2], [['aurora', 'hollow', 'thunder', 'gloom'], 3]] as const) {
      const s = newGame('T', 'nature', 'thunder', 'puddlit', '#fff');
      s.merits = [...merits];
      s.location = MAP_NODES.find((n) => n.kind === 'wild' && n.biome === 'meadow')!.id;
      expect(W.reexploreCost(s)).toBe(1); // no free re-explore any more
      let refunds = 0, nothings = 0;
      for (let i = 0; i < 200; i++) {
        s.initiative = 3;
        const o = W.reexplore(s)!;
        if (o.t === 'nothing') { nothings++; if (o.refund) { refunds++; expect(s.initiative).toBe(3); } else expect(s.initiative).toBe(2); }
      }
      expect(nothings).toBeGreaterThan(tier);
      expect(refunds).toBe(tier); // only Tier times this turn
      W.endTurn(s);
      expect(W.rangerRefundsLeft(s)).toBe(tier); // fresh next turn
    }
    // other styles never refund
    const o = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    o.location = MAP_NODES.find((n) => n.kind === 'wild')!.id;
    for (let i = 0; i < 60; i++) { o.initiative = 3; const r = W.reexplore(o)!; if (r.t === 'nothing') expect(r.refund).toBeFalsy(); }
  });
});

describe('Quick Step', () => {
  it('always escapes a wild battle and refunds 1 Initiative (not above 5)', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff'); // Puddlit has Quick Step
    expect(W.ability(s)).toBe('quickStep');
    s.initiative = 2;
    const b = createBattle(W.playerSide(s), side('wild', [createCreature('zapup', 3)]), WEATHER.clear, { quickStep: true });
    expect(resolveRound(b, { kind: 'run' }).some((e) => e.t === 'end' && e.result === 'escaped')).toBe(true);
    const sum = W.finishBattle(s, b, { kind: 'wild' });
    expect(s.initiative).toBe(3);
    expect(sum.text.join(' ')).toMatch(/Quick Step/);
    s.initiative = 5;
    const b2 = createBattle(W.playerSide(s), side('wild', [createCreature('zapup', 3)]), WEATHER.clear, { quickStep: true });
    resolveRound(b2, { kind: 'run' });
    W.finishBattle(s, b2, { kind: 'wild' });
    expect(s.initiative).toBe(5);
    // without Quick Step, an escape refunds nothing
    const o = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff');
    o.initiative = 2;
    const b3 = createBattle(W.playerSide(o), side('wild', [createCreature('zapup', 3)]), WEATHER.clear);
    b3.over = 'escaped';
    W.finishBattle(o, b3, { kind: 'wild' });
    expect(o.initiative).toBe(2);
  });
});

describe('getting around: travel items and rides', () => {
  const fresh = (home = 'thunder', style: Parameters<typeof newGame>[1] = 'balanced') => { const s = newGame('T', style, home, 'cindercub', '#fff'); s.event = undefined; return s; };

  it('the Bike: one d6 roll a turn, a free ride within that many steps, no exploring', () => {
    const s = fresh();
    expect(W.bikeBlock(s)).toMatch(/Bike/);
    s.inventory.bike = 1;
    const n = W.rollBike(s)!;
    expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(6);
    expect(W.rollBike(s)).toBe(n); // the waiting roll is kept, not re-rolled
    const reach = W.bikeReach(s, n);
    const far = Object.keys(reach).sort((a, b) => reach[b].length - reach[a].length)[0];
    expect(reach[far].length).toBeLessThanOrEqual(n);
    const explored = s.stats.explored, init = s.initiative;
    const path = W.rideBike(s, far)!;
    expect(s.location).toBe(far);
    expect(s.initiative).toBe(init);
    expect(s.stats.explored).toBe(explored);
    expect(s.stats.steps).toBe(path.length);
    for (const id of path) expect(s.visited).toContain(id);
    expect(W.bikeBlock(s)).toMatch(/already/); // once a turn
    W.endTurn(s);
    expect(W.bikeBlock(s)).toBeNull();
  });

  it('Bike rides stay on land, keep the gates and skip Legendary grounds', () => {
    const s = fresh('kilauea');
    s.inventory.bike = 1;
    const reach = W.bikeReach(s, 6);
    expect(reach.blackSand).toBeUndefined(); // the ferry
    for (const id of Object.keys(reach)) {
      expect(NODE_BY_ID[id].kind).not.toBe('legendary');
      expect(isCloudNode(id) || id === FOREST_FLOOR).toBe(false);
    }
    // the misty way into Lantern Glade needs a wisp in a Fog Lantern, by bike too
    const m = fresh('aurora');
    m.location = MAP_NODES.find((n) => n.name === 'Fogbank Path')!.id;
    expect(W.bikeReach(m, 1)[LANTERN_GLADE]).toBeUndefined();
    m.inventory['fog-lantern'] = 1;
    expect(W.bikeReach(m, 1)[LANTERN_GLADE]).toBeUndefined();
    m.flags.wisp = true;
    expect(W.bikeReach(m, 1)[LANTERN_GLADE]).toBeDefined();
  });

  it('a Taxi Ticket only works in a city, and spends the rest of the Initiative', () => {
    const s = fresh();
    s.inventory['taxi-ticket'] = 1;
    expect(W.taxiTargets(s)).toHaveLength(Object.keys(CITIES).length - 1);
    expect(W.rideTaxi(s, 'iron')).toBe(true);
    expect(s.location).toBe('iron');
    expect(s.initiative).toBe(0);
    expect(s.inventory['taxi-ticket'] ?? 0).toBe(0);
    const w = fresh();
    w.inventory['taxi-ticket'] = 1;
    w.location = neighbors('thunder')[0].node.id; // a wild node
    expect(W.taxiTargets(w)).toEqual([]);
  });

  it('the Homing Feather goes home (a Wanderer may pick a rested city), not from Cloud Island', () => {
    const s = fresh('thunder', 'drill');
    s.inventory['homing-feather'] = 2;
    s.location = 'iron';
    W.rest(s, 'iron');
    expect(W.featherTargets(s)).toEqual(['thunder']);
    const w = fresh();
    w.inventory['homing-feather'] = 1;
    W.rest(w, 'iron'); W.rest(w, 'gloom');
    w.location = 'aurora';
    expect(W.featherTargets(w).sort()).toEqual(['gloom', 'iron', 'thunder']);
    expect(W.useFeather(w, 'gloom')).toBe(true);
    expect(w.location).toBe('gloom');
    expect(w.initiative).toBe(0);
    s.location = CLOUD_RING[0];
    expect(W.featherTargets(s)).toEqual([]);
  });

  it('Trail Mix: +1 Initiative, up to 5, once a turn', () => {
    const s = fresh();
    s.inventory['trail-mix'] = 3;
    expect(W.trailMixBlock(s)).toMatch(/full/);
    s.initiative = 3;
    expect(W.eatTrailMix(s)).toBe(true);
    expect(s.initiative).toBe(4);
    expect(W.eatTrailMix(s)).toBe(false);
    expect(s.inventory['trail-mix']).toBe(2);
  });

  it('the Bike is kept once bought and can only be owned once; Taxi Tickets are sold in cities', () => {
    const s = fresh();
    s.coins = 100;
    expect(W.marketStock('lumber')).toContain('bike');
    expect(W.marketStock('thunder')).toContain('taxi-ticket');
    expect(W.buy(s, 'bike')).toBe(true);
    expect(W.buy(s, 'bike')).toBe(false);
  });

  it('the Hot Air Balloon offers three other cities and sets you down free; the Night Coach charges', () => {
    const s = fresh();
    s.turn = 3; // day
    E.rollEvent(s, 'balloon');
    const v = E.eventView(s)!;
    const cities = v.choices.filter((c) => c.id !== 'decline').map((c) => c.id);
    expect(cities).toHaveLength(3);
    expect(cities).not.toContain('thunder');
    const init = s.initiative, coins = s.coins;
    E.resolveEvent(s, cities[0]);
    expect(s.location).toBe(cities[0]);
    expect(s.initiative).toBe(init);
    expect(s.coins).toBe(coins);
    const c = fresh();
    c.turn = 4; // night
    E.rollEvent(c, 'coach');
    const to = (c.event!.data.city as string);
    expect(to).not.toBe('thunder');
    c.coins = 10;
    E.resolveEvent(c, 'ride');
    expect(c.location).toBe(to);
    expect(c.coins).toBe(6);
  });
});

describe('active effects', () => {
  it('lists the Nabe until the next battle, lucky stars, incense and a wisp', () => {
    const s = newGame('T', 'balanced', 'hollow', 'cindercub', '#fff');
    s.event = undefined;
    expect(W.activeEffects(s)).toEqual([]);
    W.rest(s, 'hollow');
    const nabe = W.activeEffects(s).find((e) => e.id === 'hotpot')!;
    expect(nabe.name).toBe('Mushroom Moss Nabe');
    expect(nabe.text).toMatch(/\+2 Evasion/); // doubled at home
    s.coins = 50;
    E.rollEvent(s, 'fortune');
    E.resolveEvent(s, 'pay');
    s.flags.lure = true;
    s.inventory['fog-lantern'] = 1; s.flags.wisp = true;
    expect(W.activeEffects(s).map((e) => e.id)).toEqual(['hotpot', 'starCharm', 'lure', 'wisp']);
    // a battle eats the Nabe
    const b = createBattle(W.playerSide(s), { kind: 'wild', name: 'x', team: [createCreature('zapup', 1)], active: 0, mods: {} }, W.weather(s));
    b.over = 'win';
    W.finishBattle(s, b, { kind: 'wild' });
    expect(W.activeEffects(s).map((e) => e.id)).not.toContain('hotpot');
  });
});

describe('Lantern Glade and the Rainbow Plains', () => {
  const fresh = () => { const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff'); s.event = undefined; s.initiative = 5; return s; };
  const fogbank = () => MAP_NODES.find((n) => n.name === 'Fogbank Path')!.id;

  it('the road between Mistfall and Hollow Crest is open to everyone now', () => {
    const s = fresh();
    s.location = MAP_NODES.find((n) => n.name === 'Dappled Dell')!.id;
    expect(W.canMoveTo(s, 'hollow').ok).toBe(true);
    expect(MAP_NODES.filter((n) => n.name === 'Lantern Glade').map((n) => n.id)).toEqual([LANTERN_GLADE]);
    expect(NODE_BY_ID[LANTERN_GLADE].kind).toBe('town');
    expect(neighbors(LANTERN_GLADE).map((n) => n.node.id).sort()).toEqual([fogbank(), 'prism1'].sort());
    // north-west of the fog road, still south of Aurora Peak, and on the mainland
    expect(NODE_BY_ID[LANTERN_GLADE].z).toBeGreaterThan(NODE_BY_ID.aurora.z);
    for (const id of RAINBOW_PLAINS) { expect(NODE_BY_ID[id].z).toBeGreaterThan(NODE_BY_ID.aurora.z); expect(NODE_BY_ID[id].biome).toBe('prism'); }
    expect(landmassOf('mistfall')).toEqual(expect.arrayContaining(WISP_REGION));
    expect(KEY_ITEM_TOWNS).not.toContain(LANTERN_GLADE);
  });

  it('a new Fog Lantern hides a wisp on the mainland; catching it opens the Glade, leaving sends it home', () => {
    const s = fresh();
    s.coins = 50;
    s.location = fogbank();
    expect(W.canMoveTo(s, LANTERN_GLADE).reason).toMatch(/Fog Lantern/);
    expect(W.buy(s, 'fog-lantern')).toBe(true);
    const at = s.flags.wispAt!;
    expect(WISP_SPOTS).toContain(at);
    expect(at).not.toBe(s.location);
    expect(W.canMoveTo(s, LANTERN_GLADE).ok).toBe(false); // a lantern alone won't do
    expect(W.canMoveTo(s, LANTERN_GLADE).reason).toMatch(/wisp/);
    expect(W.activeEffects(s).map((e) => e.id)).not.toContain('wisp');
    W.travelTo(s, at);
    expect(wispLit(s)).toBe(true);
    expect(s.flags.wispAt).toBeNull();
    s.location = fogbank();
    expect(W.moveTo(s, LANTERN_GLADE)).not.toBeNull();
    s.initiative = 5;
    W.moveTo(s, 'prism1');
    expect(s.location).toBe('prism1');
    expect(wispLit(s)).toBe(true); // inside, the wisp stays
    s.initiative = 5;
    W.moveTo(s, LANTERN_GLADE);
    W.moveTo(s, fogbank());
    expect(wispLit(s)).toBe(false);
    expect(WISP_SPOTS).toContain(s.flags.wispAt);
    expect(s.flags.wispAt).not.toBe(fogbank());
    expect(W.canMoveTo(s, LANTERN_GLADE).ok).toBe(false); // a new wisp for every visit
  });

  it('wisps only wait where you can walk without key items', () => {
    for (const id of ['hollow', 'mistfall', 'thunder', 'lumber', fogbank()]) expect(WISP_SPOTS).toContain(id);
    for (const id of [...WISP_REGION, 'blackSand', 'firepit', FOREST_FLOOR, ...CLOUD_RING, 'ironwake', 'sunspire', 'stadium']) expect(WISP_SPOTS).not.toContain(id);
    for (const id of WISP_SPOTS) expect(['wild', 'town', 'city']).toContain(NODE_BY_ID[id].kind);
    const s = fresh();
    for (let i = 0; i < 50; i++) { rollWisp(s, tools); expect(s.flags.wispAt).not.toBe(s.location); }
    // an older save with a Fog Lantern gets its first wisp
    const old = JSON.parse(JSON.stringify(s));
    old.inventory['fog-lantern'] = 1; delete old.flags.wispAt;
    expect(WISP_SPOTS).toContain(migrate(old)!.flags.wispAt);
  });

  it('the Plains change type every new day, never the same two days running, the same for everyone in a match', () => {
    const s = fresh();
    for (let t = 1; t < 100; t += 2) {
      expect(prismType(s, tools, t)).toBe(prismType(s, tools, t + 1));
      expect(prismType(s, tools, t + 2)).not.toBe(prismType(s, tools, t));
    }
    s.turn = 2;
    expect(prismType(s, tools)).toBe(prismType(s, tools, 1));
    const seen = new Set(Array.from({ length: 50 }, (_, d) => prismType(s, tools, d * 2 + 1)));
    expect(seen.size).toBeGreaterThanOrEqual(6);
    const b = fresh();
    setActiveMatch(newMatch([s, b]));
    expect(b.prismSeed).toBe(s.prismSeed);
    setActiveMatch(null);
  });

  it('Plains creatures are the type of the day and at least a rarity higher; finds are exotic', () => {
    const s = fresh();
    s.location = 'prism1';
    s.visited.push('prism1');
    const exotic = new Set(['duskberry', 'root-salve', 'rousing-salts', ...BIOME_MATERIALS.prism]);
    let encounters = 0, finds = 0;
    for (let i = 0; i < 300; i++) {
      s.turn = 1 + (i % 20);
      s.initiative = 5;
      if (i % 2 === 0) s.flags.lure = true;
      const out = W.reexplore(s)!;
      if (out.t === 'encounter') {
        encounters++;
        expect(out.rarity).not.toBe('common');
        expect(speciesOf(out.battle.sides[1].team[0]).types[0]).toBe(prismType(s, tools));
      }
      if (out.t === 'item') { finds++; for (const it of out.items) expect(exotic.has(it.id), it.id).toBe(true); }
      if (out.t === 'itemChoice') { finds++; for (const o of out.options) for (const it of o.items) expect(exotic.has(it.id), it.id).toBe(true); }
    }
    expect(encounters).toBeGreaterThan(50);
    expect(finds).toBeGreaterThan(10);
    // the Codex lists the Plains for Prime and up, never for Commons (they're bumped to Prime there)
    expect(W.encounterSpots('twinkit').some((x) => x.node.biome === 'prism')).toBe(false);
    expect(W.encounterSpots('orbuddle').some((x) => x.node.biome === 'prism')).toBe(true);
  });
});

describe('no overworld movements', () => {
  it('no species learns Fly, Sail, Tunnel or Wayfind, and chart node g (third row, left) is always energy', () => {
    for (const sp of SPECIES) expect((sp as { movement?: string }).movement, sp.id).toBeUndefined();
    for (const sp of SPECIES.slice(0, 40)) {
      const g = progressionTree(createCreature(sp.id, 5)).find((n) => n.id === 'g')!;
      expect(g.kind, sp.id).toBe('energy');
    }
  });

  it('every gated route opens with its item alone (Ironwake Shoals takes the ferry)', () => {
    for (const e of MAP_EDGES) expect(Object.keys(e.requires ?? {}).every((k) => k === 'item' || k === 'wisp'), `${e.a}-${e.b}`).toBe(true);
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.merits = ['thunder', 'iron', 'gloom', 'aurora', 'mistfall', 'dustmere']; // Tier 4
    s.initiative = 5;
    expect(W.canMoveTo(s, 'ironwake').ok).toBe(false);
    s.inventory['ferry-pass'] = 1;
    expect(W.canMoveTo(s, 'ironwake').ok).toBe(true);
  });

  it('a saved creature that had learned a movement keeps the chart node as +2 energy of its second type', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    const c = s.roster[0];
    const sp = speciesOf(c);
    const k = sp.types[1] ?? sp.types[0];
    const before = c.extraEnergy[k] ?? 0;
    (c as unknown as { movement?: string }).movement = 'sail';
    migrate(s);
    expect((c as unknown as { movement?: string }).movement).toBeUndefined();
    expect(c.extraEnergy[k]).toBe(before + 2);
  });
});

describe('Clash coin flip', () => {
  it('a tied Clash reports the coin flip winner, and that side acts first', () => {
    // identical creatures both catching their breath: speeds always tie, so every round is a Clash
    const real = Math.random;
    try {
      for (const coin of [0.2, 0.8]) {
        Math.random = () => coin; // every roll equal, and the coin lands on `coin`
        const b = createBattle(side('A', [createCreature('zapup', 5)]), side('B', [createCreature('zapup', 5)]), WEATHER.clear);
        const ev = resolveRound(b, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'move', move: CATCH_BREATH.id });
        const clash = ev.find((e) => e.t === 'clash');
        expect(clash && clash.t === 'clash' && clash.loser).toBeNull();
        if (clash?.t !== 'clash') throw new Error('no clash');
        expect(clash.coin).toBe(true);
        expect(clash.first).toBe(coin < 0.5 ? 0 : 1);
        const firstUse = ev.find((e) => e.t === 'use');
        expect(firstUse && firstUse.t === 'use' && firstUse.side).toBe(clash.first);
      }
    } finally { Math.random = real; }
  });

  it('an uneven Clash: the higher roller acts first, with no coin', () => {
    let seen = 0;
    for (let i = 0; i < 300 && seen < 5; i++) {
      const b = createBattle(side('A', [createCreature('zapup', 5)]), side('B', [createCreature('zapup', 5)]), WEATHER.clear);
      const ev = resolveRound(b, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'move', move: CATCH_BREATH.id });
      const clash = ev.find((x) => x.t === 'clash');
      if (clash?.t !== 'clash' || clash.loser === null) continue;
      seen++;
      expect(clash.first).toBe(clash.loser === 0 ? 1 : 0);
      expect(clash.coin).toBeUndefined();
      const firstUse = ev.find((x) => x.t === 'use');
      if (firstUse?.t === 'use') expect(firstUse.side).toBe(clash.first);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('Wanderer: home anywhere', () => {
  const wipeOut = (s: ReturnType<typeof newGame>, wipeTo?: string) => {
    const b = createBattle(W.playerSide(s), side('wild', [createCreature('zapup', 3)]), WEATHER.clear);
    b.over = 'lose';
    for (const c of s.roster) c.ko = true;
    return W.finishBattle(s, b, { kind: 'wild', wipeTo });
  };

  it('remembers the cities rested at (not towns), most recent last, starting with home', () => {
    const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff');
    expect(W.restedCities(s)).toEqual(['thunder']);
    W.rest(s, 'iron');
    W.rest(s, Object.keys(TOWNS)[0]);
    W.rest(s, 'gloom');
    W.rest(s, 'iron');
    expect(W.restedCities(s)).toEqual(['thunder', 'gloom', 'iron']);
    expect(W.wipeDefault(s)).toBe('iron');
  });

  it('a wiped Wanderer returns to the rested city they choose, and only a rested one', () => {
    const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff');
    W.rest(s, 'iron');
    s.location = 'gloom';
    const sum = wipeOut(s, 'iron');
    expect(s.location).toBe('iron');
    expect(sum.text.join(' ')).toMatch(new RegExp(CITIES.iron.name));
    s.location = 'iron';
    wipeOut(s, 'gloom'); // never rested there: home instead
    expect(s.location).toBe('thunder');
  });

  it('other styles always go home, and only have home to choose', () => {
    const s = newGame('T', 'drill', 'thunder', 'cindercub', '#fff');
    W.rest(s, 'iron');
    expect(W.wipeOptions(s)).toEqual(['thunder']);
    expect(W.wipeDefault(s)).toBe('thunder');
    s.location = 'iron';
    wipeOut(s, 'iron');
    expect(s.location).toBe('thunder');
  });
});

describe('Trainer ID stats', () => {
  it('a new game starts every counter at zero', () => {
    const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff');
    expect(s.stats).toMatchObject({ encountered: 0, foesKO: 0, itemsFound: 0, coinsEarned: 0, steps: 0, record: {}, moveTypes: {} });
    expect(s.stats.trackedFrom).toBeUndefined();
  });

  it('records wins, losses and getaways per kind of battle, and wild encounters', () => {
    const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff');
    const fight = (kind: 'wild' | 'trainer', over: 'win' | 'lose' | 'escaped') => {
      const b = createBattle(W.playerSide(s), side('foe', [createCreature('zapup', 3)]), WEATHER.clear);
      b.over = over;
      W.finishBattle(s, b, { kind });
      for (const c of s.roster) c.ko = false;
    };
    fight('wild', 'win'); fight('wild', 'escaped'); fight('trainer', 'win'); fight('trainer', 'lose');
    expect(s.stats.record).toEqual({ wild: { won: 1, lost: 0, ran: 1 }, trainer: { won: 1, lost: 1, ran: 0 } });
    expect(s.stats.encountered).toBe(2);
  });

  it('counts the types of moves the player used and the foes they knocked out', () => {
    const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff');
    s.roster[0].level = 30;
    const b = createBattle(W.playerSide(s), side('wild', [createCreature('zapup', 1)]), WEATHER.clear);
    for (let i = 0; i < 60 && !b.over; i++) resolveRound(b, chooseAI(b, 0));
    const used = Object.values(b.moveTypes ?? {}).reduce((a, n) => a + n, 0);
    W.finishBattle(s, b, { kind: 'wild' });
    expect(Object.values(s.stats.moveTypes ?? {}).reduce((a, n) => a + (n ?? 0), 0)).toBe(used);
    if (b.over === 'win') expect(s.stats.foesKO).toBe(1);
  });

  it('counts coins earned, items found and steps taken', () => {
    const s = newGame('T', 'haggler', 'thunder', 'cindercub', '#fff');
    earnCoins(s, 4);
    expect(s.stats.coinsEarned).toBe(5); // the Merchant's cut counts too
    W.claimFind(s, { itemRoll: 3, items: [{ id: 'salve', n: 2 }], coins: 0 });
    expect(s.stats.itemsFound).toBe(2);
    s.initiative = 5;
    const to = neighbors(s.location).map((n) => n.node.id).find((id) => W.canMoveTo(s, id).ok)!;
    expect(W.moveTo(s, to)).not.toBeNull();
    expect(s.stats.steps).toBe(1);
  });

  it('older saves start counting when loaded, and say from which turn', () => {
    const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff');
    s.turn = 12;
    s.stats = { battlesWon: 3, recruited: 1, explored: 9 };
    migrate(s);
    expect(s.stats.record).toEqual({});
    expect(s.stats.trackedFrom).toBe(12);
  });
});

describe('the Forest Floor (Dahlia)', () => {
  const atGloom = (merits: string[] = []) => {
    const s = newGame('T', 'balanced', 'gloom', 'sproutle', '#fff');
    s.location = 'gloom'; s.merits = merits;
    s.roster.push(createCreature('zapup', 3));
    return s;
  };
  const down = (s: ReturnType<typeof newGame>) => { s.inventory['canopy-rope'] = 1; s.initiative = 5; expect(W.moveTo(s, FOREST_FLOOR)).not.toBeNull(); };
  /** Explore until a result of this kind turns up. */
  const exploreUntil = (s: ReturnType<typeof newGame>, t: string) => {
    for (let i = 0; i < 400; i++) { s.initiative = 5; s.event = undefined; const o = W.reexplore(s)!; if (o.t === t) return o; }
    throw new Error(`no ${t}`);
  };
  it('is one node below Gloomshade, reached only with a Canopy Rope', () => {
    expect(neighbors(FOREST_FLOOR).map((x) => x.node.id)).toEqual(['gloom']);
    const s = atGloom();
    expect(W.canMoveTo(s, FOREST_FLOOR).ok).toBe(false);
    s.inventory['canopy-rope'] = 1;
    expect(W.canMoveTo(s, FOREST_FLOOR).ok).toBe(true);
    expect(W.arbiterHere(s)).toBeNull(); // Dahlia isn't in the city any more
  });
  it('explores with a d8: nothing costs Morale, encounters are hard to run from, and the trail leads to Dahlia', () => {
    const s = atGloom();
    down(s);
    const nothing = exploreUntil(s, 'nothing');
    expect(nothing).toMatchObject({ die: 8, dark: true });
    const before = s.roster.map((c) => c.morale);
    exploreUntil(s, 'nothing');
    expect(s.roster.every((c, i) => c.morale <= before[i])).toBe(true);
    const enc = exploreUntil(s, 'encounter');
    if (enc.t === 'encounter') { expect(enc.die).toBe(8); expect(enc.battle.hardRun).toBe(true); }
    s.flags.dahliaTrail = 0;
    expect(W.arbiterGate(s, 'gloom')).toMatchObject({ ok: false, show: 'floor' });
    const need = trailNeeded(s, tools);
    expect(need).toBe(3 + tierOf(s));
    let found = false;
    for (let i = 0; i < 2000 && !found; i++) { s.initiative = 5; const o = W.reexplore(s)!; if (o.t === 'trail') { expect(o.die).toBe(8); found = o.found; } }
    expect(found).toBe(true);
    expect(W.arbiterHere(s)).toBe('gloom');
    expect(W.arbiterGate(s, 'gloom').ok).toBe(true);
  });
  it('once Dahlia is beaten, exploring rolls a d6 with no trail results', () => {
    const s = atGloom(['gloom']);
    down(s);
    for (let i = 0; i < 300; i++) {
      s.initiative = 5;
      const o = W.reexplore(s)!;
      expect(o.t).not.toBe('trail');
      if ('die' in o && o.die !== undefined) expect(o.die).toBe(6);
      expect(o.t === 'nothing' || o.t === 'encounter' || o.t === 'item' || o.t === 'itemChoice').toBe(true);
    }
    expect(s.flags.dahliaTrail ?? 0).toBe(0);
  });
  it('leaving the Forest Floor, by choice or by defeat, loses the trail', () => {
    const s = atGloom();
    down(s);
    s.flags.dahliaTrail = 2;
    s.initiative = 5;
    W.moveTo(s, 'gloom');
    expect(s.flags.dahliaTrail).toBe(0);
    const w = atGloom();
    down(w);
    w.flags.dahliaTrail = 3;
    const lost = createBattle(side('player', [w.roster[0]]), side('wild', [createCreature('zapup', 3)]), WEATHER.clear);
    lost.over = 'lose';
    for (const c of w.roster) c.ko = true;
    W.finishBattle(w, lost, { kind: 'wild' });
    expect(w.location).toBe(w.trainer.home);
    expect(w.flags.dahliaTrail).toBe(0);
  });
  it('running needs a 7+ down here, unless Quick Step', () => {
    let escaped = 0;
    for (let i = 0; i < 300; i++) {
      const b = createBattle(side('player', [createCreature('puddlit', 5)]), side('wild', [createCreature('zapup', 5)]), WEATHER.clear, { hardRun: true });
      if (resolveRound(b, { kind: 'run' }).some((e) => e.t === 'end' && e.result === 'escaped')) escaped++;
    }
    expect(escaped / 300).toBeLessThan(0.45);
    for (const [hardRun, want] of [[true, /Forest Floor hems you in/], [false, /^Couldn't escape!$/]] as const) {
      for (let i = 0, said = false; !said; i++) {
        expect(i).toBeLessThan(200);
        const ev = resolveRound(createBattle(side('player', [createCreature('puddlit', 5)]), side('wild', [createCreature('zapup', 5)]), WEATHER.clear, { hardRun }), { kind: 'run' });
        const line = ev.find((e) => e.t === 'say' && /escape/.test(e.text));
        if (line?.t === 'say') { said = true; expect(line.text).toMatch(want); }
      }
    }
    const qs = createBattle(side('player', [createCreature('puddlit', 5)]), side('wild', [createCreature('zapup', 5)]), WEATHER.clear, { hardRun: true, quickStep: true });
    expect(resolveRound(qs, { kind: 'run' }).some((e) => e.t === 'end' && e.result === 'escaped')).toBe(true);
  });
  it('only Forest Floor events happen down there, and they are all forced', () => {
    for (let i = 0; i < 120; i++) {
      const s = atGloom();
      s.location = FOREST_FLOOR; s.turn = 4 + (i % 2); s.inventory.salve = 2;
      const ev = E.rollEvent(s);
      if (!ev) continue;
      expect(E.EVENT_PLACES[ev.id]).toBe('floor');
      expect(E.eventView(s)!.forced).toBe(true);
    }
    for (const id of Object.keys(E.EVENT_PLACES).filter((k) => E.EVENT_PLACES[k] === 'floor')) {
      const s = atGloom();
      expect(E.rollEvent(s)?.id).not.toBe(id); // never in the city
    }
  });
  it('exotic finds are a little better than the usual ones', () => {
    const s = atGloom();
    const c = s.roster[0];
    c.vitality = 0; c.fatigue = 2; c.ko = false;
    s.inventory['root-salve'] = 1;
    W.useItem(s, 'root-salve', c.uid);
    expect(c.vitality).toBe(Math.min(maxVitality(c), 2));
    expect(c.fatigue).toBe(0);
    const morale = c.morale;
    s.inventory.duskberry = 1;
    W.useItem(s, 'duskberry', c.uid);
    expect(c.morale).toBe(Math.min(10, morale + 2));
    expect(W.offeringBonus(['heartwood-resin'], createCreature('sproutle', 3))).toBeGreaterThan(W.offeringBonus(['pine-resin'], createCreature('sproutle', 3)));
  });
});

describe('Cloud Island (Salem)', () => {
  const night = 4, day = 3, winterDay = 77;
  const trainer = (turn = night) => {
    const s = newGame('T', 'balanced', 'aurora', 'puddlit', '#fff');
    s.turn = turn; s.location = 'aurora';
    return s;
  };
  /** Walk to a node with enough Initiative, ignoring whatever the explore turns up. */
  const go = (s: ReturnType<typeof newGame>, id: string) => { s.initiative = 5; const out = W.moveTo(s, id); expect(out, `move to ${id}`).not.toBeNull(); };
  it('is a ring of six cloud wilds around the Eye of the Sky, joined to Aurora Peak by a portal', () => {
    const ring = CLOUD_RING.map((id) => NODE_BY_ID[id]);
    expect(ring.every((n) => n.kind === 'wild' && n.biome === 'cloud')).toBe(true);
    expect(new Set(ring.map((n) => n.name)).size).toBe(6);
    for (const [i, id] of CLOUD_RING.entries()) {
      const next = neighbors(id).map((x) => x.node.id);
      expect(next).toContain(CLOUD_RING[(i + 1) % 6]);
      expect(next).toContain(CLOUD_RING[(i + 5) % 6]);
    }
    expect(NODE_BY_ID[CLOUD_EYE]).toMatchObject({ kind: 'legendary', legendary: 'nimbalune' });
    expect(MAP_EDGES.find((e) => e.via === 'portal')).toMatchObject({ a: 'aurora', b: CLOUD_RING[0] });
    // a separate landmass: no walking there from the mainland
    expect(landmassOf('aurora')).not.toContain(CLOUD_RING[0]);
    // Nimbalune fills the Water/Astral Legendary slot
    expect(ROSTER.find((r) => r.types.includes('water') && r.types.includes('astral'))?.legendary).toBe('nimbalune');
  });
  it('the portal opens at night and all Winter, and is closed by day', () => {
    expect(W.canMoveTo(trainer(day), CLOUD_RING[0]).ok).toBe(false);
    expect(W.canMoveTo(trainer(day), CLOUD_RING[0]).reason).toMatch(/night/);
    expect(W.canMoveTo(trainer(night), CLOUD_RING[0]).ok).toBe(true);
    expect(W.canMoveTo(trainer(winterDay), CLOUD_RING[0]).ok).toBe(true);
  });
  it('a full lap (6 steps the same way round) makes Salem accept; turning back restarts the count', () => {
    const s = trainer();
    expect(W.arbiterGate(s, 'aurora')).toMatchObject({ ok: false, show: 'cloud' });
    go(s, CLOUD_RING[0]);
    for (const i of [1, 2]) go(s, CLOUD_RING[i]);
    expect(cloudLapProgress(s).steps).toBe(2);
    go(s, CLOUD_RING[1]); // turned back
    expect(cloudLapProgress(s).steps).toBe(1);
    for (const i of [0, 5, 4, 3, 2]) go(s, CLOUD_RING[i]); // six steps the other way round
    expect(s.flags.salemWorthy).toBe(true);
    expect(W.arbiterGate(s, 'aurora').ok).toBe(true);
  });
  it('a lap survives day turns on the island but ends when you leave', () => {
    const s = trainer();
    go(s, CLOUD_RING[0]);
    for (const i of [1, 2, 3]) go(s, CLOUD_RING[i]);
    W.endTurn(s); // dawn: still on the island, and you can keep walking
    expect(timeOfDay(s.turn)).toBe('day');
    go(s, CLOUD_RING[4]);
    expect(cloudLapProgress(s).steps).toBe(4);
    expect(W.canMoveTo(s, 'aurora').ok).toBe(false); // the portal is shut by day
    const s2 = trainer();
    go(s2, CLOUD_RING[0]); go(s2, CLOUD_RING[1]); go(s2, CLOUD_RING[0]);
    go(s2, 'aurora');
    expect(s2.flags.cloudLap ?? 0).toBe(0);
  });
  it('the Eye of the Sky only opens to trainers who beat Salem', () => {
    const s = trainer();
    go(s, CLOUD_RING[0]);
    s.initiative = 5;
    expect(W.canMoveTo(s, CLOUD_EYE).reason).toMatch(/Salem/);
    s.merits.push('aurora');
    const out = W.moveTo(s, CLOUD_EYE);
    expect(out?.t).toBe('legendary');
    if (out?.t === 'legendary') expect(out.battle.sides[1].team[0].species).toBe('nimbalune');
  });
  it('Cloud Island turns up universal offerings that suit any creature', () => {
    for (const id of ['cloud-silk', 'stardust', 'moonbow-prism']) expect(BIOME_MATERIALS.cloud).toContain(id);
    for (const sp of SPECIES.slice(0, 60)) {
      const c = createCreature(sp.id, 3);
      expect(W.offeringBonus(['moonbow-prism'], c)).toBe(3);
      expect(W.offeringBonus(['stardust'], c)).toBe(2);
      expect(W.offeringBonus(['cloud-silk'], c)).toBe(1);
    }
  });
  it('on the island only Cloud Island events happen, and they never happen elsewhere', () => {
    for (const [loc, want] of [[CLOUD_RING[2], 'cloud'], ['thunder', 'anywhere']] as const) {
      for (const turn of [day, night]) for (let i = 0; i < 80; i++) {
        const s = trainer(turn);
        s.location = loc; s.coins = 20; s.roster.push(createCreature('zapup', 3));
        const ev = E.rollEvent(s);
        if (ev) expect(E.EVENT_PLACES[ev.id], `${ev.id} at ${loc}`).toBe(want);
      }
    }
  });
  it('each step onto the island costs +1 Initiative per Tier, never more than a whole turn', () => {
    const s = trainer();
    expect(W.canMoveTo(s, CLOUD_RING[0]).cost).toBe(2); // Tier 1: 1 + 1
    s.merits = ['hollow', 'thunder', 'kilauea', 'gloom']; // Tier 3
    expect(W.canMoveTo(s, CLOUD_RING[0]).cost).toBe(4);
    s.merits = ['hollow', 'thunder', 'kilauea', 'gloom', 'canyon', 'iron', 'mangrove', 'aurora']; // Tier 5: 6, capped at 5
    expect(W.canMoveTo(s, CLOUD_RING[0]).cost).toBe(5);
    s.merits = [];
    go(s, CLOUD_RING[0]);
    expect(W.canMoveTo(s, 'aurora').cost).toBe(1); // leaving costs the normal amount
    const pf = newGame('P', 'pathfinder', 'aurora', 'puddlit', '#fff');
    pf.turn = night; pf.location = 'aurora';
    expect(W.canMoveTo(pf, CLOUD_RING[0]).cost).toBe(1); // a free first move still pays the Tier
  });
  it('island loot waits in the Cloud satchel, secured on escape and lost on a wipe', () => {
    const s = trainer();
    go(s, CLOUD_RING[0]);
    s.cloudLoot = undefined; // ignore whatever the arrival explore turned up
    const before = { ...s.inventory };
    addItem(s, 'stardust', 2);
    expect(s.inventory.stardust ?? 0).toBe(before.stardust ?? 0);
    expect(s.cloudLoot).toEqual({ stardust: 2 });
    addItem(s, 'salve', -1); // spending still comes out of the real bag
    go(s, 'aurora'); // escape through the portal
    expect(s.inventory.stardust).toBe((before.stardust ?? 0) + 2);
    expect(s.cloudLoot).toBeUndefined();
    // a wipe on the island loses the satchel
    const w = trainer();
    go(w, CLOUD_RING[0]);
    addItem(w, 'moonbow-prism');
    const lost = createBattle(side('player', [w.roster[0]]), side('wild', [createCreature('zapup', 3)]), WEATHER.clear);
    lost.over = 'lose';
    for (const c of w.roster) c.ko = true;
    W.finishBattle(w, lost, { kind: 'wild' });
    expect(w.location).toBe(w.trainer.home);
    expect(w.inventory['moonbow-prism'] ?? 0).toBe(0);
    expect(w.cloudLoot).toBeUndefined();
  });
  it('in Winter, Aurora Peak is always under Aurora Night', () => {
    const s = trainer(winterDay);
    s.weather = 'clear';
    expect(W.weather(s).id).toBe('aurora');
    s.location = 'thunder';
    expect(W.weather(s).id).toBe('clear');
    const spring = trainer(day);
    spring.weather = 'clear';
    expect(W.weather(spring).id).toBe('clear');
  });
});

describe('Circuit Stadium as a town', () => {
  const at = () => { const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff'); s.location = 'stadium'; return s; };
  it('has a stable, a market, a workbench and odd jobs', () => {
    const s = at(), c = s.roster[0];
    c.ko = true; c.health = 0; c.vitality = 0;
    W.rest(s, 'stadium');
    expect([c.ko, c.health]).toEqual([false, maxHealth(c)]);
    expect(W.marketStock('stadium').length).toBeGreaterThan(3);
    for (const id of W.marketStock('stadium')) expect(ITEMS[id], id).toBeDefined();
    expect(W.canCraftHere(s)).toBe(true);
    expect(W.workBlock(s)).toBeNull();
  });
  it('is never given a roaming key item', () => {
    expect(KEY_ITEM_TOWNS).not.toContain('stadium');
    for (let i = 0; i < 100; i++) expect(W.townKeyItems(at(), 'stadium')).toEqual([]);
  });
});

describe('roaming key items', () => {
  it('the Canopy Rope and Root Whistle go to two different eligible towns each game', () => {
    expect(KEY_ITEM_TOWNS.sort()).toEqual(['dustmere', 'lumber', 'mistfall', 'ridgeway', 'saltmarsh']);
    const seen = { 'canopy-rope': new Set<string>(), 'root-whistle': new Set<string>() };
    for (let i = 0; i < 200; i++) {
      const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
      const rope = keyTownOf(s, 'canopy-rope'), whistle = keyTownOf(s, 'root-whistle');
      expect(rope).not.toBe(whistle);
      for (const t of [rope, whistle]) expect(['valor', 'quillhaven', 'depths', 'blackSand']).not.toContain(t);
      seen['canopy-rope'].add(rope); seen['root-whistle'].add(whistle);
      // the market there sells it, and only there
      for (const town of KEY_ITEM_TOWNS) {
        expect(W.townKeyItems(s, town).includes('canopy-rope')).toBe(town === rope);
        expect(W.townKeyItems(s, town).includes('root-whistle')).toBe(town === whistle);
      }
    }
    expect(seen['canopy-rope'].size).toBeGreaterThan(2);
    expect(seen['root-whistle'].size).toBeGreaterThan(2);
  });
  it('the arena hints name this game’s town; fixed key items stay put; old saves keep the classic towns', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    s.keyTowns = { 'canopy-rope': 'ridgeway', 'root-whistle': 'mistfall' };
    s.roster.push(createCreature('zapup', 3));
    expect(W.arbiterGate(s, 'gloom').reason).toMatch(/Ridgeway/);
    expect(W.arbiterGate(s, 'mangrove').reason).toMatch(/Mistfall/);
    expect(W.townKeyItems(s, 'mistfall')).toEqual(['fog-lantern', 'root-whistle']);
    expect(W.townKeyItems(s, 'saltmarsh')).toEqual(['ferry-pass']);
    delete s.keyTowns; // a save from before roaming key items
    expect(keyTownOf(s, 'canopy-rope')).toBe('lumber');
    expect(keyTownOf(s, 'root-whistle')).toBe('saltmarsh');
  });
  it('everyone in a hotseat or online match shares one placement', () => {
    const m = newMatch([newGame('A', 'balanced', 'thunder', 'puddlit', '#f00'), newGame('B', 'balanced', 'thunder', 'zapup', '#00f'), newGame('C', 'balanced', 'gloom', 'sproutle', '#0f0')]);
    for (const p of m.players) expect(p.keyTowns).toEqual(m.players[0].keyTowns);
  });
});

describe('arena effects', () => {
  /** An Arbiter battle with a sturdy challenger, so the arena effect has time to show. */
  const arena = (city: string, starter: string) => {
    const s = newGame('T', 'balanced', 'thunder', starter, '#fff');
    s.location = city;
    const b = W.arbiterBattle(s, city);
    for (const side of b.sides) for (const c of side.team) { c.health = 999; c.vitality = 9; }
    return b;
  };
  /** What the arena did to each side: 'heal' or 'damage' right after an arena line. */
  const arenaHits = (events: BEvent[]) => {
    const out: { side: 0 | 1; t: string }[] = [];
    events.forEach((e, i) => {
      const next = events[i + 1];
      if (e.t === 'arena' && next && (next.t === 'heal' || next.t === 'damage')) out.push({ side: next.side, t: next.t });
    });
    return out;
  };
  it('Watson’s volts heal Electric creatures (his, and yours) and shock everyone else', () => {
    const seen = { elecHeal: 0, elecHurt: 0, otherHeal: 0, otherHurt: 0, watsonHeal: 0, watsonHurt: 0 };
    for (const starter of ['zapup', 'pebbark']) {
      for (let k = 0; k < 20; k++) {
        const b = arena('thunder', starter);
        for (let r = 0; r < 6 && !b.over; r++) {
          for (const hit of arenaHits(resolveRound(b, { kind: 'move', move: CATCH_BREATH.id }))) {
            if (hit.side === 1) seen[hit.t === 'heal' ? 'watsonHeal' : 'watsonHurt']++;
            else if (starter === 'zapup') seen[hit.t === 'heal' ? 'elecHeal' : 'elecHurt']++;
            else seen[hit.t === 'heal' ? 'otherHeal' : 'otherHurt']++;
          }
        }
      }
    }
    expect(seen.watsonHurt).toBe(0);
    expect(seen.elecHurt).toBe(0);
    expect(seen.otherHeal).toBe(0);
    expect(seen.watsonHeal).toBeGreaterThan(0);
    expect(seen.elecHeal).toBeGreaterThan(0);
    expect(seen.otherHurt).toBeGreaterThan(0);
  });
  it('Cliff’s plateau counts down each round and rings the challenger out when it’s gone, without dealing damage', () => {
    const b = arena('canyon', 'puddlit');
    const total = ringRounds(b);
    expect(total).toBe(10);
    expect(ringLeft(b)).toBe(total);
    const lefts: number[] = [];
    for (let r = 0; r < 20 && !b.over; r++) {
      const ev = resolveRound(b, { kind: 'move', move: CATCH_BREATH.id });
      for (const e of ev) if (e.t === 'ring') lefts.push(e.left);
      expect(arenaHits(ev).length).toBe(0); // no crumble damage any more
    }
    expect(b.over).toBe('lose');
    expect(b.round).toBe(total);
    expect(lefts).toEqual(Array.from({ length: total }, (_, i) => total - 1 - i));
    expect([1, 2, 3, 4, 5].map(MARGOS.arenas.crumble.countdown!.rounds)).toEqual([10, 10, 9, 9, 8]);
  });
});

describe('Iron Coast Gauntlet (Stella)', () => {
  const atIron = (merits: string[] = []) => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    s.location = 'iron'; s.merits = merits;
    return s;
  };
  const winOne = (s: ReturnType<typeof newGame>) => {
    const r = W.gimmickBattle(s, 'gauntlet')!;
    expect(r).not.toBeNull();
    r.battle.over = 'win';
    W.finishBattle(s, r.battle, { kind: 'trainer', gimmick: 'gauntlet' });
    return r;
  };
  it('takes 2 trainers per Tier, each above the Trainer Hall level, the last one higher still', () => {
    expect([1, 2, 3, 4, 5].map(gauntletSize)).toEqual([2, 4, 6, 8, 10]);
    for (const t of [1, 2, 3, 4, 5]) {
      expect(gauntletLevel(t, false, tools)).toBe(W.tierBandLevel(t) + 2);
      expect(gauntletLevel(t, true, tools)).toBe(gauntletLevel(t, false, tools) + 1);
      if (t > 1) expect(gauntletLevel(t, false, tools)).toBeGreaterThan(gauntletLevel(t - 1, false, tools));
    }
    const s = atIron(['aurora', 'hollow']); // Tier 2: 4 trainers
    expect(gauntletProgress(s, tools).need).toBe(4);
    const r = W.gimmickBattle(s, 'gauntlet')!;
    expect(r.battle.sides[1].team.every((c) => c.level === gauntletLevel(2, false, tools))).toBe(true);
    expect(r.of).toBe(4);
  });
  it('Stella waits for the Gauntlet; once cleared she can be challenged any time, even after leaving', () => {
    const s = atIron();
    expect(W.arbiterGate(s, 'iron')).toMatchObject({ ok: false, show: 'gauntlet' });
    winOne(s);
    expect(gauntletProgress(s, tools).wins).toBe(1);
    s.initiative = 5;
    const last = winOne(s);
    expect(last.match).toBe(2);
    expect(s.flags.stellaOpen).toBe(true);
    expect(W.arbiterGate(s, 'iron').ok).toBe(true);
    W.moveTo(s, neighbors('iron')[0].node.id);
    s.location = 'iron';
    expect(W.arbiterGate(s, 'iron').ok).toBe(true);
    expect(gauntletBlock(s, tools)).toMatch(/cleared/);
  });
  it('progress survives new turns and Stable rests, but resets when the trainer leaves Iron Coast', () => {
    const s = atIron(['aurora', 'hollow']);
    winOne(s);
    W.rest(s, 'iron');
    W.endTurn(s);
    expect(s.location).toBe('iron');
    expect(gauntletProgress(s, tools).wins).toBe(1);
    s.initiative = 5;
    W.moveTo(s, neighbors('iron')[0].node.id);
    expect(s.flags.gauntletWins).toBe(0);
    expect(gauntletBlock(s, tools)).toMatch(/Iron Coast/);
  });
  it('a loss keeps progress; a full wipe sends you home and resets it', () => {
    const s = atIron(['aurora', 'hollow']);
    winOne(s);
    const r = W.gimmickBattle(s, 'gauntlet')!;
    r.battle.over = 'lose';
    W.finishBattle(s, r.battle, { kind: 'trainer', gimmick: 'gauntlet' });
    expect(gauntletProgress(s, tools).wins).toBe(1);
    s.initiative = 5;
    const r2 = W.gimmickBattle(s, 'gauntlet')!;
    r2.battle.over = 'lose';
    for (const c of s.roster) c.ko = true;
    W.finishBattle(s, r2.battle, { kind: 'trainer', gimmick: 'gauntlet' });
    expect(s.location).toBe('thunder');
    expect(s.flags.gauntletWins).toBe(0);
  });
});

describe('Shifting Depths', () => {
  it('is a town at the bottom of the canyon pocket, reached by the Sinkhole Stair', () => {
    const stair = MAP_NODES.find((n) => n.name === 'Sinkhole Stair')!;
    expect(stair.kind).toBe('wild');
    expect(MAP_NODES.find((n) => n.id === 'depths')).toMatchObject({ name: 'Shifting Depths', kind: 'town' });
    const exits = (id: string) => MAP_EDGES.filter((e) => e.a === id || e.b === id).map((e) => (e.a === id ? e.b : e.a)).sort();
    expect(exits('depths').length).toBe(1); // a dead end
    // walking back from the Depths: a chain of canyon wilds, through the Sinkhole Stair, up to Houndmouth Canyon
    const path: string[] = [];
    for (let at = 'depths', prev = ''; at !== 'canyon';) {
      const next = exits(at).filter((x) => x !== prev);
      expect(next.length, `${at} should lead one way back`).toBe(1);
      prev = at; at = next[0]; path.push(at);
    }
    expect(path).toContain(stair.id);
    expect(path.length - 1).toBeGreaterThanOrEqual(3); // 3 wilds between the town and the city
  });
  it('Explore the Depths: a material calls a creature that craves it, which already accepted the offering', () => {
    for (let i = 0; i < 40; i++) {
      const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
      s.location = 'depths';
      s.inventory['ember-charcoal'] = 1; // fire 2, rock 1
      const out = exploreDepths(s, 'ember-charcoal', tools);
      expect(out).not.toBeNull();
      const wild = out!.battle.sides[1].team[0];
      expect(speciesOf(wild).types.some((t) => t === 'fire' || t === 'rock')).toBe(true);
      expect(s.initiative).toBe(5 - DEPTHS_COST);
      expect(s.inventory['ember-charcoal'] ?? 0).toBe(0);
      expect(W.acceptedOffering(s, wild)).toBe('ember-charcoal');
      expect(W.acceptedOffering(s, createCreature('zapup', 3))).toBeNull();
    }
  });
  it('needs the town, Initiative and a craved material', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    s.inventory['ember-charcoal'] = 1;
    expect(depthsBlock(s, 'ember-charcoal', tools)).toMatch(/Shifting Depths/);
    s.location = 'depths';
    expect(depthsBlock(s, 'salve', tools)).toMatch(/material/);
    expect(depthsBlock(s, 'pine-resin', tools)).toMatch(/don’t have/);
    s.initiative = 0;
    expect(depthsBlock(s, 'ember-charcoal', tools)).toMatch(/Initiative/);
    expect(exploreDepths(s, 'ember-charcoal', tools)).toBeNull();
  });
  it('the accepted offering counts toward recruiting, once', () => {
    let withBonus = 0, without = 0;
    for (let i = 0; i < 300; i++) {
      const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
      s.location = 'depths'; s.inventory['ember-charcoal'] = 1; s.inventory.totem = 2;
      const wild = exploreDepths(s, 'ember-charcoal', tools)!.battle.sides[1].team[0];
      const r = W.attemptRecruit(s, wild, 'totem', []);
      withBonus += r.mods;
      expect(s.flags.depthsOffering).toBeUndefined();
      without += W.attemptRecruit(s, createCreature(wild.species, wild.level), 'totem', []).mods;
    }
    expect(withBonus).toBeGreaterThan(without);
  });
});

describe('AI move variety', () => {
  it('opponents mix up their moves instead of spamming one', () => {
    const me = createCreature('puddlit', 8), foe = createCreature('zapup', 8);
    foe.playbook = ['quick-jab', ...foe.playbook.filter((id) => id !== 'quick-jab')].slice(0, 4);
    const b = createBattle(side('player', [me]), { kind: 'trainer', name: 'Kai', team: [foe], active: 0, mods: {} }, WEATHER.clear);
    const used: string[] = [];
    for (let i = 0; i < 300; i++) used.push((chooseAI(b, 1) as { move: string }).move);
    let streak = 1, longest = 1;
    for (let i = 1; i < used.length; i++) { streak = used[i] === used[i - 1] ? streak + 1 : 1; longest = Math.max(longest, streak); }
    expect(longest).toBeLessThanOrEqual(6);
    expect(new Set(used).size).toBeGreaterThanOrEqual(Math.min(3, foe.playbook.length));
    const top = Math.max(...[...new Set(used)].map((id) => used.filter((x) => x === id).length));
    expect(top / used.length).toBeLessThan(0.75);
  });
  // AI (side 1) zapup vs player (side 0) pebbark; effectValue is deterministic, so compare situations directly
  const setup = (fn: (b: ReturnType<typeof createBattle>) => void = () => {}) => {
    const ai = createCreature('zapup', 8), pl = createCreature('pebbark', 8);
    pl.playbook = ['tackle', 'ember', 'claw'];
    const b = createBattle(side('player', [pl]), { kind: 'trainer', name: 'Kai', team: [ai], active: 0, mods: {} }, WEATHER.clear);
    b.round = 1;
    fn(b);
    return (id: string) => effectValue(b, 1, MOVE_BY_ID[id].effect);
  };
  it('speed buffs are worth more when the foe is faster', () => {
    expect(setup((b) => { b.sides[0].mods.speed = 3; })('static-field')).toBeGreaterThan(setup((b) => { b.sides[1].mods.speed = 3; })('static-field'));
  });
  it('armor matters against a physical bruiser, ward against an elemental attacker', () => {
    const bruiser = setup((b) => { activeOf(b.sides[0]).playbook = ['tackle', 'claw', 'headbutt']; });
    const caster = setup((b) => { activeOf(b.sides[0]).playbook = ['ember']; });
    expect(bruiser('bulwark')).toBeGreaterThan(caster('bulwark'));
    expect(caster('aurora-veil')).toBeGreaterThan(bruiser('aurora-veil'));
  });
  it('against sure hits, defense beats evasion; evasion pays off against hit-or-miss attacks', () => {
    const sure = setup((b) => { activeOf(b.sides[0]).playbook = ['quick-jab']; });
    const wild = setup((b) => { activeOf(b.sides[0]).playbook = ['rampage']; });
    expect(sure('mist-cloak')).toBe(0);
    expect(sure('bulwark')).toBeGreaterThan(sure('mist-cloak'));
    expect(wild('mist-cloak')).toBeGreaterThan(sure('mist-cloak'));
  });
  it('a stat at its +3 cap is worth nothing more; heals only help when hurt', () => {
    expect(setup((b) => { b.sides[1].mods.armor = 3; })('bulwark')).toBe(0);
    expect(setup()('photosynth')).toBeLessThan(setup((b) => { activeOf(b.sides[1]).health = 1; activeOf(b.sides[1]).vitality = 0; })('photosynth'));
  });
  it('the AI uses a well-placed buff often, and rarely when it could finish the foe instead', () => {
    const picks = (fn: (b: ReturnType<typeof createBattle>) => void) => {
      let n = 0;
      for (let i = 0; i < 800; i++) {
        const ai = createCreature('zapup', 8), pl = createCreature('pebbark', 8);
        ai.playbook = ['tackle', 'claw', 'static-field'];
        const b = createBattle(side('player', [pl]), { kind: 'trainer', name: 'Kai', team: [ai], active: 0, mods: {} }, WEATHER.clear);
        b.round = 1; fn(b);
        if ((chooseAI(b, 1) as { move: string }).move === 'static-field') n++;
      }
      return n / 800;
    };
    const outpaced = picks((b) => { b.sides[0].mods.speed = 3; });
    expect(outpaced).toBeGreaterThan(0.3);
    expect(picks((b) => { b.sides[0].mods.speed = 3; activeOf(b.sides[0]).vitality = 0; activeOf(b.sides[0]).health = 2; })).toBeLessThan(outpaced * 0.7); // clearly rarer (about half as often) when a knockout is close
  });
  it('wild and NPC creatures carry varied playbooks; starters get the standard one', () => {
    const sets = new Set(Array.from({ length: 20 }, () => createCreature('zapup', 8).playbook.slice().sort().join()));
    expect(sets.size).toBeGreaterThan(1);
    for (const c of Array.from({ length: 10 }, () => createCreature('zapup', 8))) expect(fits(energy(c), c.playbook)).toBe(true);
  });
});

describe('battle log', () => {
  it('tells a duel from each trainer’s own side, and is kept in each save', () => {
    const a = newGame('A', 'balanced', 'mangrove', 'puddlit', '#000'), d = newGame('D', 'balanced', 'mangrove', 'zapup', '#111');
    d.location = a.location;
    const bt = I.startChallenge(a, d)!;
    const mine: BattleLog = { title: 'm', turn: 1, entries: [] }, theirs: BattleLog = { title: 't', turn: 1, entries: [] };
    const who = (side: 0 | 1) => bt.sides[side].team[bt.sides[side].active].species;
    for (let i = 0; i < 200 && !bt.over; i++) {
      const ev = bt.needSwap ? sendIn(bt, bt.sides[0].team.findIndex((c) => !c.ko)) : resolveRound(bt, { kind: 'move', move: bt.sides[0].team[bt.sides[0].active].playbook[0] });
      for (const e of ev) { logBattleEvent(mine, bt, e, who); logBattleEvent(theirs, bt, e, who, 1); }
    }
    expect(bt.over).toMatch(/win|lose/);
    expect(mine.result).toBe(bt.over);
    expect(theirs.result).toBe(bt.over === 'win' ? 'lose' : 'win');
    const hits = (l: BattleLog) => l.entries.filter((e) => / took \d+ damage/.test(e.text)).slice(-5).map((e) => e.side);
    expect(hits(mine).length).toBeGreaterThan(0);
    expect(hits(theirs)).toEqual(hits(mine).map((x) => (x === 0 ? 1 : 0)));
    a.lastBattle = mine; d.lastBattle = theirs;
    const back = JSON.parse(JSON.stringify(newMatch([a, d])));
    expect(back.players.map((p: typeof a) => migrate(p)!.lastBattle)).toEqual([mine, theirs]);
  });
  it('keeps only the latest lines of a marathon', () => {
    const l: BattleLog = { title: '', turn: 1, entries: [] };
    for (let i = 0; i < BATTLE_LOG_MAX + 20; i++) addLine(l, { round: i, text: `${i}` });
    expect(l.entries).toHaveLength(BATTLE_LOG_MAX);
    expect(l.entries[BATTLE_LOG_MAX - 1].round).toBe(BATTLE_LOG_MAX + 19);
  });
});

describe('two-player duels', () => {
  const duel = () => {
    const me = createCreature('puddlit', 5), foe = createCreature('zapup', 5), bench = createCreature('pebbark', 5);
    me.vitality = 9; foe.vitality = 9;
    return createBattle(side('player', [me]), { kind: 'trainer', name: 'Kai', team: [foe, bench], active: 0, mods: {} }, WEATHER.clear);
  };
  it('the defender’s chosen action is used instead of the AI’s', () => {
    for (let i = 0; i < 10; i++) {
      const b = duel();
      const ev = resolveRound(b, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'move', move: CATCH_BREATH.id });
      expect(ev.some((e) => e.t === 'use' && e.side === 1 && e.move === CATCH_BREATH.id)).toBe(true);
    }
  });
  it('an illegal pick falls back to the AI; swaps open up from round 2', () => {
    const b = duel();
    expect(foeOptions(b).swaps).toEqual([]); // no swapping in round 1
    const ev = resolveRound(b, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'move', move: 'not-a-move' });
    expect(ev.some((e) => e.t === 'use' && e.side === 1)).toBe(true);
    const o = foeOptions(b);
    expect(o.moves).toEqual(activeOf(b.sides[1]).playbook);
    expect(o.swaps.map((x) => x.name)).toContain('Pebbark');
    const ev2 = resolveRound(b, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'swap', to: o.swaps[0].i });
    expect(ev2.some((e) => e.t === 'send' && e.side === 1)).toBe(true);
  });
  it('the defender can choose who leads, and sees what each swap would do', () => {
    const b = duel();
    chooseLead(b, 1, 1);
    expect(activeOf(b.sides[1]).species).toBe('pebbark');
    expect(b.foeParticipants).toEqual([b.sides[1].team[1].uid]); // the default lead never took the field
    expect(b.seenFoes).toEqual(['pebbark']);
    resolveRound(b, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'move', move: CATCH_BREATH.id });
    chooseLead(b, 0, 1); // too late
    expect(b.sides[1].active).toBe(1);
    const o = JSON.parse(JSON.stringify(foeOptions(b))) as ReturnType<typeof foeOptions>; // as sent online
    const [a, p] = [b.sides[1].team[0], b.sides[1].team[1]];
    expect(o.swaps).toHaveLength(1);
    expect(o.swaps[0].row).toMatchObject({ move: swapMoveOf(a, p).id, c: { uid: a.uid }, partner: { uid: p.uid } });
    expect(o.swaps[0].row.effect).toBe(swapPreview(b, 1, 0).effect);
  });
  it('after a KO the defender picks the replacement (or the next in line goes in)', () => {
    const koed = () => {
      for (let i = 0; i < 500; i++) {
        const me = createCreature('puddlit', 9), foe = createCreature('zapup', 3);
        const b = createBattle(side('player', [me]), { kind: 'trainer', name: 'Kai', team: [foe, createCreature('pebbark', 3), createCreature('cindercub', 3)], active: 0, mods: {} }, WEATHER.clear);
        b.foeChooses = true;
        foe.health = 1; foe.vitality = 0;
        const ev = resolveRound(b, { kind: 'move', move: me.playbook[0] }, { kind: 'move', move: CATCH_BREATH.id });
        if (b.foeNeedSwap) { expect(ev.some((e) => e.t === 'send' && e.side === 1)).toBe(false); return b; }
      }
      throw new Error('no KO');
    };
    const b = koed();
    expect(foeReplacements(b)).toEqual([1, 2]);
    const ev = foeSendIn(b, 2);
    expect(ev[0]).toMatchObject({ t: 'send', side: 1, idx: 2 });
    expect(b.sides[1].active).toBe(2);
    expect(b.foeNeedSwap).toBe(false);
    expect(b.foeParticipants).toContain(b.sides[1].team[2].uid);
    // an illegal pick (the knocked-out creature) sends the next in line; so does skipping the pick
    const b2 = koed();
    foeSendIn(b2, 0);
    expect(b2.sides[1].active).toBe(1);
    const b3 = koed();
    const ev3 = resolveRound(b3, { kind: 'move', move: CATCH_BREATH.id });
    expect(ev3[0]).toMatchObject({ t: 'send', side: 1, idx: 1 });
  });
});

describe('Keen Nose', () => {
  it('turns an item find into a choice of three different finds; the pick goes in the bag', () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    const sniffer = createCreature('fizzlet', 3); // Keen Nose
    s.roster.push(sniffer); s.following = sniffer.uid;
    s.location = MAP_NODES.find((n) => n.kind === 'wild' && n.biome === 'forest')!.id;
    let out: ReturnType<typeof W.reexplore> = null;
    for (let i = 0; i < 300; i++) { s.initiative = 5; out = W.reexplore(s); if (out?.t === 'itemChoice') break; }
    expect(out?.t).toBe('itemChoice');
    if (out?.t !== 'itemChoice') return;
    expect(out.options.length).toBe(3);
    const keys = out.options.map((f) => JSON.stringify([f.items, f.coins]));
    expect(new Set(keys).size).toBe(3);
    const before = JSON.stringify(s.inventory);
    const pickIt = out.options.find((f) => f.items.length) ?? out.options[0];
    W.claimFind(s, pickIt);
    expect(JSON.stringify(s.inventory)).not.toBe(before);
  });
  it('without Keen Nose, finds go straight into the bag', () => {
    const s = newGame('T', 'balanced', 'thunder', 'cindercub', '#fff'); // Forager
    s.location = MAP_NODES.find((n) => n.kind === 'wild')!.id;
    for (let i = 0; i < 200; i++) { s.initiative = 5; const o = W.reexplore(s); expect(o?.t).not.toBe('itemChoice'); }
  });
});

describe('trainer styles', () => {
  const g = (style: Parameters<typeof newGame>[1]) => {
    const s = newGame('T', style, 'thunder', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 3), createCreature('pebbark', 3));
    return s;
  };
  it('there are eight styles, each with a perk and a drawback', () => {
    expect(TRAINER_STYLES.length).toBe(8);
    for (const st of TRAINER_STYLES) { expect(st.perk.length).toBeGreaterThan(0); expect(st.drawback.length).toBeGreaterThan(0); }
  });
  it('Wanderer gets the doubled home Chanko Nabe at any city stable', () => {
    const s = g('balanced');
    expect(W.rest(s, 'aurora').advanced).toBe(true);
    expect(W.rest(g('urban'), 'aurora').advanced).toBe(false);
  });
  it('Merchant: 25% off, and 25% more of every coin earned (at least +1); −1 to recruit', () => {
    const s = g('haggler'), base = g('balanced');
    expect(s.coins).toBe(base.coins);
    expect(earnCoins(s, 1)).toBe(2);
    expect(earnCoins(s, 8)).toBe(10);
    expect(earnCoins(base, 8)).toBe(8);
    expect(W.priceOf(s, 'elixir')).toBe(Math.ceil(ITEMS.elixir.price * 0.75));
    expect(W.styleRecruitMod(s)).toBe(-1);
    expect(W.styleRecruitMod(g('whisperer'))).toBe(1);
  });
  it('Beast Whisperer: trainer prizes halved, Arbiters pay in full', () => {
    const mk = (style: Parameters<typeof newGame>[1], kind: 'trainer' | 'arbiter') => {
      const s = g(style);
      const b = createBattle(W.playerSide(s), { kind, name: 'X', team: [createCreature('zapup', 4)], active: 0, mods: {} }, WEATHER.clear);
      b.over = 'win';
      return W.finishBattle(s, b, { kind, city: 'thunder' }).coins;
    };
    expect(mk('whisperer', 'arbiter')).toBe(10); // 10 × Tier 1
    for (let i = 0; i < 20; i++) expect(mk('whisperer', 'trainer')).toBeLessThanOrEqual(Math.max(1, Math.floor((6 + 2) / 2)));
  });
  it('Battle Master +2 and Caretaker −1 battle XP per creature (never below 1)', () => {
    expect(W.playerSide(g('drill')).xpBonus).toBe(2);
    expect(W.playerSide(g('caretaker')).xpBonus).toBe(-1);
    expect(W.playerSide(g('balanced')).xpBonus).toBe(0);
  });
  it('Caretaker camps two creatures per Initiative; Pathfinder moves free once but pays more for stables', () => {
    const s = g('caretaker');
    for (const c of s.roster) c.vitality = 1;
    s.initiative = 1;
    expect(W.campTargets(s).length).toBe(2);
    const p = g('pathfinder');
    expect(W.moveCost(p)).toBe(0);
    p.flags.firstMoveUsed = true;
    expect(W.moveCost(p)).toBe(1);
    expect(W.stableCost(p)).toBe(W.cityActionCost(p) + 1);
  });
  it('Battle Master totems lose Morale every 5 turns', () => {
    const s = g('drill');
    const c = s.roster.pop()!; s.reserve.push(c); c.morale = 6;
    s.turn = 5;
    W.moraleAndLoyalty(s, { weatherRoll: 0, seasonChanged: false, left: [], warned: [], checks: [], legendsReturned: [], trainingDone: [] });
    expect(c.morale).toBe(5);
  });
});

describe('Battle School', () => {
  const game = () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 1));
    s.location = 'valor'; s.coins = 50;
    return s;
  };
  it('Valor Ridge is a reachable town with a Battle School', () => {
    expect(TOWNS.valor.special).toBe('school');
    expect(neighbors('valor').length).toBeGreaterThanOrEqual(2);
    expect(landmassOf('valor')).toContain('stadium');
  });
  it('coins become XP, over half as many turns, and the creature leaves the team meanwhile', () => {
    const s = game();
    const c = s.roster[1];
    const t = W.enrollTraining(s, c.uid, 20)!;
    expect([t.xp, t.turns, s.coins]).toEqual([20, 10, 30]);
    expect(s.roster).not.toContain(c);
    expect(W.trainingTurns(7)).toBe(4);
    s.turn += 4;
    expect(W.trainingProgress(s, t)).toMatchObject({ elapsed: 4, xp: 8, done: false });
    s.turn += 20;
    expect(W.trainingProgress(s, t)).toMatchObject({ elapsed: 10, xp: 20, done: true });
  });
  it('the end of the turn that finishes the course sends one notification', () => {
    const s = game();
    const t = W.enrollTraining(s, s.roster[1].uid, 4)!; // 2 turns
    expect(W.endTurn(s).trainingDone).toEqual([]);
    expect(W.endTurn(s).trainingDone).toEqual([{ name: nameOf(t.creature), school: 'Valor Ridge' }]);
    expect(W.endTurn(s).trainingDone).toEqual([]);
  });
  it('picking up grants the XP earned so far (early pick-ups too) and rolls the creature’s mood', () => {
    for (let trial = 0; trial < 30; trial++) {
      const s = game();
      const c = s.roster[1];
      c.morale = 5; c.loyalty = 4;
      W.enrollTraining(s, c.uid, 20);
      s.turn += 5; // half-way
      const r = W.pickUpTraining(s, c.uid)!;
      expect(r.xp).toBe(10);
      expect(c.level).toBe(2);
      expect(c.points).toBe(1); // a node to unlock on its chart
      expect([...s.roster, ...s.reserve]).toContain(c);
      expect(s.training).toEqual([]);
      const want = r.roll <= 2 ? [3, 3] : r.roll >= 5 ? [7, 5] : [5, 4];
      expect([c.morale, c.loyalty]).toEqual(want);
    }
  });
  it('can only collect where it trains, and can’t send away your only creature or overspend', () => {
    const s = game();
    const c = s.roster[1];
    expect(W.enrollBlock(s, c.uid, 999)).not.toBeNull();
    W.enrollTraining(s, c.uid, 10);
    expect(W.enrollBlock(s, s.roster[0].uid, 10)).not.toBeNull(); // the last one left
    s.location = 'mistfall';
    expect(W.pickUpTraining(s, c.uid)).toBeNull();
  });
  it('retraining changes Nature, Ability and Instinct for coins each, overnight, and costs Loyalty', () => {
    const s = game();
    const c = s.roster[1];
    c.loyalty = 5; c.perks = 1;
    const nature = NATURES.find((n) => n.id !== c.nature)!.id;
    const ability = Object.keys(ABILITIES).find((a) => a !== speciesOf(c).ability)!;
    const instinct = INSTINCTS.find((i) => i.id !== speciesOf(c).instinct)!.id;
    s.turn = 3; // a day turn: ready on the next morning, turn 5
    const t = W.enrollRetraining(s, c.uid, { nature, ability, instinct })!;
    expect(s.coins).toBe(50 - W.RETRAIN_COST.nature - W.RETRAIN_COST.ability - W.RETRAIN_COST.instinct);
    expect(s.roster).not.toContain(c);
    expect(t.turns).toBe(2);
    expect(W.pickUpTraining(s, c.uid)).toBeNull(); // not until the morning
    s.turn = 4;
    expect(W.pickUpTraining(s, c.uid)).toBeNull();
    s.turn = 5;
    const r = W.pickUpTraining(s, c.uid)!;
    expect(r.retrained).toMatch(/Nature: .* → /);
    expect([c.nature, abilityOf(c), instinctIdOf(c), c.ability, c.instinct]).toEqual([nature, ability, instinct, ability, instinct]);
    expect(c.loyalty).toBe(5 - 3 * W.RETRAIN_LOYALTY);
    expect(c.perks).toBe(1); // keeps the number of perks unlocked
    expect(c.xp).toBe(0);
    expect([...s.roster, ...s.reserve]).toContain(c);
    // the battle uses its own Instinct now
    const bt = createBattle(side('player', [c]), side('wild', [createCreature('zapup', 1)]), WEATHER.clear);
    expect(instinctOf(activeOf(bt.sides[0]))?.id).toBe(instinct);
  });
  it('retraining is ready the next morning, and rejects no change, the same thing again, or too few coins', () => {
    expect([W.nextMorning(3), W.nextMorning(4), W.nextMorning(1)]).toEqual([5, 5, 3]);
    const s = game();
    const c = s.roster[1];
    expect(W.retrainBlock(s, c.uid, {})).toMatch(/Choose/);
    expect(W.retrainBlock(s, c.uid, { nature: c.nature })).toMatch(/already has that Nature/);
    expect(W.retrainBlock(s, c.uid, { ability: abilityOf(c) })).toMatch(/already has that Ability/);
    s.coins = 3;
    expect(W.retrainBlock(s, c.uid, { instinct: INSTINCTS.find((i) => i.id !== instinctIdOf(c))!.id })).toMatch(/coins/);
    s.coins = 50; s.location = 'mistfall';
    expect(W.retrainBlock(s, c.uid, { nature: NATURES.find((n) => n.id !== c.nature)!.id })).toMatch(/Battle School/);
    // the end of the night tells you it's ready
    s.location = 'valor'; s.turn = 4;
    W.enrollRetraining(s, c.uid, { nature: NATURES.find((n) => n.id !== c.nature)!.id });
    expect(W.endTurn(s).trainingDone).toEqual([{ name: nameOf(c), school: 'Valor Ridge', retrain: true }]);
  });
  it('choosing its species’ own Ability or Instinct again clears the override', () => {
    const c = createCreature('puddlit', 3);
    c.instinct = 'menace';
    W.applyRetrain(c, { instinct: speciesOf(c).instinct });
    expect('instinct' in c).toBe(false);
    expect(instinctIdOf(c)).toBe(speciesOf(c).instinct);
  });
});

describe('camping', () => {
  it('tends one creature per Initiative left, most wounded first', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 5), createCreature('pebbark', 5));
    const [a, b, c] = s.roster;
    a.vitality = maxVitality(a) - 1; b.vitality = maxVitality(b) - 2; c.vitality = maxVitality(c); c.fatigue = 2;
    s.initiative = 2;
    expect(W.campTargets(s)).toEqual([b, a]);
    W.endTurn(s, true);
    expect(b.vitality).toBe(maxVitality(b));
    expect(a.vitality).toBe(maxVitality(a));
    expect(c.fatigue).toBe(2); // out of Initiative
  });
  it('tends the creatures the trainer picks, skipping KO’d and rested ones, up to the Initiative left', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 5), createCreature('pebbark', 5), createCreature('rivetail', 5));
    const [a, b, c, d] = s.roster;
    a.vitality = 1; b.vitality = 1; c.ko = true; c.vitality = 0; // d is fully rested
    s.initiative = 1;
    expect(W.campTargets(s, [c.uid, d.uid, b.uid, a.uid])).toEqual([b]);
    W.endTurn(s, [c.uid, d.uid, b.uid, a.uid]);
    expect(b.vitality).toBe(maxVitality(b));
    expect(a.vitality).toBe(1);
    expect(c.vitality).toBe(0);
    expect(s.initiative).toBe(5); // new turn
  });
  it('heals nobody with no Initiative left', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    const a = s.roster[0];
    a.vitality = 1; s.initiative = 0;
    expect(W.campTargets(s)).toEqual([]);
    W.endTurn(s, true);
    expect(a.vitality).toBe(1);
  });
});

describe('recommended playbooks', () => {
  it('stars the goal that matches the creature’s stats', () => {
    const c = createCreature('ph-fire-water-apex-3', 10);
    c.bonus.power = 6; c.bonus.focus = 0;
    expect(suggestGoal(c).goal.kind).toBe('physical');
    c.bonus.power = 0; c.bonus.focus = 6;
    expect(suggestGoal(c).goal.kind).toBe('elemental');
    c.bonus.focus = stats(c).power - stats(c).focus + (c.bonus.focus ?? 0); // even them out
    expect(suggestGoal(c).goal.kind).toBe('balanced');
  });
  it('every goal returns up to 4 learnable moves that fit the creature’s energy', () => {
    for (const id of ['puddlit', 'ph-fire-water-apex-3', 'ph-astral-charm-prime-2', 'pebbark']) {
      const c = createCreature(id, 8);
      for (const goal of [{ kind: 'physical' }, { kind: 'elemental' }, { kind: 'balanced' }, ...TYPES.map((t) => ({ kind: 'vs', type: t }))] as Parameters<typeof recommendPlaybook>[1][]) {
        const ids = recommendPlaybook(c, goal);
        expect(ids.length).toBeGreaterThan(0);
        expect(ids.length).toBeLessThanOrEqual(4);
        expect(fits(energy(c), ids)).toBe(true);
        for (const m of ids) expect(learnable(c)).toContain(m);
      }
    }
  });
  it('physical and elemental goals lean the right way, and type goals skip resisted attacks', () => {
    const c = createCreature('ph-fire-water-apex-3', 10);
    c.bonus.power = 8; c.bonus.focus = 0;
    const phys = recommendPlaybook(c, { kind: 'physical' }).map((id) => MOVE_BY_ID[id]);
    expect(phys.filter((m) => m.kind === 'physical').length).toBeGreaterThanOrEqual(2);
    c.bonus.power = 0; c.bonus.focus = 8;
    const elem = recommendPlaybook(c, { kind: 'elemental' }).map((id) => MOVE_BY_ID[id]);
    expect(elem.filter((m) => m.kind === 'elemental').length).toBeGreaterThanOrEqual(2);
    // Fire is resisted by Water: against Water, a Fire/Water creature should lean on Water attacks
    const vsWater = recommendPlaybook(c, { kind: 'vs', type: 'water' }).map((id) => MOVE_BY_ID[id]);
    expect(vsWater.some((m) => m.kind === 'elemental' && m.type === 'fire')).toBe(false);
    expect(expectedDamage(c, MOVE_BY_ID['ember'], 'grass')).toBeGreaterThan(expectedDamage(c, MOVE_BY_ID['ember'], 'water'));
  });
});

describe('signature move previews', () => {
  it('the Signature Move node says what it teaches and how hard it hits', () => {
    const c = createCreature('puddlit', 1);
    const node = progressionTree(c).find((n) => n.kind === 'signature')!;
    expect(node.text).toContain('Riptide');
    expect(node.text).toContain('d8 Water attack');
    expect(learnable(c)).not.toContain('sig-riptide'); // still locked until the node is bought
  });
});

describe('attack grid', () => {
  it('has an elemental attack for every typed cost of 1–5 and every type that could lead it', () => {
    expect(ATTACK_SLOTS.length).toBe(8 * 5 + 28 * 12);
    const attacks = MOVES.filter((m) => m.kind === 'elemental' && !m.blitz && !m.id.startsWith('sig-'));
    for (const slot of ATTACK_SLOTS) {
      const total = Object.values(slot.cost).reduce<number>((a, v) => a + (v ?? 0), 0);
      expect(total).toBeLessThanOrEqual(5);
      const hits = attacks.filter((m) => costKey(m.cost) === costKey(slot.cost) && m.type === slot.type);
      expect(hits.length, slotKey(slot.cost, slot.type)).toBe(1);
      // the hit type is never the smaller share of the cost
      for (const [k, v] of Object.entries(slot.cost)) expect(slot.cost[slot.type]!, k).toBeGreaterThanOrEqual(v!);
    }
  });
  it('gives late attacks an identity: no two of a cost are alike, and every type has its own style', () => {
    const typed = (m: (typeof MOVES)[number]) => TYPES.reduce((a, x) => a + (m.cost[x] ?? 0), 0);
    const numbers = (m: (typeof MOVES)[number]) => JSON.stringify([m.dmgDie, m.extraDice, m.dmgFlat, m.accuracy, m.speed, m.effort, m.critRange, m.cascade, m.potency, m.purge, m.zeroIn, m.effect]);
    const made = MOVES.filter((m) => m.placeholder);
    const of = (n: number) => made.filter((m) => typed(m) === n);
    expect(of(5).length).toBe(120);
    expect(new Set(of(5).map(numbers)).size).toBe(120);
    expect(of(4).length - new Set(of(4).map(numbers)).size).toBeLessThan(3);
    // a mirrored pair: lightning on steel, and steel on lightning
    const find = (a: string, n: number, b: string, k: number) => MOVES.find((m) => m.type === a && m.cost[a as 'fire'] === n && m.cost[b as 'fire'] === k)!;
    const volt = find('electric', 4, 'steel', 1), iron = find('steel', 4, 'electric', 1);
    expect([critFaces(volt), critFaces(iron)]).toEqual([2, 0]);
    expect(volt.speed).toBeGreaterThan(iron.speed);
    expect(iron.dmgFlat).toBeGreaterThan(volt.dmgFlat);
    expect(iron.effect?.foe?.ward).toBe(-1);
    // each type's biggest attacks show its style
    const big = (x: string) => of(5).filter((m) => m.type === x && m.cost[x as 'fire']! >= 4);
    const style: Record<string, (m: (typeof MOVES)[number]) => unknown> = {
      astral: (m) => m.cascade, charm: (m) => m.accuracy === 'sure', electric: (m) => critFaces(m) >= 2 && m.speed > 0, fire: (m) => (m.potency ?? 0) >= 3 && m.effort >= 4,
      grass: (m) => (m.effect?.heal ?? 0) >= 3, rock: (m) => m.accuracy === 8 && m.speed <= -2, steel: (m) => (m.effect?.foe?.ward ?? 0) < 0 && m.dmgDie <= 6, water: (m) => m.zeroIn === 3,
    };
    for (const x of TYPES) { expect(big(x).length, x).toBe(8); for (const m of big(x)) expect(style[x](m) || (x === 'water' && m.zeroIn === 0), m.name).toBeTruthy(); }
    // and they're fair: worth about the same for their cost
    const sums = { avgRoll, statusChance };
    const plain = (n: number) => attackWorth({ id: '', name: '', kind: 'elemental', cost: {}, accuracy: 6, ...BY_TOTAL[n], text: '' }, n, sums);
    for (const n of [2, 3, 4]) expect(targetWorth(n, false, sums), `${n}`).toBeCloseTo(plain(n)); // the yardstick: a plain attack
    expect(targetWorth(5, false, sums) / plain(5)).toBeLessThan(1.25);
    for (const m of made.filter((x) => typed(x) > 1)) {
      const r = attackWorth(m, typed(m), sums) / targetWorth(typed(m), TYPES.filter((x) => m.cost[x]).length > 1, sums);
      expect(r, m.name).toBeGreaterThan(0.88); expect(r, m.name).toBeLessThan(1.16);
      expect(m.zeroIn ?? 1, m.name).toBeLessThanOrEqual(3);
    }
  });
  it('Blitzes are Fire attacks thrown with Power', () => {
    const blitzes = MOVES.filter((m) => m.blitz);
    expect(blitzes.map((m) => m.id)).toEqual(['kindle-blitz', 'firestorm-blitz', 'sig-backdraft']);
    for (const m of blitzes) { expect([m.kind, m.type, m.status], m.id).toEqual(['elemental', 'fire', 'burn']); expect(m.text).toMatch(/Blitz: Adds Power instead of Focus/); expect(attackStat(m)).toBe('power'); }
    expect(MOVE_BY_ID['sig-backdraft'].potency).toBe(2);
    expect(attackStat(MOVE_BY_ID.ember)).toBe('focus'); expect(attackStat(MOVE_BY_ID.claw)).toBe('power');
    expect(Object.values(RETIRED_MOVES).some((id) => MOVE_BY_ID[id].blitz)).toBe(false); // extras: the grid is as it was
    const me = createCreature('cindercub', 9), foe = createCreature('sproutle', 9);
    me.playbook = ['firestorm-blitz']; foe.playbook = ['tackle'];
    const st = stats(me);
    expect(st.power).not.toBe(st.focus);
    let seen = false;
    for (let i = 0; i < 60; i++) {
      me.health = foe.health = 999; me.fatigue = 0; me.stamina = 99;
      const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
      bt.sides[0].mods.power = 2; bt.sides[0].mods.focus = -1; bt.sides[0].mods.speed = 20;
      const hit = resolveRound(bt, { kind: 'move', move: 'firestorm-blitz' }).find((e) => e.t === 'damage' && e.side === 1 && e.calc);
      if (hit?.t !== 'damage' || !hit.calc) continue;
      seen = true;
      expect(hit.calc.parts.find((p) => p.label === 'Power')?.value).toBe(st.power + 2);
      expect(hit.calc.parts.some((p) => p.label === 'Focus')).toBe(false);
      expect(hit.calc.parts.find((p) => /Ward/.test(p.label))?.value).toBe(-stats(foe).ward); // still Ward
      expect(hit.calc.mult).toBe(2); // and the type chart
    }
    expect(seen).toBe(true);
    const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
    expect(movePreview(bt, 'firestorm-blitz').some((s) => /add your Power and subtract the foe’s Ward \(a Blitz\)/.test(s.text))).toBe(true);
    // playbooks see it: a creature with far more Power than Focus rates it above the same attack thrown with Focus
    const m = MOVE_BY_ID['firestorm-blitz'], f = { armor: 4, ward: 4 };
    me.bonus.power = 6;
    expect(moveWorth(me, m, f)).toBeGreaterThan(moveWorth(me, { ...m, blitz: undefined }, f) + 2);
    expect(expectedDamage(me, m)).toBeGreaterThan(expectedDamage(me, { ...m, blitz: undefined }) + 2);
    // signatures: some Fire families' own
    expect(SPECIES_BY_ID['ph-fire-rock-common-1'].signature).toBe('sig-backdraft');
    expect(SPECIES_BY_ID['ph-fire-water-common-1'].signature).toBe('sig-caldera');
    expect(SPECIES_BY_ID.cindercub.signature).toBe('sig-caldera');
  });
  it('lets elemental attacks crit and Cascade when they say so', () => {
    const sure = MOVES.filter((m) => m.kind === 'elemental' && m.accuracy === 'sure');
    expect(sure.length).toBeGreaterThan(3);
    for (const m of sure) expect(critFaces(m), m.name).toBe(0);
    const c = MOVES.find((m) => m.placeholder && m.type === 'astral' && m.cascade === true && m.dmgDie === 8)!;
    expect(cascadeDie(c, 8)).toBe(8);
    expect(avgRoll(c)).toBeGreaterThan(4.5 + c.dmgFlat);
    expect(c.text).toMatch(/Cascade/);
    const v = MOVES.find((m) => m.kind === 'elemental' && critFaces(m) === 2)!;
    expect(v.text).toMatch(/Wide crits: an accuracy roll of 5–6 crits/);
    expect(MOVE_BY_ID.thunderclap.text).toMatch(/An accuracy roll of 6 crits/);
    // in battle
    const me = createCreature('zapup', 9), foe = createCreature('sproutle', 9);
    me.playbook = ['thunderclap']; foe.playbook = ['tackle'];
    let crits = 0;
    for (let i = 0; i < 200; i++) {
      me.health = foe.health = 999; me.ko = foe.ko = false; me.fatigue = 0; me.stamina = 99;
      const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
      const ev = resolveRound(bt, { kind: 'move', move: 'thunderclap' });
      for (const e of ev) if (e.t === 'roll' && e.side === 0 && e.label === 'Accuracy') { expect(e.crit).toBe(e.hit && (e.natural ?? 0) >= 6); if (e.crit) crits++; }
    }
    expect(crits).toBeGreaterThan(8);
  });
  it('even splits get one attack per type, so 2 Fire + 2 Grass hits as Fire and as Grass', () => {
    const twoTwo = MOVES.filter((m) => m.cost.fire === 2 && m.cost.grass === 2);
    expect(twoTwo.map((m) => m.type).sort()).toEqual(['fire', 'grass']);
    const oneOne = MOVES.filter((m) => m.cost.water === 1 && m.cost.rock === 1 && Object.keys(m.cost).length === 2);
    expect(oneOne.map((m) => m.type).sort()).toEqual(['rock', 'water']);
  });
  it('every type leads the same number of attacks', () => {
    const attacks = MOVES.filter((m) => m.kind === 'elemental' && !m.blitz && !m.id.startsWith('sig-'));
    for (const t of TYPES) expect(attacks.filter((m) => m.type === t).length, t).toBe(5 + 6 * 7);
  });
  it('move texts spell out every effect number and never say "Placeholder"', () => {
    const label = (k: string) => k[0].toUpperCase() + k.slice(1);
    for (const m of MOVES) {
      expect(m.text, m.id).not.toMatch(/placeholder/i);
      for (const side of [m.effect?.self, m.effect?.foe]) for (const [k, v] of Object.entries(side ?? {})) {
        expect(m.text, m.id).toContain(`${v! > 0 ? '+' : '−'}${Math.abs(v!)} ${label(k)}`);
      }
      if (m.effect?.heal) expect(m.text, m.id).toContain(`heal ${m.effect.heal} Health`);
    }
  });
  it('dual attacks hit as the type they spend more of, and every move name is unique', () => {
    const fireWater = MOVES.find((m) => m.placeholder && m.cost.fire === 1 && m.cost.water === 3)!;
    expect(fireWater.type).toBe('water');
    expect(fireWater.status).toBe('soak');
    expect(new Set(MOVES.map((m) => m.name)).size).toBe(MOVES.length);
  });
  it('a dual-type creature can learn its pair attacks, and a single-type one cannot', () => {
    const fw = SPECIES.find((x) => x.placeholder && x.types.join() === 'fire,water' && x.stage === 3 && x.rarity === 'apex')!;
    const c = createCreature(fw.id, 12);
    const pairMoves = learnable(c).filter((id) => MOVE_BY_ID[id].cost.fire && MOVE_BY_ID[id].cost.water);
    expect(pairMoves.length).toBeGreaterThan(0);
    const mono = createCreature('cindercub', 12);
    expect(learnable(mono).some((id) => MOVE_BY_ID[id].cost.water && MOVE_BY_ID[id].cost.fire)).toBe(false);
  });
});

describe('roster table', () => {
  it('has one slot per type and dual-type combination', () => {
    expect(TYPE_COMBOS.length).toBe(36);
    expect(new Set(TYPE_COMBOS.map((c) => [...c].sort().join('+'))).size).toBe(36);
    expect(ROSTER.length).toBe(36);
    // each type leads 3 or 4 of its dual pairs
    for (const t of TYPES) expect([3, 4]).toContain(TYPE_COMBOS.filter((c) => c.length === 2 && c[0] === t).length);
  });
  it('every slot has Common, Prime and Apex three-stage families and a Legendary of its types', () => {
    for (const slot of ROSTER) {
      for (const r of FAMILY_RARITIES) {
        const fam = slot[r].map((id) => SPECIES_BY_ID[id]);
        fam.forEach((sp, i) => {
          expect(sp, slot[r][i]).toBeDefined();
          expect(sp.stage).toBe(i + 1);
          expect(sp.evolvesTo).toBe(fam[i + 1]?.id);
          if (sp.placeholder) { expect(sp.rarity).toBe(r); expect(sp.types).toEqual(slot.types); }
        });
        expect([...fam[0].types].sort()).toEqual([...slot.types].sort()); // stage 1 carries the slot's types
      }
      const leg = SPECIES_BY_ID[slot.legendary];
      expect(leg.rarity).toBe('legendary');
      expect([...leg.types].sort()).toEqual([...slot.types].sort());
    }
  });
  it('placeholders are flagged, uniquely named and turn up in the wild', () => {
    const ph = SPECIES.filter((x) => x.placeholder);
    // every family slot and Legendary slot, minus the hand-made families and Legendaries filling them
    expect(ph.length).toBe(36 * 3 * 3 - Object.keys(HANDMADE_SLOTS).length * 3 + 36 - Object.keys(HANDMADE_LEGENDARIES).length + EXTRA_FAMILIES.length * 3);
    expect(new Set(SPECIES.map((x) => x.name.toLowerCase())).size).toBe(SPECIES.length);
    for (const sp of ph.filter((x) => x.rarity !== 'legendary' && x.stage === 1)) expect(W.encounterSpots(sp.id).length, sp.id).toBeGreaterThan(0);
  });
});

describe('Creature Codex', () => {
  it('every species lists at least one place to find it (placeholder Legendaries have no node yet)', () => {
    for (const sp of SPECIES.filter((x) => !(x.placeholder && x.rarity === 'legendary'))) expect(W.encounterSpots(sp.id).length, sp.id).toBeGreaterThan(0);
  });
  it('listed spots really can produce the species', () => {
    for (const sp of SPECIES.filter((x) => x.rarity !== 'legendary')) {
      for (const { node, minStage } of W.encounterSpots(sp.id)) {
        expect((['day', 'night'] as const).some((t) => W.speciesPool(node.biome, sp.types[0], sp.rarity, minStage, t).includes(sp)), `${sp.id} ${node.name}`).toBe(true);
      }
    }
  });
  it('evolution lines run earliest stage first', () => {
    const final = SPECIES.find((x) => x.stage === 3 && SPECIES.some((p) => p.evolvesTo === x.id))!;
    const line = W.evolutionLine(final.id);
    expect(line.map((x) => x.stage)).toEqual([1, 2, 3]);
    expect(line[line.length - 1].id).toBe(final.id);
  });
  it('best offerings match the recruiting bonus', () => {
    const c = createCreature('puddlit', 3);
    for (const o of W.bestOfferings('puddlit')) expect(W.offeringBonus([o.id], c)).toBe(o.bonus);
  });
  it('only trainer creatures that actually take the field join the Codex, and only those can be carved', () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    const ace = createCreature('calderex', 10);
    ace.playbook = ['quick-jab']; // Sure-hit, so every round lands
    // and always first: on a speed tie the foe's Emberfish can win the Clash and knock the ace out
    // with a 4× Water hit before it acts (about 1 run in 1,000), ending the battle early
    ace.bonus.speed = (ace.bonus.speed ?? 0) + 10;
    s.roster = [ace];
    const [first, second, bench] = [createCreature('emberfish', 2), createCreature('pebbark', 2), createCreature('zapup', 2)];
    first.vitality = 0; first.health = 1; // any hit knocks it out; the second stays healthy so it survives its first round
    const b = createBattle(W.playerSide(s), { kind: 'trainer', name: 'Rival', team: [first, second, bench], active: 0, mods: {} }, WEATHER.clear);
    expect(b.seenFoes).toEqual(['emberfish']);

    // play real rounds until the trainer's second creature is sent out
    for (let r = 0; r < 20 && b.seenFoes.length < 2 && !b.over; r++) resolveRound(b, { kind: 'move', move: 'quick-jab' });
    expect(first.ko).toBe(true);
    expect(activeOf(b.sides[1]).species).toBe('pebbark');
    expect(b.seenFoes).toEqual(['emberfish', 'pebbark']);

    // the battle ends before Zapup ever leaves the bench
    W.finishBattle(s, b, { kind: 'trainer' });
    expect(s.dex.seen).toEqual(expect.arrayContaining(['emberfish', 'pebbark']));
    expect(s.dex.seen).not.toContain('zapup');

    s.coins = 99; s.inventory['pine-resin'] = 4;
    expect(W.carveTotem(s, 'effigy', 'zapup', ['pine-resin', 'pine-resin'])).toBeNull();
    expect(W.carveTotem(s, 'effigy', 'pebbark', ['pine-resin', 'pine-resin'])).toBe('effigy:pebbark');
  });
});

describe('progression skill tree', () => {
  it('a finished chart turns spare level-up points into +1 stats (so the ▲ can always be cleared)', () => {
    const c = createCreature('zapup', 1); // pick a final stage below
    let sp = c.species;
    while (SPECIES_BY_ID[sp].evolvesTo) sp = SPECIES_BY_ID[sp].evolvesTo!;
    const apex = createCreature(sp, 1);
    expect(trainStat(apex, 'power')).toBe(false); // not while nodes remain
    apex.points = 30;
    for (let i = 0; i < 30 && !chartComplete(apex); i++) unlockNode(apex, availableNodes(apex)[0].id);
    expect(chartComplete(apex)).toBe(true);
    const left = apex.points, before = stats(apex).power;
    expect(left).toBeGreaterThan(0);
    expect(trainStat(apex, 'power')).toBe(true);
    expect(stats(apex).power).toBe(before + 1);
    expect(apex.points).toBe(left - 1);
    while (apex.points) trainStat(apex, 'vigor');
    expect(trainStat(apex, 'vigor')).toBe(false);
    expect(apex.health).toBe(maxHealth(apex));
  });
  const fresh = (id: string) => { const c = createCreature(id, 1, { auto: false }); c.unlocked = []; c.points = 20; return c; };
  const avail = (c: ReturnType<typeof createCreature>) => availableNodes(c).map((n) => n.id).sort();

  it('every chart is a valid tree: prerequisites exist and sit in earlier rows, one node per cell', () => {
    for (const sp of SPECIES) {
      const tree = progressionTree(fresh(sp.id));
      const byId = new Map(tree.map((n) => [n.id, n]));
      expect(new Set(tree.map((n) => `${n.row},${n.col}`)).size, sp.id).toBe(tree.length);
      for (const n of tree) for (const r of n.requires) {
        expect(byId.has(r), `${sp.id}:${n.id} needs ${r}`).toBe(true);
        expect(byId.get(r)!.row).toBeLessThan(n.row);
      }
      expect(tree.filter((n) => n.requires.length === 0).map((n) => n.id)).toEqual(['a']);
      expect(tree.some((n) => n.kind === (sp.evolvesTo ? 'evolve' : 'capstone')), sp.id).toBe(true);
    }
  });
  it('Sproutle’s chart has no Health, Vitality or Vigor until it evolves', () => {
    const c = createCreature('sproutle', 1);
    c.points = 20;
    const hp = maxHealth(c), vit = maxVitality(c);
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) expect(unlockNode(c, id), id).toBe(true);
    expect([maxHealth(c), maxVitality(c)]).toEqual([hp, vit]);
    expect([c.bonus.armor, c.bonus.ward]).toEqual([1, 1]);
    for (let i = 0; i < 30; i++) { const w = createCreature('sproutle', 14); expect(w.bonus.vigor ?? 0).toBe(0); }
    expect(unlockNode(c, 'evo')).toBe(true);
    expect(c.species).toBe('thornback');
    expect(progressionTree(c).map((n) => n.label)).toContain('+1 Vigor');
  });
  it('charts raise Health only through Vigor: last in a first stage, early after that, twice unless sturdy', () => {
    const vigor = (id: string) => progressionTree(fresh(id)).filter((n) => n.label === '+1 Vigor').map((n) => n.id);
    for (const sp of SPECIES) {
      const want = sp.bulky ? [] : sp.stage === 1 && sp.evolvesTo ? ['h'] : sp.sturdy ? ['c'] : ['c', 'h'];
      expect(vigor(sp.id), sp.id).toEqual(want);
      for (const n of progressionTree(fresh(sp.id))) expect(n.label, sp.id).not.toMatch(/Health|Vitality/);
    }
    const c = fresh('emberfish');
    const before = maxTotal(c);
    for (const id of ['a', 'b', 'c', 'e', 'h']) expect(unlockNode(c, id), id).toBe(true);
    expect([maxTotal(c), totalHealth(c)]).toEqual([before + 5, before + 5]); // a new heart comes full
  });
  it('older saves turn the old Health and Vitality nodes into what they give now', () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.version = 3;
    const c = s.roster[0];
    const oldVigor = stats(c).vigor;
    c.unlocked = ['a', 'b', 'c', 'e', 'h'];
    c.bonus = { health: 1, vitality: 1 } as never;
    c.health = oldVigor + 1; c.vitality = oldVigor + 1; // unhurt under the old rules
    const m = migrate(JSON.parse(JSON.stringify(s)))!;
    const d = m.roster[0];
    expect(m.version).toBe(SAVE_VERSION);
    expect(d.bonus.vigor).toBe(1);
    expect(Object.keys(d.bonus)).not.toContain('health');
    expect(totalHealth(d)).toBe(maxTotal(d));
    expect(maxHearts(d)).toBe(oldVigor + 1);
    // half its hearts gone stays about half
    c.vitality = 2;
    const hurt = migrate(JSON.parse(JSON.stringify(s)))!.roster[0];
    expect(hurt.vitality).toBeLessThan(maxVitality(hurt));
    expect(hurt.ko).toBe(false);
  });
  it('a node needs ALL of its connecting nodes, not just one', () => {
    const c = fresh('emberfish');
    expect(avail(c)).toEqual(['a']);
    unlockNode(c, 'a');
    expect(avail(c)).toEqual(['b', 'c']);
    unlockNode(c, 'b');
    expect(avail(c)).toEqual(['c', 'd']);       // e needs b AND c
    expect(unlockNode(c, 'e')).toBe(false);
    unlockNode(c, 'c');
    expect(avail(c)).toContain('e');
    expect(unlockNode(c, 'evo')).toBe(false);   // evolve needs h, which needs e
    expect(c.species).toBe('emberfish');
  });
  it('side branches are optional for evolving and are left behind', () => {
    const c = fresh('emberfish');
    for (const id of ['a', 'b', 'd', 'g', 'c', 'f', 'i']) expect(unlockNode(c, id), id).toBe(true);
    expect(avail(c)).toEqual(['e']);
    for (const id of ['e', 'h', 'evo']) expect(unlockNode(c, id), id).toBe(true);
    expect(c.species).toBe('cinderkoi');
    expect(c.unlocked).toEqual([]);
  });
  it('the Capstone needs both the Vitality and Stamina branches', () => {
    const finalSp = SPECIES.find((x) => !x.evolvesTo && x.rarity !== 'legendary')!;
    const c = fresh(finalSp.id);
    for (const id of ['a', 'b', 'c', 'e', 'h']) unlockNode(c, id);
    expect(unlockNode(c, 'cap')).toBe(false);
    unlockNode(c, 'f'); unlockNode(c, 'i');
    expect(unlockNode(c, 'cap')).toBe(true);
    expect(c.capstone).toBe(true);
  });
  it('v2 saves keep their bought nodes under the new ids', () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.version = 2;
    s.roster[0].unlocked = ['a', 'b', 'e', 'f', 'g', 'h'];
    const m = migrate(s)!;
    expect(m.version).toBe(SAVE_VERSION);
    expect(m.roster[0].unlocked).toEqual(['a', 'b', 'f', 'g', 'h', 'p']);
  });
});

describe('stables', () => {
  const battered = () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    const c = s.roster[0];
    c.ko = true; c.health = 0; c.vitality = 0; c.fatigue = 2;
    return { s, c };
  };
  it('a town stable fully recovers the team without a Chanko Nabe buff', () => {
    const { s, c } = battered();
    s.location = 'mistfall';
    const r = W.rest(s, 'mistfall');
    expect(c.ko).toBe(false);
    expect(c.vitality).toBe(maxVitality(c));
    expect(c.health).toBe(maxHealth(c));
    expect(c.fatigue).toBe(0);
    expect(s.hotpot).toBeUndefined();
    expect(r.buff).toEqual({});
  });
  it('a city stable recovers the team and serves its Chanko Nabe', () => {
    const { s, c } = battered();
    const r = W.rest(s, 'thunder');
    expect(c.ko).toBe(false);
    expect(s.hotpot?.city).toBe('thunder');
    expect(Object.keys(r.buff).length).toBeGreaterThan(0);
  });
});

describe('turn events', () => {
  const game = () => {
    const s = newGame('T', 'balanced', 'iron', 'puddlit', '#fff');
    s.coins = 50;
    s.roster.push(createCreature('emberfish', 4), createCreature('pebbark', 3));
    s.roster[0].vitality = 1; s.roster[0].fatigue = 1; // so every event is eligible
    return s;
  };

  it('has at least a dozen distinct events', () => {
    expect(E.EVENT_IDS.length).toBeGreaterThanOrEqual(24);
    expect(new Set(E.EVENT_IDS).size).toBe(E.EVENT_IDS.length);
  });
  it('every choice of every event resolves cleanly and clears the event', () => {
    for (const id of E.EVENT_IDS) {
      const probe = game();
      E.rollEvent(probe, id);
      for (const choice of E.eventView(probe)!.choices) {
        const s: typeof probe = JSON.parse(JSON.stringify(probe)); // same rolled event for every choice
        const ch = E.eventView(s)!.choices.find((c) => c.id === choice.id)!;
        const target = ch.pick ? [...s.roster, ...s.reserve].find((c) => !ch.canPick?.(c)) : undefined;
        // a disabled choice (e.g. it needs an item you don't have) can't be taken
        if (ch.disabled) { expect(E.resolveEvent(s, ch.id, target?.uid), `${id}:${ch.id} is disabled`).toBeNull(); continue; }
        // a pick choice nobody on the team can take (e.g. every creature already has that Nature or Ability) is refused too
        if (ch.pick && !target) { expect(E.resolveEvent(s, ch.id), `${id}:${ch.id} has no one to pick`).toBeNull(); continue; }
        const r = E.resolveEvent(s, ch.id, target?.uid);
        expect(r, `${id}:${ch.id}`).not.toBeNull();
        expect(r!.text.length).toBeGreaterThan(0);
        expect(s.event).toBeUndefined();
        expect(s.coins).toBeGreaterThanOrEqual(0);
        expect(s.roster.length).toBeGreaterThan(0);
      }
    }
  });
  it('the gambler pays or takes the stake by the dice', () => {
    for (let i = 0; i < 30; i++) {
      const s = game();
      E.rollEvent(s, 'gambler');
      const r = E.resolveEvent(s, 'bet10')!;
      const [mine, theirs] = r.rolls!;
      expect(s.coins).toBe(50 + (mine > theirs ? 10 : mine < theirs ? -10 : 0));
    }
  });
  it('a squabble moves Morale up for one creature and down for the other', () => {
    const s = game();
    for (const c of s.roster) c.morale = 5;
    E.rollEvent(s, 'squabble');
    const { a, b } = s.event!.data as { a: string; b: string };
    E.resolveEvent(s, 'a');
    expect(s.roster.find((c) => c.uid === a)!.morale).toBe(7);
    expect(s.roster.find((c) => c.uid === b)!.morale).toBe(4);
  });
  it('the Codex scholar adds unseen local species to the Codex', () => {
    const s = game();
    E.rollEvent(s, 'scholar');
    const ids = s.event!.data.species as string[];
    E.resolveEvent(s, 'accept');
    for (const id of ids) expect(s.dex.seen).toContain(id);
  });
  it('a pending event survives a save round-trip', () => {
    const s = game();
    E.rollEvent(s, 'caravan');
    const copy = JSON.parse(JSON.stringify(s));
    expect(E.eventView(copy)?.title).toBe('Merchant Caravan');
  });
  it('never rolls the same event twice in a row', () => {
    const s = game();
    for (let i = 0; i < 40; i++) {
      const prev = s.lastEvent;
      const ev = E.rollEvent(s);
      if (ev) { expect(ev.id).not.toBe(prev); E.resolveEvent(s, E.eventView(s)!.choices.find((c) => !c.disabled && !c.pick)?.id ?? 'decline'); s.event = undefined; }
    }
  });
  it('the trader swaps a creature for one of equal level in the same slot', () => {
    const s = game();
    E.rollEvent(s, 'trader');
    const give = s.roster[1];
    const r = E.resolveEvent(s, 'trade', give.uid)!;
    expect(r.tone).toBe('good');
    expect(s.roster).not.toContain(give);
    expect(s.roster[1].level).toBe(give.level);
    expect(s.roster[1].species).toBe(s.dex.caught[s.dex.caught.length - 1]);
  });
  it('the caretaker changes Nature, and refuses a creature that already has it', () => {
    const s = game();
    E.rollEvent(s, 'caretaker');
    const c = s.roster[0];
    const choice = E.eventView(s)!.choices.find((x) => x.id.startsWith('nature:') && x.id !== `nature:${c.nature}`)!;
    const same = E.eventView(s)!.choices.find((x) => x.id === `nature:${c.nature}`);
    if (same) expect(E.resolveEvent(s, same.id, c.uid)).toBeNull();
    expect(E.resolveEvent(s, choice.id, c.uid)).not.toBeNull();
    expect(c.nature).toBe(choice.id.slice(7));
  });
  it('the Trail Tutor teaches a new Ability, and the Drum Circle wakes a new Instinct', () => {
    const s = game();
    const c = s.roster[0];
    E.rollEvent(s, 'tutor');
    const learn = E.eventView(s)!.choices.find((x) => x.id.startsWith('ability:') && x.id !== `ability:${abilityOf(c)}`)!;
    expect(E.resolveEvent(s, learn.id, c.uid)).not.toBeNull();
    expect(abilityOf(c)).toBe(learn.id.slice(8));
    s.event = undefined;
    E.rollEvent(s, 'drums');
    const view = E.eventView(s)!;
    const same = view.choices.find((x) => x.id === `instinct:${instinctIdOf(c)}`);
    if (same) expect(E.resolveEvent(s, same.id, c.uid)).toBeNull();
    const wake = view.choices.find((x) => x.id.startsWith('instinct:') && x.id !== `instinct:${instinctIdOf(c)}`)!;
    expect(E.resolveEvent(s, wake.id, c.uid)).not.toBeNull();
    expect(instinctIdOf(c)).toBe(wake.id.slice(9));
  });
  it('the trader shows its creature, and the before/after preview is exactly what you get', () => {
    const s = game();
    E.rollEvent(s, 'trader');
    const view = E.eventView(s)!;
    expect(view.showcase?.species).toBe(s.event!.data.species);
    const give = s.roster[1];
    const trade = view.choices.find((x) => x.id === 'trade')!;
    const { after } = trade.preview!(give);
    E.resolveEvent(s, 'trade', give.uid);
    const got = s.roster[1];
    expect(got.uid).not.toBe(after.uid);
    expect(stats(got)).toEqual(stats(after));
    expect([got.species, got.level, got.nature, got.points]).toEqual([after.species, after.level, after.nature, after.points]);
    expect(got.points).toBe(got.level - 1); // chart points left for the player to spend
  });
  it('the caretaker preview shows the new Nature’s stats without changing the creature', () => {
    const s = game();
    E.rollEvent(s, 'caretaker');
    const c = s.roster[0];
    const choice = E.eventView(s)!.choices.find((x) => x.id.startsWith('nature:') && x.id !== `nature:${c.nature}`)!;
    const was = c.nature;
    const { after } = choice.preview!(c);
    expect(c.nature).toBe(was);
    expect(after.nature).toBe(choice.id.slice(7));
    E.resolveEvent(s, choice.id, c.uid);
    expect(stats(c)).toEqual(stats(after));
  });
  it('paid choices are refused when you cannot afford them', () => {
    const s = game();
    s.coins = 0;
    E.rollEvent(s, 'sparring');
    expect(E.eventView(s)!.choices[0].disabled).toBeTruthy();
    expect(E.resolveEvent(s, 'train', s.roster[0].uid)).toBeNull();
    expect(s.event).toBeDefined();
  });
  it('accepting a rival challenge starts a trainer battle', () => {
    const s = game();
    E.rollEvent(s, 'rival');
    const r = E.resolveEvent(s, 'fight')!;
    expect(r.battle?.sides[1].kind).toBe('trainer');
    expect(r.battle!.sides[1].team.length).toBeGreaterThan(0);
  });
});

describe('type matchup for move badges', () => {
  const elemental = (t: string) => MOVES.find((m) => m.kind === 'elemental' && m.type === t)!;
  it('only Elemental attacks use the chart', () => {
    expect(typeMatchup(MOVES.find((m) => m.kind === 'physical')!, ['fire'])).toBeNull();
    expect(typeMatchup(MOVES.find((m) => m.kind === 'support')!, ['fire'])).toBeNull();
  });
  it('matches the battle multipliers: super effective, resisted, 4×, and immune', () => {
    for (const a of TYPES) for (const d of TYPES) {
      expect(typeMatchup(elemental(a), [d])).toBe(effectiveness(a, [d]));
    }
    const [weakA, weakB] = TYPES.filter((d) => STRONG.fire.includes(d));
    expect(typeMatchup(elemental('fire'), [weakA, weakB])).toBe(4);
    const resisters = TYPES.filter((d) => STRONG[d].includes('fire'));
    expect(typeMatchup(elemental('fire'), [resisters[0], resisters[1]])).toBe(0);
  });
});

describe('Fire city and Kilauea island', () => {
  it('every city, Fire included, can be a home and is reachable on foot from the stadium', () => {
    const seen = new Set(['stadium']);
    const q = ['stadium'];
    while (q.length) for (const { node, edge } of neighbors(q.shift()!)) if (!edge.requires && !node.requires && !seen.has(node.id)) { seen.add(node.id); q.push(node.id); }
    for (const id of Object.keys(CITIES)) {
      expect(seen.has(id), id).toBe(true);
      const s = newGame('T', 'balanced', id, 'puddlit', '#fff');
      expect(s.location).toBe(id);
    }
    expect(seen.has('firepit')).toBe(false); // the arena needs the ferry
  });
  it('Amber is challenged at the Fire Pit, not in Kilauea Forge', () => {
    const s = newGame('T', 'balanced', 'kilauea', 'puddlit', '#fff');
    expect(W.arbiterHere(s)).toBeNull();
    s.location = 'firepit';
    expect(W.arbiterHere(s)).toBe('kilauea');
    s.location = 'thunder';
    expect(W.arbiterHere(s)).toBe('thunder');
  });
  it('the ferry from Kilauea Forge needs a Ferry Pass (sold at the Forge)', () => {
    const s = newGame('T', 'balanced', 'kilauea', 'puddlit', '#fff');
    expect(W.canMoveTo(s, 'blackSand').ok).toBe(false);
    expect(W.marketStock('kilauea')).toContain('ferry-pass');
    expect(Object.keys(CITIES).filter((id) => W.marketStock(id).includes('ferry-pass'))).toEqual(['kilauea']); // (not Gloomshade: Dahlia's arena is below it)
    s.inventory['ferry-pass'] = 1;
    expect(W.canMoveTo(s, 'blackSand').ok).toBe(true);
  });
  it('Kilauea island is its own landmass and fits on the terrain', () => {
    const island = landmassOf('firepit').sort();
    expect(island).toContain('blackSand');
    expect(island).not.toContain('kilauea');
    expect(island).not.toContain('mangrove');
    for (const id of island) expect(['blackSand', 'firepit'].includes(id) || ['wild', 'legendary'].includes(NODE_BY_ID[id].kind), id).toBe(true);
    let maxZ = -1e9;
    for (let x = -90 * MAP_SCALE; x <= 90 * MAP_SCALE; x += 2) for (let z = 40 * MAP_SCALE; z <= 110 * MAP_SCALE; z += 1) if (landField(x, z) > 0.05) maxZ = Math.max(maxZ, z);
    expect(maxZ).toBeLessThanOrEqual(100 * MAP_SCALE - 1); // terrain mesh ends at z = 100 × MAP_SCALE
  });
  it('the Fire city has Fire creatures nearby on the mainland', () => {
    const near = neighbors('kilauea').map((x) => x.node).filter((n) => n.kind === 'wild');
    expect(near.some((n) => BIOME_TYPES[n.biome].includes('fire'))).toBe(true);
  });
});

describe('map layout', () => {
  const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
  it('nodes never sit on top of each other', () => {
    for (let i = 0; i < MAP_NODES.length; i++) for (let j = i + 1; j < MAP_NODES.length; j++) {
      expect(dist(MAP_NODES[i], MAP_NODES[j]), `${MAP_NODES[i].name} / ${MAP_NODES[j].name}`).toBeGreaterThanOrEqual(5);
    }
  });
  it('the Kilauea Forge routes are well spaced', () => {
    const area = ['kilauea', 'canyon', ...neighbors('kilauea').map((x) => x.node.id)];
    for (const id of new Set(area.flatMap((a) => [a, ...neighbors(a).map((x) => x.node.id)]))) {
      for (const n of MAP_NODES) if (n.id !== id) expect(dist(NODE_BY_ID[id], n), `${NODE_BY_ID[id].name} / ${n.name}`).toBeGreaterThanOrEqual(7.5);
    }
  });
  it('Legendary spots are spread over the north, centre and south, each holding a real Legendary', () => {
    const spots = MAP_NODES.filter((n) => n.kind === 'legendary');
    for (const n of spots) {
      expect(SPECIES_BY_ID[n.legendary!]?.rarity, n.name).toBe('legendary');
      expect(W.encounterSpots(n.legendary!).map((x) => x.node.id), n.name).toContain(n.id);
    }
    expect(new Set(spots.map((n) => n.legendary)).size).toBe(spots.length); // one of each Legendary
    const stadium = NODE_BY_ID.stadium;
    expect(spots.filter((n) => n.z < stadium.z - 20).length).toBeGreaterThanOrEqual(3); // north
    expect(spots.filter((n) => n.z >= stadium.z - 20).length).toBeGreaterThanOrEqual(4); // centre and south
  });
  it('every route between towns and cities has 3–5 wild nodes', () => {
    const hubKinds = ['city', 'town', 'stadium', 'arena'];
    const hubs = MAP_NODES.filter((n) => hubKinds.includes(n.kind)).map((n) => n.id);
    // walk each route out of each hub, through wild nodes, to the next hub
    for (const start of hubs) {
      for (const first of neighbors(start).filter((x) => x.node.kind === 'wild' && !isCloudNode(x.node.id))) {
        let prev = start, at = first.node.id, count = 0;
        while (NODE_BY_ID[at].kind === 'wild') {
          count++;
          const next = neighbors(at).map((x) => x.node.id).filter((id) => id !== prev);
          if (next.length !== 1) break;
          prev = at; at = next[0];
        }
        if (hubKinds.includes(NODE_BY_ID[at].kind)) expect(count, `${NODE_BY_ID[start].name} → ${NODE_BY_ID[at].name}`).toBeGreaterThanOrEqual(3);
        expect(count, `${NODE_BY_ID[start].name} → ${NODE_BY_ID[at].name}`).toBeLessThanOrEqual(5);
      }
    }
  });
  it('the original wild nodes keep their ids when the map grows (saves stay valid)', () => {
    const original = ['Frostbite Flats', 'Glacier Stair', 'Fogbank Path', 'Fernway', 'Mossy Hollow', 'Rainshadow Glen', 'Shadeway', 'Fallen Giant',
      'Sunbaked Meadow', 'Redrock Pass', 'Mesa Rim', 'Sagebrush Flat', 'Circuit Road', 'Snowmelt River', 'Pine Ridge', 'Bison Meadow', 'Crosswind Road',
      'Willow Lake', 'Static Badlands', 'Sheer Buttes', 'Old Mine Road', 'Ore Cliffs', 'Pebble Beach', 'Lighthouse Point', 'Sawgrass River', 'Heron Slough',
      'Cypress Road', 'Lily Lake', 'Gator Slough', 'Stormchaser Road', 'Whiteout Col', 'Steam Vents', 'Lava Tubes', 'Obsidian Shore', 'Sinkhole Stair',
      'Cinder Barrens', 'Ashfall Ridge', 'Scorched Prairie', 'Glasswind Dunes', 'Smoldering Flats', 'Survey Meadow', 'Tidewater Ford', 'Sparring Slopes', 'Drill Grounds'];
    original.forEach((name, i) => expect(NODE_BY_ID[`w${i + 1}`]?.name).toBe(name));
    expect(MAP_NODES.filter((n) => /^w\d+$/.test(n.id)).length).toBe(original.length);
    expect(MAP_NODES.filter((n) => /^n\d+$/.test(n.id)).length).toBeGreaterThan(40);
    expect(new Set(MAP_NODES.map((n) => n.name)).size).toBe(MAP_NODES.length);
  });
  it('no two routes cross', () => {
    const side = (a: MapNode, b: MapNode, c: MapNode) => Math.sign((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
    for (let i = 0; i < MAP_EDGES.length; i++) for (let j = i + 1; j < MAP_EDGES.length; j++) {
      const e = MAP_EDGES[i], f = MAP_EDGES[j];
      if ([e.a, e.b].some((x) => x === f.a || x === f.b)) continue;
      const [p, q, r, s] = [e.a, e.b, f.a, f.b].map((id) => NODE_BY_ID[id]);
      const crosses = side(p, q, r) * side(p, q, s) < 0 && side(r, s, p) * side(r, s, q) < 0;
      expect(crosses, `${p.name}–${q.name} crosses ${r.name}–${s.name}`).toBe(false);
    }
  });
});

describe('battle XP', () => {
  const totalXp = (c: ReturnType<typeof createCreature>) => c.level * 10 + c.xp;
  const play = (bt: ReturnType<typeof createBattle>, pick: () => Parameters<typeof resolveRound>[1]) => {
    const events: ReturnType<typeof resolveRound> = [];
    for (let r = 0; r < 200 && !bt.over; r++) {
      events.push(...resolveRound(bt, pick()));
      if (bt.needSwap) events.push(...sendIn(bt, bt.sides[0].team.findIndex((c) => !c.ko)));
    }
    return events;
  };

  it('participation XP is 1–5, more against tougher foes', () => {
    expect(participationXp(5, 5)).toBe(3);
    expect(participationXp(2, 20)).toBe(5);
    expect(participationXp(20, 2)).toBe(1);
  });
  it('creatures earn XP for a lost battle, including the ones that were knocked out', () => {
    const me = createCreature('puddlit', 1), mate = createCreature('sproutle', 1);
    const boss = createCreature('calderex', 12);
    const bt = createBattle(side('player', [me, mate]), side('trainer', [boss]), WEATHER.clear);
    bt.participants.push(mate.uid); // both fought
    boss.vitality = 99; // a lucky streak of Lv 1 rolls (or Clash damage) can't topple it, so the loss is certain
    const before = [totalXp(me), totalXp(mate)];
    const ev = play(bt, () => ({ kind: 'move', move: CATCH_BREATH.id }));
    expect(bt.over).toBe('lose');
    expect(me.ko && mate.ko).toBe(true);
    expect(totalXp(me)).toBeGreaterThan(before[0]);
    expect(totalXp(mate)).toBeGreaterThan(before[1]);
    expect(ev.filter((e) => e.t === 'xp' && e.reason === 'battle')).toHaveLength(2);
    expect(ev.some((e) => e.t === 'xp' && e.reason === 'ko')).toBe(false);
  });
  it('the creature that lands a KO gets a bonus on top of participation XP', () => {
    const me = createCreature('calderex', 10);
    me.playbook = ['quick-jab'];
    const foe = createCreature('sproutle', 1);
    foe.vitality = 0; foe.health = 1;
    const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
    const ev = play(bt, () => ({ kind: 'move', move: 'quick-jab' }));
    expect(bt.over).toBe('win');
    const mine = ev.filter((e) => e.t === 'xp' && e.uid === me.uid) as Extract<typeof ev[number], { t: 'xp' }>[];
    expect(mine.map((e) => e.reason).sort()).toEqual(['battle', 'ko']);
    expect(mine.find((e) => e.reason === 'ko')!.foe).toBe('Sproutle');
  });
  it('running away earns no XP', () => {
    const me = createCreature('calderex', 10);
    const bt = createBattle(side('player', [me]), side('wild', [createCreature('sproutle', 1)]), WEATHER.clear);
    const before = totalXp(me);
    const ev = play(bt, () => ({ kind: 'run' }));
    expect(bt.over).toBe('escaped');
    expect(ev.some((e) => e.t === 'xp')).toBe(false);
    expect(totalXp(me)).toBe(before);
  });
});

describe('failed autosaves', () => {
  it('are reported once, can be retried, and a deleted game stays deleted', () => {
    const g = globalThis as unknown as { localStorage?: unknown };
    const prev = g.localStorage, kept = new Map<string, string>(), heard: boolean[] = [];
    let full = true;
    g.localStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { if (full) throw new Error('full'); kept.set(k, v); }, removeItem: (k: string) => void kept.delete(k) };
    onSaveStatus((ok) => heard.push(ok));
    try {
      setActiveMatch(null);
      const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
      save(s); s.coins = 77; save(s);
      expect(heard).toEqual([false]);
      expect(retrySave()).toBe(false);
      full = false;
      expect(retrySave()).toBe(true);
      expect(heard).toEqual([false, true]);
      expect(load()!.coins).toBe(77); // the latest of the failed saves
      full = true; save(s); clearSave(); full = false;
      expect(retrySave()).toBe(true);
      expect(load()).toBe(null);
      expect(heard).toEqual([false, true, false, true]);
    } finally { onSaveStatus(null); g.localStorage = prev; }
  });
});

describe('custom icons', () => {
  it('every icon has its art, and every file in the folder is used', () => {
    const files = readdirSync(new URL('../public/assets/icons', import.meta.url)).map((f) => f.replace('.png', ''));
    expect(files.sort()).toEqual([...ICON_NAMES].sort());
  });
  it('replaces only the meaning it has art for', () => {
    expect(splitIcons('Pay 💰 5')).toEqual(['Pay ', { name: 'coin', emoji: '💰' }, ' 5']);
    expect(splitIcons('No icons here, just ⚡ and ★ rare')).toBe(null);
    expect(splitIcons(`${TRAINER_STYLES.find((x) => x.id === 'haggler')!.icon} Merchant`)).toBe(null);
    expect(splitIcons('🗿')).toBe(null); // recruited
    expect(splitIcons('💥')).toBe(null); // the damage step
    expect(TYPES.map((t) => iconFor(ITEMS[`totem:${t}`].icon))).toEqual(TYPES.map((t) => `totem-${t}`));
    expect(['totem', 'dewberry', 'homing-feather', 'canopy-rope'].map((id) => iconFor(ITEMS[id].icon))).toEqual(['item-totem', 'item-dewberry', 'item-homing-feather', 'key-canopy-rope']);
  });
});

describe('trainer minis', () => {
  it('a trainer always gets the same look, and titles decide their gear', () => {
    expect(roamingLook('Hiker Rosa')).toEqual(roamingLook('Hiker Rosa'));
    expect(roamingLook('Hiker Rosa')).toMatchObject({ hat: 'brim', pack: true });
    expect(roamingLook('Drifter Kane').hat).toBe('beanie');
  });
  it('Arbiters wear their type, the player wears their chosen color', () => {
    const a = arbiterLook('Arbiter Amber', 'fire');
    expect(a).toMatchObject({ emblem: 'fire', cape: true, hat: 'circlet' });
    expect(playerLook('Rowan', '#ff00aa').outfit).toBe('#ff00aa');
    expect(championLook('Champion Ivo').cape).toBe(true);
  });
  it('player customisation applies, but the top and hat always use the chosen colour', () => {
    const look = playerLook('Rowan', '#3d8bff', { skin: SKIN[4], hair: HAIR[5], pants: PANTS[6], hat: 'beanie', jacket: 'coat' });
    expect(look).toMatchObject({ outfit: '#3d8bff', hatColor: '#3d8bff', rim: '#3d8bff', skin: SKIN[4], hair: HAIR[5], pants: PANTS[6], hat: 'beanie', jacket: 'coat' });
    // unknown or missing choices fall back to defaults (old saves have no look at all)
    expect(playerLook('Rowan', '#3d8bff', { hat: 'crown', jacket: 'cape', hairStyle: 'afro' })).toMatchObject({ hat: 'cap', jacket: 'jacket', hairStyle: 'short' });
    expect(playerLook('Rowan', '#3d8bff', { hat: 'hood', jacket: 'hoodie' })).toMatchObject({ hat: 'cap', jacket: 'pouch' }); // retired options
    expect(playerLook('Rowan', '#3d8bff', { hairStyle: 'ponytail' }).hairAccent).toBe('#3d8bff');
    expect(playerLook('Rowan', '#3d8bff')).toEqual(playerLook('Rowan', '#3d8bff', {}));
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff', { hat: 'brim' });
    expect(s.trainer.look).toEqual({ hat: 'brim' });
  });
  it('has ten or more tops, hats and hair styles, each with five patterns that can be drawn', () => {
    expect(JACKET_OPTIONS.length).toBeGreaterThanOrEqual(10);
    expect(HAT_OPTIONS.filter((o) => o.id !== 'none').length).toBe(10);
    expect(HAIR_STYLE_OPTIONS.filter((o) => o.id !== 'bald').length).toBe(10);
    for (const [kind, list] of [['top', TOP_PATTERN_OPTIONS], ['hat', HAT_PATTERN_OPTIONS], ['hair', HAIR_PATTERN_OPTIONS]] as const) {
      const drawn = list.filter((o) => o.id !== 'plain');
      expect(drawn.length).toBe(5);
      for (const o of drawn) expect(hasPattern(`${kind}:${o.id}`), `${kind}:${o.id}`).toBe(true);
    }
  });
  it('patterns and secondary colours apply, and unknown patterns are plain', () => {
    expect(playerLook('R', '#3d8bff', { topPattern: 'dots', topColor2: '#111111', hatPattern: 'badge', hatColor2: '#222222', hairPattern: 'split', hairColor2: '#333333' }))
      .toMatchObject({ outfit: '#3d8bff', hatColor: '#3d8bff', topPattern: 'dots', accent: '#111111', hatPattern: 'badge', hatAccent: '#222222', hairPattern: 'split', hairAccent: '#333333' });
    expect(playerLook('R', '#3d8bff', { topPattern: 'x', hatPattern: 'x', hairPattern: 'x' })).toMatchObject({ topPattern: 'plain', hatPattern: 'plain', hairPattern: 'plain' });
  });
  it('backpacks come with the top, and looks saved before patterns keep theirs', () => {
    expect(playerLook('R', '#fff', { jacket: 'tee', topPattern: 'plain' })).toMatchObject({ jacket: 'tee', pack: false });
    expect(playerLook('R', '#fff', { jacket: 'tee-pack', topPattern: 'plain' })).toMatchObject({ jacket: 'tee', pack: true });
    expect(playerLook('R', '#fff', { jacket: 'coat' })).toMatchObject({ jacket: 'coat', pack: true });
    expect(topOf({ jacket: 'hoodie' })).toBe('pouch-pack');
    expect(topOf({})).toBe('jacket-pack');
  });
  it('every jacket and hat builds a mini of a sensible size', () => {
    for (const j of JACKET_OPTIONS) for (const hat of HAT_OPTIONS) for (const hs of HAIR_STYLE_OPTIONS) {
      const rig = buildTrainer(playerLook('Rowan', '#ff6b3d', { jacket: j.id, hat: hat.id, hairStyle: hs.id, topPattern: 'dots', hatPattern: 'band', hairPattern: 'tips' }));
      const box = new Box3().setFromObject(rig.root);
      expect(box.max.y, `${j.id}/${hat.id}`).toBeGreaterThan(1.6);
      expect(box.max.y, `${j.id}/${hat.id}`).toBeLessThan(2.4);
    }
  });
  it('every Rival and Champion has an outfit of their own', () => {
    expect(Object.keys(NPC_OUTFITS).sort()).toEqual(NPC_LIST.map((x) => x.id).sort());
    const worn = NPC_LIST.map((x) => { const l = npcLook(x); return [l.jacket, l.hat, l.hairStyle, l.topPattern].join('/'); });
    expect(new Set(worn).size).toBe(worn.length);
    for (const x of NPC_LIST) {
      const look = npcLook(x);
      expect(!!look.cape, x.id).toBe(x.kind === 'champion');
      expect(opponentLook(x.name, x.kind === 'champion')).toEqual(look); // the same in battle as in their portrait
      const top = new Box3().setFromObject(buildTrainer(look).root).max.y;
      expect(top, x.id).toBeGreaterThan(1.6);
      expect(top, x.id).toBeLessThan(2.4);
    }
    expect(opponentLook('Hiker Rosa')).toEqual(roamingLook('Hiker Rosa'));
  });
  it('builds a mini that stands on its base, about two units tall', () => {
    const rig = buildTrainer(roamingLook('Scout Ola'));
    const box = new Box3().setFromObject(rig.root);
    expect(box.min.y).toBeCloseTo(0, 1);
    expect(box.max.y).toBeGreaterThan(1.6);
    expect(box.max.y).toBeLessThan(2.4);
  });
});

describe('Zeroing In', () => {
  const ZI = () => import('../src/data/moves');
  // the foe can't be hit by a d6 or d8 without help: Evasion 6, and every die rolls `r`
  const setup = () => {
    const me = createCreature('zapup', 5), alt = createCreature('puddlit', 5), foe = createCreature('sproutle', 5);
    me.playbook = ['tackle', 'pounce', 'rampage', 'quick-jab'];
    const b = createBattle(side('player', [me, alt]), side('wild', [foe]), WEATHER.clear);
    b.sides[1].mods.evasion = 9;
    const use = (move: string) => { me.stamina = 99; me.fatigue = 0; foe.health = 99; return resolveRound(b, { kind: 'move', move }, { kind: 'move', move: CATCH_BREATH.id }); };
    return { b, me, use };
  };
  const withRolls = <T>(r: number, fn: () => T): T => { const real = Math.random; Math.random = () => r; try { return fn(); } finally { Math.random = real; } };
  const accRoll = (ev: BEvent[]) => ev.find((e) => e.t === 'roll' && e.label === 'Accuracy' && e.side === 0);

  it('a miss gives +1 to the next accuracy roll, stacking over misses up to +3', () => {
    const { b, use } = setup();
    withRolls(0, () => {
      use('tackle'); expect(b.sides[0].zeroIn).toBe(1);
      const ev = use('tackle'); expect(b.sides[0].zeroIn).toBe(2);
      const r = accRoll(ev);
      expect(r?.t === 'roll' && r.mods?.find((p) => p.label === 'Zeroing In')?.value).toBe(1);
      expect(ev.some((e) => e.t === 'zero' && e.bonus === 2 && e.snap.zero === 2)).toBe(true);
      use('tackle'); use('tackle');
      expect(b.sides[0].zeroIn).toBe(3);
    });
  });

  it('pursuit moves zero in more; all-or-nothing moves never do and still use up the bonus', async () => {
    const { ZERO_IN, zeroInOf, MOVE_BY_ID: M } = await ZI();
    expect(zeroInOf(M.tackle)).toBe(ZERO_IN);
    expect(zeroInOf(M.pounce)).toBe(2);
    expect(zeroInOf(M.rampage)).toBe(0);
    expect(zeroInOf(M['quick-jab'])).toBe(0);
    expect(M.rampage.text).toMatch(/never zeroes in/);
    expect(M.pounce.text).toMatch(/zeroes in \+2/);
    const { b, use } = setup();
    withRolls(0, () => {
      use('pounce'); expect(b.sides[0].zeroIn).toBe(2);
      const ev = use('rampage');
      const r = accRoll(ev);
      expect(r?.t === 'roll' && r.mods?.find((p) => p.label === 'Zeroing In')?.value).toBe(2);
      expect(b.sides[0].zeroIn).toBe(0);
    });
  });

  it('a hit uses up the bonus; a sure hit keeps it; leaving the field loses it', () => {
    const { b, me, use } = setup();
    withRolls(0, () => { use('tackle'); use('tackle'); });
    expect(b.sides[0].zeroIn).toBe(2);
    withRolls(0, () => use('quick-jab'));
    expect(b.sides[0].zeroIn).toBe(2);
    b.sides[1].mods.evasion = 0;
    const ev = withRolls(0.99, () => use('tackle'));
    expect(accRoll(ev)?.t === 'roll' && (accRoll(ev) as { hit: boolean }).hit).toBe(true);
    expect(b.sides[0].zeroIn).toBe(0);
    expect(ev.some((e) => e.t === 'zero' && e.bonus === 0)).toBe(true);
    b.sides[1].mods.evasion = 9;
    withRolls(0, () => use('tackle'));
    expect(b.sides[0].zeroIn).toBe(1);
    me.stamina = 99;
    withRolls(0.5, () => resolveRound(b, { kind: 'swap', to: 1 }, { kind: 'move', move: CATCH_BREATH.id }));
    expect(b.sides[0].active).toBe(1);
    expect(b.sides[0].zeroIn).toBe(0);
  });

  it('the move readout shows the bonus and what a miss would add', () => {
    const { b, use } = setup();
    withRolls(0, () => use('tackle'));
    const acc = movePreview(b, 'tackle').find((s) => s.title.startsWith('Accuracy'))!;
    expect(acc.title).toMatch(/Zeroing In 1/);
    expect(acc.text).toMatch(/zeroes in: \+2/);
    expect(movePreview(b, 'rampage').find((s) => s.title.startsWith('Accuracy'))!.text).toMatch(/never zeroes in/);
  });
});

describe('extra damage dice and wide crits', () => {
  const queue = <T>(vals: number[], fn: () => T): T => {
    const real = Math.random; let i = 0;
    Math.random = () => (i < vals.length ? vals[i++] : 0.5);
    try { return fn(); } finally { Math.random = real; }
  };
  const fight = (move: string) => {
    const me = createCreature('sproutle', 6), foe = createCreature('zapup', 6);
    me.playbook = [move];
    const b = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
    b.sides[0].mods.speed = 9; // act first, no Clash rolls
    b.sides[1].mods.evasion = -9; // need 1+: any accuracy roll hits
    foe.health = 99;
    return { b, me, foe, go: () => resolveRound(b, { kind: 'move', move }, { kind: 'move', move: CATCH_BREATH.id }) };
  };

  it('moves with extra dice roll them all, add them up, and show the odds', async () => {
    const { damageDice, avgRoll, diceText, statusChance } = await import('../src/data/moves');
    const tv = MOVE_BY_ID['thorn-volley'];
    expect(damageDice(tv)).toEqual([4, 4]);
    expect(diceText(tv)).toBe('d4+d4');
    expect(avgRoll(tv)).toBe(5);
    expect(statusChance(tv)).toBeCloseTo(1 - 0.75 * 0.75);
    expect(diceText(MOVE_BY_ID.meteor)).toBe('d10+d4');
    expect(statusChance(MOVE_BY_ID.meteor)).toBeGreaterThan(statusChance({ ...MOVE_BY_ID.meteor, extraDice: undefined }));
    expect(tv.text).toMatch(/a 1 on any die inflicts the status \(44%\)/);
  });

  it('only one of the dice needs to show a 1 to inflict the status', () => {
    const { b, foe, go } = fight('thorn-volley');
    // accuracy 4, then the damage dice: 4 and 1
    const ev = queue([0.5, 0.9, 0], go);
    const dmg = ev.find((e) => e.t === 'damage' && e.side === 1);
    expect(dmg?.t === 'damage' && dmg.calc?.dice).toEqual([4, 4]);
    expect(dmg?.t === 'damage' && dmg.calc?.rolls).toEqual([4, 1]);
    expect(b.status[foe.uid]?.id).toBe('snare');
  });

  it('no 1 on any die: no status', () => {
    const { b, foe, go } = fight('thorn-volley');
    queue([0.5, 0.9, 0.3], go);
    expect(b.status[foe.uid]).toBeUndefined();
  });

  it('Claw crits on a 5 or 6; Tackle only on a 6; Rampage on 7–8', async () => {
    const { critFrom } = await import('../src/data/moves');
    expect(critFrom(MOVE_BY_ID.claw, 6)).toBe(5);
    expect(critFrom(MOVE_BY_ID.tackle, 6)).toBe(6);
    expect(critFrom(MOVE_BY_ID.rampage, 8)).toBe(7);
    expect(critFrom(MOVE_BY_ID.claw, 4)).toBe(3); // a Dazed d4 keeps the two-face range
    expect(critFrom(MOVE_BY_ID['thorn-volley'], 6)).toBe(0); // most elemental moves don't crit
    expect(critFrom(MOVE_BY_ID.thunderclap, 6)).toBe(6); // but some do
    for (const [move, crit] of [['claw', true], ['tackle', false]] as const) {
      const ev = queue([0.7], fight(move).go); // natural 5
      const dmg = ev.find((e) => e.t === 'damage' && e.side === 1);
      expect(dmg?.t === 'damage' && dmg.crit).toBe(crit);
    }
  });

  it('the readout lists every die, the combined status chance and the crit range', () => {
    const tv = movePreview(fight('thorn-volley').b, 'thorn-volley');
    expect(tv.find((s) => s.title.startsWith('Damage'))!.title).toMatch(/^Damage: d4 \+ d4/);
    expect(tv.find((s) => s.title.startsWith('Status chance'))!.text).toMatch(/any damage die shows a 1 \(44% chance\)/);
    const claw = movePreview(fight('claw').b, 'claw');
    expect(claw.find((s) => s.title.startsWith('Accuracy'))!.text).toMatch(/natural 5–6 is a critical hit/);
  });
});

describe('city market and shrine: free to browse, pay on the first purchase', () => {
  const city = () => { const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#e44'); s.coins = 100; return s; };

  it('the first purchase pays the city action; later ones that turn are free', () => {
    const s = city();
    const cost = W.cityActionCost(s);
    expect(W.facilityPaid(s, 'market')).toBe(false);
    expect(W.payFacility(s, 'market')).toBe('paid');
    expect(s.initiative).toBe(5 - cost);
    expect(W.payFacility(s, 'market')).toBe('already');
    expect(s.initiative).toBe(5 - cost);
    // the shrine is paid separately
    expect(W.facilityPaid(s, 'shrine')).toBe(false);
  });

  it('not enough Initiative: no charge and no purchase', () => {
    const s = city();
    s.initiative = 0;
    expect(W.payFacility(s, 'shrine')).toBe(false);
    expect(W.facilityPaid(s, 'shrine')).toBe(false);
  });

  it('a refund undoes a payment whose purchase failed', () => {
    const s = city();
    expect(W.payFacility(s, 'shrine')).toBe('paid');
    W.refundFacility(s, 'shrine');
    expect(s.initiative).toBe(5);
    expect(W.facilityPaid(s, 'shrine')).toBe(false);
  });

  it('payment is per city and resets at the end of the turn', () => {
    const s = city();
    W.payFacility(s, 'market');
    const here = s.location;
    s.location = 'aurora';
    expect(W.facilityPaid(s, 'market')).toBe(false);
    s.location = here;
    expect(W.facilityPaid(s, 'market')).toBe(true);
    W.endTurn(s);
    expect(W.facilityPaid(s, 'market')).toBe(false);
  });
});

describe('Hush Smoke', () => {
  const withRolls = <T>(r: number, fn: () => T): T => { const real = Math.random; Math.random = () => r; try { return fn(); } finally { Math.random = real; } };
  const meadow = () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    s.location = MAP_NODES.find((n) => n.kind === 'wild' && n.biome === 'meadow')!.id;
    return s;
  };
  it('turns the encounter faces into a quiet Nothing (3) and a find (4), and is spent', () => {
    for (const [r, face] of [[0.01, 1], [0.34, 3], [0.5, 4], [0.7, 5], [0.99, 6]] as const) {
      const s = meadow();
      s.initiative = 5; s.inventory['hush-smoke'] = 1;
      W.useItem(s, 'hush-smoke', s.roster[0].uid);
      expect(s.flags.repel).toBe(true);
      const out = withRolls(r, () => W.reexplore(s))!;
      expect(out.t, `face ${face}`).toMatch(face <= 3 ? /nothing/ : /item/);
      expect('hushed' in out && out.hushed === true).toBe(face === 3 || face === 4);
      expect(s.flags.repel).toBe(false);
    }
  });
  it('is sold in city markets, and Lure Incense and Hush Smoke put each other out', () => {
    const city = MAP_NODES.find((n) => n.kind === 'city')!.id;
    expect(W.marketStock(city)).toContain('hush-smoke');
    const s = meadow();
    s.inventory['hush-smoke'] = 1; s.inventory['lure-incense'] = 1;
    W.useItem(s, 'lure-incense', s.roster[0].uid);
    W.useItem(s, 'hush-smoke', s.roster[0].uid);
    expect([s.flags.lure, s.flags.repel]).toEqual([false, true]);
    expect(W.activeEffects(s).map((e) => e.id)).toEqual(['repel']);
  });
});

describe('Workbench crafting', () => {
  const inCity = () => {
    const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
    s.location = MAP_NODES.find((n) => n.kind === 'city')!.id;
    return s;
  };
  const recipe = (id: string) => RECIPES.find((r) => r.id === id)!;
  it('every recipe can be made from ordinary (non-universal, non-exotic) materials', () => {
    const ordinary = Object.values(ITEMS).filter((it) => it.kind === 'material' && Object.keys(it.allure ?? {}).length < 8 && Object.values(it.allure ?? {}).every((v) => v! <= 2));
    for (const r of RECIPES) for (const t of r.slots) expect(ordinary.some((m) => W.fitsSlot(m.id, t)), `${r.id} ${t}`).toBe(true);
  });
  it('crafts with a material per slot, consuming them, and checks counts', () => {
    const s = inCity();
    s.inventory = { 'pine-resin': 1, 'river-chalk': 1 };
    expect(W.validIngredients(s, recipe('salve'), ['river-chalk', 'pine-resin'])).toBe(false); // wrong slot order
    expect(W.craft(s, 'salve', ['pine-resin', 'river-chalk'])).toBe('salve');
    expect(s.inventory['salve']).toBe(2);
    expect(s.inventory['pine-resin'] ?? 0).toBe(0);
    expect(s.stats.crafted).toBe(2);
    // one Marsh Lotus can't fill both of its slots
    s.inventory['marsh-lotus'] = 1;
    expect(W.craft(s, 'salve', ['marsh-lotus', 'marsh-lotus'])).toBe(null);
    s.inventory['marsh-lotus'] = 2;
    expect(W.craft(s, 'salve', ['marsh-lotus', 'marsh-lotus'])).toBe('salve');
  });
  it('picks the cheapest materials, keeping universal ones for last', () => {
    const s = inCity();
    s.inventory = { 'stardust': 3, 'ember-charcoal': 1, 'iron-filings': 1 };
    expect(W.autoIngredients(s, recipe('hush-smoke'))).toEqual(['ember-charcoal', 'iron-filings']);
    s.inventory = { 'stardust': 3 };
    expect(W.autoIngredients(s, recipe('elixir'))).toEqual(['stardust', 'stardust', 'stardust']);
    s.inventory = { 'stardust': 1 };
    expect(W.autoIngredients(s, recipe('star-charm'))).toBe(null);
  });
  it('only works in cities and towns', () => {
    const s = inCity();
    s.inventory = { 'wildflower': 1, 'pine-resin': 1 };
    s.location = MAP_NODES.find((n) => n.kind === 'wild')!.id;
    expect(W.canCraftHere(s)).toBe(false);
    expect(W.craft(s, 'calm-tea', ['pine-resin', 'wildflower'])).toBe(null);
    s.location = MAP_NODES.find((n) => n.kind === 'town')!.id;
    expect(W.craft(s, 'calm-tea', ['pine-resin', 'wildflower'])).toBe('calm-tea');
  });
});

describe('Odd jobs', () => {
  const at = (kind: 'city' | 'town' | 'wild', style: 'balanced' | 'haggler' = 'balanced') => {
    const s = newGame('T', style, 'thunder', 'puddlit', '#fff');
    s.location = MAP_NODES.find((n) => n.kind === kind)!.id;
    return s;
  };
  it('spends all Initiative, a d4 of coins for each point', () => {
    const s = at('town');
    s.initiative = 3; s.coins = 0;
    const r = W.doWork(s)!;
    expect(r.rolls).toHaveLength(3);
    for (const v of r.rolls) { expect(v).toBeGreaterThanOrEqual(1); expect(v).toBeLessThanOrEqual(4); }
    expect(s.coins).toBe(r.rolls.reduce((a, b) => a + b, 0));
    expect(s.initiative).toBe(0);
    expect(W.doWork(s)).toBe(null); // nothing left to spend
  });
  it('a Merchant earns their bonus on the total', () => {
    const s = at('city', 'haggler');
    s.initiative = 2; s.coins = 0;
    const real = Math.random; Math.random = () => 0.99;
    try { expect(W.doWork(s)!.coins).toBe(8 + 2); } finally { Math.random = real; }
  });
  it('only in cities and towns', () => {
    const s = at('wild');
    expect(W.workBlock(s)).toMatch(/cities and towns/);
    expect(W.doWork(s)).toBe(null);
    expect(s.initiative).toBe(5);
  });
});

describe('Teamwork', () => {
  /** Two creatures with the given Loyalty (the Teamwork cap is half the lower of the two). */
  const pair = (loyalty: number, level = 6) => {
    const a = createCreature('puddlit', level), b = createCreature('zapup', level);
    a.loyalty = b.loyalty = loyalty;
    return [a, b] as const;
  };
  it('grows 0.2 a turn for pairs travelling together, capped at half their Loyalty', () => {
    const [a, b] = pair(4);
    for (let i = 0; i < 5; i++) travelTogether([a, b]);
    expect(teamworkOf(a, b)).toBe(1);
    expect(teamworkOf(b, a)).toBe(1);
    for (let i = 0; i < 20; i++) travelTogether([a, b]);
    expect(teamworkOf(a, b)).toBe(teamworkCap(a));
    expect(teamworkCap(a)).toBe(2);
    expect(teamworkBonus(a, b)).toBe(1);
  });
  it('a pair is capped by the lower Loyalty of the two, whatever their levels', () => {
    const a = createCreature('puddlit', 2), b = createCreature('zapup', 12);
    a.loyalty = 8; b.loyalty = 2;
    addTeamwork(a, b, 3);
    expect(teamworkCap(a)).toBe(4);
    expect(teamworkCap(a, b)).toBe(1);
    expect(teamworkOf(a, b)).toBe(1);
    expect(teamworkOf(b, a)).toBe(1);
    // no Loyalty, no Teamwork
    expect(addTeamwork(createCreature('puddlit', 10), createCreature('zapup', 10), 1)).toBeNull();
  });
  it('Teamwork falls when a Loyalty does, and the end of the turn says so', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    const lg = createCreature('zapup', 6);
    const me = s.roster[0];
    s.roster.push(lg);
    me.loyalty = lg.loyalty = 6;
    addTeamwork(me, lg, 3);
    expect(teamworkOf(me, lg)).toBe(3);
    lg.loyalty = 2; // e.g. a Legendary's drain
    expect(teamworkOf(me, lg)).toBe(1);
    expect(settleTeamwork(s.roster)).toHaveLength(1);
    expect(me.teamwork[lg.uid]).toBe(1); // stored value brought down too
    lg.loyalty = 6;
    expect(teamworkOf(me, lg)).toBe(1); // regaining Loyalty doesn't restore it
    lg.loyalty = 0;
    W.endTurn(s);
    expect(s.teamworkFell?.[0]).toMatch(/Teamwork 0/);
  });
  it('the end of a turn grows the active team’s Teamwork and saves the news for the next turn', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 4));
    for (const c of s.roster) { c.loyalty = 6; c.morale = 9; }
    for (let i = 0; i < 5; i++) W.endTurn(s);
    expect(teamworkOf(s.roster[0], s.roster[1])).toBe(1);
    expect(s.teamworkNews?.length).toBe(1);
    expect(s.teamworkNews![0]).toMatch(/Teamwork 1/);
  });
  it('swapping earns a pair Teamwork once per battle, and the bonus uses the value from before the swap', () => {
    const [a, b] = pair(6);
    a.teamwork[b.uid] = 2;
    const foe = createCreature('sproutle', 6);
    const bt = createBattle(side('player', [a, b]), side('wild', [foe]), WEATHER.clear);
    for (const c of [a, b, foe]) c.health = 999;
    resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
    expect(swapPreview(bt, 0, 1).bonus).toBe(0);
    expect(swapPreview(bt, 0, 1).earned).toBe(false);
    resolveRound(bt, { kind: 'swap', to: 1 }); // b in for a: +1 each
    expect(teamworkOf(a, b)).toBe(3);
    expect(teamworkOf(b, a)).toBe(1);
    expect(swapPreview(bt, 0, 0).bonus).toBe(1); // a has 3 with b
    expect(swapPreview(bt, 0, 0).earned).toBe(true);
    resolveRound(bt, { kind: 'swap', to: 0 });
    resolveRound(bt, { kind: 'swap', to: 1 });
    expect(teamworkOf(a, b)).toBe(3);
    expect(teamworkOf(b, a)).toBe(1);
    expect(bt.teamworkGains).toHaveLength(1);
  });
  it('old saves keep their Teamwork (was `affinity`), capped at half the Loyalty', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    const c = s.roster[0] as ReturnType<typeof createCreature> & { affinity?: Record<string, number> };
    c.loyalty = 4;
    c.affinity = { other: 9 };
    delete (c as { teamwork?: unknown }).teamwork;
    const m = migrate(JSON.parse(JSON.stringify(s)))!;
    expect(m.roster[0].teamwork).toEqual({ other: 2 });
    expect('affinity' in m.roster[0]).toBe(false);
  });
});

describe('Swap Moves', () => {
  /** Three Lv 6 creatures with Loyalty 6, so their Teamwork can reach 3. */
  const trio = () => {
    const t = [createCreature('puddlit', 6), createCreature('zapup', 6), createCreature('sproutle', 6)] as const;
    for (const c of t) c.loyalty = 6;
    return t;
  };
  const typedFor = (c: ReturnType<typeof createCreature>, tier: number) => SWAP_MOVES.find((m) => m.type === speciesOf(c).types[0] && m.teamwork === tier)!;
  it('are set per direction: each creature has its own move for each teammate', () => {
    const [a, b, c] = trio();
    a.teamwork[b.uid] = 3; a.teamwork[c.uid] = 3; b.teamwork[a.uid] = 3;
    expect(setSwapMove(a, b, 'rally')).toBe(true);
    expect(setSwapMove(a, c, 'siphon')).toBe(true);
    expect(swapMoveOf(a, b).id).toBe('rally');
    expect(swapMoveOf(a, c).id).toBe('siphon');
    expect(swapMoveOf(b, a)).toBe(defaultSwapMove(b, a)); // b's own slot for a is still its random default
  });
  it('the list leaves out what a pair’s types rule out, and keeps what Teamwork will open', () => {
    const [a, b] = trio(); // Water, with an Electric partner
    const ids = () => swapChoices(a, b);
    expect(ids().length).toBe(7); // 5 neutral and Electric's two
    expect(ids().every(({ m }) => !m.type || (m.type === 'electric' && !m.boosted))).toBe(true);
    expect(ids().slice(5).map(({ m, lock }) => [m.teamwork, !!lock])).toEqual([[1, true], [2, true]]);
    a.teamwork[b.uid] = 1;
    expect(ids().filter(({ lock }) => lock).map(({ m }) => m.teamwork)).toEqual([2]);
    const twin = createCreature('puddlit', 6); twin.loyalty = 6; // shares a type: its Boosted move is listed, greyed out until Teamwork 3
    const boosted = swapChoices(a, twin).filter(({ m }) => m.boosted);
    expect(boosted.map(({ m, lock }) => [m.type, lock])).toEqual([['water', 'Needs Teamwork 3 (has 0)']]);
    // nothing set or settable is ever left out
    for (const p of [b, twin]) { a.teamwork[p.uid] = 3; expect(SWAP_MOVES.filter((m) => !swapLock(a, p, m)).length).toBe(swapChoices(a, p).length); }
  });
  it('typed moves need a partner of that type (the Alpha’s own doesn’t count) and enough Teamwork', () => {
    const [a, b] = trio();
    const t1 = typedFor(b, 1), t2 = typedFor(b, 2);
    expect(swapLock(a, b, t1)).toMatch(/Teamwork 1/);
    a.teamwork[b.uid] = 1;
    expect(swapLock(a, b, t1)).toBe(null);
    expect(swapLock(a, b, t2)).toMatch(/Teamwork 2/);
    const foreign = SWAP_MOVES.find((m) => m.type && !speciesOf(a).types.includes(m.type) && !speciesOf(b).types.includes(m.type))!;
    a.teamwork[b.uid] = 3;
    expect(swapLock(a, b, foreign)).toMatch(/partner/);
    expect(setSwapMove(a, b, foreign.id)).toBe(false);
    expect(swapLock(a, b, t2)).toBe(null);
    expect(swapLock(a, b, typedFor(a, 1))).toBe('Needs a Water partner');
    b.teamwork[a.uid] = 3;
    expect(swapLock(b, a, typedFor(a, 1))).toBe(null);
    // a shared type is lent both ways
    const twin = createCreature('puddlit', 6);
    twin.loyalty = 6; a.teamwork[twin.uid] = 3;
    expect(swapLock(a, twin, typedFor(a, 1))).toBe(null);
  });
  it('Boosted moves need a type both creatures share, and their Teamwork', () => {
    const [a, b] = trio();
    const boost = SWAP_MOVES.find((m) => m.boosted && m.type === 'water')!;
    const types = new Set(SWAP_MOVES.flatMap((m) => m.type ?? []));
    expect(SWAP_MOVES.filter((m) => m.boosted).map((m) => m.type).sort()).toEqual([...types].sort()); // one per type
    b.teamwork[a.uid] = a.teamwork[b.uid] = 3;
    expect(swapLock(b, a, boost)).toMatch(/both creatures/); // a Water partner isn't enough
    expect(swapLock(a, b, boost)).toMatch(/both creatures/);
    // a dual-type partner: the shared type is boosted, and its other type still gives its usual moves
    const sp = SPECIES.find((x) => x.rarity !== 'legendary' && x.types.length === 2 && x.types.includes('water'))!;
    const d = createCreature(sp.id, 6);
    d.loyalty = 6;
    a.teamwork[d.uid] = 2;
    expect(swapLock(a, d, boost)).toMatch(/Teamwork 3/);
    a.teamwork[d.uid] = 3;
    expect(swapLock(a, d, boost)).toBe(null);
    const other = SWAP_MOVES.filter((m) => m.type === sp.types.find((t) => t !== 'water'));
    expect(other.map((m) => !swapLock(a, d, m))).toEqual([true, true, false]);
  });
  it('Conjunction hits twice, but never carries over to the foe’s replacement', () => {
    const sp = SPECIES.find((x) => x.rarity !== 'legendary' && x.types.length === 1 && x.types[0] === 'astral')!;
    const run = (hp: number) => {
      const a = createCreature(sp.id, 6), p = createCreature(sp.id, 6);
      a.loyalty = p.loyalty = 6; a.teamwork[p.uid] = 3;
      expect(setSwapMove(a, p, 'conjunction')).toBe(true);
      const foes = [createCreature('sproutle', 6), createCreature('sproutle', 6)];
      const bt = createBattle(side('player', [p, a]), side('trainer', foes), WEATHER.clear);
      for (const c of [a, p, ...foes]) c.health = 999;
      resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      bt.sides[0].mods.speed = 10;
      const lead = bt.sides[1].team[bt.sides[1].active], bench = foes.find((f) => f !== lead)!;
      lead.health = hp;
      if (hp === 1) lead.vitality = 0;
      const ev: BEvent[] = resolveRound(bt, { kind: 'swap', to: 1 }, { kind: 'move', move: CATCH_BREATH.id }); // (left to itself, the foe might heal first)
      const rest = ev.slice(ev.findIndex((e) => e.t === 'use' && e.move === 'conjunction') + 1);
      const end = rest.findIndex((e) => e.t === 'use' || (e.t === 'send' && e.side === 1));
      return { hits: (end < 0 ? rest : rest.slice(0, end)).filter((e) => e.t === 'damage' && e.side === 1).length, bench };
    };
    const real = Math.random;
    let seed = 1;
    Math.random = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // (a miss or a lucky dodge would spoil it)
    try {
      expect(run(999).hits).toBe(2);
      const ko = run(1);
      expect(ko.hits).toBe(1);
      expect(ko.bench.health).toBe(999);
    } finally { Math.random = real; }
  });
  it('a slot whose move is no longer allowed falls back to the pair’s random default', () => {
    const [a, b] = trio();
    a.swapMoves[b.uid] = typedFor(b, 2).id; // set without the Teamwork for it
    expect(swapMoveOf(a, b)).toBe(defaultSwapMove(a, b));
  });
  it('the battle uses the move set for that pair', () => {
    const [a, b] = trio();
    b.teamwork[a.uid] = 2;
    setSwapMove(b, a, typedFor(a, 2).id);
    const foe = createCreature('sproutle', 6);
    const bt = createBattle(side('player', [a, b]), side('wild', [foe]), WEATHER.clear);
    for (const c of [a, b, foe]) c.health = 999;
    resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
    expect(swapPreview(bt, 0, 1).move.id).toBe(typedFor(a, 2).id);
    const used = resolveRound(bt, { kind: 'swap', to: 1 }).find((e) => e.t === 'use' && e.side === 0);
    expect(used && used.t === 'use' && used.move).toBe(typedFor(a, 2).id);
  });
  it('every Swap Move runs in battle and describes itself with real numbers', () => {
    for (const m of SWAP_MOVES) {
      // a partner of the move's type (any for neutral ones), with the Teamwork to set it
      const sp = SPECIES.find((x) => x.rarity !== 'legendary' && (!m.type || x.types.includes(m.type)))!;
      const a = createCreature(m.boosted ? sp.id : 'zapup', 6), b = createCreature(sp.id, 6);
      a.loyalty = b.loyalty = 6;
      a.teamwork[b.uid] = 3;
      expect(setSwapMove(a, b, m.id), m.id).toBe(true);
      const foe = createCreature('sproutle', 6);
      const bt = createBattle(side('player', [b, a]), side('wild', [foe]), WEATHER.clear);
      for (const c of [a, b, foe]) c.health = 999;
      resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      const ev = resolveRound(bt, { kind: 'swap', to: 1 });
      expect(ev.some((e) => e.t === 'use' && e.move === m.id), m.id).toBe(true);
      const text = describeSwap(m, swapVals(a, b));
      expect(text, m.id).not.toMatch(/undefined|NaN/);
    }
  });
  it('Swap Move text names who swaps in and who swaps out', () => {
    const a = createCreature('sproutle', 6), b = createCreature('puddlit', 6);
    a.nickname = 'Leafy'; b.nickname = 'Splash';
    const v = swapVals(a, b);
    expect(swapText(SWAP_MOVES.find((m) => m.id === 'tagStrike')!, v)).toBe('Leafy swaps in with an attack of Splash’s type (Water), powered by Splash’s Focus.');
    for (const m of SWAP_MOVES) {
      const named = swapText(m, v), plain = swapText(m);
      expect(named, m.id).toMatch(/Leafy|Splash/);
      expect(named, m.id).not.toMatch(/undefined|Alpha|partner/);
      expect(plain, m.id).toMatch(/^[A-Z]/);
      expect(plain, m.id).not.toMatch(/undefined|Leafy|Splash|\(\)/);
      expect(describeSwap(m, v), m.id).toMatch(/Leafy/);
    }
  });
  it('online edits set a Swap Move with the same rules', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    const z = createCreature('zapup', 4);
    s.roster.push(z);
    const me = s.roster[0];
    expect(applyEdit(s, { uid: me.uid, op: 'swapMove', partner: z.uid, move: 'siphon' })).toBe(true);
    expect(swapMoveOf(me, z).id).toBe('siphon');
    expect(applyEdit(s, { uid: me.uid, op: 'swapMove', partner: z.uid, move: typedFor(z, 2).id })).toBe(false);
  });
});

describe('Instincts', () => {
  /** Run `fn` with species `sp` given Instinct `id` for the duration. */
  const withInstinct = (sp: string, id: string, fn: () => void) => {
    const was = SPECIES_BY_ID[sp].instinct;
    SPECIES_BY_ID[sp].instinct = id;
    try { fn(); } finally { SPECIES_BY_ID[sp].instinct = was; }
  };
  const duel = (a: ReturnType<typeof createCreature>, b: ReturnType<typeof createCreature>) => {
    const bt = createBattle(side('player', [a]), side('wild', [b]), WEATHER.clear);
    for (const c of [a, b]) c.health = 999;
    return bt;
  };
  it('every species has one, families share it, and every Instinct is used', () => {
    for (const sp of SPECIES) {
      expect(INSTINCT_BY_ID[sp.instinct], sp.id).toBeDefined();
      if (sp.evolvesTo) expect(SPECIES_BY_ID[sp.evolvesTo].instinct, sp.id).toBe(sp.instinct);
    }
    for (const i of INSTINCTS) expect(SPECIES.some((sp) => sp.instinct === i.id), i.id).toBe(true);
    expect(new Set(INSTINCTS.map((i) => i.id)).size).toBe(INSTINCTS.length);
    expect(new Set(INSTINCTS.map((i) => i.name)).size).toBe(INSTINCTS.length);
    for (const i of INSTINCTS) { expect(instinctRules(i), i.id).toMatch(/\.$/); expect(instinctRules(i), i.id).not.toMatch(/undefined|NaN/); }
  });
  it('fire when the leads take the field, as round 1 begins', () => {
    withInstinct('pebbark', 'menace', () => {
      const me = createCreature('pebbark', 5), foe = createCreature('zapup', 5);
      const bt = duel(me, foe);
      const ev = resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      expect(ev.some((e) => e.t === 'say' && /Menace/.test(e.text))).toBe(true);
      expect(bt.sides[1].mods.power).toBe(-1);
      resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      expect(bt.sides[1].mods.power).toBe(-1); // only on taking the field
    });
  });
  it('Hold Fast leaves it at 1 Health once a battle', () => {
    withInstinct('rubblet', 'hold-fast', () => {
      const me = createCreature('puddlit', 5), foe = createCreature('rubblet', 5);
      const bt = duel(me, foe);
      bt.sides[0].mods.speed = 10; // no Speed tie: a Clash's damage would use up Hold Fast before the Burn does
      foe.health = 1; foe.vitality = 0;
      bt.status[foe.uid] = { id: 'burn', turns: 3 };
      const ev = resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      expect(foe.ko).toBe(false);
      expect(foe.health).toBe(1);
      expect(ev.some((e) => e.t === 'say' && /hangs on/.test(e.text))).toBe(true);
      resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      expect(foe.ko).toBe(true);
    });
  });
  it('Steel Coat shrugs off the first status; immunities block theirs for good', () => {
    withInstinct('rivetail', 'steel-coat', () => {
      const bt = duel(createCreature('puddlit', 5), createCreature('rivetail', 5));
      const ev: BEvent[] = [];
      expect(afflict(bt, 1, 'burn', ev)).toBe(false);
      expect(ev.some((e) => e.t === 'say' && /turns Burn aside/.test(e.text))).toBe(true);
      expect(afflict(bt, 1, 'burn', ev)).toBe(true);
    });
    withInstinct('puddlit', 'wet-coat', () => {
      const bt = duel(createCreature('zapup', 5), createCreature('puddlit', 5));
      expect(afflict(bt, 1, 'burn', [])).toBe(false);
      expect(afflict(bt, 1, 'soak', [])).toBe(false);
      expect(afflict(bt, 1, 'shock', [])).toBe(true);
    });
  });
  it('Fixed Star keeps a Dazed creature’s accuracy die whole; Shadow stops the foe Zeroing In', () => {
    const me = createCreature('zapup', 5);
    autoPlaybook(me);
    const id = me.playbook.find((m) => typeof MOVE_BY_ID[m].accuracy === 'number' && (MOVE_BY_ID[m].accuracy as number) > 4)!;
    const acc = MOVE_BY_ID[id].accuracy as number;
    const bt = duel(me, createCreature('puddlit', 5));
    bt.status[me.uid] = { id: 'daze', turns: 3 };
    const title = () => movePreview(bt, id).find((s) => s.icon === '🎯')!.title;
    expect(title()).toMatch(new RegExp(`^Accuracy: d${acc - 2}`));
    withInstinct('zapup', 'fixed-star', () => expect(title()).toMatch(new RegExp(`^Accuracy: d${acc}\\b`)));
    delete bt.status[me.uid];
    bt.sides[0].zeroIn = 2;
    expect(title()).toMatch(/Zeroing In/);
    withInstinct('puddlit', 'shadow', () => {
      expect(title()).not.toMatch(/Zeroing In/);
      expect(movePreview(bt, id).find((s) => s.icon === '🎯')!.text).toMatch(/Shadow stops you Zeroing In/);
    });
  });
  it('Eruption burns the foe the first time it loses a heart', () => {
    withInstinct('cindercub', 'eruption', () => withInstinct('zapup', 'overclock', () => {
      const me = createCreature('cindercub', 5), foe = createCreature('zapup', 5);
      const bt = duel(me, foe);
      me.health = 1; me.vitality = 8; // plenty of hearts: one big hit mustn't knock it out (then Eruption rightly can't fire)
      bt.status[me.uid] = { id: 'burn', turns: 3 };
      const ev = resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      expect(ev.some((e) => e.t === 'say' && /Eruption/.test(e.text))).toBe(true);
      expect(bt.status[foe.uid]?.id).toBe('burn');
      expect(bt.instinctUsed).toContain(`${me.uid}:eruption`);
    }));
  });
  it('a pair with no Swap Move set uses a neutral one picked for that pair, the same every time', () => {
    const [a, b, c] = [createCreature('puddlit', 5), createCreature('zapup', 5), createCreature('sproutle', 5)];
    const d = defaultSwapMove(a, b);
    expect(d.type).toBeUndefined();
    expect(defaultSwapMove(a, b)).toBe(d);
    expect(swapMoveOf(a, b)).toBe(d);
    // across many pairs, more than one neutral move comes up
    const seen = new Set(Array.from({ length: 30 }, () => defaultSwapMove(createCreature('puddlit', 5), c).id));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('Overheal', () => {
  const withInstinct = (sp: string, id: string, fn: () => void) => {
    const was = SPECIES_BY_ID[sp].instinct;
    SPECIES_BY_ID[sp].instinct = id;
    try { fn(); } finally { SPECIES_BY_ID[sp].instinct = was; }
  };
  it('a Swap Move heal at full Health becomes Overheal, up to half max Health', () => {
    const a = createCreature('puddlit', 6), b = createCreature('zapup', 6);
    expect(setSwapMove(b, a, 'siphon')).toBe(true);
    const bt = createBattle(side('player', [a, b]), side('wild', [createCreature('sproutle', 6)]), WEATHER.clear);
    bt.sides[0].mods.speed = 10; bt.sides[0].team[0].health = 999; // faster, and no knockout ending the battle early
    resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
    b.health = maxHealth(b);
    const ev = resolveRound(bt, { kind: 'swap', to: 1 });
    expect(ev.some((e) => e.t === 'say' && /Overheal/.test(e.text))).toBe(true);
    expect(ev.some((e) => e.t === 'heal' && e.snap.over && e.snap.over > 0)).toBe(true);
    expect(overhealCap(b)).toBe(Math.ceil(maxHealth(b) / 2));
  });
  it('a healing move at full Health becomes Overheal too', () => {
    const me = createCreature('puddlit', 6), foe = createCreature('sproutle', 6);
    me.playbook = ['second-wind'];
    const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
    bt.sides[0].mods.speed = 10; me.health = 999; // moves first, and no knockout ending the battle early
    const ev = resolveRound(bt, { kind: 'move', move: 'second-wind' });
    expect(ev.some((e) => e.t === 'heal' && e.side === 0 && (e.snap.over ?? 0) > 0)).toBe(true);
    expect(ev.some((e) => e.t === 'say' && /gains \+1 Overheal/.test(e.text))).toBe(true);
  });
  it('Burn deals its damage at the end of the round, to the slower creature first', () => {
    for (const fast of [0, 1] as const) for (const run of [false, true]) {
      const me = createCreature('puddlit', 5), foe = createCreature('sproutle', 5); // (neither has an end-of-round Instinct)
      const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
      bt.sides[fast].mods.speed = 15;
      me.health = foe.health = 4; me.playbook = foe.playbook = ['brace'];
      for (const c of [me, foe]) bt.status[c.uid] = { id: 'burn', turns: 3 };
      if (run) { me.health = foe.health = 1; me.vitality = foe.vitality = 0; }
      const ev = resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'move', move: CATCH_BREATH.id });
      const burns = ev.filter((e) => e.t === 'damage').map((e) => (e.t === 'damage' ? [e.side, e.amount] : []));
      const slow = fast === 0 ? 1 : 0;
      // both about to fall: the slower one does, and the battle is over
      if (run) { expect(burns[0][0]).toBe(slow); expect(bt.over).toBe(slow === 0 ? 'lose' : 'win'); }
      else expect(burns).toEqual([[slow, BURN_DAMAGE], [fast, BURN_DAMAGE]]);
    }
    expect(STATUS_INFO.burn.text).toBe('Takes 2 damage at the end of each round (3 from Lv 8).');
    for (const [level, n] of [[7, 2], [8, 3], [12, 3]] as const) {
      const me = createCreature('puddlit', 5), foe = createCreature('sproutle', level);
      const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
      bt.sides[0].mods.speed = 25;
      bt.status[foe.uid] = { id: 'burn', turns: 3 };
      const hit = resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id }, { kind: 'move', move: CATCH_BREATH.id }).find((e) => e.t === 'damage');
      expect(hit?.t === 'damage' && hit.amount, `Lv ${level}`).toBe(n);
    }
  });
  it('Overheal soaks up damage before Health does', () => {
    const me = createCreature('puddlit', 5), foe = createCreature('zapup', 5);
    const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
    bt.sides[0].mods.speed = 10; bt.sides[0].team[0].health = 999; // faster, and no knockout ending the battle early // no Clash
    bt.overheal = { [foe.uid]: 3 };
    bt.status[foe.uid] = { id: 'burn', turns: 3 };
    const hp = foe.health;
    const ev = resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
    expect(foe.health).toBe(hp);
    expect(overhealOf(bt, foe)).toBe(3 - BURN_DAMAGE);
    expect(ev.some((e) => e.t === 'say' && /Overheal soaks up 2 damage/.test(e.text))).toBe(true);
  });
  it('Heartmend after losing a heart (back at full Health) overheals instead of wasting the heal', () => {
    withInstinct('mossprite', 'heartmend', () => {
      const me = createCreature('puddlit', 5), foe = createCreature('mossprite', 5);
      const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
      bt.sides[0].mods.speed = 10; bt.sides[0].team[0].health = 999; // faster, and no knockout ending the battle early
      foe.health = BURN_DAMAGE; foe.vitality = 2; // (Burn takes exactly the heart)
      bt.status[foe.uid] = { id: 'burn', turns: 3 };
      resolveRound(bt, { kind: 'move', move: CATCH_BREATH.id });
      expect(foe.health).toBe(maxHealth(foe));
      expect(overhealOf(bt, foe)).toBe(Math.min(3, overhealCap(foe)));
    });
  });
});

describe('Move keywords: Potency, Cascade, Purge, and status moves', () => {
  /** A battle where the player's creature (with `moves`) can't be knocked out and the foe only Tackles. */
  const arena = (moves: string[], foeSp = 'sproutle') => {
    const me = createCreature('puddlit', 8), foe = createCreature(foeSp, 8);
    me.playbook = moves; foe.playbook = ['tackle'];
    const bt = createBattle(side('player', [me]), side('wild', [foe]), WEATHER.clear);
    me.health = 999; foe.health = 999;
    bt.sides[0].mods.speed = 10; bt.sides[1].mods.evasion = -10; // we act first and never miss
    return { bt, me, foe };
  };

  it('Potency widens the status roll: Potency 3 on a d6 inflicts on 1–4 (67%)', () => {
    const m = MOVE_BY_ID['cinder-storm'];
    expect(m.potency).toBe(3);
    expect(statusFaces(m)).toBe(4);
    expect(statusChance(m)).toBeCloseTo(2 / 3);
    expect(statusChance(MOVE_BY_ID['ember'])).toBeCloseTo(0.5); // Potency 1 on a d4;
    expect(moveKeywords(m)[0].name).toBe('Potency 3');
    expect(m.text).toMatch(/Potency 3: Inflicts Burn on a damage roll of 1–4/);
  });

  it('a Potency attack inflicts its status on a roll above 1', () => {
    let seen = false;
    for (let i = 0; i < 200 && !seen; i++) {
      const { bt } = arena(['cinder-storm']);
      const ev = resolveRound(bt, { kind: 'move', move: 'cinder-storm' });
      const hit = ev.find((e) => e.t === 'damage' && e.side === 1);
      if (hit && hit.t === 'damage' && hit.calc && hit.calc.rolls[0] > 1) {
        const burned = ev.some((e) => e.t === 'status' && e.side === 1 && e.status === 'burn');
        expect(burned).toBe(hit.calc.rolls[0] <= 4);
        if (burned) seen = true;
      }
    }
    expect(seen).toBe(true);
  });

  it('Cascade: a top-face damage roll keeps rolling and adding (with the named die)', () => {
    expect(avgRoll(MOVE_BY_ID['flurry'])).toBeGreaterThan(2.5); // a plain d4 averages 2.5
    expect(moveKeywords(MOVE_BY_ID['avalanche-slam'])[0].name).toBe('Cascade d10');
    let chained = false;
    for (let i = 0; i < 300 && !chained; i++) {
      const { bt } = arena(['avalanche-slam']);
      const ev = resolveRound(bt, { kind: 'move', move: 'avalanche-slam' });
      const hit = ev.find((e) => e.t === 'damage' && e.side === 1);
      if (!hit || hit.t !== 'damage' || !hit.calc) continue;
      const ch = hit.calc.cascade?.[0];
      if (hit.calc.rolls[0] === 6) {
        expect(ch?.die).toBe(10);
        // every roll but the last is a 10; the last isn't (or the chain hit its safety cap)
        ch!.rolls.slice(0, -1).forEach((r) => expect(r).toBe(10));
        expect(ev.some((e) => e.t === 'say' && /^Cascade!/.test(e.text))).toBe(true);
        chained = true;
      } else expect(ch ?? null).toBeNull();
    }
    expect(chained).toBe(true);
  });

  it('Purge adds damage against a foe with the right status, and only then', () => {
    const m = MOVE_BY_ID['quench'];
    expect(purgeBonus(m, 'burn')).toBe(4);
    expect(purgeBonus(m, 'soak')).toBe(0);
    expect(purgeBonus(MOVE_BY_ID['heartbreaker'], 'soak')).toBe(2); // plain Purge: any status
    expect(purgeBonus(MOVE_BY_ID['heartbreaker'], undefined)).toBe(0);
    for (const burned of [true, false]) {
      const { bt, foe } = arena(['quench']);
      if (burned) bt.status[foe.uid] = { id: 'burn', turns: 3 };
      const ev = resolveRound(bt, { kind: 'move', move: 'quench' });
      const hit = ev.find((e) => e.t === 'damage' && e.side === 1);
      expect(hit && hit.t === 'damage' && hit.calc!.parts.some((x) => x.label === 'Purge: Burn' && x.value === 4)).toBe(burned);
    }
    // the readout says whether it applies
    const { bt, foe } = arena(['quench']);
    bt.status[foe.uid] = { id: 'burn', turns: 3 };
    expect(movePreview(bt, 'quench').find((x) => x.title.startsWith('Purge'))!.tone).toBe('good');
  });

  it('a status move inflicts its status on a hit, without damage', () => {
    const { bt } = arena(['smolder']);
    const ev = resolveRound(bt, { kind: 'move', move: 'smolder' });
    expect(ev.some((e) => e.t === 'status' && e.side === 1 && e.status === 'burn')).toBe(true);
    expect(ev.some((e) => e.t === 'damage' && e.side === 1 && e.calc)).toBe(false);
    // one status at a time
    const ev2 = resolveRound(bt, { kind: 'move', move: 'smolder' });
    expect(ev2.some((e) => e.t === 'say' && /already has Burn/.test(e.text))).toBe(true);
    // every type has one
    for (const t of TYPES) expect(MOVES.some((m) => m.kind === 'support' && m.type === t && m.status), t).toBe(true);
  });

  it('the readout and nameplate flag a foe whose Instinct keeps statuses off', () => {
    const { bt, foe } = arena(['smolder', 'cinder-storm']);
    foe.instinct = 'wet-coat'; // can never be Burned or Soaked
    expect(statusBlock(bt, 1, 'burn')).toMatch(/Wet Coat makes it immune to Burn/);
    expect(statusBlock(bt, 1, 'shock')).toBeNull();
    expect(movePreview(bt, 'smolder').find((x) => x.title.startsWith('Status'))!.title).toContain('blocked');
    expect(movePreview(bt, 'cinder-storm').find((x) => x.title.startsWith('Status chance'))!.text).toMatch(/won’t inflict Burn/);
    expect(statusGuard(bt, foe)!.text).toMatch(/immune to Burn and Soak/);
    // a shrug-off shows until it's spent
    foe.instinct = 'steel-coat';
    expect(statusGuard(bt, foe)!.text).toMatch(/shrug off the first status/);
    afflict(bt, 1, 'burn', []);
    expect(statusGuard(bt, foe)).toBeNull();
    expect(statusBlock(bt, 1, 'burn')).toBeNull();
  });
});

describe('Surrender', () => {
  const start = (kind: 'trainer' | 'arbiter' | 'wild') => {
    const s = newGame('A', 'balanced', 'thunder', 'emberfish', '#fff');
    s.coins = 41; s.initiative = 4;
    s.location = 'w1';
    const b = createBattle(W.playerSide(s), side(kind, [createCreature('zapup', 3)]), WEATHER.clear);
    return { s, b, me: b.sides[0].team[b.sides[0].active] };
  };
  it('loses the coins and Initiative a wipe would, and 3 Morale, but nobody is knocked out or sent home', () => {
    const { s, b, me } = start('trainer');
    me.morale = 6;
    const ev = resolveRound(b, { kind: 'surrender' });
    expect(b.over).toBe('lose');
    expect(ev.at(-1)).toMatchObject({ t: 'end', surrendered: 0 });
    expect(me.morale).toBe(3);
    expect(ev.some((e) => e.t === 'xp')).toBe(false); // given up before round 1
    const out = W.finishBattle(s, b, { kind: 'trainer' });
    expect(out.wiped).toBe(false);
    expect(s.location).toBe('w1');
    expect(me.ko).toBe(false);
    expect(s.initiative).toBe(0);
    expect(s.coins).toBeGreaterThanOrEqual(17); // (41 − d6) halved
    expect(s.coins).toBeLessThanOrEqual(20);
    expect(s.stats.record?.trainer?.lost).toBe(1);
  });
  it('takes half your coins against an Arbiter, earns no Merit, and Morale stops at 0', () => {
    const { s, b, me } = start('arbiter');
    me.morale = 2;
    resolveRound(b, { kind: 'surrender' });
    W.finishBattle(s, b, { kind: 'arbiter', city: 'thunder' });
    expect([me.morale, s.coins, s.merits.length]).toEqual([0, 20, 0]);
  });
  it('is not offered against wild creatures', () => {
    const { b } = start('wild');
    expect(resolveRound(b, { kind: 'surrender' })).toEqual([]);
    expect(b.over).toBeNull();
  });
  it('a challenged trainer can surrender a duel: the wager and their creature’s Morale, nothing more', () => {
    const { s: a } = start('trainer');
    const { s: z } = start('trainer');
    z.trainer.name = 'Z';
    const b = I.startChallenge(a, z)!;
    expect(b).toBeTruthy();
    const me = b.sides[1].team[b.sides[1].active];
    me.morale = 8;
    resolveRound(b, { kind: 'move', move: 'catch-breath' }, { kind: 'surrender' });
    expect(b.over).toBe('win');
    I.settleChallenge(a, z, b, 10);
    expect([me.morale, me.ko, a.coins, z.coins, z.initiative, z.location]).toEqual([5, false, 51, 31, 4, 'w1']);
  });
});

describe('World Log', () => {
  afterEach(() => setActiveMatch(null));
  const pair = () => {
    const a = newGame('A', 'balanced', 'thunder', 'emberfish', '#fff'), b = newGame('B', 'balanced', 'iron', 'puddlit', '#000');
    setActiveMatch(newMatch([a, b]));
    return { a, b };
  };
  it('merges every trainer’s deeds in the order they happened', () => {
    const { a, b } = pair();
    moveTrainer(a, 'w1');
    W.rest(b, 'iron');
    moveTrainer(a, 'thunder', { wiped: true });
    const seen = worldLog(b).map((x) => [x.who.trainer.name, x.deed.kind, x.deed.at]);
    expect(seen).toEqual([['A', 'move', 'thunder'], ['B', 'place', 'iron'], ['A', 'move', 'w1']]);
    expect(worldLog(a)).toEqual(worldLog(b));
    expect(worldLog(a)[0].deed.text).toMatch(/sent back to/);
  });
  it('tells the move, then what exploring turned up, then how the battle went (once)', () => {
    const { a } = pair();
    W.moveTo(a, neighbors('thunder').find((x) => x.node.kind === 'wild' && W.canMoveTo(a, x.node.id).ok)!.node.id);
    expect(a.deeds!.map((d) => d.kind)).toEqual(['explore', 'move']);
    const bt = createBattle(W.playerSide(a), side('trainer', [createCreature('zapup', 3)]), WEATHER.clear);
    resolveRound(bt, { kind: 'surrender' });
    W.recordResult(a, bt, 'trainer');
    W.finishBattle(a, bt, { kind: 'trainer' });
    expect(a.deeds!.filter((d) => d.kind === 'battle').map((d) => d.text)).toEqual(['surrendered to trainer']);
  });
  it('tells of events where they happened, and keeps only the latest entries', () => {
    const { a } = pair();
    E.rollEvent(a, 'balloon');
    E.resolveEvent(a, E.eventView(a)!.choices[0].id);
    expect(a.deeds!.map((d) => d.kind)).toEqual(['event', 'move']);
    expect(a.deeds![0].at).toBe('thunder');
    for (let i = 0; i < 200; i++) record(a, 'place', `x${i}`);
    expect(a.deeds!.length).toBe(DEEDS_MAX);
    expect(a.deeds![0].text).toBe('x199');
  });
});

describe('Attribute changes on the field', () => {
  const start = () => createBattle(side('player', [createCreature('emberfish', 5, { nature: 'bold' }), createCreature('puddlit', 5, { nature: 'bold' })]), side('wild', [createCreature('zapup', 5, { nature: 'bold' })]), WEATHER.overcast ?? WEATHER.clear);
  it('adds up moves, statuses and the Nabe, with where each comes from', () => {
    const b = start();
    b.weather = { ...b.weather, speed: 0, evasion: 0 };
    expect(boostsOf(b, 0)).toEqual([]);
    const c = activeOf(b.sides[0]);
    c.bonus = { ...c.bonus, power: 10, armor: 10 };
    b.sides[0].mods = { power: 2 };
    b.sides[0].buff = { armor: 1 };
    b.status[c.uid] = { id: 'stagger', rounds: 3 } as never;
    const list = boostsOf(b, 0);
    expect(list.find((x) => x.stat === 'power')).toEqual({ stat: 'power', n: 1, parts: [{ label: 'Moves and Instincts', value: 2 }, { label: 'Stagger', value: -1 }] });
    expect(list.find((x) => x.stat === 'armor')).toEqual({ stat: 'armor', n: 1, parts: [{ label: 'Nabe', value: 1 }] });
    expect(snap(b, c).boosts).toEqual(list);
    expect(snap(b, b.sides[0].team[1]).boosts).toBeUndefined(); // on the bench
    // what cancels out, or can't go lower, isn't shown
    b.sides[0].mods = { power: 1 };
    expect(boostsOf(b, 0).some((x) => x.stat === 'power')).toBe(false);
  });
  it('each event that changes them, and the end of each round, carries the new values', () => {
    const b = start();
    b.sides[0].mods = { power: 3 };
    const ev = resolveRound(b, { kind: 'move', move: CATCH_BREATH.id });
    if (!b.over && !b.needSwap) for (const si of [0, 1] as const) {
      const last = [...ev].reverse().find((e) => 'snap' in e && e.side === si) as { snap: ReturnType<typeof snap> };
      expect(last.snap).toEqual(snap(b, activeOf(b.sides[si])));
    }
  });
});
