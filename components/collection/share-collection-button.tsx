'use client';

import * as React from 'react';
import Link from 'next/link';
import { Copy, Link2, Share2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/auth-context';
import {
  buildCollectionWorksetPayload,
  getPubliclyShareableCollectionItems,
} from '@/lib/collection-workset';
import { env } from '@/lib/env';
import { createWorkset } from '@/services/worksets';
import type { NamedCollection } from '@/lib/collection-storage';

async function copyShareUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Shareable link copied to clipboard');
  } catch {
    toast.error('Could not copy link', { description: url });
  }
}

export function ShareCollectionButton({ collection }: { collection: NamedCollection }) {
  const { token, isReady } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const [title, setTitle] = React.useState(collection.name);
  const [isSharing, setIsSharing] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState('');
  const shareableItems = React.useMemo(
    () => getPubliclyShareableCollectionItems(collection.items),
    [collection.items]
  );
  const excludedItemsCount = collection.items.length - shareableItems.length;

  const openDialog = () => {
    setTitle(collection.name);
    setShareUrl('');
    setIsOpen(true);
  };

  const handleShare = async () => {
    if (!token || !title.trim() || shareableItems.length === 0) return;

    setIsSharing(true);
    try {
      const payload = await buildCollectionWorksetPayload(collection);
      const workset = await createWorkset(token, {
        title: title.trim(),
        description: `Shared collection snapshot: ${collection.name}`,
        visibility: 'Public',
        payload,
      });
      const url = `${env.siteUrl}/collection?share=${encodeURIComponent(workset.public_id)}`;
      setShareUrl(url);
      await copyShareUrl(url);
    } catch (error) {
      toast.error('Failed to create shareable link', {
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
        Share
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share {collection.name}</DialogTitle>
            <DialogDescription>
              Create a public, read-only snapshot. Later changes to your local collection will not
              change the shared link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-5 py-5">
            {!isReady ? (
              <p className="text-sm text-muted-foreground">Checking your sign-in status...</p>
            ) : !token ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Collections remain available without an account, but creating a public share link
                  requires signing in.
                </p>
                <Button asChild>
                  <Link href="/login">Sign in to share</Link>
                </Button>
              </div>
            ) : shareUrl ? (
              <div className="space-y-2">
                <Label htmlFor="collection-share-url">Shareable link</Label>
                <div className="flex gap-2">
                  <Input id="collection-share-url" value={shareUrl} readOnly />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyShareUrl(shareUrl)}
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy shareable link</span>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="collection-share-title">Shared collection title</Label>
                  <Input
                    id="collection-share-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={200}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {shareableItems.length} {shareableItems.length === 1 ? 'item' : 'items'} will be
                  included.
                </p>
                {excludedItemsCount > 0 ? (
                  <p className="text-xs text-amber-700">
                    {excludedItemsCount} editorial{' '}
                    {excludedItemsCount === 1 ? 'annotation is' : 'annotations are'} excluded from
                    the public link.
                  </p>
                ) : null}
                {shareableItems.length === 0 ? (
                  <p className="text-xs text-destructive">
                    This collection has no items that can be shared publicly.
                  </p>
                ) : null}
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {token && !shareUrl ? (
              <Button
                type="button"
                onClick={handleShare}
                disabled={isSharing || !title.trim() || shareableItems.length === 0}
              >
                <Link2 className="mr-2 h-4 w-4" />
                {isSharing ? 'Creating link...' : 'Create public link'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
