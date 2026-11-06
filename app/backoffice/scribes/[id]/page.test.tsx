/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQueryClient } from '@/test/render';

const getScribe = vi.hoisted(() =>
  vi.fn(async (id: number) => ({ id, name: 'A scribe', scriptorium: '', period: null }))
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('@/services/backoffice/scribes', () => ({
  getScribe,
  updateScribe: vi.fn(),
  deleteScribe: vi.fn(),
}));
vi.mock('@/hooks/backoffice/use-lookups', () => ({ useDates: () => ({ data: [] }) }));
vi.mock('@/lib/backoffice/walk-paginated', () => ({ walkPaginated: async () => [] }));

import ScribeDetailPage from './page';

// A promise React already knows is fulfilled, so `use(params)` reads it without suspending.
const resolvedParams = (id: string) =>
  Object.assign(Promise.resolve({ id }), { status: 'fulfilled', value: { id } });

async function renderPage(id: string) {
  renderWithQueryClient(<ScribeDetailPage params={resolvedParams(id)} />);
  await screen.findByDisplayValue('A scribe');
}

describe('<ScribeDetailPage>', () => {
  it('links a scribe to their public profile', async () => {
    await renderPage('5');

    expect(screen.getByRole('link', { name: /public profile/i }).getAttribute('href')).toBe(
      '/scribes/5'
    );
  });

  it('has no profile link for the placeholder scribe, which has no public page', async () => {
    await renderPage('-1');

    expect(screen.queryByRole('link', { name: /public profile/i })).toBeNull();
  });
});
