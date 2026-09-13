'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiFetch } from '@/lib/api-fetch';
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

/** The running API release, so editors can tell whether a fix is live. */
export function ApiVersion() {
  const t = useTranslations('backoffice');
  const { data } = useQuery({
    queryKey: ['backoffice', 'api-version'],
    queryFn: getApiBuild,
    staleTime: Infinity,
  });
  if (!data) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={t('header.apiVersion', { version: data.version })}
          className="hidden font-mono text-[11px] text-muted-foreground md:inline"
        >
          {data.version}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {t('header.apiVersionTooltip', { commit: data.commit.slice(0, 7) })}
      </TooltipContent>
    </Tooltip>
  );
}
