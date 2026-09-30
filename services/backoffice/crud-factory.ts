import { backofficeGet, backofficePost, backofficePatch, backofficeDelete } from './api-client';

// ── Query-string helper ─────────────────────────────────────────────────

type ParamValue = string | number | boolean | undefined | null;

/**
 * Append query parameters to a base path.
 * Skips `undefined` and `null` values.
 */
function buildUrl(basePath: string, params?: Record<string, ParamValue>): string {
  if (!params) return basePath;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `${basePath}?${query}` : basePath;
}

// ── CRUD service factory ────────────────────────────────────────────────

/**
 * Creates a standard set of CRUD functions for a backoffice API resource.
 *
 * @template TList   – shape returned for each item in a list response
 * @template TDetail – shape returned for a single item (defaults to TList)
 * @template TId     – type of the resource identifier (number or string)
 *
 * @param basePath – API path **with trailing slash**, e.g. `'/api/v1/manuscripts/management/historical-items/'`
 */
export function createCrudService<TList, TDetail = TList, TId extends string | number = number>(
  basePath: string
) {
  return {
    /** List resources, optionally filtered by query params. */
    list(params?: Record<string, ParamValue>) {
      return backofficeGet<TList>(buildUrl(basePath, params));
    },

    /** Get a single resource by id. */
    get(id: TId) {
      return backofficeGet<TDetail>(`${basePath}${id}/`);
    },

    /** Create a new resource. */
    create(data: Partial<TDetail> | Record<string, unknown>) {
      return backofficePost<TDetail>(basePath, data);
    },

    /** Partially update an existing resource. */
    update(id: TId, data: Partial<TDetail> | Record<string, unknown>) {
      return backofficePatch<TDetail>(`${basePath}${id}/`, data);
    },

    /** Delete a resource by id. */
    remove(id: TId) {
      return backofficeDelete(`${basePath}${id}/`);
    },
  };
}
