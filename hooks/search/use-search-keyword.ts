'use client';

import * as React from 'react';
import type { ResultType } from '@/lib/search-types';
import { addSearchHistory } from '@/lib/search-history';

export function useSearchKeyword(initialKeyword: string, resultType: ResultType) {
  const [draftKeyword, setDraftKeyword] = React.useState<string>(initialKeyword);
  const [submittedKeyword, setSubmittedKeyword] = React.useState<string>(initialKeyword);
  const [exactPhraseKeyword, setExactPhraseKeyword] = React.useState(false);

  const handleClearKeyword = React.useCallback(() => {
    setDraftKeyword('');
    setSubmittedKeyword('');
  }, []);

  // Record submitted keyword to search history
  React.useEffect(() => {
    const normalized = submittedKeyword.trim();
    if (!normalized) return;
    addSearchHistory(normalized, resultType);
  }, [submittedKeyword, resultType]);

  return {
    draftKeyword,
    setDraftKeyword,
    submittedKeyword,
    setSubmittedKeyword,
    exactPhraseKeyword,
    setExactPhraseKeyword,
    handleClearKeyword,
  };
}
