// Set pieces for the baseline, so that nothing depends on a bot happening to find it.
import type { GameState, TrainerStyle } from '../../src/engine/state';
import type { Bot, Game } from './bot';

export interface Season { name: string; about: string; play: (b: Bot) => void }
export const KEYS = { 'canopy-rope': 1, 'root-whistle': 1, 'fog-lantern': 1, 'summit-pick': 1, 'ferry-pass': 1 };
export const SUPPLIES = { totem: 20, salve: 10, elixir: 10, 'trail-mix': 10, 'taxi-ticket': 3, 'homing-feather': 3, 'lure-incense': 3, 'hush-smoke': 3, 'star-charm': 3 };
export const MATERIALS = { 'sea-glass': 6, 'pine-resin': 6, 'volcanic-glass': 6, 'marsh-lotus': 6, 'glacier-salt': 6 };

/** A trainer who can go anywhere and beat most things. */
export function veteran(b: Bot, style: TrainerStyle, home: string, name: string, ids: readonly string[], bag: Record<string, number>): GameState {
  const { S, Stadium, Cr, Sw, content } = b.g;
  const s = S.newGame(name, style, home, 'sproutle', '#fff');
  s.roster = Stadium.buildTeam({ name, picks: ids.map((species, i) => ({ species, nature: content.NATURES[i].id })) });
  s.roster.forEach((c, i) => { c.uid = `${name}${i}`; c.morale = 8; c.teamwork = {}; c.swapMoves = {}; Cr.fullRestore(c); });
  s.roster[0].bond = true;
  Sw.assignSwapMoves(s.roster);
  s.following = s.roster[0].uid;
  s.coins = 500;
  for (const [id, n] of Object.entries(bag)) s.inventory[id] = (s.inventory[id] ?? 0) + n;
  return s;
}
const TEAM = ['redwarden', 'stormhound', 'polarion'];

/** Rested, well supplied and rich, for the next set piece. */
function ready(b: Bot, s: GameState) {
  s.reserve = s.reserve.slice(0, 4);
  while (s.roster.length < 3 && s.reserve.length) s.roster.push(s.reserve.shift()!);
  for (const c of [...s.roster, ...s.reserve]) { b.g.Cr.fullRestore(c); c.morale = 8; }
  for (const [id, n] of Object.entries({ ...SUPPLIES, ...MATERIALS })) s.inventory[id] = n;
  s.initiative = 5;
  s.coins = 500;
  s.event = undefined;
}

