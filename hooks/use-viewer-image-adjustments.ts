'use client';

import * as React from 'react';
import type { ViewerImageAdjustments } from '@/components/manuscript/manuscript-annotorious';

export type ImageAdjustmentKey = keyof ViewerImageAdjustments;

export const DEFAULT_IMAGE_ADJUSTMENTS: ViewerImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
};

function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

type ImageToolAction =
  | { type: 'rotate'; degrees: number }
  | { type: 'setAdjustment'; key: ImageAdjustmentKey; value: number }
  | { type: 'reset' };

interface ImageToolState {
  rotation: number;
  adjustments: ViewerImageAdjustments;
}

const INITIAL_STATE: ImageToolState = {
  rotation: 0,
  adjustments: DEFAULT_IMAGE_ADJUSTMENTS,
};

function reducer(state: ImageToolState, action: ImageToolAction): ImageToolState {
  switch (action.type) {
    case 'rotate':
      return { ...state, rotation: normalizeRotation(state.rotation + action.degrees) };
    case 'setAdjustment':
      return { ...state, adjustments: { ...state.adjustments, [action.key]: action.value } };
    case 'reset':
      return INITIAL_STATE;
  }
}

export interface ViewerImageAdjustmentsApi {
  rotation: number;
  adjustments: ViewerImageAdjustments;
  hasAdjustments: boolean;
  hasChanges: boolean;
  rotate: (degrees: number) => void;
  setAdjustment: (key: ImageAdjustmentKey, value: number) => void;
  reset: () => void;
}

/**
 * Co-locates the viewer's rotation and brightness/contrast/saturation state.
 * Replaces two useStates and ~30 lines of duplicated reset/adjust handlers in
 * manuscript-viewer.tsx (P1.1 in IMPROVEMENT_PLAN.md).
 */
export function useViewerImageAdjustments(): ViewerImageAdjustmentsApi {
  const [state, dispatch] = React.useReducer(reducer, INITIAL_STATE);

  const hasAdjustments =
    state.adjustments.brightness !== DEFAULT_IMAGE_ADJUSTMENTS.brightness ||
    state.adjustments.contrast !== DEFAULT_IMAGE_ADJUSTMENTS.contrast ||
    state.adjustments.saturation !== DEFAULT_IMAGE_ADJUSTMENTS.saturation;

  const hasChanges = hasAdjustments || state.rotation !== 0;

  const rotate = React.useCallback((degrees: number) => {
    dispatch({ type: 'rotate', degrees });
  }, []);

  const setAdjustment = React.useCallback((key: ImageAdjustmentKey, value: number) => {
    dispatch({ type: 'setAdjustment', key, value });
  }, []);

  const reset = React.useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  return {
    rotation: state.rotation,
    adjustments: state.adjustments,
    hasAdjustments,
    hasChanges,
    rotate,
    setAdjustment,
    reset,
  };
}
