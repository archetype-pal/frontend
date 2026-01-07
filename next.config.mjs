import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'archetype.gla.ac.uk',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      ...(process.env.NEXT_PUBLIC_API_URL
        ? [
            {
              protocol: process.env.NEXT_PUBLIC_API_URL.startsWith('https') ? 'https' : 'http',
              hostname: process.env.NEXT_PUBLIC_API_URL.replace(/^https?:\/\//, '').split('/')[0],
            },
          ]
        : []),
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
