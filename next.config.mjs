import withBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
const withNextIntl = createNextIntlPlugin('./lib/i18n.ts');
const requireEnv = (key) => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Proxy IIIF (Sipi) so same-origin requests avoid CORS when frontend is on a
// different port. These rewrites run in the Next SERVER, so when it can't reach
// the backend on the public host (e.g. inside a container) set the server-only
// INTERNAL_IIIF_UPSTREAM / INTERNAL_API_URL (e.g. http://host.docker.internal:1024)
// — the browser keeps using the public NEXT_PUBLIC_* origins.
const IIIF_UPSTREAM = (
  process.env.INTERNAL_IIIF_UPSTREAM?.trim() || requireEnv('NEXT_PUBLIC_IIIF_UPSTREAM')
).replace(/\/$/, '');
// API base for rewrites (server-side; internal override when containerized).
const API_BASE = (
  process.env.INTERNAL_API_URL?.trim() || requireEnv('NEXT_PUBLIC_API_URL')
).replace(/\/$/, '');
const ALLOWED_ORIGINS = requireEnv('CORS_ALLOWED_ORIGINS');

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  async redirects() {
    return [];
  },
  async rewrites() {
    return [
      // Route /scans through API base for IIIF assets.
      { source: '/iiif-proxy/scans/:path*', destination: `${API_BASE}/scans/:path*` },
      { source: '/iiif-proxy/:path*', destination: `${IIIF_UPSTREAM}/:path*` },
    ];
  },
  // External hosts used across the app (IIIF thumbnails keep `unoptimized` per-image).
  images: {
    remotePatterns: [
      // Sipi – IIIF server
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1024',
        pathname: '/**',
      },
      // Django media and IIIF scans
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/scans/**',
      },
      // Production hosts
      {
        protocol: 'https',
        hostname: 'archetype.gla.ac.uk',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'archetype.elghareeb.space',
        pathname: '/**',
      },
      ...(process.env.NEXT_PUBLIC_API_URL
        ? [
            {
              protocol: 'https',
              hostname: process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, '').split(':')[0],
              pathname: '/**',
            },
          ]
        : []),
    ],
  },

  // CSP is set dynamically per request in middleware.ts (nonce-based).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: ALLOWED_ORIGINS },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, content-type, Authorization',
          },
        ],
      },
    ];
  },
  turbopack: {},
  output: 'standalone',
};

export default analyze(withNextIntl(nextConfig));
