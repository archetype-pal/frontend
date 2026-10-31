import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultsTable } from './results-table';
import type { HandListItem, ManuscriptListItem } from '@/types/search';

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
  catalogue_numbers: ['Ker 236', 'Lawrie 12'],
  date: '1100',
  type: 'charter',
  number_of_images: 0,
  issuer_name: '',
  named_beneficiary: '',
};

const hand: HandListItem = {
  id: 2,
  name: 'Hand A',
  repository_city: 'London',
  repository_name: 'British Library',
  shelfmark: 'Add 2',
  catalogue_numbers: ['Ker 236', 'Lawrie 12'],
  place: '',
  date: null,
  description: '',
};

describe('ResultsTable multi-valued cells', () => {
  it('joins an array cell with a separator instead of concatenating the values', () => {
    render(<ResultsTable results={[manuscript]} resultType="manuscripts" />);
    expect(screen.getByText('Ker 236, Lawrie 12')).toBeTruthy();
    expect(screen.queryByText('Ker 236Lawrie 12')).toBeNull();
  });

  it('joins the hands column the same way', () => {
    render(<ResultsTable results={[hand]} resultType="hands" />);
    expect(screen.getByText('Ker 236, Lawrie 12')).toBeTruthy();
  });
});
