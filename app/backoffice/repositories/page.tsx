'use client';

import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  createRepository,
  deleteRepository,
  getRepositories,
  updateRepository,
} from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { Repository } from '@/types/backoffice';
import { SimpleCrudPage } from '@/components/backoffice/common/simple-crud-page';

export default function RepositoriesPage() {
  const t = useTranslations('backoffice');
  return (
    <SimpleCrudPage<Repository>
      queryKey={backofficeKeys.repositories.all()}
      queryFn={() => getRepositories()}
      getRows={(data) => (Array.isArray(data) ? (data as Repository[]) : [])}
      createFn={(payload) =>
        createRepository({
          name: String(payload.name ?? ''),
          label: String(payload.label ?? ''),
          place: String(payload.place ?? ''),
          url: null,
          type: null,
        })
      }
      updateFn={(id, payload) => updateRepository(id, payload as Partial<Repository>)}
      deleteFn={(id) => deleteRepository(id)}
      icon={Building2}
      title={t('repositories.title')}
      description={t('repositories.description')}
      singularLabel={t('repositories.singularLabel')}
      pluralLabel={t('repositories.pluralLabel')}
      searchColumn="name"
      fields={[
        {
          key: 'name',
          label: t('repositories.fieldName'),
          placeholder: t('repositories.fieldNamePlaceholder'),
        },
        {
          key: 'label',
          label: t('repositories.fieldLabel'),
          placeholder: t('repositories.fieldLabelPlaceholder'),
        },
        {
          key: 'place',
          label: t('repositories.fieldPlace'),
          placeholder: t('repositories.fieldPlacePlaceholder'),
        },
      ]}
      deleteDescription={t('repositories.deleteDescription')}
      deleteBlockedReason={(row) =>
        row.current_item_count
          ? t('repositories.heldItems', { count: row.current_item_count })
          : null
      }
    />
  );
}
