/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CurrentItemOption } from '@/types/backoffice';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ token: 'tok' }),
}));

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: () => 'Shelfmark' }),
}));

const getCurrentItemsMock = vi.fn();
const createCurrentItemMock = vi.fn();
vi.mock('@/services/backoffice/manuscripts', () => ({
  getCurrentItems: (...args: unknown[]) => getCurrentItemsMock(...args),
  createCurrentItem: (...args: unknown[]) => createCurrentItemMock(...args),
  getRepositories: async () => [{ id: 3, name: 'Winchester College', label: 'Winchester Coll.' }],
}));

import { CurrentItemCombobox } from './current-item-combobox';

function item(id: number, repositoryName: string, shelfmark: string): CurrentItemOption {
  return {
    id,
    description: '',
    repository: 3,
    repository_name: repositoryName,
    shelfmark,
    part_count: 1,
  };
}

function Harness({ repositoryId }: { repositoryId?: number }) {
  const [value, setValue] = React.useState<number | null>(7);
  return (
    <CurrentItemCombobox
      value={value}
      onChange={setValue}
      selectedLabel="Winchester Coll. 12092"
      repositoryId={repositoryId}
    />
  );
}

function renderCombobox(repositoryId?: number) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness repositoryId={repositoryId} />
    </QueryClientProvider>
  );
}

function openAndType(text: string) {
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.change(screen.getByPlaceholderText('Search by repository or shelfmark...'), {
    target: { value: text },
  });
}

beforeEach(() => {
  getCurrentItemsMock.mockReset();
  createCurrentItemMock.mockReset();
});

describe('CurrentItemCombobox', () => {
  it('asks the server for matches instead of loading a fixed list', async () => {
    getCurrentItemsMock.mockResolvedValue({
      count: 120,
      results: [item(2, 'Taunton', 'DD/CC 10'), item(1, 'Taunton', 'DD/CC 2')],
    });
    renderCombobox();

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Type to search')).toBeDefined();
    expect(getCurrentItemsMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Search by repository or shelfmark...'), {
      target: { value: 'taunton' },
    });

    const options = await screen.findAllByRole('option');
    expect(getCurrentItemsMock).toHaveBeenCalledWith({
      repository: undefined,
      search: 'taunton',
      limit: 50,
    });
    expect(options.map((o) => o.textContent)).toEqual(['Taunton DD/CC 2', 'Taunton DD/CC 10']);
    const hint = screen.getByText('Showing 2 of 120. Keep typing to narrow the list.');
    expect(screen.getByRole('listbox').contains(hint)).toBe(false);
  });

  it('hides the previous results until the new search has run', async () => {
    getCurrentItemsMock.mockResolvedValue({ count: 1, results: [item(2, 'Taunton', 'DD/CC 10')] });
    renderCombobox();

    openAndType('taunton');
    await screen.findByRole('option', { name: 'Taunton DD/CC 10' });
    fireEvent.change(screen.getByPlaceholderText('Search by repository or shelfmark...'), {
      target: { value: 'tauntonx' },
    });

    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('Searching…')).toBeDefined();
  });

  it('says the search failed instead of reporting no items', async () => {
    getCurrentItemsMock.mockRejectedValue(new Error('offline'));
    renderCombobox();

    openAndType('taunton');

    expect(await screen.findByText('The search failed.')).toBeDefined();
    expect(screen.queryByText('No items found.')).toBeNull();
  });

  it('shows the picked item before the part is saved', async () => {
    getCurrentItemsMock.mockResolvedValue({ count: 1, results: [item(2, 'Taunton', 'DD/CC 10')] });
    renderCombobox();

    openAndType('taunton');
    fireEvent.click(await screen.findByRole('option', { name: 'Taunton DD/CC 10' }));

    expect(screen.getByRole('combobox').textContent).toBe('Taunton DD/CC 10');

    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByPlaceholderText('Search by repository or shelfmark...');
    expect((input as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Type to search')).toBeDefined();
  });

  it('keeps Create in view while searching and starts it from the search text', async () => {
    getCurrentItemsMock.mockResolvedValue({ count: 0, results: [] });
    createCurrentItemMock.mockResolvedValue(item(99, 'Winchester Coll.', 'GD55/9'));
    renderCombobox(3);

    openAndType('GD55/9');
    expect(await screen.findByText('No items found.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Create "GD55/9"' }));

    expect((screen.getByPlaceholderText('Shelfmark (e.g. GD55/1)') as HTMLInputElement).value).toBe(
      'GD55/9'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(createCurrentItemMock).toHaveBeenCalledWith({ repository: 3, shelfmark: 'GD55/9' })
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox').textContent).toBe('Winchester Coll. GD55/9')
    );
  });
});
