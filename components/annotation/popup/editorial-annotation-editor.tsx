'use client';

import { Button } from '@/components/ui/button';

interface EditorialAnnotationEditorProps {
  isExisting: boolean;
  hasLocalChanges: boolean;
  draftInternalNoteText: string;
  onDraftInternalNoteTextChange: (value: string) => void;
  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;
}

export function EditorialAnnotationEditor({
  isExisting,
  hasLocalChanges,
  draftInternalNoteText,
  onDraftInternalNoteTextChange,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
}: EditorialAnnotationEditorProps) {
  return (
    <div className="max-h-[360px] overflow-auto px-4 py-4 space-y-4">
      {isExisting ? (
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Press OK to keep changes local for the main toolbar Save, or use Save Annotation in this
          popup header to save immediately.
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Internal note</label>
        <textarea
          value={draftInternalNoteText}
          onChange={(e) => onDraftInternalNoteTextChange(e.target.value)}
          placeholder="Type internal note"
          rows={4}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="mt-2 flex items-center justify-end gap-2 border-t pt-3">
        <Button variant="ghost" onClick={onCancelDraftAnnotation} type="button">
          Cancel
        </Button>
        <Button
          onClick={onConfirmDraftAnnotation}
          disabled={isExisting && !hasLocalChanges}
          type="button"
        >
          OK
        </Button>
      </div>
    </div>
  );
}
