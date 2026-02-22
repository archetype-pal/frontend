'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { resultTypeItems, type ResultType } from '@/lib/search-types';

export type { ResultType };
export { resultTypeItems };

export function ResultTypeToggle({
  selectedType,
  onChange,
  compact,
  enabledTypes,
}: {
  selectedType: ResultType;
  onChange: (next: ResultType) => void;
  compact?: boolean;
  enabledTypes?: ResultType[];
}) {
  const items = enabledTypes
    ? resultTypeItems.filter((i) => enabledTypes.includes(i.value))
    : resultTypeItems;

  return (
    <div
      className={compact ? 'flex w-full gap-1.5 my-0' : 'flex flex-wrap gap-2 my-3'}
      role="tablist"
      aria-label="Search result type"
    >
      {items.map((item) => (
        <Button
          key={item.value}
          type="button"
          className={compact ? 'flex-1 min-w-0' : 'flex-1 min-w-[180px]'}
          variant={selectedType === item.value ? 'toggle' : 'outline'}
          size="sm"
          onClick={() => onChange(item.value)}
          role="tab"
          aria-selected={selectedType === item.value}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
