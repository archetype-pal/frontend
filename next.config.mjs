// import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { createProxyMiddleware } from 'http-proxy-middleware'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL;
console.log(" Backend URL:", BACKEND_URL); 
// || 'https://api.archetype.rancho.me'

const nextConfig = {
  // images: {
  //   domains: ['api.archetype.rancho.me'],
  //   remotePatterns: [
  //     {
  //       protocol: 'https',
  //       hostname: 'www.modelsofauthority.ac.uk',
  //     },
  //     {
  //       protocol: 'http',
  //       hostname: 'api.archetype.rancho.me',
  //     },
  //   ],
  // },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
    ],
    unoptimized: true, // Allows all images without optimization
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`, // Proxy to Backend
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
    // config.plugins.push(new MiniCssExtractPlugin())

    return config
  },
  output: 'standalone',
}

export default nextConfig
