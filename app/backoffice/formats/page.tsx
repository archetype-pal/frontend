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
      queryFn={(token) => getFormats(token)}
      getRows={(data) => (Array.isArray(data) ? (data as ItemFormat[]) : [])}
      createFn={(token, payload) => createFormat(token, payload as Partial<ItemFormat>)}
      updateFn={(token, id, payload) => updateFormat(token, id, payload as Partial<ItemFormat>)}
      deleteFn={(token, id) => deleteFormat(token, id)}
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
