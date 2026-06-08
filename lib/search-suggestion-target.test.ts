import { describe, expect, it } from 'vitest';
import { resolveSuggestionTarget } from '@/lib/search-suggestion-target';
import type { KeywordSuggestionItem } from '@/components/search/keyword-search-input';

const item = (over: Partial<KeywordSuggestionItem>): KeywordSuggestionItem => ({
  id: 'item_parts:1',
  label: 'NRS GD55/1',
  value: 'NRS GD55/1',
  ...over,
});

describe('resolveSuggestionTarget', () => {
  it('opens a manuscript (item_parts) entity directly', () => {
    expect(
      resolveSuggestionTarget(item({ id: 'item_parts:123', type: 'item_parts' as never }))
    ).toEqual({
      kind: 'entity',
      href: '/manuscripts/123',
    });
  });

  it('opens a scribe entity directly', () => {
    expect(resolveSuggestionTarget(item({ id: 'scribes:7', type: 'scribes' }))).toEqual({
      kind: 'entity',
      href: '/scribes/7',
    });
  });

  it('opens a hand entity directly', () => {
    expect(resolveSuggestionTarget(item({ id: 'hands:9', type: 'hands' }))).toEqual({
      kind: 'entity',
      href: '/hands/9',
    });
  });

  it('routes typed results without an id-only detail route to their scoped tab', () => {
    expect(resolveSuggestionTarget(item({ id: 'people:42', type: 'people' }))).toEqual({
      kind: 'scoped',
      resultType: 'people',
    });
    expect(resolveSuggestionTarget(item({ id: 'texts:42', type: 'texts' }))).toEqual({
      kind: 'scoped',
      resultType: 'texts',
    });
    expect(
      resolveSuggestionTarget(item({ id: 'item_images:42', type: 'item_images' as never }))
    ).toEqual({
      kind: 'scoped',
      resultType: 'images',
    });
  });

  it('runs a plain search for the synthetic "all" row and untyped (recent/local) items', () => {
    expect(resolveSuggestionTarget(item({ id: 'all:william', type: 'all' }))).toEqual({
      kind: 'search',
    });
    expect(resolveSuggestionTarget(item({ id: 'local:william' }))).toEqual({ kind: 'search' });
  });

  it('falls back to a search when an entity id is missing', () => {
    expect(resolveSuggestionTarget(item({ id: 'scribes:', type: 'scribes' }))).toEqual({
      kind: 'scoped',
      resultType: 'scribes',
    });
  });
});
