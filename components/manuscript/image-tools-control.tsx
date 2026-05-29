'use client';

import { RefreshCcw, RotateCcw, RotateCw, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ImageAdjustmentKey } from '@/hooks/use-viewer-image-adjustments';

function ImageAdjustmentSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value}%</span>
      </div>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={5}
        value={[value]}
        onValueChange={(nextValue) => onChange(nextValue[0] ?? value)}
      />
    </div>
  );
}

interface ImageToolsControlProps {
  adjustments: { brightness: number; contrast: number; saturation: number };
  hasChanges: boolean;
  onRotate: (degrees: number) => void;
  onAdjustmentChange: (key: ImageAdjustmentKey, value: number) => void;
  onReset: () => void;
}

/** Rotation + brightness/contrast/saturation controls for the viewer tile. */
export function ImageToolsControl({
  adjustments,
  hasChanges,
  onRotate,
  onAdjustmentChange,
  onReset,
}: ImageToolsControlProps) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={hasChanges ? 'default' : 'outline'}
              size="icon"
              className="h-8 w-8"
              aria-label="Image tools"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Image Tools</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" side="bottom" className="w-72 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold leading-none">Image tools</div>
            <div className="mt-1 text-xs text-muted-foreground">Rotation and tile adjustments</div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 gap-1" onClick={onReset}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => onRotate(-90)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Left
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => onRotate(90)}
          >
            <RotateCw className="h-3.5 w-3.5" />
            Right
          </Button>
        </div>

        <div className="space-y-4 border-t pt-4">
          <ImageAdjustmentSlider
            label="Brightness"
            min={50}
            max={150}
            value={adjustments.brightness}
            onChange={(value) => onAdjustmentChange('brightness', value)}
          />
          <ImageAdjustmentSlider
            label="Contrast"
            min={50}
            max={150}
            value={adjustments.contrast}
            onChange={(value) => onAdjustmentChange('contrast', value)}
          />
          <ImageAdjustmentSlider
            label="Saturation"
            min={0}
            max={200}
            value={adjustments.saturation}
            onChange={(value) => onAdjustmentChange('saturation', value)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
