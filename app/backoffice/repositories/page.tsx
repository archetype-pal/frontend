'use client';

import { Building2 } from 'lucide-react';
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
  return (
    <SimpleCrudPage<Repository>
      queryKey={backofficeKeys.repositories.all()}
      queryFn={(token) => getRepositories(token)}
      getRows={(data) =>
        data && typeof data === 'object' && 'results' in data
          ? ((data as { results?: Repository[] }).results ?? [])
          : []
      }
      createFn={(token, payload) =>
        createRepository(token, {
          name: String(payload.name ?? ''),
          label: String(payload.label ?? ''),
          place: String(payload.place ?? ''),
          url: null,
          type: null,
        })
      }
      updateFn={(token, id, payload) => updateRepository(token, id, payload as Partial<Repository>)}
      deleteFn={(token, id) => deleteRepository(token, id)}
      icon={Building2}
      title="Repositories"
      description="Manage institutional repositories"
      singularLabel="Repository"
      pluralLabel="Repositories"
      searchColumn="name"
      fields={[
        { key: 'name', label: 'Name', placeholder: 'British Library' },
        { key: 'label', label: 'Label', placeholder: 'BL' },
        { key: 'place', label: 'Place', placeholder: 'London' },
      ]}
      deleteDescription="This may affect historical items that reference this repository."
    />
  );
}
