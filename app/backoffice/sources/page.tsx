'use client';

import { BookMarked } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  createSource,
  deleteSource,
  getSources,
  updateSource,
} from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { BibliographicSource } from '@/types/backoffice';
import { SimpleCrudPage } from '@/components/backoffice/common/simple-crud-page';

export default function SourcesPage() {
  const t = useTranslations('backoffice');
  return (
    <SimpleCrudPage<BibliographicSource>
      queryKey={backofficeKeys.sources.all()}
      queryFn={(token) => getSources(token)}
      getRows={(data) => (Array.isArray(data) ? (data as BibliographicSource[]) : [])}
      createFn={(token, payload) => createSource(token, payload as Partial<BibliographicSource>)}
      updateFn={(token, id, payload) =>
        updateSource(token, id, payload as Partial<BibliographicSource>)
      }
      deleteFn={(token, id) => deleteSource(token, id)}
      icon={BookMarked}
      title={t('sources.title')}
      description={t('sources.description')}
      singularLabel={t('sources.singularLabel')}
      pluralLabel={t('sources.pluralLabel')}
      searchColumn="name"
      fields={[
        {
          key: 'name',
          label: t('sources.fieldName'),
          placeholder: t('sources.fieldNamePlaceholder'),
        },
        {
          key: 'label',
          label: t('sources.fieldLabel'),
          placeholder: t('sources.fieldLabelPlaceholder'),
          tableSize: 150,
        },
      ]}
      deleteDescription={t('sources.deleteDescription')}
    />
  );
}
