/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OriginsSection } from './origins-section';
import { renderWithQueryClient } from '@/test/render';
import type { HistoricalItemOrigin } from '@/types/backoffice';

const createOriginMock = vi.fn();
const updateOriginMock = vi.fn();
const deleteOriginMock = vi.fn();

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/manuscripts', () => ({
  getPlaces: async () => [
    { id: 10, name: 'Worcester' },
    { id: 11, name: 'Exeter' },
  ],
  createPlace: vi.fn(),
  createOrigin: (...args: unknown[]) => createOriginMock(...args),
  updateOrigin: (...args: unknown[]) => updateOriginMock(...args),
  deleteOrigin: (...args: unknown[]) => deleteOriginMock(...args),
}));

const ORIGIN: HistoricalItemOrigin = {
  id: 5,
  historical_item: 3,
  place: 10,
  place_display: 'Worcester',
  evidence: '',
  dubitable: false,
};

beforeEach(() => {
  for (const mock of [createOriginMock, updateOriginMock, deleteOriginMock]) {
    mock.mockReset();
    mock.mockResolvedValue({});
  }
});

describe('<OriginsSection>', () => {
  it('adds an origin with its place, doubt and evidence', async () => {
    renderWithQueryClient(<OriginsSection historicalItemId={3} origins={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.click(screen.getByRole('combobox', { name: 'Place of the new origin' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Exeter' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Doubtful' }));
    fireEvent.change(screen.getByPlaceholderText('Evidence (optional)'), {
      target: { value: 'Ker 1957' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(createOriginMock).toHaveBeenCalledWith({
        historical_item: 3,
        place: 11,
        dubitable: true,
        evidence: 'Ker 1957',
      })
    );
  });

  it("saves each origin's evidence from its own field", async () => {
    renderWithQueryClient(
      <OriginsSection
        historicalItemId={3}
        origins={[ORIGIN, { ...ORIGIN, id: 6, place: 11, place_display: 'Exeter' }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Evidence for origin 2' }));
    const field = screen.getByRole('textbox', { name: 'Evidence for origin 2' });
    fireEvent.change(field, { target: { value: 'Ker 1957' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() => expect(updateOriginMock).toHaveBeenCalledWith(6, { evidence: 'Ker 1957' }));
  });

  it('marks an origin doubtful and removes it', async () => {
    renderWithQueryClient(<OriginsSection historicalItemId={3} origins={[ORIGIN]} />);

    expect(screen.getByRole('combobox', { name: 'Place of origin 1' }).textContent).toContain(
      'Worcester'
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Origin 1 is doubtful' }));
    await waitFor(() => expect(updateOriginMock).toHaveBeenCalledWith(5, { dubitable: true }));

    fireEvent.click(screen.getByRole('button', { name: 'Remove origin 1' }));
    await waitFor(() => expect(deleteOriginMock).toHaveBeenCalledWith(5));
  });
});
