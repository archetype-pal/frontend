'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Handshake, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortablePartnerCard } from '@/components/backoffice/partners/sortable-partner-card';
import { PartnerEditorPanel } from '@/components/backoffice/partners/partner-editor-panel';
import { PartnerPreview } from '@/components/backoffice/partners/partner-preview';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import {
  BackofficeErrorState,
  BackofficeLoadingState,
} from '@/components/backoffice/common/query-state';
import {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerJson,
  deletePartner,
} from '@/services/backoffice/partners';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import type { PartnerItem } from '@/types/backoffice';

type PanelMode = { kind: 'preview' } | { kind: 'edit'; item: PartnerItem } | { kind: 'create' };

export default function PartnersPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [panel, setPanel] = useState<PanelMode>({ kind: 'preview' });
  const [deleteTarget, setDeleteTarget] = useState<PartnerItem | null>(null);

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: backofficeKeys.partners.all(),
    queryFn: () => getPartners(token!),
    enabled: !!token,
  });

  const invalidate = useCallback(
    () =>
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.partners.all(),
      }),
    [queryClient]
  );

  const sorted = [...(items ?? [])].sort((a, b) => a.ordering - b.ordering);

  // Keep the editor panel in sync when data refreshes
  useEffect(() => {
    if (panel.kind === 'edit' && items) {
      const fresh = items.find((i) => i.id === panel.item.id);
      if (!fresh) {
        setPanel({ kind: 'preview' }); // eslint-disable-line react-hooks/set-state-in-effect
      }
    }
  }, [items, panel]);

  // ── Mutations ──────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (data: { name: string; url: string; logo?: File | string }) =>
      createPartner(token!, {
        name: data.name,
        url: data.url,
        ordering: (items?.length ?? 0) + 1,
        logo: data.logo ?? null,
      }),
    onSuccess: () => {
      toast.success(t('partners.toastCreated'));
      invalidate();
      setPanel({ kind: 'preview' });
    },
    onError: (err) => {
      toast.error(t('partners.toastFailedCreate'), {
        description: formatApiError(err),
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; url: string; logo?: File | string };
    }) => updatePartner(token!, id, data),
    onSuccess: (updated) => {
      toast.success(t('partners.toastUpdated'));
      invalidate();
      setPanel({ kind: 'edit', item: updated });
    },
    onError: (err) => {
      toast.error(t('partners.toastFailedUpdate'), {
        description: formatApiError(err),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deletePartner(token!, id),
    onSuccess: () => {
      toast.success(t('partners.toastDeleted'));
      invalidate();
      setPanel({ kind: 'preview' });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(t('partners.toastFailedDelete'), {
        description: formatApiError(err),
      });
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

      const currentSorted = [...items].sort((a, b) => a.ordering - b.ordering);
      const oldIndex = currentSorted.findIndex((i) => i.id === active.id);
      const newIndex = currentSorted.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...currentSorted];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      const updated = reordered.map((item, i) => ({
        ...item,
        ordering: i + 1,
      }));

      // Optimistic cache update
      queryClient.setQueryData(backofficeKeys.partners.all(), updated);

      // `allSettled` so a single failed PATCH doesn't make the whole
      // reorder appear to fail when most items repositioned correctly.
      // Always invalidate — successes still need to be reflected, and the
      // optimistic state must reconcile with the server's truth.
      const updates = updated.filter(
        (item, i) =>
          currentSorted[i]?.id !== item.id || currentSorted[i]?.ordering !== item.ordering
      );
      Promise.allSettled(
        updates.map((item) =>
          updatePartnerJson(token!, item.id, {
            ordering: item.ordering,
          })
        )
      ).then((results) => {
        invalidate();
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed > 0) {
          toast.error(
            failed === results.length
              ? t('partners.toastFailedReorder')
              : t('partners.toastPartialFailure', { failed, total: results.length })
          );
        }
      });
    },
    [items, token, queryClient, invalidate, t]
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

  const handleSelect = useCallback((item: PartnerItem) => {
    setPanel((prev) =>
      prev.kind === 'edit' && prev.item.id === item.id
        ? { kind: 'preview' }
        : { kind: 'edit', item }
    );
  }, []);

  const handleDelete = useCallback((item: PartnerItem) => {
    setDeleteTarget(item);
  }, []);

  const handleEditorSave = useCallback(
    (data: { name: string; url: string; logo?: File | string }) => {
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

  // ── Loading / error states ─────────────────────────────────────────

  if (isLoading) {
    return <BackofficeLoadingState />;
  }

  if (isError) {
    return <BackofficeErrorState message={t('partners.failedLoad')} onRetry={() => refetch()} />;
  }

  // ── Empty state ────────────────────────────────────────────────────

  if (sorted.length === 0 && panel.kind !== 'create') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Handshake className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">{t('partners.title')}</h1>
          </div>
        </div>
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <Handshake className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-base font-medium">{t('partners.noItems')}</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">{t('partners.emptyDesc')}</p>
          <Button size="sm" className="mt-4" onClick={() => setPanel({ kind: 'create' })}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('partners.addFirstButton')}
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
          <Handshake className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('partners.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('partners.subtitle', { count: sorted.length })}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setPanel({ kind: 'create' })}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t('partners.addButton')}
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
              {sorted.map((item) => (
                <SortablePartnerCard
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: context-sensitive panel */}
        <div className="lg:col-span-3">
          <div className="rounded-lg border bg-card p-5">
            {panel.kind === 'preview' && <PartnerPreview items={sorted} />}
            {panel.kind === 'edit' && (
              <PartnerEditorPanel
                item={panel.item}
                saving={updateMut.isPending}
                deleting={deleteMut.isPending}
                onSave={handleEditorSave}
                onDelete={handleEditorDelete}
                onCancel={() => setPanel({ kind: 'preview' })}
              />
            )}
            {panel.kind === 'create' && (
              <PartnerEditorPanel
                item={null}
                saving={createMut.isPending}
                deleting={false}
                onSave={handleEditorSave}
                onDelete={() => {}}
                onCancel={() => setPanel({ kind: 'preview' })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Standalone delete confirmation (triggered from card delete button) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('partners.deleteTitle', { name: deleteTarget?.name ?? '' })}
        description={t('partners.deleteDesc')}
        confirmLabel={t('partners.deleteConfirm')}
        loading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
}
