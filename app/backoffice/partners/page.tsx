'use client';

import { useTranslations } from 'next-intl';
import { Handshake } from 'lucide-react';
import { OrderedItemsPage } from '@/components/backoffice/common/ordered-items-page';
import { SortablePartnerCard } from '@/components/backoffice/partners/sortable-partner-card';
import { PartnerEditorPanel } from '@/components/backoffice/partners/partner-editor-panel';
import { PartnerPreview } from '@/components/backoffice/partners/partner-preview';
import {
  getPartners,
  createPartner,
  updatePartner,
  updatePartnerJson,
  deletePartner,
} from '@/services/backoffice/partners';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { PartnerItem } from '@/types/backoffice';

type PartnerForm = { name: string; url: string; logo?: File | string };

export default function PartnersPage() {
  const t = useTranslations('backoffice');

  return (
    <OrderedItemsPage<PartnerItem, PartnerForm>
      messages="partners"
      icon={Handshake}
      queryKey={backofficeKeys.partners.all()}
      list={getPartners}
      create={(data, ordering) =>
        createPartner({ name: data.name, url: data.url, ordering, logo: data.logo ?? null })
      }
      update={updatePartner}
      updateOrdering={(id, ordering) => updatePartnerJson(id, { ordering })}
      remove={deletePartner}
      deleteTitle={(item) => t('partners.deleteTitle', { name: item.name })}
      renderCard={(props) => <SortablePartnerCard key={props.item.id} {...props} />}
      renderEditor={(props) => <PartnerEditorPanel {...props} />}
      renderPreview={(items) => <PartnerPreview items={items} />}
    />
  );
}
