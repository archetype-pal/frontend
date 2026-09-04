import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import NotFound from '@/app/not-found';
import { notFound } from 'next/navigation';
import {
  fetchPublicationBySlug,
  PublicationDetailPage,
  publicationMetadata,
} from '@/components/content/publication-pages';
import { isPublicationKind, publicationMatchesKind } from '@/lib/publications';

function publicationNotFound() {
  if (process.env.NODE_ENV === 'development') return <NotFound />;
  notFound();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string; slug: string }>;
}): Promise<Metadata> {
  const { kind, slug } = await params;
  if (!isPublicationKind(kind)) {
    // The root layout applies a `%s | ${siteTitle}` title template, so
    // return the bare title here to avoid double-suffixing.
    const t = await getTranslations('content.blog');
    return {
      title: t('publicationFallbackTitle'),
      robots: { index: false, follow: false },
    };
  }
  return publicationMetadata({ kind, slug });
}

export default async function PublicationDetailRoute({
  params,
}: {
  params: Promise<{ kind: string; slug: string }>;
}) {
  const { kind, slug } = await params;
  if (!isPublicationKind(kind)) return publicationNotFound();
  const item = await fetchPublicationBySlug(slug);
  if (!item || !publicationMatchesKind(item, kind)) return publicationNotFound();
  return <PublicationDetailPage kind={kind} item={item} />;
}
