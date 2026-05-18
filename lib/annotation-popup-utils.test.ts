import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  browserSafeIiifUrl,
  cacheKeyFor,
  decodeDraftSharePayload,
  encodeDraftSharePayload,
  fromBase64Url,
  includesAllIds,
  isDbId,
  metaKeyFor,
  toBase64Url,
  toggleNumericId,
} from './annotation-popup-utils';
import type { DraftSharePayload } from '@/types/annotation-viewer';

describe('cache / meta keys', () => {
  it('namespaces by iiif id', () => {
    expect(metaKeyFor('abc')).toBe('annotations:meta:abc');
    expect(cacheKeyFor('abc')).toBe('annotations:abc');
  });
});

describe('isDbId', () => {
  it('matches the db: prefix only', () => {
    expect(isDbId('db:1')).toBe(true);
    expect(isDbId('draft:1')).toBe(false);
    expect(isDbId('local-uuid')).toBe(false);
    expect(isDbId(undefined)).toBe(false);
  });
});

describe('toggleNumericId', () => {
  it('adds the id when absent', () => {
    expect(toggleNumericId([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it('removes the id when present (keeping order of the rest)', () => {
    expect(toggleNumericId([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2];
    toggleNumericId(input, 3);
    expect(input).toEqual([1, 2]);
  });
});

describe('includesAllIds', () => {
  it('returns true when available is empty (vacuously)', () => {
    expect(includesAllIds([], [1, 2])).toBe(true);
  });

  it('returns true when every available id is selected', () => {
    expect(includesAllIds([1, 2], [2, 1, 3])).toBe(true);
  });

  it('returns false when any available id is missing from selection', () => {
    expect(includesAllIds([1, 2, 3], [1, 2])).toBe(false);
  });
});

describe('base64url round-trip', () => {
  it('round-trips ASCII', () => {
    expect(fromBase64Url(toBase64Url('hello world'))).toBe('hello world');
  });

  it('round-trips Unicode (multi-byte UTF-8)', () => {
    const value = 'café 𝕊 — ✓';
    expect(fromBase64Url(toBase64Url(value))).toBe(value);
  });

  it('emits url-safe characters only (no + / =)', () => {
    // A string that base64-encodes to something containing + / =:
    // '???' encodes to 'Pz8/' (contains '/'), and a longer prefix
    // forces '=' padding.
    const value = '?'.repeat(10);
    const encoded = toBase64Url(value);
    expect(encoded).not.toMatch(/[+/=]/);
  });
});

describe('encodeDraftSharePayload / decodeDraftSharePayload', () => {
  it('round-trips a payload', () => {
    const payload = {
      id: 'draft:abc',
      data: { x: 1, y: 2, note: 'hi' },
    } as unknown as DraftSharePayload;
    const decoded = decodeDraftSharePayload(encodeDraftSharePayload(payload));
    expect(decoded).toEqual(payload);
  });

  it('returns null on malformed input', () => {
    expect(decodeDraftSharePayload('not-base64-or-json!')).toBeNull();
  });
});

describe('browserSafeIiifUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function withWindow(origin: string, body: () => void) {
    vi.stubGlobal('window', { location: { origin } });
    body();
  }

  it('strips a trailing /info.json on same-origin URLs', () => {
    withWindow('https://example.test', () => {
      expect(browserSafeIiifUrl('https://example.test/iiif/abc/info.json')).toBe(
        'https://example.test/iiif/abc'
      );
    });
  });

  it('proxies cross-origin URLs through /iiif-proxy', () => {
    withWindow('https://example.test', () => {
      expect(browserSafeIiifUrl('https://upstream.test/iiif/abc/info.json')).toBe(
        'https://example.test/iiif-proxy/iiif/abc'
      );
    });
  });

  it('preserves percent-encoded segments in the path', () => {
    withWindow('https://example.test', () => {
      // Sipi expects a single percent-encoded identifier segment.
      expect(browserSafeIiifUrl('https://upstream.test/iiif/folder%2Ffile/info.json')).toBe(
        'https://example.test/iiif-proxy/iiif/folder%2Ffile'
      );
    });
  });

  it('falls back to the raw URL when window is undefined (SSR)', () => {
    vi.stubGlobal('window', undefined);
    expect(browserSafeIiifUrl('https://upstream.test/iiif/abc/info.json')).toBe(
      'https://upstream.test/iiif/abc'
    );
  });

  it('returns the cleaned URL when the input is not a valid URL string', () => {
    withWindow('https://example.test', () => {
      // Bad URL → URL constructor throws → fallback to base (info.json stripped)
      expect(browserSafeIiifUrl('not://a valid url/info.json')).toBe('not://a valid url');
    });
  });
});
