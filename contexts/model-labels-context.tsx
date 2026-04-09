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
  getDefaultModelLabelsConfig,
  pluralizeLabel,
  type ModelLabelKey,
  type ModelLabelsConfig,
} from '@/lib/model-labels';

type ModelLabelsContextValue = {
  config: ModelLabelsConfig;
  loading: boolean;
  getLabel: (key: ModelLabelKey) => string;
  getPluralLabel: (key: ModelLabelKey) => string;
};

const ModelLabelsContext = createContext<ModelLabelsContextValue | null>(null);

export function ModelLabelsProvider({
  children,
  initialConfig,
}: {
  children: ReactNode;
  initialConfig?: ModelLabelsConfig;
}) {
  const defaults = useMemo(() => getDefaultModelLabelsConfig(), []);
  const [config, setConfig] = useState<ModelLabelsConfig>(initialConfig ?? defaults);
  const [loading, setLoading] = useState(!initialConfig);

  // Sync with server-provided config (e.g. after router.refresh())
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    if (initialConfig) return;
    fetch('/api/model-labels')
      .then((r) => (r.ok ? r.json() : defaults))
      .then((c) => setConfig(c))
      .catch(() => setConfig(defaults))
      .finally(() => setLoading(false));
  }, [defaults, initialConfig]);

  const getLabel = useCallback(
    (key: ModelLabelKey) => config.labels[key] ?? defaults.labels[key],
    [config, defaults]
  );
  const getPluralLabel = useCallback(
    (key: ModelLabelKey) => pluralizeLabel(getLabel(key)),
    [getLabel]
  );

  const value = useMemo<ModelLabelsContextValue>(
    () => ({
      config,
      loading,
      getLabel,
      getPluralLabel,
    }),
    [config, loading, getLabel, getPluralLabel]
  );

  return <ModelLabelsContext.Provider value={value}>{children}</ModelLabelsContext.Provider>;
}

export function useModelLabels() {
  const ctx = useContext(ModelLabelsContext);
  if (!ctx) {
    throw new Error('useModelLabels must be used within a ModelLabelsProvider');
  }
  return ctx;
}
