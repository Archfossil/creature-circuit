// Writes debug saves to debug/ (npm run debug:saves): turn 99 in Circuit Stadium, all 8 Merits, the Codex filled
// out, a fully trained team, friends and coins. Import one from 💾 Saves on the title screen.
import { mkdirSync, writeFileSync } from 'node:fs';
import { newGame, newMatch, log, type GameState } from '../src/engine/state';
import { buildTeam, trained, type StadiumTeam } from '../src/engine/stadium';
import { recommendPlaybook, suggestGoal, fullRestore } from '../src/engine/creature';
import { assignSwapMoves } from '../src/engine/swaps';
import { CITIES, MAP_NODES } from '../src/data/map';
import { SPECIES, SPECIES_BY_ID } from '../src/data/species';
import { ITEMS, NATURES, isUnique } from '../src/data/content';
import { NPCS } from '../src/data/npcs';

const finals = SPECIES.filter((s) => !s.evolvesTo && s.rarity !== 'legendary');
function debugTrainer(name: string, color: string, home: string, teamOf: string[], look: GameState['trainer']['look']): GameState {
  const s = newGame(name, 'balanced', home, 'sproutle', color, look);
  const team: StadiumTeam = { name, picks: teamOf.map((species, i) => ({ species, nature: NATURES[i % NATURES.length].id, instinct: SPECIES_BY_ID[species].instinct })) };
  s.roster = buildTeam(team);
  s.roster.forEach((c, i) => { c.uid = `${name.toLowerCase()}-${i}`; c.morale = 8; c.teamwork = {}; c.swapMoves = {}; });
  s.roster[0].bond = true;
  for (const a of s.roster) for (const b of s.roster) if (a !== b) a.teamwork[b.uid] = 5;
  assignSwapMoves(s.roster);
  for (const c of s.roster) fullRestore(c);
  // a spread of others in totems, one per type
  s.reserve = Object.values(CITIES).map((c, i) => finals.find((x) => x.types[0] === c.type && !teamOf.includes(x.id))!).map((sp, i) => {
    const c = trained(sp.id, NATURES[(i + 3) % NATURES.length].id, sp.instinct);
    c.uid = `${name.toLowerCase()}-r${i}`; c.morale = 7; c.playbook = recommendPlaybook(c, suggestGoal(c).goal);
    return c;
  });
  s.following = s.roster[0].uid;
  s.turn = 99; s.eventTurn = 99; s.location = 'stadium'; s.coins = 300; s.initiative = 5;
  s.merits = Object.keys(CITIES);
  s.visited = MAP_NODES.map((n) => n.id);
  s.dex = { seen: SPECIES.map((x) => x.id), caught: SPECIES.map((x) => x.id) };
  for (const it of Object.values(ITEMS)) s.inventory[it.id] = isUnique(it) ? 1 : 5;
  s.flags.stellaOpen = s.flags.fabianFound = s.flags.salemWorthy = true;
  s.rested = Object.keys(CITIES);
  s.stats.battlesWon = 60; s.stats.recruited = 40;
  s.npcs = {};
  for (const n of NPCS) s.npcs[n.id] = { met: 10, won: n.kind === 'champion' ? 1 : 2, lost: 1, owed: 0, rapport: n.kind === 'champion' ? 6 : 3, seen: [0, 1], revenges: 0 };
  log(s, 'Debug save: turn 99, ready for the Circuit.');
  return s;
}
const A = ['redwarden', 'stormhound', 'polarion'], B = ['pyrothane', 'mangrovore', 'mesahound'];
const ann = () => debugTrainer('Debug', '#ff6b3d', 'thunder', A, { topPattern: 'chevrons', jacket: 'jacket-pack', hat: 'backcap', hatPattern: 'panels' });
const bob = () => debugTrainer('Rowan', '#3d8bff', 'iron', B, { topPattern: 'stripes', jacket: 'coat', hat: 'ushanka', hatPattern: 'badge' });
mkdirSync(new URL('../debug', import.meta.url), { recursive: true });
const write = (file: string, data: unknown) => { writeFileSync(new URL(`../debug/${file}`, import.meta.url), JSON.stringify(data)); console.log('wrote', `debug/${file}`, JSON.stringify(data).length); };
write('solo-turn-99.json', ann());
write('hotseat-2-players-turn-99.json', newMatch([ann(), bob()]));
