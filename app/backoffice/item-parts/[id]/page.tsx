'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { BackofficeErrorState } from '@/components/backoffice/common/query-state';
import { useModelLabels } from '@/contexts/model-labels-context';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { getItemPartHistoricalItemId } from '@/services/backoffice/manuscripts';

/**
 * Landing page for public "Edit in Backoffice" links. The public site knows an
 * ItemPart id, but the manuscript workspace is keyed by HistoricalItem id, so
 * look the part up and replace this entry with its workspace.
 * archetype-pal/frontend#142
 */
export default function ItemPartRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const itemPartId = Number(id);
  const router = useRouter();
  const t = useTranslations('backoffice');
  const { getLabel } = useModelLabels();

  const {
    data: historicalItemId,
    isError,
    refetch,
  } = useQuery({
    queryKey: backofficeKeys.manuscripts.byItemPart(itemPartId),
    queryFn: () => getItemPartHistoricalItemId(itemPartId),
    enabled: Number.isFinite(itemPartId),
  });

  useEffect(() => {
    if (historicalItemId != null) router.replace(`/backoffice/manuscripts/${historicalItemId}`);
  }, [historicalItemId, router]);

  if (isError || !Number.isFinite(itemPartId)) {
    return (
      <BackofficeErrorState
        message={t('manuscriptWorkspace.failedLoad', {
          label: getLabel('historicalItem').toLowerCase(),
        })}
        onRetry={() => refetch()}
      />
    );
  }
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
