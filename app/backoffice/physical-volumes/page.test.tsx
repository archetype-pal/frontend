/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { CurrentItemOption } from '@/types/backoffice';
import { renderWithQueryClient } from '@/test/render';

import PhysicalVolumesPage from './page';

const LINKED: CurrentItemOption = {
  id: 1,
  description: '',
  repository: 3,
  repository_name: 'BL',
  shelfmark: 'Cotton Ch. 1',
  part_count: 2,
};
const UNLINKED: CurrentItemOption = { ...LINKED, id: 2, shelfmark: 'Cotton Ch. 2', part_count: 0 };

let rows: CurrentItemOption[] = [];
const updateCurrentItemMock = vi.fn();

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/lib/backoffice/walk-paginated', () => ({ walkPaginated: async () => [] }));
vi.mock('@/services/backoffice/manuscripts', () => ({
  getCurrentItems: async () => ({ count: rows.length, next: null, previous: null, results: rows }),
  getCurrentItem: async (id: number) => rows.find((r) => r.id === id),
  updateCurrentItem: (...args: unknown[]) => updateCurrentItemMock(...args),
  getRepositories: async () => [],
  deleteCurrentItem: vi.fn(),
}));

function renderPage() {
  return renderWithQueryClient(<PhysicalVolumesPage />, { modelLabels: true }).client;
}

beforeEach(() => {
  rows = [LINKED, UNLINKED];
  updateCurrentItemMock.mockReset();
  updateCurrentItemMock.mockImplementation(async (id: number, values: object) => {
    rows = rows.map((r) => (r.id === id ? { ...r, ...values } : r));
  });
});

describe('<PhysicalVolumesPage>', () => {
  it('can edit every item, also one linked to manuscripts', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'Edit item BL Cotton Ch. 1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Edit item BL Cotton Ch. 2' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Delete item BL Cotton Ch. 1' })).toBeNull();
  });

  it('keeps the edit dialog open while the page refetches', async () => {
    const client = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit item BL Cotton Ch. 1' }));
    fireEvent.change(await screen.findByLabelText(/Shelfmark/), {
      target: { value: 'Cotton Ch. 1a' },
    });
    await client.invalidateQueries({ queryKey: backofficeKeys.repositories.all() });

    expect(screen.getByRole('dialog')).toBeDefined();
    expect((screen.getByLabelText(/Shelfmark/) as HTMLInputElement).value).toBe('Cotton Ch. 1a');
  });

  it('keeps the edit dialog when its row leaves the table', async () => {
    const client = renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit item BL Cotton Ch. 1' }));
    await screen.findByLabelText(/Shelfmark/);
    rows = [UNLINKED];
    await client.invalidateQueries({ queryKey: backofficeKeys.currentItems.all() });

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Edit item BL Cotton Ch. 1', hidden: true })
      ).toBeNull()
    );
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('returns focus to the pencil after saving', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit item BL Cotton Ch. 1' }));
    fireEvent.change(await screen.findByLabelText(/Shelfmark/), {
      target: { value: 'Cotton Ch. 1a' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const pencil = await screen.findByRole('button', { name: 'Edit item BL Cotton Ch. 1a' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(pencil);
  });
});
