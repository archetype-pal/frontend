'use client';

import { Feather } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Script } from '@/types/backoffice';
import {
  createScript,
  deleteScript,
  getScripts,
  updateScript,
} from '@/services/backoffice/scribes';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { SimpleCrudPage } from '@/components/backoffice/common/simple-crud-page';

export default function ScriptsPage() {
  const t = useTranslations('backoffice');
  return (
    <SimpleCrudPage<Script>
      queryKey={backofficeKeys.scripts.all()}
      queryFn={() => getScripts()}
      createFn={(payload) => createScript(payload as Partial<Script>)}
      updateFn={(id, payload) => updateScript(id, payload as Partial<Script>)}
      deleteFn={(id) => deleteScript(id)}
      icon={Feather}
      title={t('scripts.title')}
      description={t('scripts.description')}
      singularLabel={t('scripts.singularLabel')}
      pluralLabel={t('scripts.pluralLabel')}
      searchColumn="name"
      fields={[
        {
          key: 'name',
          label: t('scripts.fieldName'),
          placeholder: t('scripts.fieldNamePlaceholder'),
        },
      ]}
      showIdColumn
      deleteDescription={t('scripts.deleteDescription')}
    />
  );
}