export function drills(g: Game): Season[] {
  const cities = Object.keys(g.map.CITIES);
  return [
    {
      name: 'drill-events', about: 'Every event, with every answer.',
      play: (b) => {
        const { E, map } = b.g;
        const s = veteran(b, 'balanced', 'hollow', 'E', TEAM, {});
        for (const id of E.EVENT_IDS) for (let k = 0; k < 5; k++) {
          ready(b, s);
          s.turn = E.EVENT_TIMES[id] === 'night' ? 42 : 41;
          s.location = E.EVENT_PLACES[id] === 'cloud' ? 'cloud2' : E.EVENT_PLACES[id] === 'floor' ? map.FOREST_FLOOR : k % 2 ? 'hollow' : 'n10';
          b.roll(`${id}|${k}`);
          E.rollEvent(s, id);
          const v = E.eventView(s)!;
          if (k >= v.choices.length) { s.event = undefined; break; }
          b.mark({ ...v, showcase: undefined });
          b.event(s, v.choices[k].id);
          b.write(s);
        }
      },
    },
    {
      name: 'drill-arbiters', about: 'Every Arbiter at every Tier, and a rematch.',
      play: (b) => {
        const { W, Imp, map } = b.g;
        for (const city of cities) for (let tier = 1; tier <= 5; tier++) {
          const s = veteran(b, 'urban', city, 'A', TEAM, { ...SUPPLIES, ...KEYS });
          s.turn = 50 + tier;
          s.merits = cities.filter((id) => id !== city).slice(0, [0, 2, 4, 6, 7][tier - 1]);
          if (tier === 5) s.merits.push(city); // a rematch
          s.location = city === 'gloom' ? map.FOREST_FLOOR : map.CITIES[city].arenaNode ?? city;
          s.flags.fabianFound = s.flags.salemWorthy = s.flags.stellaOpen = true;
          s.flags.dahliaTrail = 10;
          b.roll(`${city}|${tier}`);
          b.note(`tier ${W.arbiterHere(s)} ${W.arbiterGate(s, city).ok}`);
          b.count(`arbiter:${city}`);
          b.battle(s, W.arbiterBattle(s, city), { kind: 'arbiter', city }, city);
          for (const t of [...(s.imprints ?? [])]) { const c = s.roster.find((x) => Imp.imprintChoices(x, t).length); if (c) b.note(`imprint ${t} ${Imp.useImprint(s, c.uid, Imp.imprintChoices(c, t)[0], t)}`); }
          b.write(s);
        }
      },
    },
    {
      name: 'drill-gates', about: 'Every route and Arbiter, at each stage of a season: what’s open, what it costs, and what they say when it’s shut.',
      play: (b) => {
        const { W, S, map } = b.g;
        for (const merits of [0, 4, 8]) for (const keys of [{}, KEYS]) for (const turn of [41, 42, 91]) for (const wisp of [false, true]) {
          b.roll(`${merits}|${turn}`);
          const s = S.newGame('G', 'balanced', 'thunder', 'sproutle', '#fff');
          Object.assign(s.inventory, keys);
          s.turn = turn;
          s.merits = cities.slice(0, merits);
          s.flags.wisp = wisp;
          for (const n of map.MAP_NODES) {
            s.location = n.id;
            s.initiative = 5;
            const at = W.arbiterHere(s), gate = at ? W.arbiterGate(s, at) : null;
            b.mark([n.id, at, W.weather(s).name, W.travelBlock(s) === null, W.legendaryHere(s, n), W.townKeyItems(s, n.id)]);
            b.mark(map.neighbors(n.id).map((x) => { const c = W.canMoveTo(s, x.node.id); return [x.node.id, c.ok, c.cost, { text: c.reason }]; }));
            b.mark(gate && [gate.ok, gate.cloud, gate.show === 'floor' || undefined, gate.show === 'gauntlet' || undefined, gate.show === 'fabian' || undefined, { text: gate.reason }]);
            b.mark([W.bikeReach(s, 2), W.bikeReach(s, 6)]);
          }
          b.note(`gates keys${Object.keys(keys).length} wisp${wisp}`, [s.keyTowns, W.portalOpen(s)]);
          b.write(s);
        }
      },
    },
    {
      name: 'drill-circuit', about: 'Six trainers in one bracket, so some must meet, and one is away.',
      play: (b) => {
        const { S, W, Circuit } = b.g;
        const m = S.newMatch(['Al', 'Bea', 'Cam', 'Di', 'Ed', 'Fay'].map((name, i) => veteran(b, 'balanced', cities[i], name, i % 2 ? TEAM : ['pyrothane', 'mangrovore', 'mesahound'], {})));
        for (const p of m.players) { p.turn = 100; p.location = 'stadium'; p.merits = [...cities]; W.endTurn(p); }
        Circuit.openCircuit(m);
        Circuit.sendBot(m, 0);
        b.circuit(m);
      },
    },
    {
      name: 'drill-places', about: 'The Rainbow Plains, Cloud Island, the Forest Floor, the Gauntlet, the school, the Depths, Legendaries coming and going, and sponsors.',
      play: (b) => {
        const { W, S, N, Cr, map, npcs, content } = b.g;
        const s = veteran(b, 'nature', 'thunder', 'P', TEAM, KEYS);
        s.merits = ['thunder', 'canyon', 'mangrove', 'kilauea'];
        const at = (id: string, turn = s.turn) => { b.roll(`${id}|${turn}|${b.lines.length}`); S.moveTrainer(s, id); s.turn = turn; ready(b, s); };

        // the wisp and the Plains: in, around, and home, on several days
        for (const turn of [21, 23, 25, 91]) {
          at('mistfall', turn);
          b.g.wisps.rollWisp(s, b.g.tools);
          b.note(`wisp at ${s.flags.wispAt}`);
          at(s.flags.wispAt!);
          b.note(`wisp ${s.flags.wisp}`, W.activeEffects(s));
          at(map.LANTERN_GLADE);
          for (const id of map.RAINBOW_PLAINS) for (let k = 0; k < 4; k++) { at(id); b.count('biome:prism'); b.outcome(s, W.reexplore(s)); }
          b.note(`plains ${W.prismType(s)}`);
          at('mistfall');
          b.note(`wispGone ${s.flags.wisp} ${s.flags.wispAt}`);
          b.write(s);
        }
        // Cloud Island: a lap broken off with the satchel lost, then a lap made and the satchel brought home
        const ring = map.CLOUD_RING;
        for (const [k, walk] of [[0, 1, 2, 1, 2, 3], [0, 1, 2, 3, 4, 5, 0]].entries()) {
          at(ring[0], 42);
          for (let i = 1; i < walk.length; i++) { const from = ring[walk[i - 1]], to = ring[walk[i]]; S.moveTrainer(s, to); W.stepCloudLap(s, from, to); b.note(`lap ${W.cloudLapProgress(s).steps} ${!!s.flags.salemWorthy}`); }
          s.cloudLoot = { 'star-charm': 2 };
          S.moveTrainer(s, 'aurora', { wiped: k === 0 });
          b.note(`satchel ${s.cloudLoot === undefined} ${s.inventory['star-charm']}`);
          b.write(s);
        }
        // the Forest Floor: signs found and lost on leaving, and a smaller die once Dahlia is beaten
        for (const beaten of [false, true]) {
          if (beaten) s.merits.push('gloom');
          at(map.FOREST_FLOOR, 43);
          for (let k = 0; k < 14; k++) { ready(b, s); if (s.location === map.FOREST_FLOOR) b.outcome(s, W.reexplore(s)); }
          b.note(`floor d${s.merits.includes('gloom') ? 6 : 8} ${Math.min(3 + S.tierOf(s), s.flags.dahliaTrail ?? 0)}`);
          at('gloom');
          b.note(`signs ${s.flags.dahliaTrail}`);
          b.write(s);
        }
        // the Gauntlet: started and left, then finished
        const match = () => { ready(b, s); const r = W.gimmickBattle(s, 'gauntlet'); if (r) { b.count('gauntlet'); b.battle(s, r.battle, { kind: 'trainer', gimmick: 'gauntlet' }, `gauntlet ${r.match}/${r.of}`); } };
        at('iron', 45);
        match();
        b.note(`gauntlet ${s.flags.gauntletWins}`);
        at('n10');
        b.note(`reset ${s.flags.gauntletWins}`);
        at('iron');
        for (let k = 0; k < 40 && !s.flags.stellaOpen; k++) { if (s.location !== 'iron') at('iron'); match(); }
        b.note(`stella ${!!s.flags.stellaOpen}`);
        b.write(s);
        // the Battle School: a course finished, one cut short, and retraining
        for (const days of [4, 1]) {
          at('valor', 47);
          const c = s.roster[1];
          b.note(`school ${!!W.enrollTraining(s, c.uid, 6)}`);
          for (let k = 0; k < days; k++) b.endTurn(s);
          at('valor');
          b.note('pickup', W.pickUpTraining(s, c.uid));
        }
        at('valor', 51);
        const pupil = s.roster[1];
        b.note(`retrain ${!!W.enrollRetraining(s, pupil.uid, { nature: content.NATURES.find((x) => x.id !== pupil.nature)!.id })}`);
        for (let k = 0; k < 3; k++) b.endTurn(s);
        at('valor');
        b.note('pickup', W.pickUpTraining(s, pupil.uid));
        b.write(s);
        // the Depths, with each material
        for (const m of Object.keys(MATERIALS)) { at('depths', 55); const r = b.g.depths.exploreDepths(s, m, b.g.tools); if (r) { b.note(`depths ${m}`, r.stars); b.battle(s, r.battle, { kind: 'wild' }, 'depths'); } }
        b.write(s);
        // each Legendary: there, gone once beaten, and back when released or when its Loyalty runs out
        for (const [k, n] of map.MAP_NODES.filter((x) => x.kind === 'legendary').entries()) {
          at('quillhaven', 57);
          s.flags.beaten = [];
          const before = W.legendaryHere(s, n), c = Cr.createCreature(n.legendary!, 9);
          c.loyalty = 1;
          s.reserve = [c, ...s.reserve.slice(0, 3)];
          s.flags.beaten = [n.id];
          const held = W.legendaryHere(s, n);
          if (k % 2) b.note('research', W.releaseToResearch(s, c.uid)); else b.endTurn(s);
          b.note(`legend ${n.id} ${before} ${held} ${W.legendaryHere(s, n)}`);
          b.write(s);
        }
        // sponsors: every Champion's, for a trainer from elsewhere and one from their city
        for (const npc of npcs.NPCS.filter((x) => x.kind === 'champion')) for (const home of [npc.home === 'thunder' ? 'iron' : 'thunder', npc.home]) {
          s.trainer.home = home;
          s.sponsor = undefined;
          (s.npcs ??= {})[npc.id] = { met: 3, won: 1, lost: 1, owed: 0, rapport: 6, seen: [], revenges: 0 };
          at(N.championAt(s, npc, 61), 61);
          b.note(`sponsor ${npc.id} ${N.sponsorPerk(s, npc)} ${N.sponsor(s, npc)}`);
          at(npc.home);
          b.count('sponsorRest');
          b.note(`rest ${W.stableCost(s)}`, [W.rest(s, npc.home), W.wipeOptions(s), W.featherTargets(s)]);
          b.write(s);
        }
      },
    },
  ];
}
