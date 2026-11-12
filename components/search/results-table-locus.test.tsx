import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsTable } from './results-table';
import type { ManuscriptCompareSelection } from '@/hooks/search/use-manuscript-compare-selection';
import type { ManuscriptListItem } from '@/types/search';

vi.mock('@/contexts/model-labels-context', () => import('@/test/mocks/model-labels-context'));

vi.mock('@/contexts/collection-context', () => ({
  useCollection: () => ({
    isInCollection: () => false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

const part = (id: number, locus?: string): ManuscriptListItem => ({
  id,
  repository_name: 'British Library',
  repository_city: 'London',
  shelfmark: 'Cotton Tiberius A.xiii',
  ...(locus === undefined ? {} : { locus }),
  catalogue_numbers: ['D. 1068'],
  date: '',
  type: 'manuscript',
  number_of_images: 19,
  issuer_name: '',
  named_beneficiary: '',
});

describe('ResultsTable manuscripts locus column', () => {
  it('shows each part’s locus so parts of one shelfmark are told apart', () => {
    render(
      <ResultsTable
        results={[part(1, 'fols. 1–118'), part(2, 'fols. 119–200')]}
        resultType="manuscripts"
        visibleColumns={['Shelfmark', 'Locus']}
      />
    );

    expect(screen.getByRole('columnheader', { name: /Locus/ })).toBeTruthy();
    expect(screen.getByText('fols. 1–118')).toBeTruthy();
    expect(screen.getByText('fols. 119–200')).toBeTruthy();
  });

  it('sorts by locus from its header', () => {
    const onSort = vi.fn();
    render(
      <ResultsTable
        results={[part(1, 'fols. 1–118')]}
        resultType="manuscripts"
        visibleColumns={['Shelfmark', 'Locus']}
        ordering={{
          current: 'shelfmark',
          options: [{ name: 'locus', text: 'Locus', url: '?ordering=locus' }],
        }}
        onSort={onSort}
      />
    );

    const header = screen.getByRole('columnheader', { name: /Locus/ });
    fireEvent.click(within(header).getByRole('button'));

    expect(onSort).toHaveBeenCalledWith({ sortKey: 'locus_exact', sortUrl: '?ordering=locus' });
  });

  it('renders a dash when the part has no locus', () => {
    render(
      <ResultsTable results={[part(3)]} resultType="manuscripts" visibleColumns={['Locus']} />
    );

    const [, row] = screen.getAllByRole('row');
    expect(within(row).getByText('—')).toBeTruthy();
  });

  it('names each part’s compare checkbox by its display label', () => {
    const selection: ManuscriptCompareSelection = {
      selectedIds: new Set<number>(),
      isSelected: () => false,
      isDisabled: () => false,
      toggle: vi.fn(),
      clear: vi.fn(),
      count: 0,
    };
    render(
      <ResultsTable
        results={[
          { ...part(1, 'fols. 1–118'), display_label: 'BL Cotton Tiberius A.xiii fols. 1–118' },
          { ...part(2, 'fols. 119–200'), display_label: 'BL Cotton Tiberius A.xiii fols. 119–200' },
        ]}
        resultType="manuscripts"
        visibleColumns={['Shelfmark', 'Locus']}
        manuscriptSelection={selection}
      />
    );

    expect(
      screen.getByRole('checkbox', {
        name: 'Select BL Cotton Tiberius A.xiii fols. 1–118 to compare',
      })
    ).toBeTruthy();
    expect(
      screen.getByRole('checkbox', {
        name: 'Select BL Cotton Tiberius A.xiii fols. 119–200 to compare',
      })
    ).toBeTruthy();
  });
});
