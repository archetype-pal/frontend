import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsTable } from './results-table';
import type { ManuscriptListItem } from '@/types/search';

vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

const manuscript: ManuscriptListItem = {
  id: 1,
  repository_name: 'British Library',
  repository_city: 'London',
  shelfmark: 'Add 1',
  catalogue_numbers: [],
  date: '1100',
  type: 'codex',
  number_of_images: 0,
  issuer_name: '',
  named_beneficiary: '',
  description: ['Psalter and prayers', 'Gospels'],
  description_source: 'G.',
};

function descriptionCell(text: string) {
  return screen.getByText(
    (_, element) => element?.tagName === 'TD' && element.textContent === text
  );
}

describe('ResultsTable manuscript description column', () => {
  it('shows the first description followed by its source', () => {
    render(
      <ResultsTable
        results={[manuscript]}
        resultType="manuscripts"
        visibleColumns={['Description']}
      />
    );

    expect(descriptionCell('Psalter and prayers (G.)')).toBeTruthy();
    expect(screen.queryByText(/Gospels/)).toBeNull();
  });

  it('marks the match Meilisearch highlighted', () => {
    const hit = {
      ...manuscript,
      _formatted: { description: ['__hl_start__Psalter__hl_end__ and prayers', 'Gospels'] },
    };

    render(
      <ResultsTable results={[hit]} resultType="manuscripts" visibleColumns={['Description']} />
    );

    expect(descriptionCell('Psalter and prayers (G.)').querySelector('mark')?.textContent).toBe(
      'Psalter'
    );
  });

  it('shows a dash when the manuscript has no description', () => {
    const undescribed = { ...manuscript, description: undefined, description_source: undefined };

    render(
      <ResultsTable
        results={[undescribed]}
        resultType="manuscripts"
        visibleColumns={['Description']}
      />
    );

    expect(descriptionCell('—')).toBeTruthy();
  });
});
