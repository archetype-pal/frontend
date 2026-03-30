'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ResultType } from '@/lib/search-types';
import type { GraphListItem, ManuscriptListItem } from '@/types/search';

type Comparable = ManuscriptListItem | GraphListItem;

function isManuscript(item: Comparable): item is ManuscriptListItem {
  return (item as ManuscriptListItem).number_of_images !== undefined;
}

export function ComparisonView({
  open,
  onOpenChange,
  items,
  resultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Comparable[];
  resultType: ResultType;
}) {
  if (items.length === 0) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Compare selected ({items.length})</DialogTitle>
          <DialogDescription>
            Side-by-side comparison for {resultType === 'graphs' ? 'graphs' : 'manuscripts'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={`${resultType}-${item.id}`}
              className="rounded-md border bg-background p-3"
            >
              <h4 className="font-medium text-sm truncate">
                {item.shelfmark || `Item ${item.id}`}
              </h4>
              <dl className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Repository</dt>
                  <dd className="text-right">{item.repository_name || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">City</dt>
                  <dd className="text-right">{item.repository_city || '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="text-right">{item.date || '—'}</dd>
                </div>
                {isManuscript(item) ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Images</dt>
                    <dd className="text-right">{item.number_of_images ?? 0}</dd>
                  </div>
                ) : (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Annotated</dt>
                    <dd className="text-right">{item.is_annotated ? 'Yes' : 'No'}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
