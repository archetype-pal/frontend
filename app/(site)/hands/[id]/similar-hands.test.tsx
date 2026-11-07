/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SimilarHand, SimilarHands } from '@/services/hand-similarity';
import { SimilarHandsList } from './similar-hands';

function letter(name: string, character: string, similarity: number, glyphs: [number, number]) {
  return {
    allograph: name.length * 100 + character.charCodeAt(0),
    name,
    character,
    similarity,
    glyphs,
  };
}

function match(
  rank: number,
  overrides: Partial<SimilarHand['hand']>,
  letters: SimilarHand['letters']
) {
  return {
    rank,
    similarity: 0.4 - rank / 10,
    hand: {
      id: 40 + rank,
      name: 'Main Hand',
      item_part: 70 + rank,
      item_part_display_label: `NRS GD55/${100 + rank}`,
      scribe: null,
      date: null,
      place: null,
      ...overrides,
    },
    letters,
  };
}

const SIMILAR: SimilarHands = {
  hand: 40,
  glyphs: 24,
  minimum_glyphs: 10,
  vectors: 'hog@48px-6cell-9bin-1',
  computed: '2026-11-05T00:00:00Z',
  results: [
    match(1, { scribe: { id: 1, name: 'Barrow, Scribe Ab' }, date: '1219 X 1223' }, [
      letter('with head', 'a', 0.39, [4, 2]),
      letter('r', 'r', 0.36, [5, 1]),
    ]),
    match(
      2,
      { place: 'Melrose' },
      Array.from({ length: 10 }, (_, i) => letter('x', String.fromCharCode(98 + i), 0.1, [1, 1]))
    ),
  ],
};

describe('SimilarHandsList (AI programme W1.3)', () => {
  it('lists the nearest hands in order, each linked to its page with its scribe and likeness', () => {
    render(<SimilarHandsList similar={SIMILAR} />);

    const links = screen.getAllByRole('link');
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['NRS GD55/101', '/hands/41'],
      ['NRS GD55/102', '/hands/42'],
    ]);
    expect(screen.getByText('Barrow, Scribe Ab · 1219 X 1223')).toBeTruthy();
    expect(screen.getByText('No scribe attributed · Melrose')).toBeTruthy();
    expect(screen.getByText('0.30')).toBeTruthy();
    expect(screen.getByText('0.20')).toBeTruthy();
  });

  it('says what each match rests on, naming a letter by its character and allograph', () => {
    render(<SimilarHandsList similar={SIMILAR} />);

    expect(screen.getByText('2 shared letters · 3 forms compared')).toBeTruthy();
    const [first] = screen.getAllByRole('list', {
      name: "Letters compared, most compared first, each with how alike the two hands' forms are",
    });
    const chips = within(first).getAllByRole('listitem');
    expect(chips.map((chip) => chip.textContent)).toEqual(['a, with head 0.39', 'r 0.36']);
    expect(chips[0].getAttribute('title')).toBe('a, with head: 0.39 (4 here, 2 there)');
  });

  it('shows eight letters and counts the rest', () => {
    render(<SimilarHandsList similar={SIMILAR} />);

    const [, second] = screen.getAllByRole('list', {
      name: "Letters compared, most compared first, each with how alike the two hands' forms are",
    });
    const chips = within(second).getAllByRole('listitem');
    expect(chips).toHaveLength(9);
    expect(chips[8].textContent).toBe('+2 more');
  });
});
