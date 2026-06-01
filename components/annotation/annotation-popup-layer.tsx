'use client';

import * as React from 'react';

import { AnnotationPopupCard } from '@/components/annotation/annotation-popup-card';
import { DraggablePopupLayer } from '@/components/manuscript/draggable-popup-layer';

import {
  getAnnotationKindFromPopupRecord,
  getPopupCapabilities,
  getPopupCardViewData,
  getPopupEditorMode,
  getPopupInitialPosition,
  getPopupMetaSummary,
  getPopupZIndex,
  hasPopupAnnotationChanges,
  type PopupPosition,
} from '@/lib/manuscript-viewer-popup-utils';

import type { Annotation as A9sAnnotation } from '@/components/manuscript/manuscript-annotorious';
import type { CollectionItem } from '@/contexts/collection-context';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type {
  A9sGraphComponent,
  A9sWithMeta,
  PopupRecord,
  ViewerCapabilities,
} from '@/types/annotation-viewer';

interface AnnotationPopupLayerProps {
  /** Popups in render order — the active one ends up last so it paints on top. */
  visiblePopupRecords: PopupRecord[];
  activePopupId: string | null;

  // Read-only viewer context the popups display
  viewerCapabilities: ViewerCapabilities;
  allographs: Allograph[];
  allographNameById: Map<number, string>;
  allographLabelById: Map<number, string>;
  handsForThisImage: HandType[];
  handNameById: Map<number, string>;
  allowMultipleBoxes: boolean;
  singlePopupPosition: PopupPosition;

  // Per-annotation helpers the viewer owns. Closing over collectionContext +
  // imageHeight lets the caller decide when collection items are available
  // and keeps this component from depending on either type.
  getCollectionItemFor: (annotation: A9sAnnotation) => CollectionItem | null;
  isInCollection: (id: number, type: 'graph' | 'image') => boolean;
  getCanonicalAnnotation: (annotation: A9sAnnotation) => A9sWithMeta;

  // Lifecycle / layout
  onActivatePopup: (popupId: string) => void;
  onPopupPositionChange: (popupId: string, x: number, y: number) => void;

  // Generic popup-record mutator. The draft-field handlers all funnel
  // through this; the one non-trivial path (allograph change cascading
  // into other drafts) lives in onDraftAllographIdChange.
  updatePopupById: (popupId: string, updates: Partial<PopupRecord>) => void;
  onDraftAllographIdChange: (popupId: string, value: number | null) => void;
  onDraftHandIdChange: (popupId: string, value: number | null) => void;

  // Per-popup actions that need viewer-side state
  onPopupTabChange: (popupId: string, tab: PopupRecord['popupTab']) => void;
  canSaveAnnotationShortcuts: boolean;
  isSaveAnnotationShortcutDisabled: boolean;
  canDeleteAnnotationShortcuts: boolean;
  onSaveAnnotationShortcut: (popupId: string) => Promise<void> | void;
  onDeleteAnnotationShortcut: (popupId: string) => Promise<void> | void;
  onCopyShareUrl: (popupId: string) => void;
  onHideShareUrl: (popupId: string) => void;
  onShareSelectedAnnotation: (popupId: string) => void;
  onCloseSelectedAnnotation: (popupId: string) => void;
  onToggleAnnotationCollection: (annotation: A9sWithMeta) => void;
  onCancelDraftAnnotation: (popupId: string) => void;
  onConfirmDraftAnnotation: (popupId: string) => Promise<void> | void;
}

