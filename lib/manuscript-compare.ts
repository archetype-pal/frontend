import type { ManuscriptListItem } from '@/types/search';
import type { CompareItem } from '@/stores/compare-store';

/** A manuscript search result, as a Compare selection item. */
export function manuscriptToCompareItem(item: ManuscriptListItem): CompareItem {
  return {
    itemPartId: item.id,
    displayLabel: item.display_label || item.shelfmark || `Manuscript #${item.id}`,
    shelfmark: item.shelfmark || undefined,
    repositoryLabel: item.repository_name || undefined,
  };
}
