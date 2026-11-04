/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQueryClient } from '@/test/render';

const { getHand, updateHand } = vi.hoisted(() => ({ getHand: vi.fn(), updateHand: vi.fn() }));
const { SCRIPTS } = vi.hoisted(() => ({
  SCRIPTS: [
    { id: 1, name: 'Caroline minuscule' },
    { id: 2, name: 'Square minuscule' },
  ],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));
vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('@/services/backoffice/scribes', () => ({ getHand, updateHand, deleteHand: vi.fn() }));
vi.mock('@/hooks/backoffice/use-lookups', () => ({
  useDates: () => ({ data: [] }),
  useScripts: () => ({ data: SCRIPTS }),
}));
vi.mock('@/lib/backoffice/walk-paginated', () => ({ walkPaginated: async () => [] }));
vi.mock('@/components/backoffice/common/place-combobox', () => ({ PlaceCombobox: () => null }));
vi.mock('@/components/backoffice/scribes/hand-descriptions-section', () => ({
  HandDescriptionsSection: () => null,
}));

import HandDetailPage from './page';

const HAND = {
  id: 3,
  name: 'Main hand',
  scribe: 1,
  scribe_name: 'Scribe',
  item_part: 7,
  item_part_display: 'Part',
  script: null,
  script_name: null,
  display_order: 2,
  date: null,
  date_display: null,
  place: null,
  place_display: null,
  descriptions: [],
  item_part_images: [],
};

// A promise React already knows is fulfilled, so `use(params)` reads it without suspending.
const resolvedParams = () =>
  Object.assign(Promise.resolve({ id: '3' }), { status: 'fulfilled', value: { id: '3' } });

const renderPage = () => renderWithQueryClient(<HandDetailPage params={resolvedParams()} />);

describe('<HandDetailPage>', () => {
  beforeEach(() => {
    getHand.mockReset().mockResolvedValue(HAND);
    updateHand.mockReset().mockImplementation(async (_id: number, form: object) => ({
      ...HAND,
      ...form,
    }));
  });

  it("shows the hand's display order and saves a new one", async () => {
    renderPage();

    const field = (await screen.findByLabelText('Display order')) as HTMLInputElement;
    expect(field.value).toBe('2');

    fireEvent.change(field, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateHand).toHaveBeenCalledWith(3, expect.objectContaining({ display_order: 1 }))
    );
  });

  it('keeps the display order a whole number of zero or more', async () => {
    renderPage();

    const field = (await screen.findByLabelText('Display order')) as HTMLInputElement;
    fireEvent.change(field, { target: { value: '-4' } });
    expect(field.value).toBe('0');
    fireEvent.change(field, { target: { value: '3.7' } });
    expect(field.value).toBe('3');
  });

  it("shows the hand's script and saves a new one", async () => {
    getHand.mockResolvedValue({ ...HAND, script: 1, script_name: 'Caroline minuscule' });
    renderPage();

    const field = await screen.findByRole('combobox', { name: 'Script' });
    expect(field.textContent).toBe('Caroline minuscule');

    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Square minuscule' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateHand).toHaveBeenCalledWith(3, expect.objectContaining({ script: 2 }))
    );
  });

  it('clears the script with None', async () => {
    getHand.mockResolvedValue({ ...HAND, script: 1, script_name: 'Caroline minuscule' });
    renderPage();

    fireEvent.keyDown(await screen.findByRole('combobox', { name: 'Script' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'None' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(updateHand).toHaveBeenCalledWith(3, expect.objectContaining({ script: null }))
    );
  });
});
