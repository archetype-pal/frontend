import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { ImageHeader, ImageHeaderSkeleton } from './image-header';
import { loadImage } from './image';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; imageId: string }>;
}

// No loading.tsx sits above this layout, so the image is looked up before
// anything streams: an unknown image is a real 404 and a moved one a real
// redirect. A failed lookup throws to the part's error boundary. Only the
// header's slower reads stream, behind their own skeleton.
export default async function ManuscriptImageLayout({ children, params }: LayoutProps) {
  const { id, imageId } = await params;

  const image = await loadImage(imageId);
  if (!image) notFound();

  // A link saved before the image moved to another part still carries the old
  // part id. A layout cannot see which tab was asked for, so this lands on the
  // image itself.
  if (id !== String(image.item_part)) {
    redirect(`/manuscripts/${image.item_part}/images/${imageId}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <React.Suspense fallback={<ImageHeaderSkeleton />}>
        <ImageHeader id={id} imageId={imageId} image={image} />
      </React.Suspense>

      <div className="flex-1">{children}</div>
    </div>
  );
}
