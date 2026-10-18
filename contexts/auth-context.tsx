'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserProfile, loginUser, logoutUser } from '@/utils/api';
import { clearAuthSessionId } from '@/lib/auth-session';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * The token is in an HttpOnly cookie this code can't read, so "signed in"
 * means "the server returned a profile" — never "a token is present".
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    getUserProfile()
      .then((profile) => {
        if (active) setUser(profile);
      })
      // An outage reads as signed out for now; the cookie survives for the next load.
      .catch(() => {})
      .finally(() => {
        if (active) setIsReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const profile = await loginUser(username, password);
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    // The upload runner checks the session id synchronously, so it must be gone
    // before the revoke round trip, not after.
    clearAuthSessionId();
    void logoutUser().catch(() => {});
    setUser(null);
    setIsReady(true);
    router.push('/login');
  }, [router]);

  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated: user !== null, isReady, login, logout }),
    [user, isReady, login, logout]
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
