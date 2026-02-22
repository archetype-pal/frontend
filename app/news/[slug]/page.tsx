import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicationItem, PublicationNotFoundError, type Publication } from '@/utils/api';
import BlogPostPreview from '@/components/content/blog-post-preview';

async function getNewsItem(slug: string): Promise<Publication> {
  try {
    const newsItem = await getPublicationItem(slug);
    return newsItem;
  } catch (error) {
    if (error instanceof PublicationNotFoundError) notFound();
    console.error('Error fetching news item:', error);
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const item = await getNewsItem(slug);
    return {
      title: `${item.title} | Models of Authority`,
      description: item.preview || `${item.title} – Models of Authority news`,
      openGraph: {
        title: item.title,
        description: item.preview || undefined,
        type: 'article',
        publishedTime: item.published_at ?? undefined,
      },
    };
  } catch {
    return { title: 'News | Models of Authority' };
  }
}

export default async function NewsList({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const newsItem = await getNewsItem(slug);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <main className="flex-1">
          <BlogPostPreview
            key={newsItem.id}
            title={newsItem.title}
            author={newsItem.author.first_name + ' ' + newsItem.author.last_name}
            date={newsItem.published_at ?? ''}
            excerpt={newsItem.content}
            slug={'/news/' + newsItem.slug}
            commentsCount={newsItem.number_of_comments}
            showShareBtns={true}
            showReadMoreBtn={false}
          />
        </main>
        <aside className="w-full md:w-96">
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Recent Posts
            </h2>
          </section>
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Posts by Topic
            </h2>
          </section>
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Posts by Date
            </h2>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm">
              <option>Select month</option>
            </select>
          </section>
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Posts by Author
            </h2>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
              Feeds
            </h2>
            <Link href="#" className="text-blue-600 hover:underline text-sm">
              RSS / Atom
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
