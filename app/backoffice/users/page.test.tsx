import * as React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { PaginatedResponse, UserListItem } from '@/types/backoffice';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const startImpersonation = vi.fn();
let mockAuthUser: { id: number; username: string } | null = { id: 1, username: 'admin' };
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    token: 'admin-token',
    user: mockAuthUser,
    startImpersonation,
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const getUsers = vi.fn();
const createUser = vi.fn();
const updateUser = vi.fn();
const deleteUser = vi.fn();
const impersonateUser = vi.fn();
vi.mock('@/services/backoffice/users', () => ({
  getUsers: (...args: unknown[]) => getUsers(...args),
  createUser: (...args: unknown[]) => createUser(...args),
  updateUser: (...args: unknown[]) => updateUser(...args),
  deleteUser: (...args: unknown[]) => deleteUser(...args),
  impersonateUser: (...args: unknown[]) => impersonateUser(...args),
}));

import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import UsersPage from './page';

function baseUser(overrides: Partial<UserListItem>): UserListItem {
  return {
    id: 0,
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    is_staff: false,
    is_superuser: false,
    is_active: true,
    date_joined: '2024-01-01T00:00:00Z',
    last_login: null,
    ...overrides,
  };
}

const ADMIN = baseUser({ id: 1, username: 'admin' });
const STAFF = baseUser({ id: 2, username: 'staffer', is_staff: true });
const SUPERUSER = baseUser({ id: 3, username: 'superadmin', is_superuser: true });
const REGULAR = baseUser({ id: 4, username: 'regular' });
const INACTIVE = baseUser({ id: 5, username: 'dormant', is_active: false });

function usersResponse(results: UserListItem[]): PaginatedResponse<UserListItem> {
  return { count: results.length, next: null, previous: null, results };
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <UsersPage />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function rowFor(username: string): HTMLElement {
  return screen.getByText(username).closest('tr') as HTMLElement;
}

beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
  startImpersonation.mockClear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  getUsers.mockReset();
  createUser.mockReset();
  updateUser.mockReset();
  deleteUser.mockReset();
  impersonateUser.mockReset();
  mockAuthUser = { id: 1, username: 'admin' };
  getUsers.mockResolvedValue(usersResponse([ADMIN, STAFF, SUPERUSER, REGULAR, INACTIVE]));
});

describe('UsersPage impersonation action', () => {
  it("disables the impersonate button for the signed-in admin's own row", async () => {
    renderPage();
    await screen.findByText('admin');

    const button = within(rowFor('admin')).getByLabelText(/impersonate user/i);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the impersonate button for staff rows', async () => {
    renderPage();
    await screen.findByText('staffer');

    const button = within(rowFor('staffer')).getByLabelText(/impersonate user/i);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the impersonate button for superuser rows', async () => {
    renderPage();
    await screen.findByText('superadmin');

    const button = within(rowFor('superadmin')).getByLabelText(/impersonate user/i);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables the impersonate button for deactivated rows', async () => {
    renderPage();
    await screen.findByText('dormant');

    const button = within(rowFor('dormant')).getByLabelText(/impersonate user/i);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables the impersonate button for a regular, non-staff, non-self row', async () => {
    renderPage();
    await screen.findByText('regular');

    const button = within(rowFor('regular')).getByLabelText(/impersonate user/i);
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it('opens a confirmation dialog naming the target user when clicked', async () => {
    renderPage();
    await screen.findByText('regular');

    fireEvent.click(within(rowFor('regular')).getByLabelText(/impersonate user/i));

    expect(await screen.findByText(/impersonate "regular"/i)).toBeTruthy();
  });

  it('on confirm, calls impersonateUser, then startImpersonation + navigates home on success', async () => {
    impersonateUser.mockResolvedValue({ auth_token: 'target-token' });
    renderPage();
    await screen.findByText('regular');

    fireEvent.click(within(rowFor('regular')).getByLabelText(/impersonate user/i));
    await screen.findByText(/impersonate "regular"/i);

    fireEvent.click(screen.getByRole('button', { name: /^impersonate$/i }));

    await waitFor(() => expect(impersonateUser).toHaveBeenCalledWith('admin-token', 4));
    await waitFor(() => expect(startImpersonation).toHaveBeenCalledWith('target-token'));
    expect(push).toHaveBeenCalledWith('/');
    expect(refresh).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows an error toast and does not impersonate on failure', async () => {
    impersonateUser.mockRejectedValue(new Error('boom'));
    renderPage();
    await screen.findByText('regular');

    fireEvent.click(within(rowFor('regular')).getByLabelText(/impersonate user/i));
    await screen.findByText(/impersonate "regular"/i);

    fireEvent.click(screen.getByRole('button', { name: /^impersonate$/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(startImpersonation).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
