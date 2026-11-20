// How to Play guide content: every category and topic is reachable and non-empty; the welcome tour is short.
import { describe, it, expect } from 'vitest';
import { GUIDE, welcomeTour } from '../src/ui/guide';

describe('How to Play guide', () => {
  it('has unique categories and topics, each with something to read', () => {
    expect(new Set(GUIDE.map((c) => c.id)).size).toBe(GUIDE.length);
    for (const c of GUIDE) {
      expect(c.topics.length).toBeGreaterThan(0);
      expect(new Set(c.topics.map((t) => t.id)).size).toBe(c.topics.length);
      for (const t of c.topics) expect(t.body.join('').length).toBeGreaterThan(40);
    }
  });
  it('the welcome tour is a handful of short cards that name the goal', () => {
    const tour = welcomeTour({ name: 'Rowan', home: 'Thunder Spike', starter: 'Cindercub' });
    expect(tour.length).toBeLessThanOrEqual(6);
    expect(tour[0].lines.join(' ')).toMatch(/8 Merits/);
    expect(tour[0].lines.join(' ')).toMatch(/Rowan/);
    for (const st of tour) expect(st.lines.join(' ').length).toBeLessThan(400);
  });
});
