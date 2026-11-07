'use client';

/**
 * `/backoffice/ml-jobs`: the inference ledger (AI programme W0.1).
 *
 * Every model call, written by the system as it happens: what ran, for which
 * programme item, at what cost and how it ended. Read-only, because the ledger
 * is the provenance of every machine-made proposal, and an edit path would be
 * a way to forge it. Above it, the spend breaker: whether a model can run at
 * all, and what the last 24 hours have cost against the caps.
 */

import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Cpu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/backoffice/common/data-table';
import { RelativeTime } from '@/components/backoffice/relative-time';
import { BreakerSummary } from '@/components/backoffice/ml-jobs/breaker-summary';
import { JobDetailSheet } from '@/components/backoffice/ml-jobs/job-detail-sheet';
import { JobStatusBadge, ML_JOB_STATUSES } from '@/components/backoffice/ml-jobs/job-status-badge';
import { useAuth } from '@/contexts/auth-context';
import { useServerList } from '@/hooks/backoffice/use-server-list';
import { formatCost, formatDuration } from '@/lib/backoffice/format-cost';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { getMLJobSummary, getMLJobs } from '@/services/backoffice/ml-jobs';
import type { MLJobListItem, MLJobStatus } from '@/types/backoffice';

const ALL = '__all__';
// The ledger is newest first and has no other order worth offering.
const NO_ORDERING = {};

export default function MLJobsPage() {
  const t = useTranslations('backoffice.mlJobs');
  const locale = useLocale();
  const { isAuthenticated } = useAuth();
  const list = useServerList('ml-jobs', 50, NO_ORDERING);
  const [status, setStatus] = useState<MLJobStatus | typeof ALL>(ALL);
  const [task, setTask] = useState<string>(ALL);
  const [openJob, setOpenJob] = useState<number | null>(null);

  const params = {
    ...list.params,
    ...(status !== ALL ? { status } : {}),
    ...(task !== ALL ? { task } : {}),
  };
  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: backofficeKeys.mlJobs.list(params),
    queryFn: () => getMLJobs(params),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  });
  const { data: summary } = useQuery({
    queryKey: backofficeKeys.mlJobs.summary(),
    queryFn: getMLJobSummary,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });

  const taskOptions = useMemo(() => {
    const known = (summary?.tasks ?? []).map((row) => row.task);
    // Keep a chosen task listed, or the trigger goes blank while it still filters.
    return task !== ALL && !known.includes(task) ? [...known, task] : known;
  }, [summary, task]);
  const taskCounts = useMemo(
    () => new Map((summary?.tasks ?? []).map((row) => [row.task, row.count])),
    [summary]
  );

  const columns: DataTableColumn<MLJobListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'created',
        header: t('colWhen'),
        cell: ({ row }) => (
          <span title={new Date(row.original.created).toLocaleString(locale)}>
            <RelativeTime iso={row.original.created} />
          </span>
        ),
      },
      {
        accessorKey: 'task',
        header: t('colTask'),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.task}</span>,
      },
      {
        accessorKey: 'model_name',
        header: t('colModel'),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.model_name || t('noModel')}
            <span className="block text-xs text-muted-foreground">{row.original.provider}</span>
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t('colStatus'),
        cell: ({ row }) => <JobStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'cost_micros',
        header: t('colCost'),
        cell: ({ row }) => <span className="tabular-nums">{formatCost(row.original, locale)}</span>,
      },
      {
        accessorKey: 'duration_ms',
        header: t('colDuration'),
        cell: ({ row }) => (
          <span className="tabular-nums text-muted-foreground">
            {row.original.duration_ms == null
              ? '—'
              : formatDuration(row.original.duration_ms, locale)}
          </span>
        ),
      },
      {
        id: 'details',
        header: () => <span className="sr-only">{t('colDetails')}</span>,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setOpenJob(row.original.id)}
            aria-label={t('detailsAria', { id: row.original.id })}
          >
            {t('details')}
          </Button>
        ),
      },
    ],
    [t, locale]
  );

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-3">
        <Cpu className="mt-1 h-6 w-6 text-primary" aria-hidden />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t('intro')}</p>
        </div>
      </header>

      {summary && <BreakerSummary summary={summary} />}

      <DataTable
        columns={columns}
        data={data?.results ?? []}
        isError={isError}
        isLoading={isLoading}
        isStale={isPlaceholderData}
        onRetry={refetch}
        {...list.tableProps(data?.count)}
        filterBar={
          <div className="flex flex-wrap items-end gap-3">
            <Segmented<MLJobStatus | typeof ALL>
              ariaLabel={t('statusFilterLabel')}
              value={status}
              options={[
                { value: ALL, label: t('filterAll') },
                ...ML_JOB_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
              ]}
              onChange={(next) => {
                setStatus(next);
                list.setPage(0);
              }}
            />
            <div className="space-y-1">
              <Label className="text-xs" htmlFor="ml-jobs-task">
                {t('taskFilterLabel')}
              </Label>
              <Select
                value={task}
                onValueChange={(next) => {
                  setTask(next);
                  list.setPage(0);
                }}
              >
                <SelectTrigger id="ml-jobs-task" className="h-8 w-48 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('allTasks')}</SelectItem>
                  {taskOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {taskCounts.has(name)
                        ? t('taskWithCount', { task: name, count: taskCounts.get(name) ?? 0 })
                        : name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <JobDetailSheet jobId={openJob} onClose={() => setOpenJob(null)} />
    </div>
  );
}
