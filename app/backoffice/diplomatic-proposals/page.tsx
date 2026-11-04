'use client';

/**
 * `/backoffice/diplomatic-proposals`: the review queue for what models have
 * read in the charter texts (AI programme Phases 2–3): entities, formulae,
 * translation drafts, dating flags and relations.
 *
 * Each needs reading against its charter, so this is an inbox rather than a
 * table: a list of proposals, and the selected one beside its text. There is
 * deliberately no bulk accept. A batch of extractions approved unread would
 * put a model's guesses into the record under a reviewer's name.
 */

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, ScanText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { BackofficeErrorState } from '@/components/backoffice/common/query-state';
import { RelativeTime } from '@/components/backoffice/relative-time';
import { ProposalReview } from '@/components/backoffice/diplomatic-proposals/proposal-review';
import { useAuth } from '@/contexts/auth-context';
import {
  DIPLOMATIC_PIPELINES,
  type DiplomaticPipeline,
  PIPELINE_SLUGS,
  isKnownPipeline,
  itemCount,
} from '@/lib/backoffice/diplomatic-proposal';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { cn } from '@/lib/utils';
import {
  getDiplomaticProposalDepth,
  getDiplomaticProposals,
} from '@/services/backoffice/diplomatic-proposals';
import type { DiplomaticProposalItem, GraphProposalStatus } from '@/types/backoffice';

const PAGE_SIZE = 25;

type PipelineFilter = 'all' | DiplomaticPipeline;

export default function DiplomaticProposalsPage() {
  const t = useTranslations('backoffice.diplomaticProposals');
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<GraphProposalStatus>('pending');
  const [pipeline, setPipeline] = useState<PipelineFilter>('all');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const params = {
    status,
    pipeline: pipeline === 'all' ? undefined : pipeline,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: backofficeKeys.diplomaticProposals.list(params),
    queryFn: () => getDiplomaticProposals(params),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
  const { data: depth } = useQuery({
    queryKey: backofficeKeys.diplomaticProposals.depth(),
    queryFn: getDiplomaticProposalDepth,
    enabled: isAuthenticated,
    retry: false,
  });
  const rows = useMemo(() => data?.results ?? [], [data]);
  const total = data?.count ?? 0;
  const current = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  const resetTo = (change: () => void) => {
    change();
    setPage(0);
    setSelectedId(null);
  };

  // Move on to the next proposal, so a reviewer working down the queue never
  // has to go back to the list; then refresh it, and the sidebar's count.
  const onDecided = (id: number) => {
    const at = rows.findIndex((r) => r.id === id);
    const next = rows[at + 1] ?? rows[at - 1] ?? null;
    setSelectedId(next?.id ?? null);
    void queryClient.invalidateQueries({ queryKey: backofficeKeys.diplomaticProposals.all() });
  };

  const pipelineOption = (key: PipelineFilter) => {
    const name = key === 'all' ? t('filterAll') : t(`pipeline.${PIPELINE_SLUGS[key]}`);
    const count = key === 'all' ? depth?.pending : depth?.by_pipeline[key];
    return {
      value: key,
      label:
        status === 'pending' && count != null ? (
          <>
            {name} <span className="tabular-nums opacity-70">{count}</span>
          </>
        ) : (
          name
        ),
      ariaLabel:
        status === 'pending' && count != null ? t('filterWithCount', { name, count }) : name,
    };
  };

  const emptyMessage = {
    pending: t('emptyPending'),
    accepted: t('emptyAccepted'),
    rejected: t('emptyRejected'),
  }[status];

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <ScanText className="mt-1 h-6 w-6 text-primary" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('intro')}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<GraphProposalStatus>
          ariaLabel={t('statusFilterLabel')}
          value={status}
          options={[
            { value: 'pending', label: t('filterPending') },
            { value: 'accepted', label: t('filterAccepted') },
            { value: 'rejected', label: t('filterRejected') },
          ]}
          onChange={(next) => resetTo(() => setStatus(next))}
        />
        <Segmented<PipelineFilter>
          ariaLabel={t('pipelineFilterLabel')}
          value={pipeline}
          options={(['all', ...DIPLOMATIC_PIPELINES] as const).map(pipelineOption)}
          onChange={(next) => resetTo(() => setPipeline(next))}
        />
      </div>

      {isError ? (
        <BackofficeErrorState message={t('failedLoad')} onRetry={() => refetch()} />
      ) : !isLoading && rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[18rem_1fr]">
          <nav aria-label={t('listLabel')} className="space-y-2">
            <p className="px-1 text-xs text-muted-foreground">
              {isLoading ? '…' : t('count', { count: total })}
            </p>
            <ul
              aria-busy={isPlaceholderData || undefined}
              className={cn(
                'divide-y overflow-hidden rounded-lg border bg-card transition-opacity duration-250 ease-out',
                isPlaceholderData && 'opacity-60'
              )}
            >
              {rows.map((row) => (
                <li key={row.id}>
                  <ListEntry
                    proposal={row}
                    active={row.id === current?.id}
                    onSelect={() => setSelectedId(row.id)}
                  />
                </li>
              ))}
            </ul>
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page === 0}
                  onClick={() => {
                    setPage(page - 1);
                    setSelectedId(null);
                  }}
                  aria-label={t('previousPage')}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Button>
                <span className="tabular-nums">
                  {t('range', {
                    from: page * PAGE_SIZE + 1,
                    to: Math.min(total, (page + 1) * PAGE_SIZE),
                    total,
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => {
                    setPage(page + 1);
                    setSelectedId(null);
                  }}
                  aria-label={t('nextPage')}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            )}
          </nav>

          {current && <ProposalReview key={current.id} proposal={current} onDecided={onDecided} />}
        </div>
      )}
    </div>
  );
}

