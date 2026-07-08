'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import BlogPostPreview from './blog-post-preview';
import { getPublications, type Publication, type PublicationParams } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { PageBanner } from '@/components/layout/page-banner';

interface PaginatedPublicationsProps {
  title: string;
  categoryFlag: 'is_blog_post' | 'is_news' | 'is_featured';
  basePath: string;
}

const POSTS_PER_PAGE = 10;
const RECENT_POST_COUNT = 5;

export default function PaginatedPublications({
  title,
  categoryFlag,
  basePath,
}: PaginatedPublicationsProps) {
  const t = useTranslations('content.publicationsList');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Clamp the page param: a non-numeric (?page=abc → NaN) or out-of-range
  // (?page=0 → negative offset) value would otherwise send a malformed offset
  // to the API. Fall back to page 1 and floor fractional values.
  const parsedPage = Math.floor(Number(searchParams.get('page')));
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  const offset = (page - 1) * POSTS_PER_PAGE;

  const [articles, setArticles] = useState<Publication[]>([]);
  const [recentPosts, setRecentPosts] = useState<Publication[]>([]);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  // Fetch paginated articles
  useEffect(() => {
    const fetchPaginated = async () => {
      try {
        const params: PublicationParams = {
          limit: POSTS_PER_PAGE,
          offset,
          [categoryFlag]: true,
        };

        const data = await getPublications(params);
        setArticles(data.results);
        setTotal(data.count);
      } catch (err) {
        console.error('Error fetching paginated articles:', err);
      }
    };

    fetchPaginated();
  }, [offset, categoryFlag]);

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
      }
    };

    fetchRecent();
  }, [categoryFlag]);

  const goToPage = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', newPage.toString());
    router.push(`${basePath}?${newParams.toString()}`);
  };

  // Window the page-number buttons (first/last + a sibling window + ellipsis),
  // matching components/search/paginated-search.tsx, so a large publication
  // count doesn't render hundreds of buttons.
  const buildPageWindow = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const siblings = 1;
    const left = Math.max(page - siblings, 2);
    const right = Math.min(page + siblings, totalPages - 1);

    pages.push(1);
    if (left > 2) pages.push('ellipsis');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <div>
      <PageBanner title={title} />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-16">
          {/* Main Content */}
          <main className="flex-1">
            {articles.length === 0 ? (
              <p className="text-muted-foreground">{t('noPostsFound')}</p>
            ) : (
              <div className="space-y-6">
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
                      commentsCount={article.number_of_comments}
                      showShareBtns={false}
                      showReadMoreBtn={true}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-12 flex-wrap">
                <Button variant="outline" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                  {t('prev')}
                </Button>

                {buildPageWindow().map((pageNum, i) =>
                  pageNum === 'ellipsis' ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      onClick={() => goToPage(pageNum)}
                      className={pageNum === page ? 'shadow-sm' : ''}
                    >
                      {pageNum}
                    </Button>
                  )
                )}

                <Button
                  variant="outline"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  {t('next')}
                </Button>
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
                {recentPosts.map((article) => (
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
