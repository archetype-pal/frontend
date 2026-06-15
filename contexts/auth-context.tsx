'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile, logoutUser } from '@/utils/api';
import {
  clearAuthTokenCookie,
  getAuthTokenCookie,
  setAuthTokenCookie,
} from '@/lib/auth-token-cookie';
import type { UserProfile } from '@/types';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isReady: boolean;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  const setAuthToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);

    if (nextToken) {
      setAuthTokenCookie(nextToken);
      return;
    }

    clearAuthTokenCookie();
  }, []);

  const logout = useCallback(() => {
    // Revoke the server-side token so a captured token can't be reused after
    // logout. Fire-and-forget: a network/HTTP failure must not block the local
    // sign-out, so swallow any error.
    if (token) {
      void logoutUser(token).catch(() => {});
    }
    setAuthToken(null);
    setUser(null);
    setIsReady(true);
    router.push('/login');
  }, [router, setAuthToken, token]);

  useEffect(() => {
    const storedToken = getAuthTokenCookie();

    if (storedToken) {
      queueMicrotask(() => setAuthToken(storedToken));
      return;
    }

    setIsReady(true);
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
        setAuthToken(null);
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
    () => ({ token, user, isReady, setToken: setAuthToken, logout }),
    [token, user, isReady, setAuthToken, logout]
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
