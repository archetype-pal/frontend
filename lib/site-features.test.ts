import { describe, expect, it } from 'vitest';

import {
  ALL_SECTION_KEYS,
  getDefaultConfig,
  normalizeSectionOrder,
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
