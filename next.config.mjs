import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { createProxyMiddleware } from 'http-proxy-middleware'

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.modelsofauthority.ac.uk',
      },
      {
        protocol: 'http',
        hostname: '13.60.172.99',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://13.60.172.99/api/:path*', // Proxy to Backend
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
}

export default nextConfig
