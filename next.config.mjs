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

// Node ≥17 resolves `localhost` IPv6-first, and on WSL/Windows dev machines an
// unrelated process can shadow the port on ::1 (observed: a Windows service on
// [::]:1024 answering 404s in SIPI's place). Rewrite destinations are fetched
// by the Next server in Node, so pin loopback upstreams to IPv4. Browser-facing
// URLs (the raw NEXT_PUBLIC_* values) are unaffected.
const toIPv4Loopback = (url) => url.replace(/^(https?:\/\/)localhost(?=[:/]|$)/, '$1127.0.0.1');
// Proxy IIIF (Sipi) so same-origin requests avoid CORS when frontend is on different port.
// Set NEXT_PUBLIC_IIIF_UPSTREAM in Docker to e.g. http://image_server:1024 so the server can reach Sipi.
const IIIF_UPSTREAM = toIPv4Loopback(requireEnv('NEXT_PUBLIC_IIIF_UPSTREAM').replace(/\/$/, ''));
// API base for rewrites.
const API_BASE = toIPv4Loopback(requireEnv('NEXT_PUBLIC_API_URL').replace(/\/$/, ''));
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
      // Sipi – IIIF server (dev host port; see api/compose.yaml image_server)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8182',
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
