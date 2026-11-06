/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { ItemPartNested } from '@/types/backoffice';

const updateItemPartMock = vi.fn().mockResolvedValue({});
vi.mock('@/services/backoffice/manuscripts', () => ({
  updateItemPart: (...args: unknown[]) => updateItemPartMock(...args),
}));
vi.mock('./current-item-combobox', () => ({ CurrentItemCombobox: () => null }));

import { PartLocationFields, usePartLocation } from './part-location-fields';
import { renderWithQueryClient } from '@/test/render';

const PART = {
  id: 7,
  current_item: 3,
  current_item_display: 'Edinburgh, NRS, GD45',
  current_item_locus: 'fol. 1',
  custom_label: '',
} as ItemPartNested;

function Form() {
  const { location, change, dirty, save } = usePartLocation(PART, 42, {
    saved: 'saved',
    failed: 'failed',
  });
  return (
    <>
      <PartLocationFields location={location} onChange={change} part={PART} />
      <button disabled={!dirty} onClick={() => save.mutate()}>
        Save
      </button>
    </>
  );
}

describe('usePartLocation', () => {
  it('saves the edited location and refreshes the manuscript', async () => {
    const { client } = renderWithQueryClient(<Form />, { tooltip: true });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByDisplayValue('fol. 1'), { target: { value: 'fol. 2r' } });
    fireEvent.click(save);

    await waitFor(() =>
      expect(updateItemPartMock).toHaveBeenCalledWith(7, {
        current_item: 3,
        current_item_locus: 'fol. 2r',
        custom_label: '',
      })
    );
    await waitFor(() => expect(save).toHaveProperty('disabled', true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: backofficeKeys.manuscripts.detail(42),
    });
  });
});
