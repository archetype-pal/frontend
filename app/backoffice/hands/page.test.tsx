/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HandsPage from './page';

const { getHands } = vi.hoisted(() => ({ getHands: vi.fn() }));

vi.mock('@/contexts/auth-context', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/services/backoffice/scribes', () => ({ getHands }));

const TOTAL = 45;

function hand(id: number) {
  return {
    id,
    name: `Hand ${id}`,
    scribe: 1,
    scribe_name: 'Scribe',
    item_part: 1,
    item_part_display: 'Part',
    script_name: null,
    date_display: null,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <HandsPage />
    </QueryClientProvider>
  );
}

describe('<HandsPage>', () => {
  beforeEach(() => {
    getHands.mockReset();
    getHands.mockImplementation(async ({ limit, offset }: { limit: number; offset: number }) => ({
      count: TOTAL,
      next: null,
      previous: null,
      results: Array.from({ length: Math.min(limit, TOTAL - offset) }, (_, i) =>
        hand(offset + i + 1)
      ),
    }));
  });

  it('asks the server for the first page and shows its total', async () => {
    renderPage();

    expect(await screen.findByText('Hand 1')).toBeTruthy();
    expect(getHands).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(screen.getByText('45 hands')).toBeTruthy();
    expect(screen.getByText('1–20 of 45')).toBeTruthy();
  });

  it('sends the search, the sort and the page to the server', async () => {
    renderPage();
    await screen.findByText('Hand 1');

    fireEvent.change(screen.getByPlaceholderText('Search hands...'), {
      target: { value: 'Hand' },
    });
    await waitFor(() =>
      expect(getHands).toHaveBeenLastCalledWith({ limit: 20, offset: 0, search: 'Hand' })
    );

    fireEvent.click(screen.getByRole('button', { name: /Name/ }));
    await waitFor(() =>
      expect(getHands).toHaveBeenLastCalledWith({
        limit: 20,
        offset: 0,
        search: 'Hand',
        ordering: 'name',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Hand 21')).toBeTruthy();
    expect(getHands).toHaveBeenLastCalledWith({
      limit: 20,
      offset: 20,
      search: 'Hand',
      ordering: 'name',
    });
  });

  it('dims the table while the new results load', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const respond = getHands.getMockImplementation()!;
    getHands.mockImplementation(async (params: { search?: string }) => {
      if (params.search) await gate;
      return respond(params);
    });
    renderPage();
    await screen.findByText('Hand 1');
    const busy = () => screen.getByRole('table').closest('[aria-busy="true"]');
    expect(busy()).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Search hands...'), {
      target: { value: 'Hand' },
    });

    await waitFor(() => expect(busy()).not.toBeNull());
    release();
    await waitFor(() => expect(busy()).toBeNull());
  });
});
