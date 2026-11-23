// Rivals and Champions: their teams, history, Revenge, rematches and the Circuit Standings.
import { describe, it, expect } from 'vitest';
import { NPCS, NPC_BY_ID, npcNamed, passerBy } from '../src/data/npcs';
import { CITIES, NODE_BY_ID } from '../src/data/map';
import { ITEMS } from '../src/data/content';
import * as N from '../src/engine/npcs';
import * as W from '../src/engine/world';
import * as E from '../src/engine/events';
import { newGame, migrate, type GameState } from '../src/engine/state';
import { createCreature, speciesOf, stats, STAT_KEYS } from '../src/engine/creature';
import type { Battle } from '../src/engine/battle';

const game = () => {
  const s = newGame('T', 'balanced', 'thunder', 'puddlit', '#fff');
  s.roster.push(createCreature('zapup', 3), createCreature('pebbark', 3));
  s.prismSeed = 1234;
  return s;
};
const rival = NPC_BY_ID.bex, champ = NPC_BY_ID.ivo;
const settle = (s: GameState, b: Battle, over: 'win' | 'lose') => { b.over = over; return W.finishBattle(s, b, { kind: 'trainer' }); };

describe('rivals and champions', () => {
  it('have distinct ids and names, real homes and original Aces', () => {
    expect(new Set(NPCS.map((x) => x.id)).size).toBe(NPCS.length);
    expect(new Set(NPCS.map((x) => x.name)).size).toBe(NPCS.length);
    const s = game();
    for (const x of NPCS) {
      expect(CITIES[x.home], x.id).toBeTruthy();
      const fam = N.npcFamilies(s, x);
      expect(fam.length, x.id).toBe(5);
      expect(new Set(fam.map((f) => f.id)).size, x.id).toBe(5);
      expect(fam[0].types, x.id).toContain(x.types[0]);
    }
    for (let i = 0; i < 200; i++) expect(npcNamed(passerBy(i % 2 ? 'road' : 'hall'))).toBeUndefined();
  });
  it('keep the same creatures, which grow with the season', () => {
    const s = game();
    const a = N.npcRoster(s, rival), again = N.npcRoster(s, rival);
    expect(JSON.stringify(a)).toBe(JSON.stringify(again));
    const other = game(); other.prismSeed = 99;
    expect(N.npcFamilies(other, rival)[0].id).toBe(N.npcFamilies(s, rival)[0].id); // the Ace is always theirs
    s.turn = 85; s.merits = Object.keys(CITIES).slice(0, 6);
    const late = N.npcRoster(s, rival);
    expect(late.length).toBeGreaterThan(a.length);
    expect(late[0].level).toBeGreaterThan(a[0].level);
    expect(speciesOf(late[0]).stage).toBeGreaterThan(1);
    expect(late[0].nature).toBe(a[0].nature);
  });
  it('an Ace comes last, with the special bond, and never against a lone creature', () => {
    const s = game();
    s.turn = 45;
    const team = N.npcTeam(s, rival, 3);
    expect(team.map((c) => !!c.ace)).toEqual([false, false, true]);
    const ace = team[2];
    const plain = stats({ ...ace, bond: undefined });
    expect(stats(ace).vigor).toBe(plain.vigor + 1);
    expect(STAT_KEYS.every((k) => k === 'evasion' || speciesOf(ace).base[k] >= 0)).toBe(true);
    expect(N.npcTeam(s, rival, 1).some((c) => c.ace)).toBe(false);
  });
  it('a battle updates the record, what has been seen, and pays Revenge once per grudge', () => {
    const s = game();
    const lose = () => settle(s, N.npcBattle(s, rival), 'lose');
    lose(); lose();
    expect(N.recordWith(s, rival)).toMatchObject({ won: 0, lost: 2, owed: 2 });
    expect(N.recordWith(s, rival)!.seen.length).toBeGreaterThan(0);
    const before = { coins: s.coins, elixir: s.inventory.elixir ?? 0 };
    const won = settle(s, N.npcBattle(s, rival), 'win');
    expect(won.text.some((t) => /Revenge/.test(t))).toBe(true);
    expect(s.inventory.elixir).toBe(before.elixir + 1);
    expect(s.coins).toBeGreaterThan(before.coins + won.coins);
    expect(N.recordWith(s, rival)).toMatchObject({ won: 1, owed: 0, revenges: 1 });
    expect(settle(s, N.npcBattle(s, rival), 'win').text.some((t) => /Revenge/.test(t))).toBe(false);
    for (let k = 1; k < 9; k++) expect(ITEMS[N.revengeBonus(k)!.item]).toBeTruthy();
    expect(N.revengeBonus(9)).toEqual(N.revengeBonus(3));
  });
  it('a rematch: they travel to the place, wait, and leave if nobody comes', () => {
    const s = game();
    expect(N.inviteNpc(s, rival, 'mistfall')).toBe(false); // not met
    N.meet(s, rival);
    expect(N.inviteNpc(s, rival, 'w1')).toBe(false); // not a town
    expect(N.inviteNpc(s, rival, 'mistfall')).toBe(true);
    expect(N.inviteBlock(s, rival)).toBeTruthy();
    s.location = 'mistfall';
    expect(N.npcsHere(s)).not.toContain(rival);
    W.endTurn(s); W.endTurn(s);
    expect(N.npcsHere(s)).toContain(rival);
    expect(s.npcNotes!.some((t) => t.includes('waiting for you'))).toBe(true);
    const b = N.challengeNpc(s, rival)!;
    expect(b.sides[1].name).toBe(rival.name);
    settle(s, b, 'win');
    expect(N.recordWith(s, rival)!.invite).toBeUndefined();
    expect(N.inviteBlock(s, rival)).toMatch(/resting/);
    s.turn += N.NPC_REST;
    N.inviteNpc(s, rival, 'mistfall');
    const mood = N.recordWith(s, rival)!.rapport;
    for (let i = 0; i < 9; i++) { s.phase = 'map'; W.endTurn(s); }
    expect(N.recordWith(s, rival)!.invite).toBeUndefined();
    expect(N.recordWith(s, rival)!.rapport).toBe(mood - 1);
  });
  it('Champions tour the towns, one to a stop, and can be chatted with once a stay', () => {
    const s = game();
    for (const t of [1, 6, 33, 96]) {
      const at = N.CHAMPIONS.map((x) => N.championAt(s, x, t));
      expect(new Set(at).size).toBe(at.length);
      for (const id of at) expect(['city', 'town']).toContain(NODE_BY_ID[id].kind);
    }
    s.location = N.championAt(s, champ);
    expect(N.npcsHere(s)).toContain(champ);
    expect(N.chatWith(s, champ)?.line).toBe(champ.lines.chat);
    expect(N.chatWith(s, champ)).toBeNull();
    const b = N.challengeNpc(s, champ)!;
    expect(b.sides[1].kind).toBe('champion');
    expect(b.sides[1].npc).toBe('ivo');
  });
  it('the Circuit: Champions lead unless a Rival has earned a place, and merits only grow', () => {
    const s = game();
    expect(N.standings(s).filter((x) => x.seeded).every((x) => x.npc.kind === 'champion')).toBe(true);
    for (const x of NPCS) { let had = 0; for (let t = 1; t <= 100; t++) { const m = N.npcMerits(s, x, t).length; expect(m).toBeGreaterThanOrEqual(had); expect(m).toBeLessThanOrEqual(8); had = m; } }
    s.turn = 100;
    expect(N.npcMerits(s, champ).length).toBe(8);
    expect(N.RIVALS.filter((x) => N.npcMerits(s, x).length === 8).length).toBeLessThan(3);
    settle(s, N.npcBattle(s, rival), 'lose'); settle(s, N.npcBattle(s, rival), 'lose');
    expect(N.isContender(s, rival)).toBe(true);
    const field = N.circuitField(s);
    expect(field).toHaveLength(N.FIELD);
    expect(new Set(field).size).toBe(N.FIELD);
    expect(field.slice(0, 3)).toContain(rival); // someone you'll meet
    W.startEndgame(s);
    expect(s.endgame!.bracket).toEqual(['T', ...field.map((x) => x.name)]);
    const b = W.endgameBattle(s);
    expect(b.sides[1].team).toHaveLength(3);
    expect(b.sides[1].team.some((c) => c.ace)).toBe(true);
    s.endgame!.bracket[1] = 'Champion Tamsin'; // a bracket from an older save
    expect(W.endgameBattle(s).sides[1].team).toHaveLength(3);
  });
  it('Rivals turn up on the road, in Halls and in the morning event', () => {
    const s = game();
    const names = new Set<string>();
    for (let i = 0; i < 300; i++) { s.initiative = 5; s.flags.sparred = []; names.add(W.hallBattle(s)!.name); }
    const rivals = [...names].filter((x) => npcNamed(x));
    expect(rivals.length).toBeGreaterThan(0);
    expect(rivals.length).toBeLessThan(names.size);
    expect(rivals.every((x) => npcNamed(x)!.kind === 'rival')).toBe(true);
    const t = game();
    E.rollEvent(t, 'rival');
    expect(NPC_BY_ID[t.event!.data.npc as string].kind).toBe('rival');
    const r = E.resolveEvent(t, 'fight')!;
    expect(r.battle!.sides[1].npc).toBeTruthy();
    expect(migrate(JSON.parse(JSON.stringify(t)))!.npcs).toEqual(t.npcs);
  });
});
