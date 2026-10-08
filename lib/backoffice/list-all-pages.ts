import type { PaginatedResponse } from '@/types/backoffice';

const PAGE_SIZE = 100;

/** Read every page through a list service; a failed page rejects instead of returning a partial list. */
export async function listAllPages<T>(
  list: (page: { limit: number; offset: number }) => Promise<PaginatedResponse<T>>,
  onProgress?: (loaded: number, total: number) => void
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await list({ limit: PAGE_SIZE, offset });
    rows.push(...page.results);
    onProgress?.(rows.length, page.count);
    if (page.results.length === 0 || rows.length >= page.count) return rows;
  }
}
