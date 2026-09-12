'use client';

import * as React from 'react';

import { isDbId } from '@/lib/annotation-popup-utils';
import { hasPopupAnnotationChanges } from '@/lib/manuscript-viewer-popup-utils';
import { useHotkeys, type HotkeyDefinition } from '@/hooks/use-hotkeys';
import type { ViewerApi } from '@/components/manuscript/manuscript-annotorious';
import type { AnnotationCreationKind, PopupRecord } from '@/types/annotation-viewer';

const LEGACY_SHORTCUT_PAN_STEP = 60;

interface UseViewerShortcutsArgs {
  viewerApiRef: React.RefObject<ViewerApi | null>;
  activePopupRecord: PopupRecord | null;
  getPopupById: (popupId: string) => PopupRecord | null;
  canCreateEditorialAnnotations: boolean;
  canDeleteAnnotations: boolean;
  canPersistAnyAnnotations: boolean;
  isPublicDemoMode: boolean;
  unsavedChanges: number;
  handleConfirmDraftAnnotation: (popupId: string) => Promise<void>;
  handleCreateAnnotation: (kind?: AnnotationCreationKind) => void;
  handleDefaultZoom: () => Promise<void>;
  handleDeleteTool: () => void;
  handleModifyTool: () => void;
  handleMoveTool: () => void;
  handleSave: () => Promise<void>;
  handleToggleFullScreen: () => void;
  handleToggleMoveDrawTool: () => void;
}

/**
 * Legacy DigiPal toolbar shortcuts, adapted to the current viewer tools, plus
 * the popup save they trigger. Single `useHotkeys` subscription; each entry
 * knows whether it should fire inside text inputs (only Cmd/Ctrl+S — the rest
 * skip when typing).
 */
