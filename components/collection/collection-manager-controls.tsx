'use client';

import * as React from 'react';
import { Copy, FolderOpen, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    renameActiveCollection,
    duplicateActiveCollection,
    deleteActiveCollection,
    switchCollection,
  } = useCollection();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isRenameOpen, setIsRenameOpen] = React.useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const [renameCollectionName, setRenameCollectionName] = React.useState('');
  const [duplicateCollectionName, setDuplicateCollectionName] = React.useState('');

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

  const handleRename = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = normalizeCollectionName(renameCollectionName);
    if (!name) {
      toast.error('Enter a collection name');
      return;
    }

    if (!renameActiveCollection(name)) {
      toast.error('A collection with that name already exists');
      return;
    }

    setIsRenameOpen(false);
    toast.success(`Renamed collection to ${name}`);
  };

  const handleDuplicate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = normalizeCollectionName(duplicateCollectionName);
    if (!name) {
      toast.error('Enter a collection name');
      return;
    }

    if (!duplicateActiveCollection(name)) {
      toast.error('A collection with that name already exists');
      return;
    }

    setDuplicateCollectionName('');
    setIsDuplicateOpen(false);
    toast.success(`Duplicated collection as ${name}`);
  };

  const handleDelete = () => {
    if (!deleteActiveCollection()) {
      toast.error('Keep at least one collection');
      return;
    }

    setIsDeleteOpen(false);
    toast.success(`Deleted ${activeCollection.name}`);
  };

  const openRenameDialog = () => {
    setRenameCollectionName(activeCollection.name);
    setIsRenameOpen(true);
  };

  const openDuplicateDialog = () => {
    setDuplicateCollectionName(`${activeCollection.name} copy`);
    setIsDuplicateOpen(true);
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(true)}
              disabled={!canManageCollections}
            >
              <Plus className="mr-2 h-4 w-4" />
              New collection
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!canManageCollections}
                  aria-label="Collection actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={openRenameDialog}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={openDuplicateDialog}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setIsDeleteOpen(true)}
                  disabled={collections.length <= 1}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRename}>
            <DialogHeader>
              <DialogTitle>Rename collection</DialogTitle>
              <DialogDescription>Change the name of the active collection.</DialogDescription>
            </DialogHeader>
            <div className="px-5 py-5">
              <Label htmlFor="rename-collection-name">Collection name</Label>
              <Input
                id="rename-collection-name"
                value={renameCollectionName}
                onChange={(event) => setRenameCollectionName(event.target.value)}
                maxLength={MAX_COLLECTION_NAME_LENGTH}
                className="mt-2"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Rename</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleDuplicate}>
            <DialogHeader>
              <DialogTitle>Duplicate collection</DialogTitle>
              <DialogDescription>
                Copy the active collection and its saved items into a new collection.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 py-5">
              <Label htmlFor="duplicate-collection-name">New collection name</Label>
              <Input
                id="duplicate-collection-name"
                value={duplicateCollectionName}
                onChange={(event) => setDuplicateCollectionName(event.target.value)}
                maxLength={MAX_COLLECTION_NAME_LENGTH}
                className="mt-2"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDuplicateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Duplicate</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {activeCollection.name}?</DialogTitle>
            <DialogDescription>
              This removes the collection and its saved items from this browser. It does not delete
              images or annotations from the site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-5">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
