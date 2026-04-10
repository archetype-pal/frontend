const AUTH_TOKEN_COOKIE_NAME = 'archetype_auth_token';
const AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

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
  document.cookie =
    `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${AUTH_TOKEN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax` +
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
