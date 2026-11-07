'use client';

/**
 * Drafting one page's transcription with a model (AI programme W1.4), from
 * the list of pages that have none.
 *
 * Drafting is a user's decision, page by page: each row has its own button,
 * and each asks first, with the page in view, what the draft will be and
 * what it costs. A draft takes a minute or two in a worker. The list follows
 * every draft under way, its own or another's, and says when each is done.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { IiifImage } from '@/components/ui/iiif-image';
import { useAuth } from '@/contexts/auth-context';
import { refusalCode, useRefusalWords } from '@/lib/refusal';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import { getMLJobSummary } from '@/services/backoffice/ml-jobs';
import {
  fetchDraftsUnderWay,
  fetchPageDraft,
  isUnderWay,
  requestPageDraft,
} from '@/services/backoffice/page-drafts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { PageDraft } from '@/types/backoffice';
import { getIiifImageUrl } from '@/utils/iiif';

const POLL_MS = 4000;

export interface DraftablePage {
  id: number;
  image: string | null;
  locus: string;
  label?: string;
}

/**
 * The drafts under way, by page, followed until each is done; and whether
 * drafting is switched on (undefined until known).
 */
export function useDraftsUnderWay() {
  const t = useTranslations('backoffice.pageDraft');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: summary } = useQuery({
    queryKey: backofficeKeys.mlJobs.summary(),
    queryFn: getMLJobSummary,
    enabled: isAuthenticated,
  });
  const draftingOn = summary
    ? summary.inference_enabled && summary.hosted_providers_enabled
    : undefined;

  const { data: underWay } = useQuery({
    queryKey: backofficeKeys.pageDrafts.active(),
    queryFn: fetchDraftsUnderWay,
    enabled: isAuthenticated,
    refetchInterval: (query) => (query.state.data?.length ? POLL_MS : false),
    refetchIntervalInBackground: true,
  });

  // A draft that was under way and no longer is has finished: say how.
  const following = useRef(new Map<number, PageDraft>());
  useEffect(() => {
    if (!underWay) return;
    const now = new Map(underWay.map((draft) => [draft.id, draft]));
    const finished = [...following.current.values()].filter((draft) => !now.has(draft.id));
    following.current = now;
    if (finished.length === 0) return;

    void queryClient.invalidateQueries({ queryKey: backofficeKeys.uncoveredImages.all() });
    void queryClient.invalidateQueries({ queryKey: backofficeKeys.textsMonitor.overview() });
    void queryClient.invalidateQueries({ queryKey: backofficeKeys.imageTexts.all() });
    for (const draft of finished) {
      void fetchPageDraft(draft.item_image)
        .then((latest) => {
          const page = latest.item_image;
          if (latest.status === 'drafted' && latest.image_text) {
            const textId = latest.image_text;
            toast.success(t('toastDrafted', { id: page }), {
              duration: 15_000,
              action: {
                label: t('toastOpen'),
                onClick: () => router.push(`/backoffice/image-texts/${textId}`),
              },
            });
          } else if (latest.status === 'refused') {
            toast.error(t('toastRefused', { id: page }), { description: latest.error });
          } else if (latest.status === 'failed') {
            toast.error(t('toastFailed', { id: page }), { description: latest.error });
          }
        })
        .catch(() => {
          // The list is refreshed either way; the outcome is in the model runs.
        });
    }
  }, [underWay, queryClient, router, t]);

  const byPage = new Map((underWay ?? []).map((draft) => [draft.item_image, draft]));
  return { byPage, draftingOn };
}

/** Follow a draft just asked for, or one found already under way. */
function useFollowDraft() {
  const queryClient = useQueryClient();
  return (draft: PageDraft) => {
    if (!isUnderWay(draft)) return;
    queryClient.setQueryData<PageDraft[]>(backofficeKeys.pageDrafts.active(), (current) =>
      current?.some((d) => d.id === draft.id) ? current : [...(current ?? []), draft]
    );
  };
}

export function PageDraftButton({
  page,
  draft,
  draftingOn,
}: {
  page: DraftablePage;
  draft: PageDraft | undefined;
  draftingOn: boolean | undefined;
}) {
  const t = useTranslations('backoffice.pageDraft');
  const [open, setOpen] = useState(false);

  if (draft && isUnderWay(draft)) {
    return (
      <span
        className="inline-flex h-7 items-center gap-1 px-2 text-xs text-muted-foreground"
        title={t('draftingTitle')}
        role="status"
      >
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {t('drafting')}
      </span>
    );
  }

  const off = draftingOn === false;
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        disabled={off}
        title={off ? t('off') : t('buttonTitle')}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="mr-1 h-3 w-3" aria-hidden />
        {t('button')}
      </Button>
      {open && <PageDraftDialog page={page} open={open} onOpenChange={setOpen} />}
    </>
  );
}

export function PageDraftDialog({
  page,
  open,
  onOpenChange,
}: {
  page: DraftablePage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('backoffice.pageDraft');
  const refusalWords = useRefusalWords();
  const router = useRouter();
  const follow = useFollowDraft();

  const ask = useMutation({
    mutationFn: () => requestPageDraft(page.id),
    onSuccess: (draft) => {
      follow(draft);
      toast.info(t('toastQueued', { id: page.id }));
      onOpenChange(false);
    },
    onError: (err) => {
      onOpenChange(false);
      const body = err instanceof BackofficeApiError ? err.body : {};
      const detail = refusalWords(
        refusalCode(body),
        typeof body.detail === 'string' ? body.detail : ''
      );
      if (body.draft && typeof body.draft === 'object') {
        // Someone asked first: follow theirs.
        follow(body.draft as PageDraft);
        toast.info(t('toastAlreadyDrafting', { id: page.id }));
        return;
      }
      if (typeof body.image_text === 'number') {
        const textId = body.image_text;
        toast.error(t('toastHasTranscription', { id: page.id }), {
          action: {
            label: t('toastOpenTranscription'),
            onClick: () => router.push(`/backoffice/image-texts/${textId}`),
          },
        });
        return;
      }
      toast.error(t('toastAskFailed', { id: page.id }), { description: detail || undefined });
    },
  });

  const preview = page.image ? getIiifImageUrl(page.image, { maxSize: 900 }) : null;
  return (
    <Dialog open={open} onOpenChange={(next) => !ask.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle', { id: page.id })}</DialogTitle>
          <DialogDescription>
            {[page.label, page.locus || t('noLocus')].filter(Boolean).join(' · ')}
          </DialogDescription>
        </DialogHeader>
        {preview && (
          <div className="relative h-72 w-full overflow-hidden rounded-md border bg-muted">
            <IiifImage
              src={preview}
              alt={t('previewAlt', { id: page.id })}
              fill
              sizes="480px"
              className="object-contain"
            />
          </div>
        )}
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>{t('dialogReader')}</li>
          <li>{t('dialogCost')}</li>
          <li>{t('dialogReview')}</li>
        </ul>
        <DialogFooter className="mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={ask.isPending}
          >
            {t('dialogCancel')}
          </Button>
          <Button size="sm" onClick={() => ask.mutate()} disabled={ask.isPending}>
            {ask.isPending ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
            )}
            {t('dialogConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
