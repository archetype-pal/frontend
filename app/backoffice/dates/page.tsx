'use client';

import { CalendarDays } from 'lucide-react';
import type { BackofficeDate } from '@/types/backoffice';
import { createDate, deleteDate, getDates, updateDate } from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { SimpleCrudPage } from '@/components/backoffice/common/simple-crud-page';
import { useModelLabels } from '@/contexts/model-labels-context';

export default function DatesPage() {
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
      description={`Manage ${dateLabel.toLowerCase()} records used across ${historicalItemPlural.toLowerCase()}`}
      singularLabel={dateLabel}
      pluralLabel={dateLabelPlural}
      searchColumn="date"
      fields={[
        { key: 'date', label: `${dateLabel} string`, placeholder: 'e.g. s.xii' },
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
      deleteDescription={`This may affect ${historicalItemPlural.toLowerCase()} that reference this ${dateLabel.toLowerCase()}.`}
    />
  );
}
