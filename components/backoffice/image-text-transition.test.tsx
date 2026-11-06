/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQueryClient } from '@/test/render';
import type { UserListItem } from '@/types/backoffice';

const { listUsers } = vi.hoisted(() => ({ listUsers: vi.fn() }));

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('@/services/backoffice/users', () => ({ listUsers }));

import { TransitionPopover } from './image-text-transition';

function user(id: number, username: string, flags: Partial<UserListItem> = {}): UserListItem {
  return {
    id,
    username,
    email: '',
    first_name: '',
    last_name: '',
    is_staff: false,
    is_superuser: true,
    is_active: true,
    date_joined: '2026-01-01T00:00:00Z',
    last_login: null,
    ...flags,
  };
}

const USERS = [
  user(4, 'zoe'),
  user(2, 'bob', { is_active: false }),
  user(3, 'carol', { is_superuser: false, is_staff: true }),
  user(1, 'dave', { first_name: 'Dave', last_name: 'Doe' }),
];

beforeEach(() => {
  listUsers.mockReset().mockResolvedValue(USERS);
});

describe('<TransitionPopover>', () => {
  it('offers the next step, keeps the note when the move fails, and closes once it lands', async () => {
    const onTransition = vi.fn().mockRejectedValueOnce(new Error('nope')).mockResolvedValueOnce({});
    renderWithQueryClient(
      <TransitionPopover currentStatus="Draft" label="Move" onTransition={onTransition} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    fireEvent.change(screen.getByPlaceholderText('What changed?'), { target: { value: 'ready' } });
    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));

    await waitFor(() =>
      expect(onTransition).toHaveBeenCalledWith({ to_status: 'Review', note: 'ready' })
    );
    expect((await screen.findByDisplayValue('ready')).isConnected).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));
    await waitFor(() => expect(screen.queryByDisplayValue('ready')).toBeNull());
    expect(onTransition).toHaveBeenCalledTimes(2);
  });

  it('moves a selection to Review by default when there is no current status', async () => {
    const onTransition = vi.fn().mockResolvedValue({});
    renderWithQueryClient(<TransitionPopover label="Move" onTransition={onTransition} />);

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(screen.queryByText('Current')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));

    await waitFor(() =>
      expect(onTransition).toHaveBeenCalledWith({ to_status: 'Review', note: undefined })
    );
  });

  it('offers the active superusers as reviewers and sends the one picked', async () => {
    const onTransition = vi.fn().mockResolvedValue({});
    renderWithQueryClient(
      <TransitionPopover currentStatus="Draft" label="Move" onTransition={onTransition} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    const picker = screen.getByRole('combobox', { name: 'Reviewer' });
    await waitFor(() => expect(picker.hasAttribute('disabled')).toBe(false));

    fireEvent.keyDown(picker, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['No one', 'Dave Doe (dave)', 'zoe']);
    fireEvent.click(screen.getByRole('option', { name: 'Dave Doe (dave)' }));

    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));
    await waitFor(() =>
      expect(onTransition).toHaveBeenCalledWith({
        to_status: 'Review',
        note: undefined,
        assignee: 1,
      })
    );
  });

  it('asks for no reviewer, and reads no users, when the move is not to Review', () => {
    renderWithQueryClient(
      <TransitionPopover currentStatus="Review" label="Move" onTransition={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));

    expect(screen.queryByRole('combobox', { name: 'Reviewer' })).toBeNull();
    expect(listUsers).not.toHaveBeenCalled();
  });

  it('says so when the reviewers cannot be loaded, and still moves the text', async () => {
    listUsers.mockReset().mockRejectedValue(new Error('down'));
    const onTransition = vi.fn().mockResolvedValue({});
    renderWithQueryClient(
      <TransitionPopover currentStatus="Draft" label="Move" onTransition={onTransition} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(await screen.findByText("Couldn't load reviewers.")).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '→ Review' }));
    await waitFor(() =>
      expect(onTransition).toHaveBeenCalledWith({ to_status: 'Review', note: undefined })
    );
  });
});
