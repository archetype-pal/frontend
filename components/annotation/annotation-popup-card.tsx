'use client';

import * as React from 'react';

import type { Allograph } from '@/types/allographs';

import type {
  A9sGraphComponent,
  AnnotationCreationKind,
  AnnotationPopupCapabilities,
  AnnotationPopupEditorMode,
  AnnotationPopupMetaSummary,
} from '@/types/annotation-viewer';

import { PopupShell } from './popup/popup-shell';
import { PublicDemoDraftEditor } from './popup/public-demo-draft-editor';
import { StandardAnnotationEditor } from './popup/standard-annotation-editor';
import { EditorialAnnotationEditor } from './popup/editorial-annotation-editor';
import { PublicAnnotationView } from './popup/public-annotation-view';
import type { PopupTab, SelectedComponentGroup } from './popup/types';

export type { PopupTab, SelectedComponentGroup };

interface AnnotationPopupCardProps {
  title: string;
  isDraftAnnotation: boolean;
  annotationKind: AnnotationCreationKind;
  popupCapabilities: AnnotationPopupCapabilities;
  metaSummary?: AnnotationPopupMetaSummary;

  popupTransform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  zIndex?: number;
  onPointerDownCapture?: React.PointerEventHandler<HTMLDivElement>;
  isActive?: boolean;
  hasLocalChanges: boolean;

  isShareUrlVisible: boolean;
  shareUrl: string;
  canSaveAnnotationShortcut?: boolean;
  isSaveAnnotationShortcutDisabled?: boolean;
  canDeleteAnnotationShortcut?: boolean;
  onSaveAnnotationShortcut?: () => void | Promise<void>;
  onDeleteAnnotationShortcut?: () => void | Promise<void>;
  onCopyShareUrl: () => void | Promise<void>;
  onHideShareUrl: () => void;
  onShareSelectedAnnotation: () => void;
  onCloseSelectedAnnotation: () => void;
  isAnnotationInCollection?: boolean;
  onToggleAnnotationCollection?: () => void;

  draftAllographText: string;
  onDraftAllographTextChange: (value: string) => void;

  draftNoteText: string;
  onDraftNoteTextChange: (value: string) => void;

  popupEditorMode: AnnotationPopupEditorMode;

  allographOptions: Allograph[];
  handOptions: Array<{ id: number; name: string }>;
  draftAllographId: number | null;
  draftHandId: number | null;
  onDraftAllographIdChange: (value: number | null) => void;
  onDraftHandIdChange: (value: number | null) => void;

  draftGraphcomponentSet: A9sGraphComponent[];
  onDraftGraphcomponentSetChange: (value: A9sGraphComponent[]) => void;

  draftPositionIds: number[];
  onDraftPositionIdsChange: (value: number[]) => void;

  draftInternalNoteText: string;
  onDraftInternalNoteTextChange: (value: string) => void;

  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;

  popupTab: PopupTab;
  onPopupTabChange: (value: PopupTab) => void;

  hasPositionsTab: boolean;
  selectedComponentGroups: SelectedComponentGroup[];
  selectedPositionLabels: string[];
  selectedNotes: string[];
}

