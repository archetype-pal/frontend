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

  it('renders keywords as badges when keywords string is provided', () => {
    const html = renderToStaticMarkup(
      <BlogPostPreview
        title="Medieval Manuscripts"
        author="Alice Smith"
        date="2020-01-01T00:00:00Z"
        excerpt="<p>An overview.</p>"
        slug="/publications/blogs/medieval-manuscripts"
        keywords="palaeography, charters, medieval history"
        showShareBtns={false}
        showReadMoreBtn={false}
      />
    );

    expect(html).toContain('data-testid="publication-keywords"');
    expect(html).toContain('palaeography');
    expect(html).toContain('charters');
    expect(html).toContain('medieval history');
  });

  it('handles quotes and whitespace in keywords gracefully', () => {
    const html = renderToStaticMarkup(
      <BlogPostPreview
        title="Medieval Manuscripts"
        author="Alice Smith"
        date="2020-01-01T00:00:00Z"
        excerpt="<p>An overview.</p>"
        slug="/publications/blogs/medieval-manuscripts"
        keywords='"insular script", "anglo-saxon", latin'
        showShareBtns={false}
        showReadMoreBtn={false}
      />
    );

    expect(html).toContain('insular script');
    expect(html).toContain('anglo-saxon');
    expect(html).toContain('latin');
    expect(html).not.toContain('&quot;insular script&quot;');
  });

  it('does not render keywords container when keywords is undefined or empty', () => {
    const htmlEmpty = renderToStaticMarkup(
      <BlogPostPreview
        title="No Keywords"
        author="Bob"
        date="2020-01-01T00:00:00Z"
        excerpt="<p>None.</p>"
        slug="/publications/blogs/no-keywords"
        keywords=""
        showShareBtns={false}
        showReadMoreBtn={false}
      />
    );

    expect(htmlEmpty).not.toContain('data-testid="publication-keywords"');

    const htmlNull = renderToStaticMarkup(
      <BlogPostPreview
        title="No Keywords"
        author="Bob"
        date="2020-01-01T00:00:00Z"
        excerpt="<p>None.</p>"
        slug="/publications/blogs/no-keywords"
        keywords={null}
        showShareBtns={false}
        showReadMoreBtn={false}
      />
    );

    expect(htmlNull).not.toContain('data-testid="publication-keywords"');
  });
});
