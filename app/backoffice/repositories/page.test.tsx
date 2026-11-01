/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import RepositoriesPage from './page';
import { renderWithQueryClient } from '@/test/render';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));

const updateRepositoryMock = vi.fn();

vi.mock('@/services/backoffice/manuscripts', () => ({
  getRepositories: async () => [
    {
      id: 1,
      name: 'British Library',
      label: 'BL',
      place: 10,
      place_display: 'London',
      url: null,
      type: null,
      current_item_count: 2,
    },
    {
      id: 2,
      name: 'Empty Library',
      label: 'EL',
      place: 11,
      place_display: 'Paris',
      url: null,
      type: null,
      current_item_count: 0,
    },
  ],
  getPlaces: async () => [
    { id: 10, name: 'London' },
    { id: 11, name: 'Paris' },
  ],
  createPlace: vi.fn(),
  createRepository: vi.fn(),
  updateRepository: (...args: unknown[]) => updateRepositoryMock(...args),
  deleteRepository: vi.fn(),
}));

describe('<RepositoriesPage>', () => {
  it('disables delete, with the reason, on repositories that have linked items', async () => {
    renderWithQueryClient(<RepositoriesPage />, { tooltip: true });

    const blocked = await screen.findByRole('button', {
      name: "Can't delete: this repository has 2 linked items. Move or delete them first.",
    });
    expect((blocked as HTMLButtonElement).disabled).toBe(true);
    const allowed = screen.getByRole('button', { name: 'Delete repository' });
    expect((allowed as HTMLButtonElement).disabled).toBe(false);
  });

  it("picks a repository's place from the place list", async () => {
    updateRepositoryMock.mockResolvedValue({});
    renderWithQueryClient(<RepositoriesPage />, { tooltip: true });

    const picker = await screen.findByRole('combobox', { name: 'Place of British Library' });
    expect(picker.textContent).toContain('London');
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: 'Paris' }));

    await waitFor(() => expect(updateRepositoryMock).toHaveBeenCalledWith(1, { place: 11 }));
  });
});