export function AnnotationPopupCard({
  title,
  isDraftAnnotation,
  annotationKind,
  popupCapabilities,
  metaSummary,
  popupTransform,
  dragHandleProps,
  zIndex,
  onPointerDownCapture,
  isActive = true,
  hasLocalChanges,
  isShareUrlVisible,
  shareUrl,
  canSaveAnnotationShortcut = false,
  isSaveAnnotationShortcutDisabled = false,
  canDeleteAnnotationShortcut = false,
  onSaveAnnotationShortcut,
  onDeleteAnnotationShortcut,
  onCopyShareUrl,
  onHideShareUrl,
  onShareSelectedAnnotation,
  onCloseSelectedAnnotation,
  isAnnotationInCollection = false,
  onToggleAnnotationCollection,
  draftAllographText,
  onDraftAllographTextChange,
  draftNoteText,
  onDraftNoteTextChange,
  popupEditorMode,
  allographOptions,
  handOptions,
  draftAllographId,
  draftHandId,
  onDraftAllographIdChange,
  onDraftHandIdChange,
  draftGraphcomponentSet,
  onDraftGraphcomponentSetChange,
  draftPositionIds,
  onDraftPositionIdsChange,
  draftInternalNoteText,
  onDraftInternalNoteTextChange,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
  popupTab,
  onPopupTabChange,
  hasPositionsTab,
  selectedComponentGroups,
  selectedPositionLabels,
  selectedNotes,
}: AnnotationPopupCardProps) {
  // Unique per instance — several popups can be open at once (multi-select).
  const titleId = React.useId();

  const isPublicDemoDraft = popupEditorMode === 'public_demo_draft';
  const isPublicExisting = popupEditorMode === 'public_existing';
  const isStandardDraft = popupEditorMode === 'standard_draft';
  const isStandardExisting = popupEditorMode === 'standard_existing';
  const isEditorialDraft = popupEditorMode === 'editorial_draft';
  const isEditorialExisting = popupEditorMode === 'editorial_existing';

  const annotationKindLabel =
    isStandardDraft || isStandardExisting
      ? 'Standard'
      : annotationKind === 'editorial'
        ? 'Editorial'
        : 'Public';
  const popupHeight = isStandardExisting ? 560 : isPublicExisting ? 480 : 440;
  const collectionLabel = isAnnotationInCollection ? 'Remove from Collection' : 'Add to Collection';

  return (
    <PopupShell
      title={title}
      titleId={titleId}
      isDraftAnnotation={isDraftAnnotation}
      popupCapabilities={popupCapabilities}
      annotationKindLabel={annotationKindLabel}
      collectionLabel={collectionLabel}
      popupTransform={popupTransform}
      dragHandleProps={dragHandleProps}
      zIndex={zIndex}
      onPointerDownCapture={onPointerDownCapture}
      height={popupHeight}
      isShareUrlVisible={isShareUrlVisible}
      shareUrl={shareUrl}
      canSaveAnnotationShortcut={canSaveAnnotationShortcut}
      isSaveAnnotationShortcutDisabled={isSaveAnnotationShortcutDisabled}
      canDeleteAnnotationShortcut={canDeleteAnnotationShortcut}
      onSaveAnnotationShortcut={onSaveAnnotationShortcut}
      onDeleteAnnotationShortcut={onDeleteAnnotationShortcut}
      onCopyShareUrl={onCopyShareUrl}
      onHideShareUrl={onHideShareUrl}
      onShareSelectedAnnotation={onShareSelectedAnnotation}
      onCloseSelectedAnnotation={onCloseSelectedAnnotation}
      isAnnotationInCollection={isAnnotationInCollection}
      onToggleAnnotationCollection={onToggleAnnotationCollection}
    >
      {isPublicDemoDraft ? (
        <PublicDemoDraftEditor
          draftAllographText={draftAllographText}
          onDraftAllographTextChange={onDraftAllographTextChange}
          draftNoteText={draftNoteText}
          onDraftNoteTextChange={onDraftNoteTextChange}
          onCancelDraftAnnotation={onCancelDraftAnnotation}
          onConfirmDraftAnnotation={onConfirmDraftAnnotation}
        />
      ) : isStandardDraft || isStandardExisting ? (
        <StandardAnnotationEditor
          isExisting={isStandardExisting}
          showLocalHint={isStandardExisting}
          isActive={isActive}
          hasLocalChanges={hasLocalChanges}
          popupCapabilities={popupCapabilities}
          metaSummary={metaSummary}
          allographOptions={allographOptions}
          handOptions={handOptions}
          draftAllographId={draftAllographId}
          draftHandId={draftHandId}
          onDraftAllographIdChange={onDraftAllographIdChange}
          onDraftHandIdChange={onDraftHandIdChange}
          draftGraphcomponentSet={draftGraphcomponentSet}
          onDraftGraphcomponentSetChange={onDraftGraphcomponentSetChange}
          draftPositionIds={draftPositionIds}
          onDraftPositionIdsChange={onDraftPositionIdsChange}
          draftNoteText={draftNoteText}
          onDraftNoteTextChange={onDraftNoteTextChange}
          onCancelDraftAnnotation={onCancelDraftAnnotation}
          onConfirmDraftAnnotation={onConfirmDraftAnnotation}
          popupTab={popupTab}
          onPopupTabChange={onPopupTabChange}
        />
      ) : isEditorialDraft || isEditorialExisting ? (
        <EditorialAnnotationEditor
          isExisting={isEditorialExisting}
          hasLocalChanges={hasLocalChanges}
          metaSummary={metaSummary}
          popupTab={popupTab}
          onPopupTabChange={onPopupTabChange}
          hasPositionsTab={hasPositionsTab}
          selectedComponentGroups={selectedComponentGroups}
          selectedPositionLabels={selectedPositionLabels}
          draftInternalNoteText={draftInternalNoteText}
          onDraftInternalNoteTextChange={onDraftInternalNoteTextChange}
          onCancelDraftAnnotation={onCancelDraftAnnotation}
          onConfirmDraftAnnotation={onConfirmDraftAnnotation}
        />
      ) : isPublicExisting ? (
        <PublicAnnotationView
          metaSummary={metaSummary}
          popupTab={popupTab}
          onPopupTabChange={onPopupTabChange}
          selectedComponentGroups={selectedComponentGroups}
          selectedPositionLabels={selectedPositionLabels}
          selectedNotes={selectedNotes}
        />
      ) : null}
    </PopupShell>
  );
}
