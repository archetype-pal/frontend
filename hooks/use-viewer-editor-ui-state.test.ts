import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useViewerEditorUiState,
  type UseViewerEditorUiStateArgs,
} from './use-viewer-editor-ui-state';
import type { Allograph } from '@/types/allographs';
import type { HandType } from '@/types/hands';
import type { ViewerCapabilities } from '@/types/annotation-viewer';

function makeCaps(overrides: Partial<ViewerCapabilities> = {}): ViewerCapabilities {
  return {
    canCreatePublicAnnotations: true,
    canPersistPublicAnnotations: true,
    canCreateEditorialAnnotations: true,
    canPersistEditorialAnnotations: true,
    canDeleteAnnotations: true,
    canModifyAnnotations: true,
    canViewEditorialControls: true,
    canUseSettings: true,
    canUseEditorSettings: true,
    ...overrides,
  } as ViewerCapabilities;
}

function makeArgs(overrides: Partial<UseViewerEditorUiStateArgs> = {}): UseViewerEditorUiStateArgs {
  return {
    viewerCapabilities: makeCaps(),
    handsForThisImage: [],
    popupSelectedAllograph: undefined,
    ...overrides,
  };
}

const allographA = { id: 1, name: 'Alpha' } as Allograph;
const allographB = { id: 2, name: 'Beta' } as Allograph;
const hand1 = { id: 10, name: 'Hand 1' } as HandType;
const hand2 = { id: 20, name: 'Hand 2' } as HandType;

describe('useViewerEditorUiState — initial state', () => {
  it('starts with sensible defaults', () => {
    const { result } = renderHook(() => useViewerEditorUiState(makeArgs()));
    expect(result.current.activeTool).toBe('move');
    expect(result.current.currentCreationKind).toBe('public');
    expect(result.current.filteredAllograph).toBeUndefined();
    expect(result.current.hoveredAllograph).toBeUndefined();
    expect(result.current.isAllographModalOpen).toBe(false);
    expect(result.current.selectedHand).toBeUndefined();
    expect(result.current.hoveredAnnotationId).toBeNull();
  });
});

describe('setters', () => {
  it('round-trip all setters', () => {
    // Pass hands + a context allograph so invariants 2 and 3 don't reset
    // the values we're trying to set.
    const { result } = renderHook(() =>
      useViewerEditorUiState(
        makeArgs({ handsForThisImage: [hand1], popupSelectedAllograph: allographA })
      )
    );
    act(() => {
      result.current.setActiveTool('draw');
      result.current.setCurrentCreationKind('editorial');
      result.current.setFilteredAllograph(allographA);
      result.current.setHoveredAllograph(allographB);
      result.current.setIsAllographModalOpen(true);
      result.current.setSelectedHand(hand1);
      result.current.setHoveredAnnotationId('db:42');
    });
    expect(result.current.activeTool).toBe('draw');
    expect(result.current.currentCreationKind).toBe('editorial');
    expect(result.current.filteredAllograph).toEqual(allographA);
    expect(result.current.hoveredAllograph).toEqual(allographB);
    expect(result.current.isAllographModalOpen).toBe(true);
    expect(result.current.selectedHand).toEqual(hand1);
    expect(result.current.hoveredAnnotationId).toBe('db:42');
  });
});

describe('invariant 1 — currentCreationKind fallback', () => {
  it('falls back to editorial when public is disallowed', () => {
    const caps = makeCaps({
      canCreatePublicAnnotations: false,
      canCreateEditorialAnnotations: true,
    });
    const { result } = renderHook(() =>
      useViewerEditorUiState(makeArgs({ viewerCapabilities: caps }))
    );
    expect(result.current.currentCreationKind).toBe('editorial');
  });

  it('falls back to public when editorial is disallowed mid-session', () => {
    const initialCaps = makeCaps();
    const { result, rerender } = renderHook(({ args }) => useViewerEditorUiState(args), {
      initialProps: { args: makeArgs({ viewerCapabilities: initialCaps }) },
    });

    act(() => {
      result.current.setCurrentCreationKind('editorial');
    });
    expect(result.current.currentCreationKind).toBe('editorial');

    const tightenedCaps = makeCaps({
      canCreateEditorialAnnotations: false,
      canPersistEditorialAnnotations: false,
    });
    rerender({ args: makeArgs({ viewerCapabilities: tightenedCaps }) });

    expect(result.current.currentCreationKind).toBe('public');
  });

  it('does nothing when the current kind is still allowed', () => {
    const { result } = renderHook(() => useViewerEditorUiState(makeArgs()));
    expect(result.current.currentCreationKind).toBe('public');
  });
});

