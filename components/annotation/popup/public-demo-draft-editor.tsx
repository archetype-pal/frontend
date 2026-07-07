'use client';

import type { Allograph } from '@/types/allographs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatAllographLabel } from '@/lib/allograph-labels';

import { ReadOnlyIdentityField } from './read-only-identity-field';

interface PublicDemoDraftEditorProps {
  draftAllographText: string;
  onDraftAllographTextChange: (value: string) => void;
  draftNoteText: string;
  onDraftNoteTextChange: (value: string) => void;
  onCancelDraftAnnotation: () => void;
  onConfirmDraftAnnotation: () => void;
  // When the allograph was pre-chosen from the header dropdown (allograph mode),
  // show Allograph (and Hand) read-only and compact — matching the logged-in
  // editor — rather than the free-text input.
  allographLocked: boolean;
  draftAllographId: number | null;
  allographOptions: Allograph[];
  draftHandId: number | null;
  handOptions: Array<{ id: number; name: string }>;
}

export function PublicDemoDraftEditor({
  draftAllographText,
  onDraftAllographTextChange,
  draftNoteText,
  onDraftNoteTextChange,
  onCancelDraftAnnotation,
  onConfirmDraftAnnotation,
  allographLocked,
  draftAllographId,
  allographOptions,
  draftHandId,
  handOptions,
}: PublicDemoDraftEditorProps) {
  const selectedAllograph =
    draftAllographId != null
      ? (allographOptions.find((allograph) => allograph.id === draftAllographId) ?? null)
      : null;

  const selectedHandName =
    draftHandId != null
      ? (handOptions.find((hand) => hand.id === draftHandId)?.name ?? null)
      : null;

  const allographReadOnly = allographLocked && draftAllographId != null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
        {allographReadOnly ? (
          <div className="space-y-4">
            <ReadOnlyIdentityField
              label="Allograph"
              value={
                selectedAllograph
                  ? formatAllographLabel(selectedAllograph)
                  : draftAllographText || `Allograph ${draftAllographId}`
              }
            />
            {selectedHandName ? (
              <ReadOnlyIdentityField label="Hand" value={selectedHandName} />
            ) : null}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Allograph</label>
            <Input
              value={draftAllographText}
              onChange={(e) => onDraftAllographTextChange(e.target.value)}
              placeholder="Type allograph"
            />
          </div>
        )}

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
