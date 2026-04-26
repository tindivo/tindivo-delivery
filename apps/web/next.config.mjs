import { spawnSync } from 'node:child_process'
import withSerwistInit from '@serwist/next'

/**
 * Revision string que cambia con cada deploy. Inyectada al precache del SW
 * para garantizar que `public/sw.js` tenga bytes distintos en cada release —
 * es la única forma de que el browser detecte un update del SW (compara
 * byte-a-byte el archivo descargado con el cacheado).
 *
 * Sin esto, iOS PWA puede tardar días en re-fetchear /sw.js y los usuarios
 * siguen ejecutando el bundle JS antiguo.
 */
function buildRevision() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    const r = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' })
    if (r.stdout) return r.stdout.trim()
  } catch {
    /* sin git: caer al timestamp */
  }
  return `dev-${Date.now()}`
}

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  // En dev, queremos testear el SW también (push notifications)
  disable: false,
  // Cambia los bytes del /sw.js generado en cada deploy → browser detecta update.
  additionalPrecacheEntries: [{ url: '/manifest.webmanifest', revision: buildRevision() }],
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
