import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { SearchPage } from '@/components/search/search-page';
import { SEARCH_RESULT_TYPES, type ResultType } from '@/lib/search-types';
import { readSiteFeatures } from '@/lib/site-features-server';
import { PageLoadingState } from '@/components/page/page-loading-state';

const VALID = new Set<string>(SEARCH_RESULT_TYPES);

export default async function SearchTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type: typeParam } = await params;
  const type = VALID.has(typeParam) ? (typeParam as ResultType) : null;

  const config = await readSiteFeatures();
  const enabledCategories = (
    Object.entries(config.searchCategories) as [ResultType, { enabled: boolean }][]
  )
    .filter(([, c]) => c.enabled)
    .map(([t]) => t);
  const firstEnabled = enabledCategories[0] ?? 'manuscripts';

  if (!type || !enabledCategories.includes(type)) {
    redirect(`/search/${firstEnabled}`);
  }
  return (
    <Suspense fallback={<PageLoadingState label="Loading search…" />}>
      <SearchPage resultType={type} />
    </Suspense>
  );
}
