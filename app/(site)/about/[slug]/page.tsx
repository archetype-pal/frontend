import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageBanner } from '@/components/layout/page-banner';
import { AboutSidebar } from '../_components/about-sidebar';
import { getPublishedPageBySlug } from '@/lib/pages-server';
import { resolvePageText, type PageLocale } from '@/lib/pages';
import { sanitizeHtml } from '@/lib/sanitize-html';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [locale, page] = await Promise.all([getLocale(), getPublishedPageBySlug(slug)]);
  if (!page) return {};
  return { title: resolvePageText(page.title, locale as PageLocale) };
}

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, page] = await Promise.all([getLocale(), getPublishedPageBySlug(slug)]);
  if (!page) notFound();

  const title = resolvePageText(page.title, locale as PageLocale);
  const html = resolvePageText(page.content, locale as PageLocale);

  return (
    <div>
      <PageBanner title={title} />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-12">
          <main
            className="flex-1 prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />

          <AboutSidebar />
        </div>
      </div>
    </div>
  );
}
