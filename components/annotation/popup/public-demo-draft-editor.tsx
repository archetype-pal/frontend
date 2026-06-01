'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PublicDemoDraftEditorProps {
  draftAllographText: string;
  onDraftAllographTextChange: (value: string) => void;
  draftNoteText: string;
  onDraftNoteTextChange: (value: string) => void;
  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;
}

export function PublicDemoDraftEditor({
  draftAllographText,
  onDraftAllographTextChange,
  draftNoteText,
  onDraftNoteTextChange,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
}: PublicDemoDraftEditorProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Allograph</label>
          <Input
            value={draftAllographText}
            onChange={(e) => onDraftAllographTextChange(e.target.value)}
            placeholder="Type allograph"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Note</label>
          <textarea
            value={draftNoteText}
            onChange={(e) => onDraftNoteTextChange(e.target.value)}
            placeholder="Type note"
            rows={5}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <Button variant="ghost" onClick={onCancelDraftAnnotation} type="button">
          Cancel
        </Button>
        <Button onClick={onConfirmDraftAnnotation} type="button">
          OK
        </Button>
      </div>
    </div>
  );
}
