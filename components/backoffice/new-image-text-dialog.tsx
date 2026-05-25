'use client';

/**
 * Shared "+ New image-text" dialog.
 *
 * Two entry points use this:
 *   - the texts list toolbar ("+ New" with manual item_image input)
 *   - the uncovered-images drilldown ("+ Transcription" / "+ Translation"
 *     buttons that pre-fill item_image and type)
 *
 * The (item_image, type) uniqueness constraint is enforced in the DB;
 * any 4xx response is surfaced verbatim instead of being swallowed so
 * the editor sees "already exists" cleanly.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { createImageText } from '@/services/image-texts';

export type NewTextKind = 'Transcription' | 'Translation';

export interface NewImageTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill the image id (e.g. from "+ Transcription" on uncovered list). */
  defaultItemImage?: number | null;
  defaultType?: NewTextKind;
  /** Lock the item-image input — used for quick-create from uncovered list. */
  lockItemImage?: boolean;
  /** Lock the type field — used when entry point implies kind. */
  lockType?: boolean;
}

export function NewImageTextDialog({
  open,
  onOpenChange,
  defaultItemImage = null,
  defaultType = 'Transcription',
  lockItemImage = false,
  lockType = false,
}: NewImageTextDialogProps) {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  // One state object so the open-reset effect performs a single setState
  // call (the lint rule guards against multi-step in-effect cascades, not
  // a single one).
  const [form, setForm] = useState({
    itemImage: defaultItemImage ? String(defaultItemImage) : '',
    type: defaultType,
    language: '',
  });
  const { itemImage, type, language } = form;

  // Re-prime fields each time the dialog reopens — without this, opening
  // it twice in a row would carry over the previous attempt's input.
  useEffect(() => {
    if (!open) return;
    setForm({
      // eslint-disable-line react-hooks/set-state-in-effect
      itemImage: defaultItemImage ? String(defaultItemImage) : '',
      type: defaultType,
      language: '',
    });
  }, [open, defaultItemImage, defaultType]);

  const createMut = useMutation({
    mutationFn: () =>
      createImageText(token!, {
        item_image: Number(itemImage),
        type,
        language,
      }),
    onSuccess: (saved) => {
      toast.success(`Created ${saved.type.toLowerCase()} #${saved.id}`);
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'image-texts', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'texts-monitor', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['backoffice', 'uncovered-images'] });
      onOpenChange(false);
      router.push(`/backoffice/image-texts/${saved.id}`);
    },
    onError: (err: Error) => {
      // Surface the API message (item_image FK error, uniqueness
      // constraint, etc.) so the editor knows what to fix without
      // diving into devtools.
      toast.error('Create failed', { description: err.message.slice(0, 240) });
    },
  });

  const itemImageNumber = Number(itemImage);
  const canSubmit =
    !!token &&
    Number.isFinite(itemImageNumber) &&
    itemImageNumber > 0 &&
    !!type &&
    !createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New image-text</DialogTitle>
          <DialogDescription>
            Creates a Draft. You can fill content and edit on the next screen.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-text-image">Item image id</Label>
            <Input
              id="new-text-image"
              inputMode="numeric"
              value={itemImage}
              onChange={(e) =>
                setForm((f) => ({ ...f, itemImage: e.target.value.replace(/[^0-9]/g, '') }))
              }
              disabled={lockItemImage}
              placeholder="e.g. 5504"
            />
            <p className="text-[11px] text-muted-foreground">
              Find ids in the manuscript editor or the Uncovered images list.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as NewTextKind }))}
                disabled={lockType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transcription">Transcription</SelectItem>
                  <SelectItem value="Translation">Translation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-text-lang">Language</Label>
              <Input
                id="new-text-lang"
                value={language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                placeholder="la, en, enm…"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={createMut.isPending}
          >
            Cancel
          </Button>
          <Button size="sm" disabled={!canSubmit} onClick={() => createMut.mutate()}>
            {createMut.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
