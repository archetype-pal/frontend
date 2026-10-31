'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  BackofficeErrorState,
  BackofficeLoadingState,
} from '@/components/backoffice/common/query-state';
import { formatApiError } from '@/lib/backoffice/format-api-error';

export interface OrderedItem {
  id: number;
  ordering: number;
}

export interface OrderedItemCardProps<T extends OrderedItem> {
  item: T;
  isSelected: boolean;
  onSelect: (item: T) => void;
  onDelete: (item: T) => void;
}

export interface OrderedItemEditorProps<T extends OrderedItem, P> {
  /** `null` while creating. */
  item: T | null;
  saving: boolean;
  deleting: boolean;
  onSave: (data: P) => void;
  onDelete: () => void;
  onCancel: () => void;
}

interface OrderedItemsPageProps<T extends OrderedItem, P> {
  /** The `backoffice.*` message namespace with the page's copy (`carousel`, `partners`). */
  messages: string;
  icon: LucideIcon;
  queryKey: QueryKey;
  list: () => Promise<T[]>;
  /** `ordering` places the new item last. */
  create: (data: P, ordering: number) => Promise<T>;
  update: (id: number, data: P) => Promise<T>;
  updateOrdering: (id: number, ordering: number) => Promise<unknown>;
  remove: (id: number) => Promise<unknown>;
  deleteTitle: (item: T) => string;
  renderCard: (props: OrderedItemCardProps<T>) => ReactNode;
  renderEditor: (props: OrderedItemEditorProps<T, P>) => ReactNode;
  renderPreview: (items: T[]) => ReactNode;
}

type PanelMode<T> = { kind: 'preview' } | { kind: 'edit'; item: T } | { kind: 'create' };

const byOrdering = <T extends OrderedItem>(items: readonly T[]): T[] =>
  [...items].sort((a, b) => a.ordering - b.ordering);

/**
 * A backoffice page for a short, hand-ordered list of items: a sortable card
 * list on the left, a live preview or the editor on the right. The caller
 * supplies the service calls and the three item-specific components.
 */
