const AUTH_TOKEN_COOKIE_NAME = 'archetype_auth_token';
const AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Stashes the ORIGINAL admin's token while impersonating another user, so it
// can be restored when impersonation ends. Both impersonation cookies are
// session-scoped: if the stash could expire first, the admin would be left
// silently wearing the target's identity with no way back.
const IMPERSONATOR_TOKEN_COOKIE_NAME = 'archetype_impersonator_token';

function secureSuffix(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.protocol === 'https:' ? '; Secure' : '';
}

export function setAuthTokenCookie(token: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const maxAge = getImpersonatorTokenCookie()
    ? ''
    : `; Max-Age=${AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS}`;
  document.cookie =
    `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/${maxAge}; SameSite=Lax` +
    secureSuffix();
}

export function clearAuthTokenCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureSuffix()}`;
}

export function getAuthTokenCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export const AUTH_TOKEN_COOKIE = AUTH_TOKEN_COOKIE_NAME;

export function setImpersonatorTokenCookie(token: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie =
    `${IMPERSONATOR_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax` +
    secureSuffix();
}

export function clearImpersonatorTokenCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${IMPERSONATOR_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secureSuffix()}`;
}

export function getImpersonatorTokenCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${IMPERSONATOR_TOKEN_COOKIE_NAME}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export const IMPERSONATOR_TOKEN_COOKIE = IMPERSONATOR_TOKEN_COOKIE_NAME;
