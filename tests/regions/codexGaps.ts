// What a region's Codex is missing: a new region has to come out empty before it's finished
// (docs/16-region-packages.md, Codexes).
import type { Game } from '../baseline/bot';

export function codexGaps(g: Game): string[] {
  const { W, N, map, species, npcs, content } = g;
  const out: string[] = [], here = new Set(species.SPECIES.map((x) => x.id));
  // families stay together
  for (const x of Object.values(species.SPECIES_BY_ID)) if (x.evolvesTo && here.has(x.id) !== here.has(x.evolvesTo)) out.push(`family ${x.id} → ${x.evolvesTo}`);
  for (const id of species.STARTERS) if (!here.has(id)) out.push(`starter ${id}`);
  for (const n of map.MAP_NODES) if (n.legendary && !here.has(n.legendary)) out.push(`legendary ${n.legendary} at ${n.id}`);
  // somebody in every biome that can be explored, at every rarity and stage, by day and by night (the Rainbow Plains: every type)
  for (const biome of new Set(map.MAP_NODES.filter((n) => n.kind === 'wild').map((n) => n.biome))) {
    for (const rarity of ['common', 'prime', 'apex'] as const) for (const cap of [1, 2, 3]) for (const time of ['day', 'night'] as const) {
      if (biome === 'prism' && rarity === 'common') continue; // (bumped up to Prime)
      const found = map.BIOME_TYPES[biome].filter((t) => W.speciesPool(biome, t, rarity, cap, time).length);
      if (biome === 'prism' ? found.length < map.BIOME_TYPES[biome].length : !found.length) out.push(`wild ${biome} ${rarity} stage ${cap} ${time}`);
    }
  }
  // a full team of different creatures, all of the right type, for each Arbiter at every Tier
  for (const c of Object.values(map.CITIES)) for (let tier = 1; tier <= 5; tier++) {
    const team = W.arbiterTeam(c.type, tier);
    if (new Set(team.map((x) => x.species)).size < (tier === 1 ? 2 : 3)) out.push(`arbiter ${c.nodeId} tier ${tier}`);
  }
  // an Ace of their favourite type, and others beside it
  const s = { turn: 100, prismSeed: 1, npcs: {}, merits: [] } as unknown as Parameters<typeof N.npcFamilies>[0];
  for (const n of npcs.NPCS) {
    const fam = N.npcFamilies(s, n);
    if (fam[0]?.rarity !== (n.kind === 'champion' ? 'apex' : 'prime') || !fam[0].types.includes(n.types[0])) out.push(`ace ${n.id}`);
    if (fam.length < 3) out.push(`team ${n.id}`);
  }
  if (npcs.NPCS.length < 7) out.push('circuit too few people for the bracket');
  // someone for every offering, where there are Depths
  if (map.DEPTHS_STAIR) for (const it of Object.values(content.ITEMS)) if (it.kind === 'material' && it.allure && !species.SPECIES.some((x) => x.rarity !== 'legendary' && x.types.some((t) => (it.allure![t] ?? 0) > 0))) out.push(`depths ${it.id}`);
  return out;
}
