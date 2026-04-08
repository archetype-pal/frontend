'use client';

import * as React from 'react';

import type { A9sWithMeta, PopupRecord } from '@/types/annotation-viewer';
import { isDbId } from '@/lib/annotation-popup-utils';
import {
  DEFAULT_SINGLE_POPUP_POSITION,
  type PopupPosition,
} from '@/lib/manuscript-viewer-popup-utils';

type OpenPopupOptions = {
  mode?: 'replace' | 'append';
  overrides?: Partial<Omit<PopupRecord, 'id' | 'annotation'>>;
};

type UseManuscriptPopupsArgs = {
  allowMultipleBoxes: boolean;
};

export function useManuscriptPopups({ allowMultipleBoxes }: UseManuscriptPopupsArgs) {
  const [openPopups, setOpenPopups] = React.useState<PopupRecord[]>([]);
  const [activePopupId, setActivePopupId] = React.useState<string | null>(null);
  const [singlePopupPosition, setSinglePopupPosition] = React.useState<PopupPosition>(
    DEFAULT_SINGLE_POPUP_POSITION
  );

  const activePopupRecord = React.useMemo(() => {
    if (!openPopups.length) return null;
    if (!activePopupId) return openPopups[0] ?? null;
    return openPopups.find((popup) => popup.id === activePopupId) ?? openPopups[0] ?? null;
  }, [openPopups, activePopupId]);

  const visiblePopupRecords = React.useMemo(() => {
    if (!openPopups.length) return [];
    if (!activePopupId) return openPopups;

    const active = openPopups.find((popup) => popup.id === activePopupId);
    if (!active) return openPopups;

    return [...openPopups.filter((popup) => popup.id !== activePopupId), active];
  }, [openPopups, activePopupId]);

  const buildPopupRecordFromAnnotation = React.useCallback(
    (
      annotation: A9sWithMeta,
      overrides?: Partial<Omit<PopupRecord, 'id' | 'annotation'>>
    ): PopupRecord => {
      const isDraft = !isDbId(annotation.id);

      const defaultDraftAllographText = isDraft
        ? (annotation.body?.find((b) => b.purpose === 'commenting')?.value ?? '')
        : '';

      const defaultDraftNoteText = isDraft
        ? (annotation.body?.find((b) => b.purpose !== 'commenting')?.value ?? '')
        : '';

      return {
        id: annotation.id,
        annotation,
        popupTab: overrides?.popupTab ?? 'components',
        shareUrl: overrides?.shareUrl ?? '',
        isShareUrlVisible: overrides?.isShareUrlVisible ?? false,
        draftAllographText: overrides?.draftAllographText ?? defaultDraftAllographText,
        draftNoteText: overrides?.draftNoteText ?? defaultDraftNoteText,
      };
    },
    []
  );

  const handlePopupPositionChange = React.useCallback(
    (popupId: string, x: number, y: number) => {
      if (!allowMultipleBoxes) {
        setSinglePopupPosition((prev) => {
          if (prev.x === x && prev.y === y) return prev;
          return { x, y };
        });
      }

      setActivePopupId((prev) => (prev === popupId ? prev : popupId));
    },
    [allowMultipleBoxes]
  );

  const replaceSinglePopup = React.useCallback(
    (
      annotation: A9sWithMeta | null,
      overrides?: Partial<Omit<PopupRecord, 'id' | 'annotation'>>
    ) => {
      if (!annotation) {
        setOpenPopups([]);
        setActivePopupId(null);
        return;
      }

      const nextPopup = buildPopupRecordFromAnnotation(annotation, overrides);
      setOpenPopups([nextPopup]);
      setActivePopupId(nextPopup.id);
    },
    [buildPopupRecordFromAnnotation]
  );

  const appendPopupWithAutoOffset = React.useCallback(
    (
      annotation: A9sWithMeta | null,
      overrides?: Partial<Omit<PopupRecord, 'id' | 'annotation'>>
    ) => {
      if (!annotation) return;

      setActivePopupId(annotation.id);

      setOpenPopups((prev) => {
        if (prev.some((popup) => popup.id === annotation.id)) {
          return prev;
        }

        const nextPopup = buildPopupRecordFromAnnotation(annotation, overrides);
        return [...prev, nextPopup];
      });
    },
    [buildPopupRecordFromAnnotation]
  );

  const openPopupCollectionFromAnnotation = React.useCallback(
    (annotation: A9sWithMeta | null, options?: OpenPopupOptions) => {
      if (!annotation) {
        setOpenPopups([]);
        setActivePopupId(null);
        return;
      }

      const mode = options?.mode ?? (allowMultipleBoxes ? 'append' : 'replace');

      if (mode === 'append') {
        appendPopupWithAutoOffset(annotation, options?.overrides);
        return;
      }

      replaceSinglePopup(annotation, options?.overrides);
    },
    [allowMultipleBoxes, appendPopupWithAutoOffset, replaceSinglePopup]
  );

  const clearPopupCollection = React.useCallback(() => {
    setOpenPopups([]);
    setActivePopupId(null);
  }, []);

  const getPopupById = React.useCallback(
    (popupId: string) => openPopups.find((popup) => popup.id === popupId) ?? null,
    [openPopups]
  );

  const removePopupById = React.useCallback((popupId: string) => {
    setOpenPopups((prev) => prev.filter((popup) => popup.id !== popupId));
  }, []);

  const updatePopupById = React.useCallback((popupId: string, updates: Partial<PopupRecord>) => {
    setOpenPopups((prev) => {
      let changed = false;

      const next = prev.map((popup) => {
        if (popup.id !== popupId) return popup;

        const candidate = { ...popup, ...updates };

        const unchanged =
          candidate.id === popup.id &&
          candidate.annotation === popup.annotation &&
          candidate.popupTab === popup.popupTab &&
          candidate.shareUrl === popup.shareUrl &&
          candidate.isShareUrlVisible === popup.isShareUrlVisible &&
          candidate.draftAllographText === popup.draftAllographText &&
          candidate.draftNoteText === popup.draftNoteText;

        if (unchanged) return popup;

        changed = true;
        return candidate;
      });

      return changed ? next : prev;
    });
  }, []);

  const handleActivatePopup = React.useCallback((popupId: string) => {
    setActivePopupId(popupId);
  }, []);

  React.useEffect(() => {
    if (!openPopups.length) {
      if (activePopupId !== null) setActivePopupId(null);
      return;
    }

    if (!activePopupId || !openPopups.some((popup) => popup.id === activePopupId)) {
      setActivePopupId(openPopups[0].id);
    }
  }, [openPopups, activePopupId]);

  return {
    openPopups,
    activePopupId,
    singlePopupPosition,
    activePopupRecord,
    visiblePopupRecords,
    handlePopupPositionChange,
    openPopupCollectionFromAnnotation,
    clearPopupCollection,
    getPopupById,
    removePopupById,
    updatePopupById,
    handleActivatePopup,
  };
}
