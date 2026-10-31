/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

// The page's child panels are out of scope here.
vi.mock('@/components/backoffice/symbols/symbol-tree-sidebar', () => ({
  SymbolTreeSidebar: () => <div>sidebar</div>,
}));
vi.mock('@/components/backoffice/symbols/character-detail', () => ({
  CharacterDetail: () => null,
}));

const getFeatures = vi.fn();
vi.mock('@/services/backoffice/symbols', () => ({
  getCharacters: async () => [],
  getComponents: async () => [],
  getFeatures: () => getFeatures(),
  getPositions: async () => [],
  createCharacter: vi.fn(),
}));

import { backofficeKeys } from '@/lib/backoffice/query-keys';

import SymbolsPage from './page';
import { createTestQueryClient } from '@/test/query-client';

function renderPage() {
  const client = createTestQueryClient();
  render(
    <QueryClientProvider client={client}>
      <SymbolsPage />
    </QueryClientProvider>
  );
  return client;
}

describe('SymbolsPage', () => {
  it('shows an error with Retry when the structure fails to load', async () => {
    getFeatures.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Failed to load the symbols structure')).toBeDefined();
    expect(screen.queryByText('sidebar')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('sidebar')).toBeDefined());
    expect(getFeatures).toHaveBeenCalledTimes(2);
  });

  it('keeps the loaded structure on screen when a later refresh fails', async () => {
    getFeatures.mockResolvedValueOnce([]).mockRejectedValue(new Error('offline'));
    const client = renderPage();
    expect(await screen.findByText('sidebar')).toBeDefined();

    await act(async () => {
      await client.invalidateQueries({ queryKey: backofficeKeys.features.all() });
      // Let the failed refetch reach the page before asserting.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(client.getQueryState(backofficeKeys.features.all())?.status).toBe('error');
    expect(screen.getByText('sidebar')).toBeDefined();
    expect(screen.queryByText('Failed to load the symbols structure')).toBeNull();
  });
});
