import { useCallback, useState } from 'react';
import { useStoredPreference } from '@/hooks/use-stored-preference';
import { parsePageSize } from '@/lib/pagination';

/** Rows per page for one table, remembered in this browser; `table` null keeps it for this view only. */
export function usePageSize(table: string | null, fallback: number) {
  const [local, setLocal] = useState(fallback);
  const parse = useCallback((raw: string | null) => parsePageSize(raw, fallback), [fallback]);
  const [saved, save] = useStoredPreference(
    `backoffice-page-size:${table}`,
    parse,
    String,
    fallback
  );
  return table ? ([saved, save] as const) : ([local, setLocal] as const);
}
