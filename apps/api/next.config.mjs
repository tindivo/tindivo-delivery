/** @type {import('next').NextConfig} */
// Normaliza el origin: sin trailing slash (browser envía Origin sin slash).
const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
const allowOrigin = rawAppUrl.replace(/\/+$/, '') || '*'

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@tindivo/core', '@tindivo/contracts', '@tindivo/supabase'],
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowOrigin },
          { key: 'Vary', value: 'Origin' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Request-Id',
          },
          { key: 'Access-Control-Max-Age', value: '86400' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
