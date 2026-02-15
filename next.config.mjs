// Proxy IIIF (Sipi) so same-origin requests avoid CORS when frontend is on different port.
// Set NEXT_PUBLIC_IIIF_UPSTREAM in Docker to e.g. http://image_server:1024 so the server can reach Sipi.
const IIIF_UPSTREAM = (process.env.NEXT_PUBLIC_IIIF_UPSTREAM || 'http://localhost:1024').replace(/\/$/, '')

const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
      hmrRefreshes: true,
    },
  },
  async rewrites() {
    return [
      { source: '/iiif-proxy/:path*', destination: `${IIIF_UPSTREAM}/:path*` },
    ]
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
        hostname: process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, ""),
        pathname: '/**',
      },
    ],
    // With IIIF it’s usually better to not reprocess images again
    unoptimized: true,
  },

  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
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
    ]
  },
  turbopack: {},
  output: 'standalone',
}

export default nextConfig
