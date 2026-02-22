'use client';

import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineEdit } from '@/components/backoffice/common/inline-edit';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import type { useEntityCrud } from '@/hooks/backoffice/use-entity-crud';

type EntityBase = { id: number; name: string };

interface NamedEntityManagerProps<T extends EntityBase> {
  /** Items to display. */
  items: T[];
  /** The crud hook return value (from useEntityCrud). */
  crud: ReturnType<typeof useEntityCrud<T>>;
  /** Placeholder for the "new item" input. */
  placeholder: string;
  /** Text shown when the list is empty. */
  emptyMessage: string;
  /** Confirmation description shown in the delete dialog. */
  deleteDescription: string;
  /**
   * Optional custom renderer for each item row.
   * Receives the default row content (inline-edit + delete button) as `children`.
   * Return `undefined` to use the default row rendering.
   */
  renderItem?: (item: T, defaultRow: ReactNode) => ReactNode;
}

/**
 * Shared UI shell for managing a named-entity list (create, rename, delete).
 * Used by ComponentManager, FeatureManager, and PositionManager.
 */
export function NamedEntityManager<T extends EntityBase>({
  items,
  crud,
  placeholder,
  emptyMessage,
  deleteDescription,
  renderItem,
}: NamedEntityManagerProps<T>) {
  const {
    newName,
    setNewName,
    deleteTarget,
    setDeleteTarget,
    createMut,
    renameMut,
    deleteMut,
    handleCreate,
  } = crud;

  const defaultRow = (item: T) => (
    <div
      key={item.id}
      className="group flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50"
    >
      <InlineEdit
        value={item.name}
        onSave={(name) => renameMut.mutate({ id: item.id, name })}
        className="flex-1 min-w-0"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteTarget(item)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <form onSubmit={handleCreate} className="flex items-center gap-1 p-3 pb-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (newName.trim()) createMut.mutate(newName.trim());
            }
          }}
        />
        <Button
          type="submit"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!newName.trim() || createMut.isPending}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {items.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">{emptyMessage}</p>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => {
              const row = defaultRow(item);
              return renderItem ? renderItem(item, row) : row;
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description={deleteDescription}
        confirmLabel="Delete"
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}
