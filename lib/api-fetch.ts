/**
 * Centralized API fetch wrapper with optional performance logging.
 *
 * In development, logs method, path, status and duration for each request.
 */

import { env } from '@/lib/env';

export const API_BASE_URL = env.apiUrl;

/** Threshold in ms – requests slower than this are flagged when logging. */
const SLOW_THRESHOLD = 500;

const isDev = process.env.NODE_ENV === 'development';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;
  const method = init?.method ?? 'GET';
  const start = performance.now();

  try {
    const res = await fetch(url, init);
    if (isDev) {
      const duration = performance.now() - start;
      const tag = duration > SLOW_THRESHOLD ? 'SLOW' : 'OK';
      console.log(`[API] ${tag} ${method} ${path} → ${res.status} (${duration.toFixed(1)}ms)`);
    }
    return res;
  } catch (err) {
    if (isDev) {
      const duration = performance.now() - start;
      console.error(`[API] ERR  ${method} ${path} FAILED (${duration.toFixed(1)}ms)`, err);
    }
    throw err;
  }
}
