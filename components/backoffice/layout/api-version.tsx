'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-fetch';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Build {
  version: string;
  commit: string;
}

async function getApiBuild(): Promise<Build> {
  const res = await apiFetch('/api/v1/version/');
  if (!res.ok) throw new Error(`Version lookup failed: ${res.status}`);
  return res.json();
}

/** CD stamps releases as the UTC build time, YYYY.MM.DD.HHMM. Returns null for
 *  anything else, such as `dev` from a source checkout. */
export function formatReleaseDate(version: string, locale: string): string | null {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})(\d{2})$/.exec(version);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(Date.UTC(year, month - 1, day, hour, minute)));
}

/** The running API release, so editors can tell whether a fix is live. */
export function ApiVersion() {
  const t = useTranslations('backoffice');
  const locale = useLocale();
  const { data } = useQuery({
    queryKey: ['backoffice', 'api-version'],
    queryFn: getApiBuild,
    staleTime: Infinity,
  });
  if (!data) return null;

  const builtAt = formatReleaseDate(data.version, locale);

  return (
    <div className="hidden items-center gap-3 md:flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            aria-label={t('header.apiVersion', { version: data.version })}
            className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-background px-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span
              aria-hidden
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                builtAt ? 'bg-emerald-500' : 'bg-amber-500'
              )}
            />
            <span className="font-medium">{t('header.apiLabel')}</span>
            <span className="font-mono text-foreground">{data.version}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="space-y-0.5">
          <p className="font-medium">{t('header.apiRelease')}</p>
          <p className="opacity-80">
            {builtAt ? t('header.apiBuilt', { date: builtAt }) : t('header.apiDevBuild')}
          </p>
          {data.commit !== 'unknown' && (
            <p className="font-mono opacity-80">
              {t('header.apiCommit', { commit: data.commit.slice(0, 7) })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="h-5" />
    </div>
  );
}
