'use client';

import * as React from 'react';

import { useCompareStore } from '@/stores/compare-store';

/**
 * Loads the persisted Compare selection from sessionStorage after mount. The
 * store is created with `skipHydration` so the server-rendered markup (empty
 * selection) and the client's first render agree; see stores/compare-store.ts.
 */
export function CompareStoreHydrator() {
  React.useEffect(() => {
    void useCompareStore.persist.rehydrate();
  }, []);

  return null;
}
