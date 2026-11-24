// A bot that plays with seeded dice and writes down what happens (tests/baseline.test.ts). The same seed must always
// tell the same story, so a change that should change nothing can be proved to. Its own choices come from a separate
// die, so they don't disturb the game's. The seasons it plays are in seasons.ts.
import { createHash } from 'node:crypto';
import type { Battle } from '../../src/engine/battle';
import type { CreatureInst } from '../../src/engine/creature';
import type { GameState, Match } from '../../src/engine/state';
import type { Outcome } from '../../src/engine/world';

/** The engine. A new copy for every season: its caches could let one season's dice depend on another's. */
export async function loadGame() {
  const [W, S, B, E, N, T, M, D, I, Cr, Circuit, Stadium, Imp, Sw, map, species, content, npcs, { tools }, depths] = await Promise.all([
    import('../../src/engine/world'), import('../../src/engine/state'), import('../../src/engine/battle'), import('../../src/engine/events'),
    import('../../src/engine/npcs'), import('../../src/engine/npcTrade'), import('../../src/engine/messenger'), import('../../src/engine/dares'), import('../../src/engine/interactions'),
    import('../../src/engine/creature'), import('../../src/engine/circuit'), import('../../src/engine/stadium'), import('../../src/engine/imprints'), import('../../src/engine/swaps'),
    import('../../src/data/map'), import('../../src/data/species'), import('../../src/data/content'), import('../../src/data/npcs'),
    import('../../src/engine/tools'), import('../../src/regions/margos/gimmicks/depths'),
  ]);
  return { W, S, B, E, N, T, M, D, I, Cr, Circuit, Stadium, Imp, Sw, map, species, content, npcs, tools, depths };
}
export type Game = Awaited<ReturnType<typeof loadGame>>;

