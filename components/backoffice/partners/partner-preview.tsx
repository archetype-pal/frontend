'use client';

import { useTranslations } from 'next-intl';
import { Handshake } from 'lucide-react';
import { getCarouselImageUrl } from '@/utils/api';
import type { PartnerItem } from '@/types/backoffice';

interface PartnerPreviewProps {
  items: PartnerItem[];
}

/** Mini live preview of the public-facing footer Partners section. */
export function PartnerPreview({ items }: PartnerPreviewProps) {
  const t = useTranslations('backoffice');

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <Handshake className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">{t('partners.previewEmptyTitle')}</p>
        <p className="text-xs mt-1 opacity-70">{t('partners.previewEmptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('partners.livePreviewTitle')}</h2>
        <p className="text-xs text-muted-foreground">{t('partners.livePreviewDesc')}</p>
      </div>

      <div className="rounded-xl border bg-primary p-6">
        <div className="flex flex-wrap gap-4">
          {items.map((partner) => (
            <div
              key={partner.id}
              className="bg-white/90 rounded-md p-2 flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getCarouselImageUrl(partner.logo)}
                alt={partner.name}
                width={80}
                height={40}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
