/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createPlaceMock = vi.fn();
vi.mock('@/services/backoffice/manuscripts', () => ({
  getPlaces: vi.fn().mockResolvedValue([
    { id: 1, name: 'London' },
    { id: 2, name: 'Winchester' },
  ]),
  createPlace: (...args: unknown[]) => createPlaceMock(...args),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

import { PlaceCombobox } from './place-combobox';

function renderCombobox(onChange = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <label htmlFor="hand-place">Place</label>
      <PlaceCombobox id="hand-place" value={null} onChange={onChange} />
    </QueryClientProvider>
  );
  return { onChange };
}

async function search(text: string) {
  fireEvent.click(screen.getByRole('combobox', { name: 'Place' }));
  await screen.findByRole('option', { name: 'London' });
  fireEvent.change(screen.getByPlaceholderText('Search places...'), { target: { value: text } });
}

beforeEach(() => {
  createPlaceMock.mockReset();
  createPlaceMock.mockResolvedValue({ id: 3, name: 'Dunfermline' });
});

describe('PlaceCombobox', () => {
  it('is named by its label', () => {
    renderCombobox();
    expect(screen.getByRole('combobox', { name: 'Place' })).toBeTruthy();
  });

  it('offers to create the searched name when nothing matches, prefilled', async () => {
    const { onChange } = renderCombobox();
    await search('Dunfermline');

    expect(screen.queryByRole('option', { name: 'London' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Create “Dunfermline”' }));

    expect((screen.getByPlaceholderText('Place name') as HTMLInputElement).value).toBe(
      'Dunfermline'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(createPlaceMock).toHaveBeenCalledWith({ name: 'Dunfermline' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(3, { id: 3, name: 'Dunfermline' }));
  });

  it('does not offer to create a place whose name is already listed', async () => {
    renderCombobox();
    await search('london');

    expect(screen.getByRole('option', { name: 'London' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Create/ })).toBeNull();
  });
});
