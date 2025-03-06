import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { createProxyMiddleware } from 'http-proxy-middleware'

const nextConfig = {
  images: {
    domains: ['api.archetype.gla.ac.uk'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.modelsofauthority.ac.uk',
      },
      {
        protocol: 'http',
        hostname: 'api.archetype.gla.ac.uk',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.archetype.gla.ac.uk/api/:path*', // Proxy to Backend
      },
    ]
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
  webpack(config, { dev, isServer }) {
    config.plugins.push(new MiniCssExtractPlugin())

    return config
  },
  output: 'standalone',
}

export default nextConfig
