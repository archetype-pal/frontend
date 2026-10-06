import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { AuthProvider, useAuth } from './auth-context';
import { getAuthSessionId } from '@/lib/auth-session';

const PROFILE = { id: 1, username: 'ed', is_staff: true, is_superuser: true };

function Probe() {
  const { user, isAuthenticated, isReady, logout } = useAuth();
  return (
    <>
      <p>{isReady ? `${isAuthenticated}:${user?.username ?? '-'}` : 'loading'}</p>
      <button onClick={logout}>sign out</button>
    </>
  );
}

function stubFetch(me: unknown, onLogout?: () => void) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/me') return new Response(JSON.stringify({ user: me }));
    onLogout?.();
    return new Response(null, { status: 204 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'archetype_session=; Path=/; Max-Age=0';
});

describe('AuthProvider', () => {
  it('is signed in exactly when /api/auth/me returns a profile', async () => {
    stubFetch(PROFILE);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(await screen.findByText('true:ed')).toBeTruthy();
  });

  it('treats a guest as ready and signed out', async () => {
    stubFetch(null);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    expect(await screen.findByText('false:-')).toBeTruthy();
  });

  it('drops the session id before the revoke round trip resolves', async () => {
    document.cookie = 'archetype_session=s1; Path=/';
    let sessionDuringRevoke: string | null = 'unset';
    const fetchMock = stubFetch(PROFILE, () => (sessionDuringRevoke = getAuthSessionId()));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await screen.findByText('true:ed');

    fireEvent.click(screen.getByText('sign out'));

    expect(getAuthSessionId()).toBeNull();
    expect(screen.getByText('false:-')).toBeTruthy();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' })
    );
    expect(sessionDuringRevoke).toBeNull();
    expect(push).toHaveBeenCalledWith('/login');
  });
});
