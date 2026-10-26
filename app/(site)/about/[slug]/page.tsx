import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PageBanner } from '@/components/layout/page-banner';
import { AboutSidebar } from '../_components/about-sidebar';
import { getMenuHeadings, getPublishedPageBySlug } from '@/lib/pages-server';
import { resolvePageText, type Page, type PageLocale } from '@/lib/pages';
import { readSiteFeatures } from '@/lib/site-features-server';
import { sanitizeHtml } from '@/lib/sanitize-html';

/**
 * The page, or null when it's missing or listed under About while the About
 * section is off. proxy.ts can't gate `/about/*` itself: pages under a custom
 * heading share the prefix and stay reachable with About off.
 */
async function getVisiblePage(slug: string): Promise<Page | null> {
  const [page, siteFeatures, menuHeadings] = await Promise.all([
    getPublishedPageBySlug(slug),
    readSiteFeatures(),
    getMenuHeadings(),
  ]);
  if (!page || siteFeatures.sections.about !== false) return page;
  // Same fallback as the header: a page whose heading is unknown sits under About.
  const underAbout = !menuHeadings.some((h) => h.slug === page.menu_heading);
  return underAbout ? null : page;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [locale, page] = await Promise.all([getLocale(), getVisiblePage(slug)]);
  if (!page) return {};
  return { title: resolvePageText(page.title, locale as PageLocale) };
}

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [locale, page] = await Promise.all([getLocale(), getVisiblePage(slug)]);
  if (!page) notFound();

  const title = resolvePageText(page.title, locale as PageLocale);
  const html = resolvePageText(page.content, locale as PageLocale);

  return (
    <div>
      <PageBanner title={title} />
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row gap-12">
          <main
            className="flex-1 publication-body"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
          />

          <AboutSidebar menuHeading={page.menu_heading} />
        </div>
      </div>
    </div>
  );
}
