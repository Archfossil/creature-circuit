// Stadium Mode: three fully trained creatures a side, no journey. A team is kept as a short recipe (species,
// Nature, Instinct, playbook, Swap Moves) and built fresh for every battle, so nothing carries over.
import type { CreatureInst, PlaybookGoal } from './creature';
import { availableNodes, autoPlaybook, createCreature, energy, fits, fullRestore, learnable, recommendPlaybook, suggestGoal, syncPerks, unlockNode } from './creature';
import type { Battle } from './battle';
import { createBattle } from './battle';
import type { GameState } from './state';
import { newGame } from './state';
import { playerSide } from './world';
import { npcTeam } from './npcs';
import { assignSwapMoves, setSwapMove } from './swaps';
import { pick } from './dice';
import { SPECIES_BY_ID } from '../data/species';
import { NATURES, NATURE_BY_ID, WEATHER } from '../data/content';
import { INSTINCT_BY_ID, INSTINCT_POOL } from '../data/instincts';
import { CITIES, MAP_NODES } from '../data/map';
import { activeRegion } from '../regions/active';
import { NPCS, NPC_BY_ID } from '../data/npcs';
import type { Instinct } from '../data/instincts';
import type { Species } from '../data/schema';

/** The level a final stage's whole chart is bought at: as far as a creature can be trained before extra points are spent on stats. */
export const STADIUM_LEVEL = 12;
export const STADIUM_SIZE = 3;

/** One creature of a Stadium team. `swaps`: its Swap Move for each teammate, by slot. */
export interface StadiumPick { species: string; nature: string; instinct?: string; playbook?: string[]; swaps?: Record<number, string> }
export interface StadiumTeam { name: string; picks: StadiumPick[] }

/** Every creature that can be brought: final stages, and Legendaries, from any region (a Stadium battle isn't part of a season). */
export const stadiumSpecies = (): Species[] => Object.values(SPECIES_BY_ID).filter((s) => !s.evolvesTo);
/** The Instincts a species can be given: its types', and its own. */
export const stadiumInstincts = (sp: Species): Instinct[] => [...new Set([INSTINCT_BY_ID[sp.instinct], ...sp.types.flatMap((t) => INSTINCT_POOL[t])])].filter(Boolean);

/** A creature trained as far as its chart goes: every node bought, every Nature perk, full Loyalty. */
export function trained(speciesId: string, nature: string, instinct?: string): CreatureInst {
  const c = createCreature(speciesId, 1, { nature });
  c.level = STADIUM_LEVEL;
  c.points = 99;
  for (let n = availableNodes(c).find((x) => x.kind !== 'evolve'); n; n = availableNodes(c).find((x) => x.kind !== 'evolve')) if (!unlockNode(c, n.id)) break;
  c.points = 0;
  c.loyalty = 10;
  syncPerks(c);
  if (instinct) c.instinct = instinct;
  fullRestore(c);
  return c;
}
const uidOf = (side: string, slot: number) => `stadium-${side}-${slot}`;

/** Is this playbook one the creature can use? */
export const playbookFits = (c: CreatureInst, moves: string[]) => moves.length >= 1 && moves.length <= 4 && new Set(moves).size === moves.length && moves.every((m) => learnable(c).includes(m)) && fits(energy(c), moves);

