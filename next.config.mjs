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
  webpack(config, { dev, isServer }) {
    config.plugins.push(new MiniCssExtractPlugin())

    return config
  },
}

export default nextConfig
