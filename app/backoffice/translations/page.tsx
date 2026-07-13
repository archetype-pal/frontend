'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UnsavedChangesBar } from '@/components/backoffice/common/unsaved-changes-bar';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import {
  getDefaultModelLabelsConfig,
  type ModelLabelKey,
  type ModelLabelLocale,
  type ModelLabelsConfig,
} from '@/lib/model-labels';

const generalConfigFieldMeta: Array<{ key: ModelLabelKey; title: string; description: string }> = [
  {
    key: 'siteTitle',
    title: 'Site Title',
    description: 'The site name shown in the header, footer, and browser tab title.',
  },
  {
    key: 'siteTagline',
    title: 'Site Tagline',
    description: 'The short strapline shown next to the site title in the header.',
  },
  {
    key: 'footerFunded',
    title: 'Footer: Funding Statement',
    description: 'The funding acknowledgement shown in the footer.',
  },
  {
    key: 'footerCopyright',
    title: 'Footer: Copyright Notice',
    description: 'The copyright notice shown at the bottom of the footer.',
  },
];

const fieldMeta: Array<{ key: ModelLabelKey; title: string; description: string }> = [
  {
    key: 'appManuscripts',
    title: 'App Name: Manuscripts',
    description: 'Label used for the manuscripts section across the site.',
  },
  {
    key: 'historicalItem',
    title: 'Historical Item',
    description: 'Label used for manuscript/object records.',
  },
  {
    key: 'catalogueNumber',
    title: 'Catalogue Number',
    description: 'Label used for catalogue number headings and table columns.',
  },
  {
    key: 'position',
    title: 'Position',
    description: 'Label used for annotation positions across the site.',
  },
  {
    key: 'date',
    title: 'Date',
    description: 'Label used in date management and date-related actions.',
  },
  {
    key: 'fieldHairType',
    title: 'Field: Hair Type',
    description: 'Display label for the historical-item hair type field.',
  },
  {
    key: 'fieldShelfmark',
    title: 'Field: Shelfmark',
    description: 'Display label for shelfmark fields and table columns across the site.',
  },
  {
    key: 'fieldDateMinWeight',
    title: 'Field: Date Minimum Weight',
    description: 'Display label for date lower-bound weight fields.',
  },
  {
    key: 'fieldDateMaxWeight',
    title: 'Field: Date Maximum Weight',
    description: 'Display label for date upper-bound weight fields.',
  },
];

// Search result-category tab labels. "Manuscripts" is intentionally absent — it
// reuses the "App Name: Manuscripts" label above so renaming it (e.g. to
// "Corpus") stays consistent everywhere the manuscripts label appears.
const searchCategoryFieldMeta: Array<{ key: ModelLabelKey; title: string; description: string }> = [
  {
    key: 'searchCategoryImages',
    title: 'Images',
    description: 'Label for the Images search-results tab.',
  },
  {
    key: 'searchCategoryScribes',
    title: 'Scribes',
    description: 'Label for the Scribes search-results tab.',
  },
  {
    key: 'searchCategoryHands',
    title: 'Hands',
    description: 'Label for the Hands search-results tab.',
  },
  {
    key: 'searchCategoryGraphs',
    title: 'Graphs',
    description: 'Label for the Graphs search-results tab.',
  },
  {
    key: 'searchCategoryTexts',
    title: 'Texts',
    description: 'Label for the Texts search-results tab.',
  },
  {
    key: 'searchCategoryClauses',
    title: 'Clauses',
    description: 'Label for the Clauses search-results tab.',
  },
  {
    key: 'searchCategoryPeople',
    title: 'People',
    description: 'Label for the People search-results tab.',
  },
  {
    key: 'searchCategoryPlaces',
    title: 'Places',
    description: 'Label for the Places search-results tab.',
  },
];

async function fetchModelLabels(): Promise<ModelLabelsConfig> {
  const res = await fetch('/api/model-labels');
  if (!res.ok) throw new Error('Failed to load model labels');
  return res.json();
}

