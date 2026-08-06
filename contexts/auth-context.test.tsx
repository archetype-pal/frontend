import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const getUserProfile = vi.fn();
const logoutUser = vi.fn();
vi.mock('@/utils/api', () => ({
  getUserProfile: (...args: unknown[]) => getUserProfile(...args),
  logoutUser: (...args: unknown[]) => logoutUser(...args),
}));

import { AuthProvider, useAuth } from './auth-context';
import {
  clearAuthTokenCookie,
  clearImpersonatorTokenCookie,
  getAuthTokenCookie,
  getImpersonatorTokenCookie,
  setAuthTokenCookie,
  setImpersonatorTokenCookie,
} from '@/lib/auth-token-cookie';
import type { UserProfile } from '@/types';

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function fakeProfile(username: string): UserProfile {
  return {
    id: 1,
    email: `${username}@example.com`,
    username,
    first_name: '',
    last_name: '',
    is_staff: false,
    is_superuser: false,
  };
}

beforeEach(() => {
  push.mockClear();
  getUserProfile.mockReset();
  logoutUser.mockReset();
  logoutUser.mockResolvedValue(undefined);
  clearAuthTokenCookie();
  clearImpersonatorTokenCookie();
});

afterEach(() => {
  clearAuthTokenCookie();
  clearImpersonatorTokenCookie();
});

describe('AuthProvider impersonation', () => {
  it('startImpersonation stashes the current token and switches to the new one', async () => {
    getUserProfile.mockImplementation(async (token: string) => fakeProfile(`user-${token}`));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setToken('admin-token'));
    await waitFor(() => expect(result.current.token).toBe('admin-token'));

    act(() => result.current.startImpersonation('target-token'));

    await waitFor(() => expect(result.current.token).toBe('target-token'));
    expect(result.current.isImpersonating).toBe(true);
    expect(getImpersonatorTokenCookie()).toBe('admin-token');
    expect(getAuthTokenCookie()).toBe('target-token');
  });

  it('a second startImpersonation call does not clobber the original stashed token', async () => {
    getUserProfile.mockImplementation(async (token: string) => fakeProfile(`user-${token}`));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setToken('admin-token'));
    await waitFor(() => expect(result.current.token).toBe('admin-token'));

    act(() => result.current.startImpersonation('target-token-1'));
    await waitFor(() => expect(result.current.token).toBe('target-token-1'));

    // Nested impersonation: switching again while already impersonating must
    // NOT overwrite the stashed original admin token.
    act(() => result.current.startImpersonation('target-token-2'));
    await waitFor(() => expect(result.current.token).toBe('target-token-2'));

    expect(result.current.isImpersonating).toBe(true);
    expect(getImpersonatorTokenCookie()).toBe('admin-token');
  });

  it('stopImpersonation restores the stashed token and clears the stash', async () => {
    getUserProfile.mockImplementation(async (token: string) => fakeProfile(`user-${token}`));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setToken('admin-token'));
    await waitFor(() => expect(result.current.token).toBe('admin-token'));

    act(() => result.current.startImpersonation('target-token'));
    await waitFor(() => expect(result.current.token).toBe('target-token'));

    act(() => result.current.stopImpersonation());

    await waitFor(() => expect(result.current.token).toBe('admin-token'));
    expect(result.current.isImpersonating).toBe(false);
    expect(getImpersonatorTokenCookie()).toBeNull();
  });

  it('restores isImpersonating on initial mount when an impersonator cookie is already present', async () => {
    setAuthTokenCookie('target-token');
    setImpersonatorTokenCookie('admin-token');
    getUserProfile.mockImplementation(async (token: string) => fakeProfile(`user-${token}`));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isImpersonating).toBe(true);
    expect(result.current.token).toBe('target-token');
  });

  it('does not report isImpersonating on a normal (non-impersonated) mount', async () => {
    setAuthTokenCookie('admin-token');
    getUserProfile.mockImplementation(async (token: string) => fakeProfile(`user-${token}`));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.isImpersonating).toBe(false);
  });

  it('logout clears the stashed impersonator token', async () => {
    getUserProfile.mockImplementation(async (token: string) => fakeProfile(`user-${token}`));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isReady).toBe(true));

    act(() => result.current.setToken('admin-token'));
    await waitFor(() => expect(result.current.token).toBe('admin-token'));

    act(() => result.current.startImpersonation('target-token'));
    await waitFor(() => expect(result.current.token).toBe('target-token'));

    act(() => result.current.logout());

    await waitFor(() => expect(result.current.token).toBeNull());
    expect(result.current.isImpersonating).toBe(false);
    expect(getImpersonatorTokenCookie()).toBeNull();
    expect(push).toHaveBeenCalledWith('/login');
  });
});
