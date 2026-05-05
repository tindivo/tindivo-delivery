/** @type {import('next').NextConfig} */
//
// CORS dinámico vive en `middleware.ts` (whitelist multi-origen para que
// tindivo.com y delivery.tindivo.com convivan). Aquí solo dejamos los
// security headers estáticos que aplican siempre.
//
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
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
}

export default nextConfig
