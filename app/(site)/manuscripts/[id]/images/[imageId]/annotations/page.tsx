import { fetchManuscriptImage, fetchAllographs, fetchHands } from '@/services/manuscripts';
import { fetchAnnotationsForImage } from '@/services/annotations';
import { AnnotationGallery } from '@/components/manuscript/annotation-gallery';

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

  const [graphs, allographs, hands] = await Promise.all([
    fetchAnnotationsForImage(imageId).catch(() => []),
    fetchAllographs().catch(() => []),
    fetchHands(image.item_part).catch(() => ({
      count: 0,
      next: null,
      previous: null,
      results: [],
    })),
  ]);

  return (
    <div className="px-4 py-6">
      <AnnotationGallery
        manuscriptId={id}
        imageId={imageId}
        iiifImage={image.iiif_image}
        graphs={graphs}
        hands={hands.results}
        allographs={allographs}
      />
    </div>
  );
}
