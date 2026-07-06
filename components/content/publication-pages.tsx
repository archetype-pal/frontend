import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
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
import { readModelLabels } from '@/lib/model-labels-server';
import { resolveModelLabel, type ModelLabelLocale } from '@/lib/model-labels';

export const dynamic = 'force-dynamic';

async function getPublicationBySlug(slug: string): Promise<Publication> {
  try {
    return await getPublicationItem(slug);
  } catch (error) {
    if (error instanceof PublicationNotFoundError) notFound();
    throw error;
  }
}

export async function PublicationListPage({ kind }: { kind: PublicationKind }) {
  const config = PUBLICATION_KIND_CONFIG[kind];
  const t = await getTranslations('content');
  return (
    <Suspense fallback={<PageLoadingState label={t('blog.loadingPublications')} />}>
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
  const [locale, modelLabels] = await Promise.all([getLocale(), readModelLabels()]);
  const siteTitle = resolveModelLabel(modelLabels.labels.siteTitle, locale as ModelLabelLocale);
  try {
    const item = await getPublicationBySlug(slug);
    const author = [item.author?.first_name, item.author?.last_name].filter(Boolean).join(' ');
    return {
      // The root layout applies a `%s | ${siteTitle}` title template, so
      // return the bare title here to avoid double-suffixing.
      title: item.title,
      description: item.preview || `${item.title} – ${siteTitle} ${config.summaryLabel}`,
      openGraph: {
        title: item.title,
        description: item.preview || undefined,
        type: 'article',
        ...(author && { authors: [author] }),
        publishedTime: item.published_at ?? undefined,
      },
    };
  } catch {
    return { title: config.summaryLabel };
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
  const t = await getTranslations('content');

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
              {t('blog.recentSection', { title: config.title })}
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
              {t('blog.backToList')}
            </h2>
            <Link href={config.routeBase} className="text-sm text-primary hover:underline">
              {t('blog.viewAll', { title: config.title.toLowerCase() })}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
