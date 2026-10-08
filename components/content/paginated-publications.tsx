'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import BlogPostPreview from './blog-post-preview';
import { getPublications, type Publication, type PublicationParams } from '@/utils/api';
import { Skeleton } from '@/components/ui/skeleton';
import { PageBanner } from '@/components/layout/page-banner';
import { DataPagination } from '@/components/ui/data-pagination';
import { cn } from '@/lib/utils';

interface PaginatedPublicationsProps {
  title: string;
  categoryFlag: 'is_blog_post' | 'is_news' | 'is_featured';
  basePath: string;
}

const DEFAULT_POSTS_PER_PAGE = 20;
const RECENT_POST_COUNT = 5;

export default function PaginatedPublications({
  title,
  categoryFlag,
  basePath,
}: PaginatedPublicationsProps) {
  const t = useTranslations('content.publicationsList');
  const router = useRouter();
  const searchParams = useSearchParams();

  const parsedPage = Math.floor(Number(searchParams.get('page')));
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const parsedLimit = Math.floor(Number(searchParams.get('limit')));
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100
      ? parsedLimit
      : DEFAULT_POSTS_PER_PAGE;

  const offset = (page - 1) * limit;

  const [articles, setArticles] = useState<Publication[] | null>(null);
  const [recentPosts, setRecentPosts] = useState<Publication[] | null>(null);
  const [total, setTotal] = useState(0);
  const listRef = useRef<HTMLElement>(null);
  const requestKey = `${categoryFlag}:${limit}:${offset}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  // Pending from the click until the new URL lands, so the list dims at once.
  const [isNavigating, startNavigation] = useTransition();
  const isStale = articles !== null && (loadedKey !== requestKey || isNavigating);

  useEffect(() => {
    const key = `${categoryFlag}:${limit}:${offset}`;
    const fetchPaginated = async () => {
      try {
        const params: PublicationParams = {
          limit,
          offset,
          [categoryFlag]: true,
        };

        const data = await getPublications(params);
        setArticles(data.results);
        setTotal(data.count);
      } catch (err) {
        console.error('Error fetching paginated articles:', err);
        setArticles((prev) => prev ?? []);
      }
      setLoadedKey(key);
    };

    fetchPaginated();
  }, [offset, limit, categoryFlag]);

  // Fetch fixed list of recent posts only once
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const params: PublicationParams = {
          limit: RECENT_POST_COUNT,
          offset: 0,
          [categoryFlag]: true,
        };

        const data = await getPublications(params);
        setRecentPosts(data.results);
      } catch (err) {
        console.error('Error fetching recent posts:', err);
        setRecentPosts([]);
      }
    };

    fetchRecent();
  }, [categoryFlag]);

  const handlePageChange = (newPage: number, options?: { clamped: boolean }) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', newPage.toString());
    const url = `${basePath}?${newParams.toString()}`;
    startNavigation(() => (options?.clamped ? router.replace(url) : router.push(url)));
  };

  const handleLimitChange = (newLimit: number) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('limit', newLimit.toString());
    newParams.set('page', '1');
    startNavigation(() => router.push(`${basePath}?${newParams.toString()}`));
  };

  return (
    <div>
      <PageBanner title={title} />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-16">
          {/* Main Content */}
          <main ref={listRef} className="flex-1 scroll-mt-[var(--site-header-h,0px)]">
            {articles === null ? (
              <div className="space-y-6">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border border-l-4 border-l-accent bg-card p-5 shadow-sm"
                  >
                    <Skeleton className="mb-2 h-6 w-2/3" />
                    <Skeleton className="mb-4 h-4 w-1/3" />
                    <div className="mb-4 space-y-2">
                      {[...Array(5)].map((_, j) => (
                        <Skeleton key={j} className={j === 4 ? 'h-4 w-1/2' : 'h-4 w-full'} />
                      ))}
                    </div>
                    <Skeleton className="h-9 w-28" />
                  </div>
                ))}
              </div>
            ) : articles.length === 0 ? (
              <p className="text-muted-foreground">{t('noPostsFound')}</p>
            ) : (
              <div
                aria-busy={isStale || undefined}
                className={cn(
                  'space-y-6 transition-opacity duration-250 ease-out',
                  isStale && 'opacity-60'
                )}
              >
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="rounded-lg border border-border border-l-4 border-l-accent bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <BlogPostPreview
                      title={article.title}
                      author={`${article.author.first_name} ${article.author.last_name}`}
                      date={article.published_at ?? ''}
                      excerpt={article.preview}
                      slug={`${basePath}/${article.slug}`}
                      keywords={article.keywords}
                      commentsCount={article.number_of_comments}
                      showShareBtns={false}
                      showReadMoreBtn={true}
                    />
                  </div>
                ))}
              </div>
            )}

            {articles && (
              <div className="mt-12">
                <DataPagination
                  scrollTargetRef={listRef}
                  totalItems={total}
                  page={page}
                  pageSize={limit}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handleLimitChange}
                />
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="w-full md:w-80">
            {/* Recent Posts */}
            <section className="mb-10">
              <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                {t('recentPosts')}
                <span className="block mt-1 w-8 h-0.5 bg-accent rounded-full" />
              </h2>
              <ul className="space-y-2.5">
                {recentPosts === null
                  ? [...Array(RECENT_POST_COUNT)].map((_, i) => (
                      <li key={i}>
                        <Skeleton className="h-5 w-full" />
                      </li>
                    ))
                  : recentPosts.map((article) => (
                      <li key={article.id}>
                        <Link
                          href={`${basePath}/${article.slug}`}
                          className="text-sm text-primary hover:text-primary/80 transition-colors"
                        >
                          {article.title}
                        </Link>
                      </li>
                    ))}
              </ul>
            </section>

            {/* Placeholder Filters */}
            <section className="mb-10">
              <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                {t('postsByDate')}
                <span className="block mt-1 w-8 h-0.5 bg-accent rounded-full" />
              </h2>
              <select className="w-full border border-border rounded-md px-3 py-2 text-sm bg-card">
                <option>{t('selectMonth')}</option>
                {/* Filter by month – not yet wired to data */}
              </select>
            </section>

            <section>
              <h2 className="text-lg font-serif font-semibold text-foreground mb-4">
                {t('feeds')}
                <span className="block mt-1 w-8 h-0.5 bg-accent rounded-full" />
              </h2>
              <Link
                href="#"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {t('rssAtom')}
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
