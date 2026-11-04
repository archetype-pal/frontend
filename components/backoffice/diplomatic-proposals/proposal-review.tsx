'use client';

/**
 * One diplomatic proposal, beside the charter text its model read.
 *
 * The reviewer's job is to check the model against the charter, so the text
 * sits next to the answer with every quotation marked where it occurs, and a
 * count of the quotations the text does not contain. In a list answer every
 * item starts ticked, and the reviewer unticks what the charter does not
 * support: only the ticked items are recorded.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, ExternalLink, Info, PenLine, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/backoffice/relative-time';
import { BackofficeInlineError } from '@/components/backoffice/common/query-state';
import { HighlightedText } from '@/components/backoffice/diplomatic-proposals/highlighted-text';
import {
  PayloadView,
  type ItemChoice,
} from '@/components/backoffice/diplomatic-proposals/payload-view';
import {
  PIPELINE_SLUGS,
  chosenItems,
  diplomaticAcceptBlocker,
  isItemised,
  isKnownPipeline,
  isTruncated,
  itemCount,
  proposalQuotes,
} from '@/lib/backoffice/diplomatic-proposal';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { locateAll } from '@/lib/backoffice/quote-finder';
import { cn } from '@/lib/utils';
import {
  acceptDiplomaticProposal,
  getDiplomaticProposal,
  rejectDiplomaticProposal,
} from '@/services/backoffice/diplomatic-proposals';
import type { DiplomaticProposalItem } from '@/types/backoffice';

export function ProposalReview({
  proposal,
  onDecided,
}: {
  proposal: DiplomaticProposalItem;
  /** Called once a decision is recorded, with the proposal it was about. */
  onDecided: (id: number) => void;
}) {
  const t = useTranslations('backoffice.diplomaticProposals');
  const [reason, setReason] = useState('');
  const pending = proposal.status === 'pending';
  const itemised = isItemised(proposal.pipeline);
  const total = itemCount(proposal.pipeline, proposal.payload);
  // Every item starts ticked; the panel is keyed by proposal, so a new one starts afresh.
  const [chosen, setChosen] = useState<ReadonlySet<number>>(
    () => new Set(Array.from({ length: total }, (_, i) => i))
  );
  const choice: ItemChoice | undefined =
    pending && itemised
      ? {
          chosen,
          onToggle: (index) =>
            setChosen((prev) => {
              const next = new Set(prev);
              if (next.has(index)) next.delete(index);
              else next.add(index);
              return next;
            }),
        }
      : undefined;
  const leftOut = itemised ? total - chosen.size : 0;
  const blocker =
    diplomaticAcceptBlocker(proposal) ??
    (itemised && total > 0 && chosen.size === 0 ? 'noneChosen' : null);
  const slug = isKnownPipeline(proposal.pipeline) ? PIPELINE_SLUGS[proposal.pipeline] : null;
  const { source } = proposal;

  const detail = useQuery({
    queryKey: backofficeKeys.diplomaticProposals.detail(proposal.id),
    queryFn: () => getDiplomaticProposal(proposal.id),
    enabled: source != null,
  });
  const text = source != null ? (detail.data?.source_text ?? null) : null;

  const quotes = useMemo(
    () => proposalQuotes(proposal.pipeline, proposal.payload),
    [proposal.pipeline, proposal.payload]
  );
  const located = useMemo(() => (text == null ? null : locateAll(text, quotes)), [text, quotes]);
  const missing = located ? located.found.filter((f) => !f).length : 0;

  const accept = useMutation({
    mutationFn: () =>
      acceptDiplomaticProposal(proposal.id, itemised ? chosenItems(chosen, total) : undefined),
    onSuccess: ({ created }) => {
      toast.success(t('toastAccepted', { created }));
      onDecided(proposal.id);
    },
    onError: (err) => toastApiError(t('toastAcceptFailed'), err),
  });
  const reject = useMutation({
    mutationFn: () => rejectDiplomaticProposal(proposal.id, reason.trim()),
    onSuccess: () => {
      toast.success(t('toastRejected'));
      onDecided(proposal.id);
    },
    onError: (err) => toastApiError(t('toastRejectFailed'), err),
  });
  const deciding = accept.isPending || reject.isPending;

  return (
    <article
      aria-labelledby={`proposal-${proposal.id}-heading`}
      className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm xl:grid-cols-2"
    >
      <div className="min-w-0 space-y-4">
        <header className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{slug ? t(`pipeline.${slug}`) : proposal.pipeline}</Badge>
            <span className="font-mono text-xs text-muted-foreground">{proposal.pipeline}</span>
            {proposal.confidence != null && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {t('confidence', {
                  value: Math.round(Math.min(1, Math.max(0, proposal.confidence)) * 100),
                })}
              </span>
            )}
            <span className="text-xs tabular-nums text-muted-foreground">#{proposal.id}</span>
          </div>
          <h2 id={`proposal-${proposal.id}-heading`} className="text-lg font-semibold">
            {source?.label ?? t('sourceGoneTitle', { id: proposal.source_id })}
          </h2>
          {source && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <Link
                href={`/manuscripts/${source.item_part}/images/${source.item_image}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                {t('openViewer')}
                <ExternalLink className="h-3 w-3" aria-hidden />
                <span className="sr-only">{t('opensInNewTab')}</span>
              </Link>
              <Link
                href={`/backoffice/image-texts/${source.image_text}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <PenLine className="h-3 w-3" aria-hidden />
                {t('openText')}
              </Link>
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {proposal.model_name
              ? t('proposedBy', { model: proposal.model_name })
              : t('proposedByUnknown')}{' '}
            · <RelativeTime iso={proposal.created} />
          </p>
        </header>

        <section aria-label={t('answerLabel')}>
          <PayloadView
            pipeline={proposal.pipeline}
            payload={proposal.payload}
            text={text}
            catalogueDate={source?.date ?? ''}
            choice={choice}
            dropped={proposal.dropped_items}
          />
        </section>

        {pending ? (
          <section aria-label={t('decisionLabel')} className="space-y-2 border-t pt-3">
            {blocker ? (
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t(blocker)}
              </p>
            ) : (
              slug && (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    {t(`acceptNote.${slug}`, { count: itemised ? chosen.size : total })}
                    {leftOut > 0 && <> {t('leavesOut', { count: leftOut })}</>}
                  </span>
                </p>
              )
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="h-8 gap-1"
                onClick={() => accept.mutate()}
                disabled={deciding || blocker != null}
              >
                <CheckCircle className="h-3.5 w-3.5" aria-hidden />
                {accept.isPending ? t('accepting') : t('accept')}
              </Button>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={2000}
                placeholder={t('reasonPlaceholder')}
                aria-label={t('reasonLabel', { id: proposal.id })}
                className="h-8 min-w-40 flex-1 rounded-md border bg-background px-2 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => reject.mutate()}
                disabled={deciding}
              >
                <XCircle className="h-3.5 w-3.5" aria-hidden />
                {reject.isPending ? t('rejecting') : t('reject')}
              </Button>
            </div>
          </section>
        ) : (
          <div className="border-t pt-3 text-xs text-muted-foreground">
            <Badge
              variant={proposal.status === 'accepted' ? 'default' : 'secondary'}
              className="mr-2"
            >
              {proposal.status === 'accepted' ? t('badgeAccepted') : t('badgeRejected')}
            </Badge>
            {proposal.status === 'accepted'
              ? t('acceptedBy', { name: proposal.reviewer_username || t('someone') })
              : t('rejectedBy', { name: proposal.reviewer_username || t('someone') })}
            {proposal.reviewed && (
              <>
                {' '}
                · <RelativeTime iso={proposal.reviewed} />
              </>
            )}
            {proposal.status === 'accepted' && proposal.dropped_items.length > 0 && (
              <> · {t('leftOutCount', { count: proposal.dropped_items.length })}</>
            )}
            {proposal.reason && <> · “{proposal.reason}”</>}
          </div>
        )}
      </div>

      <section aria-labelledby={`proposal-${proposal.id}-text`} className="min-w-0 space-y-2">
        <h3
          id={`proposal-${proposal.id}-text`}
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {t('charterText')}
        </h3>
        {source == null ? (
          <p className="text-sm text-muted-foreground">{t('sourceGoneText')}</p>
        ) : detail.isError ? (
          <BackofficeInlineError
            message={t('textFailed')}
            retrying={detail.isFetching}
            onRetry={() => void detail.refetch()}
          />
        ) : text == null ? (
          <p className="text-sm text-muted-foreground">{t('textLoading')}</p>
        ) : (
          <>
            {quotes.length > 0 && (
              <p
                className={cn(
                  'text-xs',
                  missing > 0
                    ? 'font-medium text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground'
                )}
              >
                {t('quotesFound', { found: quotes.length - missing, total: quotes.length })}
              </p>
            )}
            {isTruncated(text) && <p className="text-xs text-muted-foreground">{t('truncated')}</p>}
            <div className="max-h-[32rem] overflow-y-auto rounded-md border bg-muted/20 p-3 font-serif text-sm leading-relaxed">
              <HighlightedText text={text} ranges={located?.ranges ?? []} />
            </div>
          </>
        )}
      </section>
    </article>
  );
}
