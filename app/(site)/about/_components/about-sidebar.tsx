import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getMenuHeadings, getPublishedPages } from '@/lib/pages-server';
import { pageHref, resolvePageText, type PageLocale } from '@/lib/pages';
import { readSiteFeatures } from '@/lib/site-features-server';
import { getDefaultSearchCategory } from '@/lib/site-features';
import { searchHref } from '@/lib/search-routing';

/**
 * The pages listed under the current page's menu heading (`menuHeading`, null
 * = About), mirroring that heading's dropdown in the header.
 */
export async function AboutSidebar({ menuHeading }: { menuHeading: string | null }) {
  const [locale, t, pages, menuHeadings, siteFeatures] = await Promise.all([
    getLocale(),
    getTranslations('about'),
    getPublishedPages(),
    getMenuHeadings(),
    readSiteFeatures(),
  ]);
  const heading = menuHeadings.find((h) => h.slug === menuHeading) ?? null;
  // Same fallback as the header: a page whose heading is unknown sits under About.
  const pageHeading = (slug: string | null) =>
    slug && menuHeadings.some((h) => h.slug === slug) ? slug : null;
  const defaultSearchType = getDefaultSearchCategory(siteFeatures);
  // All about pages (including the 3 former built-in ones — About the
  // Project, Historical Context, Accessibility Statement) are now DB-backed
  // Pages, ordered by their `order` field. "Search" is the one genuine
  // non-page link kept alongside them, under About only.
  const links = [
    ...pages
      .filter((page) => pageHeading(page.menu_heading) === (heading?.slug ?? null))
      .map((page) => ({
        href: pageHref(page.slug),
        label: resolvePageText(page.title, locale as PageLocale) || page.slug,
      })),
    ...(!heading && siteFeatures.sections.search !== false && defaultSearchType
      ? [{ href: searchHref(defaultSearchType), label: t('search') }]
      : []),
  ];
  const title = heading
    ? resolvePageText(heading.title, locale as PageLocale) || heading.slug
    : t('heading');

  return (
    <aside className="w-full md:w-64">
      <nav className="bg-secondary p-5 rounded-lg border border-border">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-primary hover:underline">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
