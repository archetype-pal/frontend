'use client';

import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Download,
  Save,
  Crop,
  Map,
  Ruler,
  Split,
  Layers,
  Grid3x3,
  MessageSquare,
  Upload,
  Undo2,
  Redo2,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
  StickyNote,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HelpEntry {
  icon: LucideIcon;
  label: string;
  description: string;
  shortcut?: string;
}

const HELP_SECTIONS: { title: string; entries: HelpEntry[] }[] = [
  {
    title: 'Zoom',
    entries: [
      {
        icon: ZoomOut,
        label: 'Zoom Out',
        description: 'Decrease zoom level.',
        shortcut: 'Ctrl + -',
      },
      {
        icon: ZoomIn,
        label: 'Zoom In',
        description: 'Increase zoom level.',
        shortcut: 'Ctrl + +',
      },
    ],
  },
  {
    title: 'Transform',
    entries: [
      {
        icon: RotateCw,
        label: 'Rotate 90\u00B0',
        description: 'Rotate the selected image(s) clockwise by 90 degrees.',
        shortcut: 'R',
      },
      {
        icon: FlipHorizontal,
        label: 'Flip Horizontal',
        description: 'Mirror the selected image(s) horizontally.',
      },
      {
        icon: FlipVertical,
        label: 'Flip Vertical',
        description: 'Mirror the selected image(s) vertically.',
      },
    ],
  },
  {
    title: 'Layer Order',
    entries: [
      {
        icon: ArrowUpToLine,
        label: 'Bring to Front',
        description: 'Move the selected image(s) above all others.',
      },
      {
        icon: ChevronUp,
        label: 'Move Up',
        description: 'Move the selected image(s) one layer up.',
      },
      {
        icon: ChevronDown,
        label: 'Move Down',
        description: 'Move the selected image(s) one layer down.',
      },
      {
        icon: ArrowDownToLine,
        label: 'Send to Back',
        description: 'Move the selected image(s) behind all others.',
      },
    ],
  },
  {
    title: 'Tools',
    entries: [
      {
        icon: Crop,
        label: 'Crop',
        description: 'Draw a rectangle on the selected image and save the cropped region.',
      },
      {
        icon: Ruler,
        label: 'Measurement',
        description: 'Measure pixel distances between two points on the canvas.',
      },
      {
        icon: MessageSquare,
        label: 'Annotations',
        description:
          'Toggle annotation mode on the selected image. Draw rectangles or freehand shapes to annotate regions.',
      },
      {
        icon: StickyNote,
        label: 'Sticky Note',
        description:
          'Add a draggable note to the workspace. You can also double-click empty space on the canvas.',
      },
    ],
  },
  {
    title: 'View',
    entries: [
      {
        icon: Grid3x3,
        label: 'Toggle Grid',
        description: 'Show or hide a grid overlay on the canvas for alignment.',
      },
      {
        icon: Map,
        label: 'Minimap',
        description: 'Show a small overview map of the entire workspace with a viewport indicator.',
      },
      {
        icon: Maximize2,
        label: 'Fullscreen',
        description: 'Enter or exit fullscreen mode.',
      },
    ],
  },
  {
    title: 'Compare',
    entries: [
      {
        icon: Split,
        label: 'Compare Images',
        description:
          'Open side-by-side or overlay comparison for two selected images. Zoom and pan are synchronized by default.',
      },
      {
        icon: Layers,
        label: 'Compare Regions',
        description: 'Compare cropped regions from different images side-by-side or overlaid.',
      },
    ],
  },
  {
    title: 'History',
    entries: [
      { icon: Undo2, label: 'Undo', description: 'Undo the last action.', shortcut: 'Ctrl + Z' },
      {
        icon: Redo2,
        label: 'Redo',
        description: 'Redo the previously undone action.',
        shortcut: 'Ctrl + Y',
      },
    ],
  },
  {
    title: 'File',
    entries: [
      {
        icon: Upload,
        label: 'Import',
        description: 'Import a workspace from a JSON or TEI XML file.',
      },
      {
        icon: Save,
        label: 'Save Session',
        description: 'Save the current workspace state as a named session you can restore later.',
      },
      {
        icon: Download,
        label: 'Export',
        description:
          'Export the workspace or selected images as PDF, JPEG, structured JSON, or TEI XML.',
      },
    ],
  },
];

const KEYBOARD_SHORTCUTS: { keys: string; action: string }[] = [
  { keys: 'Ctrl + Z', action: 'Undo' },
  { keys: 'Ctrl + Y', action: 'Redo' },
  { keys: 'Ctrl + A', action: 'Select all images' },
  { keys: 'Escape', action: 'Deselect all' },
  { keys: 'Delete', action: 'Remove selected images' },
  { keys: 'R', action: 'Rotate selected images' },
  { keys: 'Ctrl + +', action: 'Zoom in' },
  { keys: 'Ctrl + -', action: 'Zoom out' },
  { keys: 'Ctrl + Scroll', action: 'Zoom at cursor' },
  { keys: 'Pinch', action: 'Zoom (touch devices)' },
];

interface LightboxHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LightboxHelpDialog({ open, onOpenChange }: LightboxHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Lightbox Help</DialogTitle>
          <DialogDescription>Toolbar actions, tools, and keyboard shortcuts.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-6">
            {HELP_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.entries.map((entry) => (
                    <div key={entry.label} className="flex items-start gap-3 py-1.5">
                      <div className="shrink-0 mt-0.5 flex h-7 w-7 items-center justify-center rounded border bg-muted">
                        <entry.icon className="h-4 w-4 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{entry.label}</span>
                          {entry.shortcut && (
                            <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono">
                              {entry.shortcut}
                            </kbd>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {KEYBOARD_SHORTCUTS.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">{s.action}</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground font-mono">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tips
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Click an image to select it. Hold Ctrl/Cmd to select multiple.</li>
                <li>Drag images to reposition them on the canvas.</li>
                <li>Use the corner handles on a selected image to resize it.</li>
                <li>
                  Open the <strong>Adjust</strong> dropdown to change opacity, brightness, contrast,
                  and grayscale.
                </li>
                <li>Double-click empty canvas space to create a sticky note.</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
