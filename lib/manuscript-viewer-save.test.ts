import { describe, expect, it } from 'vitest';

import { describeSaveOutcome } from './manuscript-viewer-save';

describe('describeSaveOutcome', () => {
  it('prompts re-login on no-token (not committed)', () => {
    const v = describeSaveOutcome({ kind: 'no-token' });
    expect(v.committed).toBe(false);
    expect(v.notice).toMatchObject({ kind: 'error', title: 'Sign in required' });
  });

  it.each(['no-image', 'no-capability', 'no-changes'] as const)(
    'is silent + uncommitted for %s',
    (kind) => {
      const v = describeSaveOutcome({ kind });
      expect(v).toEqual({ notice: null, committed: false });
    }
  );

  it('reports all-failed with the first error (not committed)', () => {
    const v = describeSaveOutcome({ kind: 'all-failed', failedCount: 3, firstError: 'boom' });
    expect(v.committed).toBe(false);
    expect(v.notice).toMatchObject({
      kind: 'error',
      title: 'Failed to save annotations',
      description: 'boom',
    });
  });

  it('falls back to a count when all-failed has no first error', () => {
    const v = describeSaveOutcome({ kind: 'all-failed', failedCount: 2, firstError: null });
    expect(v.notice?.description).toBe('2 could not be saved.');
  });

  it('warns on saved-but-refresh-failed (not committed)', () => {
    const v = describeSaveOutcome({
      kind: 'saved-but-refresh-failed',
      succeededCount: 4,
      message: 'net',
    });
    expect(v.committed).toBe(false);
    expect(v.notice).toMatchObject({ kind: 'error', title: 'Saved but could not refresh' });
    expect(v.notice?.description).toContain('4 saved');
    expect(v.notice?.description).toContain('net');
  });

  it('confirms + commits on all-succeeded', () => {
    const v = describeSaveOutcome({
      kind: 'all-succeeded',
      counts: { created: 2, updated: 1, deleted: 0 },
      seed: [],
    });
    expect(v.committed).toBe(true);
    expect(v.notice).toMatchObject({ kind: 'saved', title: 'Annotations saved' });
    expect(v.notice?.description).toBe('Saved 2 created annotations and 1 updated annotation.');
  });

  it('reports partial saves AND commits (re-seed runs)', () => {
    const v = describeSaveOutcome({ kind: 'partial', succeededCount: 3, failedCount: 1, seed: [] });
    expect(v.committed).toBe(true);
    expect(v.notice).toMatchObject({ kind: 'error', title: 'Some annotations could not be saved' });
    expect(v.notice?.description).toContain('3 saved, 1 still unsaved');
  });
});