// Renders the floating annotation popups (one per `visiblePopupRecords`
// entry, the active one last so it paints on top). Owns the per-popup
// derived-view computation + the trivial draft-field handlers; the viewer
// only sees the layer as a single component with a wide-but-flat prop
// surface. Phase A.3 of ROADMAP-EDITORS.
export function AnnotationPopupLayer({
  visiblePopupRecords,
  activePopupId,
  viewerCapabilities,
  allographs,
  allographNameById,
  allographLabelById,
  handsForThisImage,
  handNameById,
  allowMultipleBoxes,
  singlePopupPosition,
  getCollectionItemFor,
  isInCollection,
  getCanonicalAnnotation,
  onActivatePopup,
  onPopupPositionChange,
  updatePopupById,
  onDraftAllographIdChange,
  onDraftHandIdChange,
  onPopupTabChange,
  canSaveAnnotationShortcuts,
  isSaveAnnotationShortcutDisabled,
  canDeleteAnnotationShortcuts,
  onSaveAnnotationShortcut,
  onDeleteAnnotationShortcut,
  onCopyShareUrl,
  onHideShareUrl,
  onShareSelectedAnnotation,
  onCloseSelectedAnnotation,
  onToggleAnnotationCollection,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
}: AnnotationPopupLayerProps) {
  if (visiblePopupRecords.length === 0) return null;

  return (
    <>
      {visiblePopupRecords.map((popupRecord, index) => {
        const popupCard = getPopupCardViewData(popupRecord, allographNameById);
        const hasLocalChanges = hasPopupAnnotationChanges(popupRecord);
        const popupCapabilities = getPopupCapabilities(popupRecord, viewerCapabilities);
        const popupEditorMode = getPopupEditorMode(popupRecord, popupCapabilities);
        const annotationKind = getAnnotationKindFromPopupRecord(popupRecord);
        const canUseLoggedInPopupShortcuts =
          popupEditorMode !== 'public_demo_draft' && popupEditorMode !== 'public_existing';
        const metaSummary = getPopupMetaSummary(popupRecord, allographLabelById, handNameById);
        const isActive = popupRecord.id === activePopupId;
        const { x: initialX, y: initialY } = getPopupInitialPosition(
          index,
          allowMultipleBoxes,
          singlePopupPosition
        );
        const zIndex = getPopupZIndex(index, isActive);
        const popupCollectionAnnotation = getCanonicalAnnotation(popupRecord.annotation);
        const popupCollectionItem = getCollectionItemFor(popupCollectionAnnotation);
        const isPopupAnnotationInCollection = popupCollectionItem
          ? isInCollection(popupCollectionItem.id, 'graph')
          : false;

        return (
          <DraggablePopupLayer
            key={popupRecord.id || `popup-${index}`}
            popupId={popupRecord.id}
            initialX={initialX}
            initialY={initialY}
            zIndex={zIndex}
            onActivate={onActivatePopup}
            onPositionChange={onPopupPositionChange}
          >
            {({ popupTransform, dragHandleProps, zIndex: cardZIndex, onPointerDownCapture }) => (
              <AnnotationPopupCard
                title={popupCard.title}
                isDraftAnnotation={popupCard.isDraft}
                annotationKind={annotationKind}
                popupCapabilities={popupCapabilities}
                popupEditorMode={popupEditorMode}
                draftInternalNoteText={popupRecord.draftInternalNoteText}
                onDraftInternalNoteTextChange={(value: string) =>
                  updatePopupById(popupRecord.id, { draftInternalNoteText: value })
                }
                metaSummary={metaSummary}
                popupTransform={popupTransform}
                dragHandleProps={dragHandleProps}
                zIndex={cardZIndex}
                onPointerDownCapture={onPointerDownCapture}
                isActive={isActive}
                hasLocalChanges={hasLocalChanges}
                isShareUrlVisible={popupRecord.isShareUrlVisible}
                shareUrl={popupRecord.shareUrl}
                canSaveAnnotationShortcut={
                  canUseLoggedInPopupShortcuts && canSaveAnnotationShortcuts
                }
                isSaveAnnotationShortcutDisabled={
                  isSaveAnnotationShortcutDisabled || (!popupCard.isDraft && !hasLocalChanges)
                }
                canDeleteAnnotationShortcut={
                  canUseLoggedInPopupShortcuts && canDeleteAnnotationShortcuts
                }
                onSaveAnnotationShortcut={() => onSaveAnnotationShortcut(popupRecord.id)}
                onDeleteAnnotationShortcut={() => onDeleteAnnotationShortcut(popupRecord.id)}
                onCopyShareUrl={() => onCopyShareUrl(popupRecord.id)}
                onHideShareUrl={() => onHideShareUrl(popupRecord.id)}
                onShareSelectedAnnotation={() => onShareSelectedAnnotation(popupRecord.id)}
                onCloseSelectedAnnotation={() => onCloseSelectedAnnotation(popupRecord.id)}
                isAnnotationInCollection={isPopupAnnotationInCollection}
                onToggleAnnotationCollection={
                  popupCollectionItem
                    ? () => onToggleAnnotationCollection(popupCollectionAnnotation)
                    : undefined
                }
                draftAllographText={popupRecord.draftAllographText}
                onDraftAllographTextChange={(value: string) =>
                  updatePopupById(popupRecord.id, { draftAllographText: value })
                }
                draftNoteText={popupRecord.draftNoteText}
                onDraftNoteTextChange={(value: string) =>
                  updatePopupById(popupRecord.id, { draftNoteText: value })
                }
                allographOptions={allographs}
                handOptions={handsForThisImage.map((hand) => ({ id: hand.id, name: hand.name }))}
                draftAllographId={popupRecord.draftAllographId}
                draftHandId={popupRecord.draftHandId}
                draftGraphcomponentSet={popupRecord.draftGraphcomponentSet}
                draftPositionIds={popupRecord.draftPositionIds}
                onDraftPositionIdsChange={(value: number[]) =>
                  updatePopupById(popupRecord.id, { draftPositionIds: value })
                }
                onDraftGraphcomponentSetChange={(value: A9sGraphComponent[]) =>
                  updatePopupById(popupRecord.id, { draftGraphcomponentSet: value })
                }
                onDraftAllographIdChange={(value: number | null) =>
                  onDraftAllographIdChange(popupRecord.id, value)
                }
                onDraftHandIdChange={(value: number | null) =>
                  onDraftHandIdChange(popupRecord.id, value)
                }
                onCancelDraftAnnotation={() => onCancelDraftAnnotation(popupRecord.id)}
                onConfirmDraftAnnotation={() => {
                  void onConfirmDraftAnnotation(popupRecord.id);
                }}
                popupTab={popupRecord.popupTab}
                onPopupTabChange={(value: PopupRecord['popupTab']) =>
                  onPopupTabChange(popupRecord.id, value)
                }
                hasPositionsTab={popupCard.hasPositionsTab}
                selectedComponentGroups={popupCard.selectedComponentGroups}
                selectedPositionLabels={popupCard.selectedPositionLabels}
                selectedNotes={popupCard.selectedNotes}
              />
            )}
          </DraggablePopupLayer>
        );
      })}
    </>
  );
}
