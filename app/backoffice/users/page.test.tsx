/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import UsersPage from './page';
import { renderWithQueryClient } from '@/test/render';

const { proxyFetch } = vi.hoisted(() => ({ proxyFetch: vi.fn() }));

vi.mock('@/contexts/auth-context', () => import('@/test/mocks/auth-context'));
vi.mock('sonner', () => import('@/test/mocks/sonner'));
vi.mock('@/lib/api-fetch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api-fetch')>()),
  proxyFetch,
}));

const USERS = '/api/v1/auth/management/users/';
const EMAIL_SETTING = '/api/v1/media/management/comments/email-setting/?user=1';

function user(id: number) {
  return {
    id,
    username: `user${String(id).padStart(3, '0')}`,
    email: `user${id}@example.test`,
    first_name: '',
    last_name: '',
    is_staff: false,
    is_superuser: false,
    is_active: true,
    date_joined: '2026-01-01T00:00:00Z',
    last_login: null,
  };
}

function page(from: number, to: number, next: string | null) {
  const results = Array.from({ length: to - from + 1 }, (_, i) => user(from + i));
  return { ok: true, json: async () => ({ count: 105, next, previous: null, results }) };
}

const renderPage = () => renderWithQueryClient(<UsersPage />, { tooltip: true });

describe('<UsersPage>', () => {
  beforeEach(() => {
    proxyFetch.mockReset();
    proxyFetch.mockImplementation(async (path: string) =>
      path.includes('offset=100')
        ? page(101, 105, null)
        : page(1, 100, `http://api.test${USERS}?limit=100&offset=100`)
    );
  });

  it('lists the users from every page of the API', async () => {
    renderPage();

    expect(await screen.findByText('1–20 of 105')).toBeTruthy();
    expect(proxyFetch).toHaveBeenCalledTimes(2);
    expect(proxyFetch.mock.calls[1][0]).toContain('offset=100');
  });

  it('shows no email addresses in the table', async () => {
    renderPage();

    expect(await screen.findByText('user001')).toBeTruthy();
    expect(screen.queryByText('user1@example.test')).toBeNull();
  });

  describe('the comment email switch in the edit dialog', () => {
    function serve(first: ReturnType<typeof user>, settingFails = false) {
      proxyFetch.mockImplementation(async (path: string, init?: RequestInit) => {
        if (path === EMAIL_SETTING && settingFails)
          return { ok: false, status: 403, json: async () => ({ detail: 'Not allowed' }) };
        if (path === EMAIL_SETTING)
          return {
            ok: true,
            json: async () => JSON.parse(String(init?.body ?? '{"email_enabled":true}')),
          };
        if (path === `${USERS}1/`) return { ok: true, json: async () => first };
        return {
          ok: true,
          json: async () => ({ count: 1, next: null, previous: null, results: [first] }),
        };
      });
    }

    async function openEdit() {
      renderPage();
      await screen.findByText('user001');
      fireEvent.click(document.querySelector('.lucide-pencil')!.closest('button')!);
      await screen.findByRole('switch', { name: 'Superuser' });
    }

    const emailSwitch = () =>
      screen.queryByRole('switch', { name: 'Email about comments awaiting approval' });

    it('shows only while the user is a superuser', async () => {
      serve(user(1));
      await openEdit();

      expect(emailSwitch()).toBeNull();
      fireEvent.click(screen.getByRole('switch', { name: 'Superuser' }));
      expect(emailSwitch()).toBeTruthy();
    });

    it('is saved for that user with the rest of the form', async () => {
      serve({ ...user(1), is_superuser: true });
      await openEdit();

      await waitFor(() => expect(emailSwitch()?.hasAttribute('disabled')).toBe(false));
      expect(emailSwitch()?.getAttribute('aria-checked')).toBe('true');
      fireEvent.click(emailSwitch()!);
      expect(proxyFetch.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() =>
        expect(proxyFetch).toHaveBeenCalledWith(
          EMAIL_SETTING,
          expect.objectContaining({ method: 'PATCH', body: '{"email_enabled":false}' })
        )
      );
    });

    it('cannot be switched when the user has no email address', async () => {
      serve({ ...user(1), email: '', is_superuser: true });
      await openEdit();

      const toggle = await screen.findByRole('switch', {
        name: 'Email about comments awaiting approval',
        description: 'Add an email address to receive these emails.',
      });
      await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));

      expect(toggle.hasAttribute('disabled')).toBe(true);
    });

    it('says why it is unavailable when the setting cannot be loaded', async () => {
      serve({ ...user(1), is_superuser: true }, true);
      await openEdit();

      const toggle = await screen.findByRole('switch', {
        name: 'Email about comments awaiting approval',
        description: 'Could not load this setting: Not allowed',
      });

      expect(toggle.hasAttribute('disabled')).toBe(true);
    });
  });
});
