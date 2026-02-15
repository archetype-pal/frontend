import { apiFetch } from '@/lib/api-fetch'

const API_PREFIX = '/api/v1/admin'

export class BackofficeApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(`API error ${status}`)
    this.name = 'BackofficeApiError'
  }
}

/**
 * Authenticated fetch wrapper for backoffice API endpoints.
 * Prepends the API prefix to the path and adds the auth token header.
 */
async function apiRequest<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new BackofficeApiError(res.status, body as Record<string, unknown>)
  }

  // DELETE responses may have no body
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** GET with auth */
export function backofficeGet<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, token)
}

/** POST with auth + JSON body */
export function backofficePost<T>(
  path: string,
  token: string,
  data: unknown
): Promise<T> {
  return apiRequest<T>(path, token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** PATCH with auth + JSON body */
export function backofficePatch<T>(
  path: string,
  token: string,
  data: unknown
): Promise<T> {
  return apiRequest<T>(path, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** PUT with auth + JSON body */
export function backofficePut<T>(
  path: string,
  token: string,
  data: unknown
): Promise<T> {
  return apiRequest<T>(path, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** DELETE with auth */
export function backofficeDelete(path: string, token: string): Promise<void> {
  return apiRequest<void>(path, token, { method: 'DELETE' })
}
