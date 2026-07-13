import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PublicationDetailPage, publicationMetadata } from '@/components/content/publication-pages';
import { isPublicationKind } from '@/lib/publications';

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
    return { title: t('publicationFallbackTitle') };
  }
  return publicationMetadata({ kind, slug });
}

export default async function PublicationDetailRoute({
  params,
}: {
  params: Promise<{ kind: string; slug: string }>;
}) {
  const { kind, slug } = await params;
  if (!isPublicationKind(kind)) notFound();
  return <PublicationDetailPage kind={kind} slug={slug} />;
}
