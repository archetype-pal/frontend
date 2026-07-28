import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  ALL_FEATURE_KEYS,
  ALL_SECTION_KEYS,
  FEATURE_DESCRIPTIONS,
  FEATURE_LABELS,
  getDefaultConfig,
  getDefaultFeatures,
  mergeFeatureFlags,
  normalizeSectionOrder,
  type FeatureKey,
  type SectionKey,
} from './site-features';

describe('normalizeSectionOrder', () => {
  it('returns the canonical order when input is undefined', () => {
    expect(normalizeSectionOrder(undefined)).toEqual(ALL_SECTION_KEYS);
  });

  it('returns the canonical order when input is empty', () => {
    expect(normalizeSectionOrder([])).toEqual(ALL_SECTION_KEYS);
  });

  it('honors a fully-specified custom order verbatim', () => {
    const reversed = [...ALL_SECTION_KEYS].reverse();
    expect(normalizeSectionOrder(reversed)).toEqual(reversed);
  });

  it('appends missing keys (in canonical order) after the user-provided ones', () => {
    const partial: SectionKey[] = ['lightbox', 'collection'];
    const result = normalizeSectionOrder(partial);
    expect(result.slice(0, 2)).toEqual(['lightbox', 'collection']);
    // The remaining keys appear in canonical order
    const remaining = ALL_SECTION_KEYS.filter((k) => !partial.includes(k));
    expect(result.slice(2)).toEqual(remaining);
    expect(result).toHaveLength(ALL_SECTION_KEYS.length);
  });

  it('dedupes repeated keys, keeping the first occurrence', () => {
    const dupes: SectionKey[] = ['lightbox', 'collection', 'lightbox', 'search'];
    const result = normalizeSectionOrder(dupes);
    expect(result.slice(0, 3)).toEqual(['lightbox', 'collection', 'search']);
  });

  it('drops unknown keys that aren’t in ALL_SECTION_KEYS', () => {
    const result = normalizeSectionOrder(['lightbox', 'something-bogus' as SectionKey, 'about']);
    expect(result.slice(0, 2)).toEqual(['lightbox', 'about']);
    expect(result).toHaveLength(ALL_SECTION_KEYS.length);
  });

  it('always returns every canonical key exactly once', () => {
    const messy: SectionKey[] = ['about', 'about', 'bogus' as SectionKey, 'lightbox'];
    const result = normalizeSectionOrder(messy);
    expect(result).toHaveLength(ALL_SECTION_KEYS.length);
    expect(new Set(result)).toEqual(new Set(ALL_SECTION_KEYS));
  });
});

describe('getDefaultConfig', () => {
  it('enables every section by default', () => {
    const cfg = getDefaultConfig();
    for (const key of ALL_SECTION_KEYS) {
      expect(cfg.sections[key]).toBe(true);
    }
  });

  it('uses the canonical section order', () => {
    expect(getDefaultConfig().sectionOrder).toEqual(ALL_SECTION_KEYS);
  });

  it('returns each search category enabled with non-empty defaults', () => {
    const cfg = getDefaultConfig();
    for (const cat of Object.values(cfg.searchCategories)) {
      expect(cat.enabled).toBe(true);
      expect(Array.isArray(cat.visibleColumns)).toBe(true);
      expect(Array.isArray(cat.visibleFacets)).toBe(true);
    }
  });

  it('enables every feature flag by default', () => {
    const cfg = getDefaultConfig();
    for (const key of ALL_FEATURE_KEYS) {
      expect(cfg.features[key]).toBe(true);
    }
  });

  it('enables manuscriptDescriptions — a shipped feature must survive its own flag', () => {
    // The flag is introduced for a feature that is already live, so the default
    // has to reproduce today's behaviour: visible until an admin opts out.
    expect(getDefaultConfig().features.manuscriptDescriptions).toBe(true);
  });

  it('returns fresh feature maps so callers can mutate without affecting defaults', () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    expect(a.features).not.toBe(b.features);
    a.features.manuscriptDescriptions = false;
    expect(b.features.manuscriptDescriptions).toBe(true);
    expect(getDefaultFeatures().manuscriptDescriptions).toBe(true);
  });

  it('returns fresh array instances so callers can mutate without affecting defaults', () => {
    const a = getDefaultConfig();
    const b = getDefaultConfig();
    expect(a.sectionOrder).not.toBe(b.sectionOrder);
    a.sectionOrder.push('lightbox');
    expect(b.sectionOrder).toEqual(ALL_SECTION_KEYS);
    // Same for the per-category arrays
    const firstCat = Object.keys(a.searchCategories)[0]!;
    expect(a.searchCategories[firstCat as keyof typeof a.searchCategories].visibleColumns).not.toBe(
      b.searchCategories[firstCat as keyof typeof b.searchCategories].visibleColumns
    );
  });
});

