'use client';

import * as React from 'react';
import type { useDraggablePosition } from '@/hooks/use-draggable-position';

type Draggable = ReturnType<typeof useDraggablePosition>;

export interface ViewerChromeOptions {
  filterPanelDrag: Pick<Draggable, 'reset'>;
  settingsPanelDrag: Pick<Draggable, 'reset'>;
  canUseSettings: boolean;
}

export interface ViewerChromeApi {
  isFullScreen: boolean;
  isFilterPanelOpen: boolean;
  isSettingsPanelOpen: boolean;
  toggleFullScreen: () => void;
  toggleFilterPanel: () => void;
  toggleSettingsPanel: () => void;
  closeFilterPanel: () => void;
  closeSettingsPanel: () => void;
  closeAllPanels: () => void;
}

/**
 * Co-locates the viewer's overlay-chrome state: fullscreen toggle, plus the
 * filter and settings drawer panels with their drag-reset coupling. Replaces
 * three useStates and four wrapper handlers in manuscript-viewer.tsx (P1.1
 * in IMPROVEMENT_PLAN.md; second of four hooks).
 *
 * `canUseSettings` is consulted on every settings toggle so the caller doesn't
 * need to guard at every call site; toggling when settings are disabled is a
 * no-op.
 */
export function useViewerChromeState({
  filterPanelDrag,
  settingsPanelDrag,
  canUseSettings,
}: ViewerChromeOptions): ViewerChromeApi {
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = React.useState(false);

  const toggleFullScreen = React.useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  const toggleFilterPanel = React.useCallback(() => {
    setIsFilterPanelOpen((prev) => {
      const next = !prev;
      if (!next) filterPanelDrag.reset();
      return next;
    });
  }, [filterPanelDrag]);

  const toggleSettingsPanel = React.useCallback(() => {
    if (!canUseSettings) return;
    setIsSettingsPanelOpen((prev) => {
      const next = !prev;
      if (!next) settingsPanelDrag.reset();
      return next;
    });
  }, [canUseSettings, settingsPanelDrag]);

  const closeFilterPanel = React.useCallback(() => {
    setIsFilterPanelOpen(false);
    filterPanelDrag.reset();
  }, [filterPanelDrag]);

  const closeSettingsPanel = React.useCallback(() => {
    setIsSettingsPanelOpen(false);
    settingsPanelDrag.reset();
  }, [settingsPanelDrag]);

  const closeAllPanels = React.useCallback(() => {
    setIsFilterPanelOpen(false);
    setIsSettingsPanelOpen(false);
    filterPanelDrag.reset();
    settingsPanelDrag.reset();
  }, [filterPanelDrag, settingsPanelDrag]);

  return {
    isFullScreen,
    isFilterPanelOpen,
    isSettingsPanelOpen,
    toggleFullScreen,
    toggleFilterPanel,
    toggleSettingsPanel,
    closeFilterPanel,
    closeSettingsPanel,
    closeAllPanels,
  };
}
