import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

const BASE_URL = env.siteUrl;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/backoffice/', '/api/', '/login'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
