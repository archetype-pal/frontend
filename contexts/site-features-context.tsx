'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  getDefaultConfig,
  type SiteFeaturesConfig,
  type SectionKey,
  type SearchCategoryConfig,
} from '@/lib/site-features';
import type { ResultType } from '@/lib/search-types';

type SiteFeaturesContextValue = {
  config: SiteFeaturesConfig;
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
  const defaults = useMemo(() => getDefaultConfig(), []);
  // Config is provided by the server (SSR) in production; the bare-provider
  // fallback to defaults keeps the provider usable standalone (e.g. in tests).
  const [config, setConfig] = useState<SiteFeaturesConfig>(initialConfig ?? defaults);

  // Sync with server-provided config (e.g. after router.refresh())
  const [prevInitialConfig, setPrevInitialConfig] = useState(initialConfig);
  if (initialConfig && initialConfig !== prevInitialConfig) {
    setPrevInitialConfig(initialConfig);
    setConfig(initialConfig);
  }

  const isSectionEnabled = useCallback(
    (key: SectionKey) => config.sections[key] !== false,
    [config]
  );

  const getCategoryConfig = useCallback(
    (type: ResultType) =>
      config.searchCategories[type] ?? {
        enabled: true,
        visibleColumns: [],
        visibleFacets: [],
      },
    [config]
  );

  const enabledCategories = useMemo(
    () =>
      (Object.entries(config.searchCategories) as [ResultType, SearchCategoryConfig][])
        .filter(([, c]) => c.enabled)
        .map(([t]) => t),
    [config]
  );

  const value = useMemo<SiteFeaturesContextValue>(
    () => ({ config, isSectionEnabled, getCategoryConfig, enabledCategories }),
    [config, isSectionEnabled, getCategoryConfig, enabledCategories]
  );

  return <SiteFeaturesContext.Provider value={value}>{children}</SiteFeaturesContext.Provider>;
}

export function useSiteFeatures() {
  const ctx = useContext(SiteFeaturesContext);
  if (!ctx) {
    throw new Error('useSiteFeatures must be used within a SiteFeaturesProvider');
  }
  return ctx;
}
