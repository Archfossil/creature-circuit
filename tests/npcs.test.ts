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
import * as T from '../src/engine/messenger';
import { VOICES } from '../src/data/texts';

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

describe('helping a KO’d creature up', () => {
  it('Rousing Salts revive one anywhere, with half its hearts, and are only for the KO’d', () => {
    const s = game();
    const c = s.roster[0];
    s.inventory['rousing-salts'] = 2;
    expect(W.useItem(s, 'rousing-salts', c.uid)).toMatch(/must/);
    expect(s.inventory['rousing-salts']).toBe(2);
    c.ko = true; c.health = 0; c.vitality = 0; c.fatigue = 1;
    expect(W.useItem(s, 'salve', c.uid)).toMatch(/Rousing Salts/);
    expect(W.useItem(s, 'rousing-salts', c.uid)).toMatch(/back on its feet/);
    expect(c.ko).toBe(false);
    expect(c.vitality + 1).toBe(Math.ceil(stats(c).vigor / 2));
    expect(c.fatigue).toBe(1 + W.SALTS_FATIGUE);
    s.inventory['calm-tea'] = 1;
    W.useItem(s, 'calm-tea', c.uid);
    expect(c.fatigue).toBe(0);
    expect(s.inventory['rousing-salts']).toBe(1);
    for (const id of ['thunder', 'ridgeway', 'valor', 'depths', 'stadium']) expect(W.marketStock(id)).toContain('rousing-salts');
  });
  it('can be found while exploring, but not often', () => {
    const s = game();
    s.location = 'w1';
    let finds = 0, salts = 0;
    for (let i = 0; i < 6000; i++) { s.initiative = 5; const o = W.reexplore(s); if (o?.t === 'item') { finds++; if (o.items.some((x) => x.id === 'rousing-salts')) salts++; } }
    expect(salts).toBeGreaterThan(0);
    expect(salts / finds).toBeLessThan(0.04);
  });
  it('a Rival who knocks out the whole team offers; accepting skips the trip home', () => {
    const s = game();
    const at = s.location;
    s.coins = 40; s.initiative = 3;
    const lose = () => { const b = N.npcBattle(s, rival); for (const c of s.roster) { c.ko = true; c.health = 0; c.vitality = 0; } b.over = 'lose'; return b; };
    let b = lose();
    expect(N.mercyOffer(s, b)).toBe(rival);
    const uid = s.roster[1].uid;
    const out = W.finishBattle(s, b, { kind: 'trainer', mercy: uid });
    expect(out.wiped).toBe(false);
    expect(s.location).toBe(at);
    expect(s.initiative).toBe(3);
    expect(s.coins).toBeGreaterThan(30); // only the usual stakes
    expect(s.roster.map((c) => c.ko)).toEqual([true, false, true]);
    expect(N.recordWith(s, rival)).toMatchObject({ lost: 1, owed: 1 });
    // declined: home as usual
    b = lose();
    expect(W.finishBattle(s, b, { kind: 'trainer' }).wiped).toBe(true);
    // not from someone holding a grudge, a passer-by, or in the Finals
    b = lose(); N.recordWith(s, rival)!.rapport = N.MIFFED;
    expect(N.mercyOffer(s, b)).toBeNull();
    N.recordWith(s, rival)!.rapport = 0; s.phase = 'endgame';
    expect(N.mercyOffer(s, b)).toBeNull();
    s.phase = 'map'; b.sides[1].npc = undefined;
    expect(N.mercyOffer(s, b)).toBeNull();
    expect(W.finishBattle(s, b, { kind: 'trainer', mercy: uid }).wiped).toBe(true);
  });
});

