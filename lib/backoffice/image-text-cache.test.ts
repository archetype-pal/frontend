import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { invalidateAfterImageTextDelete } from './image-text-cache';
import { backofficeKeys } from './query-keys';

describe('invalidateAfterImageTextDelete', () => {
  it('marks stale every cached view that lists or guards image texts, and nothing else', async () => {
    const client = new QueryClient();
    const stale: QueryKey[] = [
      backofficeKeys.imageTexts.list({ status: 'Draft' }),
      backofficeKeys.textsMonitor.overview(),
      backofficeKeys.imageTexts.forImage(5),
      backofficeKeys.uncoveredImages.all(),
      backofficeKeys.reviewQueue.all(),
    ];
    const untouched = backofficeKeys.scribes.list();
    for (const key of [...stale, untouched]) client.setQueryData(key, {});

    await invalidateAfterImageTextDelete(client);

    for (const key of stale)
      expect(client.getQueryState(key)?.isInvalidated, String(key)).toBe(true);
    expect(client.getQueryState(untouched)?.isInvalidated).toBe(false);
  });
});
