'use client';

import * as React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { useCollection } from '@/contexts/collection-context';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAX_COLLECTION_NAME_LENGTH, normalizeCollectionName } from '@/lib/collection-storage';

export function CollectionManagerControls() {
  const {
    collections,
    activeCollection,
    canManageCollections,
    createCollection,
    switchCollection,
  } = useCollection();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');

  const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = normalizeCollectionName(newCollectionName);
    if (!name) {
      toast.error('Enter a collection name');
      return;
    }

    if (!createCollection(name)) {
      toast.error('A collection with that name already exists');
      return;
    }

    setNewCollectionName('');
    setIsCreateOpen(false);
    toast.success(`Created ${name}`);
  };

  return (
    <>
      <div className="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <Label
              htmlFor="active-collection"
              className="mb-1.5 block text-xs text-muted-foreground"
            >
              Active collection
            </Label>
            <Select
              value={activeCollection.id}
              onValueChange={switchCollection}
              disabled={!canManageCollections}
            >
              <SelectTrigger id="active-collection" className="w-full sm:max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name} ({collection.items.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateOpen(true)}
            disabled={!canManageCollections}
          >
            <Plus className="mr-2 h-4 w-4" />
            New collection
          </Button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderOpen className="h-3.5 w-3.5" />
          New starred items are saved to {activeCollection.name}.
        </p>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Create collection</DialogTitle>
              <DialogDescription>
                New starred items will be saved to this collection after it is created.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 py-5">
              <Label htmlFor="new-collection-name">Collection name</Label>
              <Input
                id="new-collection-name"
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                maxLength={MAX_COLLECTION_NAME_LENGTH}
                className="mt-2"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