describe('the messenger', () => {
  /** Pass turns until `npc` has a question waiting. */
  const until = (s: GameState, done: () => boolean) => { for (let i = 0; i < 300 && !done(); i++) { s.turn = s.turn >= 90 ? 20 : s.turn + 1; T.textTurn(s); } expect(done()).toBe(true); };
  it('everyone has a voice, with every kind of line filled in', () => {
    expect(Object.keys(VOICES).sort()).toEqual(NPCS.map((x) => x.id).sort());
    for (const [id, v] of Object.entries(VOICES)) {
      for (const [k, text] of Object.entries(v)) { expect(text.length, `${id}.${k}`).toBeGreaterThan(2); expect(text.replace(/\{(you|merit|place)\}/g, ''), `${id}.${k}`).not.toMatch(/[{}]/); }
      expect(v.congrats, id).toContain('{merit}');
      expect(v.news, id).toContain('{merit}');
      expect(v.stoodUp, id).toContain('{place}');
    }
  });
  it('only people you’ve met write, not too often, and never leave a blank in', () => {
    const s = game();
    for (let t = 2; t < 60; t++) { s.turn = t; expect(T.textTurn(s)).toEqual([]); }
    N.meet(s, rival); N.meet(s, champ); N.meet(s, NPC_BY_ID.pim);
    const times: number[] = [];
    for (let t = 60; t < 100; t++) { s.turn = t; if (T.textTurn(s).length) times.push(t); }
    expect(times.length).toBeGreaterThan(2);
    for (let i = 1; i < times.length; i++) expect(times[i] - times[i - 1]).toBeGreaterThanOrEqual(T.TEXT_EVERY);
    for (const x of T.chats(s)) for (const m of T.chatWithNpc(s, x)?.texts ?? []) expect(m.text).not.toMatch(/[{}]|undefined/);
    expect(T.unreadTexts(s)).toBe(times.length);
    expect(T.unreadTexts(migrate(JSON.parse(JSON.stringify(s)))!)).toBe(times.length);
  });
  it('congratulates a new Merit, and a kind answer warms them', () => {
    const s = game();
    N.meet(s, rival);
    s.turn = 10; T.textTurn(s);
    s.merits.push('aurora');
    until(s, () => T.chatWithNpc(s, rival)?.ask === 'congrats');
    expect(T.chatWithNpc(s, rival)!.texts.some((m) => m.text.includes('Polaris Merit'))).toBe(true);
    const before = N.recordWith(s, rival)!.rapport;
    expect(T.openers(s, rival)).toEqual([]); // answer first
    expect(T.reply(s, rival, 'kind')).toBe(true);
    expect(T.reply(s, rival, 'kind')).toBe(false);
    expect(N.recordWith(s, rival)!.rapport).toBe(before + 1);
    expect(T.chatWithNpc(s, rival)!.unread).toBe(0);
  });
  it('offers a rematch after a battle, and accepting arranges it nearby', () => {
    const s = game();
    s.turn = 10;
    settle(s, N.npcBattle(s, rival), 'lose');
    until(s, () => T.chatWithNpc(s, rival)?.ask === 'rematch');
    expect(T.chatWithNpc(s, rival)!.texts.slice(-1)[0].text).toBe(VOICES.bex.taunt);
    expect(T.reply(s, rival, 'accept')).toBe(true);
    expect(N.recordWith(s, rival)!.invite!.at).toBe(T.nearbyStop(s));
  });
  it('a question lapses, and being stood up gets a text', () => {
    const s = game();
    N.meet(s, rival);
    until(s, () => !!T.chatWithNpc(s, rival)?.ask);
    s.turn += T.ASK_LASTS; s.lastText = s.turn;
    T.textTurn(s);
    expect(T.chatWithNpc(s, rival)!.ask).toBeUndefined();
    s.turn = 20;
    N.inviteNpc(s, rival, 'mistfall');
    s.turn = 40;
    N.npcTurn(s);
    expect(T.chatWithNpc(s, rival)!.texts.some((m) => m.text.includes('Mistfall'))).toBe(true);
  });
  it('the trainer can write first, but not constantly, and conversations stay short', () => {
    const s = game();
    N.meet(s, rival);
    expect(T.writeFirst(s, rival, 'champions')).toBe(true);
    const tip = T.chatWithNpc(s, rival)!.texts.slice(-1)[0].text;
    expect(N.CHAMPIONS.some((x) => tip.includes(x.name) && tip.includes(NODE_BY_ID[N.championAt(s, x)].name))).toBe(true);
    expect(T.writeFirst(s, rival, 'hi')).toBe(false);
    for (let i = 0; i < 20; i++) { s.turn += T.WRITE_EVERY; expect(T.writeFirst(s, rival, 'hi')).toBe(true); }
    expect(T.chatWithNpc(s, rival)!.texts.length).toBe(T.CHAT_MAX);
  });
});
