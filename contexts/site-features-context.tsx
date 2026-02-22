'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  getDefaultConfig,
  type SiteFeaturesConfig,
  type SectionKey,
  type SearchCategoryConfig,
} from '@/lib/site-features';
import type { ResultType } from '@/lib/search-types';

type SiteFeaturesContextValue = {
  config: SiteFeaturesConfig;
  loading: boolean;
  isSectionEnabled: (key: SectionKey) => boolean;
  getCategoryConfig: (type: ResultType) => SearchCategoryConfig;
  enabledCategories: ResultType[];
};

const SiteFeaturesContext = createContext<SiteFeaturesContextValue | null>(null);

export function SiteFeaturesProvider({
  children,
  initialConfig,
}: {
  children: ReactNode;
  initialConfig?: SiteFeaturesConfig;
}) {
  const defaults = getDefaultConfig();
  const [config, setConfig] = useState<SiteFeaturesConfig>(initialConfig ?? defaults);
  const [loading, setLoading] = useState(!initialConfig);

  useEffect(() => {
    if (initialConfig) return;
    fetch('/api/site-features')
      .then((r) => (r.ok ? r.json() : defaults))
      .then((c) => setConfig(c))
      .catch(() => setConfig(defaults))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSectionEnabled = (key: SectionKey) => config.sections[key] !== false;

  const getCategoryConfig = (type: ResultType) =>
    config.searchCategories[type] ?? {
      enabled: true,
      visibleColumns: [],
      visibleFacets: [],
    };

  const enabledCategories = (
    Object.entries(config.searchCategories) as [ResultType, SearchCategoryConfig][]
  )
    .filter(([, c]) => c.enabled)
    .map(([t]) => t);

  return (
    <SiteFeaturesContext.Provider
      value={{ config, loading, isSectionEnabled, getCategoryConfig, enabledCategories }}
    >
      {children}
    </SiteFeaturesContext.Provider>
  );
}

export function useSiteFeatures() {
  const ctx = useContext(SiteFeaturesContext);
  if (!ctx) {
    throw new Error('useSiteFeatures must be used within a SiteFeaturesProvider');
  }
  return ctx;
}
