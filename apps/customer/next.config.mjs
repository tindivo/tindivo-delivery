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
  disable: false,
  // Cambia los bytes del /sw.js generado en cada deploy → browser detecta update.
  additionalPrecacheEntries: [{ url: '/manifest.webmanifest', revision: buildRevision() }],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet doble-mount en strict mode rompe el mapa con
  // "Map container is already initialized". El tracking usa el mapa, así que
  // mantenemos el mismo opt-out que apps/web.
  reactStrictMode: false,
  devIndicators: false,
  transpilePackages: [
    '@tindivo/contracts',
    '@tindivo/supabase',
    '@tindivo/ui',
    '@tindivo/api-client',
  ],
}

export default withSerwist(nextConfig)
