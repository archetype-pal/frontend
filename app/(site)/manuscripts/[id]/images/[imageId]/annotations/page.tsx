import {
  fetchManuscriptImage,
  fetchAllographSummaries,
  fetchHands,
  fetchManuscript,
} from '@/services/manuscripts';
import { fetchAnnotationsForImage, type BackendGraph } from '@/services/annotations';
import { AnnotationGallery } from '@/components/manuscript/annotation-gallery';
import { sortHandsByPriority } from '@/lib/hand-ordering';

// The gallery reads filter state from the URL via useSearchParams, which
// requires the route to render dynamically (it already fetches with no-store).
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string; imageId: string }>;
}

// Settle a fetch into an explicit ok/error result so a failed load is
// distinguishable from a genuinely empty/absent value downstream. Without
// this, `.catch(() => [])` makes a 500 look identical to "no annotations."
async function settle<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: await promise };
  } catch {
    return { ok: false };
  }
}

export default async function AnnotationsTabPage({ params }: PageProps) {
  const { id, imageId } = await params;

  let image;
  try {
    image = await fetchManuscriptImage(imageId);
  } catch {
    return <div className="px-4 py-6 text-muted-foreground">Unable to load image.</div>;
  }

  const [graphsResult, allographsResult, handsResult, manuscript] = await Promise.all([
    settle(fetchAnnotationsForImage(imageId)),
    settle(fetchAllographSummaries()),
    settle(fetchHands(image.item_part, image.id)),
    fetchManuscript(image.item_part).catch(() => null),
  ]);

  const graphs: BackendGraph[] = graphsResult.ok ? graphsResult.value : [];
  const allographs = allographsResult.ok ? allographsResult.value : [];
  const hands = handsResult.ok ? handsResult.value.results : [];

  // The graph list is the page's primary content; its failure gets a
  // dedicated error state. Hands/allographs only power the filter and edit
  // dialog, so their failure degrades gracefully behind a softer notice.
  const loadError = !graphsResult.ok;
  const supportingDataIncomplete = !allographsResult.ok || !handsResult.ok;

  return (
    <div className="px-4 py-6">
      <AnnotationGallery
        manuscriptId={id}
        imageId={imageId}
        itemImageId={image.id}
        itemPartId={image.item_part}
        iiifImage={image.iiif_image}
        locus={image.locus ?? ''}
        shelfmark={manuscript?.display_label ?? ''}
        graphs={graphs}
        hands={sortHandsByPriority(hands)}
        allographs={allographs}
        loadError={loadError}
        supportingDataIncomplete={supportingDataIncomplete}
      />
    </div>
  );
}
