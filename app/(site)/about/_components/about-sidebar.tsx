import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getPublishedPages } from '@/lib/pages-server';
import { resolvePageText, type PageLocale } from '@/lib/pages';
import { readSiteFeatures } from '@/lib/site-features-server';
import { getDefaultSearchCategory } from '@/lib/site-features';
import { searchHref } from '@/lib/search-routing';

export async function AboutSidebar() {
  const [locale, t, pages, siteFeatures] = await Promise.all([
    getLocale(),
    getTranslations('about'),
    getPublishedPages(),
    readSiteFeatures(),
  ]);
  const defaultSearchType = getDefaultSearchCategory(siteFeatures);
  // All about pages (including the 3 former built-in ones — About the
  // Project, Historical Context, Accessibility Statement) are now DB-backed
  // Pages, ordered by their `order` field. "Search" is the one genuine
  // non-page link kept alongside them.
  const links = [
    ...pages.map((page) => ({
      href: `/about/${page.slug}`,
      label: resolvePageText(page.title, locale as PageLocale) || page.slug,
    })),
    ...(siteFeatures.sections.search !== false && defaultSearchType
      ? [{ href: searchHref(defaultSearchType), label: t('search') }]
      : []),
  ];

  return (
    <aside className="w-full md:w-64">
      <nav className="bg-secondary p-5 rounded-lg border border-border">
        <h2 className="text-xl font-bold mb-4">{t('heading')}</h2>
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
