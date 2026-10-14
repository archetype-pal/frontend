import type { PaginatedResponse } from '@/types/backoffice';

const PAGE_SIZE = 100;

export interface ListAllPagesOptions {
  /** Called after each page with the rows read so far and the total. */
  onProgress?: (loaded: number, total: number) => void;
  /** Stops the walk when the page in flight returns; the promise then rejects with the abort reason. */
  signal?: AbortSignal;
}

/** Read every page through a list service; a failed page rejects instead of returning a partial list. */
export async function listAllPages<T>(
  list: (page: { limit: number; offset: number }) => Promise<PaginatedResponse<T>>,
  { onProgress, signal }: ListAllPagesOptions = {}
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await list({ limit: PAGE_SIZE, offset });
    signal?.throwIfAborted();
    rows.push(...page.results);
    onProgress?.(rows.length, page.count);
    if (page.results.length === 0 || rows.length >= page.count) return rows;
  }
}
