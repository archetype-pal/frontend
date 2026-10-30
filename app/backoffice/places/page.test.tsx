/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PlacesPage from './page';
import { renderWithQueryClient } from '@/test/render';

const createPlaceMock = vi.fn();
const updatePlaceMock = vi.fn();
const deletePlaceMock = vi.fn();

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/manuscripts', () => ({
  getPlaces: async () => [
    { id: 1, name: 'Worcester' },
    { id: 2, name: 'york' },
  ],
  createPlace: (...args: unknown[]) => createPlaceMock(...args),
  updatePlace: (...args: unknown[]) => updatePlaceMock(...args),
  deletePlace: (...args: unknown[]) => deletePlaceMock(...args),
}));

beforeEach(() => {
  for (const mock of [createPlaceMock, updatePlaceMock, deletePlaceMock]) {
    mock.mockReset();
    mock.mockResolvedValue({});
  }
});

describe('<PlacesPage>', () => {
  it('renames a place', async () => {
    renderWithQueryClient(<PlacesPage />, { tooltip: true });

    fireEvent.click(await screen.findByRole('button', { name: 'york' }));
    const input = screen.getByDisplayValue('york');
    fireEvent.change(input, { target: { value: 'York' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(updatePlaceMock).toHaveBeenCalledWith(2, { name: 'York' }));
  });

  it('adds a place', async () => {
    renderWithQueryClient(<PlacesPage />, { tooltip: true });

    fireEvent.click(await screen.findByRole('button', { name: 'New Place' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Worcester'), {
      target: { value: 'Durham' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(createPlaceMock).toHaveBeenCalledWith({ name: 'Durham' }));
  });

  it('says that hands lose the place before deleting it', async () => {
    renderWithQueryClient(<PlacesPage />, { tooltip: true });

    await screen.findByRole('button', { name: 'york' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete place' })[1]);

    expect(
      screen.getByText('Hands linked to this place will no longer have a place.')
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deletePlaceMock).toHaveBeenCalledWith(2));
  });
});
