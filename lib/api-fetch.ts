/**
 * Centralized API fetch wrapper with performance logging.
 *
 * Every call logs method, path, status and wall-clock duration so you can see
 * exactly what happens (and how long it takes) during SSR or client fetches.
 */

import { env } from '@/lib/env'

export const API_BASE_URL = env.apiUrl

/** Threshold in ms – requests slower than this are flagged. */
const SLOW_THRESHOLD = 500

export async function apiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`
  const method = init?.method ?? 'GET'
  const start = performance.now()

  try {
    const res = await fetch(url, init)
    const duration = performance.now() - start
    const tag = duration > SLOW_THRESHOLD ? 'SLOW' : 'OK'
    console.log(
      `[API] ${tag} ${method} ${path} → ${res.status} (${duration.toFixed(1)}ms)`
    )
    return res
  } catch (err) {
    const duration = performance.now() - start
    console.error(
      `[API] ERR  ${method} ${path} FAILED (${duration.toFixed(1)}ms)`,
      err
    )
    throw err
  }
}
