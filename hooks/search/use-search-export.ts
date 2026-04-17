'use client';

import * as React from 'react';
import { toast } from 'sonner';
import type { ResultType } from '@/lib/search-types';
import { SEARCH_RESULT_CONFIG } from '@/lib/search-types';
import { resolveResultTypeLabel } from '@/lib/search-label-helpers';
import { buildQueryString, type QueryState } from '@/lib/search-query';
import { API_BASE_URL } from '@/lib/api-fetch';
import { buildFormattedCsv, buildFormattedJson } from '@/lib/search-export';
import type { ModelLabelKey } from '@/lib/model-labels';

export function useSearchExport(opts: {
  queryState: QueryState;
  resultType: ResultType;
  submittedKeyword: string;
  getLabel: (key: ModelLabelKey) => string;
  visibleColumns?: string[];
}) {
  const { queryState, resultType, submittedKeyword, getLabel, visibleColumns } = opts;

  const [exportBusy, setExportBusy] = React.useState(false);
  const [shareFeedback, setShareFeedback] = React.useState<'idle' | 'copied' | 'error'>('idle');

  // Auto-reset share feedback
  React.useEffect(() => {
    if (shareFeedback === 'idle') return;
    const timer = window.setTimeout(() => setShareFeedback('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  const handleExport = React.useCallback(
    async (format: 'csv' | 'json' | 'bibtex', scope: 'page' | 'all') => {
      setExportBusy(true);
      try {
        const params = new URLSearchParams(buildQueryString(queryState));
        if (submittedKeyword) params.set('q', submittedKeyword);
        params.set('export_format', format);
        params.set('scope', scope);
        const endpoint = `${API_BASE_URL}/api/v1/search/${SEARCH_RESULT_CONFIG[resultType].apiPath}/export/?${params.toString()}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Export failed: ${res.status}`);
        const payload = (await res.json()) as { content?: string; results?: unknown[] };
        const content =
          payload.content ??
          (format === 'json' ? JSON.stringify(payload.results ?? [], null, 2) : '');
        const blob = new Blob([content], {
          type: format === 'json' ? 'application/json' : 'text/plain',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${resultType}-${scope}.${format === 'bibtex' ? 'bib' : format}`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success(
          `Exported ${resolveResultTypeLabel(resultType, getLabel)} as ${format.toUpperCase()}`
        );
      } catch {
        toast.error('Export failed. Try reducing results or choosing another format.');
      } finally {
        setExportBusy(false);
      }
    },
    [queryState, resultType, submittedKeyword, getLabel]
  );

  const handleFormattedExport = React.useCallback(
    async (format: 'csv' | 'json', scope: 'page' | 'all') => {
      if (!visibleColumns?.length) return;
      setExportBusy(true);
      try {
        const params = new URLSearchParams(buildQueryString(queryState));
        if (submittedKeyword) params.set('q', submittedKeyword);
        params.set('format', 'json');
        params.set('scope', scope);
        const endpoint = `${API_BASE_URL}/api/v1/search/${SEARCH_RESULT_CONFIG[resultType].apiPath}/export/?${params.toString()}`;
        const res = await fetch(endpoint, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Export failed: ${res.status}`);
        const payload = (await res.json()) as { results?: Record<string, unknown>[] };
        const rows = payload.results ?? [];
        const content =
          format === 'csv'
            ? buildFormattedCsv(resultType, rows, visibleColumns)
            : buildFormattedJson(resultType, rows, visibleColumns);
        const blob = new Blob([content], {
          type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${resultType}-${scope}-formatted.${format}`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success(
          `Exported ${resolveResultTypeLabel(resultType, getLabel)} as formatted ${format.toUpperCase()}`
        );
      } catch {
        toast.error('Export failed. Try reducing results or choosing another format.');
      } finally {
        setExportBusy(false);
      }
    },
    [queryState, resultType, submittedKeyword, getLabel, visibleColumns]
  );

  const handleShareSearch = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareFeedback('copied');
    } catch {
      setShareFeedback('error');
    }
  }, []);

  return {
    exportBusy,
    shareFeedback,
    handleExport,
    handleFormattedExport,
    handleShareSearch,
  };
}
