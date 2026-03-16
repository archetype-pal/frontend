'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

type FacetPanelContainerProps = {
  id: string;
  title: string;
  total?: number;
  defaultExpanded?: boolean;
  controls?: React.ReactNode;
  children: React.ReactNode;
};

export function FacetPanelContainer({
  id,
  title,
  total,
  defaultExpanded = true,
  controls,
  children,
}: FacetPanelContainerProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border bg-white rounded shadow-sm" id={`panel-${id}`}>
      <div className="border-b px-4 py-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold">
          {title}
          {total !== undefined && <span className="ml-1 text-muted-foreground">({total})</span>}
        </h4>
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {controls}
      {isExpanded && children}
    </div>
  );
}
