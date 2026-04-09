'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  const defaults = useMemo(() => getDefaultConfig(), []);
  const [config, setConfig] = useState<SiteFeaturesConfig>(initialConfig ?? defaults);
  const [loading, setLoading] = useState(!initialConfig);

  // Sync with server-provided config (e.g. after router.refresh())
  const [prevInitialConfig, setPrevInitialConfig] = useState(initialConfig);
  if (initialConfig && initialConfig !== prevInitialConfig) {
    setPrevInitialConfig(initialConfig);
    setConfig(initialConfig);
  }

  useEffect(() => {
    if (initialConfig) return;
    fetch('/api/site-features')
      .then((r) => (r.ok ? r.json() : defaults))
      .then((c) => setConfig(c))
      .catch(() => setConfig(defaults))
      .finally(() => setLoading(false));
  }, [defaults, initialConfig]);

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
    () => ({ config, loading, isSectionEnabled, getCategoryConfig, enabledCategories }),
    [config, loading, isSectionEnabled, getCategoryConfig, enabledCategories]
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