/** Dice from a seed (mulberry32), counting how many were rolled. */
export function dice(seed: string) {
  let a = createHash('sha1').update(seed).digest().readInt32LE(0), rolls = 0;
  return {
    next: () => { rolls++; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
    get rolls() { return rolls; },
  };
}

/** What's written for people to read, which can be reworded without the rules changing. */
const WORDING = new Set(['log', 'deeds', 'circuitNews', 'npcNotes', 'inbox', 'teamworkNews', 'teamworkFell', 'lastBattle', 'texts', 'text', 'label', 'line']);
/** What a save will gain without its play changing (docs/16-region-packages.md, step 8). */
const IGNORED = new Set(['region', 'rulesVersion']);
function tidy(v: unknown, words: boolean): unknown {
  if (Array.isArray(v)) return v.map((x) => tidy(x, words));
  if (!v || typeof v !== 'object') return v;
  const o: Record<string, unknown> = {};
  for (const k of Object.keys(v).sort()) if (!IGNORED.has(k) && (words || !WORDING.has(k))) o[k] = tidy((v as Record<string, unknown>)[k], words);
  return o;
}
const json = (v: unknown, words: boolean) => JSON.stringify(tidy(v, words)) ?? '';

export class Bot {
  lines: string[] = [];
  /** How often each thing happened, over the season. */
  did: Record<string, number> = {};
  private rules = createHash('sha1');
  private words = createHash('sha1');
  private real = Math.random;
  private game = dice('');
  private mine: ReturnType<typeof dice>;
  private turnText: string[] = [];

  constructor(public g: Game, public seed: string) { this.mine = dice(`${seed}|choices`); }
  start() { this.roll('start'); Math.random = () => this.game.next(); }
  stop() { Math.random = this.real; this.g.S.setActiveMatch(null); }
  /** New dice for a turn, so a difference doesn't spread further than it has to. */
  roll(turn: string) { this.game = dice(`${this.seed}|${turn}`); }
  /** The bot's own choices. */
  rnd(n: number) { return Math.floor(this.mine.next() * n); }
  any<X>(l: readonly X[]): X { return l[this.rnd(l.length)]; }
  odds(p: number) { return this.mine.next() < p; }

  /** Stands behind the marks, without being written out. */
  mark(detail: unknown) { this.rules.update(json(detail, false)); this.words.update(json(detail, true)); }
  count(what: string) { this.did[what] = (this.did[what] ?? 0) + 1; }
  note(what: string, detail: unknown = null) {
    this.count(what.split(/[ +]/)[0]);
    this.turnText.push(what);
    this.mark([what, detail]);
  }
  /** Write a trainer's turn down: what they did, where it left them, and marks that stand for everything else. */
  write(s: GameState) {
    this.mark([s, this.game.rolls]);
    const mark = (h: ReturnType<typeof createHash>) => h.copy().digest('hex').slice(0, 8);
    const team = s.roster.map((c) => `${c.species}${c.level}${c.ko ? '†' : ''}`).join(',');
    this.lines.push(`T${s.turn} ${s.trainer.name} @${s.location} coins${s.coins} merits${s.merits.length} [${team}]+${s.reserve.length} dice${this.game.rolls} rules:${mark(this.rules)} words:${mark(this.words)} | ${this.turnText.join('; ')}`);
    this.turnText = [];
  }

  // ── Battles ──────────────────────────────────────────────────
  fight(b: Battle, opts: { run?: boolean } = {}) {
    const { B } = this.g;
    if (opts.run) this.note('ran', B.resolveRound(b, { kind: 'run' }));
    for (let n = 0; n < 200 && !b.over; n++) {
      if (b.needSwap) { this.mark(B.sendIn(b, b.sides[0].team.findIndex((x) => !x.ko))); continue; }
      this.mark([B.ringLeft(b), B.resolveRound(b, B.chooseAI(b, 0))]);
      if (b.foeNeedSwap && !b.over) this.mark(B.foeSendIn(b, B.foeReplacements(b)[0]));
    }
    if (!b.over) { b.over = 'escaped'; this.note('stalemate'); } // both sides walk away
  }
  battle(s: GameState, b: Battle, ctx: Parameters<Game['W']['finishBattle']>[2], name: string): boolean {
    const { W, N, B } = this.g;
    if (W.needsLeadChoice(s)) B.chooseLead(b, s.roster.findIndex((c) => !c.ko));
    this.fight(b, { run: ctx.kind === 'wild' && !b.legendary && this.odds(0.1) });
    // (the same order as the game's: app.ts → runBattle)
    W.recordResult(s, b, ctx.kind, ctx.city);
    const wild = b.sides[1].team[0];
    if (b.over === 'win' && (ctx.kind === 'wild' || ctx.kind === 'legendary')) this.recruit(s, wild);
    const helper = ctx.kind === 'trainer' ? N.mercyOffer(s, b) : null;
    const mercy = helper && this.odds(0.7) ? s.roster[0].uid : undefined;
    if (mercy) this.note('mercy');
    const wipeTo = !mercy && s.roster.every((c) => c.ko) && W.wipeOptions(s).length > 1 ? this.any(W.wipeOptions(s)) : undefined;
    const sum = W.finishBattle(s, b, { ...ctx, wipeTo, mercy });
    this.note(`${ctx.kind} ${name}:${b.over}${sum.wiped ? ' (wiped)' : ''}`, sum);
    this.count(`${ctx.kind}:${b.over}`);
    if (sum.wiped) this.count('wiped');
    if (b.arena) this.count(`arena:${b.arena.trick}`);
    this.spend(s);
    return b.over === 'win';
  }
  recruit(s: GameState, wild: CreatureInst) {
    const { W } = this.g;
    const totem = Object.keys(s.inventory).find((id) => s.inventory[id] > 0 && /^(totem|effigy)/.test(id));
    if (!totem) return;
    const offers = W.bestOfferings(wild.species).filter((o) => (s.inventory[o.id] ?? 0) > 0).slice(0, 2).map((o) => o.id);
    const r = W.attemptRecruit(s, wild, totem, offers);
    this.note(`recruit ${wild.species} ${r.success}`, r);
  }
  /** Spend chart points (evolving when it comes up), and now and then take a new playbook. */
  spend(s: GameState) {
    const { Cr } = this.g;
    for (const c of s.roster) for (let i = 0; i < 20 && c.points > 0; i++) {
      const n = Cr.availableNodes(c);
      if (!n.length) break;
      const node = this.any(n);
      if (!Cr.unlockNode(c, node.id)) break;
      this.count(node.kind === 'evolve' ? 'evolve' : 'chart');
      if (this.odds(0.4)) c.playbook = Cr.recommendPlaybook(c, Cr.suggestGoal(c).goal);
    }
  }
  outcome(s: GameState, o: Outcome | null) {
    if (!o) return;
    const { W, map } = this.g;
    if (o.t === 'encounter') { this.note(`met ${o.battle.sides[1].team[0].species}`, [o.roll, o.stars, o.rarity]); this.battle(s, o.battle, { kind: 'wild' }, o.battle.sides[1].team[0].species); }
    else if (o.t === 'trainer') this.battle(s, o.battle, { kind: 'trainer' }, o.name);
    else if (o.t === 'legendary') { const at = map.NODE_BY_ID[s.location].id; this.count(`at:${at}`); this.battle(s, o.battle, { kind: 'legendary', nodeId: at }, at); }
    else if (o.t === 'itemChoice') this.note('keen', W.claimFind(s, this.any(o.options)));
    else this.note(`${o.t}${o.t === 'trail' ? ` ${o.steps}/${o.need}` : ''}`, o.t === 'arrive' ? o.node.id : o);
  }

  // ── A turn ───────────────────────────────────────────────────
  startTurn(s: GameState, m?: Match) {
    const { W, E } = this.g;
    this.roll(`${s.turn}|${s.trainer.name}`);
    if (m && m.rolls[s.turn] === undefined) W.rollRoundWeather(m, s.turn);
    s.teamworkNews = []; s.npcNotes = []; s.teamworkFell = [];
    if (s.turn >= 2 && s.eventTurn !== s.turn) { s.eventTurn = s.turn; E.rollEvent(s); }
    if (s.event) this.event(s);
  }
  /** Answer the event waiting (with this choice, if it can be). */
  event(s: GameState, want?: string) {
    const { E } = this.g;
    const v = E.eventView(s);
    if (!v) return;
    const all = [...s.roster, ...s.reserve];
    const open = v.choices.filter((c) => !c.disabled).map((c) => ({ c, who: c.pick ? all.filter((x) => !c.canPick?.(x)) : [undefined] })).filter((x) => x.who.length);
    for (let tries = 0; tries < 8 && s.event && open.length; tries++) {
      const { c, who } = open.find((o) => o.c.id === want) ?? this.any(open), x = this.any(who);
      if (x && c.preview) this.mark(c.preview(x));
      const r = E.resolveEvent(s, c.id, x?.uid);
      if (!r) continue;
      this.count(`event:${v.id}`);
      this.note(`event ${v.id}/${c.id}`, [r.tone, r.rolls, { text: r.text }]);
      if (r.battle) this.battle(s, r.battle, { kind: r.battle.sides[1].kind === 'wild' ? 'wild' : 'trainer' }, r.battle.sides[1].name);
    }
    s.event = undefined;
  }
  endTurn(s: GameState, m?: Match, camp = false) {
    const r = this.g.W.endTurn(s, camp, m ? m.rolls[s.turn + 1] ?? null : undefined);
    this.note(camp ? 'camp' : 'end', r);
    if (r.left.length) this.note(`left ${r.left.length}`);
    if (r.legendsReturned.length) this.note('legendBack');
    if (r.ended) this.note(`season ${r.ended}`);
    this.write(s);
  }

  // ── Things to do ─────────────────────────────────────────────
  /** What's on offer in a city or town. */
  services(s: GameState) {
    const { W, map, content, Cr } = this.g;
    const at = s.location, town = map.TOWNS[at], city = map.CITIES[at];
    if (!city && !map.isTown(at)) return;
    const act = (p: number, f: () => void) => { if (this.odds(p) && s.location === at) f(); };
    act(s.roster.some((c) => c.ko || c.fatigue > 0) ? 1 : 0.2, () => {
      const cost = W.stableCost(s);
      if (s.initiative < cost) return;
      s.initiative -= cost;
      if (s.sponsor?.city === at) this.count('sponsorRest');
      this.note('rest', W.rest(s, at));
    });
    const keys = W.townKeyItems(s, at);
    for (const id of keys) if (!s.inventory[id] && W.buy(s, id)) { this.count(`key:${id}`); this.note(`key ${id}`); }
    act(0.5, () => { const stock = W.marketStock(at); if (stock.length && (!city || W.payFacility(s, 'market'))) { const id = this.any(stock); this.note(`buy ${id} ${W.buy(s, id)}`); } });
    act(0.5, () => { const r = this.any(content.RECIPES), mats = W.autoIngredients(s, r); if (mats && (!city || W.payFacility(s, 'workbench'))) this.note(`craft ${W.craft(s, r.id, mats)}`); });
    act(0.3, () => { const mats = Object.keys(s.inventory).filter((id) => s.inventory[id] > 0 && content.itemInfo(id).kind === 'material'); if (city && mats.length && W.payFacility(s, 'shrine')) this.note(`carve ${W.carveTotem(s, 'type', city.type, mats)}`); });
    act(0.3, () => { if (W.checkOn(s, this.any([...s.roster, ...s.reserve]).uid)) this.note('check'); });
    act(0.35, () => { const h = W.hallBattle(s); if (h) this.battle(s, h.battle, { kind: 'trainer' }, `hall ${h.name}`); });
    act(1, () => {
      if (town?.special === 'depths') { const m = Object.keys(s.inventory).find((id) => !this.g.depths.depthsBlock(s, id, this.g.tools)); if (m) { const r = this.g.depths.exploreDepths(s, m, this.g.tools)!; this.note(`depths ${m}`, r.stars); this.battle(s, r.battle, { kind: 'wild' }, 'depths'); } }
      else if (town?.special === 'school') {
        for (const t of [...(s.training ?? [])]) if (t.notified || this.odds(0.3)) this.note('pickup', W.pickUpTraining(s, t.creature.uid));
        const c = this.any([...s.roster, ...s.reserve]);
        if (this.odds(0.5)) { if (W.enrollTraining(s, c.uid, 6)) this.note('school'); }
        else if (W.enrollRetraining(s, c.uid, { nature: this.any(content.NATURES).id, instinct: Cr.speciesOf(c).instinct })) this.note('retrain');
      } else if (town?.special === 'research' && s.reserve.length > 1) { const r = W.releaseToResearch(s, s.reserve[0].uid); if (r) this.note('research', r); }
    });
    if (s.roster.length < 3 && s.reserve.length) { s.roster.push(s.reserve.shift()!); this.note('fill'); }
  }
  /** Rivals and Champions: whoever is here, and whoever can be texted. */
  people(s: GameState) {
    const { N, M, D, T, npcs } = this.g;
    for (const npc of N.npcsHere(s)) {
      const c = N.chatWith(s, npc);
      if (c) this.note(`chat ${npc.id}`, c);
      if (N.wouldSponsor(s, npc) && N.sponsor(s, npc)) this.note(`sponsor ${npc.id}`);
      const free = T.npcStock(s, npc).findIndex((_, i) => !T.stockSold(s, npc, i));
      if (free >= 0 && this.odds(0.4)) { const why = T.trade(s, npc, { coins: Math.min(25, s.coins), items: {} }, { coins: 0, stock: [free] }); this.note(`trade ${npc.id} ${why === null}`, { text: why }); }
      const offers = T.npcOffers(s, npc), give = [...s.roster, ...s.reserve].find((x) => !T.mineBlock(s, x));
      if (offers.length && give && this.odds(0.4)) { const why = T.trade(s, npc, { coins: Math.min(60, s.coins), items: {}, creature: give.uid }, { coins: 0, stock: [], slot: offers[0].slot }); if (why === null) this.count('swapMade'); this.note(`swap ${npc.id} ${why === null}`, { text: why }); }
      if (this.odds(0.5)) { const at = s.location, b = N.challengeNpc(s, npc); if (b) this.battle(s, b, { kind: 'trainer' }, npc.id); if (s.location !== at) return; }
    }
    for (const npc of M.chats(s)) {
      M.readChat(s, npc);
      const r = M.replies(s, npc).filter((x) => !x.disabled);
      if (r.length && this.odds(0.6)) { const id = this.any(r).id; this.note(`reply ${npc.id}/${id} ${M.reply(s, npc, id)}`); }
      const o = M.openers(s, npc).filter((x) => !x.disabled);
      if (o.length && this.odds(0.2)) { const id = this.any(o).id; this.note(`write ${npc.id}/${id} ${M.writeFirst(s, npc, id)}`); }
      if (this.odds(0.1) && !N.inviteBlock(s, npc)) this.note(`invite ${npc.id} ${N.inviteNpc(s, npc, this.any(N.inviteStops()))}`);
    }
    if (this.odds(0.3)) { const npc = this.any(npcs.NPCS), i = D.dareBlock(s, npc) ? [] : D.ideas(s, npc); if (i.length) { const idea = this.any(i); this.count(`dare:${idea.kind}`); this.note(`dare ${npc.id}/${idea.kind} ${D.startDare(s, npc, idea, 0)}`); } }
    const done = D.checkDares(s);
    if (done.length) this.note(`daresWon ${done.length}`, done.map((d) => [d.npc.id, d.won]));
  }
  /** Use things from the bag, wherever. */
  bag(s: GameState) {
    const { W, content } = this.g;
    if (W.eatTrailMix(s)) this.note('trailmix');
    const usable = Object.keys(s.inventory).filter((id) => s.inventory[id] > 0 && !['key', 'material'].includes(content.itemInfo(id).kind) && !/^(totem|effigy|taxi|homing|trail)/.test(id));
    if (usable.length && s.roster.length && this.odds(0.5)) { const id = this.any(usable); this.note(`use ${id}`, { text: W.useItem(s, id, this.any(s.roster).uid) }); }
    if (this.odds(0.2) && s.roster.length) { s.following = this.any(s.roster).uid; this.note('follow'); }
    const n = W.rollBike(s);
    if (n) { const to = Object.keys(W.bikeReach(s, n)); if (to.length && this.odds(0.5)) this.note(`bike ${n}`, W.rideBike(s, this.any(to))); else W.skipBike(s); }
  }
  travel(s: GameState) {
    const { W } = this.g;
    const taxi = W.taxiTargets(s), home = W.featherTargets(s);
    if (taxi.length) { const id = this.any(taxi); W.rideTaxi(s, id); this.note(`taxi ${id}`); }
    else if (home.length) { const id = this.any(home); W.useFeather(s, id); this.note(`feather ${id}`); }
  }
  /** Challenge the Arbiter here, doing whatever they ask for first. Returns whether it's worth staying for another try. */
  arbiter(s: GameState): boolean {
    const { W, Imp } = this.g;
    const city = W.arbiterHere(s);
    if (!city || (s.merits.includes(city) && this.odds(0.6))) return false;
    let gate = W.arbiterGate(s, city);
    this.note(`gate ${city} ${gate.ok}`, [{ text: gate.reason }, gate.cloud, gate.show === 'floor' || undefined, gate.show === 'gauntlet' || undefined, gate.show === 'fabian' || undefined]);
    if (gate.show === 'fabian') { s.flags.fabianFound = true; this.note('fabian'); gate = W.arbiterGate(s, city); } // (finding him is a guessing game in app.ts)
    while (gate.show === 'gauntlet' && s.location === city) {
      const r = W.gimmickBattle(s, 'gauntlet');
      if (!r) return true;
      this.count('gauntlet');
      this.battle(s, r.battle, { kind: 'trainer', gimmick: 'gauntlet' }, `gauntlet ${r.match}/${r.of}`);
      gate = W.arbiterGate(s, city);
    }
    while (gate.show === 'floor' && W.arbiterHere(s) === city) {
      if (s.initiative < W.reexploreCost(s)) return true;
      this.outcome(s, W.reexplore(s));
      gate = W.arbiterGate(s, city);
    }
    if (W.arbiterHere(s) !== city) return false; // sent home
    if (!gate.ok) return !!gate.reason?.includes('rest first');
    const cost = W.cityActionCost(s);
    if (s.initiative < cost) return true;
    s.initiative -= cost;
    this.count(`arbiter:${city}`);
    this.battle(s, W.arbiterBattle(s, city), { kind: 'arbiter', city }, city);
    for (const type of [...(s.imprints ?? [])]) { const c = s.roster.find((x) => Imp.imprintChoices(x, type).length); if (c && Imp.useImprint(s, c.uid, Imp.imprintChoices(c, type)[0], type)) this.note(`imprint ${type}`); }
    return !s.merits.includes(city) && W.arbiterHere(s) === city;
  }

  // ── Seasons ──────────────────────────────────────────────────
  /** A turn of wandering: anything legal, at random. */
  wander(s: GameState, m?: Match) {
    const { W, map } = this.g;
    this.startTurn(s, m);
    this.bag(s);
    for (let i = 0; i < 8 && s.initiative > 0; i++) {
      const k = this.rnd(10);
      if (k === 0) this.services(s);
      else if (k === 1) this.people(s);
      else if (k === 2) this.arbiter(s);
      else if (k <= 4 && map.NODE_BY_ID[s.location].kind === 'wild') this.outcome(s, W.reexplore(s));
      else this.step(s, this.any(map.neighbors(s.location)).node.id);
    }
    if (this.odds(0.1) && W.doWork(s)) this.note('work');
    if (this.odds(0.15)) this.travel(s);
    this.endTurn(s, m, s.initiative > 0 && s.roster.some((c) => c.fatigue > 0));
  }
  step(s: GameState, id: string): boolean {
    const { W } = this.g;
    const chk = W.canMoveTo(s, id);
    if (!chk.ok) { if (!/Initiative/.test(chk.reason ?? '')) this.note(`shut ${id}`, { text: chk.reason }); return false; }
    this.note(`to ${id}`);
    this.count(`biome:${this.g.map.NODE_BY_ID[id].biome}`);
    this.outcome(s, W.moveTo(s, id));
    return true;
  }
  /** The way to a place (routes that are shut today count: the bot waits for them). */
  route(from: string, to: string): string[] {
    const { map } = this.g;
    const came: Record<string, string> = { [from]: '' }, q = [from];
    for (let at = q.shift(); at !== undefined && at !== to; at = q.shift()) for (const x of map.neighbors(at)) if (!(x.node.id in came) && (x.node.kind !== 'legendary' || x.node.id === to)) { came[x.node.id] = at; q.push(x.node.id); }
    if (!(to in came)) return [];
    const path: string[] = [];
    for (let at = to; at !== from; at = came[at]) path.unshift(at);
    return path;
  }
  /** A whole season of going places in order, doing everything there is at each, and Circuit Stadium to end it. */
  tour(s: GameState, goals: string[], m?: Match) {
    const { W } = this.g;
    const todo = [...goals];
    let waited = 0;
    while (s.phase === 'map') {
      this.startTurn(s, m);
      this.bag(s);
      for (let i = 0; i < 40; i++) {
        const goal = s.turn > 85 ? 'stadium' : todo[0] ?? 'stadium';
        if (s.location !== goal) {
          if (s.roster.every((c) => c.fatigue > 4 || c.ko)) this.services(s);
          const next = this.route(s.location, goal)[0];
          if (!next) { this.note(`nowhere ${goal}`); todo.shift(); continue; }
          if (this.step(s, next)) continue;
          const why = W.canMoveTo(s, next).reason ?? '';
          if (/Initiative|portal/.test(why)) break; // tomorrow
          todo.shift(); // somewhere they can't go
          continue;
        }
        this.services(s);
        this.people(s);
        if (s.location !== goal) continue;
        if (this.arbiter(s) && waited < 14) { waited++; break; }
        if (todo[0] !== goal) break;
        waited = 0;
        todo.shift();
        this.note(`reached ${goal}`);
        this.count(`at:${goal}`);
      }
      this.endTurn(s, m, s.initiative > 0 && s.roster.some((c) => c.fatigue > 0));
    }
  }
  /** A turn spent heading for Circuit Stadium, and waiting there. */
  homeward(s: GameState, m: Match) {
    this.startTurn(s, m);
    for (let i = 0; i < 6 && s.location !== 'stadium'; i++) { const next = this.route(s.location, 'stadium')[0]; if (!next || !this.step(s, next)) break; }
    this.people(s);
    this.endTurn(s, m);
  }
  circuit(g: { players: GameState[]; circuit?: GameState['circuit'] }) {
    const { Circuit } = this.g;
    this.roll('circuit');
    const c = Circuit.openCircuit(g);
    if (!c) this.note('unqualified');
    else {
      this.note('bracket', c);
      for (let next = Circuit.advance(g); next; next = Circuit.advance(g)) {
        const b = Circuit.matchBattle(g, next);
        this.fight(b);
        Circuit.settle(g, next.k, b.over === 'win' ? next.me : next.foe, b);
        this.note(`round ${next.round} ${b.over}`);
        if (next.foeSeat !== undefined) this.count('circuitDuel');
      }
      const w = Circuit.championOf(g.circuit!)!;
      this.note(`champion ${w.npc ?? `seat${w.seat}`}`, g.circuit);
    }
    for (const p of g.players) this.write(p);
  }
}
