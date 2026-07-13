'use client';

import * as React from 'react';
import { Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { OpenLightboxButton } from '@/components/lightbox/open-lightbox-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { CollectionItem } from '@/contexts/collection-context';

export function CollectionSelectionToolbar({
  selectedItems,
  visibleItemCount,
  allVisibleItemsSelected,
  someVisibleItemsSelected,
  onToggleVisibleItems,
  onClearSelection,
  onRemoveSelectedItems,
}: {
  selectedItems: CollectionItem[];
  visibleItemCount: number;
  allVisibleItemsSelected: boolean;
  someVisibleItemsSelected: boolean;
  onToggleVisibleItems: (checked: boolean) => void;
  onClearSelection: () => void;
  onRemoveSelectedItems: () => void;
}) {
  const [isRemoveOpen, setIsRemoveOpen] = React.useState(false);
  const t = useTranslations('collection');
  const selectedCount = selectedItems.length;

  const handleRemove = () => {
    onRemoveSelectedItems();
    setIsRemoveOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 pr-2">
          <Checkbox
            id="select-visible-collection-items"
            checked={
              allVisibleItemsSelected || (someVisibleItemsSelected ? 'indeterminate' : false)
            }
            onCheckedChange={(checked) => onToggleVisibleItems(checked === true)}
            disabled={visibleItemCount === 0}
            aria-label={t('selection.selectVisibleLabel')}
          />
          <Label htmlFor="select-visible-collection-items" className="text-xs">
            {t('selection.selectVisibleText')}
          </Label>
        </div>
        <span className="text-xs text-muted-foreground">
          {t('selection.itemsSelected', { count: selectedCount })}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {selectedCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="mr-2 h-4 w-4" />
              {t('selection.clearSelection')}
            </Button>
          )}
          <OpenLightboxButton
            items={selectedItems}
            variant="outline"
            size="sm"
            label={t('selection.openInLightbox')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsRemoveOpen(true)}
            disabled={selectedCount === 0}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('selection.removeSelected')}
          </Button>
        </div>
      </div>

      <Dialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('selection.removeDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('selection.removeDialogDesc', { count: selectedCount })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-5">
            <Button type="button" variant="outline" onClick={() => setIsRemoveOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleRemove}>
              {t('selection.removeDialogButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
