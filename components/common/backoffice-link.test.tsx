import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const authState: { token: string | null } = { token: null };
vi.mock('@/contexts/auth-context', () => ({ useAuth: () => authState }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}));

import { BackofficeLink } from './backoffice-link';

describe('BackofficeLink', () => {
  beforeEach(() => {
    authState.token = null;
  });

  it('renders nothing for anonymous visitors', () => {
    authState.token = null;
    expect(
      renderToStaticMarkup(<BackofficeLink kind="item-part" id={706} label="Edit in Backoffice" />)
    ).toBe('');
  });

  it('links an item-part to its backoffice workspace when logged in (image-viewer "Edit in Backoffice")', () => {
    authState.token = 'tok';
    const html = renderToStaticMarkup(
      <BackofficeLink kind="item-part" id={706} label="Edit in Backoffice" />
    );
    expect(html).toContain('href="/backoffice/manuscripts/706"');
    expect(html).toContain('Edit in Backoffice');
  });

  it('maps each kind to its backoffice route', () => {
    authState.token = 'tok';
    const hrefOf = (kind: 'scribe' | 'hand' | 'publication', id: string | number) =>
      renderToStaticMarkup(<BackofficeLink kind={kind} id={id} />).match(/href="([^"]+)"/)?.[1];
    expect(hrefOf('scribe', 3)).toBe('/backoffice/scribes/3');
    expect(hrefOf('hand', 9)).toBe('/backoffice/hands/9');
    expect(hrefOf('publication', 'my-slug')).toBe('/backoffice/publications/my-slug');
  });
});
