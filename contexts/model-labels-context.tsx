'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
  const defaults = getDefaultModelLabelsConfig();
  const [config, setConfig] = useState<ModelLabelsConfig>(initialConfig ?? defaults);
  const [loading, setLoading] = useState(!initialConfig);

  useEffect(() => {
    if (initialConfig) return;
    fetch('/api/model-labels')
      .then((r) => (r.ok ? r.json() : defaults))
      .then((c) => setConfig(c))
      .catch(() => setConfig(defaults))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<ModelLabelsContextValue>(
    () => ({
      config,
      loading,
      getLabel: (key) => config.labels[key] ?? defaults.labels[key],
      getPluralLabel: (key) => pluralizeLabel(config.labels[key] ?? defaults.labels[key]),
    }),
    [config, loading, defaults]
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
