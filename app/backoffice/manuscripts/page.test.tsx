/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ManuscriptsPage from './page';
import { renderWithQueryClient } from '@/test/render';

const { getHistoricalItems, downloadBlob } = vi.hoisted(() => ({
  getHistoricalItems: vi.fn(),
  downloadBlob: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('@/services/backoffice/manuscripts', () => ({ getHistoricalItems }));
vi.mock('@/lib/download', () => ({ downloadBlob }));

const renderPage = () => renderWithQueryClient(<ManuscriptsPage />, { modelLabels: true });

describe('<ManuscriptsPage>', () => {
  beforeEach(() => {
    getHistoricalItems.mockReset();
    downloadBlob.mockReset();
    getHistoricalItems.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  });

  it('exports every manuscript matching the current search and sort', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Shelfmark/ }));
    fireEvent.change(screen.getByPlaceholderText(/^Search by shelfmark/), {
      target: { value: 'Durham' },
    });
    await waitFor(() =>
      expect(getHistoricalItems).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Durham' })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith('manuscripts.csv', expect.any(Blob))
    );
    expect(getHistoricalItems).toHaveBeenLastCalledWith({
      limit: 100,
      offset: 0,
      search: 'Durham',
      ordering: 'first_repository_label,first_shelfmark',
    });
  });
});
