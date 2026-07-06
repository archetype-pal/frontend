'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  getDefaultModelLabelsConfig,
  pluralizeLabel,
  resolveModelLabel,
  type ModelLabelKey,
  type ModelLabelsConfig,
} from '@/lib/model-labels';
import { useLocaleStore } from '@/stores/locale-store';

type ModelLabelsContextValue = {
  config: ModelLabelsConfig;
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
  // Config is provided by the server (SSR) in production; the bare-provider
  // fallback to defaults keeps the provider usable standalone (e.g. in tests).
  const [config, setConfig] = useState<ModelLabelsConfig>(initialConfig ?? defaults);

  // Sync with server-provided config (e.g. after router.refresh())
  const [prevInitialConfig, setPrevInitialConfig] = useState(initialConfig);
  if (initialConfig && initialConfig !== prevInitialConfig) {
    setPrevInitialConfig(initialConfig);
    setConfig(initialConfig);
  }

  const locale = useLocaleStore((state) => state.locale);

  const getLabel = useCallback(
    (key: ModelLabelKey) => resolveModelLabel(config.labels[key] ?? defaults.labels[key], locale),
    [config, defaults, locale]
  );
  const getPluralLabel = useCallback(
    (key: ModelLabelKey) => pluralizeLabel(getLabel(key)),
    [getLabel]
  );

  const value = useMemo<ModelLabelsContextValue>(
    () => ({
      config,
      getLabel,
      getPluralLabel,
    }),
    [config, getLabel, getPluralLabel]
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
