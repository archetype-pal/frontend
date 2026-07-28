import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import ShareButtons from './share-buttons';

describe('ShareButtons', () => {
  it('server-renders share actions without browser-derived disabled state', () => {
    const html = renderToStaticMarkup(
      <ShareButtons
        title="Scribal Choice"
        author="Dauvit Broun"
        slug="/publications/blogs/scribal-choice"
      />
    );

    expect(html).toContain('Twitter');
    expect(html).toContain('Facebook');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
  });
});
