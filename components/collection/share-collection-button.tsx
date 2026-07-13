'use client';

import * as React from 'react';
import { Copy, Link2, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getPubliclyShareableCollectionItems } from '@/lib/collection-workset';
import { createAnonymousCollectionShareUrl } from '@/lib/collection-share-url';
import type { NamedCollection } from '@/lib/collection-storage';

export function ShareCollectionButton({ collection }: { collection: NamedCollection }) {
  const t = useTranslations('collection');
  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState(collection.name);
  const [isSharing, setIsSharing] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState('');
  const shareableItems = React.useMemo(
    () => getPubliclyShareableCollectionItems(collection.items),
    [collection.items]
  );
  const excludedItemsCount = collection.items.length - shareableItems.length;

  const copyShareUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('share.toastLinkCopied'));
    } catch {
      toast.error(t('share.toastCopyFailed'), { description: url });
    }
  };

  const openDialog = () => {
    setTitle(collection.name);
    setShareUrl('');
    setIsOpen(true);
  };

  const handleShare = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || shareableItems.length === 0) return;

    setIsSharing(true);
    try {
      const shareableCollection = {
        ...collection,
        name: trimmedTitle,
        items: shareableItems,
      };
      const url = createAnonymousCollectionShareUrl(shareableCollection, window.location.origin);

      setShareUrl(url);
      await copyShareUrl(url);
    } catch (error) {
      toast.error(t('share.toastCreateFailed'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={openDialog}
        disabled={collection.items.length === 0}
      >
        <Share2 className="mr-2 h-4 w-4" />
        {t('share.button')}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('share.dialogTitle', { name: collection.name })}</DialogTitle>
            <DialogDescription>{t('share.dialogDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            {shareUrl ? (
              <div className="space-y-2">
                <Label htmlFor="collection-share-url">{t('share.shareableLinkLabel')}</Label>
                <div className="flex gap-2">
                  <Input id="collection-share-url" value={shareUrl} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyShareUrl(shareUrl)}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">{t('share.copyLinkSr')}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="collection-share-title">{t('share.sharedTitleLabel')}</Label>
                  <Input
                    id="collection-share-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={200}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('share.itemsIncluded', { count: shareableItems.length })}
                </p>
                {excludedItemsCount > 0 ? (
                  <p className="text-xs text-amber-700">
                    {t('share.editorialExcluded', { count: excludedItemsCount })}
                  </p>
                ) : null}
                {shareableItems.length === 0 ? (
                  <p className="text-xs text-destructive">{t('share.noShareableItems')}</p>
                ) : null}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {!shareUrl ? (
              <Button
                type="button"
                onClick={handleShare}
                disabled={isSharing || !title.trim() || shareableItems.length === 0}
              >
                <Link2 className="mr-2 h-4 w-4" />
                {isSharing ? t('share.creatingLink') : t('share.createPublicLink')}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
