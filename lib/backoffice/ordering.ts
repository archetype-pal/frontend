import type { SortingState } from '@tanstack/react-table';

/** Table sorting to DRF's `ordering`; `fields` maps a column id to comma separated backend fields. */
export function toOrdering(
  sorting: SortingState,
  fields: Record<string, string>
): string | undefined {
  const parts = sorting.flatMap(({ id, desc }) =>
    (fields[id] ?? '')
      .split(',')
      .filter(Boolean)
      .map((field) => (desc ? `-${field}` : field))
  );
  return parts.length > 0 ? parts.join(',') : undefined;
}
