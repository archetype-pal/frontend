'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('backoffice');
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
        <Button variant="outline" size="sm" title={t('previewAsPublic.triggerTitle')}>
          <Eye className="mr-1 h-3.5 w-3.5" />
          {t('previewAsPublic.triggerLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('previewAsPublic.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('previewAsPublic.dialogDescription')}</DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {t('previewAsPublic.fetchError')}
          </div>
        ) : (
          <div className="space-y-3">
            {mismatch ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-400/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {t.rich('previewAsPublic.mismatch', {
                    status: currentStatus,
                    result: actuallyVisible ? 'content' : 'nothing',
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </span>
              </div>
            ) : null}

            {actuallyVisible ? (
              <>
                <div className="flex items-center gap-2 rounded-md border border-green-500/40 bg-green-50 p-2.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-200">
                  <Eye className="h-4 w-4" />
                  {t('previewAsPublic.visible', { status: currentStatus })}
                </div>
                <ImageTextViewer html={data!.content} />
              </>
            ) : (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4 shrink-0" />
                <span>
                  {t.rich('previewAsPublic.notVisible', {
                    status: currentStatus,
                    strong: (chunks) => <strong>{chunks}</strong>,
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
