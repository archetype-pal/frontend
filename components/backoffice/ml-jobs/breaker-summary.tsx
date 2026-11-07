'use client';

/**
 * The spend breaker, in sentences: whether a model can run, what the last 24
 * hours have cost against the caps, and how those calls ended.
 */

import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Power } from 'lucide-react';

import { ML_JOB_STATUSES } from '@/components/backoffice/ml-jobs/job-status-badge';
import { formatMicros } from '@/lib/backoffice/format-cost';
import { cn } from '@/lib/utils';
import type { MLJobSummary } from '@/types/backoffice';

export function BreakerSummary({ summary }: { summary: MLJobSummary }) {
  const t = useTranslations('backoffice.mlJobs');
  const locale = useLocale();
  // The caps are plain micros; they read as money only when the window's
  // costs were all in one currency.
  const currency = summary.currencies.length === 1 ? summary.currencies[0] : '';
  const money = (micros: number) => formatMicros(micros, currency, locale);

  const switches = !summary.inference_enabled
    ? t('switchOff')
    : summary.hosted_providers_enabled
      ? t('switchOnHosted')
      : t('switchOnLocal');

  const cap = summary.cap_micros;
  const used = cap > 0 ? summary.spend_micros / cap : 0;
  const outcomes = ML_JOB_STATUSES.filter((status) => summary.by_status[status] > 0);

  return (
    <section
      aria-label={t('summaryLabel')}
      className="grid gap-4 rounded-lg border bg-card p-4 text-sm shadow-sm md:grid-cols-3"
    >
      <div className="space-y-1">
        <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Power className="h-3.5 w-3.5" aria-hidden />
          {t('switchesTitle')}
        </h2>
        <p className={cn(!summary.inference_enabled && 'text-muted-foreground')}>{switches}</p>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('spendTitle')}
        </h2>
        <p>
          {t('spent', { amount: money(summary.spend_micros) })}{' '}
          {cap > 0 ? t('ofCap', { cap: money(cap), percent: Math.round(used * 100) }) : null}
        </p>
        {cap > 0 ? (
          <div
            role="meter"
            aria-label={t('capMeterLabel')}
            aria-valuemin={0}
            aria-valuemax={cap}
            aria-valuenow={Math.min(summary.spend_micros, cap)}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={cn(
                'h-full rounded-full',
                used >= 1 ? 'bg-destructive' : used >= 0.8 ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${Math.min(100, used * 100)}%` }}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('noCap')}</p>
        )}
        {summary.per_actor_cap_micros > 0 && (
          <p className="text-xs text-muted-foreground">
            {t('perActorCap', { cap: money(summary.per_actor_cap_micros) })}
          </p>
        )}
        {summary.currencies.length > 1 && (
          <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {t('mixedCurrencies', { currencies: summary.currencies.join(', ') })}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('outcomesTitle')}
        </h2>
        {outcomes.length === 0 ? (
          <p className="text-muted-foreground">{t('noCalls')}</p>
        ) : (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {outcomes.map((status) => (
              <li key={status} className="tabular-nums">
                {t(`outcome.${status}`, { count: summary.by_status[status] })}
              </li>
            ))}
          </ul>
        )}
        {summary.by_status.refused > 0 && (
          <p className="text-xs text-muted-foreground">{t('refusedExplained')}</p>
        )}
      </div>
    </section>
  );
}
