'use client';

import { Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Build {
  version: string;
  commit: string;
}

interface Builds {
  frontend: Build;
  api: Build | null;
}

async function getBuilds(): Promise<Builds> {
  const res = await fetch('/api/version');
  if (!res.ok) throw new Error(`Version lookup failed: ${res.status}`);
  return res.json();
}

/** Releases of the running frontend and API, pinned to the sidebar foot. The
 *  commits sit in the tooltip; the release stamp is what people compare. */
export function VersionFooter({ collapsed }: { collapsed: boolean }) {
  const t = useTranslations('backoffice');
  const { data } = useQuery({
    queryKey: ['backoffice', 'version'],
    queryFn: getBuilds,
    staleTime: Infinity,
  });
  if (!data) return null;

  const rows = [
    { label: t('sidebar.versionFrontend'), build: data.frontend },
    { label: t('sidebar.versionApi'), build: data.api },
  ];
  const list = (withCommit: boolean) => (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2">
      {rows.map(({ label, build }) => (
        <Fragment key={label}>
          <dt>{label}</dt>
          <dd className="font-mono">
            {build ? build.version : t('sidebar.versionUnavailable')}
            {withCommit && build && ` · ${build.commit.slice(0, 7)}`}
          </dd>
        </Fragment>
      ))}
    </dl>
  );

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div
          tabIndex={0}
          aria-label={t('sidebar.version')}
          className="border-t px-4 py-2 text-[11px] text-muted-foreground"
        >
          {collapsed ? <Info className="mx-auto h-4 w-4" /> : list(false)}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="text-xs">
        {list(true)}
      </TooltipContent>
    </Tooltip>
  );
}
