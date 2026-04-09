'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import type { AnnotationViewerSettings } from '@/types/annotation-viewer';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AnnotationSettingsPanelProps {
  isOpen: boolean;
  transform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  viewerSettings: AnnotationViewerSettings;
  showEditorSettings?: boolean;
  onClose: () => void;
  onToggleAllowMultipleBoxes: () => void;
  onToggleSelectMultipleAnnotations: () => void;
  onSetToolbarPosition: (position: 'vertical' | 'horizontal') => void;
}

export function AnnotationSettingsPanel({
  isOpen,
  transform,
  dragHandleProps,
  viewerSettings,
  showEditorSettings: _showEditorSettings = false,
  onClose,
  onToggleAllowMultipleBoxes,
  onToggleSelectMultipleAnnotations,
  onSetToolbarPosition,
}: AnnotationSettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed top-24 right-4 z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border bg-background shadow-lg"
      style={{ transform }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3 cursor-move select-none"
        {...dragHandleProps}
      >
        <h3 className="text-base font-semibold">Settings</h3>

        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto px-4 py-4 space-y-6">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Annotation boxes</h4>
          <Separator className="my-3" />

          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={viewerSettings.allowMultipleBoxes}
              onChange={onToggleAllowMultipleBoxes}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-foreground">Allow multiple boxes</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={viewerSettings.selectMultipleAnnotations}
              onChange={onToggleSelectMultipleAnnotations}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-foreground">Select multiple annotations</span>
          </label>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-foreground">Toolbar position</h4>
          <Separator className="my-3" />

          <div className="flex gap-2">
            <Button
              variant={viewerSettings.toolbarPosition === 'vertical' ? 'default' : 'outline'}
              size="sm"
              type="button"
              onClick={() => onSetToolbarPosition('vertical')}
            >
              Vertical
            </Button>

            <Button
              variant={viewerSettings.toolbarPosition === 'horizontal' ? 'default' : 'outline'}
              size="sm"
              type="button"
              onClick={() => onSetToolbarPosition('horizontal')}
            >
              Horizontal
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
