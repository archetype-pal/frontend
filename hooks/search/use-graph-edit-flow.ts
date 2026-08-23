'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/auth-context';
import {
  deleteViewerAnnotation,
  fetchGraphsByIds,
  type BackendGraph,
} from '@/services/annotations';
import { fetchAllographs, fetchHands } from '@/services/manuscripts';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';

export interface UseGraphEditFlowOpts {
  onGraphDeleted?: (id: number) => void;
}

export function useGraphEditFlow({ onGraphDeleted }: UseGraphEditFlowOpts = {}) {
  const { token } = useAuth();
  const t = useTranslations('search');

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isHydrating, setIsHydrating] = React.useState(false);
  const [editingGraphs, setEditingGraphs] = React.useState<BackendGraph[]>([]);
  const [allographs, setAllographs] = React.useState<Allograph[]>([]);
  const [hands, setHands] = React.useState<HandType[]>([]);
  const [handDisabled, setHandDisabled] = React.useState(false);
  const [handDisabledReason, setHandDisabledReason] = React.useState<string | undefined>();

  const startEdit = React.useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      setIsHydrating(true);

      try {
        // 1. Fetch full graphs
        const graphs = await fetchGraphsByIds(ids, token);
        if (graphs.length === 0) {
          toast.error(t('noGraphData', { defaultValue: 'No graph data found for selected items' }));
          return;
        }

        // 2. Fetch full allographs if not cached
        let loadedAllographs = allographs;
        if (loadedAllographs.length === 0) {
          const resp = await fetchAllographs();
          loadedAllographs = resp;
          setAllographs(loadedAllographs);
        }

        // 3. Determine unique item_parts represented directly from the hydrated graphs
        const itemPartIds = new Set<number>();
        for (const g of graphs) {
          if (g.item_part != null) {
            itemPartIds.add(g.item_part);
          }
        }

        // 4. Resolve hands and handDisabled
        if (itemPartIds.size === 1) {
          const itemPartId = Array.from(itemPartIds)[0];
          try {
            const handsResp = await fetchHands(itemPartId);
            setHands(handsResp.results);
            setHandDisabled(false);
            setHandDisabledReason(undefined);
          } catch {
            setHands([]);
            setHandDisabled(true);
            setHandDisabledReason(
              t('failedToLoadHands', {
                defaultValue: 'Failed to load hands for this manuscript.',
              })
            );
          }
        } else {
          // Multiple or unknown manuscripts: hand editing is disabled
          setHands([]);
          setHandDisabled(true);
          setHandDisabledReason(t('handDisabledTooltip'));
        }

        setEditingGraphs(graphs);
        setDialogOpen(true);
      } catch {
        toast.error(
          t('failedToLoadGraphs', {
            defaultValue: 'Failed to load selected graphs for editing',
          })
        );
      } finally {
        setIsHydrating(false);
      }
    },
    [allographs, t, token]
  );

  const deleteOne = React.useCallback(
    async (id: number) => {
      if (!token) {
        toast.error(t('notAuthenticated', { defaultValue: 'Not authenticated.' }));
        return;
      }
      if (
        typeof window !== 'undefined' &&
        !window.confirm(t('confirmDeleteGraph', { defaultValue: 'Delete this graph annotation?' }))
      ) {
        return;
      }

      try {
        await deleteViewerAnnotation(token, id);
        onGraphDeleted?.(id);
        toast.success(t('graphDeleted', { defaultValue: 'Graph deleted' }));
      } catch {
        toast.error(t('deleteFailed', { defaultValue: 'Failed to delete graph' }));
      }
    },
    [onGraphDeleted, t, token]
  );

  return {
    dialogOpen,
    setDialogOpen,
    isHydrating,
    editingGraphs,
    allographs,
    hands,
    handDisabled,
    handDisabledReason,
    startEdit,
    deleteOne,
  };
}
