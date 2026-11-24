// Rivals and Champions: their teams, history, Revenge, rematches and the Circuit Standings.
import { describe, it, expect } from 'vitest';
import { NPCS, NPC_BY_ID, npcNamed, passerBy } from '../src/data/npcs';
import { CITIES, FOREST_FLOOR, NODE_BY_ID } from '../src/data/map';
import { ITEMS } from '../src/data/content';
import * as N from '../src/engine/npcs';
import * as W from '../src/engine/world';
import * as E from '../src/engine/events';
import { newGame, migrate, moveTrainer, type GameState } from '../src/engine/state';
import { createCreature, speciesOf, stats, STAT_KEYS, recommendPlaybook, fits, energy, moveWorth, learnable } from '../src/engine/creature';
import { bestSwapMove, swapMoveOf, swapMoveSet } from '../src/engine/swaps';
import { teamworkOf } from '../src/engine/teamwork';
import { MOVE_BY_ID } from '../src/data/moves';
import { WEATHER } from '../src/data/content';
import { activeOf, aiSwap, createBattle, outlook, resolveRound } from '../src/engine/battle';
import { SPECIES } from '../src/data/species';
import type { Battle } from '../src/engine/battle';
import * as T from '../src/engine/messenger';
import { VOICES } from '../src/data/texts';
import * as X from '../src/engine/npcTrade';
import * as D from '../src/engine/dares';
import { IMPRINT_MAX, applyImprint, imprintBlock, imprintChoices, imprinted, useImprint } from '../src/engine/imprints';

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
  const until = (s: GameState, done: () => boolean) => { for (let i = 0; i < 300 && !done(); i++) { if (s.turn >= 90) { s.turn = 20; s.lastText = 0; for (const r of Object.values(s.npcs!)) r.chat = undefined; } else s.turn++; T.textTurn(s); } expect(done()).toBe(true); };
  it('everyone has a voice, with every kind of line filled in', () => {
    expect(Object.keys(VOICES).sort()).toEqual(NPCS.map((x) => x.id).sort());
    for (const [id, v] of Object.entries(VOICES)) {
      for (const [k, text] of Object.entries(v)) { expect(text.length, `${id}.${k}`).toBeGreaterThan(2); expect(text.replace(/\{(you|merit|place|thing|creature)\}/g, ''), `${id}.${k}`).not.toMatch(/[{}]/); }
      expect(v.congrats, id).toContain('{merit}');
      expect(v.news, id).toContain('{merit}');
      expect(v.stoodUp, id).toContain('{place}');
      expect(v.swap, id).toContain('{thing}');
      expect(v.keen, id).toContain('{creature}');
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

describe('trading with Rivals and Champions', () => {
  const meetUp = (turn = 45) => {
    const s = game();
    s.turn = turn;
    N.meet(s, rival).invite = { at: 'mistfall', from: turn, until: turn + 4 };
    s.location = 'mistfall';
    s.coins = 200;
    return s;
  };
  /** One of the trainer's that they'd take for a slot: the family they have already, at their level. */
  const matching = (s: GameState, slot: number) => { const x = N.npcRoster(s, rival)[slot]; const c = JSON.parse(JSON.stringify(x)); c.uid = 'mine'; return c as typeof x; };
  it('judge creatures by what they can do: attributes, level, Nature and growth', () => {
    const a = createCreature('rivetail', 5, { nature: 'bold' });
    const b = JSON.parse(JSON.stringify(a)) as typeof a;
    for (const k of STAT_KEYS) b.bonus[k] = (b.bonus[k] ?? 0) - 2;
    expect(X.creatureValue(b)).toBeLessThan(X.creatureValue(a) - 5);
    const up = JSON.parse(JSON.stringify(a)) as typeof a;
    up.bonus.power = (up.bonus.power ?? 0) + 3; up.bonus.vigor = (up.bonus.vigor ?? 0) + 2;
    expect(X.creatureValue(up)).toBeGreaterThan(X.creatureValue(a) + 5);
    // a level is worth about what training costs
    expect(X.creatureValue(createCreature('rivetail', 9, { nature: 'bold' })) - X.creatureValue(createCreature('rivetail', 4, { nature: 'bold' }))).toBeGreaterThan(20); // (growth is random)
    // taste never makes their own a bargain
    for (const id of ['rivetail', 'puddlit']) { const c = createCreature(id, 5); expect(X.askFor(rival, c)).toBeGreaterThan(X.payFor(rival, c)); }
  });
  it('won’t be left weaker, whatever the price', () => {
    const s = meetUp();
    s.coins = 5000;
    const { slot, c: theirs } = X.npcOffers(s, rival)[0];
    const ask = { coins: 0, stock: [], slot };
    const good = matching(s, slot);
    s.roster[1] = good;
    expect(X.teamBlock(s, rival, good, slot)).toBeNull();
    // attributes spoiled by training or events
    const weak = matching(s, slot);
    for (const k of STAT_KEYS) weak.bonus[k] = (weak.bonus[k] ?? 0) - 3;
    s.roster[2] = weak; weak.uid = 'weak';
    expect(X.verdict(s, rival, { coins: 4000, items: {}, creature: 'weak' }, ask).why).toMatch(/weak/);
    // no species whose line ends up clearly weaker gets onto the team, at any level
    const bar = X.potentialOf(theirs.species, theirs.nature);
    for (const sp of SPECIES.filter((x) => x.stage === 1 && x.rarity === 'common').slice(0, 30)) {
      const c = createCreature(sp.id, 12);
      if (X.potentialOf(sp.id, c.nature) < bar * 0.97) expect(X.teamBlock(s, rival, c, slot)).toBeTruthy();
      else if (!X.teamBlock(s, rival, c, slot)) expect(X.powerOf(N.npcCreature(s, rival, slot, theirs.level, { species: sp.id, nature: c.nature }))).toBeGreaterThanOrEqual(X.powerOf(theirs) * 0.95);
    }
    // a Champion won't take ordinary Commons for their Apexes
    s.turn = 85;
    N.meet(s, champ);
    const apex = X.npcOffers(s, champ).filter((x) => speciesOf(x.c).rarity === 'apex');
    expect(apex.length).toBeGreaterThan(0);
    const commons = SPECIES.filter((x) => x.stage === 1 && x.rarity === 'common').slice(0, 12).map((x) => createCreature(x.id, 9));
    const taken = commons.filter((c) => apex.some((a) => !X.teamBlock(s, champ, c, a.slot))).length;
    expect(taken).toBeLessThan(commons.length / 3);
    // nor more than one creature that isn't their own type
    const r = N.recordWith(s, rival)!;
    r.swaps = { 3: { species: 'puddlit', nature: 'bold' } };
    for (const sp of SPECIES.filter((x) => x.stage === 1 && !x.types.some((t) => rival.types.includes(t))).slice(0, 20)) expect(X.teamBlock(s, rival, createCreature(sp.id, 9), slot)).toBeTruthy();
  });
  it('a creature trade: one for one, never the Ace, bond or Legendary; yours joins their team', () => {
    const s = meetUp();
    const offers = X.npcOffers(s, rival);
    expect(offers.some((x) => x.c.ace)).toBe(false);
    const { slot, c: theirs } = offers[0];
    const mine = s.roster[1] = matching(s, slot);
    mine.nickname = 'Sparky';
    const ask = { coins: 0, stock: [], slot };
    expect(X.verdict(s, rival, { coins: 0, items: {}, creature: s.roster[0].uid }, ask).why).toMatch(/bond/);
    expect(X.verdict(s, rival, { coins: 200, items: {} }, ask).why).toMatch(/one for one/);
    const v = X.verdict(s, rival, { coins: 0, items: {}, creature: mine.uid }, ask);
    expect(v.ok).toBe(false);
    const offer = { coins: v.short, items: {}, creature: mine.uid };
    expect(X.verdict(s, rival, { ...offer, coins: v.short - 1 }, ask).ok).toBe(false);
    expect(X.trade(s, rival, offer, ask)).toBeNull();
    expect(s.coins).toBe(200 - v.short);
    expect(s.roster.some((c) => c.uid === mine.uid)).toBe(false);
    const got = [...s.roster, ...s.reserve].find((c) => c.species === theirs.species)!;
    expect(got.uid.startsWith('npc-')).toBe(false);
    expect(got).toMatchObject({ loyalty: 0, perks: 0, teamwork: {}, swapMoves: {} });
    expect(got.ace).toBeUndefined();
    expect(s.dex.caught).toContain(theirs.species);
    // it turns up on their side, with its name, and won't be traded again
    const now = N.npcRoster(s, rival)[slot];
    expect(now.nickname).toBe('Sparky');
    expect(speciesOf(now).types).toEqual(speciesOf(mine).types);
    expect(X.npcOffers(s, rival).some((x) => x.slot === slot)).toBe(false);
    expect(N.npcLineup(s, rival)).toHaveLength(N.npcRoster(s, rival).length);
  });
  it('by courier: coins and items only, from a stock and purse that run out', () => {
    const s = meetUp();
    s.location = 'thunder';
    expect(X.verdict(s, rival, { coins: 99, items: {}, creature: s.roster[1].uid }, { coins: 0, stock: [], slot: 1 }).why).toMatch(/face to face/);
    expect(X.npcStock(s, rival).every((id) => ITEMS[id])).toBe(true);
    expect(X.trade(s, rival, { coins: 60, items: {} }, { coins: 0, stock: [0, 3] })).toBeNull();
    expect(X.verdict(s, rival, { coins: 60, items: {} }, { coins: 0, stock: [0] }).why).toMatch(/any more/);
    s.turn += N.STAY;
    expect(X.verdict(s, rival, { coins: 60, items: {} }, { coins: 0, stock: [0] }).ok).toBe(true);
    const purse = X.npcPurse(s, rival);
    s.inventory.moonberry = 50;
    expect(X.verdict(s, rival, { coins: 0, items: { moonberry: 50 } }, { coins: purse + 1, stock: [] }).why).toMatch(/only have/);
    expect(X.trade(s, rival, { coins: 0, items: { moonberry: 50 } }, { coins: purse, stock: [] })).toBeNull();
    expect(X.npcPurse(s, rival)).toBe(0);
    expect(s.inventory.moonberry).toBeUndefined();
    s.inventory.bike = 1; s.inventory['summit-pick'] = 1;
    expect(X.verdict(s, rival, { coins: 0, items: { 'summit-pick': 1 } }, { coins: 0, stock: [1] }).why).toMatch(/can’t be traded/);
    expect(X.verdict(s, rival, { coins: 5, items: {} }, { coins: 5, stock: [] }).ok).toBe(false);
    expect(X.verdict(s, rival, { coins: -5, items: {} }, { coins: 0, stock: [1] }).ok).toBe(false);
  });
  it('buying and selling straight back never makes money', () => {
    const s = meetUp();
    for (const npc of NPCS) { N.meet(s, npc).rapport = 9; for (const id of Object.keys(ITEMS)) expect(X.itemWorth(npc, id), id).toBeLessThanOrEqual(ITEMS[id].price ?? 0); }
    expect(1.1 * X.asking(N.recordWith(s, rival))).toBeGreaterThanOrEqual(1); // what they ask, even of a friend
  });
  it('friends ask less, and someone miffed asks more', () => {
    const s = meetUp();
    const short = (rapport: number) => { N.recordWith(s, rival)!.rapport = rapport; return X.verdict(s, rival, { coins: 1, items: {} }, { coins: 0, stock: [0, 1, 2, 3] }).short; };
    expect(short(8)).toBeLessThan(short(0));
    expect(short(N.MIFFED)).toBeGreaterThan(short(0));
  });
  it('they text swaps and ask about creatures; meeting without battling isn’t standing them up', () => {
    const s = game();
    s.turn = 45;
    N.meet(s, rival);
    s.inventory = { moonberry: 3 };
    expect(T.trySwap(s, rival)).toBe(true);
    const o = T.chatWithNpc(s, rival)!.offer!;
    expect(T.reply(s, rival, 'deal')).toBe(true);
    expect(s.inventory[o.give]).toBe(1);
    expect(s.inventory.moonberry ?? 0).toBe(3 - o.n);
    s.inventory = {};
    expect(T.trySwap(s, rival)).toBe(false);
    s.turn = 45;
    s.roster[1] = matching(s, X.npcOffers(s, rival)[0].slot);
    expect(T.tryKeen(s, rival)).toBe(true);
    expect(T.reply(s, rival, 'meet')).toBe(true);
    const r = N.recordWith(s, rival)!;
    expect(r.keen).toBe(s.roster[1].uid);
    s.turn = r.invite!.from; s.location = r.invite!.at;
    const ask = { coins: 0, stock: [], slot: X.npcOffers(s, rival)[0].slot };
    const keen = X.verdict(s, rival, { coins: 0, items: {}, creature: s.roster[1].uid }, ask).short;
    r.keen = undefined;
    expect(X.verdict(s, rival, { coins: 0, items: {}, creature: s.roster[1].uid }, ask).short).toBeGreaterThan(keen);
    N.chatWith(s, rival);
    const mood = r.rapport;
    s.turn += 10; s.lastText = s.turn;
    N.npcTurn(s);
    expect(r.invite).toBeUndefined();
    expect(r.rapport).toBe(mood);
  });
});

describe('how Rivals, Champions and the AI play', () => {
  it('their creatures know playbooks that fit and the best Swap Move for each pair', () => {
    const s = game();
    s.turn = 65;
    for (const npc of [rival, champ]) {
      const team = N.npcTeam(s, npc, 3);
      for (const c of team) {
        expect(c.playbook).toEqual(recommendPlaybook(c, { kind: 'balanced' }, c.imprints?.[0]?.to));
        expect(fits(energy(c), c.playbook)).toBe(true);
        for (const p of team) if (p !== c) {
          expect(swapMoveSet(c, p)).toBe(true);
          expect(swapMoveOf(c, p)).toBe(bestSwapMove(c, p));
          expect(teamworkOf(c, p)).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
  it('recommended playbooks weigh every move element', () => {
    const c = createCreature('cindercub', 8);
    const foe = { types: ['rock' as const], armor: 3, ward: 3 };
    const m = MOVE_BY_ID['headbutt'];
    const w = (x: Partial<typeof m>) => moveWorth(c, { ...m, ...x }, foe);
    const base = w({});
    expect(w({ extraDice: [4] })).toBeGreaterThan(base);
    expect(w({ critRange: 3 })).toBeGreaterThan(base);
    expect(w({ cascade: true })).toBeGreaterThan(base);
    expect(w({ zeroIn: 3 })).toBeGreaterThan(w({ zeroIn: 0 }));
    expect(w({ effort: 4 })).toBeLessThan(base);
    expect(w({ speed: 3 })).toBeGreaterThan(base);
    expect(w({ effect: { foe: { armor: -1 } } })).toBeGreaterThan(base);
    const e = MOVE_BY_ID['ember'];
    expect(moveWorth(c, { ...e, potency: 2 }, foe)).toBeGreaterThan(moveWorth(c, { ...e, potency: 0 }, foe));
  });
  it('trainers swap out of a bad matchup, but not wild creatures, nor a duel’s human', () => {
    const mk = (kind: 'trainer' | 'champion' | 'wild' | 'arbiter') => {
      const me = createCreature('puddlit', 8), weak = createCreature('cindercub', 8, { nature: 'bold' }), strong = createCreature('sproutle', 8, { nature: 'bold' });
      me.playbook = ['splash', 'tide-slam'].filter((id) => MOVE_BY_ID[id]);
      if (!me.playbook.length) me.playbook = learnable(me).filter((id) => MOVE_BY_ID[id].type === 'water' && MOVE_BY_ID[id].kind === 'elemental').slice(0, 2);
      const b = createBattle({ kind: 'player', name: 'p', team: [me], active: 0, mods: {} }, { kind, name: 'q', team: [weak, strong], active: 0, mods: {} }, WEATHER.clear);
      b.round = 3;
      return b;
    };
    const swaps = (b: Battle) => Array.from({ length: 60 }, () => { b.aiSwapped = undefined; return aiSwap(b, 1); }).filter((x) => x === 1).length;
    expect(outlook(mk('champion'), 1, 1)).toBeGreaterThan(outlook(mk('champion'), 1, 0));
    expect(swaps(mk('champion'))).toBeGreaterThan(30);
    expect(swaps(mk('wild'))).toBe(0);
    const duel = mk('trainer'); duel.foeChooses = true;
    expect(swaps(duel)).toBe(0);
    const first = mk('champion'); first.round = 0;
    expect(swaps(first)).toBe(0); // swapping opens in round 2
    const again = mk('champion'); again.aiSwapped = 2;
    expect(Array.from({ length: 30 }, () => aiSwap(again, 1)).every((x) => x === null)).toBe(true);
  });
  it('keeps the Ace for last when someone else can go in', () => {
    for (let i = 0; i < 20; i++) {
      const s = game();
      s.turn = 65;
      const b = N.npcBattle(s, rival);
      const lead = b.sides[1].team[0];
      lead.health = 1; lead.vitality = 0;
      b.sides[0].mods.speed = 10;
      for (const c of b.sides[0].team) { c.vitality = 20; }
      for (let k = 0; k < 30 && !lead.ko; k++) { b.aiSwapped = b.round + 1; resolveRound(b, { kind: 'move', move: b.sides[0].team[b.sides[0].active].playbook[0] }); if (b.needSwap) break; }
      if (lead.ko) expect(activeOf(b.sides[1]).ace).toBeFalsy();
    }
  });
});

describe('side challenges', () => {
  const met = (turn = 30) => { const s = game(); s.turn = turn; s.coins = 50; N.meet(s, rival); N.meet(s, champ); N.meet(s, NPC_BY_ID.pim); return s; };
  const idea = (kind: D.DareKind, n: number, target?: string): D.DareIdea => ({ kind, n, turns: 8, ...(target ? { target } : {}) });
  it('everyone has three ideas, all possible, the same until the next stay', () => {
    const s = met();
    for (const npc of NPCS) {
      const list = D.ideas(s, npc);
      expect(list.length, npc.id).toBe(3);
      expect(new Set(list.map((d) => d.kind)).size).toBe(3);
      for (const d of list) { expect(D.ideaBlock(s, npc, d)).toBeNull(); expect(D.dareText(d)).not.toMatch(/undefined/); }
      expect(D.ideas(s, npc)).toEqual(list);
    }
    for (const k of Object.keys(D.DARE_ICON) as D.DareKind[]) expect(D.dareText({ kind: k, n: 2, turns: 5, target: k === 'recruit' ? 'fire' : 'thunder' })).not.toMatch(/undefined/);
  });
  it('one each and two in all, with a wager both can cover', () => {
    const s = met();
    expect(D.startDare(s, NPC_BY_ID.sol, idea('walk', 5))).toBe(false); // not met
    expect(D.startDare(s, rival, idea('walk', 5), 7)).toBe(false); // not a wager on offer
    s.coins = 3;
    expect(D.startDare(s, rival, idea('walk', 5), 5)).toBe(false);
    s.coins = 50;
    expect(D.startDare(s, rival, idea('walk', 5), 5)).toBe(true);
    expect(D.startDare(s, rival, idea('finds', 5))).toBe(false);
    expect(D.startDare(s, champ, idea('finds', 5))).toBe(true);
    expect(D.startDare(s, NPC_BY_ID.pim, idea('craft', 2))).toBe(false);
  });
  it('counts only what happens after it starts, and pays the winner', () => {
    const s = met();
    s.stats.steps = 40;
    D.startDare(s, rival, idea('walk', 5), 5);
    expect(D.checkDares(s)).toEqual([]);
    s.stats.steps = 44;
    expect(D.myProgress(s, D.dareWith(s, rival)!)).toBe(4);
    s.stats.steps = 45;
    const [r] = D.checkDares(s);
    expect(r.won).toBe(true);
    expect(s.coins).toBe(50 + D.darePrize(s, idea('walk', 5)).coins + 5);
    expect(s.inventory.dewberry).toBeGreaterThan(0);
    expect(D.dareWith(s, rival)).toBeUndefined();
    expect(T.chatWithNpc(s, rival)!.texts.slice(-1)[0].text).toBe(VOICES.bex.beaten);
    expect(D.dareBlock(s, rival)).toMatch(/breath/);
  });
  it('every kind can be won by doing it', () => {
    const win = (kind: D.DareKind, n: number, target: string | undefined, act: (s: GameState) => void) => {
      const s = met();
      expect(D.startDare(s, rival, idea(kind, n, target)), kind).toBe(true);
      expect(D.checkDares(s), kind).toEqual([]);
      act(s);
      expect(D.checkDares(s).map((x) => x.won), kind).toEqual([true]);
    };
    const battle = (s: GameState) => { const b = createBattle(W.playerSide(s), { kind: 'wild', name: 'w', team: [createCreature('zapup', 1)], active: 0, mods: {} }, WEATHER.clear); b.over = 'win'; W.finishBattle(s, b, { kind: 'wild' }); };
    const s0 = met();
    const far = [...D.walkSteps(s0.location)].find(([, n]) => n >= 8)![0];
    win('race', 1, far, (s) => moveTrainer(s, far));
    win('arbiter', 1, 'aurora', (s) => s.merits.push('aurora'));
    win('codex', 2, undefined, (s) => s.dex.seen.push('x', 'y'));
    win('solo', 3, undefined, (s) => {
      const d = D.dareWith(s, rival)!;
      s.roster[0].wins += 2; s.roster[1].wins += 2;
      expect(D.myProgress(s, d)).toBe(2); // they must all be one creature's
      const joined = createCreature('zapup', 3); joined.wins = 9; s.roster.push(joined);
      expect(D.myProgress(s, d)).toBe(2); // nor what a newcomer did before
      s.roster[0].wins++;
    });
    expect(Object.keys(D.DARE_ICON)).not.toContain('rain');
    win('night', 1, undefined, (s) => { s.turn = 32; battle(s); });
    win('nabe', 2, undefined, (s) => { W.rest(s, 'aurora'); W.rest(s, 'aurora'); expect(D.checkDares(s)).toEqual([]); W.rest(s, 'iron'); });
    win('coasts', 2, undefined, (s) => { moveTrainer(s, 'iron'); moveTrainer(s, 'blackSand'); });
    win('finds', 1, undefined, (s) => { W.claimFind(s, { itemRoll: 1, items: [{ id: 'salve', n: 1 }], coins: 0 }); });
    win('craft', 1, undefined, (s) => { s.stats.crafted = 1; });
    win('treats', 1, undefined, (s) => { s.inventory.sunberry = 1; W.useItem(s, 'sunberry', s.roster[0].uid); });
    win('recruit', 1, 'electric', (s) => { for (let i = 0; i < 80 && !D.myProgress(s, D.dareWith(s, rival)!); i++) { s.inventory.totem = 5; W.attemptRecruit(s, createCreature('zapup', 1), 'totem', []); } });
  });
  it('they finish on their turn: not before, and a trainer who got there the same turn still wins', () => {
    const s = met();
    D.startDare(s, rival, idea('walk', 99), 5);
    const d = D.dareWith(s, rival)!;
    const notes: string[] = [];
    while (s.turn < d.due) { s.turn++; notes.push(...D.dareTurn(s)); const p = D.theirProgress(s, d); expect(p.at).toBeLessThan(p.of); }
    expect(D.dareWith(s, rival)).toBe(d);
    expect(notes.filter((x) => x.includes('halfway')).length).toBe(1);
    s.turn++;
    expect(D.dareTurn(s).some((x) => x.includes('won the challenge'))).toBe(true);
    expect(s.coins).toBe(45);
    const t = met();
    D.startDare(t, rival, idea('walk', 5));
    t.stats.steps = (t.stats.steps ?? 0) + 5;
    t.turn = D.dareWith(t, rival)!.due + 1;
    expect(D.dareTurn(t)[0]).toMatch(/Challenge won/);
  });
  it('a race: they set out about as far away, and their pace is beatable', () => {
    const s = met();
    for (const npc of [rival, champ]) {
      const far = [...D.walkSteps(s.location)].find(([, n]) => n >= 12)!;
      D.startDare(s, npc, { kind: 'race', target: far[0], n: 1, turns: 0 });
      const d = D.dareWith(s, npc)!;
      expect(Math.abs(d.dist! - far[1])).toBeLessThanOrEqual(2);
      expect(d.due - s.turn + 1).toBeGreaterThanOrEqual(Math.ceil(far[1] / 5));
    }
    // being carried home doesn't count as arriving
    const t = met();
    const far = [...D.walkSteps(t.location)].find(([, n]) => n >= 8)![0];
    D.startDare(t, rival, idea('race', 1, far));
    moveTrainer(t, far, { wiped: true });
    t.location = 'thunder';
    expect(D.checkDares(t)).toEqual([]);
  });
  it('they text dares, which can be taken up; giving up counts as a loss; saves keep them', () => {
    const s = met();
    expect(T.tryDare(s, rival)).toBe(true);
    expect(T.reply(s, rival, 'dare')).toBe(true);
    expect(D.dareWith(s, rival)).toBeTruthy();
    const back = migrate(JSON.parse(JSON.stringify(s)))!;
    expect(D.dareWith(back, rival)).toEqual(D.dareWith(s, rival));
    expect(D.giveUp(s, rival)!.won).toBe(false);
    expect(N.recordWith(s, rival)!.daresLost).toBe(1);
  });
});

describe('arbiter rematches and energy imprints', () => {
  const beat = (s: GameState, city: string) => { const b = W.arbiterBattle(s, city); b.over = 'win'; return { b, sum: W.finishBattle(s, b, { kind: 'arbiter', city }) }; };
  it('a first win gives the Merit; a rematch, at the Tier now and after a rest, an Imprint', () => {
    const s = game();
    s.location = 'thunder';
    beat(s, 'thunder');
    expect(s.merits).toEqual(['thunder']);
    expect(s.imprints).toBeUndefined();
    expect(W.arbiterGate(s, 'thunder').ok).toBe(false);
    s.turn += W.ARBITER_REST;
    expect(W.arbiterGate(s, 'thunder').ok).toBe(true);
    s.merits = ['thunder', 'kilauea', 'canyon', 'iron'];
    const { b, sum } = beat(s, 'thunder');
    expect(b.arena!.tier).toBe(3);
    expect(b.sides[1].team).toHaveLength(3);
    expect(Math.min(...b.sides[1].team.map((c) => c.level))).toBe(7);
    expect(sum.coins).toBe(W.REMATCH_COINS * 3);
    expect(s.merits).toHaveLength(4);
    expect(s.imprints).toEqual(['electric']);
    expect(migrate(JSON.parse(JSON.stringify(s)))!.imprints).toEqual(['electric']);
  });
  it('losing a rematch gives nothing, and they don’t rest', () => {
    const s = game();
    s.merits = ['thunder'];
    const b = W.arbiterBattle(s, 'thunder'); b.over = 'lose';
    W.finishBattle(s, b, { kind: 'arbiter', city: 'thunder' });
    expect(s.imprints).toBeUndefined();
    expect(W.arbiterResting(s, 'thunder')).toBe(0);
  });
  it('Dahlia’s rematch needs the Forest Floor, not the trail', () => {
    const s = game();
    s.merits = ['gloom'];
    s.location = 'gloom';
    expect(W.arbiterGate(s, 'gloom').ok).toBe(false);
    s.location = FOREST_FLOOR;
    expect(W.arbiterGate(s, 'gloom').ok).toBe(true);
  });
  it('an Imprint swaps one energy, opens moves, and is spent', () => {
    const s = game();
    const c = createCreature(SPECIES.find((x) => x.types.join() === 'rock,water' && x.stage === 1)!.id, 1);
    s.roster.push(c);
    s.imprints = ['fire', 'fire'];
    const e0 = energy(c), can = learnable(c);
    expect(useImprint(s, c.uid, 'rock', 'steel')).toBe(false);
    expect(useImprint(s, c.uid, 'rock', 'fire')).toBe(true);
    expect(s.imprints).toEqual(['fire']);
    const e1 = energy(c);
    expect(e1).toMatchObject({ rock: e0.rock! - 1, fire: 1, water: e0.water });
    const now = learnable(c);
    expect(now.some((id) => !can.includes(id) && MOVE_BY_ID[id].cost.fire)).toBe(true);
    expect(fits(e1, c.playbook)).toBe(true);
    expect(c.playbook.every((id) => now.includes(id))).toBe(true);
    expect(recommendPlaybook(c, { kind: 'balanced' }, 'fire').some((id) => MOVE_BY_ID[id].cost.fire)).toBe(true);
  });
  it('limits: three a creature, never the last of its own types; changing one again doesn’t count', () => {
    const c = createCreature(SPECIES.find((x) => x.types.join() === 'rock,water' && x.stage === 1)!.id, 1);
    while (imprintChoices(c, 'fire').length) applyImprint(c, imprintChoices(c, 'fire')[0], 'fire');
    expect(c.imprints!.length).toBeLessThanOrEqual(IMPRINT_MAX);
    expect(energy(c).rock).toBeGreaterThanOrEqual(1);
    expect(energy(c).water).toBeGreaterThanOrEqual(1);
    const n = c.imprints!.length;
    expect(applyImprint(c, 'fire', 'grass')).toBe(true);
    expect(c.imprints).toHaveLength(n);
    // and back to what it was
    const total = Object.values(energy(c)).reduce((a, x) => a + x!, 0);
    const back = c.imprints!.find((x) => x.to === 'grass')!.from;
    expect(applyImprint(c, 'grass', back)).toBe(true);
    expect(c.imprints!.length).toBe(n - 1);
    expect(Object.values(energy(c)).reduce((a, x) => a + x!, 0)).toBe(total);
    expect(imprintBlock(c, 'steel', 'fire')).toMatch(/doesn’t generate/);
  });
  it('previews without touching the creature, for every species and type', () => {
    for (const sp of SPECIES) {
      const c = createCreature(sp.id, 1);
      const was = JSON.stringify(c);
      const to = (['fire', 'astral'] as const).find((t) => !sp.types.includes(t))!;
      const next = imprinted(c, sp.types[0], to);
      expect(JSON.stringify(c)).toBe(was);
      expect(energy(next)[to]).toBe(1);
      expect(next.playbook.length).toBeGreaterThan(0);
      expect(fits(energy(next), next.playbook)).toBe(true);
    }
  });
  it('Rivals and Champions teach some of their creatures a favourite type, with a move or two to show for it', () => {
    const s = game();
    let taught = 0, all = 0;
    for (const turn of [1, 25, 85]) {
      s.turn = turn;
      for (const npc of NPCS) for (const c of N.npcRoster(s, npc)) {
        all++;
        expect(fits(energy(c), c.playbook), c.species).toBe(true);
        const to = c.imprints?.[0]?.to;
        if (!to) continue;
        taught++;
        if (npc.kind === 'rival') expect(turn).toBeGreaterThan(1);
        expect(npc.types).toContain(to);
        const n = c.playbook.filter((id) => MOVE_BY_ID[id].cost[to] && MOVE_BY_ID[id].kind !== 'support').length;
        expect(n, `${npc.id} ${c.species}`).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(2);
      }
    }
    expect(taught).toBeGreaterThan(10);
  });
  it('an imprinted creature traded to them keeps its imprint', () => {
    const s = game();
    s.turn = 30;
    const r = N.meet(s, rival);
    const fam = N.npcFamilies(s, rival)[1];
    const to = fam.types.includes('astral') ? 'charm' : 'astral';
    r.swaps = { 1: { species: fam.id, nature: 'enduring', imprints: [{ from: fam.types[0], to }] } };
    expect(N.npcRoster(s, rival)[1].imprints).toEqual([{ from: fam.types[0], to }]);
  });
});
