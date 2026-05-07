/**
 * Walk every page of a DRF-paginated list endpoint and return the flattened
 * results. Used by services that need the full set (e.g. all comments on a
 * graph, all text-annotations on an image) rather than a single page.
 *
 * Two non-obvious details:
 *
 * 1. **`limit=100`**: callers must include this in `startPath` because
 *    `BoundedLimitOffsetPagination.max_limit = 100`. Anything higher is
 *    silently capped, so `limit=1000` would just hide the pagination from
 *    the consumer.
 *
 * 2. **`toRelativePath`**: DRF's `next` is an ABSOLUTE URL like
 *    `http://api.host/api/v1/...?cursor=...`. Feeding that back through
 *    `authFetch`/`apiFetch` would re-prepend `API_BASE_URL` and produce
 *    `http://api.host/http://api.host/...` — an invalid URL the server
 *    can't resolve. Stripping back to a path keeps the next iteration on
 *    the same base.
 *
 * On a non-OK response the partial buffer is returned (matches the
 * defensive behavior the previous inlined helpers committed to). The
 * caller decides whether to surface this as an error.
 */

interface PaginatedDrfResponse<T> {
  next?: string | null;
  results?: T[];
}

export async function walkPaginated<T>(
  startPath: string,
  fetcher: (path: string) => Promise<Response>
): Promise<T[]> {
  let path: string | null = startPath;
  const out: T[] = [];
  while (path) {
    const response = await fetcher(path);
    if (!response.ok) return out;
    const data: unknown = await response.json();
    if (Array.isArray(data)) {
      out.push(...(data as T[]));
      path = null;
    } else if (data && typeof data === 'object') {
      const page = data as PaginatedDrfResponse<T>;
      if (Array.isArray(page.results)) {
        out.push(...page.results);
      }
      path = toRelativePath(page.next ?? null);
    } else {
      // Body parsed cleanly but isn't an array or paginated dict (e.g.
      // `null`, a scalar, or a primitive). Treat as end-of-stream rather
      // than throwing on a downstream `.results` access.
      path = null;
    }
  }
  return out;
}

function toRelativePath(next: string | null): string | null {
  if (!next) return null;
  try {
    const u = new URL(next);
    return u.pathname + u.search;
  } catch {
    // Already a relative path.
    return next;
  }
}