async function saveModelLabels(
  token: string,
  config: ModelLabelsConfig
): Promise<ModelLabelsConfig> {
  const res = await fetch('/api/model-labels', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Failed to save');
  }
  return res.json();
}

const LOCALE_FIELD_META: Array<{ locale: ModelLabelLocale; title: string }> = [
  { locale: 'en', title: 'English' },
  { locale: 'fr', title: 'French' },
];

function LabelFieldsGrid({
  fields,
  config,
  defaults,
  onChange,
}: {
  fields: Array<{ key: ModelLabelKey; title: string; description: string }>;
  config: ModelLabelsConfig;
  defaults: ModelLabelsConfig;
  onChange: (key: ModelLabelKey, locale: ModelLabelLocale, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="space-y-3 rounded-md border p-4">
          <Label className="font-medium">{field.title}</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {LOCALE_FIELD_META.map(({ locale, title }) => (
              <div key={locale} className="space-y-1">
                <Label
                  htmlFor={`model-label-${field.key}-${locale}`}
                  className="text-xs font-normal text-muted-foreground"
                >
                  {title}
                </Label>
                <Input
                  id={`model-label-${field.key}-${locale}`}
                  value={config.labels[field.key]?.[locale] ?? ''}
                  onChange={(event) => onChange(field.key, locale, event.target.value)}
                  placeholder={defaults.labels[field.key][locale]}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{field.description}</p>
        </div>
      ))}
    </div>
  );
}

export default function TranslationsPage() {
  const t = useTranslations('backoffice');
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const defaults = getDefaultModelLabelsConfig();

  const { data: serverConfig, isLoading } = useQuery({
    queryKey: ['model-labels'],
    queryFn: fetchModelLabels,
  });

  const [config, setConfig] = useState<ModelLabelsConfig>(defaults);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!serverConfig) return;
    setConfig(serverConfig); // eslint-disable-line react-hooks/set-state-in-effect
    setDirty(false);
  }, [serverConfig]);

  useUnsavedGuard(dirty);

  const saveMut = useMutation({
    mutationFn: () => saveModelLabels(token!, config),
    onSuccess: (saved) => {
      toast.success(t('translations.toastSaved'));
      queryClient.setQueryData(['model-labels'], saved);
      setDirty(false);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(t('translations.toastFailedSave'), { description: err.message });
    },
  });

  const handleSave = useCallback(() => {
    if (!dirty || !token || saveMut.isPending) return;
    saveMut.mutate();
  }, [dirty, token, saveMut]);

  useKeyboardShortcut('mod+s', handleSave);

  const handleDiscard = useCallback(() => {
    if (serverConfig) {
      setConfig(serverConfig);
      setDirty(false);
    }
  }, [serverConfig]);

  const handleLabelChange = (key: ModelLabelKey, locale: ModelLabelLocale, value: string) => {
    setConfig((prev) => ({
      labels: {
        ...prev.labels,
        [key]: { ...prev.labels[key], [locale]: value },
      },
    }));
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      <div className="flex items-center gap-3">
        <Languages className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('translations.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('translations.subtitle')}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-medium">{t('translations.sectionGeneralTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('translations.sectionGeneralDesc')}
          </p>
        </div>

        <LabelFieldsGrid
          fields={generalConfigFieldMeta}
          config={config}
          defaults={defaults}
          onChange={handleLabelChange}
        />
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-medium">{t('translations.sectionLabelsTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('translations.sectionLabelsDesc')}
          </p>
        </div>

        <LabelFieldsGrid
          fields={fieldMeta}
          config={config}
          defaults={defaults}
          onChange={handleLabelChange}
        />
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-medium">{t('translations.sectionSearchTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('translations.sectionSearchDesc')}
          </p>
        </div>

        <LabelFieldsGrid
          fields={searchCategoryFieldMeta}
          config={config}
          defaults={defaults}
          onChange={handleLabelChange}
        />
      </div>

      <UnsavedChangesBar
        visible={dirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        saving={saveMut.isPending}
      />
    </div>
  );
}
