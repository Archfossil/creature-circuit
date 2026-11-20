// Keeps the design docs in step with the game: every event in the game must be documented.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { EVENT_IDS, EVENT_TIMES } from '../src/engine/events';
import { CITIES } from '../src/data/map';
import { TRAINER_STYLES } from '../src/engine/state';
import { NATURES, ABILITIES, AFFINITIES } from '../src/data/content';

describe('docs', () => {
  it('docs/10-events.md documents every event (by its id)', () => {
    const doc = readFileSync(new URL('../docs/10-events.md', import.meta.url), 'utf-8');
    const missing = EVENT_IDS.filter((id) => !doc.includes(`· \`${id}\``));
    expect(missing, `Add these events to docs/10-events.md: ${missing.join(', ')}`).toEqual([]);
    // each overview row's Time column matches the game (Day / Night / Any)
    const wrong = EVENT_IDS.filter((id) => {
      const row = doc.split(/\r?\n/).find((l) => l.startsWith('| ') && l.includes(`| \`${id}\` |`));
      const cells = row?.split('|').map((c) => c.trim()) ?? [];
      const want = EVENT_TIMES[id] === 'any' ? 'Any' : EVENT_TIMES[id] === 'day' ? 'Day' : 'Night';
      return cells[6] !== want;
    });
    expect(wrong, `Fix the Time column in docs/10-events.md for: ${wrong.join(', ')}`).toEqual([]);
  });
  it('docs/11-arbiters-and-arenas.md documents every Arbiter and arena effect', () => {
    const doc = readFileSync(new URL('../docs/11-arbiters-and-arenas.md', import.meta.url), 'utf-8');
    const missing = Object.values(CITIES).flatMap((c) => [
      doc.includes(`### `) && doc.includes(`· \`${c.nodeId}\``) ? null : `Arbiter ${c.arbiter} (${c.nodeId})`,
      doc.includes(`\`${c.arena.trick}\``) ? null : `arena effect ${c.arena.trick}`,
    ]).filter(Boolean);
    expect(missing, `Add these to docs/11-arbiters-and-arenas.md: ${missing.join(', ')}`).toEqual([]);
  });
  it('docs/12-trainer-styles.md documents every trainer style', () => {
    const doc = readFileSync(new URL('../docs/12-trainer-styles.md', import.meta.url), 'utf-8');
    const missing = TRAINER_STYLES.filter((st) => !doc.includes(`${st.name} · \`${st.id}\``)).map((st) => `${st.name} (${st.id})`);
    expect(missing, `Add these styles to docs/12-trainer-styles.md: ${missing.join(', ')}`).toEqual([]);
  });
  it('docs/13-natures-and-abilities.md documents every Nature, Ability and Affinity Power', () => {
    const doc = readFileSync(new URL('../docs/13-natures-and-abilities.md', import.meta.url), 'utf-8');
    const all = [...NATURES.map((n) => [n.name, n.id]), ...Object.values(ABILITIES).map((a) => [a.name, a.id]), ...Object.values(AFFINITIES).map((a) => [a.name, a.id])];
    const missing = all.filter(([name, id]) => !doc.includes(name) || !doc.includes(`\`${id}\``)).map(([name, id]) => `${name} (${id})`);
    expect(missing, `Add these to docs/13-natures-and-abilities.md: ${missing.join(', ')}`).toEqual([]);
  });
});
