'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile } from '@/utils/api';
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
    setAuthToken(null);
    setUser(null);
    setIsReady(true);
    router.push('/login');
  }, [router, setAuthToken]);

  useEffect(() => {
    const storedToken = getAuthTokenCookie();

    if (storedToken) {
      queueMicrotask(() => setAuthToken(storedToken));
      return;
    }

    setIsReady(true);
  }, [setAuthToken]);

  useEffect(() => {
    async function fetchUserProfile() {
      if (!token) return;

      try {
        const profile = await getUserProfile(token);
        setUser(profile);
      } catch {
        logout();
        return;
      } finally {
        setIsReady(true);
      }
    }

    void fetchUserProfile();
  }, [token, logout]);

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
