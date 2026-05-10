import * as React from 'react';
import { render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getDefaultConfig, type SiteFeaturesConfig } from '@/lib/site-features';
import { SiteFeaturesProvider, useSiteFeatures } from './site-features-context';

function withProvider(initialConfig?: SiteFeaturesConfig) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SiteFeaturesProvider initialConfig={initialConfig}>{children}</SiteFeaturesProvider>;
  };
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Default: any unmocked fetch returns the canonical defaults so tests that
  // exercise the fetch fallback path don't hang.
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify(getDefaultConfig()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  ) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('useSiteFeatures (without provider)', () => {
  it('throws an explicit error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSiteFeatures())).toThrow(
      /useSiteFeatures must be used within a SiteFeaturesProvider/
    );
    spy.mockRestore();
  });
});

describe('SiteFeaturesProvider with initialConfig', () => {
  it('uses the supplied config and skips the fetch', async () => {
    const cfg = getDefaultConfig();
    cfg.sections.lightbox = false;
    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider(cfg) });
    expect(result.current.loading).toBe(false);
    expect(result.current.config).toBe(cfg);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('isSectionEnabled returns true unless explicitly disabled', () => {
    const cfg = getDefaultConfig();
    cfg.sections.lightbox = false;
    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider(cfg) });
    expect(result.current.isSectionEnabled('lightbox')).toBe(false);
    expect(result.current.isSectionEnabled('search')).toBe(true);
  });

  it('isSectionEnabled treats missing keys as enabled (only `false` disables)', () => {
    const cfg = getDefaultConfig();
    // @ts-expect-error — testing runtime behavior with a synthetic missing key
    delete cfg.sections.about;
    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider(cfg) });
    expect(result.current.isSectionEnabled('about')).toBe(true);
  });

  it('getCategoryConfig returns the per-type config when present', () => {
    const cfg = getDefaultConfig();
    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider(cfg) });
    expect(result.current.getCategoryConfig('manuscripts')).toBe(cfg.searchCategories.manuscripts);
  });

  it('getCategoryConfig falls back to a permissive default when the type is missing', () => {
    const cfg = getDefaultConfig();
    // @ts-expect-error — testing runtime behavior
    delete cfg.searchCategories.manuscripts;
    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider(cfg) });
    expect(result.current.getCategoryConfig('manuscripts')).toEqual({
      enabled: true,
      visibleColumns: [],
      visibleFacets: [],
    });
  });

  it('enabledCategories filters to types whose config.enabled is true', () => {
    const cfg = getDefaultConfig();
    cfg.searchCategories.images.enabled = false;
    cfg.searchCategories.graphs.enabled = false;
    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider(cfg) });
    expect(result.current.enabledCategories).not.toContain('images');
    expect(result.current.enabledCategories).not.toContain('graphs');
    expect(result.current.enabledCategories).toContain('manuscripts');
  });
});

describe('SiteFeaturesProvider without initialConfig (fetch path)', () => {
  it('starts loading=true, then fetches and resolves to the response', async () => {
    const fetched: SiteFeaturesConfig = getDefaultConfig();
    fetched.sections.events = false;
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(fetched), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
    ) as typeof fetch;

    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider() });
    // Initial render: loading true, config = defaults
    expect(result.current.loading).toBe(true);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.config.sections.events).toBe(false);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/site-features');
  });

  it('falls back to defaults when fetch errors', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as typeof fetch;

    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.config).toEqual(getDefaultConfig());
  });

  it('falls back to defaults on a non-OK response', async () => {
    globalThis.fetch = vi.fn(async () => new Response('boom', { status: 500 })) as typeof fetch;

    const { result } = renderHook(() => useSiteFeatures(), { wrapper: withProvider() });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.config).toEqual(getDefaultConfig());
  });
});

describe('SiteFeaturesProvider sync with replaced initialConfig prop', () => {
  it('adopts a new initialConfig when the prop reference changes (e.g. router.refresh)', () => {
    const cfgA = getDefaultConfig();
    cfgA.sections.lightbox = false;

    const cfgB = getDefaultConfig();
    cfgB.sections.lightbox = true;
    cfgB.sections.about = false;

    const probeRef = React.createRef<{ value: ReturnType<typeof useSiteFeatures> | null }>();
    const Probe = React.forwardRef<{ value: ReturnType<typeof useSiteFeatures> | null }>(
      function Probe(_props, ref) {
        const value = useSiteFeatures();
        React.useImperativeHandle(ref, () => ({ value }), [value]);
        return null;
      }
    );

    function Holder({ cfg }: { cfg: SiteFeaturesConfig }) {
      return (
        <SiteFeaturesProvider initialConfig={cfg}>
          <Probe ref={probeRef} />
        </SiteFeaturesProvider>
      );
    }

    const { rerender } = render(<Holder cfg={cfgA} />);
    expect(probeRef.current?.value?.config).toBe(cfgA);

    rerender(<Holder cfg={cfgB} />);
    expect(probeRef.current?.value?.config).toBe(cfgB);
    expect(probeRef.current?.value?.isSectionEnabled('lightbox')).toBe(true);
    expect(probeRef.current?.value?.isSectionEnabled('about')).toBe(false);
  });
});
