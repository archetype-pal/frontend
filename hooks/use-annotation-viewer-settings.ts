'use client';

import * as React from 'react';

import type { AnnotationViewerSettings } from '@/types/annotation-viewer';

const STORAGE_KEY = 'annotationViewerSettings';

const DEFAULT_VIEWER_SETTINGS: AnnotationViewerSettings = {
  allowMultipleBoxes: false,
  selectMultipleAnnotations: false,
  toolbarPosition: 'vertical',
};

export function useAnnotationViewerSettings() {
  const [viewerSettings, setViewerSettings] =
    React.useState<AnnotationViewerSettings>(DEFAULT_VIEWER_SETTINGS);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<AnnotationViewerSettings>;

      setViewerSettings((prev) => ({
        allowMultipleBoxes: parsed.allowMultipleBoxes ?? prev.allowMultipleBoxes,
        selectMultipleAnnotations:
          parsed.selectMultipleAnnotations ?? prev.selectMultipleAnnotations,
        toolbarPosition:
          parsed.toolbarPosition === 'horizontal' ? 'horizontal' : prev.toolbarPosition,
      }));
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(viewerSettings));
    } catch {
      // ignore
    }
  }, [viewerSettings]);

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

  const handleSetToolbarPosition = React.useCallback((position: 'vertical' | 'horizontal') => {
    setViewerSettings((prev) => ({
      ...prev,
      toolbarPosition: position,
    }));
  }, []);

  return {
    viewerSettings,
    setViewerSettings,
    handleToggleAllowMultipleBoxes,
    handleToggleSelectMultipleAnnotations,
    handleSetToolbarPosition,
  };
}
