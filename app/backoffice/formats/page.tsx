'use client';

import { Ruler } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ItemFormat } from '@/types/backoffice';
import {
  createFormat,
  deleteFormat,
  getFormats,
  updateFormat,
} from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { SimpleCrudPage } from '@/components/backoffice/common/simple-crud-page';

export default function FormatsPage() {
  const t = useTranslations('backoffice');
  return (
    <SimpleCrudPage<ItemFormat>
      queryKey={backofficeKeys.formats.all()}
      queryFn={() => getFormats()}
      getRows={(data) => (Array.isArray(data) ? (data as ItemFormat[]) : [])}
      createFn={(payload) => createFormat(payload as Partial<ItemFormat>)}
      updateFn={(id, payload) => updateFormat(id, payload as Partial<ItemFormat>)}
      deleteFn={(id) => deleteFormat(id)}
      icon={Ruler}
      title={t('formats.title')}
      description={t('formats.description')}
      singularLabel={t('formats.singularLabel')}
      pluralLabel={t('formats.pluralLabel')}
      searchColumn="name"
      fields={[
        {
          key: 'name',
          label: t('formats.fieldName'),
          placeholder: t('formats.fieldNamePlaceholder'),
        },
      ]}
      showIdColumn
      deleteDescription={t('formats.deleteDescription')}
    />
  );
}
