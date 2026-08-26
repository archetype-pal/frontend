import { describe, it, expect } from 'vitest';
import {
  ALL,
  EMPTY_TRASH_FILTERS,
  buildTrashFilterParams,
  hasActiveTrashFilters,
  localInputToIso,
} from './trash-filters';

describe('localInputToIso', () => {
  it('returns undefined for empty or unparseable input', () => {
    expect(localInputToIso('')).toBeUndefined();
    expect(localInputToIso('not a date')).toBeUndefined();
  });

  it('converts a naive datetime-local value to a UTC instant', () => {
    const iso = localInputToIso('2026-08-04T14:30');
    // Same instant as the local time the operator typed, expressed in UTC.
    expect(iso).toBe(new Date(2026, 7, 4, 14, 30).toISOString());
  });

  it('emits the Z form, never a "+" offset that a query string would mangle', () => {
    expect(localInputToIso('2026-08-04T14:30')).toMatch(/Z$/);
    expect(localInputToIso('2026-08-04T14:30')).not.toContain('+');
  });
});

describe('buildTrashFilterParams', () => {
  it('omits every unset filter', () => {
    expect(buildTrashFilterParams(EMPTY_TRASH_FILTERS)).toEqual({});
  });

  it('maps each filter to its API param', () => {
    const params = buildTrashFilterParams({
      annotationType: 'editorial',
      deletedBy: 'ali',
      deletedFrom: '2026-08-01T00:00',
      deletedTo: '2026-08-04T23:59',
    });

    expect(params.annotation_type).toBe('editorial');
    expect(params.deleted_by__username).toBe('ali');
    expect(params.deleted_at__gte).toBe(new Date(2026, 7, 1, 0, 0).toISOString());
    expect(params.deleted_at__lte).toBe(new Date(2026, 7, 4, 23, 59).toISOString());
  });

  it('treats the ALL sentinel as no filter', () => {
    expect(
      buildTrashFilterParams({ ...EMPTY_TRASH_FILTERS, annotationType: ALL, deletedBy: ALL })
    ).toEqual({});
  });

  it('accepts one end of the range without the other', () => {
    expect(
      buildTrashFilterParams({ ...EMPTY_TRASH_FILTERS, deletedFrom: '2026-08-01T00:00' })
    ).toEqual({ deleted_at__gte: new Date(2026, 7, 1, 0, 0).toISOString() });
  });
});

describe('hasActiveTrashFilters', () => {
  it('is false only when nothing is set', () => {
    expect(hasActiveTrashFilters(EMPTY_TRASH_FILTERS)).toBe(false);
    expect(hasActiveTrashFilters({ ...EMPTY_TRASH_FILTERS, deletedBy: 'ali' })).toBe(true);
    expect(hasActiveTrashFilters({ ...EMPTY_TRASH_FILTERS, deletedTo: '2026-08-04T23:59' })).toBe(
      true
    );
  });
});
