import { describe, expect, it } from 'vitest';

import type { UserCapabilities } from '@/types';

import { getViewerCapabilities, getViewerMode } from './viewer-capabilities';

const caps = (overrides: Partial<UserCapabilities>): UserCapabilities => ({
  annotate: false,
  annotate_editorially: false,
  read_drafts: false,
  manage: false,
  ...overrides,
});

describe('getViewerCapabilities', () => {
  it('lets an anonymous visitor sketch but not save', () => {
    const viewer = getViewerCapabilities(null);

    expect(viewer.canCreatePublicAnnotations).toBe(true);
    expect(viewer.canPersistPublicAnnotations).toBe(false);
    expect(viewer.canCreateEditorialAnnotations).toBe(false);
    expect(viewer.canDeleteAnnotations).toBe(false);
    expect(getViewerMode(null)).toBe('public');
  });

  it('lets a user who may annotate save, edit and delete, but not make editorial notes', () => {
    const viewer = getViewerCapabilities(caps({ annotate: true }));

    expect(viewer.canPersistPublicAnnotations).toBe(true);
    expect(viewer.canDeleteAnnotations).toBe(true);
    expect(viewer.canViewEditorialControls).toBe(true);
    expect(viewer.canCreateEditorialAnnotations).toBe(false);
    expect(viewer.canPersistEditorialAnnotations).toBe(false);
    expect(getViewerMode(caps({ annotate: true }))).toBe('editor');
  });

  it('offers the editorial kind only to a user who may annotate editorially', () => {
    const viewer = getViewerCapabilities(caps({ annotate: true, annotate_editorially: true }));

    expect(viewer.canCreateEditorialAnnotations).toBe(true);
    expect(viewer.canPersistEditorialAnnotations).toBe(true);
  });

  it('offers text editing only to a user who may manage', () => {
    expect(getViewerCapabilities(null).canEditTexts).toBe(false);
    expect(getViewerCapabilities(caps({ annotate: true, read_drafts: true })).canEditTexts).toBe(
      false
    );
    expect(getViewerCapabilities(caps({ annotate: true, manage: true })).canEditTexts).toBe(true);
  });
});
