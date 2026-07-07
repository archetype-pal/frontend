'use client';

import * as React from 'react';

import type { A9sWithMeta, PopupRecord } from '@/types/annotation-viewer';
import {
  getAllographBodyText,
  getEditorialInternalNote,
  getStandardAnnotationNote,
} from '@/lib/annotation-notes';
import { isTextRegionAnnotation } from '@/lib/manuscript-viewer-annotation-types';
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
  // The explicit user override only. The effective active id is derived during
  // render (see `activePopupId` below) by reconciling this override against the
  // live `openPopups`, so we never commit a stale/invalid id and then correct
  // it in an effect.
  const [activePopupOverride, setActivePopupOverride] = React.useState<string | null>(null);
  const [singlePopupPosition, setSinglePopupPosition] = React.useState<PopupPosition>(
    DEFAULT_SINGLE_POPUP_POSITION
  );

  // Effective active id: the user's override when it still points at an open
  // popup, otherwise the first open popup (or null when none are open). Derived
  // in render so consumers (and `activePopupRecord`/`visiblePopupRecords`) read
  // a value that is always consistent with `openPopups`.
  const activePopupId = React.useMemo(() => {
    if (!openPopups.length) return null;
    if (activePopupOverride && openPopups.some((popup) => popup.id === activePopupOverride)) {
      return activePopupOverride;
    }
    return openPopups[0]?.id ?? null;
  }, [openPopups, activePopupOverride]);

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
      const defaultDraftAllographText = getAllographBodyText(annotation);

      const defaultDraftNoteText = getStandardAnnotationNote(annotation);

      const defaultDraftInternalNoteText = getEditorialInternalNote(annotation);

      const defaultDraftGraphcomponentSet = annotation._meta?.graphcomponentSet ?? [];

      const defaultDraftPositionIds = annotation._meta?.positions ?? [];

      return {
        id: annotation.id,
        annotation,
        popupTab: overrides?.popupTab ?? 'details',
        shareUrl: overrides?.shareUrl ?? '',
        isShareUrlVisible: overrides?.isShareUrlVisible ?? false,
        draftAllographText: overrides?.draftAllographText ?? defaultDraftAllographText,
        draftNoteText: overrides?.draftNoteText ?? defaultDraftNoteText,
        draftAllographId: overrides?.draftAllographId ?? annotation._meta?.allographId ?? null,
        draftHandId: overrides?.draftHandId ?? annotation._meta?.handId ?? null,
        draftInternalNoteText: overrides?.draftInternalNoteText ?? defaultDraftInternalNoteText,
        draftGraphcomponentSet: overrides?.draftGraphcomponentSet ?? defaultDraftGraphcomponentSet,
        draftPositionIds: overrides?.draftPositionIds ?? defaultDraftPositionIds,
        allographLocked: overrides?.allographLocked ?? false,
      };
    },
    []
  );

  const handlePopupPositionChange = React.useCallback(
    (_popupId: string, x: number, y: number) => {
      if (!allowMultipleBoxes) {
        setSinglePopupPosition((prev) => {
          if (prev.x === x && prev.y === y) return prev;
          return { x, y };
        });
      }
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
        setActivePopupOverride(null);
        return;
      }

      const nextPopup = buildPopupRecordFromAnnotation(annotation, overrides);
      setOpenPopups([nextPopup]);
      setActivePopupOverride(nextPopup.id);
    },
    [buildPopupRecordFromAnnotation]
  );

  const appendPopupWithAutoOffset = React.useCallback(
    (
      annotation: A9sWithMeta | null,
      overrides?: Partial<Omit<PopupRecord, 'id' | 'annotation'>>
    ) => {
      if (!annotation) return;

      setActivePopupOverride(annotation.id);

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
      // Authoritative type boundary: a text-region annotation NEVER gets a
      // glyph/editorial popup, regardless of which caller asks. Upstream guards
      // (use-popup-selection, use-share-target) are fast paths; this is the
      // single sink that makes the rule impossible to bypass.
      if (!annotation || isTextRegionAnnotation(annotation)) {
        setOpenPopups([]);
        setActivePopupOverride(null);
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
    setActivePopupOverride(null);
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
          candidate.draftNoteText === popup.draftNoteText &&
          candidate.draftAllographId === popup.draftAllographId &&
          candidate.draftHandId === popup.draftHandId &&
          candidate.draftInternalNoteText === popup.draftInternalNoteText &&
          candidate.draftGraphcomponentSet === popup.draftGraphcomponentSet &&
          candidate.draftPositionIds === popup.draftPositionIds &&
          candidate.allographLocked === popup.allographLocked;

        if (unchanged) return popup;

        changed = true;
        return candidate;
      });

      return changed ? next : prev;
    });
  }, []);

  const handleActivatePopup = React.useCallback((popupId: string) => {
    setActivePopupOverride(popupId);
  }, []);

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
