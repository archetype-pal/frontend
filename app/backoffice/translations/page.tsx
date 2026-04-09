'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import {
  getDefaultModelLabelsConfig,
  type ModelLabelKey,
  type ModelLabelsConfig,
} from '@/lib/model-labels';

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

export default function TranslationsPage() {
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
      toast.success('Model labels saved');
      queryClient.setQueryData(['model-labels'], saved);
      setDirty(false);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error('Failed to save model labels', { description: err.message });
    },
  });

  const handleSave = useCallback(() => {
    if (!dirty || !token || saveMut.isPending) return;
    saveMut.mutate();
  }, [dirty, token, saveMut]);

  useKeyboardShortcut('mod+s', handleSave);

  const handleLabelChange = (key: ModelLabelKey, value: string) => {
    setConfig((prev) => ({
      labels: {
        ...prev.labels,
        [key]: value,
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
          <h1 className="text-2xl font-semibold tracking-tight">Translations</h1>
          <p className="text-sm text-muted-foreground">
            Manage domain-specific labels used across the site.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <h2 className="text-base font-medium">App, model, and field labels</h2>
          <p className="text-sm text-muted-foreground mt-1">
            These labels now live in the frontend and replace backend app/model/field display
            settings.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {fieldMeta.map((field) => (
            <div key={field.key} className="space-y-2 rounded-md border p-4">
              <Label htmlFor={`model-label-${field.key}`} className="font-medium">
                {field.title}
              </Label>
              <Input
                id={`model-label-${field.key}`}
                value={config.labels[field.key] ?? ''}
                onChange={(event) => handleLabelChange(field.key, event.target.value)}
                placeholder={defaults.labels[field.key]}
              />
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
          ))}
        </div>
      </div>

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
            <p className="text-sm text-muted-foreground">You have unsaved changes</p>
            <Button onClick={handleSave} disabled={saveMut.isPending || !token} size="sm">
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
