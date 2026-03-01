import type { Metadata } from 'next';
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
    return { title: 'Publication | Models of Authority' };
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
