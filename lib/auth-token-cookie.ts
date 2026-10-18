/** HttpOnly: only the Next server reads it (`lib/auth-token-server.ts`, `proxy.ts`). */
export const AUTH_TOKEN_COOKIE = 'archetype_auth_token';

/**
 * Not a credential: a random id the server rotates on every sign-in and clears
 * on sign-out, readable by browser code so it can tell, synchronously and
 * across tabs, that the session changed (see `lib/auth-session.ts`).
 */
export const AUTH_SESSION_COOKIE = 'archetype_session';

export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
