import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaginatedPublications from '@/components/content/paginated-publications';
import BlogPostPreview from '@/components/content/blog-post-preview';
import {
  getPublicationItem,
  PublicationNotFoundError,
  type Publication,
  getPublications,
} from '@/utils/api';
import { PUBLICATION_KIND_CONFIG, type PublicationKind } from '@/lib/publications';
import { PageLoadingState } from '@/components/page/page-loading-state';
import { BackofficeLink } from '@/components/common/backoffice-link';

export const dynamic = 'force-dynamic';

async function getPublicationBySlug(slug: string): Promise<Publication> {
  try {
    return await getPublicationItem(slug);
  } catch (error) {
    if (error instanceof PublicationNotFoundError) notFound();
    throw error;
  }
}

export function PublicationListPage({ kind }: { kind: PublicationKind }) {
  const config = PUBLICATION_KIND_CONFIG[kind];
  return (
    <Suspense fallback={<PageLoadingState label="Loading publications…" />}>
      <PaginatedPublications
        title={config.title}
        categoryFlag={config.queryFlag}
        basePath={config.routeBase}
      />
    </Suspense>
  );
}

export async function publicationMetadata({
  kind,
  slug,
}: {
  kind: PublicationKind;
  slug: string;
}): Promise<Metadata> {
  const config = PUBLICATION_KIND_CONFIG[kind];
  try {
    const item = await getPublicationBySlug(slug);
    const author = [item.author?.first_name, item.author?.last_name].filter(Boolean).join(' ');
    return {
      title: `${item.title} | Models of Authority`,
      description: item.preview || `${item.title} – Models of Authority ${config.summaryLabel}`,
      openGraph: {
        title: item.title,
        description: item.preview || undefined,
        type: 'article',
        ...(author && { authors: [author] }),
        publishedTime: item.published_at ?? undefined,
      },
    };
  } catch {
    return { title: `${config.summaryLabel} | Models of Authority` };
  }
}

export async function PublicationDetailPage({
  kind,
  slug,
}: {
  kind: PublicationKind;
  slug: string;
}) {
  const config = PUBLICATION_KIND_CONFIG[kind];
  const item = await getPublicationBySlug(slug);
  const recent = await getPublications({ [config.queryFlag]: true, limit: 5, offset: 0 });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <main className="flex-1">
          <div className="mb-2 flex justify-end">
            <BackofficeLink kind="publication" id={item.slug} />
          </div>
          <BlogPostPreview
            key={item.id}
            title={item.title}
            author={[item.author?.first_name, item.author?.last_name].filter(Boolean).join(' ')}
            date={item.published_at ?? ''}
            excerpt={item.content}
            slug={`${config.routeBase}/${item.slug}`}
            commentsCount={item.number_of_comments}
            showShareBtns
            showReadMoreBtn={false}
          />
        </main>
        <aside className="w-full md:w-80">
          <section className="mb-8">
            <h2 className="text-lg font-serif font-semibold text-foreground border-b border-border pb-2 mb-4">
              Recent {config.title}
            </h2>
            <ul className="space-y-2">
              {recent.results
                .filter((entry) => entry.slug !== item.slug)
                .slice(0, 5)
                .map((entry) => (
                  <li key={entry.id}>
                    <Link
                      href={`${config.routeBase}/${entry.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {entry.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-serif font-semibold text-foreground border-b border-border pb-2 mb-4">
              Back to list
            </h2>
            <Link href={config.routeBase} className="text-sm text-primary hover:underline">
              View all {config.title.toLowerCase()}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
