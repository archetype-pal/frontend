import * as React from 'react';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import BlogPostPreview from './blog-post-preview';

const renderPreview = (keywords?: string | null) =>
  render(
    <BlogPostPreview
      title="Medieval Manuscripts"
      author="Alice Smith"
      date="2020-01-01T00:00:00Z"
      excerpt="<p>An overview.</p>"
      slug="/publications/blogs/medieval-manuscripts"
      keywords={keywords}
      showShareBtns={false}
      showReadMoreBtn={false}
    />
  );

/** The badge labels, in order, or null when the group is not rendered at all. */
const badges = (keywords?: string | null): string[] | null => {
  const { container, unmount } = renderPreview(keywords);
  const group = container.querySelector('[data-testid="publication-keywords"]');
  const labels = group
    ? Array.from(group.children).map((badge) => badge.textContent?.trim() ?? '')
    : null;
  unmount();
  return labels;
};

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

  it('renders one badge per keyword', () => {
    expect(badges('palaeography, charters, medieval history')).toEqual([
      'palaeography',
      'charters',
      'medieval history',
    ]);
  });

  it('reads the quoted form the API actually sends', () => {
    // Tagulous' render_tags quotes any tag holding a comma or a space and doubles
    // inner quotes, so a plain comma split would cut the first one into three.
    expect(badges('"edinburgh, scotland", latin')).toEqual(['edinburgh, scotland', 'latin']);
    expect(badges('"insular script", "anglo-saxon", latin')).toEqual([
      'insular script',
      'anglo-saxon',
      'latin',
    ]);
    expect(badges('"great ""seal"""')).toEqual(['great "seal"']);
  });

  it('drops the category keyword already shown as the publication type', () => {
    expect(badges('Blog, palaeography')).toEqual(['palaeography']);
    expect(badges('News')).toBeNull();
  });

  it('renders no keyword group when there is nothing to show', () => {
    expect(badges('')).toBeNull();
    expect(badges(null)).toBeNull();
    expect(badges(undefined)).toBeNull();
  });

  it('names the keyword group for assistive tech', () => {
    const { container, unmount } = renderPreview('palaeography');
    const group = container.querySelector('[data-testid="publication-keywords"]');
    expect(group?.getAttribute('aria-label')).toBe('Keywords');
    unmount();
  });
});
