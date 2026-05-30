import * as React from 'react';
import { render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_MODEL_LABELS,
  getDefaultModelLabelsConfig,
  type ModelLabelsConfig,
} from '@/lib/model-labels';
import { ModelLabelsProvider, useModelLabels } from './model-labels-context';

function withProvider(initialConfig?: ModelLabelsConfig) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <ModelLabelsProvider initialConfig={initialConfig}>{children}</ModelLabelsProvider>;
  };
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(getDefaultModelLabelsConfig()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('useModelLabels (without provider)', () => {
  it('throws an explicit error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useModelLabels())).toThrow(
      /useModelLabels must be used within a ModelLabelsProvider/
    );
    spy.mockRestore();
  });
});

describe('ModelLabelsProvider with initialConfig', () => {
  it('uses the supplied config and skips the fetch', () => {
    const cfg = getDefaultModelLabelsConfig();
    cfg.labels.appManuscripts = 'Charters';
    const { result } = renderHook(() => useModelLabels(), { wrapper: withProvider(cfg) });
    expect(result.current.config).toBe(cfg);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('getLabel returns overridden values', () => {
    const cfg = getDefaultModelLabelsConfig();
    cfg.labels.appManuscripts = 'Charters';
    const { result } = renderHook(() => useModelLabels(), { wrapper: withProvider(cfg) });
    expect(result.current.getLabel('appManuscripts')).toBe('Charters');
  });

  it('getLabel falls back to the default when the key is missing in config.labels', () => {
    const cfg = getDefaultModelLabelsConfig();
    // @ts-expect-error — testing runtime fallback when a key disappears
    delete cfg.labels.position;
    const { result } = renderHook(() => useModelLabels(), { wrapper: withProvider(cfg) });
    expect(result.current.getLabel('position')).toBe(DEFAULT_MODEL_LABELS.position);
  });

  it('getPluralLabel pluralizes the resolved label', () => {
    const cfg = getDefaultModelLabelsConfig();
    cfg.labels.appManuscripts = 'Charter';
    const { result } = renderHook(() => useModelLabels(), { wrapper: withProvider(cfg) });
    expect(result.current.getPluralLabel('appManuscripts')).toBe('Charters');
  });

  it('getPluralLabel handles ies / es rules transitively', () => {
    const cfg = getDefaultModelLabelsConfig();
    cfg.labels.historicalItem = 'City';
    cfg.labels.catalogueNumber = 'Box';
    const { result } = renderHook(() => useModelLabels(), { wrapper: withProvider(cfg) });
    expect(result.current.getPluralLabel('historicalItem')).toBe('Cities');
    expect(result.current.getPluralLabel('catalogueNumber')).toBe('Boxes');
  });
});

describe('ModelLabelsProvider without initialConfig', () => {
  it('uses defaults synchronously and never fetches (config is SSR-provided)', () => {
    const { result } = renderHook(() => useModelLabels(), { wrapper: withProvider() });
    expect(result.current.config).toEqual(getDefaultModelLabelsConfig());
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('ModelLabelsProvider sync with replaced initialConfig prop', () => {
  it('adopts a new initialConfig when the prop reference changes (e.g. router.refresh)', () => {
    const cfgA = getDefaultModelLabelsConfig();
    cfgA.labels.appManuscripts = 'A';
    const cfgB = getDefaultModelLabelsConfig();
    cfgB.labels.appManuscripts = 'B';

    const probeRef = React.createRef<{ value: ReturnType<typeof useModelLabels> | null }>();
    const Probe = React.forwardRef<{ value: ReturnType<typeof useModelLabels> | null }>(
      function Probe(_props, ref) {
        const value = useModelLabels();
        React.useImperativeHandle(ref, () => ({ value }), [value]);
        return null;
      }
    );

    function Holder({ cfg }: { cfg: ModelLabelsConfig }) {
      return (
        <ModelLabelsProvider initialConfig={cfg}>
          <Probe ref={probeRef} />
        </ModelLabelsProvider>
      );
    }

    const { rerender } = render(<Holder cfg={cfgA} />);
    expect(probeRef.current?.value?.getLabel('appManuscripts')).toBe('A');

    rerender(<Holder cfg={cfgB} />);
    expect(probeRef.current?.value?.getLabel('appManuscripts')).toBe('B');
  });
});
