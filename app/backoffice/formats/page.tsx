'use client';

import { Ruler } from 'lucide-react';
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
  return (
    <SimpleCrudPage<ItemFormat>
      queryKey={backofficeKeys.formats.all()}
      queryFn={(token) => getFormats(token)}
      getRows={(data) => (Array.isArray(data) ? (data as ItemFormat[]) : [])}
      createFn={(token, payload) => createFormat(token, payload as Partial<ItemFormat>)}
      updateFn={(token, id, payload) => updateFormat(token, id, payload as Partial<ItemFormat>)}
      deleteFn={(token, id) => deleteFormat(token, id)}
      icon={Ruler}
      title="Formats"
      description="Manage item formats for manuscript descriptions"
      singularLabel="Format"
      pluralLabel="Formats"
      searchColumn="name"
      fields={[
        {
          key: 'name',
          label: 'Name',
          placeholder: 'e.g. Codex, Roll',
        },
      ]}
      showIdColumn
      deleteDescription="This may affect items that use this format."
    />
  );
}
