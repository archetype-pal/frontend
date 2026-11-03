import { notFound } from 'next/navigation';
import { requireSection } from '@/lib/route-gates';
import { isPublicationKind, PUBLICATION_KIND_CONFIG } from '@/lib/publications';

export default async function PublicationKindLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isPublicationKind(kind)) notFound();
  await requireSection(PUBLICATION_KIND_CONFIG[kind].sectionKey);
  return children;
}
