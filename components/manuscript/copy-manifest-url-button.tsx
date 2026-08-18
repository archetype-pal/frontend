'use client';

import * as React from 'react';
import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

/** The IIIF Presentation 3.0 manifest URL for a manuscript's item-part. */
export function getManifestUrl(itemPartId: number): string {
  return `${env.apiUrl}/api/v1/iiif/item-parts/${itemPartId}/manifest`;
}

export function CopyManifestUrlButton({ itemPartId }: { itemPartId: number }) {
  const t = useTranslations('manuscript.iiifManifest');
  const manifestUrl = getManifestUrl(itemPartId);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(manifestUrl);
      toast.success(t('toastCopied'));
    } catch {
      toast.error(t('toastCopyFailed'), { description: manifestUrl });
    }
  };

  return (
    <Button type="button" variant="outline" onClick={handleClick} title={manifestUrl}>
      <Copy className="mr-2 h-4 w-4" />
      {t('copyButton')}
    </Button>
  );
}