/** Build a team for battle. `side` keeps the two teams' creatures apart when both are yours. */
export function buildTeam(team: StadiumTeam, side = 'a'): CreatureInst[] {
  const out = team.picks.slice(0, STADIUM_SIZE).filter((p) => SPECIES_BY_ID[p.species]).map((p, i) => {
    const sp = SPECIES_BY_ID[p.species];
    const c = trained(p.species, NATURE_BY_ID[p.nature] ? p.nature : NATURES[0].id, stadiumInstincts(sp).some((x) => x.id === p.instinct) ? p.instinct : sp.instinct);
    c.uid = uidOf(side, i);
    c.playbook = p.playbook && playbookFits(c, p.playbook) ? [...p.playbook] : bestPlaybook(c);
    return c;
  });
  for (const a of out) for (const b of out) if (a !== b) a.teamwork[b.uid] = 5;
  assignSwapMoves(out);
  out.forEach((c, i) => { for (const [slot, move] of Object.entries(team.picks[i]?.swaps ?? {})) if (out[Number(slot)] && Number(slot) !== i) setSwapMove(c, out[Number(slot)], move); });
  return out;
}
/** What a team's playbooks aim for. Not physical above all: a mix wins more, even for a creature with far more Power than Focus. */
const teamGoal = (c: CreatureInst): PlaybookGoal => { const g = suggestGoal(c).goal; return g.kind === 'elemental' ? g : { kind: 'balanced' }; };
const bestPlaybook = (c: CreatureInst, goal: PlaybookGoal = teamGoal(c)) => { const m = recommendPlaybook(c, goal); return m.length ? m : autoPlaybook(c); };
/** A good playbook that isn't the same every time. */
const variedPlaybook = (c: CreatureInst) => { const m = recommendPlaybook(c, teamGoal(c), undefined, Math.random); return m.length ? m : autoPlaybook(c, true); };
/** Read a built creature's choices back into its recipe (after its card was edited). */
export function readPick(c: CreatureInst, team: CreatureInst[]): StadiumPick {
  const swaps: Record<number, string> = {};
  team.forEach((p, i) => { if (p !== c && c.swapMoves[p.uid]) swaps[i] = c.swapMoves[p.uid]; });
  return { species: c.species, nature: c.nature, instinct: c.instinct, playbook: [...c.playbook], swaps };
}

/** Why a team can't battle yet, or null. */
export function teamProblem(t: StadiumTeam): string | null {
  if (t.picks.length !== STADIUM_SIZE) return `Choose ${STADIUM_SIZE} creatures.`;
  if (new Set(t.picks.map((p) => p.species)).size !== STADIUM_SIZE) return 'No two of the same creature.';
  if (t.picks.some((p) => !SPECIES_BY_ID[p.species] || SPECIES_BY_ID[p.species].evolvesTo)) return 'One of these creatures isn’t in the game any more.';
  if (t.picks.filter((p) => SPECIES_BY_ID[p.species].rarity === 'legendary').length > 1) return 'One Legendary at most.';
  return null;
}
/** A random legal team of three creatures of different types, each with its own pick of moves. */
export function randomTeam(name = 'Random team', legendary = false): StadiumTeam {
  const pool = stadiumSpecies().filter((s) => legendary || s.rarity !== 'legendary');
  for (;;) {
    const picks: StadiumPick[] = [];
    while (picks.length < STADIUM_SIZE) {
      const sp = pick(pool);
      if (picks.some((p) => SPECIES_BY_ID[p.species].types[0] === sp.types[0])) continue;
      const nature = pick(NATURES).id;
      picks.push({ species: sp.id, nature, instinct: sp.instinct, playbook: variedPlaybook(trained(sp.id, nature, sp.instinct)) });
    }
    const t = { name, picks };
    if (!teamProblem(t)) return t;
  }
}

/** A team as text to share, and back. */
export const teamCode = (t: StadiumTeam) => JSON.stringify({ cc: 'stadium', ...t });
export function readTeamCode(text: string): StadiumTeam | null {
  try {
    const t = JSON.parse(text) as StadiumTeam & { cc?: string };
    if (t.cc !== 'stadium' || !Array.isArray(t.picks)) return null;
    const picks = t.picks.slice(0, STADIUM_SIZE).filter((p) => p && typeof p.species === 'string' && SPECIES_BY_ID[p.species]).map((p): StadiumPick => ({
      species: p.species, nature: NATURE_BY_ID[p.nature] ? p.nature : NATURES[0].id, instinct: typeof p.instinct === 'string' ? p.instinct : undefined,
      playbook: Array.isArray(p.playbook) ? p.playbook.filter((m) => typeof m === 'string') : undefined, swaps: p.swaps && typeof p.swaps === 'object' ? p.swaps : undefined,
    }));
    const out = { name: String(t.name ?? 'Team').slice(0, 30), picks };
    return picks.length ? out : null;
  } catch { return null; }
}

