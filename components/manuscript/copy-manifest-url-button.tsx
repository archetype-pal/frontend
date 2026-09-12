'use client';

import * as React from 'react';
import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { getManifestUrl } from '@/lib/iiif-manifest';

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
    <Button type="button" variant="outline" size="sm" onClick={handleClick} title={manifestUrl}>
      <Copy className="mr-1.5 h-3.5 w-3.5" />
      {t('copyButton')}
    </Button>
  );
}
