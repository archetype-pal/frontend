import * as React from 'react';
import Link from 'next/link';
import { ManuscriptTabs } from '@/components/manuscript/manuscript-tabs';
import { fetchManuscriptImage, fetchManuscript } from '@/services/manuscripts';
import { fetchAnnotationsForImage } from '@/services/annotations';
import { fetchImageTextsForImage } from '@/services/image-texts';
import { fetchOtherImages } from '@/services/manuscript-image-tabs';
import { sanitizeHtml } from '@/lib/sanitize-html';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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

  const label = manuscript?.display_label?.trim() || 'Unknown manuscript';
  const locus = image.locus?.trim() || '';
  const description = manuscript?.historical_item?.descriptions?.[0]?.content;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-4 pb-0 pt-4 sm:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/search/manuscripts">Manuscripts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/manuscripts/${id}`}>{label}: Item overview</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {locus ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="capitalize">{locus}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mt-3">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {label}
            {locus ? (
              <span className="font-normal capitalize text-muted-foreground"> · {locus}</span>
            ) : null}
          </h1>
        </div>

        {description ? (
          // Descriptions are authored as HTML; sanitize and flow inline so the
          // 2-line clamp works on a brief teaser rather than printing raw markup.
          <p
            className="mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed text-muted-foreground [&_p]:m-0 [&_p]:inline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
          />
        ) : null}

        <div className="mt-3">
          <ManuscriptTabs
            manuscriptId={id}
            imageId={imageId}
            counts={{
              annotations: imageGraphs.length,
              texts: visibleTexts.length,
              otherImages: otherImages.length,
            }}
          />
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
