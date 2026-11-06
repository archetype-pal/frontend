/** @vitest-environment jsdom */
import { act, Suspense } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ScribeDetailPage from './page';
import { renderWithQueryClient } from '@/test/render';

const updateScribeMock = vi.fn();

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('next/navigation', () => import('@/test/mocks/next-navigation'));
vi.mock('@/lib/backoffice/walk-paginated', () => ({ walkPaginated: async () => [] }));
vi.mock('@/services/backoffice/scribes', () => ({
  getScribe: async (id: number) => ({
    id,
    name: 'Scribe A',
    period: null,
    period_display: null,
    scriptorium: 10,
    scriptorium_display: 'Worcester',
    hand_count: 0,
  }),
  updateScribe: (...args: unknown[]) => updateScribeMock(...args),
  deleteScribe: vi.fn(),
}));
vi.mock('@/services/backoffice/manuscripts', () => ({
  getDates: async () => [],
  getPlaces: async () => [
    { id: 10, name: 'Worcester' },
    { id: 11, name: 'Canterbury' },
  ],
  createPlace: vi.fn(),
}));

describe('<ScribeDetailPage>', () => {
  it("picks the scribe's scriptorium from the place list", async () => {
    updateScribeMock.mockResolvedValue({});
    await act(async () => {
      renderWithQueryClient(
        <Suspense fallback={null}>
          <ScribeDetailPage params={Promise.resolve({ id: '4' })} />
        </Suspense>
      );
    });

    const picker = await screen.findByRole('combobox', { name: 'Scriptorium' });
    expect(picker.textContent).toContain('Worcester');
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: 'Canterbury' }));
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));

    await waitFor(() =>
      expect(updateScribeMock).toHaveBeenCalledWith(4, expect.objectContaining({ scriptorium: 11 }))
    );
  });

  it.each([
    ['links a scribe to their public profile', '5', true],
    ['has no profile link for the placeholder scribe, which has no public page', '-1', false],
  ])('%s', async (_name, id, linked) => {
    await act(async () => {
      renderWithQueryClient(
        <Suspense fallback={null}>
          <ScribeDetailPage params={Promise.resolve({ id })} />
        </Suspense>
      );
    });

    await screen.findByRole('combobox', { name: 'Scriptorium' });
    expect(screen.queryByRole('link', { name: /public profile/i }) !== null).toBe(linked);
  });
});
