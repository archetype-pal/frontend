'use client';

/**
 * Proposing one page's letters with the letter models (AI programme W1.1),
 * from the page's own dialog in the manuscript workspace.
 *
 * A user's decision, page by page: each page has its own button. The models
 * run in a worker on this server, and what they find goes to the review queue.
 * The workspace follows every request under way, its own or another's, and
 * says when each is done, with a link to its proposals in the queue.
 */

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ScanText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/backoffice/relative-time';
import { useAuth } from '@/contexts/auth-context';
import { BackofficeApiError } from '@/services/backoffice/api-client';
import { getMLJobSummary } from '@/services/backoffice/ml-jobs';
import {
  fetchLatestPageLetters,
  fetchLettersUnderWay,
  fetchPageLetters,
  isUnderWay,
  requestPageLetters,
} from '@/services/backoffice/page-letters';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { LetterRequest } from '@/types/backoffice';

const POLL_MS = 4000;

/**
 * The requests under way, by page, followed until each is done; and whether
 * proposing letters is switched on (undefined until known).
 */
export function useLettersUnderWay() {
  const t = useTranslations('backoffice.pageLetters');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Proposing letters is a manager's request; nobody else is asked to follow one.
  const canManage = Boolean(user?.capabilities?.manage);

  const { data: summary } = useQuery({
    queryKey: backofficeKeys.mlJobs.summary(),
    queryFn: getMLJobSummary,
    enabled: canManage,
  });
  // Self-hosted: the hosted switch does not apply. Whether the reader has
  // letter models is known only on asking, and the request says so.
  const lettersOn = summary ? summary.inference_enabled : undefined;

  const { data: underWay } = useQuery({
    queryKey: backofficeKeys.pageLetters.active(),
    queryFn: fetchLettersUnderWay,
    enabled: canManage,
    refetchInterval: (query) => (query.state.data?.length ? POLL_MS : false),
    refetchIntervalInBackground: true,
  });

  // A request that was under way and no longer is has finished: say how.
  const following = useRef(new Map<number, LetterRequest>());
  useEffect(() => {
    if (!underWay) return;
    const now = new Map(underWay.map((run) => [run.id, run]));
    const finished = [...following.current.values()].filter((run) => !now.has(run.id));
    following.current = now;
    if (finished.length === 0) return;

    void queryClient.invalidateQueries({ queryKey: backofficeKeys.annotationProposals.all() });
    for (const run of finished) {
      void queryClient.invalidateQueries({
        queryKey: backofficeKeys.pageLetters.page(run.item_image),
      });
      void fetchPageLetters(run.item_image)
        .then((latest) => {
          const page = latest.item_image;
          if (latest.status === 'proposed' && latest.proposed > 0 && latest.ml_job) {
            const job = latest.ml_job;
            toast.success(t('toastProposed', { id: page, count: latest.proposed }), {
              duration: 15_000,
              action: {
                label: t('toastReview'),
                onClick: () => router.push(`/backoffice/annotation-proposals?ml_job=${job}`),
              },
            });
          } else if (latest.status === 'proposed') {
            toast.info(t('toastNone', { id: page }), {
              description: t('toastNoneDescription', { found: latest.found }),
            });
          } else if (latest.status === 'refused') {
            toast.error(t('toastRefused', { id: page }), { description: latest.error });
          } else if (latest.status === 'failed') {
            toast.error(t('toastFailed', { id: page }), { description: latest.error });
          }
        })
        .catch(() => {
          // The queue is refreshed either way; the outcome is in the model runs.
        });
    }
  }, [underWay, queryClient, router, t]);

  const byPage = new Map((underWay ?? []).map((run) => [run.item_image, run]));
  return { byPage, lettersOn, canManage };
}

/** Follow a request just made, or one found already under way. */
function useFollowLetters() {
  const queryClient = useQueryClient();
  return (run: LetterRequest) => {
    if (!isUnderWay(run)) return;
    queryClient.setQueryData<LetterRequest[]>(backofficeKeys.pageLetters.active(), (current) =>
      current?.some((r) => r.id === run.id) ? current : [...(current ?? []), run]
    );
  };
}

/**
 * The page dialog's section: what proposing its letters does, the button that
 * asks, and how the last request went. The outcome is said here as well as in
 * a toast, because a toast's link cannot be followed while a dialog is open.
 */
export function PageLettersSection({
  pageId,
  run,
  lettersOn,
}: {
  pageId: number;
  run: LetterRequest | undefined;
  lettersOn: boolean | undefined;
}) {
  const t = useTranslations('backoffice.pageLetters');
  const follow = useFollowLetters();
  const { data: latest } = useQuery({
    queryKey: backofficeKeys.pageLetters.page(pageId),
    queryFn: () => fetchLatestPageLetters(pageId),
  });

  const ask = useMutation({
    mutationFn: () => requestPageLetters(pageId),
    onSuccess: (queued) => {
      follow(queued);
      toast.info(t('toastQueued', { id: pageId }));
    },
    onError: (err) => {
      const body = err instanceof BackofficeApiError ? err.body : {};
      if (body.run && typeof body.run === 'object') {
        // Someone asked first: follow theirs.
        follow(body.run as LetterRequest);
        toast.info(t('toastAlready', { id: pageId }));
        return;
      }
      const detail = typeof body.detail === 'string' ? body.detail : undefined;
      toast.error(t('toastAskFailed', { id: pageId }), { description: detail });
    },
  });

  const off = lettersOn === false;
  const working = (run && isUnderWay(run)) || ask.isPending;
  return (
    <section className="space-y-2 rounded-md border bg-muted/30 p-3">
      <h3 className="text-xs font-medium">{t('title')}</h3>
      <p className="text-xs text-muted-foreground">{t('intro')}</p>
      {working ? (
        <span
          className="inline-flex h-7 items-center gap-1 text-xs text-muted-foreground"
          title={t('workingTitle')}
          role="status"
        >
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          {t('working')}
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={off}
            onClick={() => ask.mutate()}
          >
            <ScanText className="h-3 w-3" aria-hidden />
            {t('button')}
          </Button>
          {off && <span className="text-xs text-muted-foreground">{t('off')}</span>}
        </div>
      )}
      {!working && latest && !isUnderWay(latest) && <LastRequest run={latest} />}
    </section>
  );
}

/** How the page's last request went, with a link to its proposals. */
function LastRequest({ run }: { run: LetterRequest }) {
  const t = useTranslations('backoffice.pageLetters');
  const when = <RelativeTime iso={run.updated} />;
  if (run.status === 'proposed' && run.proposed > 0 && run.ml_job) {
    return (
      <p className="text-xs text-muted-foreground">
        {t('lastProposed', { count: run.proposed })} · {when} ·{' '}
        <Link
          href={`/backoffice/annotation-proposals?ml_job=${run.ml_job}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('lastReview')}
        </Link>
      </p>
    );
  }
  if (run.status === 'proposed') {
    return (
      <p className="text-xs text-muted-foreground">
        {t('lastNone')} · {when}
      </p>
    );
  }
  return (
    <p className="text-xs text-destructive">
      {t('lastFailed', { error: run.error })} · {when}
    </p>
  );
}
