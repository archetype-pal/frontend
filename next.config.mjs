import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const nextConfig = {
  images: {
    domains: ['api.archetype.rancho.me', 'api.archetype.gla.ac.uk'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'api.archetype.rancho.me',
      },
      {
        protocol: 'http',
        hostname: 'archetype.gla.ac.uk',
      },
    ],
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
