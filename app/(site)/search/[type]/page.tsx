import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SearchPage } from '@/components/search/search-page';
import { SEARCH_RESULT_TYPES, type ResultType } from '@/lib/search-types';
import { readSiteFeatures } from '@/lib/site-features-server';
import { getDefaultSearchCategory, getEnabledSearchCategories } from '@/lib/site-features';
import { searchHref, type SearchParamsLike } from '@/lib/search-routing';
import { PageLoadingState } from '@/components/page/page-loading-state';

const VALID = new Set<string>(SEARCH_RESULT_TYPES);

export default async function SearchTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams?: Promise<SearchParamsLike>;
}) {
  const { type: typeParam } = await params;
  const type = VALID.has(typeParam) ? (typeParam as ResultType) : null;
  const resolvedSearchParams = await searchParams;
  const config = await readSiteFeatures();
  const enabledCategories = getEnabledSearchCategories(config);
  const firstEnabled = getDefaultSearchCategory(config);

  if (!firstEnabled) {
    redirect('/not-found');
  }

  if (!type || !enabledCategories.includes(type)) {
    redirect(searchHref(firstEnabled, resolvedSearchParams));
  }

  return (
    <Suspense fallback={<PageLoadingState label="Loading search…" />}>
      <SearchPage resultType={type} />
    </Suspense>
  );
}
