'use client';

import { ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ALL_FEATURE_KEYS, type FeatureKey } from '@/lib/site-features';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  manuscriptDescriptions: ScrollText,
};

type Props = {
  features: Record<FeatureKey, boolean>;
  onChange: (key: FeatureKey, enabled: boolean) => void;
};

/**
 * Admin toggles for optional site features. Deliberately *not* part of
 * `SectionToggles`: sections are top-level navigation entries with an order the
 * admin drags around, whereas these flags hide a surface inside pages that stay
 * exactly where they are — so no drag handles, no ordering, and one line of
 * plain English per flag saying what disappears.
 */
export function FeatureToggles({ features, onChange }: Props) {
  const t = useTranslations('backoffice');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{t('siteFeatures.featuresTitle')}</CardTitle>
        <CardDescription>{t('siteFeatures.featuresDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ALL_FEATURE_KEYS.map((key) => {
            const Icon = FEATURE_ICONS[key];
            // Only an explicit `false` disables — same convention as the
            // section toggles and the runtime predicates.
            const enabled = features?.[key] !== false;

            return (
              <label
                key={key}
                htmlFor={`feature-${key}`}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                  enabled
                    ? 'bg-card border-border'
                    : 'bg-muted/40 border-transparent text-muted-foreground'
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`feature-${key}`} className="text-sm font-medium cursor-pointer">
                    {t(`siteFeatures.features.${key}`)}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t(`siteFeatures.featureDescriptions.${key}`)}
                  </p>
                </div>
                <Switch
                  id={`feature-${key}`}
                  checked={enabled}
                  onCheckedChange={(checked) => onChange(key, checked)}
                  className="mt-0.5 shrink-0"
                />
              </label>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
