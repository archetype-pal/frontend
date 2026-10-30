'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { BackofficePlace } from '@/types/backoffice';
import {
  createPlace,
  deletePlace,
  getPlaces,
  updatePlace,
} from '@/services/backoffice/manuscripts';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import { SimpleCrudPage } from '@/components/backoffice/common/simple-crud-page';

export default function PlacesPage() {
  const t = useTranslations('backoffice');

  return (
    <SimpleCrudPage<BackofficePlace>
      queryKey={backofficeKeys.places.all()}
      queryFn={() => getPlaces()}
      createFn={(payload) => createPlace(payload as Partial<BackofficePlace>)}
      updateFn={(id, payload) => updatePlace(id, payload as Partial<BackofficePlace>)}
      deleteFn={(id) => deletePlace(id)}
      icon={MapPin}
      title={t('places.title')}
      description={t('places.description')}
      singularLabel={t('places.singular')}
      pluralLabel={t('places.title')}
      searchColumn="name"
      fields={[
        {
          key: 'name',
          label: t('places.fieldName'),
          placeholder: t('places.fieldNamePlaceholder'),
        },
      ]}
      deleteDescription={t('places.deleteDescription')}
    />
  );
}
