import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // En dev, queremos testear el SW también (push notifications)
  disable: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivado por incompatibilidad conocida de react-leaflet con el doble-mount de
  // strict mode en dev: "Map container is already initialized". En prod no aplica.
  reactStrictMode: false,
  // Oculta el indicator flotante del dev server (cubría el pill del bottom nav)
  devIndicators: false,
  transpilePackages: [
    '@tindivo/core',
    '@tindivo/contracts',
    '@tindivo/supabase',
    '@tindivo/ui',
    '@tindivo/api-client',
  ],
}

export default withSerwist(nextConfig)
