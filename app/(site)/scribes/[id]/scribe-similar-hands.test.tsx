/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ScribeHandCompared, ScribeSimilarHands } from '@/services/hand-similarity';
import { ScribeSimilarHandsList } from './scribe-similar-hands';

function own(id: number, label: string, siblings: ScribeHandCompared['siblings'], compared = true) {
  return {
    id,
    name: 'Main Hand',
    item_part: id + 100,
    item_part_display_label: label,
    compared,
    siblings,
  };
}

function other(
  id: number,
  label: string,
  overrides: Partial<ScribeSimilarHands['results'][number]['hand']> = {}
) {
  return {
    id,
    name: 'Main Hand',
    item_part: id + 100,
    item_part_display_label: label,
    scribe: null,
    date: null,
    place: null,
    ...overrides,
  };
}

const SIMILAR: ScribeSimilarHands = {
  scribe: 1,
  minimum_glyphs: 10,
  vectors: 'hog@48px-6cell-9bin-1',
  computed: '2026-11-05T00:00:00Z',
  hands: [
    own(40, 'NRS GD55/53', [{ hand: 41, rank: 1, similarity: 0.4 }]),
    own(41, 'NRS GD55/117', [{ hand: 40, rank: 1, similarity: 0.4 }]),
    own(37, 'NRS GD55/151', []),
    own(36, 'NRS GD55/47', [], false),
  ],
  results: [
    {
      hand: other(53, 'NLS Adv. MS 15.1.18, no. 71', { date: '1190 X 1195' }),
      similarity: 0.27,
      near: [
        // Ranks are counted in each hand's own list, so the best likeness need not be the nearest rank's.
        { hand: 40, rank: 3, similarity: 0.21 },
        { hand: 41, rank: 9, similarity: 0.27 },
      ],
    },
    {
      hand: other(44, 'NLS Adv. MS 15.1.18, no. 81', {
        scribe: { id: 2, name: 'Barrow, Scribe Aa' },
      }),
      similarity: 0.29,
      near: [{ hand: 37, rank: 1, similarity: 0.29 }],
    },
  ],
};

describe('ScribeSimilarHandsList (AI programme W1.3)', () => {
  it('lists the matches in order, each linked to its hand, with its scribe and best likeness', () => {
    render(<ScribeSimilarHandsList similar={SIMILAR} />);

    const firstLink = screen.getByRole('link', { name: 'NLS Adv. MS 15.1.18, no. 71' });
    const secondLink = screen.getByRole('link', { name: 'NLS Adv. MS 15.1.18, no. 81' });
    const [first, second] = [firstLink.closest('li')!, secondLink.closest('li')!];
    expect(first.parentElement).toBe(second.parentElement);
    expect(first.nextElementSibling).toBe(second);
    expect(firstLink.getAttribute('href')).toBe('/hands/53');
    expect(first.textContent).toContain('1.');
    expect(first.textContent).toContain('No scribe attributed · 1190 X 1195');
    expect(first.textContent).toContain('0.27');
    expect(secondLink.getAttribute('href')).toBe('/hands/44');
    expect(second.textContent).toContain('2.');
    expect(second.textContent).toContain('Barrow, Scribe Aa');
    expect(second.textContent).not.toContain('No scribe attributed');
  });

  it('names the scribe’s hands each match is near, by their shelfmarks, with the rank there', () => {
    render(<ScribeSimilarHandsList similar={SIMILAR} />);

    const [near] = screen.getAllByRole('list', {
      name: "The scribe's hands this one is among the nearest of, each with its rank there",
    });
    expect(
      within(near)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['NRS GD55/53 · rank 3', 'NRS GD55/117 · rank 9']);
    expect(within(near).getAllByRole('listitem')[0].getAttribute('title')).toBe(
      'Rank 3 among the nearest of NRS GD55/53; likeness 0.21'
    );
    expect(screen.getByText("Near 2 of the scribe's 3 compared hands")).toBeTruthy();
  });

  it('opens with where the scribe’s compared hands find each other, so a reader can judge the matches', () => {
    render(<ScribeSimilarHandsList similar={SIMILAR} />);

    expect(
      screen.getByText(
        "How well the comparison finds this scribe: 2 of the scribe's 3 compared hands find another of its hands among their nearest."
      )
    ).toBeTruthy();
    const check = screen.getByRole('list', {
      name: "Where the scribe's own hands find each other",
    });
    expect(
      within(check)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual([
      'NRS GD55/53 finds NRS GD55/117 at rank 1',
      'NRS GD55/117 finds NRS GD55/53 at rank 1',
      "NRS GD55/151 finds none of the scribe's other hands among its nearest",
    ]);
  });

  it('says there is nothing to check against when only one of the scribe’s hands is compared', () => {
    const [, , lone, uncompared] = SIMILAR.hands;
    render(<ScribeSimilarHandsList similar={{ ...SIMILAR, hands: [lone, uncompared] }} />);

    expect(
      screen.getByText(
        "Only one of this scribe's hands has been compared, so these matches cannot be checked against the scribe's other hands."
      )
    ).toBeTruthy();
    expect(
      screen.queryByRole('list', { name: "Where the scribe's own hands find each other" })
    ).toBeNull();
    expect(screen.getAllByText("Near the scribe's one compared hand")).toHaveLength(2);
  });
});
