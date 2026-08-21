'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  Trash2,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Database,
  Activity,
  Zap,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/backoffice/common/confirm-dialog';
import { FloatingPanel } from '@/components/backoffice/common/floating-panel';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import {
  getSearchEngineStats,
  dispatchSearchAction,
  getTaskStatus,
  type SearchEngineStats,
  type IndexStats,
  type TaskStatus,
  type TaskAction,
} from '@/services/backoffice/search-engine';

/* ------------------------------------------------------------------ */
/*  Types for local task tracking                                      */
/* ------------------------------------------------------------------ */

interface TrackedTask {
  taskId: string;
  label: string;
  indexType?: string;
  startedAt: number;
  status: TaskStatus | null;
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function SearchEnginePage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Active tasks being tracked
  const [trackedTasks, setTrackedTasks] = useState<TrackedTask[]>([]);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'destructive' | 'default';
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', variant: 'default', onConfirm: () => {} });

  // ── Stats query ──────────────────────────────────────────────
  const hasActiveTasks = trackedTasks.some(
    (t) => !t.status || !['SUCCESS', 'FAILURE'].includes(t.status.state)
  );

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: backofficeKeys.searchEngine.stats(),
    queryFn: () => getSearchEngineStats(token!),
    enabled: !!token,
    refetchInterval: hasActiveTasks ? 5000 : false,
  });

  // ── Action mutation ──────────────────────────────────────────
  const actionMutation = useMutation({
    mutationFn: ({
      action,
      indexType,
    }: {
      action: TaskAction;
      indexType?: string;
      label: string;
    }) => dispatchSearchAction(token!, action, indexType),
    onSuccess: (data, variables) => {
      const taskIds = data.task_id ? [data.task_id] : (data.task_ids ?? []);
      const newTasks: TrackedTask[] = taskIds.map((id, i) => ({
        taskId: id,
        label:
          taskIds.length > 1 ? `${variables.label} (${i + 1}/${taskIds.length})` : variables.label,
        indexType: variables.indexType,
        startedAt: Date.now(),
        status: null,
      }));
      setTrackedTasks((prev) => [...prev, ...newTasks]);
      toast.success(data.message);
    },
    onError: (err) => {
      toast.error(t('searchEngine.failedStartTask'), {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    },
  });

  // ── Task polling ─────────────────────────────────────────────
  const activeTaskIds = trackedTasks
    .filter((t) => !t.status || !['SUCCESS', 'FAILURE'].includes(t.status.state))
    .map((t) => t.taskId);

  const activeTaskKey = activeTaskIds.join(',');

  // Poll each active task
  useEffect(() => {
    if (!token || activeTaskIds.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.allSettled(activeTaskIds.map((id) => getTaskStatus(token, id)));

      setTrackedTasks((prev) =>
        prev.map((task) => {
          const idx = activeTaskIds.indexOf(task.taskId);
          if (idx === -1) return task;
          const result = updates[idx];
          if (result.status === 'fulfilled') {
            return { ...task, status: result.value };
          }
          return task;
        })
      );
    }, 800);

    return () => clearInterval(interval);
  }, [token, activeTaskKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // When tasks complete, refetch stats and show toast
  const prevTaskStatesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const prev = prevTaskStatesRef.current;
    for (const task of trackedTasks) {
      if (!task.status) continue;
      const prevState = prev[task.taskId];
      if (prevState === task.status.state) continue;

      if (task.status.state === 'SUCCESS' && prevState !== 'SUCCESS') {
        toast.success(t('searchEngine.taskCompleted', { label: task.label }));
        queryClient.invalidateQueries({ queryKey: backofficeKeys.searchEngine.stats() });
      } else if (task.status.state === 'FAILURE' && prevState !== 'FAILURE') {
        toast.error(t('searchEngine.taskFailed', { label: task.label }), {
          description: task.status.error || 'Unknown error',
        });
      }
    }
    prevTaskStatesRef.current = Object.fromEntries(
      trackedTasks.filter((t) => t.status).map((t) => [t.taskId, t.status!.state])
    );
  }, [trackedTasks, queryClient, t]);

  // ── Action handlers ──────────────────────────────────────────
  const handlePerIndexAction = useCallback(
    (action: TaskAction, index: IndexStats) => {
      const actionLabels: Record<string, string> = {
        reindex: t('searchEngine.actionReindex'),
        clear: t('searchEngine.actionClear'),
        clean_and_reindex: t('searchEngine.actionCleanReindex'),
      };
      const label = `${actionLabels[action]} ${index.label}`;

      if (action === 'clear' || action === 'clean_and_reindex') {
        setConfirmDialog({
          open: true,
          title:
            action === 'clear'
              ? t('searchEngine.confirmClearTitle', { label: index.label })
              : t('searchEngine.confirmCleanReindexTitle', { label: index.label }),
          description:
            action === 'clear'
              ? t('searchEngine.confirmClearDesc', {
                  count: index.meilisearch_count.toLocaleString(),
                  label: index.label,
                })
              : t('searchEngine.confirmCleanReindexDesc', {
                  label: index.label,
                  count: index.db_count.toLocaleString(),
                }),
          variant: action === 'clear' ? 'destructive' : 'default',
          onConfirm: () => {
            actionMutation.mutate({ action, indexType: index.index_type, label });
            setConfirmDialog((d) => ({ ...d, open: false }));
          },
        });
      } else {
        actionMutation.mutate({ action, indexType: index.index_type, label });
      }
    },
    [actionMutation, t]
  );

  const handleReindexAll = useCallback(() => {
    setConfirmDialog({
      open: true,
      title: t('searchEngine.confirmReindexAllTitle'),
      description: t('searchEngine.confirmReindexAllDesc'),
      variant: 'default',
      onConfirm: () => {
        actionMutation.mutate({ action: 'reindex_all', label: t('searchEngine.reindexAllButton') });
        setConfirmDialog((d) => ({ ...d, open: false }));
      },
    });
  }, [actionMutation, t]);

  const handleClearAndRebuildAll = useCallback(() => {
    setConfirmDialog({
      open: true,
      title: t('searchEngine.confirmClearRebuildAllTitle'),
      description: t('searchEngine.confirmClearRebuildAllDesc'),
      variant: 'destructive',
      onConfirm: () => {
        actionMutation.mutate({
          action: 'clear_and_rebuild_all',
          label: t('searchEngine.clearRebuildAllButton'),
        });
        setConfirmDialog((d) => ({ ...d, open: false }));
      },
    });
  }, [actionMutation, t]);

  const dismissTask = useCallback((taskId: string) => {
    setTrackedTasks((prev) => prev.filter((t) => t.taskId !== taskId));
  }, []);

  const dismissCompletedTasks = useCallback(() => {
    setTrackedTasks((prev) =>
      prev.filter((t) => !t.status || !['SUCCESS', 'FAILURE'].includes(t.status.state))
    );
  }, []);

  // ── Derived state ────────────────────────────────────────────
  const outOfSyncCount = stats?.indexes.filter((i) => !i.in_sync).length ?? 0;
  const isUnreachable = !!statsError || (stats != null && !stats.healthy);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Search className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('searchEngine.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('searchEngine.subtitle')}</p>
        </div>
      </div>

      {/* Section 1: Health Overview Banner */}
      <HealthBanner
        stats={stats ?? null}
        loading={statsLoading}
        error={isUnreachable}
        outOfSyncCount={outOfSyncCount}
        activeTaskCount={activeTaskIds.length}
        t={t}
      />

      {/* Section 2: Index Management Table */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="font-medium">{t('searchEngine.sectionIndexManagement')}</h2>
            <p className="text-xs text-muted-foreground">{t('searchEngine.sectionIndexDesc')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStats()}
            disabled={statsLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${statsLoading ? 'animate-spin' : ''}`} />
            {t('searchEngine.refreshButton')}
          </Button>
        </div>

        {statsLoading ? (
          <IndexTableSkeleton />
        ) : isUnreachable ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <XCircle className="mx-auto mb-2 h-8 w-8 text-destructive/60" />
            <p className="font-medium text-destructive">{t('searchEngine.cannotConnect')}</p>
            <p className="mt-1">{t('searchEngine.cannotConnectDesc')}</p>
          </div>
        ) : (
          <IndexTable
            indexes={stats?.indexes ?? []}
            onAction={handlePerIndexAction}
            trackedTasks={trackedTasks}
            disabled={actionMutation.isPending}
            t={t}
          />
        )}
      </div>

      {/* Section 3: Global Actions */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="font-medium mb-1">{t('searchEngine.sectionGlobalActions')}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t('searchEngine.globalActionsDesc')}</p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleReindexAll} disabled={actionMutation.isPending || isUnreachable}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('searchEngine.reindexAllButton')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearAndRebuildAll}
            disabled={actionMutation.isPending || isUnreachable}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('searchEngine.clearRebuildAllButton')}
          </Button>
        </div>
      </div>

      {/* Task Progress Panel */}
      {trackedTasks.length > 0 && (
        <TaskProgressPanel
          tasks={trackedTasks}
          onDismiss={dismissTask}
          onDismissCompleted={dismissCompletedTasks}
          t={t}
        />
      )}

      {/* Shared confirmation dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((d) => ({ ...d, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={t('searchEngine.confirmButton')}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}

/* ================================================================== */
/*  HealthBanner                                                       */
/* ================================================================== */

function HealthBanner({
  stats,
  loading,
  error,
  outOfSyncCount,
  activeTaskCount,
  t,
}: {
  stats: SearchEngineStats | null;
  loading: boolean;
  error: boolean;
  outOfSyncCount: number;
  activeTaskCount: number;
  t: ReturnType<typeof useTranslations>;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Connection status */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {t('searchEngine.connectionLabel')}
        </p>
        <div className="flex items-center gap-2">
          {error ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              <span className="text-sm font-semibold text-destructive">
                {t('searchEngine.connectionUnreachable')}
              </span>
            </>
          ) : (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {t('searchEngine.connectionConnected')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Total documents */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {t('searchEngine.totalDocuments')}
        </p>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            {stats
              ? `${stats.total_meilisearch.toLocaleString()} across ${stats.indexes.length} indexes`
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* Sync status */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {t('searchEngine.syncStatus')}
        </p>
        <div className="flex items-center gap-2">
          {outOfSyncCount === 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {t('searchEngine.allInSync')}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {t('searchEngine.outOfSync', { count: outOfSyncCount })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Active tasks */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {t('searchEngine.activeTasksLabel')}
        </p>
        <div className="flex items-center gap-2">
          {activeTaskCount > 0 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-semibold">
                {t('searchEngine.tasksRunning', { count: activeTaskCount })}
              </span>
            </>
          ) : (
            <>
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">
                {t('searchEngine.noActiveTasks')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  IndexTable                                                         */
/* ================================================================== */

function IndexTable({
  indexes,
  onAction,
  trackedTasks,
  disabled,
  t,
}: {
  indexes: IndexStats[];
  onAction: (action: TaskAction, index: IndexStats) => void;
  trackedTasks: TrackedTask[];
  disabled: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px]">{t('searchEngine.colIndex')}</TableHead>
          <TableHead className="text-right">{t('searchEngine.colInMeilisearch')}</TableHead>
          <TableHead className="text-right">{t('searchEngine.colInDatabase')}</TableHead>
          <TableHead>{t('searchEngine.colStatus')}</TableHead>
          <TableHead>{t('searchEngine.colProgress')}</TableHead>
          <TableHead className="text-right">{t('searchEngine.colActions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {indexes.map((index) => {
          const taskForIndex = trackedTasks.find(
            (t) =>
              t.indexType === index.index_type &&
              t.status &&
              !['SUCCESS', 'FAILURE'].includes(t.status.state)
          );
          const delta = index.meilisearch_count - index.db_count;

          return (
            <TableRow
              key={index.uid}
              className={!index.in_sync ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}
            >
              {/* Index name + UID */}
              <TableCell>
                <div>
                  <span className="font-medium">{index.label}</span>
                  <br />
                  <code className="text-xs text-muted-foreground">{index.uid}</code>
                </div>
              </TableCell>

              {/* Meilisearch count */}
              <TableCell className="text-right tabular-nums">
                {index.meilisearch_count.toLocaleString()}
              </TableCell>

              {/* DB count */}
              <TableCell className="text-right tabular-nums">
                {index.db_count.toLocaleString()}
              </TableCell>

              {/* Sync status */}
              <TableCell>
                {index.in_sync ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('searchEngine.badgeInSync')}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {delta > 0 ? `+${delta}` : delta}
                  </Badge>
                )}
              </TableCell>

              {/* Progress */}
              <TableCell className="min-w-[180px]">
                {taskForIndex ? (
                  <InlineProgress task={taskForIndex} t={t} />
                ) : (
                  <span className="text-xs text-muted-foreground">--</span>
                )}
              </TableCell>

              {/* Actions dropdown */}
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={disabled}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onAction('reindex', index)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      {t('searchEngine.actionReindex')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAction('clean_and_reindex', index)}>
                      <Zap className="h-3.5 w-3.5 mr-2" />
                      {t('searchEngine.actionCleanReindex')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onAction('clear', index)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      {t('searchEngine.actionClear')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/* ================================================================== */
/*  InlineProgress (shown in the table row)                            */
/* ================================================================== */

function useElapsedSeconds(startedAt: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.round((now - startedAt) / 1000);
}

function InlineProgress({ task, t }: { task: TrackedTask; t: ReturnType<typeof useTranslations> }) {
  const waitSecs = useElapsedSeconds(task.startedAt);
  const s = task.status;
  if (!s) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('searchEngine.taskStarting')}
      </div>
    );
  }

  if (s.state === 'PENDING') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('searchEngine.taskPending')}
        </div>
        {waitSecs > 10 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400">
            {t('searchEngine.taskCeleryHint')}
          </p>
        )}
      </div>
    );
  }

  const progress = s.progress;
  if ((s.state === 'PROGRESS' || s.state === 'STARTED') && progress) {
    let pct = 0;
    if (progress.total > 0) {
      if (progress.index_total > 0 && progress.index_done != null) {
        pct =
          ((progress.current - 1 + progress.index_done / progress.index_total) / progress.total) *
          100;
      } else {
        pct = (progress.current / progress.total) * 100;
      }
    }
    pct = Math.min(100, Math.round(pct));

    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground truncate max-w-[140px]">
            {progress.message || t('searchEngine.taskWorking')}
          </span>
          <span className="tabular-nums font-medium ml-2">{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      {s.state}...
    </div>
  );
}

/* ================================================================== */
/*  IndexTableSkeleton                                                 */
/* ================================================================== */

function IndexTableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-16 ml-auto" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  TaskProgressPanel (floating at bottom)                             */
/* ================================================================== */

function TaskProgressPanel({
  tasks,
  onDismiss,
  onDismissCompleted,
  t,
}: {
  tasks: TrackedTask[];
  onDismiss: (taskId: string) => void;
  onDismissCompleted: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = tasks.filter(
    (task) => task.status && ['SUCCESS', 'FAILURE'].includes(task.status.state)
  ).length;

  return (
    <FloatingPanel
      title={t('searchEngine.tasksPanelTitle', { count: tasks.length })}
      icon={<Activity className="h-4 w-4 text-primary" />}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed((c) => !c)}
      action={
        completedCount > 0 && !collapsed ? (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onDismissCompleted}>
            {t('searchEngine.clearCompleted')}
          </Button>
        ) : null
      }
    >
      <div className="divide-y">
        {tasks.map((task) => (
          <TaskProgressItem key={task.taskId} task={task} onDismiss={onDismiss} t={t} />
        ))}
      </div>
    </FloatingPanel>
  );
}

function TaskProgressItem({
  task,
  onDismiss,
  t,
}: {
  task: TrackedTask;
  onDismiss: (taskId: string) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const waitSecs = useElapsedSeconds(task.startedAt);
  const s = task.status;
  const state = s?.state ?? 'PENDING';
  const isTerminal = state === 'SUCCESS' || state === 'FAILURE';

  // Progress calculation
  let pct = 0;
  if (s?.progress && s.progress.total > 0) {
    const p = s.progress;
    if (p.index_total > 0 && p.index_done != null) {
      pct = ((p.current - 1 + p.index_done / p.index_total) / p.total) * 100;
    } else {
      pct = (p.current / p.total) * 100;
    }
    pct = Math.min(100, Math.round(pct));
  }
  if (state === 'SUCCESS') pct = 100;

  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium truncate mr-2">{task.label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <TaskStateBadge state={state} t={t} />
          {isTerminal && (
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onDismiss(task.taskId)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!isTerminal && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Detail text */}
      {s?.progress?.message && !isTerminal && (
        <p className="text-xs text-muted-foreground truncate">{s.progress.message}</p>
      )}

      {/* Error message */}
      {state === 'FAILURE' && s?.error && <p className="text-xs text-destructive">{s.error}</p>}

      {/* Celery hint */}
      {state === 'PENDING' && waitSecs > 10 && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400">
          {t('searchEngine.taskCeleryHint2')}
        </p>
      )}
    </div>
  );
}

function TaskStateBadge({ state, t }: { state: string; t: ReturnType<typeof useTranslations> }) {
  switch (state) {
    case 'SUCCESS':
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 h-5 border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-3 w-3 mr-0.5" />
          {t('searchEngine.taskBadgeDone')}
        </Badge>
      );
    case 'FAILURE':
      return (
        <Badge
          variant="outline"
          className="text-[10px] py-0 h-5 border-destructive/30 text-destructive"
        >
          <XCircle className="h-3 w-3 mr-0.5" />
          {t('searchEngine.taskBadgeFailed')}
        </Badge>
      );
    case 'PROGRESS':
    case 'STARTED':
      return (
        <Badge variant="outline" className="text-[10px] py-0 h-5 border-primary/30 text-primary">
          <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
          {t('searchEngine.taskBadgeRunning')}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] py-0 h-5">
          <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
          {t('searchEngine.taskBadgePending')}
        </Badge>
      );
  }
}
