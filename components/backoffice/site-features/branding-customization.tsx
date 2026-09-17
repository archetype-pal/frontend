'use client';

import { useState } from 'react';
import { ImageIcon, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ImageUploadZone } from '@/components/backoffice/common/image-upload-zone';
import { uploadBrandingLogo } from '@/services/backoffice/branding';
import { formatApiError } from '@/lib/backoffice/format-api-error';
import { getCarouselImageUrl } from '@/utils/api';
import type { BrandingConfig } from '@/lib/site-features';

type Props = {
  branding: BrandingConfig;
  /** Needed to upload a file straight to the backend (see `uploadBrandingLogo`). */
  token: string | null;
  onChange: (value: string) => void;
};

/**
 * Lets a super admin set the logo shown at the top of the header's title row
 * (archetype-pal/frontend#103), by uploading a file — the same
 * `ImageUploadZone` the Partners editor uses — or by pasting an
 * already-hosted URL. An uploaded file is sent immediately, unlike Partners'
 * logo (which rides along with that row's own save): `branding.logoUrl` is a
 * plain string leaf in a JSON blob (`AppSettings`) with no row of its own to
 * attach the file to, so there's nothing to defer the upload to.
 */
export function BrandingCustomization({ branding, token, onChange }: Props) {
  const t = useTranslations('backoffice');
  const logoUrl = branding.logoUrl.trim();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!token) return;
    setUploading(true);
    try {
      const url = await uploadBrandingLogo(token, file);
      onChange(url);
    } catch (err) {
      toast.error(t('siteFeatures.branding.uploadFailed'), { description: formatApiError(err) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle>{t('siteFeatures.branding.title')}</CardTitle>
        </div>
        <CardDescription>{t('siteFeatures.branding.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="mb-2 block">{t('siteFeatures.branding.uploadLabel')}</Label>
          <ImageUploadZone
            currentImageUrl={logoUrl ? getCarouselImageUrl(logoUrl) : null}
            onFileSelect={handleFileSelect}
            loading={uploading}
            // A logo is small and usually wide-and-short, unlike the
            // carousel/partner images this zone was built for — cap the
            // width so it doesn't stretch across a wide backoffice page.
            className="max-w-xs"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="branding-logo-url">{t('siteFeatures.branding.logoUrlLabel')}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="branding-logo-url"
              value={branding.logoUrl}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t('siteFeatures.branding.logoUrlPlaceholder')}
              spellCheck={false}
              className="max-w-md"
              disabled={uploading}
            />
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
                disabled={uploading}
                className="shrink-0 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                {t('siteFeatures.branding.clearButton')}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('siteFeatures.branding.logoUrlDescription')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
