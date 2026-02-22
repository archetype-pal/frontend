import type { MetadataRoute } from 'next';
import { apiFetch } from '@/lib/api-fetch';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://archetype.gla.ac.uk';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/search/manuscripts`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/news`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/blogs`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/feature`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/collection`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/about/historical-context`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/about/project-team`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE_URL}/about/citing-database`, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const pubRes = await apiFetch('/api/v1/media/publications/?limit=500');
    if (pubRes.ok) {
      const pubData = await pubRes.json();
      const pubs = pubData.results ?? pubData ?? [];
      for (const pub of pubs) {
        if (!pub.slug) continue;
        let prefix = '/blogs';
        if (pub.is_news) prefix = '/news';
        else if (pub.is_featured) prefix = '/feature';
        dynamicRoutes.push({
          url: `${BASE_URL}${prefix}/${pub.slug}`,
          lastModified: pub.updated_at ? new Date(pub.updated_at) : undefined,
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }
  } catch {
    // Non-critical: sitemap still works with static routes only
  }

  return [...staticRoutes, ...dynamicRoutes];
}
