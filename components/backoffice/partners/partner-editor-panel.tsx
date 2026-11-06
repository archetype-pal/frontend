'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ImageUploadZone } from '@/components/backoffice/common/image-upload-zone';
import { getCarouselImageUrl } from '@/utils/api';
import type { PartnerItem } from '@/types/backoffice';
import { Input } from '@/components/ui/input';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';

interface PartnerEditorPanelProps {
  /** The item being edited, or null for "create new" mode. */
  item: PartnerItem | null;
  /** Whether a save mutation is in progress. */
  saving: boolean;
  onSave: (data: { name: string; url: string; logo?: File | string }) => void;
  onCancel: () => void;
}

export function PartnerEditorPanel({ item, saving, onSave, onCancel }: PartnerEditorPanelProps) {
  const t = useTranslations('backoffice');
  const isNew = !item;

  const [name, setName] = useState(item?.name ?? '');
  const [url, setUrl] = useState(item?.url ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPath, setLogoPath] = useState(item?.logo ?? '');

  // Reset form when the selected item changes
  useEffect(() => {
    setName(item?.name ?? ''); // oxlint-disable-line react-hooks/set-state-in-effect
    setUrl(item?.url ?? '');
    setLogoPath(item?.logo ?? '');
    setLogoFile(null);
  }, [item]);

  const isDirty =
    isNew ||
    name !== (item?.name ?? '') ||
    url !== (item?.url ?? '') ||
    logoPath !== (item?.logo ?? '') ||
    logoFile !== null;

  const hasLogoValue = logoFile !== null || logoPath.trim().length > 0;
  const canSave = name.trim().length > 0 && hasLogoValue && isDirty && !saving;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      url: url.trim(),
      ...(logoFile ? { logo: logoFile } : logoPath.trim() ? { logo: logoPath.trim() } : {}),
    });
  }, [canSave, name, url, logoFile, logoPath, onSave]);

  useKeyboardShortcut('mod+s', handleSave);

  const currentLogoUrl = logoPath ? getCarouselImageUrl(logoPath) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {isNew ? t('partners.newItemTitle') : t('partners.editItemTitle')}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {t('partners.cancelButton')}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isNew ? t('partners.createButton') : t('partners.saveButton')}
          </Button>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">{t('partners.logoLabel')}</Label>
        <ImageUploadZone
          key={item?.id ?? 'new'}
          currentImageUrl={currentLogoUrl}
          onFileSelect={(file) => setLogoFile(file)}
          onClear={() => setLogoFile(null)}
          loading={saving}
        />
        {logoPath && (
          <div className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLogoPath('')}
              disabled={saving}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              {t('partners.clearLogoButton')}
            </Button>
          </div>
        )}
        {isNew && !hasLogoValue && (
          <p className="mt-1.5 text-xs text-amber-600">{t('partners.uploadHint')}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="partner-name">{t('partners.nameLabel')}</Label>
        <Input
          id="partner-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('partners.namePlaceholder')}
          disabled={saving}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="partner-url">{t('partners.urlLabel')}</Label>
        <Input
          id="partner-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('partners.urlPlaceholder')}
          disabled={saving}
        />
        <p className="text-xs text-muted-foreground">{t('partners.urlHint')}</p>
      </div>
    </div>
  );
}
