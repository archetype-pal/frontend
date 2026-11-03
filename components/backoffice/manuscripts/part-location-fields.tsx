'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/backoffice/common/help-tooltip';
import { CurrentItemCombobox } from './current-item-combobox';
import { updateItemPart } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { toastApiError } from '@/lib/backoffice/format-api-error';
import type { ItemPartNested } from '@/types/backoffice';

type PartLocation = Pick<ItemPartNested, 'current_item' | 'current_item_locus' | 'custom_label'>;

/**
 * The editable location of one item part: its volume, locus and label.
 * `save` writes it and refreshes the manuscript, toasting *messages*.
 */
export function usePartLocation(
  part: ItemPartNested,
  historicalItemId: number,
  messages: { saved: string; failed: string }
) {
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<PartLocation>({
    current_item: part.current_item,
    current_item_locus: part.current_item_locus,
    custom_label: part.custom_label,
  });
  const [dirty, setDirty] = useState(false);

  const save = useMutation({
    mutationFn: () => updateItemPart(part.id, location),
    onSuccess: () => {
      toast.success(messages.saved);
      queryClient.invalidateQueries({
        queryKey: backofficeKeys.manuscripts.detail(historicalItemId),
      });
      setDirty(false);
    },
    onError: (err) => toastApiError(messages.failed, err),
  });

  const change = (patch: Partial<PartLocation>) => {
    setLocation((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  return { location, change, dirty, save };
}

/** The volume, locus and label fields of a `usePartLocation`. */
export function PartLocationFields({
  location,
  onChange,
  selectedLabel,
}: {
  location: PartLocation;
  onChange: (patch: Partial<PartLocation>) => void;
  /** The current volume's name, shown before its options load. */
  selectedLabel: string | null;
}) {
  const t = useTranslations('backoffice');
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <FieldLabel helpField="itemPart.currentItem">
            {t('manuscriptsDetail.physicalVolume')}
          </FieldLabel>
          <CurrentItemCombobox
            value={location.current_item}
            onChange={(id) => onChange({ current_item: id })}
            selectedLabel={selectedLabel}
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel helpField="itemPart.locus">{t('manuscriptsNew.fieldLocus')}</FieldLabel>
          <Input
            value={location.current_item_locus}
            onChange={(e) => onChange({ current_item_locus: e.target.value })}
            placeholder={t('manuscriptsNew.locusPlaceholder')}
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel helpField="itemPart.customLabel">
          {t('manuscriptsDetail.customLabel')}
        </FieldLabel>
        <Input
          value={location.custom_label}
          onChange={(e) => onChange({ custom_label: e.target.value })}
          placeholder={t('manuscriptsDetail.customLabelPlaceholder')}
          className="h-9"
        />
      </div>
    </>
  );
}
