import withBundleAnalyzer from '@next/bundle-analyzer';

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

// Proxy IIIF (Sipi) so same-origin requests avoid CORS when frontend is on different port.
// Set NEXT_PUBLIC_IIIF_UPSTREAM in Docker to e.g. http://image_server:1024 so the server can reach Sipi.
const IIIF_UPSTREAM = (process.env.NEXT_PUBLIC_IIIF_UPSTREAM || 'http://localhost:1024').replace(
  /\/$/,
  ''
);
// API base for rewrites (e.g. mock server serves /scans for IIIF when using local dev).
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const ALLOWED_ORIGINS =
  process.env.CORS_ALLOWED_ORIGINS ||
  'https://archetype.gla.ac.uk,https://archetype.elghareeb.space';

const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  async redirects() {
    return [
      { source: '/about', destination: '/about/about-models-of-authority', permanent: true },
      { source: '/images', destination: '/search/manuscripts', permanent: true },
      { source: '/authors', destination: '/blogs', permanent: true },
      { source: '/authors/:author', destination: '/blogs', permanent: true },
      { source: '/events', destination: '/events/conference', permanent: true },
      { source: '/events/conferece', destination: '/events/conference', permanent: true },
      { source: '/historical-context', destination: '/about/historical-context', permanent: true },
      { source: '/project-team', destination: '/about/about-models-of-authority', permanent: true },
      { source: '/citing-database', destination: '/about/about-models-of-authority', permanent: true },
      { source: '/talks-publications', destination: '/about/about-models-of-authority', permanent: true },
      { source: '/acknowledgements', destination: '/about/about-models-of-authority', permanent: true },
      { source: '/privacy-policy', destination: '/about/about-models-of-authority', permanent: true },
    ];
  },
  async rewrites() {
    return [
      // API server may serve IIIF at /scans (e.g. mock); route those to API so images work.
      { source: '/iiif-proxy/scans/:path*', destination: `${API_BASE}/scans/:path*` },
      { source: '/iiif-proxy/:path*', destination: `${IIIF_UPSTREAM}/:path*` },
    ];
  },
  // IIIF and external image servers require unoptimized; same-origin static assets could use optimization if needed.
  images: {
    remotePatterns: [
      // Sipi – IIIF server
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '1024',
        pathname: '/**',
      },
      // Django media and mock IIIF scans
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
    unoptimized: true,
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
