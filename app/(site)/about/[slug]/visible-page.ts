import { cache } from 'react';
import { getMenuHeadings, getPublishedPageBySlug } from '@/lib/pages-server';
import { isListedUnderAbout, type Page } from '@/lib/pages';
import { readSiteFeatures } from '@/lib/site-features-server';

/**
 * The page, or null when it's missing or listed under About while the About
 * section is off. The About toggle can't gate the `/about/*` prefix: pages
 * under a custom heading share it and stay reachable with About off.
 *
 * One read per request: the layout and the page share it.
 */
export const getVisiblePage = cache(async (slug: string): Promise<Page | null> => {
  const [page, siteFeatures, menuHeadings] = await Promise.all([
    getPublishedPageBySlug(slug),
    readSiteFeatures(),
    getMenuHeadings(),
  ]);
  if (!page || siteFeatures.sections.about !== false) return page;
  return isListedUnderAbout(page.menu_heading, menuHeadings) ? null : page;
});
