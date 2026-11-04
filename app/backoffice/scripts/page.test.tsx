/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScriptsPage from './page';
import { renderWithQueryClient } from '@/test/render';

const createScriptMock = vi.fn();
const updateScriptMock = vi.fn();
const deleteScriptMock = vi.fn();

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/services/backoffice/scribes', () => ({
  getScripts: async () => [
    { id: 1, name: 'Caroline miniscule' },
    { id: 2, name: 'Square minuscule' },
  ],
  createScript: (...args: unknown[]) => createScriptMock(...args),
  updateScript: (...args: unknown[]) => updateScriptMock(...args),
  deleteScript: (...args: unknown[]) => deleteScriptMock(...args),
}));

beforeEach(() => {
  for (const mock of [createScriptMock, updateScriptMock, deleteScriptMock]) {
    mock.mockReset();
    mock.mockResolvedValue({});
  }
});

describe('<ScriptsPage>', () => {
  it('renames a script', async () => {
    renderWithQueryClient(<ScriptsPage />, { tooltip: true });

    fireEvent.click(await screen.findByRole('button', { name: 'Caroline miniscule' }));
    const input = screen.getByDisplayValue('Caroline miniscule');
    fireEvent.change(input, { target: { value: 'Caroline minuscule' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(updateScriptMock).toHaveBeenCalledWith(1, { name: 'Caroline minuscule' })
    );
  });

  it('adds a script', async () => {
    renderWithQueryClient(<ScriptsPage />, { tooltip: true });

    fireEvent.click(await screen.findByRole('button', { name: 'New Script' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Caroline minuscule'), {
      target: { value: 'Insular Cursive minuscule' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() =>
      expect(createScriptMock).toHaveBeenCalledWith({ name: 'Insular Cursive minuscule' })
    );
  });

  it('warns that a script used by a hand cannot be deleted before deleting it', async () => {
    renderWithQueryClient(<ScriptsPage />, { tooltip: true });

    await screen.findByRole('button', { name: 'Square minuscule' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete script' })[1]);

    expect(screen.getByText('A script that is used by a hand cannot be deleted.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(deleteScriptMock).toHaveBeenCalledWith(2));
  });
});
