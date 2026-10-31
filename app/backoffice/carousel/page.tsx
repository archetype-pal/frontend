'use client';

import { useTranslations } from 'next-intl';
import { Image as ImageIcon } from 'lucide-react';
import { OrderedItemsPage } from '@/components/backoffice/common/ordered-items-page';
import { SortableCarouselCard } from '@/components/backoffice/carousel/sortable-carousel-card';
import { CarouselEditorPanel } from '@/components/backoffice/carousel/carousel-editor-panel';
import { CarouselPreview } from '@/components/backoffice/carousel/carousel-preview';
import {
  getCarouselItems,
  createCarouselItem,
  updateCarouselItem,
  updateCarouselItemJson,
  deleteCarouselItem,
} from '@/services/backoffice/publications';
import { backofficeKeys } from '@/lib/backoffice/query-keys';
import type { CarouselItem } from '@/types/backoffice';

type CarouselItemForm = { title: string; url: string; image?: File | string };

export default function CarouselPage() {
  const t = useTranslations('backoffice');

  return (
    <OrderedItemsPage<CarouselItem, CarouselItemForm>
      messages="carousel"
      icon={ImageIcon}
      queryKey={backofficeKeys.carousel.all()}
      list={getCarouselItems}
      create={(data, ordering) =>
        createCarouselItem({
          title: data.title,
          url: data.url,
          ordering,
          image: data.image ?? null,
        })
      }
      update={updateCarouselItem}
      updateOrdering={(id, ordering) => updateCarouselItemJson(id, { ordering })}
      remove={deleteCarouselItem}
      deleteTitle={(item) => t('carousel.deleteTitle', { title: item.title })}
      renderCard={(props) => <SortableCarouselCard key={props.item.id} {...props} />}
      renderEditor={(props) => <CarouselEditorPanel {...props} />}
      renderPreview={(items) => <CarouselPreview items={items} />}
    />
  );
}
