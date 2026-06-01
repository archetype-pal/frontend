'use client';

import * as React from 'react';

import type {
  AnnotationViewerSettings,
  TextDisplayMode,
  TextPanelPosition,
  ToolbarPosition,
  ViewerAnnotationMode,
} from '@/types/annotation-viewer';

const STORAGE_KEY = 'annotationViewerSettings';

const VIEW_MODES: ViewerAnnotationMode[] = ['allograph', 'text', 'both'];
const TEXT_POSITIONS: TextPanelPosition[] = ['right', 'left', 'bottom'];
const TEXT_DISPLAY_MODES: TextDisplayMode[] = ['transcription', 'translation', 'both'];

const DEFAULT_VIEWER_SETTINGS: AnnotationViewerSettings = {
  allowMultipleBoxes: false,
  selectMultipleAnnotations: false,
  toolbarPosition: 'vertical',
  // Defaults preserve today's behaviour: glyph-only view, panel on the right,
  // single transcription shown.
  viewMode: 'allograph',
  textPanelPosition: 'right',
  textDisplayMode: 'transcription',
};

// Whitelist a persisted union value, falling back to the previous value when a
// stored blob is missing the key or holds something unexpected (forward/backward
// compatible across releases).
function oneOf<T extends string>(allowed: T[], value: unknown, fallback: T): T {
  return typeof value === 'string' && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function useAnnotationViewerSettings() {
  const [viewerSettings, setViewerSettings] =
    React.useState<AnnotationViewerSettings>(DEFAULT_VIEWER_SETTINGS);
  // Gate persistence on hydration: the settings default on the server/first
  // paint, so writing before we've read localStorage would clobber the user's
  // stored prefs back to defaults on every load.
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AnnotationViewerSettings>;
        setViewerSettings((prev) => ({
          allowMultipleBoxes: parsed.allowMultipleBoxes ?? prev.allowMultipleBoxes,
          selectMultipleAnnotations:
            parsed.selectMultipleAnnotations ?? prev.selectMultipleAnnotations,
          toolbarPosition: oneOf<ToolbarPosition>(
            ['vertical', 'horizontal'],
            parsed.toolbarPosition,
            prev.toolbarPosition
          ),
          viewMode: oneOf(VIEW_MODES, parsed.viewMode, prev.viewMode),
          textPanelPosition: oneOf(TEXT_POSITIONS, parsed.textPanelPosition, prev.textPanelPosition),
          textDisplayMode: oneOf(TEXT_DISPLAY_MODES, parsed.textDisplayMode, prev.textDisplayMode),
        }));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewerSettings));
    } catch {
      // ignore
    }
  }, [viewerSettings, hydrated]);

  const handleToggleAllowMultipleBoxes = React.useCallback(() => {
    setViewerSettings((prev) => ({
      ...prev,
      allowMultipleBoxes: !prev.allowMultipleBoxes,
    }));
  }, []);

  const handleToggleSelectMultipleAnnotations = React.useCallback(() => {
    setViewerSettings((prev) => ({
      ...prev,
      selectMultipleAnnotations: !prev.selectMultipleAnnotations,
    }));
  }, []);

  const handleSetToolbarPosition = React.useCallback((position: ToolbarPosition) => {
    setViewerSettings((prev) => ({
      ...prev,
      toolbarPosition: position,
    }));
  }, []);

  const handleSetViewMode = React.useCallback((viewMode: ViewerAnnotationMode) => {
    setViewerSettings((prev) => ({
      ...prev,
      viewMode,
    }));
  }, []);

  const handleSetTextPanelPosition = React.useCallback((textPanelPosition: TextPanelPosition) => {
    setViewerSettings((prev) => ({
      ...prev,
      textPanelPosition,
    }));
  }, []);

  const handleSetTextDisplayMode = React.useCallback((textDisplayMode: TextDisplayMode) => {
    setViewerSettings((prev) => ({
      ...prev,
      textDisplayMode,
    }));
  }, []);

  return {
    viewerSettings,
    setViewerSettings,
    handleToggleAllowMultipleBoxes,
    handleToggleSelectMultipleAnnotations,
    handleSetToolbarPosition,
    handleSetViewMode,
    handleSetTextPanelPosition,
    handleSetTextDisplayMode,
  };
}
