import * as React from 'react';
import Link from 'next/link';
import { ManuscriptTabs } from '@/components/manuscript/manuscript-tabs';
import { fetchManuscriptImage, fetchManuscript } from '@/services/manuscripts';
import { fetchAnnotationsForImage } from '@/services/annotations';
import { fetchImageTextsForImage } from '@/services/image-texts';
import { fetchOtherImages } from '@/services/manuscript-image-tabs';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string; imageId: string }>;
}

export default async function ManuscriptImageLayout({ children, params }: LayoutProps) {
  const { id, imageId } = await params;

  let image;
  try {
    image = await fetchManuscriptImage(imageId);
  } catch {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Image not found.
      </div>
    );
  }

  const [manuscript, otherImages, imageGraphs, visibleTexts] = await Promise.all([
    fetchManuscript(image.item_part).catch(() => null),
    fetchOtherImages(image.item_part, image.id).catch(() => []),
    fetchAnnotationsForImage(imageId).catch(() => []),
    fetchImageTextsForImage(imageId).catch(() => []),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card px-4 py-2">
        <h1 className="text-lg font-semibold">
          Manuscript Image:{' '}
          <Link href={`/manuscripts/${id}`} className="text-blue-600 hover:underline">
            {manuscript?.display_label ?? 'Unknown manuscript'}
          </Link>
          : {image.locus}
        </h1>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {manuscript?.historical_item?.descriptions?.[0]?.content ?? 'No description available'}
        </p>
      </header>

      <ManuscriptTabs
        manuscriptId={id}
        imageId={imageId}
        counts={{
          annotations: imageGraphs.length,
          texts: visibleTexts.length,
          otherImages: otherImages.length,
        }}
      />

      <div className="flex-1">{children}</div>
    </div>
  );
}
