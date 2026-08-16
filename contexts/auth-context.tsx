'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile, logoutUser } from '@/utils/api';
import {
  clearAuthTokenCookie,
  clearImpersonatorTokenCookie,
  getAuthTokenCookie,
  getImpersonatorTokenCookie,
  setAuthTokenCookie,
  setImpersonatorTokenCookie,
} from '@/lib/auth-token-cookie';
import type { UserProfile } from '@/types';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isReady: boolean;
  isImpersonating: boolean;
  setToken: (token: string | null) => void;
  startImpersonation: (newToken: string) => void;
  stopImpersonation: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const router = useRouter();

  const setAuthToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);

    if (nextToken) {
      setAuthTokenCookie(nextToken);
      return;
    }

    clearAuthTokenCookie();
  }, []);

  const startImpersonation = useCallback(
    (newToken: string) => {
      // Only stash the current token if we're not already impersonating —
      // otherwise a nested impersonation would clobber the real original
      // admin token with an already-impersonated one, making it unrecoverable.
      if (!isImpersonating && token) {
        setImpersonatorTokenCookie(token);
      }
      setIsImpersonating(true);
      setAuthToken(newToken);
    },
    [isImpersonating, token, setAuthToken]
  );

  const stopImpersonation = useCallback(() => {
    const originalToken = getImpersonatorTokenCookie();
    clearImpersonatorTokenCookie();
    // No stash means there is no way back to the admin identity: sign out
    // locally rather than leave the caller silently wearing the target's.
    setAuthToken(originalToken);
    if (!originalToken) setUser(null);
    setIsImpersonating(false);
  }, [setAuthToken]);

  const logout = useCallback(() => {
    // Revoke the server-side token so a captured token can't be reused after
    // logout. Fire-and-forget: a network/HTTP failure must not block the local
    // sign-out, so swallow any error. While impersonating, `token` is the
    // TARGET's own persistent token — revoking it would sign a third party out
    // of their own session, so revoke the stashed admin token instead.
    const revokeToken = getImpersonatorTokenCookie() ?? token;
    if (revokeToken) {
      void logoutUser(revokeToken).catch(() => {});
    }
    setAuthToken(null);
    // Don't leave a stale stashed original token around if the user fully
    // logs out while impersonating.
    clearImpersonatorTokenCookie();
    setIsImpersonating(false);
    setUser(null);
    setIsReady(true);
    router.push('/login');
  }, [router, setAuthToken, token]);

  useEffect(() => {
    const storedToken = getAuthTokenCookie();
    const storedImpersonatorToken = getImpersonatorTokenCookie();
    queueMicrotask(() => setIsImpersonating(!!storedImpersonatorToken));

    if (storedToken) {
      queueMicrotask(() => setAuthToken(storedToken));
      return;
    }

    // No stored token: nothing to fetch, so we're immediately ready. Defer the
    // flip off the synchronous effect path (mirroring the setAuthToken branch
    // above) to avoid a cascading-render setState directly inside the effect.
    queueMicrotask(() => setIsReady(true));
  }, [setAuthToken]);

  useEffect(() => {
    // Generation guard: if `token` changes (A→B) while a fetch for the old
    // token is in flight, ignore that stale result so it can't set a profile
    // for the wrong token or clobber the newer valid token on failure.
    let active = true;

    async function fetchUserProfile() {
      if (!token) return;

      try {
        const profile = await getUserProfile(token);
        if (!active) return;
        setUser(profile);
      } catch {
        if (!active) return;
        // Stale/invalid token or transient API failure: clear local auth state
        // silently. Do not navigate — public pages must stay viewable for guests.
        // The stash must go too: an orphaned one session-scopes every later
        // auth-cookie write, including a fresh non-impersonating login.
        setAuthToken(null);
        clearImpersonatorTokenCookie();
        setUser(null);
        return;
      } finally {
        if (active) setIsReady(true);
      }
    }

    void fetchUserProfile();

    return () => {
      active = false;
    };
  }, [token, setAuthToken]);

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      user,
      isReady,
      isImpersonating,
      setToken: setAuthToken,
      startImpersonation,
      stopImpersonation,
      logout,
    }),
    [
      token,
      user,
      isReady,
      isImpersonating,
      setAuthToken,
      startImpersonation,
      stopImpersonation,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
