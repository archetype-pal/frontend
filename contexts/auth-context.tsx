'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile } from '@/utils/api';
import { clearAuthTokenCookie, setAuthTokenCookie } from '@/lib/auth-token-cookie';
import type { UserProfile } from '@/types';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const router = useRouter();

  const setAuthToken = useCallback((nextToken: string | null) => {
    setToken(nextToken);
    if (nextToken) {
      localStorage.setItem('token', nextToken);
      setAuthTokenCookie(nextToken);
      return;
    }
    localStorage.removeItem('token');
    clearAuthTokenCookie();
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    router.push('/login');
  }, [router, setAuthToken]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      queueMicrotask(() => setAuthToken(storedToken));
    }
  }, [setAuthToken]);

  useEffect(() => {
    async function fetchUserProfile() {
      if (token) {
        try {
          const profile = await getUserProfile(token);
          setUser(profile);
        } catch {
          logout();
        }
      }
    }
    fetchUserProfile();
  }, [token, logout]);

  const value = useMemo<AuthContextType>(
    () => ({ token, user, setToken: setAuthToken, logout }),
    [token, user, setAuthToken, logout]
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
