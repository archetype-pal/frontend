import { describe, expect, it } from 'vitest';
import {
  formatBytes,
  guessLocusFromFilename,
  isAcceptedImageFilename,
  planChunks,
} from './upload-helpers';

describe('isAcceptedImageFilename', () => {
  it('accepts archival + web image extensions, case-insensitively', () => {
    for (const name of ['a.tif', 'a.TIFF', 'b.jp2', 'c.JPG', 'd.jpeg', 'e.png']) {
      expect(isAcceptedImageFilename(name)).toBe(true);
    }
  });

  it('rejects non-image and preview-only formats', () => {
    for (const name of ['notes.txt', 'scan.webp', 'x.gif', 'archive.zip', 'noext']) {
      expect(isAcceptedImageFilename(name)).toBe(false);
    }
  });
});

describe('guessLocusFromFilename', () => {
  it('extracts folio loci and strips leading zeros', () => {
    expect(guessLocusFromFilename('f12r.tif')).toBe('f.12r');
    expect(guessLocusFromFilename('0032v.jp2')).toBe('f.32v');
    expect(guessLocusFromFilename('MS_Add_1234_f005r.tiff')).toBe('f.5r');
    expect(guessLocusFromFilename('fol_7v.png')).toBe('f.7v');
  });

  it('uses the last folio-like token when several are present', () => {
    expect(guessLocusFromFilename('add1234_f10r.tif')).toBe('f.10r');
  });

  it('returns empty string when nothing folio-shaped is present', () => {
    expect(guessLocusFromFilename('scan_0001.jpg')).toBe('');
    expect(guessLocusFromFilename('cover.png')).toBe('');
  });
});

describe('planChunks', () => {
  it('splits into full chunks plus a remainder', () => {
    const plan = planChunks(2500, 1000);
    expect(plan).toEqual([
      { index: 0, start: 0, end: 1000, size: 1000 },
      { index: 1, start: 1000, end: 2000, size: 1000 },
      { index: 2, start: 2000, end: 2500, size: 500 },
    ]);
  });

  it('produces one chunk when the file is smaller than the chunk size', () => {
    expect(planChunks(500, 1000)).toEqual([{ index: 0, start: 0, end: 500, size: 500 }]);
  });

  it('handles an exact multiple with no trailing empty chunk', () => {
    const plan = planChunks(2000, 1000);
    expect(plan).toHaveLength(2);
    expect(plan[1]).toEqual({ index: 1, start: 1000, end: 2000, size: 1000 });
  });

  it('rejects non-positive sizes', () => {
    expect(() => planChunks(0, 1000)).toThrow();
    expect(() => planChunks(100, 0)).toThrow();
  });

  it('sums back to the original file size', () => {
    const total = 5 * 1024 * 1024 + 137;
    const plan = planChunks(total, 1024 * 1024);
    expect(plan.reduce((acc, c) => acc + c.size, 0)).toBe(total);
  });
});

describe('formatBytes', () => {
  it('formats across units', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.5 GB');
  });
});
