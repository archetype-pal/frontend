'use client';

import { useEffect } from 'react';
import { EntityErrorState } from '@/components/page/entity-error-state';
import { useSiteFeatures } from '@/contexts/site-features-context';
import { searchHref } from '@/lib/search-routing';

export function EntitySegmentError({
  scope,
  error,
  reset,
  fallbackMessage,
  backLabel,
}: {
  scope: string;
  error: Error & { digest?: string };
  reset: () => void;
  fallbackMessage: string;
  backLabel: string;
}) {
  const { enabledCategories, isSectionEnabled } = useSiteFeatures();
  const defaultSearchType = enabledCategories[0] ?? null;
  const backHref =
    isSectionEnabled('search') && defaultSearchType ? searchHref(defaultSearchType) : '/';

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${scope}]`, error.message);
    }
  }, [scope, error]);

  return (
    <EntityErrorState
      message={error.message || fallbackMessage}
      reset={reset}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}
