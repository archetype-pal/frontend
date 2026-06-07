'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import type {
  AnnotationViewerSettings,
  TextDisplayMode,
  TextPanelPosition,
} from '@/types/annotation-viewer';

import { Button } from '@/components/ui/button';
import { ResizeHandle } from '@/components/ui/resize-handle';
import { Separator } from '@/components/ui/separator';
import { useOnEscape } from '@/hooks/use-on-escape';

interface AnnotationSettingsPanelProps {
  isOpen: boolean;
  transform: string;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  viewerSettings: AnnotationViewerSettings;
  showEditorSettings?: boolean;
  /** Show the Transcription/Translation/Both chooser (image has text + both kinds). */
  showTextDisplay?: boolean;
  hasTranscription?: boolean;
  hasTranslation?: boolean;
  onClose: () => void;
  onToggleAllowMultipleBoxes: () => void;
  onToggleSelectMultipleAnnotations: () => void;
  onSetToolbarPosition: (position: 'vertical' | 'horizontal') => void;
  onSetTextPanelPosition: (position: TextPanelPosition) => void;
  onSetTextDisplayMode: (mode: TextDisplayMode) => void;
  width?: number;
  height?: number;
  resizeHandleProps?: React.HTMLAttributes<HTMLSpanElement>;
}

const TEXT_POSITIONS: Array<{ value: TextPanelPosition; label: string }> = [
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'bottom', label: 'Bottom' },
];

const TEXT_DISPLAY_OPTIONS: Array<{ value: TextDisplayMode; label: string }> = [
  { value: 'transcription', label: 'Transcription' },
  { value: 'translation', label: 'Translation' },
  { value: 'both', label: 'Both' },
];

export function AnnotationSettingsPanel({
  isOpen,
  transform,
  dragHandleProps,
  viewerSettings,
  showEditorSettings = false,
  showTextDisplay = false,
  hasTranscription = false,
  hasTranslation = false,
  onClose,
  onToggleAllowMultipleBoxes,
  onToggleSelectMultipleAnnotations,
  onSetToolbarPosition,
  onSetTextPanelPosition,
  onSetTextDisplayMode,
  width,
  height,
  resizeHandleProps,
}: AnnotationSettingsPanelProps) {
  useOnEscape(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal={false}
      aria-label="Annotation settings"
      data-resizable-panel
      className="fixed right-4 top-24 z-40 flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-background shadow-lg"
      style={{
        transform,
        width: width ?? 360,
        height,
        maxHeight: height ? undefined : 'calc(100dvh - 7rem)',
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3 cursor-move select-none"
        {...dragHandleProps}
      >
        <h3 className="text-base font-semibold">Settings</h3>

        <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            type="button"
            aria-label="Close settings panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-auto px-4 py-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Annotation boxes</h4>
          <Separator className="my-3" />

          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
            <input
              type="checkbox"
              checked={viewerSettings.allowMultipleBoxes}
              onChange={onToggleAllowMultipleBoxes}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-foreground">Allow multiple boxes</span>
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
        {showTextDisplay && (
          <div>
            <h4 className="text-sm font-semibold text-foreground">Text display</h4>
            <Separator className="my-3" />

            <div className="flex flex-wrap gap-2">
              {TEXT_DISPLAY_OPTIONS.map((option) => {
                const disabled =
                  (option.value === 'transcription' && !hasTranscription) ||
                  (option.value === 'translation' && !hasTranslation) ||
                  (option.value === 'both' && (!hasTranscription || !hasTranslation));
                return (
                  <Button
                    key={option.value}
                    variant={
                      viewerSettings.textDisplayMode === option.value ? 'default' : 'outline'
                    }
                    size="sm"
                    type="button"
                    disabled={disabled}
                    onClick={() => onSetTextDisplayMode(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-foreground">Text panel position</h4>
          <Separator className="my-3" />

          <div className="flex flex-wrap gap-2">
            {TEXT_POSITIONS.map((option) => (
              <Button
                key={option.value}
                variant={viewerSettings.textPanelPosition === option.value ? 'default' : 'outline'}
                size="sm"
                type="button"
                onClick={() => onSetTextPanelPosition(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {showEditorSettings && (
          <div>
            <h4 className="text-sm font-semibold text-foreground">Editor settings</h4>
            <Separator className="my-3" />

            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
              <input
                type="checkbox"
                checked={viewerSettings.selectMultipleAnnotations}
                onChange={onToggleSelectMultipleAnnotations}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm text-foreground">Select multiple annotations</span>
            </label>
            <p className="px-2 text-xs text-muted-foreground">
              When enabled, multiple annotations can remain selected; standard drafts drawn in
              sequence stay selected for a shared popup edit.
            </p>
          </div>
        )}
      </div>

      <ResizeHandle {...resizeHandleProps} />
    </div>
  );
}
