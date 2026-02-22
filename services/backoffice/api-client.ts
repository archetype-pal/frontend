import { apiFetch } from '@/lib/api-fetch';

const API_PREFIX = '/api/v1/admin';

const TRANSIENT_STATUSES = [502, 503, 504];

async function fetchWithRetry(
  path: string,
  init?: RequestInit,
  retries = 2,
  delay = 500
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await apiFetch(path, init);
      if (attempt < retries && TRANSIENT_STATUSES.includes(res.status)) {
        await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
    }
  }
  throw new Error('Retry limit exceeded');
}

export class BackofficeApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(`API error ${status}`);
    this.name = 'BackofficeApiError';
  }
}

/**
 * Authenticated fetch wrapper for backoffice API endpoints.
 * Prepends the API prefix to the path and adds the auth token header.
 */
async function apiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithRetry(`${API_PREFIX}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackofficeApiError(res.status, body as Record<string, unknown>);
  }

  // DELETE responses may have no body
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** GET with auth */
export function backofficeGet<T>(path: string, token: string): Promise<T> {
  return apiRequest<T>(path, token);
}

/** POST with auth + JSON body */
export function backofficePost<T>(path: string, token: string, data: unknown): Promise<T> {
  return apiRequest<T>(path, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** PATCH with auth + JSON body */
export function backofficePatch<T>(path: string, token: string, data: unknown): Promise<T> {
  return apiRequest<T>(path, token, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** PUT with auth + JSON body */
export function backofficePut<T>(path: string, token: string, data: unknown): Promise<T> {
  return apiRequest<T>(path, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** DELETE with auth */
export function backofficeDelete(path: string, token: string): Promise<void> {
  return apiRequest<void>(path, token, { method: 'DELETE' });
}

/**
 * Authenticated multipart fetch wrapper.
 * Sends FormData without setting Content-Type so the browser
 * automatically adds the correct multipart boundary.
 */
async function apiRequestFormData<T>(
  path: string,
  token: string,
  method: string,
  formData: FormData
): Promise<T> {
  const res = await fetchWithRetry(`${API_PREFIX}${path}`, {
    method,
    headers: {
      Authorization: `Token ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackofficeApiError(res.status, body as Record<string, unknown>);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** POST with auth + FormData body (multipart) */
export function backofficePostFormData<T>(
  path: string,
  token: string,
  formData: FormData
): Promise<T> {
  return apiRequestFormData<T>(path, token, 'POST', formData);
}

/** PATCH with auth + FormData body (multipart) */
export function backofficePatchFormData<T>(
  path: string,
  token: string,
  formData: FormData
): Promise<T> {
  return apiRequestFormData<T>(path, token, 'PATCH', formData);
}
