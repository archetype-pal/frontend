/** @vitest-environment jsdom */
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@/types';

const { authState, getSettingMock, setSettingMock, toastErrorMock } = vi.hoisted(() => ({
  authState: { user: null as Partial<UserProfile> | null },
  getSettingMock: vi.fn(),
  setSettingMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, user: authState.user }),
}));
vi.mock('@/services/backoffice/comment-email-setting', () => ({
  getCommentEmailSetting: (...args: unknown[]) => getSettingMock(...args),
  setCommentEmailSetting: (...args: unknown[]) => setSettingMock(...args),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: (...args: unknown[]) => toastErrorMock(...args) },
}));

import { BackofficeApiError } from '@/services/backoffice/api-client';

import { CommentEmailSetting } from './comment-email-setting';

const NAME = 'Email me about comments awaiting approval';

function renderSetting() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommentEmailSetting />
    </QueryClientProvider>
  );
}

async function loadedSwitch() {
  const toggle = await screen.findByRole('switch', { name: NAME });
  await waitFor(() => expect(toggle.hasAttribute('disabled')).toBe(false));
  return toggle;
}

beforeEach(() => {
  authState.user = { is_superuser: true, email: 'ali@example.org' };
  getSettingMock.mockReset().mockResolvedValue({ email_enabled: true });
  setSettingMock.mockReset();
  toastErrorMock.mockReset();
});

describe('<CommentEmailSetting>', () => {
  it('shows that the emails are on and where they are sent', async () => {
    renderSetting();

    const toggle = await loadedSwitch();

    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { description: 'Sent to ali@example.org' })).toBe(toggle);
  });

  it('turns the emails off when switched', async () => {
    setSettingMock.mockResolvedValue({ email_enabled: false });
    renderSetting();
    const toggle = await loadedSwitch();

    fireEvent.click(toggle);

    await waitFor(() => expect(setSettingMock).toHaveBeenCalled());
    expect(setSettingMock.mock.calls[0][0]).toBe(false);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
  });

  it('moves right away while the setting is being saved', async () => {
    setSettingMock.mockReturnValue(new Promise(() => {}));
    renderSetting();
    const toggle = await loadedSwitch();

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
  });

  it('takes no other click until the setting is saved', async () => {
    setSettingMock.mockReturnValue(new Promise(() => {}));
    renderSetting();
    const toggle = await loadedSwitch();

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
    expect(setSettingMock).toHaveBeenCalledTimes(1);
  });

  it('switches back and says so when the setting cannot be saved', async () => {
    setSettingMock.mockRejectedValue(new BackofficeApiError(500, { detail: 'Server error' }));
    renderSetting();
    const toggle = await loadedSwitch();

    fireEvent.click(toggle);

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        'Could not save your email setting',
        expect.anything()
      )
    );
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('cannot be switched when the account has no email address', async () => {
    authState.user = { is_superuser: true, email: '' };
    renderSetting();

    const toggle = await screen.findByRole('switch', {
      name: NAME,
      description: 'Your account has no email address.',
    });
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));

    expect(toggle.hasAttribute('disabled')).toBe(true);
  });

  it('says why it is unavailable when the setting cannot be loaded', async () => {
    getSettingMock.mockRejectedValue(
      new BackofficeApiError(503, { detail: 'Service unavailable' })
    );
    renderSetting();

    const toggle = await screen.findByRole('switch', {
      name: NAME,
      description: 'Could not load your email setting: Service unavailable',
    });

    expect(toggle.hasAttribute('disabled')).toBe(true);
  });

  it('is not shown to staff who are not superusers', () => {
    authState.user = { is_superuser: false, is_staff: true, email: 'staff@example.org' };
    renderSetting();

    expect(screen.queryByRole('switch')).toBeNull();
    expect(getSettingMock).not.toHaveBeenCalled();
  });
});
