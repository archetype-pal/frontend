import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://archetype.gla.ac.uk';

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