/** A trainer who only exists for a Stadium battle: never saved. Their first creature leads. */
export function stadiumTrainer(name: string, color: string, look: GameState['trainer']['look'], team: CreatureInst[]): GameState {
  const s = newGame(name, 'balanced', activeRegion().home, 'puddlit', color, look);
  s.stadium = true;
  s.turn = activeRegion().season.turns - 1; // the season is all but over, and it is day
  s.location = MAP_NODES.find((n) => n.kind === 'stadium')!.id;
  s.weather = 'clear';
  s.merits = Object.keys(CITIES);
  s.prismSeed = Math.floor(Math.random() * 1e9);
  s.roster = team;
  s.following = team[0]?.uid ?? null;
  s.phase = 'endgame';
  return s;
}

// ── Opponents ───────────────────────────────────────────────────
export type StadiumFoe = { kind: 'npc'; id: string } | { kind: 'arbiter'; city: string } | { kind: 'random' };
export const foeName = (f: StadiumFoe) => (f.kind === 'npc' ? NPC_BY_ID[f.id].name : f.kind === 'arbiter' ? `Arbiter ${CITIES[f.city].arbiter}` : 'A challenger');
export const stadiumFoes = (): { champions: StadiumFoe[]; rivals: StadiumFoe[]; arbiters: StadiumFoe[] } => ({
  champions: NPCS.filter((n) => n.kind === 'champion').map((n) => ({ kind: 'npc', id: n.id })),
  rivals: NPCS.filter((n) => n.kind === 'rival').map((n) => ({ kind: 'npc', id: n.id })),
  arbiters: Object.keys(CITIES).map((city) => ({ kind: 'arbiter', city })),
});

/** The AI's team at its best: fully trained, with recommended playbooks and Swap Moves. */
export function foeTeam(s: GameState, f: StadiumFoe): CreatureInst[] {
  if (f.kind === 'npc') return npcTeam(s, NPC_BY_ID[f.id], STADIUM_SIZE, STADIUM_LEVEL);
  if (f.kind === 'random') return buildTeam(randomTeam(), 'b');
  const type = CITIES[f.city].type;
  const strong = stadiumSpecies().filter((x) => x.types.includes(type) && x.rarity !== 'legendary').sort((a, b) => Number(b.rarity === 'apex') - Number(a.rarity === 'apex') || Math.random() - 0.5);
  const picks = [...strong.slice(0, 2), ...strong.slice(2).sort(() => Math.random() - 0.5)].slice(0, STADIUM_SIZE).map((sp) => ({ species: sp.id, nature: pick(NATURES).id, instinct: sp.instinct }));
  return buildTeam({ name: f.city, picks }, 'b');
}
/** A battle against the AI. Arbiters bring their arena at its strongest. Every opponent swaps and picks as a Champion does. */
export function stadiumBattle(s: GameState, f: StadiumFoe, weatherId = 'clear'): Battle {
  const weather = WEATHER[weatherId] ?? WEATHER.clear;
  const team = foeTeam(s, f);
  if (f.kind === 'arbiter') return createBattle(playerSide(s), { kind: 'arbiter', name: foeName(f), team, active: 0, mods: {} }, weather, { arena: { trick: CITIES[f.city].arena.trick, tier: 5, city: f.city }, biome: 'meadow' });
  return createBattle(playerSide(s), { kind: 'champion', name: foeName(f), ...(f.kind === 'npc' ? { npc: f.id } : {}), team, active: 0, mods: {} }, weather, { biome: 'meadow' });
}
/** A battle between two people's teams. */
export function stadiumDuel(a: GameState, b: GameState, weatherId = 'clear'): Battle {
  return createBattle(playerSide(a), { ...playerSide(b), kind: 'trainer' }, WEATHER[weatherId] ?? WEATHER.clear, { biome: 'meadow' });
}
