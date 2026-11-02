'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { InlineEdit } from '@/components/backoffice/common/inline-edit';
import { PlaceCombobox } from '@/components/backoffice/common/place-combobox';
import { createOrigin, updateOrigin, deleteOrigin } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import type { HistoricalItemOrigin } from '@/types/backoffice';

interface OriginsSectionProps {
  historicalItemId: number;
  origins: HistoricalItemOrigin[];
}

export function OriginsSection({ historicalItemId, origins }: OriginsSectionProps) {
  const t = useTranslations('backoffice');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const label = t('manuscriptsDetail.origin');
  const [adding, setAdding] = useState(false);
  const [newPlace, setNewPlace] = useState<number | null>(null);
  const [newDubitable, setNewDubitable] = useState(false);
  const [newEvidence, setNewEvidence] = useState('');

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
    });

  const resetNew = () => {
    setAdding(false);
    setNewPlace(null);
    setNewDubitable(false);
    setNewEvidence('');
  };

  const createMut = useMutation({
    mutationFn: () =>
      createOrigin({
        historical_item: historicalItemId,
        place: newPlace ?? undefined,
        dubitable: newDubitable,
        evidence: newEvidence,
      }),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.labelAdded', { label }));
      invalidate();
      resetNew();
    },
    onError: (err) => {
      toastApiError(t('manuscriptsDetail.labelAddFailed', { label: label.toLowerCase() }), err);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<HistoricalItemOrigin> }) =>
      updateOrigin(id, data),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.labelUpdated', { label }));
      invalidate();
    },
    onError: (err) => {
      toastApiError(t('manuscriptsDetail.labelUpdateFailed', { label: label.toLowerCase() }), err);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteOrigin(id),
    onSuccess: () => {
      toast.success(t('manuscriptsDetail.labelRemoved', { label }));
      invalidate();
    },
    onError: (err) => {
      toastApiError(t('manuscriptsDetail.labelRemoveFailed', { label: label.toLowerCase() }), err);
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('manuscriptsDetail.origins')}</h3>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setAdding(true)}
        >
          <Plus className="h-3 w-3" />
          {tCommon('add')}
        </Button>
      </div>

      {origins.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground py-2">
          {t('manuscriptsDetail.noLabel', { label: t('manuscriptsDetail.origins').toLowerCase() })}
        </p>
      ) : (
        <div className="rounded-md border divide-y">
          {origins.map((origin, index) => (
            <div key={origin.id} className="flex items-center gap-3 px-3 py-2 text-sm min-w-0">
              <div className="w-56 shrink-0">
                <PlaceCombobox
                  aria-label={t('manuscriptsDetail.originPlaceAria', { n: index + 1 })}
                  value={origin.place}
                  selectedLabel={origin.place_display}
                  onChange={(placeId) => {
                    if (placeId !== null)
                      updateMut.mutate({ id: origin.id, data: { place: placeId } });
                  }}
                  className="h-7 text-xs"
                />
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={origin.dubitable}
                  aria-label={t('manuscriptsDetail.originDoubtfulAria', { n: index + 1 })}
                  onCheckedChange={(checked) =>
                    updateMut.mutate({ id: origin.id, data: { dubitable: checked === true } })
                  }
                />
                {t('manuscriptsDetail.originDoubtful')}
              </label>
              <div className="min-w-0 flex-1">
                <InlineEdit
                  value={origin.evidence}
                  placeholder={t('manuscriptsDetail.addEvidencePlaceholder')}
                  ariaLabel={t('manuscriptsDetail.originEvidenceAria', { n: index + 1 })}
                  onSave={async (evidence) => {
                    await updateMut.mutateAsync({ id: origin.id, data: { evidence } });
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => deleteMut.mutate(origin.id)}
                aria-label={t('manuscriptsDetail.removeOriginAria', { n: index + 1 })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {adding && (
            <div className="flex items-center gap-2 p-3">
              <div className="w-56 shrink-0">
                <PlaceCombobox
                  aria-label={t('manuscriptsDetail.newOriginPlaceAria')}
                  value={newPlace}
                  onChange={setNewPlace}
                  className="h-8 text-sm"
                />
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={newDubitable}
                  onCheckedChange={(checked) => setNewDubitable(checked === true)}
                />
                {t('manuscriptsDetail.originDoubtful')}
              </label>
              <Input
                value={newEvidence}
                onChange={(e) => setNewEvidence(e.target.value)}
                placeholder={t('manuscriptsDetail.evidenceOptionalPlaceholder')}
                className="h-8 text-sm flex-1"
              />
              <Button
                size="sm"
                className="h-8"
                onClick={() => createMut.mutate()}
                disabled={newPlace === null || createMut.isPending}
              >
                {tCommon('save')}
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={resetNew}>
                {tCommon('cancel')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
