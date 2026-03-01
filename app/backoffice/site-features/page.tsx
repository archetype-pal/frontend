'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ToggleLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useUnsavedGuard } from '@/hooks/backoffice/use-unsaved-guard';
import { useKeyboardShortcut } from '@/hooks/backoffice/use-keyboard-shortcut';
import { SectionToggles } from '@/components/backoffice/site-features/section-toggles';
import { SearchCategoryConfigPanel } from '@/components/backoffice/site-features/search-category-config';
import {
  getDefaultConfig,
  normalizeSectionOrder,
  type SiteFeaturesConfig,
  type SectionKey,
  type SearchCategoryConfig,
} from '@/lib/site-features';
import type { ResultType } from '@/lib/search-types';

async function fetchSiteFeatures(): Promise<SiteFeaturesConfig> {
  const res = await fetch('/api/site-features');
  if (!res.ok) throw new Error('Failed to load site features');
  return res.json();
}

async function saveSiteFeatures(
  token: string,
  config: SiteFeaturesConfig
): Promise<SiteFeaturesConfig> {
  const res = await fetch('/api/site-features', {
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

export default function SiteFeaturesPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const defaults = getDefaultConfig();

  const { data: serverConfig, isLoading } = useQuery({
    queryKey: ['site-features'],
    queryFn: fetchSiteFeatures,
  });

  const [config, setConfig] = useState<SiteFeaturesConfig>(defaults);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (serverConfig) {
      setConfig(serverConfig); // eslint-disable-line react-hooks/set-state-in-effect
      setDirty(false);
    }
  }, [serverConfig]);

  useUnsavedGuard(dirty);

  const saveMut = useMutation({
    mutationFn: () => saveSiteFeatures(token!, config),
    onSuccess: (saved) => {
      toast.success('Site features saved');
      queryClient.setQueryData(['site-features'], saved);
      setDirty(false);
    },
    onError: (err: Error) => {
      toast.error('Failed to save site features', { description: err.message });
    },
  });

  const handleSave = useCallback(() => {
    if (!dirty || !token || saveMut.isPending) return;
    saveMut.mutate();
  }, [dirty, token, saveMut]);

  useKeyboardShortcut('mod+s', handleSave);

  const handleSectionChange = (key: SectionKey, enabled: boolean) => {
    setConfig((prev) => ({
      ...prev,
      sections: { ...prev.sections, [key]: enabled },
    }));
    setDirty(true);
  };

  const handleSectionOrderChange = (sectionOrder: SectionKey[]) => {
    setConfig((prev) => ({
      ...prev,
      sectionOrder: normalizeSectionOrder(sectionOrder),
    }));
    setDirty(true);
  };

  const handleCategoryChange = (type: ResultType, catConfig: SearchCategoryConfig) => {
    setConfig((prev) => ({
      ...prev,
      searchCategories: { ...prev.searchCategories, [type]: catConfig },
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
        <ToggleLeft className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Site Features</h1>
          <p className="text-sm text-muted-foreground">
            Enable or disable site features and configure search behaviour.
          </p>
        </div>
      </div>

      <SectionToggles
        sections={config.sections}
        sectionOrder={config.sectionOrder}
        onChange={handleSectionChange}
        onOrderChange={handleSectionOrderChange}
      />
      <SearchCategoryConfigPanel
        categories={config.searchCategories}
        onChange={handleCategoryChange}
      />

      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
            <p className="text-sm text-muted-foreground">You have unsaved changes</p>
            <Button onClick={handleSave} disabled={saveMut.isPending} size="sm">
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