describe('mergeFeatureFlags', () => {
  it('returns the base map when the payload omits `features` entirely', () => {
    // The deploy case: a config file (or an older client's PUT body) written
    // before flags existed. Nothing to merge must mean nothing changes.
    const base = { ...getDefaultFeatures(), manuscriptDescriptions: false };
    expect(mergeFeatureFlags(base, undefined)).toEqual(base);
    expect(mergeFeatureFlags(base, null)).toEqual(base);
  });

  it('applies boolean overrides key by key', () => {
    expect(mergeFeatureFlags(getDefaultFeatures(), { manuscriptDescriptions: false })).toEqual({
      manuscriptDescriptions: false,
    });
    expect(
      mergeFeatureFlags({ manuscriptDescriptions: false }, { manuscriptDescriptions: true })
    ).toEqual({ manuscriptDescriptions: true });
  });

  it('ignores non-plain-object payloads instead of spreading them into index keys', () => {
    const base = getDefaultFeatures();
    for (const junk of ['nope', 42, true, ['manuscriptDescriptions']]) {
      expect(mergeFeatureFlags(base, junk)).toEqual(base);
    }
  });

  it('drops unknown keys so garbage never reaches disk', () => {
    const merged = mergeFeatureFlags(getDefaultFeatures(), {
      manuscriptDescriptions: false,
      somethingBogus: true,
    });
    expect(merged).toEqual({ manuscriptDescriptions: false });
    expect(Object.keys(merged)).toEqual([...ALL_FEATURE_KEYS]);
  });

  it('ignores non-boolean values for known keys', () => {
    expect(mergeFeatureFlags(getDefaultFeatures(), { manuscriptDescriptions: 'false' })).toEqual({
      manuscriptDescriptions: true,
    });
  });

  it('never mutates the base map', () => {
    const base = getDefaultFeatures();
    mergeFeatureFlags(base, { manuscriptDescriptions: false });
    expect(base.manuscriptDescriptions).toBe(true);
  });
});

describe('feature metadata', () => {
  const messagesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
  const catalogue = (locale: 'en' | 'fr') =>
    JSON.parse(readFileSync(join(messagesDir, `${locale}.json`), 'utf8')) as {
      backoffice: {
        siteFeatures: {
          features: Record<string, string>;
          featureDescriptions: Record<string, string>;
        };
      };
    };

  it.each(ALL_FEATURE_KEYS)('%s has a label and a human description', (key: FeatureKey) => {
    expect(FEATURE_LABELS[key]?.length).toBeGreaterThan(0);
    expect(FEATURE_DESCRIPTIONS[key]?.length).toBeGreaterThan(0);
  });

  it.each(ALL_FEATURE_KEYS)('%s is localized in both catalogues', (key: FeatureKey) => {
    for (const locale of ['en', 'fr'] as const) {
      const siteFeatures = catalogue(locale).backoffice.siteFeatures;
      expect(typeof siteFeatures.features[key]).toBe('string');
      expect(siteFeatures.features[key].length).toBeGreaterThan(0);
      expect(typeof siteFeatures.featureDescriptions[key]).toBe('string');
      expect(siteFeatures.featureDescriptions[key].length).toBeGreaterThan(0);
    }
  });

  it.each(ALL_FEATURE_KEYS)(
    '%s: the English catalogue and the module constants say the same thing',
    (key: FeatureKey) => {
      // Two copies of a label drift silently; this pins them together so a
      // reword has to happen in both places.
      const siteFeatures = catalogue('en').backoffice.siteFeatures;
      expect(siteFeatures.features[key]).toBe(FEATURE_LABELS[key]);
      expect(siteFeatures.featureDescriptions[key]).toBe(FEATURE_DESCRIPTIONS[key]);
    }
  );
});
