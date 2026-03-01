'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BlogPostPreview from './blog-post-preview';
import { getPublications, type Publication, type PublicationParams } from '@/utils/api';
import { Button } from '@/components/ui/button';

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
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = Number(searchParams.get('page') || 1);
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

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-16">
        {/* Main Content */}
        <main className="flex-1">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">{title}</h1>

          {articles.length === 0 ? (
            <p className="text-gray-500">No posts found.</p>
          ) : (
            <div className="space-y-8">
              {articles.map((article) => (
                <BlogPostPreview
                  key={article.id}
                  title={article.title}
                  author={`${article.author.first_name} ${article.author.last_name}`}
                  date={article.published_at ?? ''}
                  excerpt={article.preview}
                  slug={`${basePath}/${article.slug}`}
                  commentsCount={article.number_of_comments}
                  showShareBtns={false}
                  showReadMoreBtn={true}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10 flex-wrap">
              <Button variant="outline" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
                Prev
              </Button>

              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? 'default' : 'outline'}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              <Button variant="outline" onClick={() => goToPage(page + 1)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-full md:w-80">
          {/* Recent Posts */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
              Recent Posts
            </h2>
            <ul className="space-y-2">
              {recentPosts.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`${basePath}/${article.slug}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Placeholder Filters */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
              Posts by Date
            </h2>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
              <option>Select month</option>
              {/* Filter by month – not yet wired to data */}
            </select>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
              Feeds
            </h2>
            <Link href="#" className="text-sm text-blue-600 hover:underline">
              RSS / Atom
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
