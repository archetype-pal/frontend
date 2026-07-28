import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BlogPostPreview from './blog-post-preview';

describe('BlogPostPreview', () => {
  it('renders publication HTML through the scoped legacy renderer', () => {
    const html = renderToStaticMarkup(
      <BlogPostPreview
        title="Scribal Choice"
        author="Dauvit Broun"
        date="2015-08-18T16:41:47Z"
        excerpt='<p>Body [1] and <a href="/manuscripts/259">a manuscript</a>.</p><h2>Notes</h2><p>[1] First note.</p>'
        slug="/publications/blogs/scribal-choice"
        showShareBtns={false}
        showReadMoreBtn={false}
      />
    );

    expect(html).toContain('publication-body');
    expect(html).toContain('href="#footnote1"');
    expect(html).toContain('href="#refnote1"');
    expect(html).toContain('href="/manuscripts/259"');
  });
});
