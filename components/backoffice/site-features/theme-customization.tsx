'use client';

import { Palette, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { ThemeColors } from '@/lib/site-features';

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

const THEME_FIELDS: { key: keyof ThemeColors; labelKey: string; descriptionKey: string }[] = [
  {
    key: 'primaryColor',
    labelKey: 'backgroundColor',
    descriptionKey: 'backgroundColorDescription',
  },
  {
    key: 'primaryForegroundColor',
    labelKey: 'frontColor',
    descriptionKey: 'frontColorDescription',
  },
  {
    key: 'accentColor',
    labelKey: 'secondaryColor',
    descriptionKey: 'secondaryColorDescription',
  },
];

/**
 * The header's two rows — title/tagline and navigation — repaintable
 * independently of the 3 fields above (archetype-pal/frontend#103).
 */
const HEADER_ROW_FIELDS: { key: keyof ThemeColors; labelKey: string; descriptionKey: string }[] = [
  {
    key: 'titleBarBackgroundColor',
    labelKey: 'titleBarBackgroundColor',
    descriptionKey: 'titleBarBackgroundColorDescription',
  },
  {
    key: 'titleBarTextColor',
    labelKey: 'titleBarTextColor',
    descriptionKey: 'titleBarTextColorDescription',
  },
  {
    key: 'navBarBackgroundColor',
    labelKey: 'navBarBackgroundColor',
    descriptionKey: 'navBarBackgroundColorDescription',
  },
  {
    key: 'navBarTextColor',
    labelKey: 'navBarTextColor',
    descriptionKey: 'navBarTextColorDescription',
  },
];

type Props = {
  theme: ThemeColors;
  defaults: ThemeColors;
  onChange: (key: keyof ThemeColors, value: string) => void;
};

/**
 * Lets a super admin repaint the site's 3 brand colours — the same ones
 * `lib/site-theme.ts` previously only let a deployer pick at build time via
 * `NEXT_PUBLIC_SITE_THEME`. Saved values override that build-time preset;
 * "Reset" restores whatever this deployment already renders with today.
 */
export function ThemeCustomization({ theme, defaults, onChange }: Props) {
  const t = useTranslations('backoffice');

  const renderField = ({
    key,
    labelKey,
    descriptionKey,
  }: {
    key: keyof ThemeColors;
    labelKey: string;
    descriptionKey: string;
  }) => {
    const value = theme[key];
    const isValid = HEX_COLOR_RE.test(value);
    const isDefault = value.toLowerCase() === defaults[key].toLowerCase();

    return (
      <div key={key} className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
        <input
          type="color"
          aria-label={t(`siteFeatures.theme.${labelKey}`)}
          value={isValid ? value : defaults[key]}
          onChange={(e) => onChange(key, e.target.value)}
          className="mt-0.5 h-8 w-8 shrink-0 cursor-pointer rounded border border-input p-0.5"
        />
        <div className="min-w-0 flex-1">
          <Label htmlFor={`theme-${key}`} className="text-sm font-medium">
            {t(`siteFeatures.theme.${labelKey}`)}
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(`siteFeatures.theme.${descriptionKey}`)}
          </p>
          <Input
            id={`theme-${key}`}
            value={value}
            onChange={(e) => onChange(key, e.target.value)}
            spellCheck={false}
            className="mt-2 h-8 max-w-32 font-mono text-xs"
            aria-invalid={!isValid}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isDefault}
          onClick={() => onChange(key, defaults[key])}
          className="shrink-0 gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t('siteFeatures.theme.reset')}
        </Button>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <CardTitle>{t('siteFeatures.theme.title')}</CardTitle>
        </div>
        <CardDescription>{t('siteFeatures.theme.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">{THEME_FIELDS.map(renderField)}</div>
        <div className="mt-6">
          <h3 className="text-sm font-medium">{t('siteFeatures.theme.headerRowsTitle')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('siteFeatures.theme.headerRowsDescription')}
          </p>
          <div className="mt-3 space-y-4">{HEADER_ROW_FIELDS.map(renderField)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
