import { fetchManuscriptImage } from '@/services/manuscripts';
import { fetchOtherImages } from '@/services/manuscript-image-tabs';
import { OtherImagesGrid } from '@/components/manuscript/other-images-grid';

interface PageProps {
  params: Promise<{ id: string; imageId: string }>;
}

export default async function OtherImagesTabPage({ params }: PageProps) {
  const { id, imageId } = await params;

  let image;
  try {
    image = await fetchManuscriptImage(imageId);
  } catch {
    return <div className="px-4 py-6 text-muted-foreground">Unable to load image.</div>;
  }

  const others = await fetchOtherImages(image.item_part, image.id);

  return (
    <div className="px-4 py-6">
      <OtherImagesGrid manuscriptId={id} images={others} />
    </div>
  );
}
