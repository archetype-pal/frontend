import { notFound } from 'next/navigation';
import { isPublicationKind } from '@/lib/publications';
import { PublicationListPage } from '@/components/content/publication-pages';

export default async function PublicationsByKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isPublicationKind(kind)) notFound();
  return <PublicationListPage kind={kind} />;
}
