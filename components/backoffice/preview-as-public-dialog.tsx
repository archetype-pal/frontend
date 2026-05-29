'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ImageTextViewer } from '@/components/text/image-text-viewer';
import { fetchImageText, type ImageTextStatus } from '@/services/image-texts';

// Mirrors the backend's public visibility rule (ImageTextViewSet.get_queryset):
// anonymous visitors only ever see Live/Reviewed texts.
const PUBLIC_STATUSES: ReadonlySet<ImageTextStatus> = new Set(['Live', 'Reviewed']);

interface PreviewAsPublicDialogProps {
  textId: number;
  currentStatus: ImageTextStatus;
}

/**
 * Editor tool — fetches this image-text through the *public* endpoint with no
 * auth token, so an editor can confirm exactly what an anonymous visitor sees
 * (and that draft/review content is correctly hidden). Cross-checks the actual
 * public response against the expected visibility so a server-side mismatch
 * surfaces instead of silently passing.
 */
export function PreviewAsPublicDialog({ textId, currentStatus }: PreviewAsPublicDialogProps) {
  const [open, setOpen] = React.useState(false);

  const { data, isFetching, isError } = useQuery({
    queryKey: ['preview-as-public', textId],
    // No token → the request is anonymous, exactly like a logged-out visitor.
    queryFn: () => fetchImageText(textId),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });

  const expectedVisible = PUBLIC_STATUSES.has(currentStatus);
  const actuallyVisible = data != null;
  const mismatch = !isFetching && !isError && actuallyVisible !== expectedVisible;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="See what an anonymous visitor sees">
          <Eye className="mr-1 h-3.5 w-3.5" />
          Preview as public
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview as anonymous visitor</DialogTitle>
          <DialogDescription>
            Fetched through the public API with no login — only Live and Reviewed texts are shown to
            anonymous visitors.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            Could not reach the public endpoint. Try again.
          </div>
        ) : (
          <div className="space-y-3">
            {mismatch ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Unexpected: status is <strong>{currentStatus}</strong> but the public endpoint{' '}
                  {actuallyVisible ? 'returned content' : 'returned nothing'}. The visibility rule
                  may be misconfigured on the server.
                </span>
              </div>
            ) : null}

            {actuallyVisible ? (
              <>
                <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-50 p-2.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-200">
                  <Eye className="h-4 w-4" />
                  Visible to the public ({currentStatus})
                </div>
                <ImageTextViewer html={data!.content} />
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4 shrink-0" />
                <span>
                  Not shown to anonymous visitors — this text is <strong>{currentStatus}</strong>.
                  Move it to <strong>Live</strong> or <strong>Reviewed</strong> to publish it.
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
