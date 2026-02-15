import { apiFetch } from '@/lib/api-fetch'

const ADMIN_PREFIX = '/api/v1/admin'

export class AdminApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(`Admin API error ${status}`)
    this.name = 'AdminApiError'
  }
}

/**
 * Authenticated fetch wrapper for admin API endpoints.
 * Prepends /api/v1/admin to the path and adds the auth token header.
 */
async function adminRequest<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await apiFetch(`${ADMIN_PREFIX}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
      ...init?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new AdminApiError(res.status, body as Record<string, unknown>)
  }

  // DELETE responses may have no body
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** GET with auth */
export function adminGet<T>(path: string, token: string): Promise<T> {
  return adminRequest<T>(path, token)
}

/** POST with auth + JSON body */
export function adminPost<T>(
  path: string,
  token: string,
  data: unknown
): Promise<T> {
  return adminRequest<T>(path, token, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** PATCH with auth + JSON body */
export function adminPatch<T>(
  path: string,
  token: string,
  data: unknown
): Promise<T> {
  return adminRequest<T>(path, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/** PUT with auth + JSON body */
export function adminPut<T>(
  path: string,
  token: string,
  data: unknown
): Promise<T> {
  return adminRequest<T>(path, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** DELETE with auth */
export function adminDelete(path: string, token: string): Promise<void> {
  return adminRequest<void>(path, token, { method: 'DELETE' })
}
