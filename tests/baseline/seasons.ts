// The seasons the baseline bot plays. Between them they should take in every gimmick, city and system of Margos:
// tests/baseline.test.ts checks that they do.
import type { TrainerStyle } from '../../src/engine/state';
import type { Game } from './bot';
import { drills, veteran, KEYS, MATERIALS, SUPPLIES, type Season } from './drills';

const STYLES: TrainerStyle[] = ['balanced', 'nature', 'urban', 'whisperer', 'haggler', 'drill', 'caretaker', 'pathfinder'];

export function seasons(g: Game): Season[] {
  const cities = Object.keys(g.map.CITIES);
  const out: Season[] = STYLES.map((style, i) => ({
    name: `wander-${style}`, about: `A new trainer (${style}) from ${cities[i]} who does whatever comes up.`,
    play: (b) => { const s = b.g.S.newGame('W', style, cities[i], b.g.species.STARTERS[i], '#fff'); while (s.phase === 'map') b.wander(s); b.circuit(b.g.Circuit.soloGame(s)); },
  }));
  out.push({
    name: 'tour-arbiters', about: 'Buys the key items and challenges the Arbiters, with everything each one asks for.',
    play: (b) => {
      const s = veteran(b, 'urban', 'hollow', 'M', ['redwarden', 'stormhound', 'polarion'], SUPPLIES);
      const key = (id: string) => b.g.S.keyTownOf(s, id);
      b.tour(s, ['hollow', key('canopy-rope'), 'forestfloor', key('root-whistle'), 'saltmarsh', 'mangrove', 'thunder', 'canyon', 'iron', 'firepit', 'ridgeway', 'mistfall']);
      b.circuit(b.g.Circuit.soloGame(s));
    },
  });
  out.push({
    name: 'tour-cloud', about: 'One Merit short: Salem’s lap of Cloud Island (and the Eye), then the Circuit.',
    play: (b) => {
      const { map } = b.g;
      const s = veteran(b, 'balanced', 'aurora', 'C', ['pyrothane', 'mangrovore', 'mesahound'], { ...SUPPLIES, ...KEYS });
      s.turn = 41;
      s.merits = cities.filter((id) => id !== 'aurora');
      const gate = map.CLOUD_RING.find((id) => map.neighbors(id).some((x) => x.edge.via === 'portal'))!, i = map.CLOUD_RING.indexOf(gate);
      const lap = map.CLOUD_RING.map((_, k) => map.CLOUD_RING[(i + k) % map.CLOUD_RING.length]);
      b.tour(s, [...lap, gate, 'aurora', gate, map.CLOUD_EYE, gate, 'aurora']);
      b.circuit(b.g.Circuit.soloGame(s));
    },
  });
  out.push({
    name: 'tour-sights', about: 'The wisp, the Rainbow Plains, the Depths, the school, the Research Facility, and the towns.',
    play: (b) => {
      const { map, S } = b.g;
      const s = veteran(b, 'pathfinder', 'thunder', 'S', ['redwarden', 'mangrovore', 'polarion'], { ...SUPPLIES, ...KEYS, ...MATERIALS, bike: 1 });
      s.merits = cities.filter((id) => id !== 'aurora' && id !== 'gloom');
      b.roll('wisp');
      b.g.wisps.rollWisp(s, b.g.tools);
      b.tour(s, [s.flags.wispAt!, map.LANTERN_GLADE, ...map.RAINBOW_PLAINS, ...['depths', 'valor', 'quillhaven', 'depths', 'valor', 'lumber', 'dustmere', 'ridgeway', 'mistfall', 'saltmarsh', 'blackSand']]);
      b.circuit(b.g.Circuit.soloGame(s));
    },
  });
  out.push({
    name: 'tour-legendaries', about: 'Every Legendary’s grounds, and what it takes to get there.',
    play: (b) => {
      const { map } = b.g;
      const s = veteran(b, 'nature', 'canyon', 'L', ['stormhound', 'mesahound', 'polarion'], { ...SUPPLIES, ...KEYS, bike: 1 });
      s.merits = cities.filter((id) => id !== 'aurora');
      b.tour(s, map.MAP_NODES.filter((n) => n.kind === 'legendary' && n.id !== map.CLOUD_EYE).map((n) => n.id));
      b.circuit(b.g.Circuit.soloGame(s));
    },
  });
  out.push({
    name: 'tour-champions', about: 'Friends with everyone: sponsors, trades, invitations and side challenges.',
    play: (b) => {
      const s = veteran(b, 'caretaker', 'mangrove', 'F', ['mangrovore', 'redwarden', 'stormhound'], { ...SUPPLIES, ...KEYS, ...MATERIALS });
      s.merits = [...cities];
      s.npcs = {};
      for (const n of b.g.npcs.NPCS) s.npcs[n.id] = { met: 3, won: 1, lost: 1, owed: 0, rapport: 6, seen: [0], revenges: 0 };
      b.tour(s, ['mangrove', 'iron', 'thunder', 'canyon', 'hollow', 'gloom', 'kilauea', 'aurora', 'thunder', 'iron', 'hollow']);
      b.circuit(b.g.Circuit.soloGame(s));
    },
  });
  out.push({
    name: 'hotseat', about: 'Three trainers at one table: shared weather and Legendaries, gifts, trades and duels, one bracket.',
    play: (b) => {
      const { S, I, Cr } = b.g;
      const table = [['urban', 'hollow', 'Ann', ['redwarden', 'stormhound', 'polarion']], ['haggler', 'iron', 'Bo', ['pyrothane', 'mangrovore', 'mesahound']], ['drill', 'thunder', 'Cy', ['polarion', 'pyrothane', 'redwarden']]] as const;
      const m = S.newMatch(table.map(([style, home, name, ids]) => veteran(b, style, home, name, ids, { ...SUPPLIES, ...KEYS })));
      S.setActiveMatch(m);
      for (const [i, p] of m.players.entries()) {
        p.turn = 61;
        p.location = 'stadium';
        if (i < 2) p.merits = [...cities];
        const spare = Cr.createCreature(['puddlit', 'zapup', 'cindercub'][i], 4, { nature: 'x' });
        spare.nature = b.g.content.NATURES[i].id;
        Cr.fullRestore(spare);
        p.reserve.push(spare);
      }
      for (;;) {
        const s = m.players[m.current];
        const meet = m.players.find((p) => p !== s && p.phase === 'map' && I.sameSpot(p, s));
        if (meet && b.odds(0.7)) {
          b.roll(`${s.turn}|${s.trainer.name}|meet`);
          if (b.odds(0.5)) b.note('gift', { text: I.exchange(s, { coins: Math.min(5, s.coins), items: {} }, meet) });
          const c = s.reserve.find((x) => !x.bond), d = meet.reserve.find((x) => !x.bond);
          if (c && d) b.note('exchange', { text: I.exchange(s, { coins: 0, items: {}, creature: c.uid }, meet, { coins: 0, items: {}, creature: d.uid }) });
          const wager = Math.min(5, I.maxWager(s, meet)), f = I.startChallenge(s, meet);
          if (f) { b.fight(f); b.note(`duel ${f.over}`, { text: I.settleChallenge(s, meet, f, wager) }); b.spend(s); b.spend(meet); }
        }
        if ((s.turn > 88 || s.turn % 10 === 0) && m.current < 2) b.homeward(s, m); else b.wander(s, m);
        const next = S.nextSeat(m);
        if (next < 0) break;
        m.current = next;
      }
      b.circuit(m);
    },
  });
  out.push({
    name: 'stadium', about: 'Stadium Mode: a battle against every AI opponent.',
    play: (b) => {
      const { Stadium, Cr, content } = b.g;
      const f = Stadium.stadiumFoes();
      const s = Stadium.stadiumTrainer('T', '#fff', undefined, Stadium.buildTeam({ name: 'T', picks: ['redwarden', 'stormhound', 'polarion'].map((species, i) => ({ species, nature: content.NATURES[i].id })) }));
      for (const foe of [{ kind: 'random' } as const, ...f.champions, ...f.rivals, ...f.arbiters]) {
        b.roll(Stadium.foeName(foe));
        for (const c of s.roster) Cr.fullRestore(c);
        const x = Stadium.stadiumBattle(s, foe);
        if (x.arena) b.count(`arena:${x.arena.trick}`);
        b.fight(x);
        b.note(`stadium ${Stadium.foeName(foe)}:${x.over}`);
        b.write(s);
      }
    },
  });
  return [...out, ...drills(g)];
}
