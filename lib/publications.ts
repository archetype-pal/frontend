import type { PublicationParams } from '@/utils/api';

export const PUBLICATION_KINDS = ['news', 'blogs', 'feature'] as const;
export type PublicationKind = (typeof PUBLICATION_KINDS)[number];

export type PublicationKindConfig = {
  routeBase: string;
  queryFlag: keyof Pick<PublicationParams, 'is_news' | 'is_featured' | 'is_blog_post'>;
  sectionKey: 'news' | 'blogs' | 'featureArticles';
};

export type PublicationChannelFlags = Pick<
  PublicationParams,
  'is_news' | 'is_featured' | 'is_blog_post'
>;

export type PublicationRoute = {
  kind: PublicationKind;
  href: string;
};

// Note: display strings (section title, summary label) live in the
// `content.publicationKinds.<kind>` translation namespace rather than here,
// since this config is a plain object with no access to translations —
// look them up at the call site (see components/content/publication-pages.tsx).
export const PUBLICATION_KIND_CONFIG: Record<PublicationKind, PublicationKindConfig> = {
  news: {
    routeBase: '/publications/news',
    queryFlag: 'is_news',
    sectionKey: 'news',
  },
  blogs: {
    routeBase: '/publications/blogs',
    queryFlag: 'is_blog_post',
    sectionKey: 'blogs',
  },
  feature: {
    routeBase: '/publications/feature',
    queryFlag: 'is_featured',
    sectionKey: 'featureArticles',
  },
};

export function isPublicationKind(value: string): value is PublicationKind {
  return (PUBLICATION_KINDS as readonly string[]).includes(value);
}

export function publicationMatchesKind(
  publication: PublicationChannelFlags,
  kind: PublicationKind
): boolean {
  return publication[PUBLICATION_KIND_CONFIG[kind].queryFlag] === true;
}

export function getPublicationRoutes(
  publication: PublicationChannelFlags,
  slug: string
): PublicationRoute[] {
  const cleanSlug = slug.trim();
  if (!cleanSlug) return [];

  return PUBLICATION_KINDS.filter((kind) => publicationMatchesKind(publication, kind)).map(
    (kind) => ({
      kind,
      href: `${PUBLICATION_KIND_CONFIG[kind].routeBase}/${cleanSlug}`,
    })
  );
}
