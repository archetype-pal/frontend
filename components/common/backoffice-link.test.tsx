import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import type { UserCapabilities } from '@/types';

const authState: { isAuthenticated: boolean; user: { capabilities: UserCapabilities } | null } = {
  isAuthenticated: false,
  user: null,
};
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => authState }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}));

import { BackofficeLink } from './backoffice-link';

const signInWith = (capabilities: Partial<UserCapabilities>) => {
  authState.isAuthenticated = true;
  authState.user = {
    capabilities: {
      annotate: true,
      annotate_editorially: false,
      read_drafts: false,
      manage: false,
      ...capabilities,
    },
  };
};

describe('BackofficeLink', () => {
  beforeEach(() => {
    authState.isAuthenticated = false;
    authState.user = null;
  });

  it('renders nothing for anonymous visitors', () => {
    authState.isAuthenticated = false;
    expect(
      renderToStaticMarkup(<BackofficeLink kind="item-part" id={706} label="Edit in Backoffice" />)
    ).toBe('');
  });

  it('renders nothing for a signed in user who may not manage', () => {
    signInWith({ read_drafts: true });
    expect(
      renderToStaticMarkup(<BackofficeLink kind="item-part" id={706} label="Edit in Backoffice" />)
    ).toBe('');
  });

  it('links an item-part through the backoffice resolver for a user who may manage (image-viewer "Edit in Backoffice")', () => {
    signInWith({ manage: true });
    const html = renderToStaticMarkup(
      <BackofficeLink kind="item-part" id={706} label="Edit in Backoffice" />
    );
    expect(html).toContain('href="/backoffice/item-parts/706"');
    expect(html).toContain('Edit in Backoffice');
  });

  it('maps each kind to its backoffice route', () => {
    signInWith({ manage: true });
    const hrefOf = (kind: 'scribe' | 'hand' | 'publication', id: string | number) =>
      renderToStaticMarkup(<BackofficeLink kind={kind} id={id} />).match(/href="([^"]+)"/)?.[1];
    expect(hrefOf('scribe', 3)).toBe('/backoffice/scribes/3');
    expect(hrefOf('hand', 9)).toBe('/backoffice/hands/9');
    expect(hrefOf('publication', 'my-slug')).toBe('/backoffice/publications/my-slug');
  });
});
