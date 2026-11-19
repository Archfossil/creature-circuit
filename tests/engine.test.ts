import { describe, it, expect } from 'vitest';
import { effectiveness, TYPES, STRONG } from '../src/data/types';
import { SPECIES, SPECIES_BY_ID, STARTERS } from '../src/data/species';
import { ROSTER, TYPE_COMBOS, FAMILY_RARITIES } from '../src/data/roster';
import { MOVES, MOVE_BY_ID, CATCH_BREATH, ATTACK_SLOTS, costKey, slotKey } from '../src/data/moves';
import { MAP_NODES, MAP_EDGES, neighbors, CITIES, NODE_BY_ID, BIOME_TYPES, TOWNS } from '../src/data/map';
import type { MapNode } from '../src/data/schema';
import { landmassOf, landField } from '../src/render/land';
import { WEATHER, SEASON_INFO, seasonForTurn, ITEMS } from '../src/data/content';
import { recommendPlaybook, suggestGoal, expectedDamage, stats, nameOf, createCreature, allocateEnergy, fits, energy, learnable, autoPlaybook, unlockNode, availableNodes, progressionTree, gainXp, participationXp, maxHealth, maxVitality } from '../src/engine/creature';
import { createBattle, resolveRound, sendIn, chooseAI, activeOf, typeMatchup, movePreview, chooseLead, type Side } from '../src/engine/battle';
import { newGame, tierOf, migrate, SAVE_VERSION } from '../src/engine/state';
import * as W from '../src/engine/world';
import * as E from '../src/engine/events';
import { Box3 } from 'three';
import { buildTrainer, playerLook, arbiterLook, championLook, roamingLook, SKIN, HAIR, PANTS, HAT_OPTIONS, JACKET_OPTIONS, HAIR_STYLE_OPTIONS } from '../src/render/trainerModel';

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
  it('Health = Vitality = Vigor by default', () => {
    const c = createCreature('cindercub', 1, { nature: 'timid' });
    expect(maxHealth(c)).toBe(c.health);
    expect(maxVitality(c)).toBe(maxHealth(c));
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
    expect(W.canMoveTo(s, 'blackSand').ok).toBe(false); // ferry needs a pass or Sail
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
          expect(dStep.title).toContain(m.kind === 'physical' ? 'Power' : 'Focus');
          if (m.dmgDie) expect(dStep.title).toContain(`d${m.dmgDie}`);
          for (let i = 0; i < 40; i++) {
            // creatures roll their own stats, so preview the exact battle that then resolves
            const bt = createBattle(side('player', [createCreature(id, 6)]), side('wild', [createCreature('sproutle', 6)]), WEATHER.clear);
            const range = /Deals (\d+)(?:–(\d+))? damage/.exec(movePreview(bt, moveId).find((x) => x.title.startsWith('Damage'))!.text)!;
            const lo = Number(range[1]), hi = Number(range[2] ?? range[1]);
            activeOf(bt.sides[1]).health = 999;
            bt.sides[1].mods.speed = -20; // act first, so the foe's move can't shift stats before we hit
            const hit = resolveRound(bt, { kind: 'move', move: moveId }).find((e) => e.t === 'damage' && e.side === 1 && e.calc);
            if (hit && hit.t === 'damage' && hit.calc) {
              expect(hit.calc.raw).toBe(Math.max(1, hit.calc.roll + hit.calc.parts.reduce((a2, x) => a2 + x.value, 0)));
              expect(hit.amount).toBe(hit.calc.total);
              const base = hit.calc.crit ? hit.amount / 2 : hit.amount;
              expect(base).toBeGreaterThanOrEqual(lo);
              expect(base).toBeLessThanOrEqual(hi);
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
    c.morale = 0; c.moraleWarned = true; c.moraleMark = 0; c.loyalty = 0;
    const r = report();
    W.moraleAndLoyalty(s, r);
    expect(s.roster).toContain(c);
    expect(r.checks[0].left).toBe(false);
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
});

describe('camping', () => {
  it('tends one creature per Initiative left, most wounded first', () => {
    const s = newGame('T', 'balanced', 'mangrove', 'puddlit', '#fff');
    s.roster.push(createCreature('zapup', 5), createCreature('pebbark', 5));
    const [a, b, c] = s.roster;
    a.vitality = maxVitality(a) - 1; b.vitality = 1; c.vitality = maxVitality(c); c.fatigue = 2;
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
    const attacks = MOVES.filter((m) => m.kind === 'elemental' && !m.id.startsWith('sig-'));
    for (const slot of ATTACK_SLOTS) {
      const total = Object.values(slot.cost).reduce<number>((a, v) => a + (v ?? 0), 0);
      expect(total).toBeLessThanOrEqual(5);
      const hits = attacks.filter((m) => costKey(m.cost) === costKey(slot.cost) && m.type === slot.type);
      expect(hits.length, slotKey(slot.cost, slot.type)).toBe(1);
      // the hit type is never the smaller share of the cost
      for (const [k, v] of Object.entries(slot.cost)) expect(slot.cost[slot.type]!, k).toBeGreaterThanOrEqual(v!);
    }
  });
  it('even splits get one attack per type, so 2 Fire + 2 Grass hits as Fire and as Grass', () => {
    const twoTwo = MOVES.filter((m) => m.cost.fire === 2 && m.cost.grass === 2);
    expect(twoTwo.map((m) => m.type).sort()).toEqual(['fire', 'grass']);
    const oneOne = MOVES.filter((m) => m.cost.water === 1 && m.cost.rock === 1 && Object.keys(m.cost).length === 2);
    expect(oneOne.map((m) => m.type).sort()).toEqual(['rock', 'water']);
  });
  it('every type leads the same number of attacks', () => {
    const attacks = MOVES.filter((m) => m.kind === 'elemental' && !m.id.startsWith('sig-'));
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
    expect(ph.length).toBe(36 * 3 * 3 - 8 * 3 + 36 - 2);
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
        expect(W.speciesPool(node.biome, sp.types[0], sp.rarity, minStage)).toContain(sp);
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
    expect(E.EVENT_IDS.length).toBeGreaterThanOrEqual(12);
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
        const r = E.resolveEvent(s, ch.id, target?.uid);
        expect(r, `${id}:${ch.id}`).not.toBeNull();
        expect(r!.text.length).toBeGreaterThan(0);
        expect(s.event).toBeUndefined();
        expect(s.coins).toBeGreaterThanOrEqual(0);
        expect(s.roster.length).toBeGreaterThan(0);
      }
    }
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
  it('the ferry from Kilauea Forge needs a Ferry Pass (sold at the Forge) or Sail', () => {
    const s = newGame('T', 'balanced', 'kilauea', 'puddlit', '#fff');
    expect(W.canMoveTo(s, 'blackSand').ok).toBe(false);
    expect(W.marketStock('kilauea')).toContain('ferry-pass');
    s.inventory['ferry-pass'] = 1;
    expect(W.canMoveTo(s, 'blackSand').ok).toBe(true);
  });
  it('Kilauea island is its own landmass and fits on the terrain', () => {
    const island = landmassOf('firepit').sort();
    expect(island).toContain('blackSand');
    expect(island).not.toContain('kilauea');
    expect(island).not.toContain('mangrove');
    for (const id of island) expect(['blackSand', 'firepit'].includes(id) || NODE_BY_ID[id].kind === 'wild', id).toBe(true);
    let maxZ = -1e9;
    for (let x = -90; x <= 90; x += 2) for (let z = 40; z <= 100; z += 1) if (landField(x, z) > 0.05) maxZ = Math.max(maxZ, z);
    expect(maxZ).toBeLessThanOrEqual(83); // terrain mesh ends at z = 84
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
  it('every jacket and hat builds a mini of a sensible size', () => {
    for (const j of JACKET_OPTIONS) for (const hat of HAT_OPTIONS) for (const hs of HAIR_STYLE_OPTIONS) {
      const rig = buildTrainer(playerLook('Rowan', '#ff6b3d', { jacket: j.id, hat: hat.id, hairStyle: hs.id }));
      const box = new Box3().setFromObject(rig.root);
      expect(box.max.y, `${j.id}/${hat.id}`).toBeGreaterThan(1.6);
      expect(box.max.y, `${j.id}/${hat.id}`).toBeLessThan(2.4);
    }
  });
  it('builds a mini that stands on its base, about two units tall', () => {
    const rig = buildTrainer(roamingLook('Scout Ola'));
    const box = new Box3().setFromObject(rig.root);
    expect(box.min.y).toBeCloseTo(0, 1);
    expect(box.max.y).toBeGreaterThan(1.6);
    expect(box.max.y).toBeLessThan(2.4);
  });
});
