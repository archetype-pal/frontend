'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type MobileFilterSheetProps = {
  activeFilterCount: number;
  children: React.ReactNode;
  onApply: () => void;
  onClearAll: () => void;
};

export function MobileFilterSheet({
  activeFilterCount,
  children,
  onApply,
  onClearAll,
}: MobileFilterSheetProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        id="search-filters-mobile-trigger"
        type="button"
        variant="outline"
        size="sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontal className="h-4 w-4 mr-1" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
            {activeFilterCount}
          </span>
        )}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-auto bottom-0 left-0 right-0 translate-x-0 translate-y-0 max-w-none rounded-b-none rounded-t-xl p-0 h-[85vh]">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Filters ({activeFilterCount})</DialogTitle>
            <DialogDescription>Adjust filters, then apply changes.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-3">{children}</div>
          <div className="border-t p-3 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onApply();
                setOpen(false);
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
