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
import { useTranslations } from 'next-intl';

interface HelpEntry {
  icon: LucideIcon;
  label: string;
  description: string;
  shortcut?: string;
}

interface LightboxHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LightboxHelpDialog({ open, onOpenChange }: LightboxHelpDialogProps) {
  const t = useTranslations('lightbox');

  const helpSections: { title: string; entries: HelpEntry[] }[] = [
    {
      title: t('help.sectionZoom'),
      entries: [
        { icon: ZoomOut, label: t('help.zoomOutLabel'), description: t('help.zoomOutDesc'), shortcut: 'Ctrl + -' },
        { icon: ZoomIn, label: t('help.zoomInLabel'), description: t('help.zoomInDesc'), shortcut: 'Ctrl + +' },
      ],
    },
    {
      title: t('help.sectionTransform'),
      entries: [
        { icon: RotateCw, label: t('help.rotateLabel'), description: t('help.rotateDesc'), shortcut: 'R' },
        { icon: FlipHorizontal, label: t('help.flipHorizontalLabel'), description: t('help.flipHorizontalDesc') },
        { icon: FlipVertical, label: t('help.flipVerticalLabel'), description: t('help.flipVerticalDesc') },
      ],
    },
    {
      title: t('help.sectionLayerOrder'),
      entries: [
        { icon: ArrowUpToLine, label: t('help.bringToFrontLabel'), description: t('help.bringToFrontDesc') },
        { icon: ChevronUp, label: t('help.moveUpLabel'), description: t('help.moveUpDesc') },
        { icon: ChevronDown, label: t('help.moveDownLabel'), description: t('help.moveDownDesc') },
        { icon: ArrowDownToLine, label: t('help.sendToBackLabel'), description: t('help.sendToBackDesc') },
      ],
    },
    {
      title: t('help.sectionTools'),
      entries: [
        { icon: Crop, label: t('help.cropLabel'), description: t('help.cropDesc') },
        { icon: Ruler, label: t('help.measurementLabel'), description: t('help.measurementDesc') },
        { icon: MessageSquare, label: t('help.annotationsLabel'), description: t('help.annotationsDesc') },
        { icon: StickyNote, label: t('help.stickyNoteLabel'), description: t('help.stickyNoteDesc') },
      ],
    },
    {
      title: t('help.sectionView'),
      entries: [
        { icon: Grid3x3, label: t('help.toggleGridHelpLabel'), description: t('help.toggleGridHelpDesc') },
        { icon: Map, label: t('help.minimapLabel'), description: t('help.minimapDesc') },
        { icon: Maximize2, label: t('help.fullscreenLabel'), description: t('help.fullscreenDesc') },
      ],
    },
    {
      title: t('help.sectionCompare'),
      entries: [
        { icon: Split, label: t('help.compareImagesLabel'), description: t('help.compareImagesDesc') },
        { icon: Layers, label: t('help.compareRegionsLabel'), description: t('help.compareRegionsDesc') },
      ],
    },
    {
      title: t('help.sectionHistory'),
      entries: [
        { icon: Undo2, label: t('help.undoLabel'), description: t('help.undoDesc'), shortcut: 'Ctrl + Z' },
        { icon: Redo2, label: t('help.redoLabel'), description: t('help.redoDesc'), shortcut: 'Ctrl + Y' },
      ],
    },
    {
      title: t('help.sectionFile'),
      entries: [
        { icon: Upload, label: t('help.importLabel'), description: t('help.importDesc') },
        { icon: Save, label: t('help.saveSessionLabel'), description: t('help.saveSessionDesc') },
        { icon: Download, label: t('help.exportLabel'), description: t('help.exportDesc') },
      ],
    },
  ];

  const keyboardShortcuts = [
    { keys: 'Ctrl + Z', action: t('help.shortcutUndo') },
    { keys: 'Ctrl + Y', action: t('help.shortcutRedo') },
    { keys: 'Ctrl + A', action: t('help.shortcutSelectAll') },
    { keys: 'Escape', action: t('help.shortcutDeselect') },
    { keys: 'Delete', action: t('help.shortcutRemove') },
    { keys: 'R', action: t('help.shortcutRotate') },
    { keys: 'Ctrl + +', action: t('help.shortcutZoomIn') },
    { keys: 'Ctrl + -', action: t('help.shortcutZoomOut') },
    { keys: 'Ctrl + Scroll', action: t('help.shortcutZoomCursor') },
    { keys: 'Pinch', action: t('help.shortcutZoomTouch') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t('help.title')}</DialogTitle>
          <DialogDescription>{t('help.description')}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="space-y-6">
            {helpSections.map((section) => (
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
                {t('help.keyboardShortcutsTitle')}
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {keyboardShortcuts.map((s) => (
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
                {t('help.tipsTitle')}
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>{t('help.tip1')}</li>
                <li>{t('help.tip2')}</li>
                <li>{t('help.tip3')}</li>
                <li>
                  {t('help.tip4')}
                </li>
                <li>{t('help.tip5')}</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
