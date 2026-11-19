import { describe, it, expect } from 'vitest';
import { effectiveness, TYPES, STRONG } from '../src/data/types';
import { SPECIES, SPECIES_BY_ID, STARTERS } from '../src/data/species';
import { MOVES, MOVE_BY_ID } from '../src/data/moves';
import { MAP_NODES, neighbors, CITIES } from '../src/data/map';
import { WEATHER, SEASON_INFO, seasonForTurn, ITEMS } from '../src/data/content';
import { createCreature, fits, energy, learnable, autoPlaybook, unlockNode, availableNodes, gainXp, maxHealth, maxVitality } from '../src/engine/creature';
import { createBattle, resolveRound, sendIn, chooseAI, type Side } from '../src/engine/battle';
import { newGame, tierOf } from '../src/engine/state';
import * as W from '../src/engine/world';

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
  it('the last node of a stage-1 chart evolves the creature', () => {
    const c = createCreature('emberfish', 1);
    c.points = 10;
    for (const id of ['a', 'b', 'd', 'f', 'evo']) expect(unlockNode(c, id), id).toBe(true);
    expect(c.species).toBe('cinderkoi');
    expect(c.unlocked).toEqual([]);
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