describe('invariant 2 — selectedHand reset', () => {
  it('clears selectedHand when it leaves the active image hand set', () => {
    const { result, rerender } = renderHook(({ args }) => useViewerEditorUiState(args), {
      initialProps: { args: makeArgs({ handsForThisImage: [hand1, hand2] }) },
    });

    act(() => {
      result.current.setSelectedHand(hand1);
    });
    expect(result.current.selectedHand).toEqual(hand1);

    rerender({ args: makeArgs({ handsForThisImage: [hand2] }) });
    expect(result.current.selectedHand).toBeUndefined();
  });

  it('keeps selectedHand if it is still in the list', () => {
    const { result, rerender } = renderHook(({ args }) => useViewerEditorUiState(args), {
      initialProps: { args: makeArgs({ handsForThisImage: [hand1, hand2] }) },
    });
    act(() => {
      result.current.setSelectedHand(hand1);
    });
    rerender({ args: makeArgs({ handsForThisImage: [hand1, hand2] }) });
    expect(result.current.selectedHand).toEqual(hand1);
  });

  it('is a no-op when selectedHand is undefined', () => {
    const { result, rerender } = renderHook(({ args }) => useViewerEditorUiState(args), {
      initialProps: { args: makeArgs({ handsForThisImage: [hand1] }) },
    });
    rerender({ args: makeArgs({ handsForThisImage: [] }) });
    expect(result.current.selectedHand).toBeUndefined();
  });
});

describe('invariant 3 — allograph modal auto-close', () => {
  it('auto-closes when neither filtered nor popup-selected allograph is set', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useViewerEditorUiState(makeArgs({ onAllographModalAutoClose: onClose }))
    );
    act(() => {
      result.current.setIsAllographModalOpen(true);
    });
    // No context allograph → effect runs and closes it.
    expect(result.current.isAllographModalOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when filteredAllograph is set', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useViewerEditorUiState(makeArgs({ onAllographModalAutoClose: onClose }))
    );
    act(() => {
      result.current.setFilteredAllograph(allographA);
      result.current.setIsAllographModalOpen(true);
    });
    expect(result.current.isAllographModalOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stays open when popupSelectedAllograph is set', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useViewerEditorUiState(
        makeArgs({ popupSelectedAllograph: allographA, onAllographModalAutoClose: onClose })
      )
    );
    act(() => {
      result.current.setIsAllographModalOpen(true);
    });
    expect(result.current.isAllographModalOpen).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes mid-session if the context allograph is cleared', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(({ args }) => useViewerEditorUiState(args), {
      initialProps: {
        args: makeArgs({
          popupSelectedAllograph: allographA,
          onAllographModalAutoClose: onClose,
        }),
      },
    });
    act(() => {
      result.current.setIsAllographModalOpen(true);
    });
    expect(result.current.isAllographModalOpen).toBe(true);

    rerender({
      args: makeArgs({ popupSelectedAllograph: undefined, onAllographModalAutoClose: onClose }),
    });
    expect(result.current.isAllographModalOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not fire the close callback when the modal was already closed', () => {
    const onClose = vi.fn();
    renderHook(() => useViewerEditorUiState(makeArgs({ onAllographModalAutoClose: onClose })));
    expect(onClose).not.toHaveBeenCalled();
  });
});
