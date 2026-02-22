import withBundleAnalyzer from '@next/bundle-analyzer';

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

// Proxy IIIF (Sipi) so same-origin requests avoid CORS when frontend is on different port.
// Set NEXT_PUBLIC_IIIF_UPSTREAM in Docker to e.g. http://image_server:1024 so the server can reach Sipi.
const IIIF_UPSTREAM = (process.env.NEXT_PUBLIC_IIIF_UPSTREAM || 'http://localhost:1024').replace(
  /\/$/,
  ''
);
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
  async rewrites() {
    return [{ source: '/iiif-proxy/:path*', destination: `${IIIF_UPSTREAM}/:path*` }];
  },
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
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '')?.split(':')[0],
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
