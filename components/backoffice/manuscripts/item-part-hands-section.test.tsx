/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { AdminHandListItem, AdminScribeListItem } from '@/types/backoffice';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: 'tok' }),
}));

const walkPaginatedMock = vi.fn();
vi.mock('@/lib/backoffice/walk-paginated', () => ({
  walkPaginated: (...args: unknown[]) => walkPaginatedMock(...args),
}));

const createHandMock = vi.fn();
vi.mock('@/services/backoffice/scribes', () => ({
  createHand: (...args: unknown[]) => createHandMock(...args),
}));

import { ItemPartHandsSection } from './item-part-hands-section';

const HAND = {
  id: 11,
  name: 'Main hand',
  scribe: 21,
  scribe_name: 'Scribe A',
} as AdminHandListItem;

const SCRIBES = [
  { id: 21, name: 'Scribe A' },
  { id: 22, name: 'Scribe B' },
] as AdminScribeListItem[];

let hands: AdminHandListItem[] = [];

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <ItemPartHandsSection itemPartId={5} />
    </QueryClientProvider>
  );
  return { invalidateSpy };
}

beforeEach(() => {
  hands = [HAND];
  walkPaginatedMock.mockReset();
  walkPaginatedMock.mockImplementation(async (path: string) =>
    path.includes('/scribes/scribes/') ? SCRIBES : hands
  );
  createHandMock.mockReset();
  createHandMock.mockResolvedValue({});
});

describe('ItemPartHandsSection', () => {
  it("lists the part's own hands, each linking to its hand page", async () => {
    renderSection();

    const link = await screen.findByRole('link', { name: /Main hand/ });
    expect(link.getAttribute('href')).toBe('/backoffice/hands/11');
    expect(screen.getByText('Hands (1)')).toBeDefined();
    expect(walkPaginatedMock.mock.calls[0][0]).toContain('/hands/?item_part=5&');
  });

  it('says graphs cannot be annotated while the part has no hands', async () => {
    hands = [];
    renderSection();

    expect(await screen.findByText(/No hands yet/)).toBeDefined();
    expect(screen.getByText('Hands (0)')).toBeDefined();
  });

  it('adds a hand to this part with the picked scribe and the trimmed name', async () => {
    const { invalidateSpy } = renderSection();
    await screen.findByText('Hands (1)');

    fireEvent.click(screen.getByRole('button', { name: 'Add hand' }));
    const create = screen.getByRole('button', { name: 'Create' }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);

    await waitFor(() =>
      expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(await screen.findByPlaceholderText('Search scribes...'), {
      target: { value: 'Scribe B' },
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Scribe B' }));
    expect(create.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: '  Second hand  ' } });
    expect(create.disabled).toBe(false);
    fireEvent.click(create);

    await waitFor(() => expect(createHandMock).toHaveBeenCalledTimes(1));
    expect(createHandMock.mock.calls[0][0]).toEqual({
      item_part: 5,
      scribe: 22,
      name: 'Second hand',
    });
    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: backofficeKeys.hands.all() })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
