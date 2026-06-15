'use client';

import * as React from 'react';
import type { ResultType } from '@/lib/search-types';
import { addSearchHistory } from '@/lib/search-history';

/** A keyword is an exact phrase when wrapped in matching single or double quotes. */
function isQuotedPhrase(value: string): boolean {
  const raw = value.trim();
  if (raw.length < 2) return false;
  return (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
}

export function useSearchKeyword(initialKeyword: string, resultType: ResultType) {
  const [draftKeyword, setDraftKeyword] = React.useState<string>(initialKeyword);
  const [submittedKeyword, setSubmittedKeyword] = React.useState<string>(initialKeyword);
  // Restore the toggle from the URL keyword: a quoted phrase persisted as
  // q="foo bar" means exact-phrase was on, so the Quote button must reflect that
  // on reload / when sharing the link instead of re-initialising to off.
  const [exactPhraseKeyword, setExactPhraseKeyword] = React.useState(() =>
    isQuotedPhrase(initialKeyword)
  );

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
