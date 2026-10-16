import type { QueryClient } from '@tanstack/react-query';

import { backofficeKeys } from './query-keys';

/**
 * Mark stale every cached view an image-text delete changes: the lists and
 * monitor, the per-image "already has a text" guard, the uncovered-images
 * list and the review queue.
 */
export function invalidateAfterImageTextDelete(queryClient: QueryClient): Promise<unknown> {
  return Promise.all(
    [
      backofficeKeys.imageTexts.list(),
      backofficeKeys.textsMonitor.overview(),
      backofficeKeys.imageTexts.forImage(),
      backofficeKeys.uncoveredImages.all(),
      backofficeKeys.reviewQueue.all(),
    ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );
}
