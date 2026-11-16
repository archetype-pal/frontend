'use client';

import { useMemo } from 'react';
import { useModelLabels } from '@/contexts/model-labels-context';
import { HAND_DATE_NAME, type DateNames } from '@/lib/search-types';

export function useDateNames(): DateNames {
  const { getLabel } = useModelLabels();
  const manuscript = getLabel('fieldManuscriptDate');
  return useMemo(() => ({ manuscript, hand: HAND_DATE_NAME }), [manuscript]);
}
