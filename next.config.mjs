import MiniCssExtractPlugin from 'mini-css-extract-plugin'

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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self' https:; img-src 'self' data: https:; media-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:;",
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
