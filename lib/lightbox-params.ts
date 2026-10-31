import type { CollectionItem } from '@/contexts/collection-context';
import type { GraphListItem, ImageListItem } from '@/types/search';
import { apiFetch } from '@/lib/api-fetch';
import { errorMessage } from '@/lib/error-message';

type ItemType = 'image' | 'graph';
type ResolvedItem = CollectionItem | ImageListItem | GraphListItem;

/** Resolve a single item by id: from collection or fetch from API. Sets error and returns null on failure. */
export async function resolveItemById(
  type: ItemType,
  id: string,
  collectionItems: CollectionItem[],
  setError: (msg: string | null) => void
): Promise<ResolvedItem | null> {
  const numId = Number(id);
  const item = collectionItems.find((i) => i.id === numId && i.type === type);
  if (item) return item;

  const endpoint = type === 'image' ? 'item-images' : 'graphs';
  // Trailing slash: the DRF route is slash-terminated, so omitting it costs an
  // APPEND_SLASH 301 redirect round-trip on every call.
  const path = `/api/v1/search/${endpoint}/${id}/`;
  try {
    const response = await apiFetch(path);
    if (!response.ok) {
      setError(
        `${type === 'image' ? 'Image' : 'Graph'} ${id} not found (${response.status}: ${response.statusText}).`
      );
      return null;
    }
    const data = await response.json();
    return { ...data, type } as ResolvedItem;
  } catch (err) {
    const msg = errorMessage(err);
    setError(`Failed to load ${type} ${id}: ${msg}`);
    return null;
  }
}

/**
 * Resolve multiple items by ids: from collection + fetch missing from API. Pushes to itemsToLoad,
 * reports the ids that could not be fetched (even when others of the same kind loaded) and
 * returns the ones worth retrying: a network error, a throttled request or a server error. A
 * 4xx such as a 404 (a deleted graph, or an editorial one the search index leaves out) would
 * fail the same way every time, so it is reported but not returned.
 */
export async function resolveItemsByIds(
  type: ItemType,
  ids: number[],
  collectionItems: CollectionItem[],
  itemsToLoad: ResolvedItem[],
  reportFailure: (msg: string) => void
): Promise<number[]> {
  const fromCollection = collectionItems.filter((i) => ids.includes(i.id) && i.type === type);
  const missingIds = ids.filter((id) => !fromCollection.some((i) => i.id === id));
  const endpoint = type === 'image' ? 'item-images' : 'graphs';
  const label = type === 'image' ? 'image' : 'graph';
  const failed: string[] = [];
  const retryableIds: number[] = [];
  const statusById = new Map<number, number>();

  const results = await Promise.allSettled(
    missingIds.map(async (id) => {
      const response = await apiFetch(`/api/v1/search/${endpoint}/${id}/`);
      if (!response.ok) {
        statusById.set(id, response.status);
        throw new Error(`${label} ${id} (${response.status})`);
      }
      const data = await response.json();
      return { ...data, type } as ResolvedItem;
    })
  );

  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      itemsToLoad.push(result.value);
    } else {
      const id = missingIds[index];
      const status = statusById.get(id);
      if (status === undefined || status >= 500 || status === 429) retryableIds.push(id);
      failed.push(errorMessage(result.reason));
    }
  }

  if (failed.length > 0) {
    reportFailure(`Could not load ${type === 'image' ? 'images' : 'graphs'}: ${failed.join('; ')}`);
  }
  itemsToLoad.push(...fromCollection);
  return retryableIds;
}