/** A proposal's line in the list: what kind, which charter, and the gist. */
function ListEntry({
  proposal,
  active,
  onSelect,
}: {
  proposal: DiplomaticProposalItem;
  active: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations('backoffice.diplomaticProposals');
  const slug = isKnownPipeline(proposal.pipeline) ? PIPELINE_SLUGS[proposal.pipeline] : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active || undefined}
      className={cn(
        'block w-full space-y-0.5 px-3 py-2 text-left transition-colors',
        active ? 'bg-primary/10' : 'hover:bg-accent'
      )}
    >
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn('font-medium', active ? 'text-primary' : 'text-foreground')}>
          {slug ? t(`pipeline.${slug}`) : proposal.pipeline}
        </span>
        <span className="ml-auto">
          <RelativeTime iso={proposal.created} />
        </span>
      </span>
      <span className="block truncate text-sm">
        {proposal.source?.label ?? t('sourceGoneTitle', { id: proposal.source_id })}
      </span>
      <span className="block truncate text-xs text-muted-foreground">{summary(t, proposal)}</span>
    </button>
  );
}

/** The opening of a long text: the list shows one line, and a screen reader reads the whole name. */
function excerpt(text: string, limit = 120): string {
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

function summary(
  t: ReturnType<typeof useTranslations<'backoffice.diplomaticProposals'>>,
  proposal: DiplomaticProposalItem
): string {
  const { pipeline, payload } = proposal;
  switch (pipeline) {
    case 'W2.1':
      return t('summary.entities', { count: itemCount(pipeline, payload) });
    case 'W2.2':
      return t('summary.formulae', { count: itemCount(pipeline, payload) });
    case 'W3.3':
      return t('summary.relations', { count: itemCount(pipeline, payload) });
    case 'W2.4':
      return excerpt(payload.translation ?? '');
    case 'W3.2':
      return payload.verdict === 'inconsistent'
        ? t('summary.inconsistent')
        : payload.verdict === 'uncertain'
          ? t('summary.uncertain')
          : (payload.verdict ?? '');
    default:
      return '';
  }
}
