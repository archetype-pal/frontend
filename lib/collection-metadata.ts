import { formatAllographLabel } from '@/lib/allograph-labels';
import { fetchAnnotationsForImage } from '@/services/annotations';
import { fetchAllographSummaries, fetchHands } from '@/services/manuscripts';
import type { CollectionItem } from './collection-storage';

function getGraphItemsMissingLabels(items: CollectionItem[]): CollectionItem[] {
  return items.filter(
    (item) =>
      item.type === 'graph' &&
      typeof item.item_image === 'number' &&
      (!item.allograph || !item.hand_name)
  );
}

export async function backfillCollectionGraphLabels(
  items: CollectionItem[],
  token?: string | null
): Promise<CollectionItem[]> {
  const candidates = getGraphItemsMissingLabels(items);
  if (candidates.length === 0) return items;

  const itemImageIds = Array.from(
    new Set(candidates.map((item) => item.item_image).filter((id): id is number => id != null))
  );
  const graphs = (
    await Promise.all(
      itemImageIds.map((itemImageId) =>
        fetchAnnotationsForImage(String(itemImageId), undefined, null, token).catch(() => [])
      )
    )
  ).flat();
  const graphById = new Map(graphs.map((graph) => [graph.id, graph]));

  const [allographs, handsByContext] = await Promise.all([
    fetchAllographSummaries().catch(() => []),
    Promise.all(
      Array.from(
        new Map(
          candidates
            .filter(
              (item) => typeof item.item_part === 'number' && typeof item.item_image === 'number'
            )
            .map((item) => [`${item.item_part}:${item.item_image}`, item] as const)
        ).values()
      ).map((item) =>
        fetchHands(item.item_part as number, item.item_image as number)
          .then((response) => response.results)
          .catch(() => [])
      )
    ),
  ]);

  const allographLabelById = new Map(
    allographs.map((allograph) => [allograph.id, formatAllographLabel(allograph)])
  );
  const handNameById = new Map(handsByContext.flat().map((hand) => [hand.id, hand.name]));
  let changed = false;

  const nextItems = items.map((item) => {
    if (item.type !== 'graph' || (item.allograph && item.hand_name)) return item;

    const graph = graphById.get(item.id);
    if (!graph) return item;

    const allograph =
      item.allograph ??
      (graph.allograph === null ? undefined : allographLabelById.get(graph.allograph));
    const handName =
      item.hand_name ?? (graph.hand === null ? undefined : handNameById.get(graph.hand));

    if (allograph === item.allograph && handName === item.hand_name) return item;

    changed = true;
    return {
      ...item,
      allograph,
      hand_name: handName,
    };
  });

  return changed ? nextItems : items;
}
