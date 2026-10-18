import { AUTH_SESSION_COOKIE } from '@/lib/auth-token-cookie';

/**
 * The current sign-in's id, or null when signed out. Read from the cookie on
 * every call rather than from React state, so a sign-out or a new sign-in in
 * another tab is seen at once, even by code that has stopped re-rendering.
 */
export function getAuthSessionId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_SESSION_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Signing out drops it at once; the server clears it too, with the token. */
export function clearAuthSessionId(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
