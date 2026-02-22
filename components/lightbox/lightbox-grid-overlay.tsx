'use client';

import * as React from 'react';
import { useLightboxStore } from '@/stores/lightbox-store';

const GRID_SIZE = 24;

export function LightboxGridOverlay() {
  const { showGrid } = useLightboxStore();

  if (!showGrid) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 1 }}
      preserveAspectRatio="none"
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
    >
      <defs>
        <pattern
          id="lightbox-grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke="rgba(0, 0, 0, 0.12)"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lightbox-grid)" />
    </svg>
  );
}
