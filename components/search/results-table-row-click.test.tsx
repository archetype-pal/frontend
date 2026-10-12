import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResultsTable } from './results-table';
import type { HandListItem } from '@/types/search';

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: (key: string) => key }),
}));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

const hand = (id: number, name: string, shelfmark: string): HandListItem => ({
  id,
  name,
  repository_city: 'London',
  repository_name: 'British Library',
  shelfmark,
  catalogue_numbers: '',
  place: '',
  date: null,
  description: '',
});

// Record which link a click lands on, without letting Next navigate in jsdom.
function captureLinkClicks() {
  const hrefs: string[] = [];
  const listener = (event: MouseEvent) => {
    const anchor = (event.target as Element).closest('a');
    if (!anchor) return;
    event.preventDefault();
    hrefs.push(anchor.getAttribute('href') ?? '');
  };
  document.addEventListener('click', listener, true);
  return { hrefs, stop: () => document.removeEventListener('click', listener, true) };
}

describe('ResultsTable row click (frontend#142)', () => {
  let stop: () => void = () => {};
  afterEach(() => stop());

  it('opens the clicked row, not the last one, when clicking outside the link', () => {
    render(
      <ResultsTable
        resultType="hands"
        results={[hand(1, 'First Hand', 'Shelf A'), hand(2, 'Second Hand', 'Shelf B')]}
      />
    );
    const capture = captureLinkClicks();
    stop = capture.stop;

    fireEvent.click(screen.getByText('Shelf A'));
    fireEvent.click(screen.getByText('Shelf B'));

    expect(capture.hrefs).toHaveLength(2);
    expect(capture.hrefs[0]).toMatch(/\/1(\/|$|\?)/);
    expect(capture.hrefs[1]).toMatch(/\/2(\/|$|\?)/);
  });

  it('does not navigate while the user is selecting text', () => {
    render(<ResultsTable resultType="hands" results={[hand(1, 'First Hand', 'Shelf A')]} />);
    const capture = captureLinkClicks();
    stop = capture.stop;
    const selection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => 'Shelf' } as Selection);

    fireEvent.click(screen.getByText('Shelf A'));

    expect(capture.hrefs).toHaveLength(0);
    selection.mockRestore();
  });
});
