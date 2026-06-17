'use client';

import * as React from 'react';

import {
  canCreateAnnotationKind,
  getDefaultAnnotationCreationKind,
} from '@/lib/viewer-capabilities';

import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { AnnotationCreationKind, ViewerCapabilities } from '@/types/annotation-viewer';

export type ActiveViewerTool = 'move' | 'modify' | 'draw' | 'delete';

export interface UseViewerEditorUiStateArgs {
  viewerCapabilities: ViewerCapabilities;
  /** Allographs available on the current image — used to keep selectedHand
   * within the valid set. */
  handsForThisImage: HandType[];
  /** Allograph derived from the active popup selection — if neither this
   * nor `filteredAllograph` is set, the modal auto-closes. */
  popupSelectedAllograph: Allograph | undefined;
  /** Called when the allograph modal auto-closes (to reset drag state).
   * Optional; if omitted the auto-close just toggles the open flag. */
  onAllographModalAutoClose?: () => void;
}

export interface ViewerEditorUiState {
  activeTool: ActiveViewerTool;
  setActiveTool: React.Dispatch<React.SetStateAction<ActiveViewerTool>>;
  currentCreationKind: AnnotationCreationKind;
  setCurrentCreationKind: React.Dispatch<React.SetStateAction<AnnotationCreationKind>>;
  filteredAllograph: Allograph | undefined;
  setFilteredAllograph: React.Dispatch<React.SetStateAction<Allograph | undefined>>;
  hoveredAllograph: Allograph | undefined;
  setHoveredAllograph: React.Dispatch<React.SetStateAction<Allograph | undefined>>;
  isAllographModalOpen: boolean;
  setIsAllographModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedHand: HandType | null | undefined;
  setSelectedHand: React.Dispatch<React.SetStateAction<HandType | null | undefined>>;
  hoveredAnnotationId: string | null;
  setHoveredAnnotationId: React.Dispatch<React.SetStateAction<string | null>>;
}

// Bundles the editor-side transient UI state — what tool is active, what
// allograph is being filtered/hovered/picked, which hand is in scope, what
// annotation is being hovered. Owns three invariants that the viewer used
// to repeat inline:
//
//   1. currentCreationKind falls back to the capability default when the
//      caller's capabilities flip and the current kind is no longer allowed.
//   2. selectedHand clears when the active image's hand list no longer
//      contains it.
//   3. isAllographModalOpen auto-closes when there's no longer a context
//      allograph (filteredAllograph or popupSelectedAllograph).
//
// Phase A.2 of ROADMAP-EDITORS. The next refactor (component split) will
// let consumers subscribe to subsets of this state without re-rendering
// the whole viewer — for now, bundling is the LOC + cohesion win.
export function useViewerEditorUiState(args: UseViewerEditorUiStateArgs): ViewerEditorUiState {
  const {
    viewerCapabilities,
    handsForThisImage,
    popupSelectedAllograph,
    onAllographModalAutoClose,
  } = args;

  const [activeTool, setActiveTool] = React.useState<ActiveViewerTool>('move');
  const [currentCreationKind, setCurrentCreationKind] =
    React.useState<AnnotationCreationKind>('public');
  const [filteredAllograph, setFilteredAllograph] = React.useState<Allograph | undefined>(
    undefined
  );
  const [hoveredAllograph, setHoveredAllograph] = React.useState<Allograph | undefined>(undefined);
  const [isAllographModalOpen, setIsAllographModalOpen] = React.useState(false);
  const [selectedHand, setSelectedHand] = React.useState<HandType | null | undefined>(undefined);
  const [hoveredAnnotationId, setHoveredAnnotationId] = React.useState<string | null>(null);

  // Invariant 1: keep currentCreationKind allowed by the current capabilities.
  // Adjusted during render (React's "store-during-render" pattern) rather than
  // in an effect: the fallback returned by getDefaultAnnotationCreationKind is
  // always a kind the capabilities allow, so the guard converges after a single
  // re-render and never loops.
  if (!canCreateAnnotationKind(viewerCapabilities, currentCreationKind)) {
    const fallback = getDefaultAnnotationCreationKind(viewerCapabilities);
    if (fallback && fallback !== currentCreationKind) {
      setCurrentCreationKind(fallback);
    }
  }

  // Invariant 2: drop selectedHand when it leaves the active image's hand set.
  // Also a store-during-render adjustment: once cleared, the guard's first
  // condition (`!selectedHand`) short-circuits, so it converges immediately.
  if (selectedHand && !handsForThisImage.some((hand) => hand.id === selectedHand.id)) {
    setSelectedHand(undefined);
  }

  // Invariant 3: close the allograph modal when there's no context allograph.
  React.useEffect(() => {
    if (!isAllographModalOpen) return;
    const hasContext = Boolean(filteredAllograph || popupSelectedAllograph);
    if (hasContext) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-close is paired with the external onAllographModalAutoClose callback (resets the caller's drag state); that side effect must not run during render, so this stays an effect.
    setIsAllographModalOpen(false);
    onAllographModalAutoClose?.();
  }, [isAllographModalOpen, filteredAllograph, popupSelectedAllograph, onAllographModalAutoClose]);

  return {
    activeTool,
    setActiveTool,
    currentCreationKind,
    setCurrentCreationKind,
    filteredAllograph,
    setFilteredAllograph,
    hoveredAllograph,
    setHoveredAllograph,
    isAllographModalOpen,
    setIsAllographModalOpen,
    selectedHand,
    setSelectedHand,
    hoveredAnnotationId,
    setHoveredAnnotationId,
  };
}
