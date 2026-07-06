'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BackofficeDate } from '@/types/backoffice';
import { createDate, deleteDate, getDates, updateDate } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { SimpleCrudPage } from '@/components/backoffice/common/simple-crud-page';
import { useModelLabels } from '@/contexts/model-labels-context';

export default function DatesPage() {
  const t = useTranslations('backoffice');
  const { getLabel, getPluralLabel } = useModelLabels();
  const dateLabel = getLabel('date');
  const dateLabelPlural = getPluralLabel('date');
  const historicalItemPlural = getPluralLabel('historicalItem');
  const dateMinWeightLabel = getLabel('fieldDateMinWeight');
  const dateMaxWeightLabel = getLabel('fieldDateMaxWeight');

  return (
    <SimpleCrudPage<BackofficeDate>
      queryKey={backofficeKeys.dates.all()}
      queryFn={(token) => getDates(token)}
      getRows={(data) => (Array.isArray(data) ? (data as BackofficeDate[]) : [])}
      createFn={(token, payload) =>
        createDate(token, {
          date: String(payload.date ?? ''),
          min_weight: Number(payload.min_weight) || 0,
          max_weight: Number(payload.max_weight) || 0,
        })
      }
      updateFn={(token, id, payload) => updateDate(token, id, payload as Partial<BackofficeDate>)}
      deleteFn={(token, id) => deleteDate(token, id)}
      icon={CalendarDays}
      title={dateLabelPlural}
      description={t('dates.description', {
        dateLabel: dateLabel.toLowerCase(),
        historicalItemPlural: historicalItemPlural.toLowerCase(),
      })}
      singularLabel={dateLabel}
      pluralLabel={dateLabelPlural}
      searchColumn="date"
      fields={[
        {
          key: 'date',
          label: t('dates.fieldDateString', { dateLabel }),
          placeholder: t('dates.fieldDatePlaceholder'),
        },
        {
          key: 'min_weight',
          label: dateMinWeightLabel,
          inputType: 'number',
          placeholder: '0',
          parse: (v) => Number(v) || 0,
          tableSize: 100,
        },
        {
          key: 'max_weight',
          label: dateMaxWeightLabel,
          inputType: 'number',
          placeholder: '0',
          parse: (v) => Number(v) || 0,
          tableSize: 100,
        },
      ]}
      deleteDescription={t('dates.deleteDescription', {
        historicalItemPlural: historicalItemPlural.toLowerCase(),
        dateLabel: dateLabel.toLowerCase(),
      })}
    />
  );
}
