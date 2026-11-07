'use client';

/**
 * One ledger entry in full: what the list leaves out to stay one line a call
 * (tokens, the prompt and input hashes, parameters, the error, who asked, and
 * the records the call touched).
 */

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { BackofficeInlineError } from '@/components/backoffice/common/query-state';
import { RelativeTime } from '@/components/backoffice/relative-time';
import { JobStatusBadge } from '@/components/backoffice/ml-jobs/job-status-badge';
import { formatCost, formatDuration } from '@/lib/backoffice/format-cost';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { getMLJob } from '@/services/backoffice/ml-jobs';
import type { MLJobDetail } from '@/types/backoffice';

/** Where a touched record can be opened, for the types that have a page. */
function targetHref(type: string, id: number): string | null {
  switch (type) {
    case 'imagetext':
      return `/backoffice/image-texts/${id}`;
    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  );
}

export function JobDetailSheet({ jobId, onClose }: { jobId: number | null; onClose: () => void }) {
  const t = useTranslations('backoffice.mlJobs');
  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: backofficeKeys.mlJobs.detail(jobId ?? 0),
    queryFn: () => getMLJob(jobId as number),
    enabled: jobId != null,
  });

  return (
    <Sheet open={jobId != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t('detailTitle', { id: jobId ?? 0 })}</SheetTitle>
          <SheetDescription>{t('detailIntro')}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isError ? (
            <BackofficeInlineError
              message={t('detailFailed')}
              retrying={isFetching}
              onRetry={() => void refetch()}
            />
          ) : data && data.id === jobId ? (
            <JobFields job={data} />
          ) : (
            <p className="text-sm text-muted-foreground">{t('detailLoading')}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function JobFields({ job }: { job: MLJobDetail }) {
  const t = useTranslations('backoffice.mlJobs');
  const locale = useLocale();
  return (
    <div className="space-y-4">
      <dl className="divide-y">
        <Field label={t('fieldStatus')}>
          <JobStatusBadge status={job.status} />
        </Field>
        <Field label={t('fieldTask')}>
          <span className="font-mono">{job.task}</span>
        </Field>
        <Field label={t('fieldModel')}>
          {job.model_name || t('noModel')}
          {job.model_version && (
            <span className="text-muted-foreground"> · {job.model_version}</span>
          )}
          <span className="block text-xs text-muted-foreground">
            {t('viaProvider', { provider: job.provider })}
          </span>
        </Field>
        <Field label={t('fieldWhen')}>
          <RelativeTime iso={job.created} />
          <span className="block text-xs text-muted-foreground">
            {new Date(job.created).toLocaleString(locale)}
          </span>
        </Field>
        <Field label={t('fieldActor')}>{job.actor_username || t('noActor')}</Field>
        <Field label={t('fieldCost')}>{formatCost(job, locale)}</Field>
        <Field label={t('fieldTokens')}>
          {t('tokens', { input: job.input_tokens, output: job.output_tokens })}
        </Field>
        <Field label={t('fieldDuration')}>
          {job.duration_ms == null ? '—' : formatDuration(job.duration_ms, locale)}
        </Field>
        <Field label={t('fieldPromptHash')}>
          <code className="text-xs">{job.prompt_hash || '—'}</code>
        </Field>
        <Field label={t('fieldInputRef')}>
          <code className="text-xs">{job.input_ref || '—'}</code>
        </Field>
        {job.celery_task_id && (
          <Field label={t('fieldCeleryTask')}>
            <code className="text-xs">{job.celery_task_id}</code>
          </Field>
        )}
      </dl>

      {job.error && (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {job.status === 'refused' ? t('refusalReason') : t('error')}
          </h3>
          <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-xs">
            {job.error}
          </pre>
        </section>
      )}

      <section>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('targets')}
        </h3>
        {job.targets.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">{t('noTargets')}</p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-sm">
            {job.targets.map(({ target_type, target_id }) => {
              const href = targetHref(target_type, target_id);
              const label = `${target_type} #${target_id}`;
              return (
                <li key={label} className="font-mono text-xs">
                  {href ? (
                    <Link href={href} className="text-primary hover:underline">
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {job.status === 'succeeded' && (
          <p className="mt-1 text-xs text-muted-foreground">{t('proposalsWait')}</p>
        )}
      </section>

      {Object.keys(job.params).length > 0 && (
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('params')}
          </h3>
          <pre className="mt-1 overflow-x-auto rounded-md border bg-muted/30 p-2 text-xs">
            {JSON.stringify(job.params, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