export function useViewerShortcuts({
  viewerApiRef,
  activePopupRecord,
  getPopupById,
  canCreateEditorialAnnotations,
  canDeleteAnnotations,
  canPersistAnyAnnotations,
  isPublicDemoMode,
  unsavedChanges,
  handleConfirmDraftAnnotation,
  handleCreateAnnotation,
  handleDefaultZoom,
  handleDeleteTool,
  handleModifyTool,
  handleMoveTool,
  handleSave,
  handleToggleFullScreen,
  handleToggleMoveDrawTool,
}: UseViewerShortcutsArgs) {
  const [isShortcutsOpen, setIsShortcutsOpen] = React.useState(false);
  const canSaveNow = canPersistAnyAnnotations && !isPublicDemoMode && unsavedChanges > 0;
  const [pendingPopupSaveRequest, setPendingPopupSaveRequest] = React.useState(0);
  const handledPendingPopupSaveRef = React.useRef(0);

  const handleSavePopupAnnotation = React.useCallback(
    async (popupId: string) => {
      if (!canPersistAnyAnnotations || isPublicDemoMode) return;
      const popup = getPopupById(popupId);
      if (!popup) return;
      if (isDbId(popup.annotation.id) && !hasPopupAnnotationChanges(popup)) return;

      await handleConfirmDraftAnnotation(popupId);
      setPendingPopupSaveRequest((prev) => prev + 1);
    },
    [canPersistAnyAnnotations, getPopupById, handleConfirmDraftAnnotation, isPublicDemoMode]
  );

  React.useEffect(() => {
    if (pendingPopupSaveRequest === 0) return;
    if (handledPendingPopupSaveRef.current === pendingPopupSaveRequest) return;
    if (!canSaveNow) return;

    handledPendingPopupSaveRef.current = pendingPopupSaveRequest;
    // Deferred save: the popup-save handler bumps a counter, then this waits for
    // canSaveNow (derived from unsavedChanges) to recompute after the confirmed
    // draft commits before firing the async handleSave. Running it in the handler
    // would save before that state propagates.
    void handleSave();
  }, [canSaveNow, handleSave, pendingPopupSaveRequest]);

  const zoomIn = React.useCallback(() => viewerApiRef.current?.zoomIn(), [viewerApiRef]);
  const zoomOut = React.useCallback(() => viewerApiRef.current?.zoomOut(), [viewerApiRef]);
  const panBy = React.useCallback(
    (dx: number, dy: number) => {
      viewerApiRef.current?.panByPixels(dx, dy);
    },
    [viewerApiRef]
  );

  const viewerHotkeys = React.useMemo<HotkeyDefinition[]>(() => {
    const accept = (handler: () => void) => (event: KeyboardEvent) => {
      event.preventDefault();
      handler();
    };
    const saveIfDirty = (event: KeyboardEvent) => {
      if (!canPersistAnyAnnotations || isPublicDemoMode) return;
      event.preventDefault();
      if (canSaveNow) void handleSave();
    };
    const saveActivePopupOrToolbar = (event: KeyboardEvent) => {
      if (!canPersistAnyAnnotations || isPublicDemoMode) return;
      event.preventDefault();

      const hasSavableActivePopup =
        activePopupRecord &&
        (!isDbId(activePopupRecord.annotation.id) || hasPopupAnnotationChanges(activePopupRecord));

      if (hasSavableActivePopup) {
        void handleSavePopupAnnotation(activePopupRecord.id);
        return;
      }

      if (canSaveNow) void handleSave();
    };
    const defs: HotkeyDefinition[] = [
      // Cmd/Ctrl+S — only shortcut that's allowed inside text inputs.
      { key: 's', metaKey: true, allowInEditable: true, handler: saveIfDirty },
      { key: 's', ctrlKey: true, allowInEditable: true, handler: saveIfDirty },
      // Plain S saves the active popup first; without a popup it saves the toolbar state.
      { key: 's', handler: saveActivePopupOrToolbar },

      { key: 'Home', handler: accept(() => void handleDefaultZoom()) },
      { key: 'f', handler: accept(handleToggleFullScreen) },
      { key: 'g', handler: accept(handleMoveTool) },
      { key: 'm', handler: accept(handleModifyTool) },
      { key: 'd', handler: accept(() => handleCreateAnnotation()) },
      { key: 'r', handler: accept(() => handleCreateAnnotation()) },
      { key: ' ', handler: accept(handleToggleMoveDrawTool) },
      { key: '?', shiftKey: true, handler: accept(() => setIsShortcutsOpen(true)) },

      // Zoom in: Z, +, =
      { key: 'z', handler: accept(zoomIn) },
      { key: '+', handler: accept(zoomIn) },
      { key: '=', handler: accept(zoomIn) },
      // Zoom out: -, _
      { key: '-', handler: accept(zoomOut) },
      { key: '_', handler: accept(zoomOut) },

      // Shift-Arrow pan (Shift required so plain arrow keys still belong to OSD)
      {
        key: 'ArrowUp',
        shiftKey: true,
        handler: accept(() => panBy(0, -LEGACY_SHORTCUT_PAN_STEP)),
      },
      {
        key: 'ArrowDown',
        shiftKey: true,
        handler: accept(() => panBy(0, LEGACY_SHORTCUT_PAN_STEP)),
      },
      {
        key: 'ArrowLeft',
        shiftKey: true,
        handler: accept(() => panBy(-LEGACY_SHORTCUT_PAN_STEP, 0)),
      },
      {
        key: 'ArrowRight',
        shiftKey: true,
        handler: accept(() => panBy(LEGACY_SHORTCUT_PAN_STEP, 0)),
      },
    ];

    if (canCreateEditorialAnnotations) {
      defs.push({ key: 'e', handler: accept(() => handleCreateAnnotation('editorial')) });
    }

    if (canDeleteAnnotations) {
      const del = accept(handleDeleteTool);
      defs.push({ key: 'x', handler: del });
      defs.push({ key: 'Delete', handler: del });
      defs.push({ key: 'Backspace', shiftKey: true, handler: del });
    }

    return defs;
  }, [
    canCreateEditorialAnnotations,
    canDeleteAnnotations,
    canPersistAnyAnnotations,
    canSaveNow,
    activePopupRecord,
    handleCreateAnnotation,
    handleDefaultZoom,
    handleDeleteTool,
    handleModifyTool,
    handleMoveTool,
    handleSave,
    handleSavePopupAnnotation,
    handleToggleFullScreen,
    handleToggleMoveDrawTool,
    isPublicDemoMode,
    panBy,
    zoomIn,
    zoomOut,
  ]);
  useHotkeys(viewerHotkeys);

  return { isShortcutsOpen, setIsShortcutsOpen, handleSavePopupAnnotation };
}
