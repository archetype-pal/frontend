import { beforeEach, describe, expect, it } from 'vitest';
import {
  getUploadTabId,
  listUploadBreadcrumbs,
  matchFilesToUploadBreadcrumbs,
  partitionUploadBreadcrumbs,
  removeUploadBreadcrumbs,
  saveUploadBreadcrumb,
  touchUploadBreadcrumbs,
  updateUploadBreadcrumb,
  UPLOAD_BREADCRUMB_EXPIRY_MS,
  UPLOAD_BREADCRUMB_STALE_MS,
  UPLOAD_BREADCRUMBS_STORAGE_KEY,
  type UploadBreadcrumb,
} from './upload-breadcrumbs';

function crumb(over: Partial<UploadBreadcrumb> = {}): UploadBreadcrumb {
  return {
    id: 'c1',
    fileName: 'f12r.tif',
    fileSize: 1000,
    itemPartId: 3,
    itemPartLabel: 'MS A, part 1',
    historicalItemId: 7,
    locus: 'f.12r',
    tags: '',
    sessionId: '',
    status: 'uploading',
    tabId: 'tab-a',
    createdAt: 1_000,
    updatedAt: 1_000,
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('storage roundtrip', () => {
  it('saves, lists, updates, touches and removes breadcrumbs', () => {
    saveUploadBreadcrumb(crumb({ id: 'a' }));
    saveUploadBreadcrumb(crumb({ id: 'b', fileName: 'f13v.tif' }));
    expect(
      listUploadBreadcrumbs()
        .map((c) => c.id)
        .sort()
    ).toEqual(['a', 'b']);

    updateUploadBreadcrumb('a', { status: 'processing', sessionId: 's-1' });
    const updated = listUploadBreadcrumbs().find((c) => c.id === 'a')!;
    expect(updated.status).toBe('processing');
    expect(updated.sessionId).toBe('s-1');
    expect(updated.updatedAt).toBeGreaterThan(1_000); // update bumps the heartbeat

    const before = listUploadBreadcrumbs().find((c) => c.id === 'b')!.updatedAt;
    touchUploadBreadcrumbs(['b']);
    expect(listUploadBreadcrumbs().find((c) => c.id === 'b')!.updatedAt).toBeGreaterThan(before);

    removeUploadBreadcrumbs(['a']);
    expect(listUploadBreadcrumbs().map((c) => c.id)).toEqual(['b']);
  });

  it('upserts by id instead of duplicating', () => {
    saveUploadBreadcrumb(crumb({ id: 'a', locus: 'f.1r' }));
    saveUploadBreadcrumb(crumb({ id: 'a', locus: 'f.2r' }));
    const all = listUploadBreadcrumbs();
    expect(all).toHaveLength(1);
    expect(all[0].locus).toBe('f.2r');
  });

  it('never inserts on touch or update of an unknown id', () => {
    touchUploadBreadcrumbs(['ghost']);
    updateUploadBreadcrumb('ghost', { status: 'error' });
    expect(listUploadBreadcrumbs()).toEqual([]);
  });

  it('drops malformed entries and non-array payloads', () => {
    localStorage.setItem(
      UPLOAD_BREADCRUMBS_STORAGE_KEY,
      JSON.stringify([crumb(), { id: 'missing-everything' }, 42, null])
    );
    expect(listUploadBreadcrumbs()).toHaveLength(1);

    localStorage.setItem(UPLOAD_BREADCRUMBS_STORAGE_KEY, '{"not":"an array"}');
    expect(listUploadBreadcrumbs()).toEqual([]);

    localStorage.setItem(UPLOAD_BREADCRUMBS_STORAGE_KEY, 'not json at all');
    expect(listUploadBreadcrumbs()).toEqual([]);
  });

  it('caps storage at the 50 newest by heartbeat', () => {
    for (let i = 0; i < 55; i++) {
      saveUploadBreadcrumb(crumb({ id: `c${i}`, updatedAt: i }));
    }
    const kept = listUploadBreadcrumbs();
    expect(kept).toHaveLength(50);
    // The five oldest heartbeats (0..4) fell off.
    expect(kept.some((c) => c.updatedAt < 5)).toBe(false);
  });
});

describe('getUploadTabId', () => {
  it('is stable across calls within a tab (sessionStorage-backed)', () => {
    const first = getUploadTabId();
    expect(first).toBeTruthy();
    expect(getUploadTabId()).toBe(first);
  });
});

describe('partitionUploadBreadcrumbs', () => {
  const now = 10_000_000;

  it('adopts own-tab crumbs even with a fresh heartbeat (the writer is dead by definition)', () => {
    const mine = crumb({ id: 'a', tabId: 'me', updatedAt: now });
    const out = partitionUploadBreadcrumbs([mine], 'me', now);
    expect(out.adoptable).toEqual([mine]);
    expect(out.foreignActive).toEqual([]);
  });

  it('leaves fresh foreign crumbs alone — their tab is alive', () => {
    const theirs = crumb({ id: 'a', tabId: 'other', updatedAt: now - 1_000 });
    const out = partitionUploadBreadcrumbs([theirs], 'me', now);
    expect(out.foreignActive).toEqual([theirs]);
    expect(out.adoptable).toEqual([]);
  });

  it('adopts foreign crumbs whose heartbeat went stale', () => {
    const orphan = crumb({
      id: 'a',
      tabId: 'other',
      updatedAt: now - UPLOAD_BREADCRUMB_STALE_MS - 1,
    });
    expect(partitionUploadBreadcrumbs([orphan], 'me', now).adoptable).toEqual([orphan]);
  });

  it('expires ancient crumbs, even own-tab ones', () => {
    const ancient = crumb({
      id: 'a',
      tabId: 'me',
      updatedAt: now - UPLOAD_BREADCRUMB_EXPIRY_MS - 1,
    });
    const out = partitionUploadBreadcrumbs([ancient], 'me', now);
    expect(out.expired).toEqual([ancient]);
    expect(out.adoptable).toEqual([]);
  });
});

describe('matchFilesToUploadBreadcrumbs', () => {
  const file = (name: string, bytes: number) => new File(['x'.repeat(bytes)], name);

  it('matches by exact name and size', () => {
    const c = crumb({ fileName: 'f12r.tif', fileSize: 5 });
    const { matches, unmatched } = matchFilesToUploadBreadcrumbs([file('f12r.tif', 5)], [c]);
    expect(matches).toHaveLength(1);
    expect(matches[0].breadcrumb.id).toBe(c.id);
    expect(unmatched).toEqual([]);
  });

  it('rejects a same-name file whose size differs', () => {
    const c = crumb({ fileName: 'f12r.tif', fileSize: 5 });
    const { matches, unmatched } = matchFilesToUploadBreadcrumbs([file('f12r.tif', 6)], [c]);
    expect(matches).toEqual([]);
    expect(unmatched.map((f) => f.name)).toEqual(['f12r.tif']);
  });

  it('rejects a renamed file even at the right size', () => {
    const c = crumb({ fileName: 'f12r.tif', fileSize: 5 });
    const { matches, unmatched } = matchFilesToUploadBreadcrumbs([file('renamed.tif', 5)], [c]);
    expect(matches).toEqual([]);
    expect(unmatched).toHaveLength(1);
  });

  it('consumes each breadcrumb at most once', () => {
    const c = crumb({ fileName: 'f12r.tif', fileSize: 5 });
    const picked = [file('f12r.tif', 5), file('f12r.tif', 5)];
    const { matches, unmatched } = matchFilesToUploadBreadcrumbs(picked, [c]);
    expect(matches).toHaveLength(1);
    expect(unmatched).toHaveLength(1);
  });

  it('one multi-select can resume several interrupted uploads', () => {
    const a = crumb({ id: 'a', fileName: 'f12r.tif', fileSize: 5 });
    const b = crumb({ id: 'b', fileName: 'f13v.tif', fileSize: 7 });
    const { matches, unmatched } = matchFilesToUploadBreadcrumbs(
      [file('f13v.tif', 7), file('f12r.tif', 5)],
      [a, b]
    );
    expect(matches.map((m) => m.breadcrumb.id).sort()).toEqual(['a', 'b']);
    expect(unmatched).toEqual([]);
  });
});
