import { redirect } from 'next/navigation';
import { getDefaultSearchCategory } from '@/lib/site-features';
import { readSiteFeatures } from '@/lib/site-features-server';
import { searchHref, type SearchParamsLike } from '@/lib/search-routing';

export default async function SearchIndexPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsLike>;
}) {
  const [config, resolvedSearchParams] = await Promise.all([readSiteFeatures(), searchParams]);
  const firstEnabled = getDefaultSearchCategory(config);

  if (!firstEnabled) {
    redirect('/not-found');
  }

  redirect(searchHref(firstEnabled, resolvedSearchParams));
}
