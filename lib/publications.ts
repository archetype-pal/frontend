import type { PublicationParams } from '@/utils/api';

export const PUBLICATION_KINDS = ['news', 'blogs', 'feature'] as const;
export type PublicationKind = (typeof PUBLICATION_KINDS)[number];

export type PublicationKindConfig = {
  title: string;
  summaryLabel: string;
  routeBase: string;
  queryFlag: keyof Pick<PublicationParams, 'is_news' | 'is_featured' | 'is_blog_post'>;
  sectionKey: 'news' | 'blogs' | 'featureArticles';
};

export const PUBLICATION_KIND_CONFIG: Record<PublicationKind, PublicationKindConfig> = {
  news: {
    title: 'News',
    summaryLabel: 'News',
    routeBase: '/publications/news',
    queryFlag: 'is_news',
    sectionKey: 'news',
  },
  blogs: {
    title: 'Blogs',
    summaryLabel: 'Blog Post',
    routeBase: '/publications/blogs',
    queryFlag: 'is_blog_post',
    sectionKey: 'blogs',
  },
  feature: {
    title: 'Feature Articles',
    summaryLabel: 'Feature Article',
    routeBase: '/publications/feature',
    queryFlag: 'is_featured',
    sectionKey: 'featureArticles',
  },
};

export function isPublicationKind(value: string): value is PublicationKind {
  return (PUBLICATION_KINDS as readonly string[]).includes(value);
}
