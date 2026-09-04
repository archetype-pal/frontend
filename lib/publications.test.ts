import { describe, expect, it } from 'vitest';

import { getPublicationRoutes, publicationMatchesKind } from './publications';

describe('publication channel routes', () => {
  it('keeps News, Blog, and Featured as independent channels', () => {
    const publication = {
      is_news: true,
      is_blog_post: true,
      is_featured: false,
    };

    expect(publicationMatchesKind(publication, 'news')).toBe(true);
    expect(publicationMatchesKind(publication, 'blogs')).toBe(true);
    expect(publicationMatchesKind(publication, 'feature')).toBe(false);
    expect(getPublicationRoutes(publication, 'charter-news')).toEqual([
      { kind: 'news', href: '/publications/news/charter-news' },
      { kind: 'blogs', href: '/publications/blogs/charter-news' },
    ]);
  });

  it('does not invent a route when no channel is selected', () => {
    expect(
      getPublicationRoutes(
        {
          is_news: false,
          is_blog_post: false,
          is_featured: false,
        },
        'uncategorized-draft'
      )
    ).toEqual([]);
  });

  it('does not build URLs until a slug exists', () => {
    expect(
      getPublicationRoutes(
        {
          is_news: true,
          is_blog_post: true,
          is_featured: true,
        },
        ' '
      )
    ).toEqual([]);
  });
});
