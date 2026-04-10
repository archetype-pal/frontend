'use client';

import * as React from 'react';
import type { FacetClickAction } from '@/types/facets';
import {
  buildActiveQueryTags,
  resolveFacetClick,
  type ActiveFacetTag,
  type QueryState,
} from '@/lib/search-query';
import type { ResultType } from '@/lib/search-types';

export function useSearchMobileFilters(opts: {
  queryState: QueryState;
  draftKeyword: string;
  resultType: ResultType;
  baseFacetURL: string;
}) {
  const { queryState, draftKeyword, resultType, baseFacetURL } = opts;

  const [mobileQueryDraft, setMobileQueryDraft] = React.useState<QueryState>(queryState);
  const [mobileKeywordDraft, setMobileKeywordDraft] = React.useState(draftKeyword);

  // Sync mobile drafts when main state changes
  React.useEffect(() => {
    setMobileQueryDraft(queryState);
    setMobileKeywordDraft(draftKeyword);
  }, [draftKeyword, queryState]);

  const mobileActiveTags = React.useMemo<ActiveFacetTag[]>(() => {
    return buildActiveQueryTags({
      submittedKeyword: mobileKeywordDraft,
      dateParams: mobileQueryDraft.dateParams,
      selectedFacets: mobileQueryDraft.selected_facets,
      searchType: resultType,
      extraParams: mobileQueryDraft.extraParams,
    });
  }, [
    mobileKeywordDraft,
    mobileQueryDraft.dateParams,
    mobileQueryDraft.selected_facets,
    mobileQueryDraft.extraParams,
    resultType,
  ]);

  const handleMobileFacetClick = React.useCallback(
    (arg: string, action?: FacetClickAction) => {
      setMobileQueryDraft((prev) => {
        const resolution = resolveFacetClick({ arg, action, queryState: prev, baseFacetURL });
        if (resolution.type === 'keyword') {
          setMobileKeywordDraft(resolution.value);
        }
        return resolution.type === 'query' ? resolution.value : prev;
      });
    },
    [baseFacetURL]
  );

  return {
    mobileQueryDraft,
    setMobileQueryDraft,
    mobileKeywordDraft,
    setMobileKeywordDraft,
    mobileActiveTags,
    handleMobileFacetClick,
  };
}
