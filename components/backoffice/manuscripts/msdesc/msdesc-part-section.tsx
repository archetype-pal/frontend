'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FilePlus2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import {
  buildMsDescSeedPayload,
  buildMsDescSeedPayloads,
  msdescAreaRow,
} from '@/lib/backoffice/msdesc-seed';
import { MSDESC_AREAS, msdescAreaLabelKey, type MsDescAreaId } from '@/lib/msdesc-vocab';
import { createMsDescArea } from '@/services/backoffice/manuscripts';
import type { ItemPartNested } from '@/types/backoffice';
import { MsDescAreaPanel } from './msdesc-area-panel';

interface MsDescPartSectionProps {
  historicalItemId: number;
  part: ItemPartNested;
  /** Show the part label heading (multi-part items only). */
  showPartHeading: boolean;
}

/**
 * One item part's structured description (roadmap 2.1 + 2.5): template-seeded
 * creation when no areas exist yet, otherwise the four area tabs. Area panels
 * stay mounted across tab switches (`forceMount`) so unsaved edits survive.
 */
export function MsDescPartSection({
  historicalItemId,
  part,
  showPartHeading,
}: MsDescPartSectionProps) {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeArea, setActiveArea] = React.useState<MsDescAreaId>('msIdentifier');

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  // 2.5 — seed all four areas from the canonical template skeletons.
  const seedMut = useMutation({
    mutationFn: () =>
      Promise.all(
        buildMsDescSeedPayloads(part.id).map((payload) => createMsDescArea(token!, payload))
      ),
    onSuccess: () => {
      toast.success(t('msdesc.section.toastSeeded'));
      invalidate();
    },
    onError: (err) => {
      toast.error(t('msdesc.section.toastSeedFailed'), { description: formatApiError(err) });
    },
  });

  // Recovery path for a partially-seeded part (e.g. an interrupted seed or
  // API-created rows): create one missing area from its template.
  const seedAreaMut = useMutation({
    mutationFn: (area: MsDescAreaId) =>
      createMsDescArea(token!, buildMsDescSeedPayload(part.id, area)),
    onSuccess: () => {
      toast.success(t('msdesc.section.toastSeeded'));
      invalidate();
    },
    onError: (err) => {
      toast.error(t('msdesc.section.toastSeedFailed'), { description: formatApiError(err) });
    },
  });

  const areas = part.msdesc_areas;

  return (
    <div className="space-y-3">
      {showPartHeading && <h4 className="text-sm font-medium">{part.display_label}</h4>}

      {areas.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-md border border-dashed p-4">
          <p className="text-sm text-muted-foreground">{t('msdesc.section.empty')}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedMut.mutate()}
            disabled={seedMut.isPending || !token}
          >
            {seedMut.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FilePlus2 className="mr-1 h-3.5 w-3.5" />
            )}
            {t('msdesc.section.create')}
          </Button>
        </div>
      ) : (
        <Tabs value={activeArea} onValueChange={(value) => setActiveArea(value as MsDescAreaId)}>
          <TabsList>
            {MSDESC_AREAS.map((area) => (
              <TabsTrigger key={area} value={area}>
                {t(msdescAreaLabelKey(area))}
              </TabsTrigger>
            ))}
          </TabsList>
          {MSDESC_AREAS.map((area) => {
            const row = msdescAreaRow(areas, area);
            return (
              // forceMount keeps inactive panels (and their unsaved drafts)
              // alive across area-tab switches.
              <TabsContent
                key={area}
                value={area}
                forceMount
                className="mt-4 data-[state=inactive]:hidden"
              >
                {row ? (
                  <MsDescAreaPanel historicalItemId={historicalItemId} area={area} row={row} />
                ) : (
                  <div className="flex flex-col items-start gap-2 rounded-md border border-dashed p-4">
                    <p className="text-sm text-muted-foreground">{t('msdesc.section.emptyArea')}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => seedAreaMut.mutate(area)}
                      disabled={seedAreaMut.isPending || !token}
                    >
                      {seedAreaMut.isPending ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FilePlus2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      {t('msdesc.section.createArea', { area: t(msdescAreaLabelKey(area)) })}
                    </Button>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
