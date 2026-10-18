/**
 * Centralized API fetch wrapper with performance + failure logging.
 *
 * In development, logs method, path, status and duration for every request.
 * In all environments, a non-2xx response or a thrown error is logged:
 * callers like `readModelLabels()`/`readSiteFeatures()`/`getPublishedPages()`
 * swallow those into a default value, so nothing else would ever surface them.
 * Successful responses stay dev-only to avoid flooding production logs.
 */

import { env } from '@/lib/env';

// SSR and route handlers fetch via the server-side base (which may differ in
// the containerized dev mode); the browser always uses the public URL.
export const API_BASE_URL = typeof window === 'undefined' ? env.serverApiUrl : env.apiUrl;

/** Threshold in ms – requests slower than this are flagged when logging. */
const SLOW_THRESHOLD = 500;

const isDev = process.env.NODE_ENV === 'development';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const method = init?.method ?? 'GET';
  const start = performance.now();

  try {
    const res = await fetch(url, init);
    const duration = performance.now() - start;
    if (!res.ok) {
      console.error(
        `[API] ${method} ${path} → ${res.status} ${res.statusText} (${duration.toFixed(1)}ms)`
      );
    } else if (isDev) {
      const tag = duration > SLOW_THRESHOLD ? 'SLOW' : 'OK';
      console.log(`[API] ${tag} ${method} ${path} → ${res.status} (${duration.toFixed(1)}ms)`);
    }
    return res;
  } catch (err) {
    // TanStack Query aborts the in-flight request on every key change, i.e. on
    // every keystroke in the tei-ref picker. Not a failure worth logging.
    if ((err as Error)?.name !== 'AbortError') {
      const duration = performance.now() - start;
      console.error(`[API] ${method} ${path} FAILED (${duration.toFixed(1)}ms)`, err);
    }
    throw err;
  }
}

/**
 * apiFetch with the `Authorization: Token …` header pre-set.
 *
 * Accepts a nullable token so optional-auth services (read endpoints that
 * upgrade their response when authenticated) can call this unconditionally
 * instead of branching at every call site. When token is null/undefined or
 * empty, no Authorization header is set.
 */
export async function authFetch(
  path: string,
  token: string | null | undefined,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Token ${token}`);
  }
  return apiFetch(path, { ...init, headers });
}

/**
 * Authenticated fetch for BROWSER code, which can't read the HttpOnly auth
 * cookie (see `lib/auth-token-cookie.ts`). Routes the request through
 * `/api/proxy/*`, a same-origin Next.js handler that reads the auth cookie
 * server-side and attaches the `Authorization` header itself.
 *
 * Server-side code (route handlers, server components) should use
 * `authFetch` with a token from `getServerAuthToken()` instead — calling this
 * from the server would add a redundant hop through the Next server to
 * itself.
 */
export async function proxyFetch(path: string, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    throw new Error('proxyFetch is for browser code only — use authFetch on the server');
  }
  // Drop the trailing slash: Next would 308 `/api/proxy/…/7/` to `…/7`, and the
  // browser re-sends the whole body. The proxy route restores it for Django.
  return fetch(`/api/proxy${path.replace(/\/(?=[?#]|$)/, '')}`, init);
}

/**
 * For optional-auth reads that run both in SSR and in the browser. A signed-in
 * browser caller goes through the proxy so its cookie upgrades the response;
 * everyone else calls Django directly and stays anonymous — which the "preview
 * as public" dialog relies on.
 */
export async function optionalAuthFetch(
  path: string,
  authenticated: boolean,
  init?: RequestInit
): Promise<Response> {
  return authenticated && typeof window !== 'undefined'
    ? proxyFetch(path, init)
    : apiFetch(path, init);
}
