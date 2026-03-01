'use client';

import { BookMarked } from 'lucide-react';
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
      title="Bibliographic Sources"
      description="Manage bibliographic source records"
      singularLabel="Source"
      pluralLabel="Sources"
      searchColumn="name"
      fields={[
        { key: 'name', label: 'Name', placeholder: 'Full source name' },
        { key: 'label', label: 'Label', placeholder: 'Short label', tableSize: 150 },
      ]}
      deleteDescription="This may affect items that reference this source."
    />
  );
}
