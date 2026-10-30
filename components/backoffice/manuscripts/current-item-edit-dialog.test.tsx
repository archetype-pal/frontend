/** @vitest-environment jsdom */
import * as React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { CurrentItemOption } from '@/types/backoffice';
import { renderWithQueryClient } from '@/test/render';

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));

vi.mock('@/contexts/model-labels-context', () => ({
  useModelLabels: () => ({ getLabel: () => 'Shelfmark' }),
}));

const getCurrentItemMock = vi.fn();
const updateCurrentItemMock = vi.fn();
vi.mock('@/services/backoffice/manuscripts', () => ({
  getCurrentItem: (...args: unknown[]) => getCurrentItemMock(...args),
  updateCurrentItem: (...args: unknown[]) => updateCurrentItemMock(...args),
  getRepositories: async () => [
    { id: 3, name: 'Winchester College', label: 'Winchester Coll.' },
    { id: 4, name: 'Somerset Heritage Centre', label: 'Taunton' },
  ],
}));

import { CurrentItemEditButton } from './current-item-edit-dialog';

const ITEM: CurrentItemOption = {
  id: 7,
  description: 'Old note',
  repository: 3,
  repository_name: 'Winchester Coll.',
  shelfmark: '12092',
  part_count: 1,
};

function renderButton() {
  const { client } = renderWithQueryClient(
    <CurrentItemEditButton itemId={7} label="Edit item Winchester Coll. 12092" />
  );
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
  fireEvent.click(screen.getByRole('button', { name: 'Edit item Winchester Coll. 12092' }));
  return { invalidateSpy };
}

beforeEach(() => {
  getCurrentItemMock.mockReset();
  getCurrentItemMock.mockResolvedValue(ITEM);
  updateCurrentItemMock.mockReset();
  updateCurrentItemMock.mockResolvedValue({});
});

describe('CurrentItemEditButton', () => {
  it("saves the item's new repository, shelfmark and description", async () => {
    const { invalidateSpy } = renderButton();

    const shelfmark = await screen.findByLabelText(/Shelfmark/);
    expect((shelfmark as HTMLInputElement).value).toBe('12092');
    expect((screen.getByLabelText(/Description/) as HTMLTextAreaElement).value).toBe('Old note');

    const repository = await screen.findByRole('combobox', { name: /Repository/ });
    await waitFor(() => expect(repository.hasAttribute('disabled')).toBe(false));
    fireEvent.click(repository);
    fireEvent.click(
      await screen.findByRole('option', { name: 'Taunton (Somerset Heritage Centre)' })
    );
    fireEvent.change(shelfmark, { target: { value: ' DD/CC 10 ' } });
    fireEvent.change(screen.getByLabelText(/Description/), { target: { value: 'New note' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateCurrentItemMock).toHaveBeenCalledWith(7, {
        repository: 4,
        shelfmark: 'DD/CC 10',
        description: 'New note',
      })
    );
    expect(getCurrentItemMock).toHaveBeenCalledWith(7);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Edit item Winchester Coll. 12092' })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: backofficeKeys.currentItems.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: backofficeKeys.manuscripts.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: backofficeKeys.hands.all() });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: backofficeKeys.scribes.all() });
  });

  it('cannot save an item without a shelfmark', async () => {
    renderButton();

    fireEvent.change(await screen.findByLabelText(/Shelfmark/), { target: { value: '  ' } });

    expect(screen.getByRole('button', { name: 'Save' }).hasAttribute('disabled')).toBe(true);
  });

  it('saves once and keeps Save focusable while saving', async () => {
    updateCurrentItemMock.mockReturnValue(new Promise(() => {}));
    renderButton();

    await screen.findByLabelText(/Shelfmark/);
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    await waitFor(() => expect(updateCurrentItemMock).toHaveBeenCalledTimes(1));
    fireEvent.click(save);

    await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false));
    expect(updateCurrentItemMock).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when the item cannot be loaded', async () => {
    getCurrentItemMock.mockRejectedValueOnce(new Error('offline'));
    renderButton();

    expect(await screen.findByText('Failed to load this item.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: /Retry/ }));

    expect(await screen.findByLabelText(/Shelfmark/)).toBeDefined();
  });
});
