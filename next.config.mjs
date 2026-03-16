import withBundleAnalyzer from '@next/bundle-analyzer';

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
const requireEnv = (key) => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Proxy IIIF (Sipi) so same-origin requests avoid CORS when frontend is on different port.
// Set NEXT_PUBLIC_IIIF_UPSTREAM in Docker to e.g. http://image_server:1024 so the server can reach Sipi.
const IIIF_UPSTREAM = requireEnv('NEXT_PUBLIC_IIIF_UPSTREAM').replace(/\/$/, '');
// API base for rewrites.
const API_BASE = requireEnv('NEXT_PUBLIC_API_URL').replace(/\/$/, '');
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

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // TODO: Tighten CSP: prefer nonces/hashes for inline scripts and avoid 'unsafe-eval' where possible.
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http: https:; font-src 'self' data:; connect-src 'self' http: https:; frame-src 'self'",
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: ALLOWED_ORIGINS,
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          },
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

export default analyze(nextConfig);
