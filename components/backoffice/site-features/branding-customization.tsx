'use client';

import { ImageIcon, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { BrandingConfig } from '@/lib/site-features';

type Props = {
  branding: BrandingConfig;
  onChange: (value: string) => void;
};

/**
 * Lets a super admin set the logo shown at the top of the header's title row
 * (archetype-pal/frontend#103). Takes a URL rather than an upload: site
 * features are a small JSON blob (`AppSettings`), not backed by media
 * storage, so the admin points at an already-hosted image — the same
 * approach used for the partner "website" URL field in the Partners editor.
 */
export function BrandingCustomization({ branding, onChange }: Props) {
  const t = useTranslations('backoffice');
  const logoUrl = branding.logoUrl.trim();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <CardTitle>{t('siteFeatures.branding.title')}</CardTitle>
        </div>
        <CardDescription>{t('siteFeatures.branding.description')}</CardDescription>
      </CardHeader>
      <CardContent>
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
            />
            {logoUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
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
          {logoUrl && (
            <div className="mt-2 flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={t('siteFeatures.branding.previewAlt')}
                className="h-10 w-auto max-w-[10rem] object-contain"
              />
              <span className="text-xs text-muted-foreground">
                {t('siteFeatures.branding.previewLabel')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
