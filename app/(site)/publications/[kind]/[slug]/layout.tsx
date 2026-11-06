import { requireFound } from '@/lib/route-gates';
import { fetchPublicationBySlug } from '@/components/content/publication-pages';
import { isPublicationKind, publicationMatchesKind } from '@/lib/publications';

export default async function PublicationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ kind: string; slug: string }>;
}) {
  const { kind, slug } = await params;
  await requireFound(
    fetchPublicationBySlug(slug).then((item) =>
      item && isPublicationKind(kind) && publicationMatchesKind(item, kind) ? item : null
    )
  );
  return children;
}
