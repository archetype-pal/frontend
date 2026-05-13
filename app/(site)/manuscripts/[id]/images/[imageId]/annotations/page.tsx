import {
  fetchManuscriptImage,
  fetchAllographs,
  fetchHands,
  fetchManuscript,
} from '@/services/manuscripts';
import { fetchAnnotationsForImage } from '@/services/annotations';
import { AnnotationGallery } from '@/components/manuscript/annotation-gallery';
import { sortHandsByPriority } from '@/lib/hand-ordering';

interface PageProps {
  params: Promise<{ id: string; imageId: string }>;
}

export default async function AnnotationsTabPage({ params }: PageProps) {
  const { id, imageId } = await params;

  let image;
  try {
    image = await fetchManuscriptImage(imageId);
  } catch {
    return <div className="px-4 py-6 text-muted-foreground">Unable to load image.</div>;
  }

  const [graphs, allographs, hands, manuscript] = await Promise.all([
    fetchAnnotationsForImage(imageId).catch(() => []),
    fetchAllographs().catch(() => []),
    fetchHands(image.item_part, image.id).catch(() => ({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })),
    fetchManuscript(image.item_part).catch(() => null),
  ]);

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
        hands={sortHandsByPriority(hands.results)}
        allographs={allographs}
      />
    </div>
  );
}
