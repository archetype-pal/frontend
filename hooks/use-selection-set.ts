'use client';

import * as React from 'react';

// ---------------------------------------------------------------------------
// Selection-set hook
// ---------------------------------------------------------------------------
//
// Encapsulates Set<id> mutators for bulk selection workflows across galleries
// and search result views. Returns stable methods plus the live Set so callers can
// query membership without closing over individual IDs.

export interface SelectionSet<T> {
  selected: Set<T>;
  toggle: (id: T) => void;
  remove: (id: T) => void;
  addMany: (ids: Iterable<T>) => void;
  removeMany: (ids: Iterable<T>) => void;
  clear: () => void;
}

export function useSelectionSet<T>(): SelectionSet<T> {
  const [selected, setSelected] = React.useState<Set<T>>(() => new Set());

  return React.useMemo<SelectionSet<T>>(
    () => ({
      selected,
      toggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      remove: (id) =>
        setSelected((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
      addMany: (ids) =>
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.add(id);
          return next;
        }),
      removeMany: (ids) =>
        setSelected((prev) => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        }),
      clear: () => setSelected(new Set()),
    }),
    [selected]
  );
}
