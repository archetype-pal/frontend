'use client';

/**
 * `/backoffice/annotation-proposals`: the review queue for machine-proposed
 * annotations (AI programme W0.5).
 *
 * A model can only propose. Each row shows the box on the page around it, the
 * letter and hand it names, and the model that drew it; accepting creates the
 * annotation with the reviewer recorded as its author, which is the only way
 * a proposal becomes one.
 */

import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { CheckCircle, Sparkles, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataPagination } from '@/components/ui/data-pagination';
import { Segmented } from '@/components/ui/segmented';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { BackofficeErrorState } from '@/components/backoffice/common/query-state';
import {
  ProposalRow,
  acceptBlocker,
} from '@/components/backoffice/annotation-proposals/proposal-row';
import { useAuth } from '@/contexts/auth-context';
import { usePageSize } from '@/hooks/backoffice/use-page-size';
import { useSelectionSet } from '@/hooks/use-selection-set';
import { runBulkAction } from '@/lib/backoffice/bulk-action';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { cn } from '@/lib/utils';
import {
  acceptAnnotationProposal,
  getAnnotationProposals,
  rejectAnnotationProposal,
} from '@/services/backoffice/annotation-proposals';
import type { GraphProposalStatus } from '@/types/backoffice';

export default function AnnotationProposalsPage() {
  const t = useTranslations('backoffice');
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<GraphProposalStatus>('pending');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePageSize('annotation-proposals', 20);
  const selection = useSelectionSet<number>();
  const [bulk, setBulk] = useState<'accept' | 'reject' | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const params = { status, limit: pageSize, offset: page * pageSize };
  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: backofficeKeys.annotationProposals.list(params),
    queryFn: () => getAnnotationProposals(params),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
  const rows = useMemo(() => data?.results ?? [], [data]);
  const total = data?.count ?? 0;

  const selectable = useMemo(
    () => rows.filter((r) => r.status === 'pending').map((r) => r.id),
    [rows]
  );
  const selected = selection.selected;
  // A bulk accept sends only the selected rows that can be accepted; the rest
  // would each come back as a 409. Rejecting has no such precondition.
  const acceptable = rows.filter((r) => selected.has(r.id) && acceptBlocker(r) == null);

  const invalidate = () => {
    // Also refreshes the sidebar's pending badge, which reads the depth key.
    void queryClient.invalidateQueries({ queryKey: backofficeKeys.annotationProposals.all() });
    selection.clear();
  };

  const runBulk = async () => {
    if (bulk === 'accept') {
      await runBulkAction({
        ids: acceptable.map((r) => r.id),
        action: (id: number) => acceptAnnotationProposal(id),
        invalidate,
        messages: {
          success: (count) => t('annotationProposals.bulkAccepted', { count }),
          allFailed: () => t('annotationProposals.bulkAllFailed'),
          partial: (succeeded, failed) =>
            t('annotationProposals.bulkPartial', { succeeded, failed }),
        },
      });
    } else if (bulk === 'reject') {
      await runBulkAction({
        ids: Array.from(selected),
        action: (id: number) => rejectAnnotationProposal(id),
        invalidate,
        messages: {
          success: (count) => t('annotationProposals.bulkRejected', { count }),
          allFailed: () => t('annotationProposals.bulkAllFailed'),
          partial: (succeeded, failed) =>
            t('annotationProposals.bulkPartial', { succeeded, failed }),
        },
      });
    }
    setBulk(null);
  };

  const emptyMessage = {
    pending: t('annotationProposals.emptyPending'),
    accepted: t('annotationProposals.emptyAccepted'),
    rejected: t('annotationProposals.emptyRejected'),
  }[status];

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <Sparkles className="mt-1 h-6 w-6 text-primary" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('annotationProposals.title')}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t('annotationProposals.intro')}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<GraphProposalStatus>
          ariaLabel={t('annotationProposals.statusFilterLabel')}
          value={status}
          options={[
            { value: 'pending', label: t('annotationProposals.filterPending') },
            { value: 'accepted', label: t('annotationProposals.filterAccepted') },
            { value: 'rejected', label: t('annotationProposals.filterRejected') },
          ]}
          onChange={(next) => {
            setStatus(next);
            setPage(0);
            selection.clear();
          }}
        />
        <span className="text-sm text-muted-foreground">
          {isLoading ? '…' : t('annotationProposals.count', { count: total })}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {t('annotationProposals.selectedCount', { count: selected.size })}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={acceptable.length === 0}
              onClick={() => setBulk('accept')}
            >
              <CheckCircle className="h-3 w-3" aria-hidden />
              {t('annotationProposals.acceptSelected', { count: acceptable.length })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setBulk('reject')}
            >
              <XCircle className="h-3 w-3" aria-hidden />
              {t('annotationProposals.rejectSelected', { count: selected.size })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => selection.clear()}
            >
              {t('annotationProposals.clear')}
            </Button>
          </div>
        </div>
      )}

      <div
        ref={listRef}
        aria-busy={isPlaceholderData || undefined}
        className={cn(
          'space-y-2 transition-opacity duration-250 ease-out',
          isPlaceholderData && 'opacity-60'
        )}
      >
        {selectable.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={
                selectable.every((id) => selected.has(id))
                  ? true
                  : selected.size > 0
                    ? 'indeterminate'
                    : false
              }
              onCheckedChange={() =>
                selectable.every((id) => selected.has(id))
                  ? selection.clear()
                  : selection.addMany(selectable)
              }
              aria-label={t('annotationProposals.selectAllAria')}
            />
            <span className="text-xs text-muted-foreground">
              {t('annotationProposals.selectAll', { count: selectable.length })}
            </span>
          </div>
        )}
        {isError ? (
          <BackofficeErrorState
            message={t('annotationProposals.failedLoad')}
            onRetry={() => refetch()}
          />
        ) : !isLoading && rows.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((proposal) => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                selected={selected.has(proposal.id)}
                onToggleSelected={() => selection.toggle(proposal.id)}
                onDecided={invalidate}
              />
            ))}
          </ul>
        )}
      </div>

      {total > 0 && (
        <DataPagination
          scrollTargetRef={listRef}
          totalItems={total}
          page={page + 1}
          pageSize={pageSize}
          onPageChange={(p) => {
            setPage(p - 1);
            selection.clear();
          }}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
            selection.clear();
          }}
        />
      )}

      <ConfirmDialog
        open={bulk !== null}
        onOpenChange={(open) => !open && setBulk(null)}
        variant={bulk === 'reject' ? 'destructive' : 'default'}
        title={
          bulk === 'accept'
            ? t('annotationProposals.bulkAcceptTitle', { count: acceptable.length })
            : t('annotationProposals.bulkRejectTitle', { count: selected.size })
        }
        description={
          bulk === 'accept'
            ? t('annotationProposals.bulkAcceptDesc', {
                skipped: selected.size - acceptable.length,
              })
            : t('annotationProposals.bulkRejectDesc')
        }
        confirmLabel={
          bulk === 'accept' ? t('annotationProposals.accept') : t('annotationProposals.reject')
        }
        onConfirm={runBulk}
      />
    </div>
  );
}