export function OrderedItemsPage<T extends OrderedItem, P>({
  messages,
  icon: Icon,
  queryKey,
  list,
  create,
  update,
  updateOrdering,
  remove,
  deleteTitle,
  renderCard,
  renderEditor,
  renderPreview,
}: OrderedItemsPageProps<T, P>) {
  const t = useTranslations(`backoffice.${messages}`);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [panel, setPanel] = useState<PanelMode<T>>({ kind: 'preview' });
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: list,
    enabled: isAuthenticated,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey]
  );

  const sorted = byOrdering(items ?? []);

  // Keep the editor panel in sync when data refreshes
  useEffect(() => {
    if (panel.kind === 'edit' && items) {
      const fresh = items.find((i) => i.id === panel.item.id);
      if (!fresh) {
        setPanel({ kind: 'preview' }); // oxlint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [items, panel]);

  // ── Mutations ──────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (data: P) => create(data, (items?.length ?? 0) + 1),
    onSuccess: () => {
      toast.success(t('toastCreated'));
      invalidate();
      setPanel({ kind: 'preview' });
    },
    onError: (err) => {
      toast.error(t('toastFailedCreate'), { description: formatApiError(err) });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: P }) => update(id, data),
    onSuccess: (updated) => {
      toast.success(t('toastUpdated'));
      invalidate();
      setPanel({ kind: 'edit', item: updated });
    },
    onError: (err) => {
      toast.error(t('toastFailedUpdate'), { description: formatApiError(err) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      toast.success(t('toastDeleted'));
      invalidate();
      setPanel({ kind: 'preview' });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t('toastFailedDelete'), { description: formatApiError(err) });
    },
  });

  // ── Drag-and-drop reordering ───────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !items) return;

      const currentSorted = byOrdering(items);
      const oldIndex = currentSorted.findIndex((i) => i.id === active.id);
      const newIndex = currentSorted.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...currentSorted];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updated = reordered.map((item, i) => ({ ...item, ordering: i + 1 }));

      // Optimistic cache update
      queryClient.setQueryData(queryKey, updated);

      // `allSettled` so a single failed PATCH doesn't make the whole
      // reorder appear to fail when most items repositioned correctly.
      // Always invalidate — successes still need to be reflected, and the
      // optimistic state must reconcile with the server's truth.
      const updates = updated.filter(
        (item, i) =>
          currentSorted[i]?.id !== item.id || currentSorted[i]?.ordering !== item.ordering
      );
      Promise.allSettled(updates.map((item) => updateOrdering(item.id, item.ordering))).then(
        (results) => {
          invalidate();
          const failed = results.filter((r) => r.status === 'rejected').length;
          if (failed > 0) {
            toast.error(
              failed === results.length
                ? t('toastFailedReorder')
                : t('toastPartialFailure', { failed, total: results.length })
            );
          }
        }
      );
    },
    [items, queryClient, queryKey, updateOrdering, invalidate, t]
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panel.kind !== 'preview') {
        setPanel({ kind: 'preview' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [panel.kind]);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleSelect = useCallback((item: T) => {
    setPanel((prev) =>
      prev.kind === 'edit' && prev.item.id === item.id
        ? { kind: 'preview' }
        : { kind: 'edit', item }
    );
  }, []);

  const handleDelete = useCallback((item: T) => {
    setDeleteTarget(item);
  }, []);

  const handleEditorSave = useCallback(
    (data: P) => {
      if (panel.kind === 'create') {
        createMut.mutate(data);
      } else if (panel.kind === 'edit') {
        updateMut.mutate({ id: panel.item.id, data });
      }
    },
    [panel, createMut, updateMut]
  );

  const handleEditorDelete = useCallback(() => {
    if (panel.kind === 'edit') {
      deleteMut.mutate(panel.item.id);
    }
  }, [panel, deleteMut]);

  const closePanel = () => setPanel({ kind: 'preview' });

  // ── Loading / error states ─────────────────────────────────────────

  if (isLoading) {
    return <BackofficeLoadingState />;
  }

  if (isError) {
    return <BackofficeErrorState message={t('failedLoad')} onRetry={() => refetch()} />;
  }

  // ── Empty state ────────────────────────────────────────────────────

  if (sorted.length === 0 && panel.kind !== 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-base font-medium">{t('noItems')}</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">{t('emptyDesc')}</p>
          <Button size="sm" className="mt-4" onClick={() => setPanel({ kind: 'create' })}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('addFirstButton')}
          </Button>
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────

  const selectedId = panel.kind === 'edit' ? panel.item.id : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('subtitle', { count: sorted.length })}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setPanel({ kind: 'create' })}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t('addButton')}
        </Button>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: sortable card list */}
        <div className="lg:col-span-2 space-y-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sorted.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {sorted.map((item) =>
                renderCard({
                  item,
                  isSelected: item.id === selectedId,
                  onSelect: handleSelect,
                  onDelete: handleDelete,
                })
              )}
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: context-sensitive panel */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border bg-card p-5">
            {panel.kind === 'preview' && renderPreview(sorted)}
            {panel.kind === 'edit' &&
              renderEditor({
                item: panel.item,
                saving: updateMut.isPending,
                deleting: deleteMut.isPending,
                onSave: handleEditorSave,
                onDelete: handleEditorDelete,
                onCancel: closePanel,
              })}
            {panel.kind === 'create' &&
              renderEditor({
                item: null,
                saving: createMut.isPending,
                deleting: false,
                onSave: handleEditorSave,
                onDelete: () => {},
                onCancel: closePanel,
              })}
          </div>
        </div>
      </div>

      {/* Standalone delete confirmation (triggered from card delete button) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? deleteTitle(deleteTarget) : ''}
        description={t('deleteDesc')}
        confirmLabel={t('deleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}
