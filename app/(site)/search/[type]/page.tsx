import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SearchPage } from '@/components/search/search-page';
import { SEARCH_RESULT_TYPES, type ResultType } from '@/lib/search-types';
import { readSiteFeatures } from '@/lib/site-features-server';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-token-cookie';
import { PageLoadingState } from '@/components/page/page-loading-state';

const VALID = new Set<string>(SEARCH_RESULT_TYPES);

export default async function SearchTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type: typeParam } = await params;
  const type = VALID.has(typeParam) ? (typeParam as ResultType) : null;
  const cookieStore = await cookies();
  const isResearcher = Boolean(cookieStore.get(AUTH_TOKEN_COOKIE)?.value);

  if (!isResearcher) {
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
  } else if (!type) {
    redirect(`/search/manuscripts`);
  }
  return (
    <Suspense fallback={<PageLoadingState label="Loading search…" />}>
      <SearchPage resultType={type} />
    </Suspense>
  );
}
